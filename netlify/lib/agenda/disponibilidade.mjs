// Cálculo dos horários livres. Funções puras: recebem a configuração, as
// exceções (bloqueios e horários extras) e as consultas do dia.
import { paraMin, paraHM, diaSemana, difDias } from "./tempo.mjs";
import { passoEfetivo } from "./config.mjs";

export const ativa = (c) => c.status === "confirmada";

const vale = (exc, data, modalidade) =>
  exc.inicio_data <= data && data <= exc.fim_data && (exc.modalidade === "todas" || exc.modalidade === modalidade);

const faixa = (exc) => exc.inicio ? [paraMin(exc.inicio), paraMin(exc.fim)] : [0, 1440];

// Retira de cada período os trechos [a, b).
function subtrair(periodos, a, b) {
  const out = [];
  for (const [i, f] of periodos) {
    if (b <= i || a >= f) { out.push([i, f]); continue; }
    if (a > i) out.push([i, a]);
    if (b < f) out.push([b, f]);
  }
  return out;
}

// Períodos de atendimento do dia, em minutos: semana + extras − bloqueios.
export function periodosDoDia(cfg, modalidade, data, excecoes = []) {
  const mod = cfg.modalidades[modalidade];
  if (!mod?.ativa) return [];
  let p = (mod.semana[diaSemana(data)] || []).map((x) => [paraMin(x.inicio), paraMin(x.fim)]);
  for (const e of excecoes) if (e.tipo === "extra" && vale(e, data, modalidade)) p.push(faixa(e));
  p.sort((a, b) => a[0] - b[0]);
  const unidos = [];
  for (const x of p) {
    const u = unidos.at(-1);
    if (u && x[0] <= u[1]) u[1] = Math.max(u[1], x[1]); else unidos.push([...x]);
  }
  p = unidos;
  for (const e of excecoes) if (e.tipo === "bloqueio" && vale(e, data, modalidade)) p = subtrair(p, ...faixa(e));
  return p;
}

// Consulta ativa que ocupa a mesma agenda e se sobrepõe a [ini, fim), já
// contando o intervalo entre consultas. Presencial e online só disputam o
// mesmo horário quando apontam para a mesma agenda.
export function conflito(cfg, modalidade, ini, fim, consultas, ignorarId) {
  const agenda = cfg.modalidades[modalidade].agenda;
  const iv = cfg.intervalo;
  return consultas.find((c) =>
    ativa(c) && c.id !== ignorarId &&
    (cfg.modalidades[c.modalidade]?.agenda ?? agenda) === agenda &&
    ini < paraMin(c.fim) + iv && paraMin(c.inicio) < fim + iv) || null;
}

export function horariosLivres(cfg, modalidade, data, consultas, excecoes, agora) {
  const dias = difDias(agora.data, data);
  if (dias < 0 || dias > cfg.janela_dias) return [];
  const limite = agora.min + cfg.antecedencia_horas * 60 - dias * 1440;
  const passo = passoEfetivo(cfg), dur = cfg.duracao, out = [];
  for (const [i, f] of periodosDoDia(cfg, modalidade, data, excecoes))
    for (let s = i; s + dur <= f; s += passo)
      if (s >= limite && !conflito(cfg, modalidade, s, s + dur, consultas)) out.push(paraHM(s));
  return out;
}
