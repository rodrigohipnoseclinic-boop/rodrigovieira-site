// API do painel administrativo (/painel). Toda rota, menos entrar e
// primeiro acesso, exige sessão e respeita o perfil do usuário.
import { lojas, ler, lerConfig, lerDia, lerExcecoes, atualizar, listarChaves, registrarLog, novoId } from "../lib/agenda/armazem.mjs";
import { Erro, MODALIDADES, normalizarConfig } from "../lib/agenda/config.mjs";
import { horariosLivres, periodosDoDia } from "../lib/agenda/disponibilidade.mjs";
import { reservar, buscar, cancelar, reagendar, consultasEntre, conflitosDoBloqueio, foraDoHorario } from "../lib/agenda/reservas.mjs";
import { salvarCliente, anexarConsulta, listarClientes, excluirCliente, decodificarFoto, marcarAguardando, limparAguardando } from "../lib/agenda/clientes.mjs";
import { notificar, reenviar, listarEmails } from "../lib/agenda/emails.mjs";
import * as A from "../lib/agenda/auth.mjs";
import { agoraLocal, dataValida, paraMin } from "../lib/agenda/tempo.mjs";
import { json, corpo, tratarErro, partes, definirBase, baseUrl } from "../lib/agenda/http.mjs";
import { provedor } from "../lib/agenda/pix.mjs";
import * as PR from "../lib/agenda/prontuario.mjs";
import * as S from "../lib/agenda/sessoes.mjs";
import { whatsappConfigurado } from "../lib/agenda/whatsapp.mjs";
import { listarPedidos, atualizarStatus, liberarPedido, estornar, linkRetomar, vincularPedido } from "../lib/agenda/pedidos.mjs";
import { mensagemAvulsa } from "../lib/agenda/emails.mjs";

const exigir = (u, area) => { if (!A.pode(u, area)) throw new Erro("Seu perfil não tem acesso a esta área.", 403); };

// Marcação pelo painel fora do horário geral: só com a sua confirmação.
async function confirmarForaDoHorario(loja, cfg, { modalidade, data, inicio, duracao, confirmar_fora }) {
  if (confirmar_fora || !MODALIDADES.includes(modalidade) || !dataValida(data)) return;
  const ini = paraMin(inicio), fim = ini + (Number(duracao) || cfg.duracao);
  const cabe = periodosDoDia({ ...cfg, modalidades: { ...cfg.modalidades, [modalidade]: { ...cfg.modalidades[modalidade], ativa: true } } },
    modalidade, data, await lerExcecoes(loja)).some(([i, f]) => i <= ini && fim <= f);
  if (!cabe) throw new Erro("Este horário está fora do horário geral de atendimento (ou num bloqueio). Deseja agendar mesmo assim?", 409, { fora_horario: true });
}

function validarExcecao(b) {
  const tipo = b.tipo === "extra" ? "extra" : "bloqueio";
  const inicio_data = b.inicio_data, fim_data = b.fim_data || b.inicio_data;
  if (!dataValida(inicio_data) || !dataValida(fim_data) || fim_data < inicio_data) throw new Erro("Datas inválidas.");
  const diaTodo = !b.inicio && !b.fim;
  if (!diaTodo) {
    const i = paraMin(b.inicio), f = paraMin(b.fim);
    if (Number.isNaN(i) || Number.isNaN(f) || i >= f) throw new Erro("Horário inválido.");
  }
  if (tipo === "extra" && diaTodo) throw new Erro("Informe o horário do atendimento extra.");
  const modalidade = ["todas", ...MODALIDADES].includes(b.modalidade) ? b.modalidade : "todas";
  if (tipo === "bloqueio" && String(b.motivo || "").trim().length < 2) throw new Erro("Dê um título ao bloqueio (o motivo, só você vê).");
  return { id: novoId(8), tipo, inicio_data, fim_data, inicio: diaTodo ? null : b.inicio, fim: diaTodo ? null : b.fim,
    modalidade, motivo: String(b.motivo || "").trim().slice(0, 200) };
}

async function rotasLivres(L, req) {
  const [rota] = partes(req, "/api/painel");
  if (req.method === "GET" && rota === "estado") {
    let configurado = true;
    try { A.segredo(); } catch { configurado = false; }
    const u = configurado ? await A.usuarioDaSessao(L.dados, req) : null;
    return json({ configurado, primeiro_acesso: configurado && !(await A.haUsuarios(L.dados)), usuario: u && A.publico(u) });
  }
  if (req.method === "POST" && rota === "primeiro-acesso") {
    const b = await corpo(req);
    const s = A.segredo();
    if (await A.haUsuarios(L.dados)) throw new Erro("O primeiro acesso já foi feito.", 409);
    if (String(b.codigo || "") !== s) throw new Erro("Código de configuração incorreto.", 401);
    await A.criarUsuario(L.dados, { ...b, papel: "admin" });
    const u = await A.entrar(L.dados, b.email, b.senha);
    await registrarLog(L.dados, u.email, "primeiro-acesso");
    return json({ usuario: A.publico(u) }, 200, { "Set-Cookie": A.cookieSessao(u) });
  }
  if (req.method === "POST" && rota === "entrar") {
    const b = await corpo(req);
    A.segredo();
    const u = await A.entrar(L.dados, b.email, b.senha);
    await registrarLog(L.dados, u.email, "entrou");
    return json({ usuario: A.publico(u) }, 200, { "Set-Cookie": A.cookieSessao(u) });
  }
  if (req.method === "POST" && rota === "sair") return json({ ok: true }, 200, { "Set-Cookie": A.cookieSair() });
  return null;
}

async function rotasProtegidas(L, req, u) {
  const [r, id, acao, sub] = partes(req, "/api/painel");
  const q = new URL(req.url).searchParams;
  const M = req.method;
  const log = (a, d) => registrarLog(L.dados, u.email, a, d);

  if (M === "POST" && r === "senha") {
    const b = await corpo(req);
    await A.entrar(L.dados, u.email, b.atual);
    await A.trocarSenha(L.dados, u.email, b.nova);
    await log("trocou-senha");
    const novo = (await ler(L.dados, A.chaveUsuario(u.email))).dado;
    return json({ ok: true }, 200, { "Set-Cookie": A.cookieSessao(novo) });
  }

  // ----- configurações e horários de atendimento -----
  if (r === "config") {
    if (M === "GET") return json({ config: await lerConfig(L.dados), podeEditar: A.pode(u, "config"), whatsapp_configurado: whatsappConfigurado() });
    if (M === "PUT") {
      exigir(u, "config");
      const cfg = normalizarConfig(await corpo(req));
      await L.dados.setJSON("config", cfg);
      await log("config-alterada", { duracao: cfg.duracao, intervalo: cfg.intervalo });
      const fora = await foraDoHorario(L.dados, cfg);
      return json({ config: cfg, fora_do_horario: fora.map((c) => ({ id: c.id, data: c.data, inicio: c.inicio, nome: c.cliente.nome })) });
    }
  }

  // ----- agenda e consultas -----
  if (M === "GET" && r === "agenda") {
    exigir(u, "agenda");
    const de = q.get("de"), ate = q.get("ate");
    if (!dataValida(de) || !dataValida(ate) || ate < de) throw new Erro("Período inválido.");
    // Bloqueios são só seus: a assistente vê apenas "indisponível", sem o título.
    const exc = (await lerExcecoes(L.dados)).map((e) => (A.pode(u, "admin") ? e : { ...e, motivo: "" }));
    return json({ consultas: await consultasEntre(L.dados, de, ate), excecoes: exc });
  }
  if (M === "GET" && r === "livres") {
    exigir(u, "agenda");
    const cfg = await lerConfig(L.dados), data = q.get("data"), m = q.get("modalidade");
    if (!dataValida(data) || !MODALIDADES.includes(m)) throw new Erro("Dados inválidos.");
    const agora = { ...agoraLocal(), min: 0 }; // no painel, ignora a antecedência mínima
    return json({ horarios: horariosLivres({ ...cfg, antecedencia_horas: 0, janela_dias: 3650 }, m, data, await lerDia(L.dados, data), await lerExcecoes(L.dados), agora) });
  }
  if (r === "consultas") {
    exigir(u, "consultas");
    const cfg = await lerConfig(L.dados);
    if (M === "GET" && id) return json({ consulta: await buscar(L.dados, id) });
    if (M === "POST" && !id) {
      const b = await corpo(req);
      const foto = b.foto ? decodificarFoto(b.foto) : null;
      // Cliente já cadastrado (ex.: aguardando agendamento) ou cadastro novo.
      const cli = b.cliente_id ? (await ler(L.dados, `cliente/${String(b.cliente_id).replace(/[^a-f0-9]/g, "")}`)).dado
        : await salvarCliente(L, b.cliente || {}, foto, u.email);
      if (!cli) throw new Erro("Cliente não encontrado.", 404);
      await confirmarForaDoHorario(L.dados, cfg, b);
      const pedidoPago = cli.aguardando?.pedido || null;
      const c = await reservar(L.dados, cfg, {
        modalidade: b.modalidade, data: b.data, inicio: b.inicio, duracao: b.duracao, observacao: b.observacao,
        origem: "painel", por: u.email, pedido: pedidoPago, tipo: b.tipo, cliente: { id: cli.id, nome: cli.nome, email: cli.email, telefone: cli.telefone },
      });
      await anexarConsulta(L.dados, cli.id, c);
      if (pedidoPago) await vincularPedido(L.dados, pedidoPago, c);
      await log("consulta-criada", { id: c.id, data: c.data, inicio: c.inicio, cliente: cli.nome });
      const emails = await notificar(L.dados, cfg, c, "confirmacao", { avisarPaciente: b.avisar !== false });
      return json({ consulta: c, emails }, 201);
    }
    if (M === "POST" && id && acao === "cancelar") {
      const b = await corpo(req);
      const c = await cancelar(L.dados, id, u.email, b.motivo);
      await S.sincronizarSessao(L.dados, c);
      await log("consulta-cancelada", { id, data: c.data, inicio: c.inicio, motivo: b.motivo || "" });
      const emails = await notificar(L.dados, cfg, c, "cancelamento", { avisarPaciente: b.avisar !== false });
      return json({ consulta: c, emails });
    }
    if (M === "POST" && id && acao === "transferir") {
      const b = await corpo(req);
      const atual = await buscar(L.dados, id);
      await confirmarForaDoHorario(L.dados, cfg, { ...b, modalidade: b.modalidade || atual.modalidade, duracao: atual.duracao });
      const c = await reagendar(L.dados, cfg, id, b, u.email);
      await S.sincronizarSessao(L.dados, c);
      await log("consulta-transferida", { id, para: `${c.data} ${c.inicio}`, de: c.historico.at(-1).de });
      const emails = await notificar(L.dados, cfg, c, "transferencia", { avisarPaciente: b.avisar !== false });
      return json({ consulta: c, emails });
    }
  }

  // ----- bloqueios e horários extras -----
  if (r === "excecoes") {
    exigir(u, "admin");
    if (M === "GET") return json({ excecoes: await lerExcecoes(L.dados) });
    if (M === "POST") {
      const b = await corpo(req);
      const exc = validarExcecao(b);
      if (exc.tipo === "bloqueio" && !b.forcar) {
        const cs = await conflitosDoBloqueio(L.dados, exc);
        if (cs.length) throw new Erro(`Há ${cs.length} consulta(s) marcada(s) neste período. Elas não serão canceladas automaticamente.`, 409,
          { conflitos: cs.map((c) => ({ id: c.id, data: c.data, inicio: c.inicio, fim: c.fim, nome: c.cliente.nome })) });
      }
      await atualizar(L.dados, "excecoes", (x) => ({ itens: [...(x.itens || []), exc] }));
      await log(exc.tipo === "extra" ? "horario-extra" : "bloqueio", exc);
      return json({ excecao: exc }, 201);
    }
    if (M === "DELETE" && id) {
      let removida;
      await atualizar(L.dados, "excecoes", (x) => {
        removida = (x.itens || []).find((e) => e.id === id);
        return { itens: (x.itens || []).filter((e) => e.id !== id) };
      });
      if (!removida) throw new Erro("Não encontrado.", 404);
      await log("excecao-removida", removida);
      return json({ ok: true });
    }
  }

  // ----- clientes -----
  if (r === "clientes") {
    exigir(u, "clientes");
    if (M === "GET" && !id) return json({ clientes: await listarClientes(L.dados) });
    if (M === "POST" && !id) {
      const b = await corpo(req);
      const cli = await salvarCliente(L, b, b.foto ? decodificarFoto(b.foto) : null, u.email);
      if (b.aguardando) await marcarAguardando(L.dados, cli.id, { origem: "painel", modalidade: b.modalidade || null, obs: b.obs });
      await log("cliente-cadastrado", { id: cli.id, nome: cli.nome });
      return json({ cliente: cli }, 201);
    }
    const cid = String(id).replace(/[^a-f0-9]/g, "");
    if (acao === "aguardando") {
      if (M === "POST") {
        const b = await corpo(req);
        await marcarAguardando(L.dados, cid, { origem: "painel", modalidade: b.modalidade || null, obs: b.obs });
      }
      else if (M === "DELETE") await limparAguardando(L.dados, cid);
      await log(M === "POST" ? "cliente-aguardando" : "cliente-saiu-da-espera", { id: cid });
      return json({ ok: true });
    }
    if (M === "GET" && acao === "foto") {
      const foto = await L.fotos.get(cid, { type: "arrayBuffer" });
      if (!foto) return new Response("Sem foto", { status: 404 });
      return new Response(foto, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" } });
    }
    if (M === "GET") {
      const c = (await ler(L.dados, `cliente/${cid}`)).dado;
      if (!c) throw new Erro("Cliente não encontrado.", 404);
      const consultas = [];
      for (const x of (c.consultas || []).slice(-50)) {
        try { consultas.push(await buscar(L.dados, x)); } catch { /* removida */ }
      }
      return json({ cliente: c, consultas });
    }
    if (M === "DELETE") {
      exigir(u, "admin");
      if (await PR.temProntuario(L.dados, cid)) throw new Erro("Este cliente tem prontuário. Exclua o prontuário antes (verifique o prazo de guarda exigido para registros de atendimento).", 409);
      await excluirCliente(L, cid);
      await log("cliente-excluido", { id: cid });
      return json({ ok: true });
    }
  }

  // ----- pagamentos Pix -----
  if (r === "pagamentos") {
    exigir(u, "pagamentos");
    const prov = provedor();
    if (M === "GET") return json({ pedidos: await listarPedidos(L.dados), configurado: prov.configurado, provedor: prov.nome,
      webhook: `${baseUrl()}/api/agenda/webhook`, ambiente: process.env.ASAAS_AMBIENTE === "producao" ? "produção" : "teste (sandbox)" });
    const cfg = await lerConfig(L.dados);
    if (M === "POST" && id && acao === "verificar") return json({ pedido: await atualizarStatus(L.dados, cfg, prov, id) });
    if (M === "POST" && id && acao === "liberar") {
      const { pedido: p, token } = await liberarPedido(L.dados, id);
      await log("pix-liberado", { pedido: p.id });
      const e = await mensagemAvulsa(L.dados, `lib-${p.id}-${p.eventos.length}`, {
        quem: "paciente", para: p.cliente.email, evento: "pagamento", assunto: "Escolha um novo horário para sua consulta", titulo: "Escolha um novo horário",
        linhas: [["Atendimento", cfg.servico], ["Link para agendar", linkRetomar(p.id, token)]], rodape: "Seu pagamento continua válido para um novo agendamento.",
      });
      return json({ ok: true, email: e.status });
    }
    if (M === "POST" && id === "webhook") {
      exigir(u, "admin");
      if (!prov.registrarWebhook) throw new Erro("O provedor atual não precisa de webhook.");
      const w = await prov.registrarWebhook(`${baseUrl()}/api/agenda/webhook`, cfg.email_admin || process.env.GMAIL_USUARIO || "");
      await log("asaas-webhook", { url: w.url, atualizado: w.atualizado });
      return json({ webhook: w });
    }
    if (M === "POST" && id && acao === "estornar") {
      exigir(u, "admin");
      const p = await estornar(L.dados, prov, id);
      await log("pix-estornado", { pedido: p.id, valor: p.valor });
      return json({ pedido: p });
    }
  }

  // ----- e-mails -----
  if (r === "emails") {
    exigir(u, "emails");
    if (M === "GET") return json({ emails: await listarEmails(L.dados, { soErros: q.get("erros") === "1" }) });
    if (M === "POST" && id && acao === "reenviar") {
      const e = await reenviar(L.dados, id);
      await log("email-reenviado", { id, status: e.status });
      return json({ email: { ...e, html: undefined, texto: undefined } });
    }
  }

  // ----- links de sessão: só administrador -----
  if (r === "sessoes") {
    exigir(u, "admin");
    if (M === "GET") {
      const ss = await S.listarSessoes(L.dados);
      const out = [];
      for (const s of ss) {
        const { token_hash, token_cifrado, pix, ...resto } = s;
        const ativo = !s.revogado && !S.expirado(s);
        out.push({ ...resto, pix: pix && { status: pix.status, manual: !!pix.manual, pago_em: pix.pago_em || null }, expirado: S.expirado(s), data_minima: s.usado ? null : (await S.dataMinima(L.dados, s)).data, link: ativo ? S.linkSessao(s) : null });
      }
      return json({ sessoes: out });
    }
    const cfg = await lerConfig(L.dados);
    if (M === "POST" && !id) {
      const b = await corpo(req);
      const cli = (await ler(L.dados, `cliente/${String(b.cliente_id || "").replace(/[^a-f0-9]/g, "")}`)).dado;
      if (!cli) throw new Erro("Escolha um cliente cadastrado.");
      const s = await S.criarSessao(L.dados, cfg, { cliente: cli, modalidade: b.modalidade, valor: b.valor, observacao: b.observacao,
        min_dias_primeira: b.min_dias_primeira, min_dias_retorno: b.min_dias_retorno, validade_horas: b.validade_horas, cobrar_pix: b.cobrar_pix }, u.email);
      await log("sessao-criada", { sessao: s.id, cliente: cli.nome, valor: s.valor });
      const dm = await S.dataMinima(L.dados, s);
      return json({ sessao: { id: s.id, valor: s.valor, expira_em: s.expira_em, data_minima: dm.data, base: dm.base, ultima: dm.ultima }, link: S.linkSessao(s) }, 201);
    }
    if (M === "POST" && id && acao === "liberar") {
      await S.liberarSemPix(L.dados, id, u.email);
      await log("sessao-liberada-sem-pix", { sessao: id });
      return json({ ok: true });
    }
    if (M === "POST" && id && acao === "verificar-pix") {
      const s = await S.atualizarPixSessao(L.dados, cfg, provedor(), id);
      return json({ status: s?.pix?.status || null });
    }
    if (M === "POST" && id && ["aprovar", "recusar", "taxa-paga"].includes(acao)) {
      const s = await S.decidirDesmarcacao(L.dados, id, acao, u.email);
      await log(`desmarcacao-${acao}`, { sessao: id });
      if (acao === "aprovar" && s.desmarcacao?.consulta) {
        const c = await buscar(L.dados, s.desmarcacao.consulta);
        await notificar(L.dados, cfg, c, "cancelamento");
      }
      return json({ ok: true });
    }
    if (M === "DELETE" && id) {
      await S.revogarSessao(L.dados, id);
      await log("sessao-revogada", { sessao: id });
      return json({ ok: true });
    }
  }

  // ----- prontuário (evoluções clínicas): só administrador -----
  if (r === "prontuario") {
    exigir(u, "admin");
    const cid = String(id || "").replace(/[^a-f0-9]/g, "");
    if (!cid) throw new Erro("Cliente inválido.");
    if (M === "GET" && !acao) {
      const c = (await ler(L.dados, `cliente/${cid}`)).dado;
      if (!c) throw new Erro("Cliente não encontrado.", 404);
      return json({ cliente: { id: c.id, nome: c.nome, telefone: c.telefone, email: c.email, foto: !!c.foto }, prontuario: await PR.lerProntuario(L.dados, cid), max: PR.MAX_EVOLUCOES });
    }
    if (M === "POST" && acao === "evolucoes" && !sub) {
      const ev = await PR.adicionarEvolucao(L.dados, cid, await corpo(req), u.email);
      await log("evolucao-adicionada", { cliente: cid, evolucao: ev.id, data: ev.data });
      return json({ evolucao: ev }, 201);
    }
    if (M === "PUT" && acao === "evolucoes" && sub) {
      await PR.editarEvolucao(L.dados, cid, sub, await corpo(req), u.email);
      await log("evolucao-editada", { cliente: cid, evolucao: sub });
      return json({ ok: true });
    }
    if (M === "DELETE" && acao === "evolucoes" && sub) {
      await PR.excluirEvolucao(L.dados, cid, sub);
      await log("evolucao-excluida", { cliente: cid, evolucao: sub });
      return json({ ok: true });
    }
    if (M === "POST" && acao === "processos") {
      const p = await PR.novoProcesso(L.dados, cid, await corpo(req));
      await log("processo-iniciado", { cliente: cid, numero: p.numero });
      return json({ processo: p }, 201);
    }
    if (M === "DELETE" && !acao) {
      await PR.excluirProntuario(L.dados, cid);
      await log("prontuario-excluido", { cliente: cid });
      return json({ ok: true });
    }
  }

  // ----- só administrador -----
  if (r === "log") {
    exigir(u, "admin");
    const meses = [new Date().toISOString().slice(0, 7), new Date(Date.now() - 31 * 864e5).toISOString().slice(0, 7)];
    const chaves = (await Promise.all(meses.map((m) => listarChaves(L.dados, `log/${m}/`)))).flat().sort().reverse().slice(0, 200);
    return json({ registros: (await Promise.all(chaves.map(async (k) => (await ler(L.dados, k)).dado))).filter(Boolean) });
  }
  if (r === "usuarios") {
    exigir(u, "admin");
    if (M === "GET") {
      const chaves = await listarChaves(L.dados, "usuario/");
      return json({ usuarios: (await Promise.all(chaves.map(async (k) => (await ler(L.dados, k)).dado))).filter(Boolean).map(A.publico) });
    }
    if (M === "POST") {
      const b = await corpo(req);
      await A.criarUsuario(L.dados, b);
      await log("usuario-criado", { email: b.email, papel: b.papel });
      return json({ ok: true }, 201);
    }
    if (M === "DELETE" && id) {
      const email = decodeURIComponent(id).toLowerCase();
      if (email === u.email) throw new Erro("Você não pode remover o próprio acesso.");
      await L.dados.delete(A.chaveUsuario(email));
      await log("usuario-removido", { email });
      return json({ ok: true });
    }
  }
  if (M === "GET" && r === "backup") {
    exigir(u, "admin");
    const chaves = (await listarChaves(L.dados, "")).filter((k) => !/^(usuario|tentativas|limite)\//.test(k));
    const dados = {};
    for (const k of chaves) dados[k] = (await ler(L.dados, k)).dado;
    await log("backup-baixado", { itens: chaves.length });
    return json({ gerado: new Date().toISOString(), dados }, 200,
      { "Content-Disposition": `attachment; filename="agenda-backup-${agoraLocal().data}.json"` });
  }
  return json({ erro: "Não encontrado." }, 404);
}

export default async (req) => {
  try {
    definirBase(req);
    if (req.method !== "GET" && req.headers.get("x-painel") !== "1") throw new Erro("Requisição recusada.", 403);
    const L = lojas();
    const livre = await rotasLivres(L, req);
    if (livre) return livre;
    A.segredo();
    const u = await A.usuarioDaSessao(L.dados, req);
    if (!u) throw new Erro("Sessão expirada. Entre novamente.", 401);
    return await rotasProtegidas(L, req, u);
  } catch (e) {
    return tratarErro(e);
  }
};

export const config = { path: "/api/painel/*" };
