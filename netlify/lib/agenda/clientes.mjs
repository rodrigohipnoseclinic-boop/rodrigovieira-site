// Cadastro do paciente com foto (selfie ou imagem enviada).
// A foto fica num armazenamento separado e só é vista pelo painel.
import crypto from "node:crypto";
import { atualizar, ler, listarChaves } from "./armazem.mjs";
import { Erro } from "./config.mjs";

export const idCliente = (email) => crypto.createHash("sha256").update(email).digest("hex").slice(0, 20);
const MAX_FOTO = 3 * 1024 * 1024;

export function validarDados({ nome, email, telefone }, { emailOpcional = false } = {}) {
  nome = String(nome || "").trim().replace(/\s+/g, " ").slice(0, 100);
  email = String(email || "").trim().toLowerCase().slice(0, 200);
  telefone = String(telefone || "").replace(/[^\d+]/g, "").slice(0, 20);
  if (nome.length < 3) throw new Erro("Informe o nome completo.");
  if (!(emailOpcional && !email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Erro("E-mail inválido.");
  if (telefone.replace(/\D/g, "").length < 10) throw new Erro("Informe o telefone com DDD.");
  return { nome, email, telefone };
}

// Aceita "data:image/jpeg;base64,..." (o navegador já reduz e converte para JPEG).
export function decodificarFoto(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!m) throw new Erro("Envie uma foto (selfie) para concluir o cadastro.");
  const buf = Buffer.from(m[1], "base64");
  if (buf.length < 2000 || buf.length > MAX_FOTO || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff)
    throw new Erro("A foto não pôde ser lida. Tente outra imagem.");
  return buf;
}

export async function salvarCliente(lojas, dados, foto, por) {
  const d = validarDados(dados, { emailOpcional: por !== "paciente" });
  const id = idCliente(d.email || d.telefone);
  const agora = new Date().toISOString();
  if (foto) await lojas.fotos.set(id, foto, { metadata: { enviada: agora } });
  return atualizar(lojas.dados, `cliente/${id}`, (c) => ({
    ...c, id, ...d,
    criado: c.criado || agora, atualizado: agora,
    foto: foto ? agora : c.foto || null,
    consentimento: c.consentimento || (por === "paciente" ? agora : null),
  }));
}

export async function anexarConsulta(loja, clienteId, consulta) {
  await atualizar(loja, `cliente/${clienteId}`, (c) => {
    if (!(c.consultas || []).includes(consulta.id)) c.consultas = [...(c.consultas || []), consulta.id].slice(-200);
    return c;
  });
}

export async function listarClientes(loja) {
  const chaves = await listarChaves(loja, "cliente/");
  const lista = await Promise.all(chaves.map(async (k) => (await ler(loja, k)).dado));
  return lista.filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

// LGPD: apaga cadastro e foto. As consultas antigas ficam só com o nome.
export async function excluirCliente(lojas, id) {
  const { dado } = await ler(lojas.dados, `cliente/${id}`);
  if (!dado) throw new Erro("Cliente não encontrado.", 404);
  for (const cid of dado.consultas || []) {
    const ref = (await ler(lojas.dados, `consulta/${cid}`)).dado;
    if (!ref) continue;
    await atualizar(lojas.dados, `dia/${ref.data}`, (dia) => {
      for (const c of dia.consultas || []) if (c.id === cid) c.cliente = { id: null, nome: c.cliente.nome, email: "", telefone: "" };
      return dia;
    });
  }
  await lojas.fotos.delete(id);
  await lojas.dados.delete(`cliente/${id}`);
}
