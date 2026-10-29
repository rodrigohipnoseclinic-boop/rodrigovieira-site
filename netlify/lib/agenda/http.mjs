// Respostas JSON e tratamento de erros comuns às funções da agenda.
import { Erro } from "./config.mjs";
import { SITE } from "../email.mjs";

export const json = (dado, status = 200, headers = {}) =>
  new Response(JSON.stringify(dado), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", ...headers },
  });

export async function corpo(req, max = 4.5e6) {
  const t = await req.text();
  if (t.length > max) throw new Erro("Envio grande demais.", 413);
  try { return t ? JSON.parse(t) : {}; } catch { throw new Erro("Dados inválidos."); }
}

export function tratarErro(e) {
  if (e instanceof Erro) return json({ erro: e.message, ...(e.indisponivel ? { indisponivel: true } : {}), ...(e.conflitos ? { conflitos: e.conflitos } : {}), ...(e.fora_horario ? { fora_horario: true } : {}) }, e.status);
  console.error(e);
  return json({ erro: "Erro inesperado. Tente de novo em instantes." }, 500);
}

// Rota relativa ao prefixo da função: "/api/agenda/horarios" -> ["horarios"].
export const partes = (req, prefixo) => new URL(req.url).pathname.slice(prefixo.length).split("/").filter(Boolean);

// Endereço público onde o sistema está rodando (site oficial ou pré-visualização
// do Netlify). Só aceita o domínio oficial ou subdomínios do próprio site no
// Netlify, para um cabeçalho Host forjado não alterar os links dos e-mails.
let base = SITE;
export function definirBase(req) {
  const o = new URL(req.url).origin;
  base = o === SITE || /^https:\/\/[a-z0-9-]+--frolicking-twilight-95f5e2\.netlify\.app$/.test(o) ? o : SITE;
}
export const baseUrl = () => base;
