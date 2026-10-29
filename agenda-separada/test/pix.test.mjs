// Fluxo Pix: cobrança → confirmação pelo provedor → calendário → consulta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LojaMemoria } from "./loja-memoria.mjs";
import { PADRAO, normalizarConfig } from "../netlify/lib/agenda/config.mjs";
import { simulado, simularPagamento, asaas, tokenWebhook } from "../netlify/lib/agenda/pix.mjs";
import * as P from "../netlify/lib/agenda/pedidos.mjs";
import { cancelar, buscar } from "../netlify/lib/agenda/reservas.mjs";
import { lerDia, ler } from "../netlify/lib/agenda/armazem.mjs";

process.env.AGENDA_SEGREDO = "s".repeat(32);
const AGORA = { data: "2026-10-30", min: 600 };
const SEG = "2026-11-02";
const cfg = normalizarConfig({ ...structuredClone(PADRAO), email_admin: "adm@x.com", pix: { ativo: true, valor: 250, prazo_dias: 30 } });
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000, 1)]);
const dados = { nome: "Ana Souza", email: "ana@exemplo.com", telefone: "19999990000" };
const CPF = "529.982.247-25";
const novo = () => ({ dados: new LojaMemoria(), fotos: new LojaMemoria() });
const req = (h = {}) => new Request("https://x/api/agenda/webhook", { method: "POST", headers: h });
const emailsDe = async (loja) => (await loja.list({ prefix: "email/" })).blobs.length;

test("CPF é validado", () => {
  assert.equal(P.validarCpf(CPF), "52998224725");
  assert.throws(() => P.validarCpf("111.111.111-11"));
  assert.throws(() => P.validarCpf("529.982.247-24"));
});

test("sem pagamento confirmado não há reserva; pagamento confirmado libera uma única consulta", async () => {
  const L = novo(), prov = simulado();
  const { pedido, token } = await P.criarPedido(L, cfg, prov, { modalidade: "presencial", dados, cpf: CPF, foto: jpeg });
  assert.equal(pedido.status, "pendente");
  assert.ok(pedido.copia_cola);
  const r = { pedido: pedido.id, token, modalidade: "presencial", data: SEG, inicio: "09:00" };
  await assert.rejects(P.reservarComPedido(L, cfg, prov, r, AGORA), { status: 402 });
  await assert.rejects(P.reservarComPedido(L, cfg, prov, { ...r, token: "falso" }, AGORA), { status: 404 });

  simularPagamento(pedido.provedor_id);
  const c = await P.reservarComPedido(L, cfg, prov, r, AGORA);
  assert.equal(c.pedido, pedido.id);
  const de_novo = await P.reservarComPedido(L, cfg, prov, { ...r, inicio: "14:00" }, AGORA);
  assert.equal(de_novo.id, c.id, "o mesmo pagamento não gera segunda consulta");
  assert.equal((await lerDia(L.dados, SEG)).length, 1);
  assert.equal((await ler(L.dados, `pedido/${pedido.id}`)).dado.status, "usado");
});

test("pedido em aberto é reaproveitado (sem cobrança repetida)", async () => {
  const L = novo(), prov = simulado();
  const a = await P.criarPedido(L, cfg, prov, { modalidade: "online", dados, cpf: CPF, foto: jpeg });
  const b = await P.criarPedido(L, cfg, prov, { modalidade: "online", dados, cpf: CPF, foto: jpeg });
  assert.equal(a.pedido.id, b.pedido.id);
  assert.equal(a.token, b.token);
  assert.equal((await L.dados.list({ prefix: "pedido/" })).blobs.length, 1);
});

test("webhook: exige autenticação, confirma pelo provedor e ignora repetições", async () => {
  const L = novo(), prov = simulado();
  const { pedido } = await P.criarPedido(L, cfg, prov, { modalidade: "online", dados, cpf: CPF, foto: jpeg });
  await assert.rejects(P.processarWebhook(L.dados, cfg, prov, req(), { id: pedido.provedor_id }), { status: 401 });
  // webhook autêntico, mas o provedor ainda diz "pendente": nada muda
  assert.equal((await P.processarWebhook(L.dados, cfg, prov, req({ "x-simulado": "1" }), { id: pedido.provedor_id })).status, "pendente");
  simularPagamento(pedido.provedor_id);
  const ps = await Promise.all([1, 2, 3].map(() => P.processarWebhook(L.dados, cfg, prov, req({ "x-simulado": "1" }), { id: pedido.provedor_id })));
  assert.ok(ps.every((p) => p.status === "pago"));
  const p = (await ler(L.dados, `pedido/${pedido.id}`)).dado;
  assert.equal(p.eventos.filter((e) => e.acao === "status-pago").length, 1, "uma confirmação só");
  assert.equal(await emailsDe(L.dados), 2, "um e-mail para o paciente e um para o administrador");
  assert.equal(await P.processarWebhook(L.dados, cfg, prov, req({ "x-simulado": "1" }), { id: "outra" }), null);
  const pac = (await ler(L.dados, `email/pg-${pedido.id}-paciente`)).dado;
  assert.match(pac.texto, new RegExp(`/agendar/\\?p=${pedido.id}&t=`), "e-mail traz o link para retomar");
});

test("falha depois de pagar: o link continua valendo e não cobra de novo", async () => {
  const L = novo(), prov = simulado();
  const { pedido, token } = await P.criarPedido(L, cfg, prov, { modalidade: "presencial", dados, cpf: CPF, foto: jpeg });
  simularPagamento(pedido.provedor_id);
  // horário inexistente: a reserva falha, a trava é liberada
  await assert.rejects(P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token, data: SEG, inicio: "03:00" }, AGORA), { status: 409 });
  // queda simulada: trava antiga ficou para trás sem consulta
  await L.dados.setJSON(`uso/${pedido.id}`, { data: SEG, ts: Date.now() - 300e3 });
  const c = await P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token, data: SEG, inicio: "10:30" }, AGORA);
  assert.equal(c.inicio, "10:30");
  assert.equal((await L.dados.list({ prefix: "pedido/" })).blobs.length, 1);
});

test("queda depois de gravar a consulta: retomada encontra a consulta e não marca outra", async () => {
  const L = novo(), prov = simulado();
  const { pedido, token } = await P.criarPedido(L, cfg, prov, { modalidade: "presencial", dados, cpf: CPF, foto: jpeg });
  simularPagamento(pedido.provedor_id);
  const c = await P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token, data: SEG, inicio: "09:00" }, AGORA);
  // simula que o pedido não chegou a ser marcado como usado
  const { dado } = await ler(L.dados, `pedido/${pedido.id}`);
  await L.dados.setJSON(`pedido/${pedido.id}`, { ...dado, status: "pago", consulta: null });
  const r = await P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token, data: SEG, inicio: "14:00" }, AGORA);
  assert.equal(r.id, c.id);
  assert.equal((await lerDia(L.dados, SEG)).filter((x) => x.status === "confirmada").length, 1);
});

test("valor pago menor que o cobrado não libera o calendário", async () => {
  const L = novo();
  const prov = { ...simulado(), consultar: async () => ({ status: "pago", valor: 10 }) };
  const { pedido, token } = await P.criarPedido(L, cfg, { ...simulado(), nome: "simulado" }, { modalidade: "online", dados, cpf: CPF, foto: jpeg });
  await assert.rejects(P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token, data: SEG, inicio: "09:00" }, AGORA), { status: 402 });
  assert.equal((await ler(L.dados, `pedido/${pedido.id}`)).dado.status, "divergente");
});

test("painel: liberar novo agendamento após cancelar e estornar", async () => {
  const L = novo(), prov = simulado();
  const { pedido, token } = await P.criarPedido(L, cfg, prov, { modalidade: "presencial", dados, cpf: CPF, foto: jpeg });
  simularPagamento(pedido.provedor_id);
  const c = await P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token, data: SEG, inicio: "09:00" }, AGORA);
  await assert.rejects(P.liberarPedido(L.dados, pedido.id), /Cancele/);
  await assert.rejects(P.estornar(L.dados, prov, pedido.id), /Cancele/);
  await cancelar(L.dados, c.id, "adm");
  const { token: t2 } = await P.liberarPedido(L.dados, pedido.id);
  await assert.rejects(P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token, data: SEG, inicio: "10:30" }, AGORA), { status: 404 }, "link antigo deixa de valer");
  const c2 = await P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token: t2, data: SEG, inicio: "10:30" }, AGORA);
  assert.notEqual(c2.id, c.id);
  await cancelar(L.dados, c2.id, "adm");
  assert.equal((await P.estornar(L.dados, prov, pedido.id)).status, "estornado");
  assert.equal((await buscar(L.dados, c2.id)).status, "cancelada");
});

test("Asaas: cria cliente, cobrança Pix e QR; status consultado na API", async () => {
  process.env.ASAAS_API_KEY = "chave-teste";
  const chamadas = [];
  const respostas = {
    "POST /customers": { id: "cus_1" },
    "POST /payments": { id: "pay_1" },
    "GET /payments/pay_1/pixQrCode": { encodedImage: "iVBOR", payload: "00020126...", expirationDate: "2026-10-31 23:59:59" },
    "GET /payments/pay_1": { id: "pay_1", status: "RECEIVED", value: 250, externalReference: "ped1" },
  };
  const f = async (url, o) => {
    const k = `${o.method} ${new URL(url).pathname.replace("/v3", "")}`;
    chamadas.push({ k, url, headers: o.headers, body: o.body && JSON.parse(o.body) });
    return new Response(JSON.stringify(respostas[k] || {}), { status: respostas[k] ? 200 : 404 });
  };
  const a = asaas(f);
  const cob = await a.criarCobranca({ pedidoId: "ped1", valor: 250, descricao: "Consulta", vencimento: "2026-10-31",
    cliente: { nome: "Ana", cpf: "52998224725", email: "a@b.com", telefone: "19999990000" } });
  assert.deepEqual([cob.provedor_id, cob.copia_cola], ["pay_1", "00020126..."]);
  assert.match(cob.qr_imagem, /^data:image\/png;base64,/);
  assert.equal(chamadas[0].headers.access_token, "chave-teste");
  assert.match(chamadas[0].url, /api-sandbox\.asaas\.com/);
  assert.equal(chamadas[1].body.billingType, "PIX");
  assert.equal(chamadas[1].body.externalReference, "ped1");
  assert.deepEqual(await a.consultar("pay_1"), { status: "pago", valor: 250, referencia: "ped1", bruto: "RECEIVED" });

  process.env.ASAAS_WEBHOOK_TOKEN = "token-do-webhook-com-32-caracteres-ou-mais";
  assert.equal(a.webhookAutentico(req({ "asaas-access-token": "token-do-webhook-com-32-caracteres-ou-mais" })), true);
  assert.equal(a.webhookAutentico(req({ "asaas-access-token": "errado" })), false);
  assert.equal(a.webhookAutentico(req()), false);
  assert.equal(a.idDoWebhook({ event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } }), "pay_1");

  // sem ASAAS_WEBHOOK_TOKEN: token derivado de AGENDA_SEGREDO; o painel cadastra o webhook
  delete process.env.ASAAS_WEBHOOK_TOKEN;
  const derivado = tokenWebhook();
  assert.equal(derivado.length, 64);
  assert.equal(a.webhookAutentico(req({ "asaas-access-token": derivado })), true);
  respostas["GET /webhooks"] = { data: [] };
  respostas["POST /webhooks"] = { id: "wh_1", url: "https://x/api/agenda/webhook" };
  const w = await a.registrarWebhook("https://x/api/agenda/webhook", "adm@x.com");
  assert.deepEqual(w, { id: "wh_1", url: "https://x/api/agenda/webhook", atualizado: false });
  const enviado = chamadas.find((c) => c.k === "POST /webhooks").body;
  assert.equal(enviado.authToken, derivado);
  assert.ok(enviado.events.includes("PAYMENT_RECEIVED") && enviado.events.includes("PAYMENT_CONFIRMED"));
  respostas["GET /webhooks"] = { data: [{ id: "wh_1", url: "https://x/api/agenda/webhook" }] };
  respostas["PUT /webhooks/wh_1"] = { id: "wh_1", url: "https://x/api/agenda/webhook" };
  assert.equal((await a.registrarWebhook("https://x/api/agenda/webhook", "adm@x.com")).atualizado, true, "não duplica");
});
