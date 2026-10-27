// Pedido = pagamento Pix da consulta. Só um pedido pago (e ainda não usado)
// libera o calendário; o link com o token permite retomar sem pagar de novo.
import crypto from "node:crypto";
import { atualizar, ler, lerDia, listarChaves, novoId, registrarLog } from "./armazem.mjs";
import { Erro } from "./config.mjs";
import { reservar, buscar } from "./reservas.mjs";
import { salvarCliente, marcarAguardando } from "./clientes.mjs";
import { mensagemAvulsa } from "./emails.mjs";
import { baseUrl } from "./http.mjs";
import { segredo } from "./auth.mjs";
import { agoraLocal, somaDias, dataExtenso } from "./tempo.mjs";

const hashToken = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

// O token fica cifrado no pedido para o aviso de pagamento (que pode vir
// pelo webhook, sem o navegador do paciente) conseguir montar o link.
const chaveCifra = () => crypto.createHash("sha256").update(`pedido:${segredo()}`).digest();
function cifrar(txt) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chaveCifra(), iv);
  const dados = Buffer.concat([c.update(txt, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64url")).join(".");
}
function decifrar(txt) {
  const [iv, tag, dados] = String(txt).split(".").map((b) => Buffer.from(b, "base64url"));
  const d = crypto.createDecipheriv("aes-256-gcm", chaveCifra(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}
export const tokenDoPedido = (p) => decifrar(p.token_cifrado);
const novoToken = () => {
  const token = crypto.randomBytes(18).toString("base64url");
  return { token, token_hash: hashToken(token), token_cifrado: cifrar(token) };
};
const limpaId = (id) => String(id || "").replace(/[^A-Za-z0-9]/g, "");
export const linkRetomar = (id, token) => `${baseUrl()}/agendar/?p=${id}&t=${token}`;

export function validarCpf(v) {
  const c = String(v || "").replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) throw new Erro("CPF inválido.");
  const dig = (n) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  if (dig(9) !== Number(c[9]) || dig(10) !== Number(c[10])) throw new Erro("CPF inválido.");
  return c;
}

export function publico(p, cfg) {
  return {
    id: p.id, status: p.status, valor: p.valor, modalidade: p.modalidade, nome: p.cliente.nome,
    qr_imagem: p.status === "pendente" ? p.qr_imagem : "", copia_cola: p.status === "pendente" ? p.copia_cola : "",
    prazo_ate: p.pago_em ? somaDias(agoraLocal(new Date(p.pago_em)).data, cfg.pix.prazo_dias) : null,
    consulta: p.consulta || null,
  };
}

export async function autenticar(loja, id, token) {
  const p = (await ler(loja, `pedido/${limpaId(id)}`)).dado;
  const a = Buffer.from(hashToken(token)), b = Buffer.from(p?.token_hash || "");
  if (!p || a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Erro("Link de pagamento inválido.", 404);
  return p;
}

export async function criarPedido(L, cfg, prov, { modalidade, dados, cpf, foto }) {
  if (!cfg.pix.ativo) throw new Erro("Pagamento online desativado.");
  cpf = validarCpf(cpf);
  const cli = await salvarCliente(L, dados, foto, "paciente");

  // Pedido em aberto do mesmo paciente: reaproveita (não gera outra cobrança).
  const aberto = (await ler(L.dados, `pedido-aberto/${cli.id}`)).dado;
  if (aberto) {
    const p = await atualizarStatus(L.dados, cfg, prov, aberto.id);
    const recente = Date.now() - Date.parse(p.criado) < 20 * 3600e3;
    if ((p.status === "pendente" && recente) || p.status === "pago") return { pedido: p, token: tokenDoPedido(p) };
  }

  const id = novoId(12), { token, token_hash, token_cifrado } = novoToken();
  const agora = agoraLocal();
  const cob = await prov.criarCobranca({
    pedidoId: id, valor: cfg.pix.valor, descricao: `${cfg.servico} - ${cfg.profissional}`,
    cliente: { ...cli, cpf }, vencimento: somaDias(agora.data, 1),
  });
  const p = {
    id, token_hash, token_cifrado, status: "pendente", valor: cfg.pix.valor, modalidade,
    cliente: { id: cli.id, nome: cli.nome, email: cli.email, telefone: cli.telefone, cpf_final: cpf.slice(-3) },
    provedor: prov.nome, provedor_id: cob.provedor_id, qr_imagem: cob.qr_imagem, copia_cola: cob.copia_cola, expira: cob.expira,
    criado: new Date().toISOString(), eventos: [{ quando: new Date().toISOString(), acao: "cobranca-criada" }],
  };
  await L.dados.setJSON(`pedido/${id}`, p);
  await L.dados.setJSON(`cobranca/${cob.provedor_id}`, { pedido: id });
  await L.dados.setJSON(`pedido-aberto/${cli.id}`, { id });
  await registrarLog(L.dados, "paciente", "pix-gerado", { pedido: id, valor: p.valor });
  return { pedido: p, token };
}

// Consulta o provedor e grava a mudança de status (uma única vez).
export async function atualizarStatus(loja, cfg, prov, pedidoId, { enviar } = {}) {
  const atual = (await ler(loja, `pedido/${limpaId(pedidoId)}`)).dado;
  if (!atual) throw new Erro("Pedido não encontrado.", 404);
  if (atual.status !== "pendente") return atual;
  const r = await prov.consultar(atual.provedor_id);
  if (r.status === "pendente") return atual;
  let virouPago = false;
  const novo = await atualizar(loja, `pedido/${atual.id}`, (p) => {
    if (p.status !== "pendente") return p;
    const quando = new Date().toISOString();
    if (r.status === "pago" && Number(r.valor) + 0.001 < p.valor) {
      p.status = "divergente";
      p.eventos.push({ quando, acao: "valor-divergente", recebido: r.valor });
    } else {
      p.status = r.status;
      if (r.status === "pago") { p.pago_em = quando; virouPago = true; }
      p.eventos.push({ quando, acao: `status-${r.status}`, provedor: r.bruto });
    }
    return p;
  });
  if (virouPago) {
    await loja.setJSON(`pagamento/${atual.provedor_id}`, { pedido: atual.id, valor: r.valor, quando: novo.pago_em }, { onlyIfNew: true });
    await registrarLog(loja, "sistema", "pix-confirmado", { pedido: atual.id, valor: r.valor });
    await avisarPagamento(loja, cfg, novo, enviar);
  }
  return novo;
}

// Avisa o paciente (com o link para escolher o horário) e o administrador.
export async function avisarPagamento(loja, cfg, p, enviar) {
  const token = tokenDoPedido(p);
  const prazo = dataExtenso(somaDias(agoraLocal(new Date(p.pago_em)).data, cfg.pix.prazo_dias));
  const valor = p.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const msgs = [];
  msgs.push(["paciente", p.cliente.email, "Pagamento confirmado: escolha seu horário", "Pagamento confirmado", [
    ["Atendimento", cfg.servico], ["Valor", valor], ["Escolha o horário até", prazo], ["Link para agendar", linkRetomar(p.id, token)],
  ], "Guarde este e-mail: o link acima permite voltar ao calendário sem pagar de novo."]);
  msgs.push(["admin", cfg.email_admin || process.env.GMAIL_USUARIO || "", `Pix recebido: ${p.cliente.nome}`, "Pix recebido", [
    ["Paciente", p.cliente.nome], ["Valor", valor], ["Telefone", p.cliente.telefone], ["E-mail", p.cliente.email], ["Pedido", p.id],
  ], "O paciente ainda vai escolher o horário."]);
  for (const [quem, para, assunto, titulo, linhas, rodape] of msgs)
    await mensagemAvulsa(loja, `pg-${p.id}-${quem}`, { quem, para, assunto, titulo, linhas, rodape, evento: "pagamento", consulta: null }, enviar);
}

export async function processarWebhook(loja, cfg, prov, req, corpo) {
  if (!prov.webhookAutentico(req)) throw new Erro("Não autorizado.", 401);
  const id = prov.idDoWebhook(corpo);
  const ref = id && (await ler(loja, `cobranca/${id}`)).dado;
  if (!ref) return null; // cobrança de outro sistema: ignora
  return atualizarStatus(loja, cfg, prov, ref.pedido);
}

// Consulta que já usou este pedido (para retomar após uma falha no meio).
async function consultaDoPedido(loja, data, pedidoId) {
  return (await lerDia(loja, data)).find((c) => c.pedido === pedidoId && c.status === "confirmada") || null;
}

export async function reservarComPedido(L, cfg, prov, { pedido: id, token, modalidade, data, inicio }, agora = agoraLocal()) {
  let p = await autenticar(L.dados, id, token);
  if (p.status === "pendente") p = await atualizarStatus(L.dados, cfg, prov, p.id);
  if (p.consulta) return buscar(L.dados, p.consulta);
  if (p.status !== "pago") throw new Erro("O pagamento ainda não foi confirmado.", 402);
  const limite = somaDias(agoraLocal(new Date(p.pago_em)).data, cfg.pix.prazo_dias);
  if (agora.data > limite) throw new Erro("O prazo para agendar com este pagamento terminou. Fale com o consultório.", 410);

  // Trava de uso: um pagamento, uma consulta.
  const chave = `uso/${p.id}`;
  const trava = await ler(L.dados, chave);
  if (trava.dado) {
    const ja = await consultaDoPedido(L.dados, trava.dado.data, p.id);
    if (ja) return finalizar(L.dados, p.id, ja);
    if (Date.now() - trava.dado.ts < 120e3) throw new Erro("Seu agendamento já está sendo processado. Aguarde alguns segundos.", 409);
    const r = await L.dados.setJSON(chave, { data, ts: Date.now() }, { onlyIfMatch: trava.etag });
    if (!r.modified) throw new Erro("Seu agendamento já está sendo processado.", 409);
  } else {
    const r = await L.dados.setJSON(chave, { data, ts: Date.now() }, { onlyIfNew: true });
    if (!r.modified) throw new Erro("Seu agendamento já está sendo processado.", 409);
  }

  let c;
  try {
    c = await reservar(L.dados, cfg, {
      modalidade: modalidade || p.modalidade, data, inicio, origem: "paciente", por: "paciente", pedido: p.id,
      cliente: { id: p.cliente.id, nome: p.cliente.nome, email: p.cliente.email, telefone: p.cliente.telefone },
    }, agora);
  } catch (e) {
    await L.dados.delete(chave);
    throw e;
  }
  return finalizar(L.dados, p.id, c);
}

async function finalizar(loja, pedidoId, c) {
  await atualizar(loja, `pedido/${pedidoId}`, (p) => {
    if (!p.consulta) {
      p.status = "usado";
      p.consulta = c.id;
      p.eventos.push({ quando: new Date().toISOString(), acao: "consulta-agendada", consulta: c.id });
    }
    return p;
  });
  await loja.delete(`pedido-aberto/${c.cliente.id}`).catch(() => {});
  return c;
}

// Consulta marcada pelo painel para quem já pagou: o Pix passa a ser dela.
export async function vincularPedido(loja, pedidoId, c) {
  const p = (await ler(loja, `pedido/${limpaId(pedidoId)}`)).dado;
  if (!p || p.status !== "pago" || p.consulta) return false;
  await finalizar(loja, p.id, c);
  return true;
}

// Paciente pagou e prefere combinar o horário pelo WhatsApp.
export async function aguardarContato(L, cfg, prov, { pedido: id, token, obs }) {
  let p = await autenticar(L.dados, id, token);
  if (p.status === "pendente") p = await atualizarStatus(L.dados, cfg, prov, p.id);
  if (p.status !== "pago") throw new Erro("O pagamento ainda não foi confirmado.", 402);
  const cli = await marcarAguardando(L.dados, p.cliente.id, { origem: "pix", pedido: p.id, modalidade: p.modalidade, obs });
  return { pedido: p, cliente: cli };
}

// Painel: devolve o crédito ao paciente (ex.: consulta cancelada) para ele
// escolher outro horário com o mesmo pagamento.
export async function liberarPedido(loja, pedidoId) {
  const p = (await ler(loja, `pedido/${limpaId(pedidoId)}`)).dado;
  if (!p) throw new Erro("Pedido não encontrado.", 404);
  if (p.status !== "usado") throw new Erro("Só é possível liberar um pagamento já usado.");
  const c = await buscar(loja, p.consulta);
  if (c.status === "confirmada") throw new Erro("Cancele a consulta antes de liberar um novo agendamento.");
  const { token, token_hash, token_cifrado } = novoToken();
  const novo = await atualizar(loja, `pedido/${p.id}`, (x) => {
    x.status = "pago"; x.consulta = null; Object.assign(x, { token_hash, token_cifrado });
    x.pago_em = new Date().toISOString(); // reinicia o prazo
    x.eventos.push({ quando: x.pago_em, acao: "liberado-para-novo-agendamento", consulta_anterior: c.id });
    return x;
  });
  await loja.delete(`uso/${p.id}`);
  return { pedido: novo, token };
}

export async function estornar(loja, prov, pedidoId) {
  const p = (await ler(loja, `pedido/${limpaId(pedidoId)}`)).dado;
  if (!p) throw new Erro("Pedido não encontrado.", 404);
  if (!["pago", "usado", "divergente"].includes(p.status)) throw new Erro("Este pagamento não pode ser estornado.");
  if (p.consulta && (await buscar(loja, p.consulta)).status === "confirmada") throw new Erro("Cancele a consulta antes de estornar.");
  await prov.estornar(p.provedor_id);
  return atualizar(loja, `pedido/${p.id}`, (x) => {
    x.status = "estornado";
    x.eventos.push({ quando: new Date().toISOString(), acao: "estornado" });
    return x;
  });
}

export async function listarPedidos(loja, limite = 200) {
  const chaves = await listarChaves(loja, "pedido/");
  const ps = (await Promise.all(chaves.map(async (k) => (await ler(loja, k)).dado))).filter(Boolean);
  return ps.sort((a, b) => b.criado.localeCompare(a.criado)).slice(0, limite)
    .map(({ token_hash, token_cifrado, qr_imagem, copia_cola, ...p }) => p);
}
