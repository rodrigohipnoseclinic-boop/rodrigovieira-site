// Worker do site: serve os arquivos estáticos (dist) e o contador de visitas.
// POST /api/visitas  { p: "/caminho/", nova: true, r: "site.de.origem", u: "utm_source" }  -> soma uma visita
// GET  /api/visitas  (com senha)                                                          -> últimos 90 dias
// /visitas/          (com senha)                                                          -> painel
const FUSO = "America/Sao_Paulo";
const hoje = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: FUSO }); // AAAA-MM-DD
const ROBO = /bot|crawl|spider|slurp|preview|lighthouse|headless/i;

// ---------- senha do painel (Basic Auth; a senha fica no segredo VISITAS_SENHA) ----------
async function hash(s) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
async function autorizado(req, env) {
  if (!env.VISITAS_SENHA) return true; // sem senha cadastrada, o painel fica aberto
  const h = req.headers.get("Authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  let dec;
  try { dec = new TextDecoder().decode(Uint8Array.from(atob(h.slice(6)), (c) => c.charCodeAt(0))); } catch { return false; }
  const senha = dec.slice(dec.indexOf(":") + 1);
  const [a, b] = await Promise.all([hash(senha), hash(env.VISITAS_SENHA)]);
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0;
}
const pedirSenha = () =>
  new Response("Digite a senha para ver as visitas.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Visitas do site", charset="UTF-8"', "Cache-Control": "no-store" },
  });

// ---------- origem da visita ----------
const ORIGENS = [
  [/instagram\.com|^ig\./, "instagram"],
  [/facebook\.com|fb\.com|fb\.me|^m\.me$/, "facebook"],
  [/(^|\.)google\./, "google"],
  [/bing\.com/, "bing"],
  [/youtube\.com|youtu\.be/, "youtube"],
  [/tiktok\.com/, "tiktok"],
  [/whatsapp\.com|^wa\.me$/, "whatsapp"],
  [/(^|\.)t\.co$|twitter\.com|(^|\.)x\.com$/, "x (twitter)"],
  [/linktr\.ee/, "linktree"],
  [/duckduckgo|yahoo|ecosia/, "outros buscadores"],
];
function origem(r, u) {
  u = String(u || "").toLowerCase().replace(/[^a-z0-9._ -]/g, "").slice(0, 40);
  if (u) return u; // quem usa ?utm_source=... escolhe o nome
  r = String(r || "").toLowerCase().replace(/^www\./, "").slice(0, 80);
  if (!r) return "direto";
  for (const [re, nome] of ORIGENS) if (re.test(r)) return nome;
  return r;
}

// ---------- contagem ----------
async function registrar(req, env) {
  if (ROBO.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });
  let corpo = {};
  try { corpo = await req.json(); } catch {}
  const pagina = String(corpo.p || "/").slice(0, 200).replace(/[?#].*$/, "") || "/";
  if (pagina.startsWith("/admin") || pagina.startsWith("/visitas")) return new Response(null, { status: 204 });
  const dia = hoje();
  if (corpo.clique === "whatsapp") {
    await env.visitas.prepare(
      "INSERT INTO cliques (dia, pagina, cli) VALUES (?1, ?2, 1) ON CONFLICT(dia, pagina) DO UPDATE SET cli = cli + 1",
    ).bind(dia, pagina).run();
    return new Response(null, { status: 204 });
  }
  const lote = [
    env.visitas.prepare(
      "INSERT INTO dias (dia, vis, pes) VALUES (?1, 1, ?2) ON CONFLICT(dia) DO UPDATE SET vis = vis + 1, pes = pes + ?2",
    ).bind(dia, corpo.nova ? 1 : 0),
    env.visitas.prepare(
      "INSERT INTO paginas (dia, pagina, vis) VALUES (?1, ?2, 1) ON CONFLICT(dia, pagina) DO UPDATE SET vis = vis + 1",
    ).bind(dia, pagina),
  ];
  if (corpo.nova) {
    lote.push(
      env.visitas.prepare(
        "INSERT INTO origens (dia, origem, pes) VALUES (?1, ?2, 1) ON CONFLICT(dia, origem) DO UPDATE SET pes = pes + 1",
      ).bind(dia, origem(corpo.r, corpo.u)),
    );
  }
  await env.visitas.batch(lote);
  return new Response(null, { status: 204 });
}

async function listar(env) {
  const dias = [];
  for (let i = 89; i >= 0; i--) dias.push(hoje(new Date(Date.now() - i * 864e5)));
  const inicio = dias[0];
  const [d, p, o, c] = await env.visitas.batch([
    env.visitas.prepare("SELECT dia, vis, pes FROM dias WHERE dia >= ?1").bind(inicio),
    env.visitas.prepare("SELECT dia, pagina, vis FROM paginas WHERE dia >= ?1").bind(inicio),
    env.visitas.prepare("SELECT dia, origem, pes FROM origens WHERE dia >= ?1").bind(inicio),
    env.visitas.prepare("SELECT dia, pagina, cli FROM cliques WHERE dia >= ?1").bind(inicio),
  ]);
  const porDia = {};
  const novo = () => ({ vis: 0, pes: 0, pag: {}, ori: {}, cli: {} });
  for (const x of d.results) porDia[x.dia] = { ...novo(), vis: x.vis, pes: x.pes };
  for (const x of p.results) (porDia[x.dia] ||= novo()).pag[x.pagina] = x.vis;
  for (const x of o.results) (porDia[x.dia] ||= novo()).ori[x.origem] = x.pes;
  for (const x of c.results) (porDia[x.dia] ||= novo()).cli[x.pagina] = x.cli;
  return Response.json(
    dias.map((dia) => ({ dia, ...(porDia[dia] || novo()) })),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/visitas") {
      if (req.method === "POST") return registrar(req, env);
      if (req.method === "GET") return (await autorizado(req, env)) ? listar(env) : pedirSenha();
      return new Response(null, { status: 405 });
    }
    if (url.pathname === "/visitas" || url.pathname.startsWith("/visitas/")) {
      if (!(await autorizado(req, env))) return pedirSenha();
      const r = await env.ASSETS.fetch(req);
      const h = new Headers(r.headers);
      h.set("Cache-Control", "private, no-store");
      return new Response(r.body, { status: r.status, headers: h });
    }
    return env.ASSETS.fetch(req);
  },
};
