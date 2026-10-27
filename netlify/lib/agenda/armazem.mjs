// Acesso ao Netlify Blobs. As gravações que não podem se perder em acessos
// simultâneos usam escrita condicional (etag): se outra pessoa gravou antes,
// a operação relê o dado e tenta de novo.
import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";
import { PADRAO, Erro } from "./config.mjs";

let fabrica = () => ({
  dados: getStore({ name: "agenda", consistency: "strong" }),
  fotos: getStore({ name: "agenda-fotos", consistency: "strong" }),
});
export const lojas = () => fabrica();
// Só para testes locais: troca o Netlify Blobs por outro armazenamento.
export const usarLojas = (f) => { fabrica = f; };

export const novoId = (n = 10) => crypto.randomBytes(n).toString("base64url").replace(/[-_]/g, "").slice(0, n + 2);

export async function ler(loja, chave) {
  const r = await loja.getWithMetadata(chave, { type: "json" });
  return r ? { dado: r.data, etag: r.etag } : { dado: null, etag: null };
}

// Lê, aplica `mudar` e grava só se ninguém alterou no meio do caminho.
export async function atualizar(loja, chave, mudar, vazio = () => ({})) {
  for (let tentativa = 0; tentativa < 10; tentativa++) {
    const { dado, etag } = await ler(loja, chave);
    const novo = await mudar(dado ? structuredClone(dado) : vazio());
    const r = await loja.setJSON(chave, novo, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (r.modified) return novo;
  }
  throw new Erro("Muitas alterações ao mesmo tempo. Tente de novo.", 503);
}

export async function lerConfig(loja) {
  const { dado } = await ler(loja, "config");
  return dado || structuredClone(PADRAO);
}

export async function lerExcecoes(loja) {
  return (await ler(loja, "excecoes")).dado?.itens || [];
}

export async function lerDia(loja, data) {
  return (await ler(loja, `dia/${data}`)).dado?.consultas || [];
}

export async function listarChaves(loja, prefix) {
  const { blobs } = await loja.list({ prefix });
  return blobs.map((b) => b.key);
}

export async function registrarLog(loja, usuario, acao, detalhe = {}) {
  const quando = new Date().toISOString();
  try {
    await loja.setJSON(`log/${quando.slice(0, 7)}/${quando}-${novoId(4)}`, { quando, usuario, acao, detalhe });
  } catch (e) {
    console.error("Falha ao gravar log:", e.message);
  }
}
