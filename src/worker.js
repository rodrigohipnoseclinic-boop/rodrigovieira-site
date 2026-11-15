// Worker do site: serve os arquivos estáticos (dist) e o contador de visitas.
// POST /api/visitas  { p: "/caminho/", nova: true }  -> soma uma visita
// GET  /api/visitas                                   -> últimos 90 dias
const FUSO = "America/Sao_Paulo";
const hoje = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: FUSO }); // AAAA-MM-DD
const ROBO = /bot|crawl|spider|slurp|preview|lighthouse|headless/i;

async function registrar(req, env) {
  if (ROBO.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
  let corpo = {};
  try { corpo = await req.json(); } catch {}
  const pagina = String(corpo.p || "/").slice(0, 200).replace(/[?#].*$/, "") || "/";
  if (pagina.startsWith("/admin") || pagina.startsWith("/visitas")) return new Response(null, { status: 204 });
  const dia = hoje();
  await env.visitas.batch([
    env.visitas.prepare(
      "INSERT INTO dias (dia, vis, pes) VALUES (?1, 1, ?2) ON CONFLICT(dia) DO UPDATE SET vis = vis + 1, pes = pes + ?2",
    ).bind(dia, corpo.nova ? 1 : 0),
    env.visitas.prepare(
      "INSERT INTO paginas (dia, pagina, vis) VALUES (?1, ?2, 1) ON CONFLICT(dia, pagina) DO UPDATE SET vis = vis + 1",
    ).bind(dia, pagina),
  ]);
  return new Response(null, { status: 204 });
}

async function listar(env) {
  const dias = [];
  for (let i = 89; i >= 0; i--) dias.push(hoje(new Date(Date.now() - i * 864e5)));
  const inicio = dias[0];
  const [d, p] = await env.visitas.batch([
    env.visitas.prepare("SELECT dia, vis, pes FROM dias WHERE dia >= ?1").bind(inicio),
    env.visitas.prepare("SELECT dia, pagina, vis FROM paginas WHERE dia >= ?1").bind(inicio),
  ]);
  const porDia = {};
  for (const x of d.results) porDia[x.dia] = { vis: x.vis, pes: x.pes, pag: {} };
  for (const x of p.results) {
    if (!porDia[x.dia]) porDia[x.dia] = { vis: 0, pes: 0, pag: {} };
    porDia[x.dia].pag[x.pagina] = x.vis;
  }
  return Response.json(
    dias.map((dia) => ({ dia, ...(porDia[dia] || { vis: 0, pes: 0, pag: {} }) })),
    { headers: { "Cache-Control": "no-store" } },
  );
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/visitas") {
      if (req.method === "POST") return registrar(req, env);
      if (req.method === "GET") return listar(env);
      return new Response(null, { status: 405 });
    }
    return env.ASSETS.fetch(req);
  },
};
