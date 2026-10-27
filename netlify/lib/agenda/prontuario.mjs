// Evoluções clínicas por cliente, organizadas em processos de atendimento
// (até 15 evoluções por processo). Só o administrador acessa.
// O conteúdo é cifrado (AES-256-GCM) com a variável PRONTUARIO_CHAVE:
// sem ela os textos não podem ser lidos, então guarde uma cópia em local seguro.
import crypto from "node:crypto";
import { atualizar, ler, novoId } from "./armazem.mjs";
import { Erro } from "./config.mjs";
import { agoraLocal, dataValida } from "./tempo.mjs";

export const MAX_EVOLUCOES = 15;
const chaveP = (cid) => `prontuario/${String(cid).replace(/[^a-f0-9]/g, "")}`;

function chave() {
  const s = process.env.PRONTUARIO_CHAVE || "";
  if (s.length < 32) throw new Erro("Prontuário ainda não ativado: crie a variável PRONTUARIO_CHAVE (mínimo 32 caracteres) no Netlify e guarde uma cópia dela.", 503);
  return crypto.createHash("sha256").update(`prontuario:${s}`).digest();
}
function cifrar(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64")).join(".");
}
function decifrar(txt) {
  const [iv, tag, dados] = txt.split(".").map((b) => Buffer.from(b, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  try {
    return JSON.parse(Buffer.concat([d.update(dados), d.final()]).toString("utf8"));
  } catch {
    throw new Erro("Não foi possível abrir o prontuário: a PRONTUARIO_CHAVE é diferente da usada para gravar.", 500);
  }
}

export async function lerProntuario(loja, cid) {
  const { dado } = await ler(loja, chaveP(cid));
  return dado ? decifrar(dado.c) : { processos: [] };
}

async function mudar(loja, cid, fn) {
  chave(); // falha cedo se não houver chave
  let resultado;
  await atualizar(loja, chaveP(cid), (doc) => {
    const p = doc.c ? decifrar(doc.c) : { processos: [] };
    resultado = fn(p);
    return { c: cifrar(p), atualizado: new Date().toISOString() };
  });
  return resultado;
}

const validar = ({ data, texto }) => {
  chave();
  const t = String(texto || "").replace(/\r\n/g, "\n").trim();
  if (!t) throw new Erro("Cole ou escreva a evolução.");
  if (t.length > 20000) throw new Erro("Evolução muito longa (máximo 20 mil caracteres).");
  const d = data || agoraLocal().data;
  if (!dataValida(d)) throw new Erro("Data inválida.");
  return { data: d, texto: t };
};
const aberto = (p) => p.processos.find((x) => !x.fim);

export async function adicionarEvolucao(loja, cid, entrada, por) {
  const e = validar(entrada);
  return mudar(loja, cid, (p) => {
    let proc = aberto(p);
    if (!proc) {
      proc = { id: novoId(8), numero: p.processos.length + 1, titulo: "", inicio: e.data, fim: null, evolucoes: [] };
      p.processos.push(proc);
    }
    if (proc.evolucoes.length >= MAX_EVOLUCOES)
      throw new Erro(`Este processo já tem ${MAX_EVOLUCOES} evoluções. Inicie um novo processo para continuar.`, 409);
    const ev = { id: novoId(8), ...e, criado: new Date().toISOString(), por };
    proc.evolucoes.push(ev);
    proc.evolucoes.sort((a, b) => a.data.localeCompare(b.data) || a.criado.localeCompare(b.criado));
    return ev;
  });
}

export async function editarEvolucao(loja, cid, eid, entrada, por) {
  const e = validar(entrada);
  return mudar(loja, cid, (p) => {
    const ev = p.processos.flatMap((x) => x.evolucoes).find((x) => x.id === eid);
    if (!ev) throw new Erro("Evolução não encontrada.", 404);
    Object.assign(ev, e, { editado: new Date().toISOString(), editado_por: por });
    return ev;
  });
}

export async function excluirEvolucao(loja, cid, eid) {
  return mudar(loja, cid, (p) => {
    const proc = p.processos.find((x) => x.evolucoes.some((e) => e.id === eid));
    if (!proc) throw new Erro("Evolução não encontrada.", 404);
    proc.evolucoes = proc.evolucoes.filter((e) => e.id !== eid);
    return true;
  });
}

// Encerra o processo atual (se houver) e abre um novo.
export async function novoProcesso(loja, cid, { titulo = "" } = {}) {
  const hoje = agoraLocal().data;
  return mudar(loja, cid, (p) => {
    const atual = aberto(p);
    if (atual && !atual.evolucoes.length) throw new Erro("O processo atual ainda não tem evoluções.");
    if (atual) atual.fim = hoje;
    const proc = { id: novoId(8), numero: p.processos.length + 1, titulo: String(titulo).trim().slice(0, 120), inicio: hoje, fim: null, evolucoes: [] };
    p.processos.push(proc);
    return proc;
  });
}

export async function temProntuario(loja, cid) {
  return !!(await ler(loja, chaveP(cid))).dado;
}
export const excluirProntuario = (loja, cid) => loja.delete(chaveP(cid));
