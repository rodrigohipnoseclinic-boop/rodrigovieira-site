// Contador de visitas próprio: grava um resumo por dia no Netlify Blobs.
// POST /api/visitas  { p: "/caminho/", nova: true }  → soma uma visita
// GET  /api/visitas                                   → últimos 90 dias
import { getStore } from "@netlify/blobs";

const FUSO = "America/Sao_Paulo";
const hoje = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: FUSO }); // AAAA-MM-DD
const ROBO = /bot|crawl|spider|slurp|preview|lighthouse|headless/i;

async function somar(loja, chave, pagina, nova) {
  for (let i = 0; i < 6; i++) {
    const atual = await loja.getWithMetadata(chave, { type: "json" });
    const d = atual?.data || { vis: 0, pes: 0, pag: {} };
    d.vis += 1;
    if (nova) d.pes += 1;
    d.pag[pagina] = (d.pag[pagina] || 0) + 1;
    const r = await loja.setJSON(chave, d, atual ? { onlyIfMatch: atual.etag } : { onlyIfNew: true });
    if (r.modified) return;
  }
}

export default async (req) => {
  const loja = getStore({ name: "visitas", consistency: "strong" });

  if (req.method === "POST") {
    if (ROBO.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
    let corpo = {};
    try { corpo = await req.json(); } catch {}
    const pagina = String(corpo.p || "/").slice(0, 200).replace(/[?#].*$/, "") || "/";
    if (pagina.startsWith("/admin") || pagina.startsWith("/visitas")) return new Response(null, { status: 204 });
    await somar(loja, `dia/${hoje()}`, pagina, !!corpo.nova);
    return new Response(null, { status: 204 });
  }

  const dias = [];
  for (let i = 89; i >= 0; i--) dias.push(hoje(new Date(Date.now() - i * 864e5)));
  const dados = await Promise.all(dias.map((d) => loja.get(`dia/${d}`, { type: "json" })));
  return Response.json(
    dias.map((dia, i) => ({ dia, ...(dados[i] || { vis: 0, pes: 0, pag: {} }) })),
    { headers: { "Cache-Control": "no-store" } },
  );
};

export const config = { path: "/api/visitas" };
