// Links de sessão: você gera no painel um link pessoal para o cliente.
// O mesmo link tem dois estágios:
//   1ª sessão: horários a partir de (data de envio + min_dias_primeira), padrão 2.
//   2ª sessão (retorno): a partir de (data da 1ª sessão + min_dias_retorno), padrão 22.
// Assim que a 1ª sessão é agendada, o link passa para o estágio da 2ª.
// O bloqueio vale só para este link; a agenda geral não muda.
// O cliente não desmarca sozinho: pede, informa o motivo e aceita a taxa; você decide.
import crypto from "node:crypto";
import { atualizar, ler, lerDia, lerExcecoes, listarChaves, novoId } from "./armazem.mjs";
import { Erro, MODALIDADES } from "./config.mjs";
import { horariosLivres } from "./disponibilidade.mjs";
import { reservar, buscar, cancelar } from "./reservas.mjs";
import { decifrar, hashToken, novoToken } from "./pedidos.mjs";
import { agoraLocal, somaDias, difDias, dataValida, paraMin } from "./tempo.mjs";
import { baseUrl } from "./http.mjs";

const limpa = (id) => String(id || "").replace(/[^A-Za-z0-9]/g, "");
const dias = (v, padrao, nome) => {
  const n = v === undefined || v === "" || v === null ? padrao : Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 365) throw new Erro(`${nome}: informe um número de dias entre 0 e 365.`);
  return n;
};
export const linkSessao = (s) => `${baseUrl()}/sessao/?s=${s.id}&t=${decifrar(s.token_cifrado)}`;
export const ROTULO = { primeira: "1ª sessão", segunda: "2ª sessão" };

// "primeira" (ainda não agendou), "segunda" (1ª já agendada) ou "concluido".
export const estagio = (s) => (!s.primeira ? "primeira" : !s.segunda ? "segunda" : "concluido");

export function dataMinima(s) {
  const e = estagio(s);
  if (e === "primeira") return somaDias(s.enviado_data, s.min_dias_primeira);
  if (e === "segunda") return somaDias(s.primeira.data, s.min_dias_retorno);
  return null;
}

export async function criarSessao(loja, cfg, { cliente, modalidade, valor, observacao = "", min_dias_primeira, min_dias_retorno }, por, agora = agoraLocal()) {
  if (!MODALIDADES.includes(modalidade)) throw new Erro("Modalidade inválida.");
  const v = valor === undefined || valor === "" ? cfg.sessoes.valor : Math.round(Number(valor) * 100) / 100;
  if (!(v >= 0 && v <= 10000)) throw new Erro("Valor inválido.");
  const { token_hash, token_cifrado } = novoToken();
  const s = {
    id: novoId(12), token_hash, token_cifrado, modalidade, valor: v,
    enviado_em: new Date().toISOString(), enviado_data: agora.data,
    min_dias_primeira: dias(min_dias_primeira, cfg.sessoes.intervalo_primeira_dias, "Prazo da 1ª sessão"),
    min_dias_retorno: dias(min_dias_retorno, cfg.sessoes.intervalo_dias, "Prazo da 2ª sessão"),
    primeira: null, segunda: null, revogado: false, aberto_em: null, desmarcacao: null,
    cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone },
    observacao: String(observacao).slice(0, 300), criado: new Date().toISOString(), por, eventos: [],
  };
  await loja.setJSON(`sessao/${s.id}`, s);
  return s;
}

export async function autenticarSessao(loja, id, token) {
  const s = (await ler(loja, `sessao/${limpa(id)}`)).dado;
  const a = Buffer.from(hashToken(token)), b = Buffer.from(s?.token_hash || "");
  if (!s || a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Erro("Link de sessão inválido.", 404);
  if (s.revogado) throw new Erro("Este link foi desativado. Fale com o consultório.", 410);
  return s;
}

// Só registra quando o cliente abriu o link (informativo para o painel).
export async function abrirSessao(loja, s, agora = agoraLocal()) {
  if (s.aberto_em) return s;
  return atualizar(loja, `sessao/${s.id}`, (x) => {
    if (!x.aberto_em) x.aberto_em = agora.data;
    return x;
  });
}

// Mesmas regras de horário do site, a partir da data mínima do estágio e
// com a janela de agendamento contada a partir dela.
function regras(cfg, s, agora) {
  const min = dataMinima(s);
  if (!min) return null;
  return {
    min,
    cfg: {
      ...cfg, janela_dias: Math.max(0, difDias(agora.data, min)) + cfg.janela_dias,
      modalidades: { ...cfg.modalidades, [s.modalidade]: { ...cfg.modalidades[s.modalidade], ativa: true } },
    },
  };
}

export async function horariosSessao(loja, cfg, s, data, agora = agoraLocal()) {
  const r = regras(cfg, s, agora);
  if (!r || !dataValida(data) || data < r.min) return [];
  return horariosLivres(r.cfg, s.modalidade, data, await lerDia(loja, data), await lerExcecoes(loja), agora);
}

export async function diasSessao(loja, cfg, s, mes, agora = agoraLocal()) {
  const r = regras(cfg, s, agora);
  if (!r) return [];
  const [a, m] = mes.split("-").map(Number);
  const fim = somaDias(m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`, -1);
  const lim = somaDias(r.min, cfg.janela_dias);
  const exc = await lerExcecoes(loja);
  const out = [];
  for (let d = `${mes}-01` < r.min ? r.min : `${mes}-01`; d <= fim && d <= lim; d = somaDias(d, 1))
    if (horariosLivres(r.cfg, s.modalidade, d, await lerDia(loja, d), exc, agora).length) out.push(d);
  return out;
}

// Agenda a sessão do estágio atual. Uma consulta por estágio.
export async function reservarSessao(loja, cfg, s, { data, inicio }, agora = agoraLocal()) {
  const e = estagio(s);
  if (e === "concluido") throw new Erro("As duas sessões deste link já foram agendadas.", 409);
  const r = regras(cfg, s, agora);
  if (!dataValida(data) || data < r.min)
    throw new Erro(`Esta sessão fica disponível a partir de ${r.min.split("-").reverse().join("/")}.`, 409, { indisponivel: true });

  const trava = `uso-sessao/${s.id}/${e}`;
  const t = await ler(loja, trava);
  const ok = t.dado
    ? Date.now() - t.dado.ts > 120e3 && (await loja.setJSON(trava, { ts: Date.now() }, { onlyIfMatch: t.etag })).modified
    : (await loja.setJSON(trava, { ts: Date.now() }, { onlyIfNew: true })).modified;
  if (!ok) throw new Erro("Seu agendamento já está sendo processado. Aguarde alguns segundos e recarregue a página.", 409);

  let c;
  try {
    c = await reservar(loja, r.cfg, {
      modalidade: s.modalidade, data, inicio, origem: "sessao", por: `cliente (link, ${ROTULO[e]})`, sessao: s.id, cliente: s.cliente,
    }, agora);
  } catch (err) {
    await loja.delete(trava);
    throw err;
  }
  await atualizar(loja, `sessao/${s.id}`, (x) => {
    x[e] = { consulta: c.id, data: c.data, inicio: c.inicio, agendado_em: new Date().toISOString() };
    x.eventos.push({ quando: x[e].agendado_em, acao: `${e}-agendada`, consulta: c.id, data: c.data });
    return x;
  });
  await loja.delete(trava);
  return c;
}

// Sessões do link que ainda estão marcadas (para mostrar ao cliente).
export async function sessoesMarcadas(loja, s) {
  const out = [];
  for (const e of ["primeira", "segunda"]) {
    if (!s[e]) continue;
    const c = await buscar(loja, s[e].consulta).catch(() => null);
    if (c && c.status === "confirmada") out.push({ estagio: e, rotulo: ROTULO[e], consulta: c });
  }
  return out;
}

// Taxa conforme a antecedência (horário de Brasília).
export function taxaDesmarcacao(cfg, c, agora = agoraLocal()) {
  const minutos = difDias(agora.data, c.data) * 1440 + paraMin(c.inicio) - agora.min;
  return { taxa: minutos >= cfg.sessoes.prazo_horas * 60 ? cfg.sessoes.taxa : cfg.sessoes.taxa_tardia, horas: Math.floor(minutos / 60) };
}

export async function solicitarDesmarcacao(loja, cfg, s, { consulta, motivo, aceite }, agora = agoraLocal()) {
  const marcadas = await sessoesMarcadas(loja, s);
  const alvo = marcadas.find((x) => x.consulta.id === consulta) || (marcadas.length === 1 ? marcadas[0] : null);
  if (!alvo) throw new Erro("Não há sessão marcada para desmarcar.");
  const c = alvo.consulta;
  const { taxa, horas } = taxaDesmarcacao(cfg, c, agora);
  if (horas < 0) throw new Erro("O horário desta sessão já passou.");
  const m = String(motivo || "").trim().slice(0, 1000);
  if (m.length < 3) throw new Erro("Descreva o motivo da desmarcação.");
  if (!aceite) throw new Erro("Para pedir a desmarcação, confirme que está de acordo com a taxa.");
  if (s.desmarcacao?.status === "pendente") throw new Erro("Já existe um pedido de desmarcação aguardando o consultório.", 409);
  const pedido = { status: "pendente", estagio: alvo.estagio, motivo: m, taxa, horas_antes: horas, quando: new Date().toISOString(), consulta: c.id, taxa_paga: false };
  await atualizar(loja, `sessao/${s.id}`, (x) => {
    x.desmarcacao = pedido;
    x.eventos.push({ quando: pedido.quando, acao: "desmarcacao-pedida", taxa, consulta: c.id });
    return x;
  });
  return pedido;
}

// Libera o estágio da consulta cancelada para o cliente agendar de novo.
// A 1ª só é liberada se a 2ª ainda não foi marcada (a 2ª depende da data da 1ª).
function liberarEstagio(x, consultaId) {
  if (x.segunda?.consulta === consultaId) x.segunda = null;
  else if (x.primeira?.consulta === consultaId && !x.segunda) x.primeira = null;
}

// Painel: aprovar (cancela a sessão e reabre o estágio), recusar, ou marcar a taxa como paga.
export async function decidirDesmarcacao(loja, sid, decisao, por) {
  const s = (await ler(loja, `sessao/${limpa(sid)}`)).dado;
  if (!s) throw new Erro("Sessão não encontrada.", 404);
  if (decisao === "taxa-paga") {
    if (!s.desmarcacao) throw new Erro("Não há pedido de desmarcação.");
    return atualizar(loja, `sessao/${s.id}`, (x) => { x.desmarcacao.taxa_paga = true; return x; });
  }
  if (s.desmarcacao?.status !== "pendente") throw new Erro("Não há pedido de desmarcação pendente.");
  if (decisao === "aprovar") {
    const c = await buscar(loja, s.desmarcacao.consulta);
    if (c.status === "confirmada") await cancelar(loja, c.id, por, `Desmarcação a pedido do cliente: ${s.desmarcacao.motivo}`);
  }
  return atualizar(loja, `sessao/${s.id}`, (x) => {
    x.desmarcacao.status = decisao === "aprovar" ? "aprovada" : "recusada";
    x.desmarcacao.decidido = new Date().toISOString();
    if (decisao === "aprovar") liberarEstagio(x, x.desmarcacao.consulta);
    x.eventos.push({ quando: x.desmarcacao.decidido, acao: `desmarcacao-${x.desmarcacao.status}`, por });
    return x;
  });
}

// Consulta alterada pela agenda do painel: cancelada libera o estágio;
// transferida atualiza a data (a da 1ª é a base do prazo da 2ª).
export async function sincronizarSessao(loja, c) {
  if (!c.sessao) return;
  await atualizar(loja, `sessao/${c.sessao}`, (x) => {
    if (!x.id) return x;
    if (c.status !== "confirmada") liberarEstagio(x, c.id);
    else for (const e of ["primeira", "segunda"]) if (x[e]?.consulta === c.id) Object.assign(x[e], { data: c.data, inicio: c.inicio });
    return x;
  });
}

export async function revogarSessao(loja, sid) {
  return atualizar(loja, `sessao/${limpa(sid)}`, (x) => {
    if (!x.id) throw new Erro("Sessão não encontrada.", 404);
    x.revogado = true;
    return x;
  });
}

export async function listarSessoes(loja) {
  const chaves = await listarChaves(loja, "sessao/");
  const ss = (await Promise.all(chaves.map(async (k) => (await ler(loja, k)).dado))).filter(Boolean);
  return ss.sort((a, b) => b.criado.localeCompare(a.criado));
}
