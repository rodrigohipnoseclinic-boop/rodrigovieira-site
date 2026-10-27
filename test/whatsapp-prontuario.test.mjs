// WhatsApp (mensagens de agendamento) e prontuário de evoluções.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LojaMemoria } from "./loja-memoria.mjs";
import { PADRAO, normalizarConfig } from "../netlify/lib/agenda/config.mjs";
import { reservar } from "../netlify/lib/agenda/reservas.mjs";
import { notificar, reenviar } from "../netlify/lib/agenda/emails.mjs";
import { enviarWhatsapp, numeroWhatsapp } from "../netlify/lib/agenda/whatsapp.mjs";
import * as PR from "../netlify/lib/agenda/prontuario.mjs";

const AGORA = { data: "2026-10-30", min: 600 };
const base = (w = {}) => normalizarConfig({ ...structuredClone(PADRAO), email_admin: "a@b.com",
  whatsapp: { ...PADRAO.whatsapp, ativo: true, numero_admin: "(19) 99749-8217", ...w } });
const cliente = { id: null, nome: "Ana Souza", email: "ana@x.com", telefone: "(19) 99999-0000" };
const semEmail = async () => {};

test("número de WhatsApp recebe DDI 55", () => {
  assert.equal(numeroWhatsapp("(19) 99999-0000"), "5519999990000");
  assert.equal(numeroWhatsapp("+55 19 99999-0000"), "5519999990000");
  assert.equal(numeroWhatsapp("123"), "");
});

test("agendamento gera WhatsApp ao paciente e ao administrador, uma vez só", async () => {
  const loja = new LojaMemoria(), cfg = base();
  const c = await reservar(loja, cfg, { modalidade: "online", data: "2026-11-02", inicio: "09:00", cliente, origem: "paciente", por: "paciente" }, AGORA);
  const enviados = [];
  const wa = async (m) => { enviados.push(m); };
  const r = await notificar(loja, cfg, c, "confirmacao", { enviar: semEmail, enviarWa: wa });
  const zap = r.filter((x) => x.canal === "whatsapp");
  assert.deepEqual(zap.map((x) => [x.quem, x.para, x.modelo, x.status]), [
    ["paciente", "5519999990000", "consulta_confirmada", "enviado"],
    ["admin", "5519997498217", "novo_agendamento", "enviado"],
  ]);
  assert.deepEqual(enviados[0].parametros, ["Ana", "Dr. Rodrigo Vieira", "02/11/2026", "09:00", "Online"]);
  assert.deepEqual(enviados[1].parametros, ["Ana Souza", "02/11/2026", "09:00", "Online", "(19) 99999-0000"]);
  await notificar(loja, cfg, c, "confirmacao", { enviar: semEmail, enviarWa: wa });
  assert.equal(enviados.length, 2, "repetição não reenvia");
});

test("WhatsApp desligado ou sem modelo não envia; falha fica registrada para reenvio", async () => {
  const loja = new LojaMemoria();
  const c = await reservar(loja, base(), { modalidade: "online", data: "2026-11-02", inicio: "09:00", cliente, origem: "paciente", por: "paciente" }, AGORA);
  const off = await notificar(loja, normalizarConfig({ ...structuredClone(PADRAO) }), c, "confirmacao", { enviar: semEmail, enviarWa: async () => assert.fail() });
  assert.equal(off.filter((x) => x.canal).length, 0);

  const cfg = base();
  const c2 = await reservar(loja, cfg, { modalidade: "online", data: "2026-11-02", inicio: "14:00", cliente, origem: "paciente", por: "paciente" }, AGORA);
  const r = await notificar(loja, cfg, c2, "confirmacao", { enviar: semEmail, enviarWa: async () => { throw new Error("fora do ar"); } });
  const pac = r.find((x) => x.canal === "whatsapp" && x.quem === "paciente");
  assert.equal(pac.status, "erro");
  const ok = await reenviar(loja, pac.id, async () => {});
  assert.equal(ok.status, "enviado");
  const cancel = await notificar(loja, cfg, { ...c2, historico: [...c2.historico, {}] }, "cancelamento", { enviar: semEmail, enviarWa: async () => assert.fail() });
  assert.equal(cancel.filter((x) => x.canal).length, 0, "sem modelo de cancelamento, não envia");
});

test("chamada à API da Meta usa modelo, idioma e parâmetros", async () => {
  process.env.WHATSAPP_TOKEN = "tok"; process.env.WHATSAPP_PHONE_ID = "123";
  let pedido;
  await enviarWhatsapp({ para: "5519999990000", modelo: "consulta_confirmada", idioma: "pt_BR", parametros: ["Ana", "Dr", "02/11/2026", "09:00", "Online"] },
    async (url, o) => { pedido = { url, o, body: JSON.parse(o.body) }; return new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] })); });
  assert.equal(pedido.url, "https://graph.facebook.com/v21.0/123/messages");
  assert.equal(pedido.o.headers.Authorization, "Bearer tok");
  assert.equal(pedido.body.template.name, "consulta_confirmada");
  assert.equal(pedido.body.template.components[0].parameters[2].text, "02/11/2026");
  await assert.rejects(enviarWhatsapp({ para: "1", modelo: "x", parametros: [] },
    async () => new Response(JSON.stringify({ error: { message: "Template not found" } }), { status: 400 })), /Template not found/);
});

test("configuração exige seu número quando o aviso ao administrador está ligado", () => {
  assert.throws(() => base({ numero_admin: "" }), /número/);
});

test("prontuário: cifrado, até 15 evoluções por processo, novo processo preserva o histórico", async () => {
  const loja = new LojaMemoria(), cid = "abc123";
  delete process.env.PRONTUARIO_CHAVE;
  await assert.rejects(PR.adicionarEvolucao(loja, cid, { texto: "x" }, "eu"), { status: 503 });
  process.env.PRONTUARIO_CHAVE = "k".repeat(40);

  await assert.rejects(PR.adicionarEvolucao(loja, cid, { texto: "  " }, "eu"), /evolução/);
  for (let i = 1; i <= 15; i++)
    await PR.adicionarEvolucao(loja, cid, { data: `2026-01-${String(i).padStart(2, "0")}`, texto: `Sessão ${i}: paciente relata melhora.` }, "eu");
  await assert.rejects(PR.adicionarEvolucao(loja, cid, { texto: "16ª" }, "eu"), { status: 409 });

  const bruto = JSON.stringify(await loja.get(`prontuario/${cid}`, { type: "json" }));
  assert.doesNotMatch(bruto, /paciente relata/, "texto não fica legível no armazenamento");

  const proc2 = await PR.novoProcesso(loja, cid, { titulo: "Retorno 2027" });
  assert.equal(proc2.numero, 2);
  await assert.rejects(PR.novoProcesso(loja, cid), /ainda não tem/);
  const ev = await PR.adicionarEvolucao(loja, cid, { data: "2027-03-01", texto: "Novo início" }, "eu");
  await PR.editarEvolucao(loja, cid, ev.id, { data: "2027-03-02", texto: "Novo início (corrigido)" }, "eu");

  const p = await PR.lerProntuario(loja, cid);
  assert.equal(p.processos.length, 2);
  assert.equal(p.processos[0].evolucoes.length, 15);
  assert.ok(p.processos[0].fim, "processo anterior encerrado");
  assert.equal(p.processos[1].evolucoes[0].texto, "Novo início (corrigido)");
  await PR.excluirEvolucao(loja, cid, ev.id);
  assert.equal((await PR.lerProntuario(loja, cid)).processos[1].evolucoes.length, 0);

  process.env.PRONTUARIO_CHAVE = "z".repeat(40);
  await assert.rejects(PR.lerProntuario(loja, cid), /PRONTUARIO_CHAVE/);
  process.env.PRONTUARIO_CHAVE = "k".repeat(40);
});
