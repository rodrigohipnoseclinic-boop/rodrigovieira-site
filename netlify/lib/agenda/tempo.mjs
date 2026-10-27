// Datas e horas da agenda. Tudo no horário de Brasília, guardado como texto
// ("2026-11-03", "14:30") para não depender do fuso do servidor.
const FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function agoraLocal(d = new Date()) {
  const p = Object.fromEntries(FMT.formatToParts(d).map((x) => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

export const paraMin = (hm) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hm || "");
  if (!m || Number(m[1]) > 24 || Number(m[2]) > 59) return NaN;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v > 1440 ? NaN : v;
};
export const paraHM = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

const utc = (data) => Date.parse(`${data}T00:00:00Z`);
export const dataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && new Date(utc(s)).toISOString().slice(0, 10) === s;
export const diaSemana = (data) => new Date(utc(data)).getUTCDay();
export const somaDias = (data, n) => new Date(utc(data) + n * 864e5).toISOString().slice(0, 10);
export const difDias = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);

export function datasEntre(de, ate) {
  const out = [];
  for (let d = de; d <= ate; d = somaDias(d, 1)) out.push(d);
  return out;
}

const SEMANA = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const dataExtenso = (data) => {
  const [a, m, d] = data.split("-").map(Number);
  return `${SEMANA[diaSemana(data)]}, ${d} de ${MESES[m - 1]} de ${a}`;
};
