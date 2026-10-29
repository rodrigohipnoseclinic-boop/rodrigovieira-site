// Login do painel: usuários com senha (scrypt) e sessão em cookie assinado.
// Precisa da variável AGENDA_SEGREDO no Netlify (também usada como código
// para criar o primeiro administrador).
import crypto from "node:crypto";
import { atualizar, ler, listarChaves } from "./armazem.mjs";
import { Erro } from "./config.mjs";

const COOKIE = "painel_sessao";
const HORAS = 12;

export const PERMISSOES = {
  admin: ["*"],
  assistente: ["agenda", "consultas", "clientes", "emails", "pagamentos"],
};
export const pode = (u, area) => PERMISSOES[u.papel]?.some((p) => p === "*" || p === area);

export function segredo() {
  const s = process.env.AGENDA_SEGREDO || "";
  if (s.length < 24) throw new Erro("Painel ainda não configurado: crie a variável AGENDA_SEGREDO (mínimo 24 caracteres) no Netlify.", 503);
  return s;
}

const igual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const hash = (senha, sal) => crypto.scryptSync(senha, sal, 64).toString("hex");
export function validarSenha(s) {
  if (String(s || "").length < 10) throw new Erro("A senha precisa ter pelo menos 10 caracteres.");
}
export const chaveUsuario = (email) => `usuario/${String(email).trim().toLowerCase()}`;

export async function criarUsuario(loja, { email, nome, papel, senha }) {
  email = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Erro("E-mail inválido.");
  if (!PERMISSOES[papel]) throw new Erro("Perfil inválido.");
  validarSenha(senha);
  const sal = crypto.randomBytes(16).toString("hex");
  const r = await loja.setJSON(chaveUsuario(email), {
    email, nome: String(nome || "").trim().slice(0, 80) || email, papel, sal, hash: hash(senha, sal), versao: 1, criado: new Date().toISOString(),
  }, { onlyIfNew: true });
  if (!r.modified) throw new Erro("Já existe um usuário com este e-mail.", 409);
}

export async function trocarSenha(loja, email, senha) {
  validarSenha(senha);
  await atualizar(loja, chaveUsuario(email), (u) => {
    if (!u.email) throw new Erro("Usuário não encontrado.", 404);
    u.sal = crypto.randomBytes(16).toString("hex");
    u.hash = hash(senha, u.sal);
    u.versao = (u.versao || 1) + 1; // derruba sessões antigas
    return u;
  });
}

export async function haUsuarios(loja) {
  return (await listarChaves(loja, "usuario/")).length > 0;
}

// Bloqueia o e-mail por 15 min depois de 8 senhas erradas.
export async function entrar(loja, email, senha) {
  const chaveT = `tentativas/${String(email).trim().toLowerCase()}`;
  const t = (await ler(loja, chaveT)).dado;
  if (t && t.n >= 8 && Date.now() - t.ultima < 15 * 60e3) throw new Erro("Muitas tentativas. Aguarde 15 minutos.", 429);
  const u = (await ler(loja, chaveUsuario(email))).dado;
  if (!u || !igual(hash(String(senha || ""), u.sal), u.hash)) {
    await loja.setJSON(chaveT, { n: (t && Date.now() - t.ultima < 15 * 60e3 ? t.n : 0) + 1, ultima: Date.now() });
    throw new Erro("E-mail ou senha incorretos.", 401);
  }
  if (t) await loja.delete(chaveT);
  return u;
}

const assinar = (txt) => crypto.createHmac("sha256", segredo()).update(txt).digest("base64url");

export function cookieSessao(u) {
  const corpo = Buffer.from(JSON.stringify({ e: u.email, v: u.versao, x: Date.now() + HORAS * 3600e3 })).toString("base64url");
  return `${COOKIE}=${corpo}.${assinar(corpo)}; Path=/api/painel; HttpOnly; Secure; SameSite=Strict; Max-Age=${HORAS * 3600}`;
}
export const cookieSair = () => `${COOKIE}=; Path=/api/painel; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function usuarioDaSessao(loja, req) {
  const m = new RegExp(`${COOKIE}=([\\w-]+)\\.([\\w-]+)`).exec(req.headers.get("cookie") || "");
  if (!m || !igual(assinar(m[1]), m[2])) return null;
  let s;
  try { s = JSON.parse(Buffer.from(m[1], "base64url").toString()); } catch { return null; }
  if (!s || s.x < Date.now()) return null;
  const u = (await ler(loja, chaveUsuario(s.e))).dado;
  return u && u.versao === s.v ? u : null;
}

export const publico = ({ email, nome, papel }) => ({ email, nome, papel });
