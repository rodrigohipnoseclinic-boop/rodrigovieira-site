// Link "Cancelar inscrição" dos e-mails.
import { getStore } from "@netlify/blobs";
import { SITE } from "../lib/email.mjs";

const pagina = (titulo, texto) => new Response(
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${titulo}</title><link rel="stylesheet" href="/css/style.css"></head>
<body><main><section class="blog-topo"><span class="sobretitulo">Inscrição</span><h1>${titulo}</h1><p>${texto}</p><div class="acoes acoes--centro"><a class="btn" href="${SITE}/">Ir para o site</a></div></section></main></body></html>`,
  { headers: { "Content-Type": "text/html; charset=utf-8" } },
);

export default async (req) => {
  const u = new URL(req.url);
  const id = (u.searchParams.get("id") || "").replace(/[^a-f0-9]/g, "");
  const t = u.searchParams.get("t") || "";
  const loja = getStore({ name: "inscritos", consistency: "strong" });
  const pessoa = id && (await loja.get(`pessoa/${id}`, { type: "json" }));
  if (pessoa && pessoa.token === t) {
    await loja.delete(`pessoa/${id}`);
    return pagina("Inscrição cancelada", "Você não vai mais receber nossos e-mails. Se mudar de ideia, é só se inscrever de novo no site.");
  }
  return pagina("Link inválido", "Esta inscrição já foi cancelada ou o link está incompleto.");
};

export const config = { path: "/api/cancelar" };
