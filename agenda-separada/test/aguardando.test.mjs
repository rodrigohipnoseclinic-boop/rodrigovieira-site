// Clientes aguardando o horário combinado pelo WhatsApp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LojaMemoria } from "./loja-memoria.mjs";
import { PADRAO, normalizarConfig } from "../netlify/lib/agenda/config.mjs";
import { simulado, simularPagamento } from "../netlify/lib/agenda/pix.mjs";
import * as P from "../netlify/lib/agenda/pedidos.mjs";
import { reservar } from "../netlify/lib/agenda/reservas.mjs";
import { salvarCliente, marcarAguardando, anexarConsulta, listarClientes } from "../netlify/lib/agenda/clientes.mjs";
import { avisarAguardando } from "../netlify/lib/agenda/emails.mjs";
import { ler } from "../netlify/lib/agenda/armazem.mjs";

process.env.AGENDA_SEGREDO = "s".repeat(32);
const AGORA = { data: "2026-10-30", min: 600 };
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000, 1)]);
const dados = { nome: "Davi Espera", email: "davi@x.com", telefone: "19966665555" };
const cfg = normalizarConfig({ ...structuredClone(PADRAO), email_admin: "adm@x.com", pix: { ativo: true, valor: 200, prazo_dias: 30 },
  whatsapp: { ...PADRAO.whatsapp, ativo: true, numero_admin: "19997498217" } });

test("pagou e prefere combinar pelo WhatsApp: entra na lista e a consulta do painel usa o Pix", async () => {
  const L = { dados: new LojaMemoria(), fotos: new LojaMemoria() }, prov = simulado();
  const { pedido, token } = await P.criarPedido(L, cfg, prov, { modalidade: "presencial", dados, cpf: "52998224725", foto: jpeg });
  await assert.rejects(P.aguardarContato(L, cfg, prov, { pedido: pedido.id, token }), { status: 402 });
  simularPagamento(pedido.provedor_id);
  const { cliente } = await P.aguardarContato(L, cfg, prov, { pedido: pedido.id, token, obs: "terças à tarde" });
  assert.equal(cliente.aguardando.pedido, pedido.id);
  assert.equal(cliente.aguardando.obs, "terças à tarde");
  assert.equal((await listarClientes(L.dados)).filter((c) => c.aguardando).length, 1);

  const wa = [];
  const avisos = await avisarAguardando(L.dados, cfg, cliente, cliente.aguardando, { enviar: async () => {}, enviarWa: async (m) => wa.push(m) });
  assert.equal(avisos.length, 2);
  assert.deepEqual(wa[0].parametros, ["Davi Espera", "19966665555", "Presencial", "Pix confirmado"]);

  // painel agenda (fluxo da rota POST /consultas com cliente_id)
  const c = await reservar(L.dados, cfg, { modalidade: "presencial", data: "2026-11-03", inicio: "07:00", origem: "painel", por: "adm", pedido: cliente.aguardando.pedido,
    cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone } }, AGORA);
  const pend = await anexarConsulta(L.dados, cliente.id, c);
  assert.equal(pend.pedido, pedido.id);
  assert.equal(await P.vincularPedido(L.dados, pend.pedido, c), true);
  const p = (await ler(L.dados, `pedido/${pedido.id}`)).dado;
  assert.deepEqual([p.status, p.consulta], ["usado", c.id]);
  assert.equal((await ler(L.dados, `cliente/${cliente.id}`)).dado.aguardando, undefined, "sai da lista ao agendar");
  assert.equal(await P.vincularPedido(L.dados, pedido.id, c), false, "o mesmo Pix não é usado duas vezes");
  // o link do paciente agora mostra a consulta já marcada
  assert.equal((await P.reservarComPedido(L, cfg, prov, { pedido: pedido.id, token, data: "2026-11-04", inicio: "09:00" }, AGORA)).id, c.id);
});

test("cadastro sem pagamento (Pix desligado) e cadastro pelo painel", async () => {
  const L = { dados: new LojaMemoria(), fotos: new LojaMemoria() };
  const cli = await salvarCliente(L, dados, jpeg, "paciente");
  await marcarAguardando(L.dados, cli.id, { origem: "site", modalidade: "online", obs: "" });
  const novo = await salvarCliente(L, { nome: "Eva Painel", telefone: "19955554444" }, null, "adm@x.com");
  assert.equal(novo.email, "");
  await marcarAguardando(L.dados, novo.id, { origem: "painel" });
  const lista = (await listarClientes(L.dados)).filter((c) => c.aguardando).map((c) => c.nome);
  assert.deepEqual(lista, ["Davi Espera", "Eva Painel"]);
  await assert.rejects(marcarAguardando(L.dados, "inexistente", { origem: "painel" }), { status: 404 });
});
