// Testes da agenda contra um servidor local do Netlify Blobs (mesma
// biblioteca usada em produção, inclusive a gravação condicional).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";
import { PADRAO, normalizarConfig } from "../netlify/lib/agenda/config.mjs";
import { horariosLivres, periodosDoDia } from "../netlify/lib/agenda/disponibilidade.mjs";
import { reservar, cancelar, reagendar, buscar, conflitosDoBloqueio, alternativas, foraDoHorario } from "../netlify/lib/agenda/reservas.mjs";
import { salvarCliente, decodificarFoto, excluirCliente, anexarConsulta } from "../netlify/lib/agenda/clientes.mjs";
import { notificar, reenviar } from "../netlify/lib/agenda/emails.mjs";
import { lerDia } from "../netlify/lib/agenda/armazem.mjs";
import * as A from "../netlify/lib/agenda/auth.mjs";

import { LojaMemoria } from "./loja-memoria.mjs";
const lojaNova = () => new LojaMemoria();

// Confere que a biblioteca real respeita a gravação condicional.
test("Netlify Blobs (servidor local): onlyIfNew e onlyIfMatch recusam gravação desatualizada", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blobs-"));
  const srv = new BlobsServer({ directory: dir, token: "tk" });
  const { port } = await srv.start();
  try {
    const loja = getStore({ name: "t", siteID: "s", token: "tk", apiURL: `http://localhost:${port}` });
    const a = await loja.setJSON("k", { n: 1 }, { onlyIfNew: true });
    assert.equal(a.modified, true);
    assert.equal((await loja.setJSON("k", { n: 2 }, { onlyIfNew: true })).modified, false);
    const b = await loja.setJSON("k", { n: 2 }, { onlyIfMatch: a.etag });
    assert.equal(b.modified, true);
    assert.equal((await loja.setJSON("k", { n: 3 }, { onlyIfMatch: a.etag })).modified, false, "etag antigo é recusado");
    assert.deepEqual(await loja.get("k", { type: "json" }), { n: 2 });
  } finally {
    await srv.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// Segunda-feira, 2 de novembro de 2026; "agora" fixo na sexta anterior.
const SEG = "2026-11-02";
const AGORA = { data: "2026-10-30", min: 600 };
const cfgBase = (mudar = {}) => normalizarConfig({ ...structuredClone(PADRAO), ...mudar });
const cliente = (nome = "Ana Souza") => ({ id: null, nome, email: "ana@exemplo.com", telefone: "19999990000" });
const pedido = (x = {}) => ({ modalidade: "presencial", data: SEG, inicio: "09:00", cliente: cliente(), origem: "paciente", por: "paciente", ...x });

test("horários respeitam períodos, duração de 90 min e intervalo", () => {
  const cfg = cfgBase();
  assert.deepEqual(horariosLivres(cfg, "presencial", SEG, [], [], AGORA), ["09:00", "10:30", "14:00", "15:30"]);
  const c2 = cfgBase({ duracao: 60, intervalo: 15 });
  assert.deepEqual(horariosLivres(c2, "presencial", SEG, [], [], AGORA), ["09:00", "10:15", "14:00", "15:15", "16:30"]);
  const c3 = cfgBase({ duracao: 45, passo: 30 });
  assert.deepEqual(horariosLivres(c3, "presencial", SEG, [], [], AGORA).slice(0, 4), ["09:00", "09:30", "10:00", "10:30"]);
  assert.deepEqual(horariosLivres(cfg, "presencial", "2026-11-01", [], [], AGORA), [], "domingo sem atendimento");
});

test("não oferece datas passadas, fora da janela ou antes da antecedência", () => {
  const cfg = cfgBase({ antecedencia_horas: 2, janela_dias: 10 });
  assert.deepEqual(horariosLivres(cfg, "presencial", "2026-10-29", [], [], AGORA), []);
  assert.deepEqual(horariosLivres(cfg, "presencial", "2026-11-20", [], [], AGORA), []);
  // sexta 30/10, agora 10:00 + 2h → só a partir de 12:00
  assert.deepEqual(horariosLivres(cfg, "presencial", "2026-10-30", [], [], AGORA), ["14:00", "15:30"]);
});

test("bloqueios e horários extras alteram os horários oferecidos", () => {
  const cfg = cfgBase();
  const exc = [
    { tipo: "bloqueio", inicio_data: SEG, fim_data: SEG, inicio: "14:00", fim: "16:00", modalidade: "todas" },
    { tipo: "extra", inicio_data: SEG, fim_data: SEG, inicio: "19:00", fim: "20:30", modalidade: "online" },
  ];
  assert.deepEqual(horariosLivres(cfg, "presencial", SEG, [], exc, AGORA), ["09:00", "10:30", "16:00"]);
  assert.deepEqual(horariosLivres(cfg, "online", SEG, [], exc, AGORA), ["09:00", "10:30", "16:00", "19:00"]);
  const diaTodo = [{ tipo: "bloqueio", inicio_data: "2026-11-01", fim_data: "2026-11-03", inicio: null, fim: null, modalidade: "presencial" }];
  assert.deepEqual(periodosDoDia(cfg, "presencial", SEG, diaTodo), []);
  assert.equal(periodosDoDia(cfg, "online", SEG, diaTodo).length, 2);
});

test("modalidades separadas: semanas diferentes e agenda compartilhada ou independente", async () => {
  const loja = lojaNova();
  const base = structuredClone(PADRAO);
  base.modalidades.online.semana = { 1: [{ inicio: "18:00", fim: "21:00" }] };
  const cfg = cfgBase(base);
  assert.deepEqual(horariosLivres(cfg, "online", SEG, [], [], AGORA), ["18:00", "19:30"]);

  const mesma = cfgBase({ modalidades: { ...structuredClone(PADRAO.modalidades) } });
  await reservar(loja, mesma, pedido(), AGORA);
  assert.ok(!horariosLivres(mesma, "online", SEG, await lerDia(loja, SEG), [], AGORA).includes("09:00"), "agenda compartilhada bloqueia a outra modalidade");

  const sep = structuredClone(PADRAO);
  sep.modalidades.online.agenda = "online";
  const separada = cfgBase(sep);
  assert.ok(horariosLivres(separada, "online", SEG, await lerDia(loja, SEG), [], AGORA).includes("09:00"), "agendas independentes");
});

test("reserva presencial e online gravam a consulta com início e término", async () => {
  const loja = lojaNova(), cfg = cfgBase();
  const p = await reservar(loja, cfg, pedido({ inicio: "14:00" }), AGORA);
  assert.equal(p.fim, "15:30");
  assert.equal(p.modalidade, "presencial");
  const o = await reservar(loja, cfg, pedido({ modalidade: "online", inicio: "09:00", cliente: cliente("Bia Lima") }), AGORA);
  assert.equal(o.modalidade, "online");
  assert.equal((await buscar(loja, o.id)).cliente.nome, "Bia Lima");
  assert.deepEqual(horariosLivres(cfg, "presencial", SEG, await lerDia(loja, SEG), [], AGORA), ["10:30", "15:30"]);
});

test("paciente não consegue reservar horário fora do oferecido", async () => {
  const loja = lojaNova(), cfg = cfgBase();
  await assert.rejects(reservar(loja, cfg, pedido({ inicio: "09:15" }), AGORA), { status: 409 });
  await assert.rejects(reservar(loja, cfg, pedido({ inicio: "07:00" }), AGORA), { status: 409 });
});

test("duas pessoas no mesmo horário ao mesmo tempo: só uma consegue", async () => {
  const loja = lojaNova(), cfg = cfgBase();
  const r = await Promise.allSettled(Array.from({ length: 8 }, (_, i) =>
    reservar(loja, cfg, pedido({ cliente: cliente(`Pessoa ${i}`) }), AGORA)));
  assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
  assert.ok(r.filter((x) => x.status === "rejected").every((x) => x.reason.status === 409));
  assert.equal((await lerDia(loja, SEG)).length, 1);
  const alt = await alternativas(loja, cfg, "presencial", SEG, AGORA);
  assert.equal(alt[0].data, SEG);
  assert.ok(!alt[0].horarios.includes("09:00"));
});

test("mudar a duração afeta só as novas consultas", async () => {
  const loja = lojaNova();
  const antiga = await reservar(loja, cfgBase(), pedido(), AGORA);
  const cfg60 = cfgBase({ duracao: 60 });
  assert.deepEqual(horariosLivres(cfg60, "presencial", SEG, await lerDia(loja, SEG), [], AGORA), ["11:00", "14:00", "15:00", "16:00", "17:00"]);
  assert.equal((await buscar(loja, antiga.id)).fim, "10:30");
});

test("painel: cancelar libera o horário; transferir move e mantém a duração", async () => {
  const loja = lojaNova(), cfg = cfgBase();
  const a = await reservar(loja, cfg, pedido(), AGORA);
  const b = await reservar(loja, cfg, pedido({ inicio: "14:00", cliente: cliente("Caio") }), AGORA);
  await cancelar(loja, a.id, "admin@x.com", "pediu");
  assert.ok(horariosLivres(cfg, "presencial", SEG, await lerDia(loja, SEG), [], AGORA).includes("09:00"));
  await assert.rejects(cancelar(loja, a.id, "admin@x.com"));

  assert.equal((await reagendar(loja, cfg, b.id, { data: SEG, inicio: "14:30" }, "admin")).fim, "16:00", "no mesmo dia, ignora a própria consulta");
  const c = await reservar(loja, cfg, pedido({ inicio: "10:30", cliente: cliente("Dora") }), AGORA);
  await assert.rejects(reagendar(loja, cfg, b.id, { data: SEG, inicio: "11:00" }, "admin"), { status: 409 });
  const t = await reagendar(loja, cfg, b.id, { data: "2026-11-03", inicio: "16:00", modalidade: "online" }, "admin");
  assert.deepEqual([t.data, t.inicio, t.fim, t.modalidade], ["2026-11-03", "16:00", "17:30", "online"]);
  assert.equal((await lerDia(loja, SEG)).some((x) => x.id === b.id), false);
  assert.equal((await buscar(loja, b.id)).data, "2026-11-03");
  assert.equal(t.historico.at(-1).de.inicio, "14:30");
  assert.ok(c);
});

test("painel pode marcar fora do horário de atendimento, mas nunca sobrepor", async () => {
  const loja = lojaNova(), cfg = cfgBase();
  const x = await reservar(loja, cfg, pedido({ origem: "painel", por: "admin", inicio: "07:00", duracao: 60 }), AGORA);
  assert.equal(x.fim, "08:00");
  await assert.rejects(reservar(loja, cfg, pedido({ origem: "painel", por: "admin", inicio: "07:30" }), AGORA), { status: 409 });
});

test("bloqueio avisa sobre consultas existentes; mudança de semana lista as que ficaram fora", async () => {
  const loja = lojaNova(), cfg = cfgBase({ janela_dias: 60 });
  const c = await reservar(loja, cfg, pedido({ inicio: "14:00" }), AGORA);
  const cs = await conflitosDoBloqueio(loja, { inicio_data: SEG, fim_data: SEG, inicio: "15:00", fim: "16:00", modalidade: "todas" });
  assert.deepEqual(cs.map((x) => x.id), [c.id]);
  assert.equal((await conflitosDoBloqueio(loja, { inicio_data: SEG, fim_data: SEG, inicio: "10:00", fim: "12:00", modalidade: "todas" })).length, 0);
  assert.equal((await conflitosDoBloqueio(loja, { inicio_data: SEG, fim_data: SEG, inicio: null, fim: null, modalidade: "online" })).length, 0);
  const nova = structuredClone(cfg);
  nova.modalidades.presencial.semana[1] = [{ inicio: "08:00", fim: "12:00" }];
  assert.deepEqual((await foraDoHorario(loja, nova, AGORA)).map((x) => x.id), [c.id]);
});

test("e-mails: um registro por mensagem, falha registrada e reenvio sem duplicar", async () => {
  const loja = lojaNova(), cfg = cfgBase({ email_admin: "rodrigo@exemplo.com" });
  const c = await reservar(loja, cfg, pedido(), AGORA);
  const enviados = [];
  let falhar = true;
  const enviar = async (m) => { if (falhar && m.quem === "paciente") throw new Error("SMTP fora"); enviados.push(m); };
  const r1 = await notificar(loja, cfg, c, "confirmacao", { enviar });
  assert.deepEqual(r1.map((x) => [x.quem, x.status]), [["paciente", "erro"], ["admin", "enviado"]]);
  assert.match(r1[0].texto, /Endereço: Amparo - SP/);
  assert.match(r1[0].texto, /das 09:00 às 10:30/);
  assert.match(r1[1].texto, /Duração: 90 minutos/);
  assert.match(r1[1].texto, new RegExp(`Identificador: ${c.id}`));

  const r2 = await notificar(loja, cfg, c, "confirmacao", { enviar });
  assert.equal(enviados.length, 1, "repetir o mesmo evento não reenvia");
  assert.equal(r2[0].status, "erro");

  falhar = false;
  const ok = await reenviar(loja, r1[0].id, enviar);
  assert.equal(ok.status, "enviado");
  await reenviar(loja, r1[0].id, enviar);
  assert.equal(enviados.length, 2, "reenviar o que já foi entregue não duplica");
});

test("e-mail online traz orientações e não traz endereço", async () => {
  const loja = lojaNova(), cfg = cfgBase({ email_admin: "a@b.com" });
  const c = await reservar(loja, cfg, pedido({ modalidade: "online" }), AGORA);
  const [pac] = await notificar(loja, cfg, c, "confirmacao", { enviar: async () => {} });
  assert.doesNotMatch(pac.texto, /Endereço/);
  assert.match(pac.texto, /Modalidade: Online/);
  assert.match(pac.texto, /videochamada/);
});

test("cadastro exige foto JPEG válida e exclusão apaga dados (LGPD)", async () => {
  const L = { dados: lojaNova(), fotos: lojaNova() };
  assert.throws(() => decodificarFoto(""), /foto/);
  assert.throws(() => decodificarFoto("data:image/png;base64,AAAA"), /foto/);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000, 1)]);
  const foto = decodificarFoto(`data:image/jpeg;base64,${jpeg.toString("base64")}`);
  const cli = await salvarCliente(L, cliente(), foto, "paciente");
  assert.ok(cli.foto && cli.consentimento);
  assert.equal((await L.fotos.get(cli.id, { type: "arrayBuffer" })).byteLength, jpeg.length);

  const c = await reservar(L.dados, cfgBase(), pedido({ cliente: { ...cliente(), id: cli.id } }), AGORA);
  await anexarConsulta(L.dados, cli.id, c);
  await excluirCliente(L, cli.id);
  assert.equal(await L.fotos.get(cli.id), null);
  const depois = await buscar(L.dados, c.id);
  assert.deepEqual([depois.cliente.nome, depois.cliente.email, depois.cliente.telefone], ["Ana Souza", "", ""]);
});

test("login: senha, bloqueio por tentativas, sessão assinada e perfis", async () => {
  process.env.AGENDA_SEGREDO = "x".repeat(32);
  const loja = lojaNova();
  assert.equal(await A.haUsuarios(loja), false);
  await A.criarUsuario(loja, { email: "Dono@x.com", nome: "Dono", papel: "admin", senha: "senha-forte-1" });
  await assert.rejects(A.criarUsuario(loja, { email: "dono@x.com", papel: "admin", senha: "senha-forte-1" }), { status: 409 });
  await assert.rejects(A.entrar(loja, "dono@x.com", "errada"), { status: 401 });
  const u = await A.entrar(loja, "dono@x.com", "senha-forte-1");
  const cookie = A.cookieSessao(u).split(";")[0];
  const req = (c) => new Request("https://x/api/painel/eu", { headers: { cookie: c } });
  assert.equal((await A.usuarioDaSessao(loja, req(cookie))).email, "dono@x.com");
  assert.equal(await A.usuarioDaSessao(loja, req(cookie.slice(0, -2) + "zz")), null, "assinatura adulterada");
  await A.trocarSenha(loja, "dono@x.com", "outra-senha-forte");
  assert.equal(await A.usuarioDaSessao(loja, req(cookie)), null, "trocar senha derruba sessões");

  for (let i = 0; i < 8; i++) await A.entrar(loja, "dono@x.com", "x").catch(() => {});
  await assert.rejects(A.entrar(loja, "dono@x.com", "outra-senha-forte"), { status: 429 });

  assert.equal(A.pode({ papel: "assistente" }, "consultas"), true);
  assert.equal(A.pode({ papel: "assistente" }, "config"), false);
  assert.equal(A.pode({ papel: "assistente" }, "admin"), false);
  assert.equal(A.pode({ papel: "admin" }, "config"), true);
});

test("configuração rejeita valores inválidos", () => {
  assert.throws(() => cfgBase({ duracao: 5 }), /Duração/);
  const p = structuredClone(PADRAO);
  p.modalidades.presencial.semana = { 1: [{ inicio: "09:00", fim: "12:00" }, { inicio: "11:00", fim: "13:00" }] };
  assert.throws(() => cfgBase(p), /sobrepostos/);
  assert.throws(() => cfgBase({ email_admin: "nao-e-email" }), /E-mail/);
});
