// Criar, cancelar e transferir consultas. Cada dia é um único registro
// ("dia/AAAA-MM-DD"); a gravação condicional garante que, se duas pessoas
// confirmarem o mesmo horário ao mesmo tempo, só uma consegue.
import { atualizar, ler, lerDia, lerExcecoes, novoId } from "./armazem.mjs";
import { Erro, MODALIDADES } from "./config.mjs";
import { conflito, horariosLivres, periodosDoDia, ativa } from "./disponibilidade.mjs";
import { agoraLocal, dataValida, paraMin, paraHM, somaDias, datasEntre } from "./tempo.mjs";

const consultasVazio = () => ({ consultas: [] });

function validarPedido(cfg, { modalidade, data, inicio }) {
  if (!MODALIDADES.includes(modalidade)) throw new Erro("Modalidade inválida.");
  if (!dataValida(data)) throw new Erro("Data inválida.");
  if (Number.isNaN(paraMin(inicio))) throw new Erro("Horário inválido.");
}

// Próximos horários livres a partir de uma data (para oferecer alternativas).
export async function alternativas(loja, cfg, modalidade, data, agora = agoraLocal(), maxDias = 3) {
  const exc = await lerExcecoes(loja);
  const out = [];
  for (let d = data, n = 0; n < 21 && out.length < maxDias; d = somaDias(d, 1), n++) {
    const h = horariosLivres(cfg, modalidade, d, await lerDia(loja, d), exc, agora);
    if (h.length) out.push({ data: d, horarios: h });
  }
  return out;
}

// porPaciente = true: só aceita horários oferecidos ao público.
// No painel, basta não haver conflito com outra consulta.
export async function reservar(loja, cfg, { modalidade, data, inicio, cliente, origem, por, duracao, observacao = "" }, agora = agoraLocal()) {
  validarPedido(cfg, { modalidade, data, inicio });
  const porPaciente = origem === "paciente";
  const dur = porPaciente ? cfg.duracao : Number(duracao) || cfg.duracao;
  const ini = paraMin(inicio), fim = ini + dur;
  if (fim > 1440) throw new Erro("A consulta precisa terminar no mesmo dia.");
  const exc = porPaciente ? await lerExcecoes(loja) : [];
  const id = novoId();
  const quando = new Date().toISOString();

  await atualizar(loja, `dia/${data}`, (dia) => {
    if (porPaciente) {
      if (!horariosLivres(cfg, modalidade, data, dia.consultas, exc, agora).includes(inicio))
        throw new Erro("Este horário acabou de ser ocupado ou não está mais disponível.", 409, { indisponivel: true });
    } else {
      const c = conflito(cfg, modalidade, ini, fim, dia.consultas);
      if (c) throw new Erro(`Conflita com a consulta de ${c.cliente.nome} (${c.inicio}–${c.fim}).`, 409);
    }
    dia.consultas.push({
      id, data, inicio: paraHM(ini), fim: paraHM(fim), duracao: dur, modalidade, status: "confirmada",
      cliente, origem, observacao: String(observacao).slice(0, 500), criada: quando,
      historico: [{ quando, por, acao: "criada" }],
    });
    return dia;
  }, consultasVazio);

  await loja.setJSON(`consulta/${id}`, { data });
  return buscar(loja, id);
}

export async function buscar(loja, id) {
  const { dado } = await ler(loja, `consulta/${String(id).replace(/[^A-Za-z0-9]/g, "")}`);
  if (!dado) throw new Erro("Consulta não encontrada.", 404);
  const c = (await lerDia(loja, dado.data)).find((x) => x.id === id);
  if (!c) throw new Erro("Consulta não encontrada.", 404);
  return c;
}

export async function cancelar(loja, id, por, motivo = "") {
  const atual = await buscar(loja, id);
  if (!ativa(atual)) throw new Erro("Esta consulta já não está ativa.");
  let resultado;
  await atualizar(loja, `dia/${atual.data}`, (dia) => {
    const c = dia.consultas.find((x) => x.id === id);
    if (!c || !ativa(c)) throw new Erro("Esta consulta já não está ativa.", 409);
    c.status = "cancelada";
    c.historico.push({ quando: new Date().toISOString(), por, acao: "cancelada", motivo: String(motivo).slice(0, 300) });
    resultado = c;
    return dia;
  }, consultasVazio);
  return resultado;
}

// Transfere para outra data/horário (e, se quiser, outra modalidade).
// A duração original é mantida.
export async function reagendar(loja, cfg, id, { data, inicio, modalidade }, por) {
  const atual = await buscar(loja, id);
  if (!ativa(atual)) throw new Erro("Só é possível transferir consultas ativas.");
  modalidade = modalidade || atual.modalidade;
  validarPedido(cfg, { modalidade, data, inicio });
  const ini = paraMin(inicio), fim = ini + atual.duracao;
  if (fim > 1440) throw new Erro("A consulta precisa terminar no mesmo dia.");
  const quando = new Date().toISOString();
  const de = { data: atual.data, inicio: atual.inicio, modalidade: atual.modalidade };
  const mover = (c) => {
    Object.assign(c, { data, inicio: paraHM(ini), fim: paraHM(fim), modalidade });
    c.historico.push({ quando, por, acao: "transferida", de });
    return c;
  };

  if (data === atual.data) {
    let r;
    await atualizar(loja, `dia/${data}`, (dia) => {
      const c = dia.consultas.find((x) => x.id === id);
      if (!c || !ativa(c)) throw new Erro("Esta consulta já não está ativa.", 409);
      const x = conflito(cfg, modalidade, ini, fim, dia.consultas, id);
      if (x) throw new Erro(`Conflita com a consulta de ${x.cliente.nome} (${x.inicio}–${x.fim}).`, 409);
      r = mover(c);
      return dia;
    }, consultasVazio);
    return r;
  }

  // Outro dia: primeiro garante a vaga nova, depois tira do dia antigo.
  const copia = mover(structuredClone(atual));
  await atualizar(loja, `dia/${data}`, (dia) => {
    const x = conflito(cfg, modalidade, ini, fim, dia.consultas, id);
    if (x) throw new Erro(`Conflita com a consulta de ${x.cliente.nome} (${x.inicio}–${x.fim}).`, 409);
    dia.consultas = dia.consultas.filter((c) => c.id !== id).concat(copia);
    return dia;
  }, consultasVazio);
  await loja.setJSON(`consulta/${id}`, { data });
  await atualizar(loja, `dia/${atual.data}`, (dia) => {
    dia.consultas = dia.consultas.filter((c) => c.id !== id);
    return dia;
  }, consultasVazio);
  return copia;
}

export async function consultasEntre(loja, de, ate) {
  const dias = datasEntre(de, ate);
  if (dias.length > 62) throw new Erro("Período muito longo (máximo 62 dias).");
  const listas = await Promise.all(dias.map((d) => lerDia(loja, d)));
  return listas.flat().sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));
}

// Consultas ativas atingidas por um bloqueio (para avisar antes de aplicar).
export async function conflitosDoBloqueio(loja, exc) {
  const fim = exc.fim_data > somaDias(exc.inicio_data, 366) ? somaDias(exc.inicio_data, 366) : exc.fim_data;
  const [a, b] = exc.inicio ? [paraMin(exc.inicio), paraMin(exc.fim)] : [0, 1440];
  const out = [];
  for (const d of datasEntre(exc.inicio_data, fim))
    for (const c of await lerDia(loja, d))
      if (ativa(c) && (exc.modalidade === "todas" || exc.modalidade === c.modalidade) &&
          paraMin(c.inicio) < b && a < paraMin(c.fim)) out.push(c);
  return out;
}

// Consultas futuras que ficaram fora do horário de atendimento (aviso após
// mudar a semana). Elas continuam marcadas.
export async function foraDoHorario(loja, cfg, agora = agoraLocal()) {
  const exc = await lerExcecoes(loja);
  const out = [];
  for (const d of datasEntre(agora.data, somaDias(agora.data, cfg.janela_dias)))
    for (const c of await lerDia(loja, d)) {
      if (!ativa(c)) continue;
      const cabe = periodosDoDia(cfg, c.modalidade, d, exc)
        .some(([i, f]) => i <= paraMin(c.inicio) && paraMin(c.fim) <= f);
      if (!cabe) out.push(c);
    }
  return out;
}
