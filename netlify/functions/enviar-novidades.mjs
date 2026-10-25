// Roda sozinho a cada hora: quando aparece um post novo no site, manda por e-mail para todos os inscritos.
// Envia em lotes (o Netlify limita cada execução a 30 s); o que faltar segue na hora seguinte.
import { getStore } from "@netlify/blobs";
import { SITE, configurado, transporte, emailPost, remetente, linkCancelar } from "../lib/email.mjs";

const POR_EXECUCAO = 40;

export default async () => {
  const estadoLoja = getStore({ name: "envios", consistency: "strong" });
  const inscritos = getStore({ name: "inscritos", consistency: "strong" });

  const r = await fetch(`${SITE}/novidades.json`, { headers: { "Cache-Control": "no-cache" } });
  if (!r.ok) return console.error("novidades.json indisponível:", r.status);
  const posts = await r.json();

  let estado = await estadoLoja.get("estado", { type: "json" });
  if (!estado) {
    // Primeira vez: os posts que já existem não são enviados, só os próximos.
    await estadoLoja.setJSON("estado", { enviados: posts.map((p) => p.url), fila: [] });
    return console.log("Envio automático ativado.");
  }

  const novos = posts.filter((p) => !estado.enviados.includes(p.url));
  if (novos.length) {
    const { blobs } = await inscritos.list({ prefix: "pessoa/" });
    const ids = blobs.map((b) => b.key.slice("pessoa/".length));
    for (const p of novos.reverse()) estado.fila.push({ post: p, faltam: ids });
    estado.enviados.push(...novos.map((p) => p.url));
    await estadoLoja.setJSON("estado", estado);
  }

  if (!estado.fila.length || !configurado()) return;

  const t = transporte();
  let enviados = 0;
  try {
    while (estado.fila.length && enviados < POR_EXECUCAO) {
      const item = estado.fila[0];
      const id = item.faltam.shift();
      if (id === undefined) { estado.fila.shift(); continue; }
      const pessoa = await inscritos.get(`pessoa/${id}`, { type: "json" });
      if (!pessoa) continue; // cancelou a inscrição
      const m = emailPost(item.post, pessoa.nome, linkCancelar(id, pessoa.token));
      try {
        await t.sendMail({ from: remetente(), to: pessoa.email, subject: m.assunto, html: m.html, text: m.texto });
      } catch (e) {
        console.error(`Falha ao enviar para ${id}:`, e.message);
        if (/Invalid login|auth/i.test(e.message)) { item.faltam.unshift(id); break; }
      }
      enviados++;
    }
  } finally {
    t.close();
    await estadoLoja.setJSON("estado", estado);
  }
  console.log(`E-mails enviados nesta execução: ${enviados}`);
};

export const config = { schedule: "@hourly" };
