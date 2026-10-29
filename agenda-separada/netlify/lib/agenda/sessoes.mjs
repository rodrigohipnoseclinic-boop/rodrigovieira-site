// Links de sessão: só você gera, no painel. Cada link é pessoal, vale por
// 12 horas (configurável) e permite um único agendamento. Depois disso o
// cliente pede um novo link pelo WhatsApp.
// A data liberada vem do histórico do cliente, não do link:
//   nunca teve sessão  → data de envio do link + 2 dias
//   já teve sessão     → data da última sessão + 22 dias
// O bloqueio vale só para este link; a agenda geral não muda.
// Pix: se o link cobra a sessão, os horários só aparecem depois que o Asaas
// confirma o pagamento (aviso automático ou consulta à API). Sem comprovante.
// O cliente não desmarca sozinho: pede, informa o motivo e aceita a taxa; você decide.
import crypto from "node:crypto";
import { atualizar, ler, lerDia, lerExcecoes, listarChaves, novoId } from "./armazem.mjs";
import { Erro, MODALIDADES } from "./config.mjs";
import { horariosLivres } from "./disponibilidade.mjs";
import { reservar, buscar, cancelar } from "./reservas.mjs";
import { decifrar, hashToken, novoToken, validarCpf } from "./pedidos.mjs";
import { mensagemAvulsa } from "./emails.mjs";
import { agoraLocal, somaDias, difDias, dataValida, paraMin } from "./tempo.mjs";
import { baseUrl } from "./http.mjs";

const limpa = (id) => String(id || "").replace(/[^A-Za-z0-9]/g, "");
const inteiro = (v, padrao, min, max, nome) => {
  const n = v === undefined || v === "" || v === null ? padrao : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Erro(`${nome}: informe um número entre ${min} e ${max}.`);
  return n;
};
export const linkSessao = (s) => `${baseUrl()}/sessao/?s=${s.id}&t=${decifrar(s.token_cifrado)}`;

// Consulta que conta como sessão: marcada por link ou marcada por você como sessão.
export const ehSessao = (c) => c.status === "confirmada" && (c.sessao || c.tipo === "sessao");

// Última sessão do cliente (pela data), opcionalmente ignorando uma consulta.
export async function ultimaSessao(loja, clienteId, ignorar = null) {
  const cli = (await ler(loja, `cliente/${clienteId}`)).dado;
  let ultima = null;
  for (const id of cli?.consultas || []) {
    if (id === ignorar) continue;
    const c = await buscar(loja, id).catch(() => null);
    if (c && ehSessao(c) && (!ultima || c.data > ultima.data)) ultima = c;
  }
  return ultima;
}

// Data a partir da qual este link libera horários (calculada na hora).
export async function dataMinima(loja, s) {
  const ult = await ultimaSessao(loja, s.cliente.id, s.usado?.consulta);
  return ult
    ? { data: somaDias(ult.data, s.min_dias_retorno), base: "retorno", ultima: ult.data }
    : { data: somaDias(s.enviado_data, s.min_dias_primeira), base: "primeira", ultima: null };
}

// Pago e ainda sem agendar: o link não expira (o cliente não perde o que pagou).
export const pixLiberado = (s) => !s.cobrar_pix || s.pix?.status === "pago";
export const expirado = (s, agora = Date.now()) => !s.usado && !(s.cobrar_pix && pixLiberado(s)) && agora > Date.parse(s.expira_em);

export async function criarSessao(loja, cfg, { cliente, modalidade, valor, observacao = "", min_dias_primeira, min_dias_retorno, validade_horas, cobrar_pix }, por, agora = agoraLocal()) {
  if (!MODALIDADES.includes(modalidade)) throw new Erro("Modalidade inválida.");
  const v = valor === undefined || valor === "" ? cfg.sessoes.valor : Math.round(Number(valor) * 100) / 100;
  if (!(v >= 0 && v <= 10000)) throw new Erro("Valor inválido.");
  if (cobrar_pix === true && !(v > 0)) throw new Erro("Informe o valor da sessão para cobrar via Pix.");
  const horas = inteiro(validade_horas, cfg.sessoes.validade_horas, 1, 720, "Validade do link (horas)");
  const { token_hash, token_cifrado } = novoToken();
  const s = {
    id: novoId(12), token_hash, token_cifrado, modalidade, valor: v,
    cobrar_pix: v > 0 && (cobrar_pix === undefined ? cfg.sessoes.cobrar_pix : !!cobrar_pix), pix: null,
    enviado_em: new Date().toISOString(), enviado_data: agora.data, expira_em: new Date(Date.now() + horas * 3600e3).toISOString(),
    min_dias_primeira: inteiro(min_dias_primeira, cfg.sessoes.intervalo_primeira_dias, 0, 365, "Prazo da 1ª sessão (dias)"),
    min_dias_retorno: inteiro(min_dias_retorno, cfg.sessoes.intervalo_dias, 0, 365, "Intervalo entre sessões (dias)"),
    usado: null, revogado: false, aberto_em: null, desmarcacao: null,
    cliente: { id: cliente.id, nome: cliente.nome, email: cliente.email, telefone: cliente.telefone },
    observacao: String(observacao).slice(0, 300), criado: new Date().toISOString(), por, eventos: [],
  };
  await loja.setJSON(`sessao/${s.id}`, s);
  return s;
}

export async function autenticarSessao(loja, id, token) {
  const s = (await ler(loja, `sessao/${limpa(id)}`)).dado;
  const a = Buffer.from(hashToken(token)), b = Buffer.from(s?.token_hash || "");
  if (!s || a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Erro("Link inválido.", 404);
  if (s.revogado) throw new Erro("Este link foi desativado. Chame o consultório no WhatsApp para receber um novo.", 410);
  if (expirado(s)) throw new Erro("Este link expirou. Chame o consultório no WhatsApp para receber um novo.", 410);
  return s;
}

export async function abrirSessao(loja, s, agora = agoraLocal()) {
  if (s.aberto_em) return s;
  return atualizar(loja, `sessao/${s.id}`, (x) => {
    if (!x.aberto_em) x.aberto_em = agora.data;
    return x;
  });
}

// Mesmas regras de horário do site, a partir da data mínima, com a janela
// de agendamento contada a partir dela.
async function regras(loja, cfg, s, agora) {
  const min = (await dataMinima(loja, s)).data;
  return {
    min,
    cfg: {
      ...cfg, janela_dias: Math.max(0, difDias(agora.data, min)) + cfg.janela_dias,
      modalidades: { ...cfg.modalidades, [s.modalidade]: { ...cfg.modalidades[s.modalidade], ativa: true } },
    },
  };
}

export async function horariosSessao(loja, cfg, s, data, agora = agoraLocal()) {
  if (s.usado || !pixLiberado(s)) return [];
  const r = await regras(loja, cfg, s, agora);
  if (!dataValida(data) || data < r.min) return [];
  return horariosLivres(r.cfg, s.modalidade, data, await lerDia(loja, data), await lerExcecoes(loja), agora);
}

export async function diasSessao(loja, cfg, s, mes, agora = agoraLocal()) {
  if (s.usado || !pixLiberado(s)) return [];
  const r = await regras(loja, cfg, s, agora);
  const [a, m] = mes.split("-").map(Number);
  const fim = somaDias(m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`, -1);
  const lim = somaDias(r.min, cfg.janela_dias);
  const exc = await lerExcecoes(loja);
  const out = [];
  for (let d = `${mes}-01` < r.min ? r.min : `${mes}-01`; d <= fim && d <= lim; d = somaDias(d, 1))
    if (horariosLivres(r.cfg, s.modalidade, d, await lerDia(loja, d), exc, agora).length) out.push(d);
  return out;
}

// Um único agendamento por link.
export async function reservarSessao(loja, cfg, s, { data, inicio }, agora = agoraLocal()) {
  if (s.usado) throw new Erro("Este link já foi usado para agendar. Para outra sessão, chame o consultório no WhatsApp.", 409);
  if (!pixLiberado(s)) throw new Erro("Os horários são liberados depois da confirmação do Pix.", 402);
  const r = await regras(loja, cfg, s, agora);
  if (!dataValida(data) || data < r.min)
    throw new Erro(`Sua sessão fica disponível a partir de ${r.min.split("-").reverse().join("/")}.`, 409, { indisponivel: true });

  const trava = `uso-sessao/${s.id}`;
  if (!(await loja.setJSON(trava, { ts: Date.now() }, { onlyIfNew: true })).modified)
    throw new Erro("Este link já foi usado ou o agendamento está em andamento. Recarregue a página.", 409);
  let c;
  try {
    c = await reservar(loja, r.cfg, {
      modalidade: s.modalidade, data, inicio, origem: "sessao", por: "cliente (link de sessão)", sessao: s.id, cliente: s.cliente,
    }, agora);
  } catch (err) {
    await loja.delete(trava);
    throw err;
  }
  await atualizar(loja, `sessao/${s.id}`, (x) => {
    x.usado = { consulta: c.id, data: c.data, inicio: c.inicio, quando: new Date().toISOString() };
    x.eventos.push({ quando: x.usado.quando, acao: "agendada", consulta: c.id, data: c.data });
    return x;
  });
  return c;
}

// ----- Pix da sessão -----
// Gera (uma vez) a cobrança Pix do link. O CPF só é pedido se o cliente
// ainda não tem cadastro no Asaas; depois disso, o cadastro é reaproveitado.
export async function gerarPixSessao(loja, cfg, prov, s, { cpf } = {}, agora = agoraLocal()) {
  if (!s.cobrar_pix) throw new Erro("Este link não cobra Pix.");
  if (s.pix?.status === "pago") return s.pix;
  if (s.pix?.status === "pendente") return s.pix;
  const cli = (await ler(loja, `cliente/${s.cliente.id}`)).dado || {};
  const asaas_id = cli.asaas_id || null;
  if (!asaas_id && !cpf) throw new Erro("Informe seu CPF para gerar o Pix.", 400, { precisa_cpf: true });
  const cob = await prov.criarCobranca({
    pedidoId: `sessao-${s.id}`, valor: s.valor, descricao: `Sessão - ${cfg.profissional}`, vencimento: somaDias(agora.data, 1),
    cliente: { ...s.cliente, asaas_id, cpf: asaas_id ? null : validarCpf(cpf) },
  });
  if (!asaas_id && cob.cliente_id && cli.id) await atualizar(loja, `cliente/${cli.id}`, (x) => ({ ...x, asaas_id: cob.cliente_id }));
  await loja.setJSON(`cobranca/${cob.provedor_id}`, { sessao: s.id });
  const pix = { status: "pendente", provedor: prov.nome, provedor_id: cob.provedor_id, qr_imagem: cob.qr_imagem, copia_cola: cob.copia_cola, criado: new Date().toISOString() };
  await atualizar(loja, `sessao/${s.id}`, (x) => {
    if (!x.pix) { x.pix = pix; x.eventos.push({ quando: pix.criado, acao: "pix-gerado" }); }
    return x;
  });
  return (await ler(loja, `sessao/${s.id}`)).dado.pix;
}

// Consulta o Asaas e libera os horários quando o pagamento é confirmado.
export async function atualizarPixSessao(loja, cfg, prov, sid) {
  const s = (await ler(loja, `sessao/${limpa(sid)}`)).dado;
  if (!s?.pix || s.pix.status !== "pendente") return s;
  const r = await prov.consultar(s.pix.provedor_id);
  if (r.status === "pendente") return s;
  let virouPago = false;
  const novo = await atualizar(loja, `sessao/${s.id}`, (x) => {
    if (x.pix.status !== "pendente") return x;
    const quando = new Date().toISOString();
    if (r.status === "pago" && Number(r.valor) + 0.001 < x.valor) x.pix.status = "divergente";
    else { x.pix.status = r.status; if (r.status === "pago") { x.pix.pago_em = quando; virouPago = true; } }
    x.eventos.push({ quando, acao: `pix-${x.pix.status}`, valor: r.valor });
    return x;
  });
  if (virouPago) {
    const valor = s.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    await mensagemAvulsa(loja, `pgs-${s.id}-admin`, {
      quem: "admin", para: cfg.email_admin || process.env.GMAIL_USUARIO || "", evento: "pagamento",
      assunto: `Pix da sessão recebido: ${s.cliente.nome}`, titulo: "Pix da sessão recebido",
      linhas: [["Cliente", s.cliente.nome], ["Valor", valor], ["Telefone", s.cliente.telefone]],
      rodape: "Os horários foram liberados no link do cliente automaticamente.",
    }).catch(() => {});
  }
  return novo;
}

// Painel: liberar os horários sem Pix (ex.: pagou em dinheiro).
export async function liberarSemPix(loja, sid, por) {
  return atualizar(loja, `sessao/${limpa(sid)}`, (x) => {
    if (!x.id) throw new Erro("Sessão não encontrada.", 404);
    if (x.pix?.status !== "pago") x.pix = { ...(x.pix || {}), status: "pago", manual: true, pago_em: new Date().toISOString(), por };
    x.eventos.push({ quando: new Date().toISOString(), acao: "pix-liberado-manual", por });
    return x;
  });
}

// Taxa conforme a antecedência (horário de Brasília).
export function taxaDesmarcacao(cfg, c, agora = agoraLocal()) {
  const minutos = difDias(agora.data, c.data) * 1440 + paraMin(c.inicio) - agora.min;
  return { taxa: minutos >= cfg.sessoes.prazo_horas * 60 ? cfg.sessoes.taxa : cfg.sessoes.taxa_tardia, horas: Math.floor(minutos / 60) };
}

export async function solicitarDesmarcacao(loja, cfg, s, { motivo, aceite }, agora = agoraLocal()) {
  const c = s.usado && await buscar(loja, s.usado.consulta).catch(() => null);
  if (!c || c.status !== "confirmada") throw new Erro("Não há sessão marcada para desmarcar.");
  const { taxa, horas } = taxaDesmarcacao(cfg, c, agora);
  if (horas < 0) throw new Erro("O horário desta sessão já passou.");
  const m = String(motivo || "").trim().slice(0, 1000);
  if (m.length < 3) throw new Erro("Descreva o motivo da desmarcação.");
  if (!aceite) throw new Erro("Para pedir a desmarcação, confirme que está de acordo com a taxa.");
  if (s.desmarcacao?.status === "pendente") throw new Erro("Já existe um pedido de desmarcação aguardando o consultório.", 409);
  const pedido = { status: "pendente", motivo: m, taxa, horas_antes: horas, quando: new Date().toISOString(), consulta: c.id, taxa_paga: false };
  await atualizar(loja, `sessao/${s.id}`, (x) => {
    x.desmarcacao = pedido;
    x.eventos.push({ quando: pedido.quando, acao: "desmarcacao-pedida", taxa, consulta: c.id });
    return x;
  });
  return pedido;
}

// Painel: aprovar (cancela a sessão), recusar, ou marcar a taxa como paga.
// O link continua usado: para remarcar, você envia um novo.
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
    x.eventos.push({ quando: x.desmarcacao.decidido, acao: `desmarcacao-${x.desmarcacao.status}`, por });
    return x;
  });
}

// Consulta transferida pela agenda: mantém a data do link em dia.
export async function sincronizarSessao(loja, c) {
  if (!c.sessao) return;
  await atualizar(loja, `sessao/${c.sessao}`, (x) => {
    if (x.usado?.consulta === c.id) Object.assign(x.usado, { data: c.data, inicio: c.inicio });
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
