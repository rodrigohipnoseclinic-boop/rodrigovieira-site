// Links de sessão: 1ª sessão (envio + 2 dias) e 2ª (data da 1ª + 22 dias)
// no mesmo link; pedido de desmarcação com taxa.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LojaMemoria } from "./loja-memoria.mjs";
import { PADRAO, normalizarConfig } from "../netlify/lib/agenda/config.mjs";
import * as S from "../netlify/lib/agenda/sessoes.mjs";
import { buscar, reservar, cancelar, reagendar } from "../netlify/lib/agenda/reservas.mjs";
import { notificar } from "../netlify/lib/agenda/emails.mjs";
import { ler } from "../netlify/lib/agenda/armazem.mjs";

process.env.AGENDA_SEGREDO = "s".repeat(32);
const ENVIO = { data: "2026-10-28", min: 600 }; // quarta, 28/10
const base = structuredClone(PADRAO);
for (const m of ["presencial", "online"]) for (const d of [0, 1, 2, 3, 4, 5, 6]) base.modalidades[m].semana[d] = [{ inicio: "09:00", fim: "12:00" }];
const cfg = normalizarConfig({ ...base, email_admin: "a@b.com", janela_dias: 90,
  whatsapp: { ...PADRAO.whatsapp, ativo: true, numero_admin: "19997498217" },
  sessoes: { intervalo_primeira_dias: 2, intervalo_dias: 22, valor: 300, taxa: 25, taxa_tardia: 50, prazo_horas: 12, chave_pix: "pix@rodrigo.com" } });
const cliente = { id: "c1", nome: "Lia Retorno", email: "lia@x.com", telefone: "19911112222" };
const ler_ = async (loja, s) => (await ler(loja, `sessao/${s.id}`)).dado;

async function novoLink(loja, extra = {}) {
  const s = await S.criarSessao(loja, cfg, { cliente, modalidade: "presencial", ...extra }, "adm", ENVIO);
  const token = new URL(S.linkSessao(s)).searchParams.get("t");
  return { s: await S.autenticarSessao(loja, s.id, token), token };
}

test("exemplo do Dr. Rodrigo: enviado 28/10 → 1ª a partir de 30/10; 1ª em 30/10 → 2ª a partir de 21/11", async () => {
  const loja = new LojaMemoria();
  const { s, token } = await novoLink(loja);
  assert.equal(s.valor, 300);
  assert.equal(S.estagio(s), "primeira");
  assert.equal(S.dataMinima(s), "2026-10-30");
  assert.deepEqual(await S.horariosSessao(loja, cfg, s, "2026-10-28", ENVIO), []);
  assert.deepEqual(await S.horariosSessao(loja, cfg, s, "2026-10-29", ENVIO), []);
  assert.deepEqual(await S.horariosSessao(loja, cfg, s, "2026-10-30", ENVIO), ["09:00", "10:30"]);
  assert.equal((await S.diasSessao(loja, cfg, s, "2026-10", ENVIO))[0], "2026-10-30");
  await assert.rejects(S.reservarSessao(loja, cfg, s, { data: "2026-10-29", inicio: "09:00" }, ENVIO), { status: 409 });

  const c1 = await S.reservarSessao(loja, cfg, s, { data: "2026-10-30", inicio: "09:00" }, ENVIO);
  assert.equal(c1.sessao, s.id);
  // o mesmo link, aberto de novo, já está no estágio da 2ª
  const s2 = await S.autenticarSessao(loja, s.id, token);
  assert.equal(S.estagio(s2), "segunda");
  assert.equal(S.dataMinima(s2), "2026-11-21");
  assert.deepEqual(await S.horariosSessao(loja, cfg, s2, "2026-11-20", ENVIO), []);
  assert.deepEqual(await S.horariosSessao(loja, cfg, s2, "2026-11-21", ENVIO), ["09:00", "10:30"]);
  assert.ok((await S.diasSessao(loja, cfg, s2, "2026-12", ENVIO)).length > 0, "pode escolher bem depois dos 22 dias");

  const c2 = await S.reservarSessao(loja, cfg, s2, { data: "2026-12-01", inicio: "10:30" }, ENVIO);
  const s3 = await ler_(loja, s);
  assert.equal(S.estagio(s3), "concluido");
  assert.deepEqual([s3.primeira.consulta, s3.segunda.consulta], [c1.id, c2.id]);
  await assert.rejects(S.reservarSessao(loja, cfg, s3, { data: "2026-12-02", inicio: "09:00" }, ENVIO), /já foram agendadas/);
});

test("bloqueio vale só para o link: a agenda geral continua com o dia 29/10", async () => {
  const loja = new LojaMemoria();
  const { s } = await novoLink(loja);
  assert.deepEqual(await S.horariosSessao(loja, cfg, s, "2026-10-29", ENVIO), []);
  const geral = await reservar(loja, cfg, { modalidade: "online", data: "2026-10-29", inicio: "09:00", origem: "paciente", por: "p",
    cliente: { id: null, nome: "Outro", email: "o@x.com", telefone: "19900000000" } }, ENVIO);
  assert.equal(geral.data, "2026-10-29");
});

test("prazos editáveis por link", async () => {
  const loja = new LojaMemoria();
  const { s } = await novoLink(loja, { min_dias_primeira: 5, min_dias_retorno: 30 });
  assert.equal(S.dataMinima(s), "2026-11-02");
  await S.reservarSessao(loja, cfg, s, { data: "2026-11-02", inicio: "09:00" }, ENVIO);
  assert.equal(S.dataMinima(await ler_(loja, s)), "2026-12-02");
  await assert.rejects(S.criarSessao(loja, cfg, { cliente, modalidade: "online", min_dias_primeira: -1 }, "adm", ENVIO), /dias/);
});

test("transferir a 1ª pela agenda move a base da 2ª; cancelar a 1ª (sem 2ª) reabre o estágio", async () => {
  const loja = new LojaMemoria();
  const { s } = await novoLink(loja);
  const c1 = await S.reservarSessao(loja, cfg, s, { data: "2026-10-30", inicio: "09:00" }, ENVIO);
  const t = await reagendar(loja, cfg, c1.id, { data: "2026-11-03", inicio: "09:00" }, "adm");
  await S.sincronizarSessao(loja, t);
  assert.equal(S.dataMinima(await ler_(loja, s)), "2026-11-25");
  const x = await cancelar(loja, c1.id, "adm");
  await S.sincronizarSessao(loja, x);
  const depois = await ler_(loja, s);
  assert.equal(S.estagio(depois), "primeira");
  assert.equal(S.dataMinima(depois), "2026-10-30");
});

test("desmarcação: só pedido com motivo e aceite; taxa 25 (≥12 h) ou 50; você aprova e o estágio reabre", async () => {
  const loja = new LojaMemoria();
  const { s } = await novoLink(loja);
  const c1 = await S.reservarSessao(loja, cfg, s, { data: "2026-10-30", inicio: "09:00" }, ENVIO);
  const c2 = await S.reservarSessao(loja, cfg, await ler_(loja, s), { data: "2026-11-23", inicio: "09:00" }, ENVIO);
  assert.equal(S.taxaDesmarcacao(cfg, c2, { data: "2026-11-22", min: 9 * 60 }).taxa, 25, "24 h antes");
  assert.equal(S.taxaDesmarcacao(cfg, c2, { data: "2026-11-22", min: 21 * 60 }).taxa, 25, "exatamente 12 h antes");
  assert.equal(S.taxaDesmarcacao(cfg, c2, { data: "2026-11-22", min: 21 * 60 + 1 }).taxa, 50, "menos de 12 h");

  const sx = await ler_(loja, s);
  await assert.rejects(S.solicitarDesmarcacao(loja, cfg, sx, { consulta: c2.id, motivo: "", aceite: true }, ENVIO), /motivo/);
  await assert.rejects(S.solicitarDesmarcacao(loja, cfg, sx, { consulta: c2.id, motivo: "viagem", aceite: false }, ENVIO), /de acordo/);
  const p = await S.solicitarDesmarcacao(loja, cfg, sx, { consulta: c2.id, motivo: "viagem a trabalho", aceite: true }, { data: "2026-11-23", min: 60 });
  assert.deepEqual([p.taxa, p.estagio], [50, "segunda"]);
  await assert.rejects(S.solicitarDesmarcacao(loja, cfg, await ler_(loja, s), { consulta: c1.id, motivo: "outro", aceite: true }, ENVIO), { status: 409 });
  assert.equal((await buscar(loja, c2.id)).status, "confirmada", "continua marcada até você decidir");

  await S.decidirDesmarcacao(loja, s.id, "taxa-paga", "adm");
  await S.decidirDesmarcacao(loja, s.id, "aprovar", "adm");
  assert.equal((await buscar(loja, c2.id)).status, "cancelada");
  const depois = await ler_(loja, s);
  assert.deepEqual([S.estagio(depois), depois.desmarcacao.status, depois.desmarcacao.taxa_paga], ["segunda", "aprovada", true]);
  assert.equal(S.dataMinima(depois), "2026-11-21", "2ª continua contando da 1ª");
});

test("WhatsApp: consulta marcada pelo painel avisa só o paciente; pelo link avisa os dois", async () => {
  const loja = new LojaMemoria();
  const enviados = [];
  const opt = { enviar: async () => {}, enviarWa: async (m) => enviados.push(m.quem) };
  const p = await reservar(loja, cfg, { modalidade: "online", data: "2026-11-02", inicio: "07:00", origem: "painel", por: "adm", cliente }, ENVIO);
  await notificar(loja, cfg, p, "confirmacao", opt);
  assert.deepEqual(enviados, ["paciente"]);
  enviados.length = 0;
  const { s } = await novoLink(loja);
  const c = await S.reservarSessao(loja, cfg, s, { data: "2026-10-30", inicio: "09:00" }, ENVIO);
  await notificar(loja, cfg, c, "confirmacao", opt);
  assert.deepEqual(enviados, ["paciente", "admin"]);
});
