// Configuração editável pelo painel: valores padrão e validação.
import { paraMin } from "./tempo.mjs";

const util = { 1: [{ inicio: "09:00", fim: "12:00" }, { inicio: "14:00", fim: "18:00" }] };
const semanaPadrao = () => Object.fromEntries([1, 2, 3, 4, 5].map((d) => [d, structuredClone(util[1])]));

export const PADRAO = {
  profissional: "Dr. Rodrigo Vieira",
  servico: "Consulta de avaliação",
  descricao: "Primeiro encontro para entender sua necessidade e definir o melhor caminho de tratamento.",
  duracao: 90,
  intervalo: 0,
  passo: 0, // 0 = de uma consulta à outra (duração + intervalo)
  antecedencia_horas: 12,
  janela_dias: 60,
  email_admin: "",
  contato: "WhatsApp (19) 99749-8217",
  aviso_pagamento: "O pagamento é combinado diretamente com o Dr. Rodrigo.",
  // Pix antes do calendário. Desligado: o pagamento é combinado à parte.
  pix: { ativo: false, valor: 0, prazo_dias: 30 },
  // Modelos de mensagem aprovados no WhatsApp Business (nomes exatos).
  whatsapp: { ativo: false, numero_admin: "", idioma: "pt_BR", modelo_paciente: "consulta_confirmada", modelo_admin: "novo_agendamento", modelo_transferencia: "", modelo_cancelamento: "", modelo_cadastro: "cliente_aguardando", modelo_desmarcacao: "pedido_desmarcacao" },
  // Links de sessão (retornos): só abrem horários depois do intervalo.
  sessoes: { validade_horas: 12, intervalo_primeira_dias: 2, intervalo_dias: 22, valor: 0, taxa: 25, taxa_tardia: 50, prazo_horas: 12, chave_pix: "" },
  orientacoes_alteracao: "Para remarcar ou cancelar, fale pelo WhatsApp (19) 99749-8217 com pelo menos 24 horas de antecedência.",
  modalidades: {
    presencial: { ativa: true, autoagendamento: false, nome: "Presencial", agenda: "principal", endereco: "Amparo - SP", orientacoes: "Chegue com 10 minutos de antecedência.", semana: semanaPadrao() },
    online: { ativa: true, autoagendamento: true, nome: "Online", agenda: "principal", endereco: "", orientacoes: "O link da videochamada será enviado pelo WhatsApp antes da consulta. Use um local reservado, com boa internet e fone de ouvido.", semana: semanaPadrao() },
  },
};

export const MODALIDADES = ["presencial", "online"];

const texto = (v, max = 600) => String(v ?? "").trim().slice(0, max);
const inteiro = (v, min, max, nome) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Erro(`${nome} deve ser um número entre ${min} e ${max}.`);
  return n;
};

export class Erro extends Error {
  constructor(msg, status = 400, extra = {}) { super(msg); this.status = status; Object.assign(this, extra); }
}

// Períodos de um dia: ordenados, sem sobreposição, início antes do fim.
export function validarPeriodos(lista, rotulo = "Período") {
  const out = (Array.isArray(lista) ? lista : []).map((p) => {
    const ini = paraMin(p?.inicio), fim = paraMin(p?.fim);
    if (Number.isNaN(ini) || Number.isNaN(fim) || ini >= fim) throw new Erro(`${rotulo}: horário inválido (${p?.inicio}–${p?.fim}).`);
    return { inicio: p.inicio, fim: p.fim };
  }).sort((a, b) => paraMin(a.inicio) - paraMin(b.inicio));
  for (let i = 1; i < out.length; i++)
    if (paraMin(out[i].inicio) < paraMin(out[i - 1].fim)) throw new Erro(`${rotulo}: períodos sobrepostos.`);
  return out;
}

export function normalizarConfig(e) {
  const email = texto(e.email_admin, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Erro("E-mail do administrador inválido.");
  const c = {
    profissional: texto(e.profissional, 120) || PADRAO.profissional,
    servico: texto(e.servico, 120) || PADRAO.servico,
    descricao: texto(e.descricao),
    duracao: inteiro(e.duracao, 10, 480, "Duração"),
    intervalo: inteiro(e.intervalo, 0, 240, "Intervalo"),
    passo: inteiro(e.passo, 0, 480, "Espaçamento dos horários"),
    antecedencia_horas: inteiro(e.antecedencia_horas, 0, 720, "Antecedência mínima"),
    janela_dias: inteiro(e.janela_dias, 1, 365, "Janela de agendamento"),
    email_admin: email,
    contato: texto(e.contato, 200),
    aviso_pagamento: texto(e.aviso_pagamento),
    orientacoes_alteracao: texto(e.orientacoes_alteracao),
    modalidades: {},
    pix: {
      ativo: !!e.pix?.ativo,
      valor: Math.round(Number(e.pix?.valor || 0) * 100) / 100,
      prazo_dias: inteiro(e.pix?.prazo_dias ?? 30, 1, 365, "Prazo para agendar após o pagamento"),
    },
  };
  const w = e.whatsapp || {};
  const modelo = (v) => texto(v, 60).toLowerCase().replace(/[^a-z0-9_]/g, "");
  c.whatsapp = {
    ativo: !!w.ativo, numero_admin: String(w.numero_admin || "").replace(/[^\d+]/g, "").slice(0, 20), idioma: texto(w.idioma, 10) || "pt_BR",
    modelo_paciente: modelo(w.modelo_paciente), modelo_admin: modelo(w.modelo_admin),
    modelo_transferencia: modelo(w.modelo_transferencia), modelo_cancelamento: modelo(w.modelo_cancelamento),
    modelo_cadastro: modelo(w.modelo_cadastro), modelo_desmarcacao: modelo(w.modelo_desmarcacao),
  };
  if (c.whatsapp.ativo && c.whatsapp.modelo_admin && c.whatsapp.numero_admin.replace(/\D/g, "").length < 10)
    throw new Erro("Informe o seu número de WhatsApp com DDD para receber os avisos.");
  const ss = { ...PADRAO.sessoes, ...e.sessoes };
  const reais = (v, nome) => {
    const n = Math.round(Number(v) * 100) / 100;
    if (!(n >= 0 && n <= 10000)) throw new Erro(`${nome}: valor inválido.`);
    return n;
  };
  c.sessoes = {
    validade_horas: inteiro(ss.validade_horas, 1, 720, "Validade do link (horas)"),
    intervalo_primeira_dias: inteiro(ss.intervalo_primeira_dias, 0, 365, "Prazo da primeira sessão"),
    intervalo_dias: inteiro(ss.intervalo_dias, 0, 365, "Intervalo entre sessões"),
    valor: reais(ss.valor, "Valor da sessão"), taxa: reais(ss.taxa, "Taxa de desmarcação"), taxa_tardia: reais(ss.taxa_tardia, "Taxa de desmarcação tardia"),
    prazo_horas: inteiro(ss.prazo_horas, 0, 168, "Prazo da taxa menor"), chave_pix: texto(ss.chave_pix, 120),
  };
  if (!(c.pix.valor >= 0 && c.pix.valor <= 10000)) throw new Erro("Valor da consulta inválido.");
  if (c.pix.ativo && c.pix.valor < 5) throw new Erro("Para ativar o Pix, informe o valor da consulta (mínimo R$ 5,00).");
  if (c.passo && c.passo < 5) throw new Erro("Espaçamento mínimo de 5 minutos.");
  for (const m of MODALIDADES) {
    const x = e.modalidades?.[m] || {};
    const agenda = texto(x.agenda, 30).toLowerCase().replace(/[^a-z0-9-]/g, "") || "principal";
    const semana = {};
    for (let d = 0; d <= 6; d++) {
      const p = validarPeriodos(x.semana?.[d], `${m}, dia ${d}`);
      if (p.length) semana[d] = p;
    }
    c.modalidades[m] = {
      ativa: !!x.ativa, autoagendamento: !!(x.autoagendamento ?? PADRAO.modalidades[m].autoagendamento),
      nome: texto(x.nome, 40) || PADRAO.modalidades[m].nome, agenda,
      endereco: texto(x.endereco, 300), orientacoes: texto(x.orientacoes), semana,
    };
  }
  if (!MODALIDADES.some((m) => c.modalidades[m].ativa)) throw new Erro("Deixe pelo menos uma modalidade ativa.");
  return c;
}

// O paciente escolhe o horário no site? (senão, envia cadastro e o horário
// é combinado pelo WhatsApp). Configurações antigas sem o campo seguem o padrão.
export const autoagenda = (cfg, m) => !!(cfg.modalidades[m]?.autoagendamento ?? PADRAO.modalidades[m]?.autoagendamento);

export const passoEfetivo = (c) => c.passo || c.duracao + c.intervalo;
