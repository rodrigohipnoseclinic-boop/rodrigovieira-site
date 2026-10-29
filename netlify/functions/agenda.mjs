// API pública do agendamento (/agendar): horários livres e reserva.
import crypto from "node:crypto";
import { lojas, lerConfig, lerDia, lerExcecoes, atualizar, registrarLog } from "../lib/agenda/armazem.mjs";
import { Erro, MODALIDADES, autoagenda } from "../lib/agenda/config.mjs";
import { horariosLivres } from "../lib/agenda/disponibilidade.mjs";
import { reservar, alternativas } from "../lib/agenda/reservas.mjs";
import { salvarCliente, decodificarFoto, validarDados, anexarConsulta, marcarAguardando } from "../lib/agenda/clientes.mjs";
import { notificar, avisarAguardando, avisarDesmarcacao } from "../lib/agenda/emails.mjs";
import * as S from "../lib/agenda/sessoes.mjs";
import { buscar } from "../lib/agenda/reservas.mjs";
import { agoraLocal, dataValida, datasEntre, somaDias, difDias } from "../lib/agenda/tempo.mjs";
import { json, corpo, tratarErro, partes, definirBase, baseUrl } from "../lib/agenda/http.mjs";
import { provedor, simularPagamento } from "../lib/agenda/pix.mjs";
import { criarPedido, autenticar, atualizarStatus, publico as pedidoPublico, reservarComPedido, processarWebhook, aguardarContato } from "../lib/agenda/pedidos.mjs";

const modalidadeAtiva = (cfg, m) => {
  if (!MODALIDADES.includes(m) || !cfg.modalidades[m].ativa) throw new Erro("Modalidade indisponível.");
  return m;
};
// Modalidade em que o próprio paciente escolhe o horário (calendário).
const comCalendario = (cfg, m) => {
  modalidadeAtiva(cfg, m);
  if (!autoagenda(cfg, m)) throw new Erro(`Para atendimento ${cfg.modalidades[m].nome.toLowerCase()}, envie seu cadastro: o horário é combinado pelo WhatsApp.`, 403);
  return m;
};

function info(cfg, agora) {
  return {
    profissional: cfg.profissional, servico: cfg.servico, descricao: cfg.descricao, duracao: cfg.duracao,
    aviso_pagamento: cfg.aviso_pagamento, contato: cfg.contato, orientacoes_alteracao: cfg.orientacoes_alteracao,
    hoje: agora.data, ate: somaDias(agora.data, cfg.janela_dias),
    pix: { ativo: cfg.pix.ativo, valor: cfg.pix.valor, prazo_dias: cfg.pix.prazo_dias },
    modalidades: MODALIDADES.filter((m) => cfg.modalidades[m].ativa).map((m) => ({
      id: m, nome: cfg.modalidades[m].nome,
      endereco: m === "presencial" ? cfg.modalidades[m].endereco : "",
      autoagendamento: autoagenda(cfg, m),
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

// Registro, e-mails e resposta comuns às duas formas de reservar.
async function confirmada(L, cfg, consulta) {
  const m = consulta.modalidade;
  if (consulta.pedido && consulta.cliente.id) await anexarConsulta(L.dados, consulta.cliente.id, consulta).catch(() => {});
  await registrarLog(L.dados, "paciente", "consulta-criada", { id: consulta.id, data: consulta.data, inicio: consulta.inicio, modalidade: m, pedido: consulta.pedido });
  const emails = await notificar(L.dados, cfg, consulta, "confirmacao");
  const mod = cfg.modalidades[m];
  return json({
    ok: true,
    consulta: { id: consulta.id, data: consulta.data, inicio: consulta.inicio, fim: consulta.fim, modalidade: mod.nome,
      endereco: m === "presencial" ? mod.endereco : "", orientacoes: mod.orientacoes },
    email_enviado: emails.find((x) => x.quem === "paciente")?.status === "enviado",
  }, 201);
}

export default async (req, context) => {
  try {
    definirBase(req);
    const L = lojas();
    const cfg = await lerConfig(L.dados);
    const agora = agoraLocal();
    const [rota, sub] = partes(req, "/api/agenda");
    const q = new URL(req.url).searchParams;
    const prov = () => provedor();
    // Com Pix ativo, o calendário só abre para quem tem um pagamento confirmado.
    const exigirPago = async () => {
      if (!cfg.pix.ativo) return null;
      let p = await autenticar(L.dados, q.get("pedido"), q.get("token"));
      if (p.status === "pendente") p = await atualizarStatus(L.dados, cfg, prov(), p.id);
      if (p.status !== "pago") throw new Erro("O calendário é liberado depois da confirmação do pagamento.", 402);
      return p;
    };

    if (req.method === "GET" && rota === "info") return json(info(cfg, agora));

    if (req.method === "POST" && rota === "webhook") {
      await processarWebhook(L.dados, cfg, prov(), req, await corpo(req));
      return json({ ok: true });
    }
    if (req.method === "POST" && rota === "simular-pagamento" && process.env.AGENDA_PIX_SIMULADO === "1") {
      const p = await autenticar(L.dados, q.get("pedido"), q.get("token"));
      return json({ ok: simularPagamento(p.provedor_id) });
    }
    if (req.method === "POST" && rota === "pedido") {
      const b = await corpo(req);
      if (b.site) return json({ erro: "Envio recusado." }, 400);
      if (!cfg.pix.ativo) throw new Erro("Pagamento online desativado.");
      const m = comCalendario(cfg, b.modalidade);
      if (!b.consentimento) throw new Erro("É preciso aceitar o uso dos dados para o agendamento.");
      const dados = validarDados(b);
      const foto = decodificarFoto(b.foto);
      await limitar(L.dados, context?.ip);
      const { pedido, token } = await criarPedido(L, cfg, prov(), { modalidade: m, dados, cpf: b.cpf, foto });
      return json({ pedido: pedidoPublico(pedido, cfg), token }, 201);
    }
    if (req.method === "GET" && rota === "pedido") {
      let p = await autenticar(L.dados, q.get("pedido"), q.get("token"));
      p = await atualizarStatus(L.dados, cfg, prov(), p.id);
      return json({ pedido: pedidoPublico(p, cfg) });
    }

    // ----- link de sessão (enviado pelo consultório) -----
    if (rota === "sessao") {
      const b = req.method === "POST" ? await corpo(req) : {};
      let s = await S.autenticarSessao(L.dados, b.s || q.get("s"), b.t || q.get("t"));
      s = await S.abrirSessao(L.dados, s, agora);
      const mod = cfg.modalidades[s.modalidade];
      if (req.method === "GET" && !sub) {
        const marcadas = await S.sessoesMarcadas(L.dados, s);
        const est = S.estagio(s);
        const min = S.dataMinima(s);
        return json({
          nome: s.cliente.nome.split(" ")[0], profissional: cfg.profissional, modalidade: mod.nome, duracao: cfg.duracao, valor: s.valor,
          estagio: est, rotulo: S.ROTULO[est] || "", data_minima: min, hoje: agora.data, ate: min ? somaDias(min, cfg.janela_dias) : null, contato: cfg.contato,
          marcadas: marcadas.filter((x) => x.consulta.data >= agora.data).map(({ estagio, rotulo, consulta: c }) => ({
            estagio, rotulo, id: c.id, data: c.data, inicio: c.inicio, fim: c.fim,
            endereco: s.modalidade === "presencial" ? mod.endereco : "", orientacoes: mod.orientacoes, taxa: S.taxaDesmarcacao(cfg, c, agora),
          })),
          prazo_horas: cfg.sessoes.prazo_horas, taxas: { normal: cfg.sessoes.taxa, tardia: cfg.sessoes.taxa_tardia }, chave_pix: cfg.sessoes.chave_pix,
          desmarcacao: s.desmarcacao?.status === "pendente" ? { taxa: s.desmarcacao.taxa, consulta: s.desmarcacao.consulta, quando: s.desmarcacao.quando } : null,
        });
      }
      if (req.method === "GET" && sub === "dias") {
        if (!/^\d{4}-\d{2}$/.test(q.get("mes") || "")) throw new Erro("Mês inválido.");
        return json({ dias: await S.diasSessao(L.dados, cfg, s, q.get("mes"), agora) });
      }
      if (req.method === "GET" && sub === "horarios") return json({ horarios: await S.horariosSessao(L.dados, cfg, s, q.get("data"), agora) });
      if (req.method === "POST" && sub === "reservar") {
        let c;
        try {
          c = await S.reservarSessao(L.dados, cfg, s, b, agora);
        } catch (e) {
          if (e.indisponivel) return json({ erro: e.message, indisponivel: true }, 409);
          throw e;
        }
        await anexarConsulta(L.dados, s.cliente.id, c).catch(() => {});
        await registrarLog(L.dados, "cliente", "sessao-agendada", { sessao: s.id, consulta: c.id, data: c.data, inicio: c.inicio });
        const emails = await notificar(L.dados, cfg, c, "confirmacao");
        return json({ ok: true, consulta: { data: c.data, inicio: c.inicio, fim: c.fim }, email_enviado: emails.some((x) => x.quem === "paciente" && x.status === "enviado") }, 201);
      }
      if (req.method === "POST" && sub === "desmarcar") {
        await limitar(L.dados, context?.ip);
        const pedido = await S.solicitarDesmarcacao(L.dados, cfg, s, b, agora);
        const c = await buscar(L.dados, pedido.consulta);
        await registrarLog(L.dados, "cliente", "desmarcacao-pedida", { sessao: s.id, consulta: c.id, taxa: pedido.taxa });
        await avisarDesmarcacao(L.dados, cfg, s, c, pedido);
        return json({ ok: true, taxa: pedido.taxa, chave_pix: cfg.sessoes.chave_pix });
      }
      return json({ erro: "Não encontrado." }, 404);
    }

    // Cadastro sem horário: o consultório combina a data pelo WhatsApp.
    if (req.method === "POST" && rota === "cadastro") {
      const b = await corpo(req);
      if (b.site) return json({ erro: "Envio recusado." }, 400);
      const m = modalidadeAtiva(cfg, b.modalidade);
      if (cfg.pix.ativo && autoagenda(cfg, m)) throw new Erro("Faça o pagamento via Pix para concluir o cadastro.");
      if (!b.consentimento) throw new Erro("É preciso aceitar o uso dos dados para o cadastro.");
      const dados = validarDados(b);
      const foto = decodificarFoto(b.foto);
      await limitar(L.dados, context?.ip);
      const cli = await salvarCliente(L, dados, foto, "paciente");
      const info = { origem: "site", modalidade: m, obs: b.obs };
      await marcarAguardando(L.dados, cli.id, info);
      await registrarLog(L.dados, "paciente", "cadastro-aguardando", { cliente: cli.id });
      await avisarAguardando(L.dados, cfg, cli, info);
      return json({ ok: true }, 201);
    }
    if (req.method === "POST" && rota === "aguardar") {
      const b = await corpo(req);
      const { pedido, cliente } = await aguardarContato(L, cfg, prov(), b);
      await registrarLog(L.dados, "paciente", "pix-aguardando-horario", { pedido: pedido.id });
      await avisarAguardando(L.dados, cfg, cliente, cliente.aguardando);
      return json({ ok: true });
    }

    if (req.method === "GET" && (rota === "dias" || rota === "horarios")) await exigirPago();
    if (req.method === "GET" && rota === "dias")
      return json({ dias: await dias(L.dados, cfg, comCalendario(cfg, q.get("modalidade")), q.get("mes"), agora) });
    if (req.method === "GET" && rota === "horarios") {
      const data = q.get("data");
      if (!dataValida(data)) throw new Erro("Data inválida.");
      const m = comCalendario(cfg, q.get("modalidade"));
      return json({ horarios: horariosLivres(cfg, m, data, await lerDia(L.dados, data), await lerExcecoes(L.dados), agora) });
    }

    if (req.method === "POST" && rota === "reservar" && cfg.pix.ativo) {
      const b = await corpo(req);
      const m = comCalendario(cfg, b.modalidade);
      if (!dataValida(b.data) || difDias(agora.data, b.data) < 0) throw new Erro("Data inválida.");
      let consulta;
      try {
        consulta = await reservarComPedido(L, cfg, prov(), { pedido: b.pedido, token: b.token, modalidade: m, data: b.data, inicio: b.inicio }, agora);
      } catch (e) {
        if (e.indisponivel) return json({ erro: e.message, indisponivel: true, alternativas: await alternativas(L.dados, cfg, m, b.data, agora) }, 409);
        throw e;
      }
      return confirmada(L, cfg, consulta);
    }

    if (req.method === "POST" && rota === "reservar") {
      const b = await corpo(req);
      if (b.site) return json({ erro: "Envio recusado." }, 400); // campo armadilha para robôs
      const m = comCalendario(cfg, b.modalidade);
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
      return confirmada(L, cfg, consulta);
    }
    return json({ erro: "Não encontrado." }, 404);
  } catch (e) {
    return tratarErro(e);
  }
};

export const config = { path: "/api/agenda/*" };
