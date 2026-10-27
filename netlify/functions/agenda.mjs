// API pública do agendamento (/agendar): horários livres e reserva.
import crypto from "node:crypto";
import { lojas, lerConfig, lerDia, lerExcecoes, atualizar, registrarLog } from "../lib/agenda/armazem.mjs";
import { Erro, MODALIDADES } from "../lib/agenda/config.mjs";
import { horariosLivres } from "../lib/agenda/disponibilidade.mjs";
import { reservar, alternativas } from "../lib/agenda/reservas.mjs";
import { salvarCliente, decodificarFoto, validarDados, anexarConsulta } from "../lib/agenda/clientes.mjs";
import { notificar } from "../lib/agenda/emails.mjs";
import { agoraLocal, dataValida, datasEntre, somaDias, difDias } from "../lib/agenda/tempo.mjs";
import { json, corpo, tratarErro, partes } from "../lib/agenda/http.mjs";

const modalidadeAtiva = (cfg, m) => {
  if (!MODALIDADES.includes(m) || !cfg.modalidades[m].ativa) throw new Erro("Modalidade indisponível.");
  return m;
};

function info(cfg, agora) {
  return {
    profissional: cfg.profissional, servico: cfg.servico, descricao: cfg.descricao, duracao: cfg.duracao,
    aviso_pagamento: cfg.aviso_pagamento, contato: cfg.contato, orientacoes_alteracao: cfg.orientacoes_alteracao,
    hoje: agora.data, ate: somaDias(agora.data, cfg.janela_dias),
    modalidades: MODALIDADES.filter((m) => cfg.modalidades[m].ativa).map((m) => ({
      id: m, nome: cfg.modalidades[m].nome,
      endereco: m === "presencial" ? cfg.modalidades[m].endereco : "",
    })),
  };
}

// Dias do mês que têm pelo menos um horário livre.
async function dias(loja, cfg, modalidade, mes, agora) {
  if (!/^\d{4}-\d{2}$/.test(mes || "") || !dataValida(`${mes}-01`)) throw new Erro("Mês inválido.");
  const [a, m] = mes.split("-").map(Number);
  const ultimo = somaDias(m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`, -1);
  const de = `${mes}-01` < agora.data ? agora.data : `${mes}-01`;
  const lim = somaDias(agora.data, cfg.janela_dias);
  const ate = ultimo > lim ? lim : ultimo;
  if (de > ate) return [];
  const exc = await lerExcecoes(loja);
  const datas = datasEntre(de, ate);
  const consultas = await Promise.all(datas.map((d) => lerDia(loja, d)));
  return datas.filter((d, i) => horariosLivres(cfg, modalidade, d, consultas[i], exc, agora).length);
}

// Até 6 reservas por hora por endereço de internet.
async function limitar(loja, ip) {
  const h = crypto.createHash("sha256").update(String(ip || "?")).digest("hex").slice(0, 16);
  const chave = `limite/${h}/${new Date().toISOString().slice(0, 13)}`;
  await atualizar(loja, chave, (x) => {
    if ((x.n || 0) >= 6) throw new Erro("Muitas tentativas. Tente de novo mais tarde ou fale pelo WhatsApp.", 429);
    return { n: (x.n || 0) + 1 };
  });
}

export default async (req, context) => {
  try {
    const L = lojas();
    const cfg = await lerConfig(L.dados);
    const agora = agoraLocal();
    const [rota] = partes(req, "/api/agenda");
    const q = new URL(req.url).searchParams;

    if (req.method === "GET" && rota === "info") return json(info(cfg, agora));
    if (req.method === "GET" && rota === "dias")
      return json({ dias: await dias(L.dados, cfg, modalidadeAtiva(cfg, q.get("modalidade")), q.get("mes"), agora) });
    if (req.method === "GET" && rota === "horarios") {
      const data = q.get("data");
      if (!dataValida(data)) throw new Erro("Data inválida.");
      const m = modalidadeAtiva(cfg, q.get("modalidade"));
      return json({ horarios: horariosLivres(cfg, m, data, await lerDia(L.dados, data), await lerExcecoes(L.dados), agora) });
    }

    if (req.method === "POST" && rota === "reservar") {
      const b = await corpo(req);
      if (b.site) return json({ erro: "Envio recusado." }, 400); // campo armadilha para robôs
      const m = modalidadeAtiva(cfg, b.modalidade);
      if (!dataValida(b.data) || difDias(agora.data, b.data) < 0) throw new Erro("Data inválida.");
      if (!b.consentimento) throw new Erro("É preciso aceitar o uso dos dados para o agendamento.");
      const dados = validarDados(b);
      const foto = decodificarFoto(b.foto);
      await limitar(L.dados, context?.ip);

      let consulta;
      try {
        consulta = await reservar(L.dados, cfg, {
          modalidade: m, data: b.data, inicio: b.inicio, origem: "paciente", por: "paciente",
          cliente: { id: null, ...dados },
        }, agora);
      } catch (e) {
        if (e.indisponivel) return json({ erro: e.message, indisponivel: true, alternativas: await alternativas(L.dados, cfg, m, b.data, agora) }, 409);
        throw e;
      }

      // A vaga já está garantida; o cadastro e os e-mails não podem desfazê-la.
      try {
        const cli = await salvarCliente(L, dados, foto, "paciente");
        await anexarConsulta(L.dados, cli.id, consulta);
        await atualizar(L.dados, `dia/${consulta.data}`, (dia) => {
          const c = dia.consultas.find((x) => x.id === consulta.id);
          if (c) c.cliente.id = cli.id;
          return dia;
        });
        consulta.cliente.id = cli.id;
      } catch (e) {
        console.error("Cadastro após reserva:", e);
        await registrarLog(L.dados, "sistema", "erro-cadastro", { consulta: consulta.id, erro: e.message });
      }
      await registrarLog(L.dados, "paciente", "consulta-criada", { id: consulta.id, data: consulta.data, inicio: consulta.inicio, modalidade: m });
      const emails = await notificar(L.dados, cfg, consulta, "confirmacao");
      const mod = cfg.modalidades[m];
      return json({
        ok: true,
        consulta: { id: consulta.id, data: consulta.data, inicio: consulta.inicio, fim: consulta.fim, modalidade: mod.nome,
          endereco: m === "presencial" ? mod.endereco : "", orientacoes: mod.orientacoes },
        email_enviado: emails.find((x) => x.quem === "paciente")?.status === "enviado",
      }, 201);
    }
    return json({ erro: "Não encontrado." }, 404);
  } catch (e) {
    return tratarErro(e);
  }
};

export const config = { path: "/api/agenda/*" };
