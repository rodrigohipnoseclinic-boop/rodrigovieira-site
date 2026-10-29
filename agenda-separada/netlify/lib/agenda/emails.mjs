// E-mails da agenda (paciente e administrador). Cada mensagem vira um
// registro com status; se o envio falhar, o painel pode reenviar a mesma
// mensagem sem criar outra consulta nem duplicar o que já foi entregue.
import { configurado, transporte, remetente } from "../email.mjs";
import { ler, listarChaves } from "./armazem.mjs";
import { dataExtenso } from "./tempo.mjs";
import { Erro } from "./config.mjs";
import { enviarWhatsapp, numeroWhatsapp } from "./whatsapp.mjs";

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const TITULOS = {
  confirmacao: ["Consulta confirmada", "Nova consulta agendada"],
  transferencia: ["Sua consulta foi remarcada", "Consulta remarcada"],
  cancelamento: ["Sua consulta foi cancelada", "Consulta cancelada"],
};

function html(titulo, linhas, rodape = "") {
  const tr = linhas.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#5b6b70;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${esc(v).replace(/\n/g, "<br>")}</td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F7F5F0;font-family:Arial,Helvetica,sans-serif;color:#1C2B33">
<div style="max-width:560px;margin:0 auto;padding:24px 12px"><div style="background:#fff;border-radius:16px;padding:28px">
<h1 style="font-size:22px;margin:0 0 16px;color:#2F574D">${esc(titulo)}</h1>
<table role="presentation" style="border-collapse:collapse;font-size:15px;line-height:1.5">${tr}</table>
${rodape ? `<p style="font-size:14px;color:#5b6b70;margin:20px 0 0">${esc(rodape).replace(/\n/g, "<br>")}</p>` : ""}
</div></div></body></html>`;
}
const texto = (titulo, linhas, rodape = "") =>
  [titulo, "", ...linhas.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), "", rodape].join("\n").trim();

export function montarMensagens(cfg, c, evento) {
  const mod = cfg.modalidades[c.modalidade] || { nome: c.modalidade };
  const quando = `${dataExtenso(c.data)}, das ${c.inicio} às ${c.fim}`;
  const [tPac, tAdm] = TITULOS[evento];
  const ultimo = c.historico.at(-1) || {};
  const antes = ultimo.de ? `${dataExtenso(ultimo.de.data)}, ${ultimo.de.inicio}` : "";
  const cancelada = evento === "cancelamento";

  const lp = [
    ["Profissional", cfg.profissional], ["Atendimento", cfg.servico], ["Data e horário", quando],
    ["Modalidade", mod.nome], ["Antes era", antes],
    ["Endereço", !cancelada && c.modalidade === "presencial" ? mod.endereco : ""],
    ["Orientações", cancelada ? "" : mod.orientacoes], ["Pagamento", cancelada ? "" : cfg.aviso_pagamento],
    ["Contato", cfg.contato],
  ];
  const la = [
    ["Paciente", c.cliente.nome], ["Data e horário", quando], ["Modalidade", mod.nome],
    ["Duração", `${c.duracao} minutos`], ["Antes era", antes], ["Motivo", ultimo.motivo],
    ["E-mail", c.cliente.email], ["Telefone", c.cliente.telefone], ["Agendado por", c.origem === "paciente" ? "o próprio paciente" : "painel"],
    ["Identificador", c.id],
  ];
  const rodPac = cancelada ? cfg.orientacoes_alteracao : `Para alterações: ${cfg.orientacoes_alteracao}`;
  return {
    paciente: { assunto: `${tPac}: ${c.data.split("-").reverse().join("/")} às ${c.inicio}`, html: html(tPac, lp, rodPac), texto: texto(tPac, lp, rodPac) },
    admin: { assunto: `${tAdm}: ${c.cliente.nome}, ${c.data.split("-").reverse().join("/")} ${c.inicio}`, html: html(tAdm, la), texto: texto(tAdm, la) },
  };
}

async function enviarSmtp({ para, assunto, html, texto }) {
  if (!configurado()) throw new Error("Envio de e-mail não configurado (GMAIL_USUARIO e GMAIL_SENHA_APP).");
  const t = transporte();
  try {
    await t.sendMail({ from: remetente(), to: para, subject: assunto, html, text: texto });
  } finally {
    t.close();
  }
}

async function tentar(loja, chave, reg, enviar) {
  reg.tentativas = (reg.tentativas || 0) + 1;
  try {
    if (!reg.para) throw new Error("Destinatário não configurado.");
    await enviar(reg);
    Object.assign(reg, { status: "enviado", enviado: new Date().toISOString(), erro: null });
  } catch (e) {
    Object.assign(reg, { status: "erro", erro: String(e.message).slice(0, 300) });
  }
  await loja.setJSON(chave, reg);
  return reg;
}

// Cria (uma única vez) e envia os dois e-mails de um evento da consulta.
export async function notificar(loja, cfg, c, evento, { avisarPaciente = true, enviar = enviarSmtp, enviarWa = enviarWhatsapp } = {}) {
  const m = montarMensagens(cfg, c, evento);
  const n = c.historico.length;
  const destinos = [["admin", cfg.email_admin || process.env.GMAIL_USUARIO || ""]];
  if (avisarPaciente && c.cliente.email) destinos.unshift(["paciente", c.cliente.email]);
  const out = [];
  for (const [quem, para] of destinos) {
    const chave = `email/${c.id}-${n}-${quem}`;
    const reg = { id: chave.slice(6), consulta: c.id, evento, quem, para, ...m[quem], status: "pendente", criado: new Date().toISOString() };
    const r = await loja.setJSON(chave, reg, { onlyIfNew: true });
    out.push(r.modified ? await tentar(loja, chave, reg, enviar) : (await ler(loja, chave)).dado);
  }
  for (const reg of mensagensWhatsapp(cfg, c, evento, avisarPaciente)) {
    const chave = `email/${c.id}-${n}-wa-${reg.quem}`;
    Object.assign(reg, { id: chave.slice(6), consulta: c.id, evento, canal: "whatsapp", status: "pendente", criado: new Date().toISOString() });
    const r = await loja.setJSON(chave, reg, { onlyIfNew: true });
    out.push(r.modified ? await tentar(loja, chave, reg, enviarWa) : (await ler(loja, chave)).dado);
  }
  return out;
}

// WhatsApp (modelos aprovados pela Meta). Paciente: confirmação e, se houver
// modelo, transferência e cancelamento. Administrador: novo agendamento.
function mensagensWhatsapp(cfg, c, evento, avisarPaciente) {
  const w = cfg.whatsapp;
  if (!w?.ativo) return [];
  const data = c.data.split("-").reverse().join("/");
  const mod = cfg.modalidades[c.modalidade]?.nome || c.modalidade;
  const out = [];
  const modeloPac = { confirmacao: w.modelo_paciente, transferencia: w.modelo_transferencia, cancelamento: w.modelo_cancelamento }[evento];
  const numPac = numeroWhatsapp(c.cliente.telefone);
  if (avisarPaciente && modeloPac && numPac)
    out.push({ quem: "paciente", para: numPac, modelo: modeloPac, idioma: w.idioma, assunto: `WhatsApp (${modeloPac})`,
      parametros: [c.cliente.nome.split(" ")[0], cfg.profissional, data, c.inicio, mod] });
  const numAdm = numeroWhatsapp(w.numero_admin);
  // Consulta marcada por você no painel: não precisa avisar você mesmo.
  if (evento === "confirmacao" && c.origem !== "painel" && w.modelo_admin && numAdm)
    out.push({ quem: "admin", para: numAdm, modelo: w.modelo_admin, idioma: w.idioma, assunto: `WhatsApp (${w.modelo_admin})`,
      parametros: [c.cliente.nome, data, c.inicio, mod, c.cliente.telefone || "-"] });
  return out;
}

// Mensagem fora do ciclo da consulta (ex.: Pix confirmado). Criada uma vez.
export async function mensagemAvulsa(loja, id, { quem, para, assunto, titulo, linhas, rodape = "", evento, consulta = null }, enviar = enviarSmtp) {
  const chave = `email/${id}`;
  const reg = { id, consulta, evento, quem, para, assunto, html: html(titulo, linhas, rodape), texto: texto(titulo, linhas, rodape), status: "pendente", criado: new Date().toISOString() };
  const r = await loja.setJSON(chave, reg, { onlyIfNew: true });
  return r.modified ? tentar(loja, chave, reg, enviar) : (await ler(loja, chave)).dado;
}

// Aviso ao administrador: cliente cadastrado aguardando horário.
export async function avisarAguardando(loja, cfg, cli, info, { enviar = enviarSmtp, enviarWa = enviarWhatsapp } = {}) {
  const id = `cad-${cli.id}-${Date.now()}`;
  const mod = cfg.modalidades[info.modalidade]?.nome || "";
  const pago = info.pedido ? "Pix confirmado" : "a combinar";
  const out = [await mensagemAvulsa(loja, `${id}-admin`, {
    quem: "admin", para: cfg.email_admin || process.env.GMAIL_USUARIO || "", evento: "cadastro",
    assunto: `Aguardando horário: ${cli.nome}`, titulo: "Cliente aguardando horário",
    linhas: [["Cliente", cli.nome], ["Telefone", cli.telefone], ["E-mail", cli.email], ["Modalidade preferida", mod], ["Pagamento", pago], ["Preferências", info.obs]],
    rodape: "Combine a data pelo WhatsApp e agende pelo painel em Clientes → Aguardando agendamento.",
  }, enviar)];
  const wa = await whatsAdmin(loja, cfg, `${id}-wa`, cfg.whatsapp?.modelo_cadastro, [cli.nome, cli.telefone || "-", mod || "-", pago], "cadastro", null, enviarWa);
  if (wa) out.push(wa);
  return out;
}

// WhatsApp para o administrador com um modelo aprovado (se ligado e configurado).
async function whatsAdmin(loja, cfg, id, modelo, parametros, evento, consulta, enviarWa) {
  const w = cfg.whatsapp, num = numeroWhatsapp(w?.numero_admin);
  if (!w?.ativo || !modelo || !num) return null;
  const chave = `email/${id}`;
  const reg = { id, consulta, evento, canal: "whatsapp", quem: "admin", para: num, modelo, idioma: w.idioma,
    assunto: `WhatsApp (${modelo})`, parametros, status: "pendente", criado: new Date().toISOString() };
  if (!(await loja.setJSON(chave, reg, { onlyIfNew: true })).modified) return (await ler(loja, chave)).dado;
  return tentar(loja, chave, reg, enviarWa);
}

// Aviso ao administrador: cliente pediu para desmarcar uma sessão.
export async function avisarDesmarcacao(loja, cfg, s, c, pedido, { enviar = enviarSmtp, enviarWa = enviarWhatsapp } = {}) {
  const id = `desm-${s.id}-${Date.parse(pedido.quando)}`;
  const data = c.data.split("-").reverse().join("/");
  const taxa = pedido.taxa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const out = [await mensagemAvulsa(loja, `${id}-admin`, {
    quem: "admin", para: cfg.email_admin || process.env.GMAIL_USUARIO || "", evento: "desmarcacao", consulta: c.id,
    assunto: `Pedido de desmarcação: ${c.cliente.nome}, ${data} ${c.inicio}`, titulo: "Cliente pediu para desmarcar",
    linhas: [["Cliente", c.cliente.nome], ["Sessão", `${data} às ${c.inicio}`], ["Antecedência", `${pedido.horas_antes} h`], ["Taxa aceita", taxa],
      ["Motivo", pedido.motivo], ["Telefone", c.cliente.telefone]],
    rodape: "Aprove ou recuse no painel, em Sessões.",
  }, enviar)];
  const wa = await whatsAdmin(loja, cfg, `${id}-wa`, cfg.whatsapp?.modelo_desmarcacao,
    [c.cliente.nome, data, c.inicio, taxa, pedido.motivo.slice(0, 180)], "desmarcacao", c.id, enviarWa);
  if (wa) out.push(wa);
  return out;
}

export async function reenviar(loja, id, enviar) {
  const chave = `email/${String(id).replace(/[^A-Za-z0-9-]/g, "")}`;
  const { dado } = await ler(loja, chave);
  if (!dado) throw new Erro("E-mail não encontrado.", 404);
  if (dado.status === "enviado") return dado;
  return tentar(loja, chave, dado, enviar || (dado.canal === "whatsapp" ? enviarWhatsapp : enviarSmtp));
}

export async function listarEmails(loja, { soErros = false, limite = 100 } = {}) {
  const chaves = await listarChaves(loja, "email/");
  const regs = (await Promise.all(chaves.map(async (k) => (await ler(loja, k)).dado))).filter(Boolean);
  return regs.filter((r) => !soErros || r.status !== "enviado")
    .sort((a, b) => b.criado.localeCompare(a.criado)).slice(0, limite)
    .map(({ html, texto, ...r }) => r);
}
