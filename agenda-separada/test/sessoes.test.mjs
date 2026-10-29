// Links de sessão: pessoais, válidos por 12 h, uso único; data liberada pelo
// histórico do cliente (1ª: envio + 2 dias; demais: última sessão + 22 dias).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LojaMemoria } from "./loja-memoria.mjs";
import { PADRAO, normalizarConfig } from "../netlify/lib/agenda/config.mjs";
import * as S from "../netlify/lib/agenda/sessoes.mjs";
import { buscar, reservar, reagendar } from "../netlify/lib/agenda/reservas.mjs";
import { anexarConsulta } from "../netlify/lib/agenda/clientes.mjs";
import { notificar } from "../netlify/lib/agenda/emails.mjs";
import { ler } from "../netlify/lib/agenda/armazem.mjs";

process.env.AGENDA_SEGREDO = "s".repeat(32);
const ENVIO = { data: "2026-10-28", min: 600 };
const base = structuredClone(PADRAO);
for (const m of ["presencial", "online"]) for (const d of [0, 1, 2, 3, 4, 5, 6]) base.modalidades[m].semana[d] = [{ inicio: "09:00", fim: "12:00" }];
const cfg = normalizarConfig({ ...base, email_admin: "a@b.com", janela_dias: 90,
  whatsapp: { ...PADRAO.whatsapp, ativo: true, numero_admin: "19997498217" },
  sessoes: { cobrar_pix: false, validade_horas: 12, intervalo_primeira_dias: 2, intervalo_dias: 22, valor: 300, taxa: 25, taxa_tardia: 50, prazo_horas: 12, chave_pix: "pix@rodrigo.com" } });

async function cenario() {
  const loja = new LojaMemoria();
  const cliente = { id: "c1", nome: "Lia Retorno", email: "lia@x.com", telefone: "19911112222" };
  await loja.setJSON("cliente/c1", { ...cliente, consultas: [] });
  const link = async (extra = {}) => {
    const s = await S.criarSessao(loja, cfg, { cliente, modalidade: "presencial", ...extra }, "adm", ENVIO);
    const token = new URL(S.linkSessao(s)).searchParams.get("t");
    return { s: await S.autenticarSessao(loja, s.id, token), token };
  };
  const agendar = async (s, data, inicio = "09:00") => {
    const c = await S.reservarSessao(loja, cfg, s, { data, inicio }, ENVIO);
    await anexarConsulta(loja, "c1", c);
    return c;
  };
  return { loja, cliente, link, agendar };
}

test("1ª sessão: enviado 28/10 → horários a partir de 30/10 (28 e 29 bloqueados só para o link)", async () => {
  const { loja, link } = await cenario();
  const { s } = await link();
  assert.equal(s.valor, 300);
  assert.deepEqual(await S.dataMinima(loja, s), { data: "2026-10-30", base: "primeira", ultima: null });
  assert.deepEqual(await S.horariosSessao(loja, cfg, s, "2026-10-29", ENVIO), []);
  assert.deepEqual(await S.horariosSessao(loja, cfg, s, "2026-10-30", ENVIO), ["09:00", "10:30"]);
  // agenda geral não muda
  const geral = await reservar(loja, cfg, { modalidade: "online", data: "2026-10-29", inicio: "09:00", origem: "paciente", por: "p",
    cliente: { id: null, nome: "Outro", email: "o@x.com", telefone: "19900000000" } }, ENVIO);
  assert.equal(geral.data, "2026-10-29");
});

test("link é de uso único", async () => {
  const { loja, link, agendar } = await cenario();
  const { s, token } = await link();
  await agendar(s, "2026-10-30");
  const usado = await S.autenticarSessao(loja, s.id, token);
  assert.ok(usado.usado);
  await assert.rejects(S.reservarSessao(loja, cfg, usado, { data: "2026-11-30", inicio: "09:00" }, ENVIO), /já foi usado/);
  assert.deepEqual(await S.diasSessao(loja, cfg, usado, "2026-11", ENVIO), []);
});

test("link expira em 12 horas se não for usado (já usado continua acessível para ver/desmarcar)", async () => {
  const { loja, link, agendar } = await cenario();
  const { s, token } = await link();
  const { s: s2, token: t2 } = await link();
  await agendar(s2, "2026-10-30");
  await loja.setJSON(`sessao/${s.id}`, { ...(await ler(loja, `sessao/${s.id}`)).dado, expira_em: new Date(Date.now() - 1000).toISOString() });
  await loja.setJSON(`sessao/${s2.id}`, { ...(await ler(loja, `sessao/${s2.id}`)).dado, expira_em: new Date(Date.now() - 1000).toISOString() });
  await assert.rejects(S.autenticarSessao(loja, s.id, token), { status: 410 });
  assert.ok(await S.autenticarSessao(loja, s2.id, t2), "o que já agendou ainda abre");
  const curto = await S.criarSessao(loja, cfg, { cliente: { id: "c1", nome: "Lia", email: "", telefone: "1" }, modalidade: "online", validade_horas: 2 }, "adm", ENVIO);
  assert.ok(Math.abs(Date.parse(curto.expira_em) - Date.now() - 2 * 3600e3) < 5000, "validade editável");
});

test("depois da 1ª sessão, qualquer novo link conta 22 dias da última sessão, não importa quando for aberto", async () => {
  const { loja, link, agendar } = await cenario();
  const { s } = await link();
  await agendar(s, "2026-10-30");
  const { s: s2 } = await link();
  assert.deepEqual(await S.dataMinima(loja, s2), { data: "2026-11-21", base: "retorno", ultima: "2026-10-30" });
  assert.deepEqual(await S.horariosSessao(loja, cfg, s2, "2026-11-20", ENVIO), []);
  const c2 = await agendar(s2, "2026-11-25");
  const { s: s3 } = await link();
  assert.equal((await S.dataMinima(loja, s3)).data, "2026-12-17", "conta da última (25/11 + 22)");
  // transferência da última sessão pela agenda atualiza o cálculo
  await reagendar(loja, cfg, c2.id, { data: "2026-11-27", inicio: "09:00" }, "adm");
  assert.equal((await S.dataMinima(loja, s3)).data, "2026-12-19");
});

test("consulta marcada por você como sessão também conta; avaliação não", async () => {
  const { loja, link } = await cenario();
  const cli = { id: "c1", nome: "Lia", email: "", telefone: "19911112222" };
  const av = await reservar(loja, cfg, { modalidade: "online", data: "2026-10-20", inicio: "09:00", origem: "painel", por: "adm", tipo: "avaliacao", cliente: cli }, { data: "2026-10-01", min: 0 });
  await anexarConsulta(loja, "c1", av);
  const { s } = await link();
  assert.equal((await S.dataMinima(loja, s)).base, "primeira");
  const se = await reservar(loja, cfg, { modalidade: "online", data: "2026-10-27", inicio: "09:00", origem: "painel", por: "adm", tipo: "sessao", cliente: cli }, { data: "2026-10-01", min: 0 });
  await anexarConsulta(loja, "c1", se);
  assert.deepEqual(await S.dataMinima(loja, s), { data: "2026-11-18", base: "retorno", ultima: "2026-10-27" });
});

test("desmarcação: motivo e aceite; taxa 25 (≥12 h) ou 50; você aprova", async () => {
  const { loja, link, agendar } = await cenario();
  const { s } = await link();
  const c = await agendar(s, "2026-11-23");
  assert.equal(S.taxaDesmarcacao(cfg, c, { data: "2026-11-22", min: 21 * 60 }).taxa, 25, "exatamente 12 h antes");
  assert.equal(S.taxaDesmarcacao(cfg, c, { data: "2026-11-22", min: 21 * 60 + 1 }).taxa, 50);
  const sx = (await ler(loja, `sessao/${s.id}`)).dado;
  await assert.rejects(S.solicitarDesmarcacao(loja, cfg, sx, { motivo: "", aceite: true }, ENVIO), /motivo/);
  await assert.rejects(S.solicitarDesmarcacao(loja, cfg, sx, { motivo: "viagem", aceite: false }, ENVIO), /de acordo/);
  const p = await S.solicitarDesmarcacao(loja, cfg, sx, { motivo: "viagem a trabalho", aceite: true }, ENVIO);
  assert.equal(p.taxa, 25);
  assert.equal((await buscar(loja, c.id)).status, "confirmada");
  await S.decidirDesmarcacao(loja, s.id, "taxa-paga", "adm");
  await S.decidirDesmarcacao(loja, s.id, "aprovar", "adm");
  assert.equal((await buscar(loja, c.id)).status, "cancelada");
  assert.equal((await ler(loja, `sessao/${s.id}`)).dado.desmarcacao.taxa_paga, true);
});

test("WhatsApp: consulta marcada pelo painel avisa só o paciente; pelo link avisa os dois", async () => {
  const { loja, link, agendar } = await cenario();
  const enviados = [];
  const opt = { enviar: async () => {}, enviarWa: async (m) => enviados.push(m.quem) };
  const p = await reservar(loja, cfg, { modalidade: "online", data: "2026-11-02", inicio: "07:00", origem: "painel", por: "adm",
    cliente: { id: "c1", nome: "Lia", email: "", telefone: "19911112222" } }, ENVIO);
  await notificar(loja, cfg, p, "confirmacao", opt);
  assert.deepEqual(enviados, ["paciente"]);
  enviados.length = 0;
  const { s } = await link();
  await notificar(loja, cfg, await agendar(s, "2026-10-30"), "confirmacao", opt);
  assert.deepEqual(enviados, ["paciente", "admin"]);
});

test("Pix no link: horários só depois da confirmação do Asaas (sem comprovante)", async () => {
  const { simulado, simularPagamento } = await import("../netlify/lib/agenda/pix.mjs");
  const { processarWebhook } = await import("../netlify/lib/agenda/pedidos.mjs");
  const { loja, link } = await cenario();
  const prov = simulado();
  const { s, token } = await link({ cobrar_pix: true });
  assert.equal(s.cobrar_pix, true);
  assert.deepEqual(await S.horariosSessao(loja, cfg, s, "2026-10-30", ENVIO), [], "sem pagamento, sem horários");
  await assert.rejects(S.reservarSessao(loja, cfg, s, { data: "2026-10-30", inicio: "09:00" }, ENVIO), { status: 402 });
  await assert.rejects(S.gerarPixSessao(loja, cfg, prov, s, {}), /CPF/);
  const pix = await S.gerarPixSessao(loja, cfg, prov, s, { cpf: "529.982.247-25" });
  assert.equal(pix.status, "pendente");
  assert.equal((await S.gerarPixSessao(loja, cfg, prov, await S.autenticarSessao(loja, s.id, token))).provedor_id, pix.provedor_id, "não gera cobrança repetida");
  assert.equal((await ler(loja, "cliente/c1")).dado.asaas_id, "cus_simulado", "cadastro no Asaas guardado para os próximos links");

  // webhook autêntico, mas ainda não pago: nada muda
  const req = new Request("https://x/api/agenda/webhook", { method: "POST", headers: { "x-simulado": "1" } });
  const aoSessao = (sid) => S.atualizarPixSessao(loja, cfg, prov, sid);
  assert.equal((await processarWebhook(loja, cfg, prov, req, { id: pix.provedor_id }, { aoSessao })).pix.status, "pendente");
  simularPagamento(pix.provedor_id);
  assert.equal((await processarWebhook(loja, cfg, prov, req, { id: pix.provedor_id }, { aoSessao })).pix.status, "pago");
  const pago = await S.autenticarSessao(loja, s.id, token);
  assert.deepEqual(await S.horariosSessao(loja, cfg, pago, "2026-10-30", ENVIO), ["09:00", "10:30"]);

  // pago e ainda sem agendar: o link não expira
  await loja.setJSON(`sessao/${s.id}`, { ...pago, expira_em: new Date(Date.now() - 1000).toISOString() });
  assert.ok(await S.autenticarSessao(loja, s.id, token));

  // próximo link do mesmo cliente não pede CPF de novo
  const { s: s2 } = await link({ cobrar_pix: true });
  assert.equal((await S.gerarPixSessao(loja, cfg, prov, s2, {})).status, "pendente");

  // você pode liberar sem Pix
  const { s: s3 } = await link({ cobrar_pix: true });
  await S.liberarSemPix(loja, s3.id, "adm");
  assert.ok((await S.horariosSessao(loja, cfg, (await ler(loja, `sessao/${s3.id}`)).dado, "2026-10-30", ENVIO)).length);
});

test("Pix no link: valor menor que o da sessão não libera", async () => {
  const { simulado } = await import("../netlify/lib/agenda/pix.mjs");
  const { loja, link } = await cenario();
  const base = simulado();
  const { s } = await link({ cobrar_pix: true });
  const pix = await S.gerarPixSessao(loja, cfg, base, s, { cpf: "52998224725" });
  const prov = { ...base, consultar: async () => ({ status: "pago", valor: 10 }) };
  const x = await S.atualizarPixSessao(loja, cfg, prov, s.id);
  assert.equal(x.pix.status, "divergente");
  assert.equal(S.pixLiberado(x), false);
  assert.ok(pix);
});
