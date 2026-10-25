// Gera o site estático em /dist a partir de /content e /static.
// Não depende de nenhum pacote externo: o Netlify só roda "node build.mjs".
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { marked } from "./lib/marked.esm.js";

const require = createRequire(import.meta.url);
const yaml = require("./lib/js-yaml.cjs");

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, "dist");
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const site = readJSON("content/config/site.json");
const home = readJSON("content/config/home.json");

// ---------- utilidades ----------
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slugify = (s = "") =>
  String(s)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const fmtData = (d) => `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
const isoData = (d) => d.toISOString().slice(0, 10);

const waLink = (msg = site.mensagem_whatsapp) =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;

const abs = (u = "") => (u.startsWith("http") ? u : site.url.replace(/\/$/, "") + u);

const paragrafos = (txt = "") =>
  String(txt).split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join("");

// ---------- ícones ----------
const ICONES = {
  onda: '<path d="M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".5"/><path d="M3 7c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".5"/>',
  coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8 11h2l1-2 2 4 1-2h2"/>',
  folha: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19 13 11"/>',
  ciclo: '<path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18 3v4h-4"/><path d="M6 21v-4h4"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  casal: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3.3 2.7-6 6-6 1.6 0 3 .6 4 1.6A5.6 5.6 0 0 1 16 14c3.3 0 6 2.7 6 6"/>',
  cerebro: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0V4z"/><path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z"/>',
  escudo: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  pino: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  tela: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="m10 8 4 2-4 2z"/>',
};
const icone = (nome, cls = "icone") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ICONES.folha}</svg>`;

const ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3z"/></svg>';
const ICON_IG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';

// ---------- posts ----------
function lerPosts() {
  const dir = path.join(ROOT, "content/posts");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      const fm = m ? yaml.load(m[1]) || {} : {};
      const body = m ? m[2] : raw;
      const slug = fm.slug ? slugify(fm.slug) : f.replace(/\.md$/, "");
      const data = fm.data ? new Date(fm.data) : fs.statSync(path.join(dir, f)).mtime;
      return { ...fm, slug, data, body, url: `/blog/${slug}/` };
    })
    .filter((p) => !p.rascunho && p.data <= new Date())
    .sort((a, b) => b.data - a.data);
}

// Links de vídeo sozinhos numa linha viram vídeo incorporado
function videoEmbed(url = "") {
  url = String(url).trim();
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="Vídeo" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) return `<div class="video"><iframe src="https://player.vimeo.com/video/${m[1]}" title="Vídeo" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
  m = url.match(/instagram\.com\/(?:reel|reels|p)\/([\w-]+)/);
  if (m) return `<div class="video video--insta"><iframe src="https://www.instagram.com/p/${m[1]}/embed" title="Vídeo do Instagram" loading="lazy" allowfullscreen scrolling="no"></iframe></div>`;
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return `<div class="video video--arquivo"><video src="${esc(url)}" controls preload="metadata" playsinline></video></div>`;
  return "";
}

function renderMarkdown(md) {
  const toc = [];
  const usados = {};
  const src = md.replace(/^[ \t]*(https?:\/\/\S+|\/img\/\S+\.(?:mp4|webm))[ \t]*$/gim, (linha, url) => {
    const v = videoEmbed(url);
    return v ? `\n${v}\n` : linha;
  });
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth, text }) {
    const html = this.parser.parseInline(tokens);
    let id = slugify(text) || "secao";
    usados[id] = (usados[id] || 0) + 1;
    if (usados[id] > 1) id += "-" + usados[id];
    if (depth === 2) toc.push({ id, texto: html.replace(/<[^>]+>/g, "") });
    return `<h${depth} id="${id}">${html}</h${depth}>\n`;
  };
  renderer.image = function ({ href, title, text }) {
    const cap = title ? `<figcaption>${esc(title)}</figcaption>` : "";
    return `<figure><img src="${esc(href)}" alt="${esc(text)}" loading="lazy">${cap}</figure>`;
  };
  renderer.link = function ({ href, title, tokens }) {
    const txt = this.parser.parseInline(tokens);
    const ext = /^https?:\/\//.test(href) && !href.includes("rodrigovieiraterapeuta.com.br");
    return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ""}${ext ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`;
  };
  const html = marked.parse(src, { renderer, gfm: true, breaks: false });
  const palavras = md.replace(/[#*_>`\[\]()!-]/g, " ").split(/\s+/).filter(Boolean).length;
  return { html, toc, minutos: Math.max(1, Math.round(palavras / 200)) };
}

function relacionados(post, todos, n = 3) {
  const tags = new Set(post.tags || []);
  return todos
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      let s = 0;
      if (p.categoria && p.categoria === post.categoria) s += 3;
      (p.tags || []).forEach((t) => tags.has(t) && (s += 1));
      return { p, s };
    })
    .sort((a, b) => b.s - a.s || b.p.data - a.p.data)
    .slice(0, n)
    .map((x) => x.p);
}

// ---------- layout ----------
const c = site.cores;
const cssVars = `:root{--c-principal:${c.principal};--c-principal-escura:${c.principal_escura};--c-destaque:${c.destaque};--c-fundo:${c.fundo};--c-fundo-alt:${c.fundo_alternativo};--c-texto:${c.texto};}`;

const NAV = [
  ["/#para-quem", "Para quem é"],
  ["/#sobre", "Sobre"],
  ["/#tratamento", "Tratamento"],
  ["/blog/", "Blog"],
  ["/#duvidas", "Dúvidas"],
  ["/inscreva-se/", "Inscreva-se"],
];


function layout({ titulo, descricao, url, imagem, conteudo, corpoClasse = "", jsonld = "", tipo = "website", extraHead = "", scripts = "" }) {
  const tituloCompleto = titulo ? `${titulo} | ${site.nome}` : `${site.nome} | ${site.titulo_profissional}`;
  const desc = descricao || site.descricao_seo;
  const img = abs(imagem || site.imagem_compartilhamento);
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${abs(url)}">
<meta property="og:type" content="${tipo}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(site.nome)}">
<meta property="og:title" content="${esc(titulo || site.nome)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${abs(url)}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${c.fundo}">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css?v=${Date.now().toString(36)}">
<style>${cssVars}</style>
${jsonld ? `<script type="application/ld+json">${jsonld}</script>` : ""}
${extraHead}
</head>
<body class="${corpoClasse}">
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<header class="topo" id="topo">
  <div class="topo__in">
    <a class="marca" href="/" aria-label="${esc(site.nome)}, página inicial">
      <svg class="marca__simbolo" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 24c4-6 8-6 12 0s8 6 12 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="20" cy="13" r="3" fill="currentColor"/></svg>
      <span class="marca__txt"><strong>${esc(site.nome)}</strong><small>${esc(site.titulo_profissional)}</small></span>
    </a>
    <button class="menu-btn" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu"><span></span><span></span><span></span></button>
    <nav class="menu" id="menu" aria-label="Principal">
      ${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}
      <a class="btn btn--peq" href="${waLink()}" target="_blank" rel="noopener">${ICON_WA}Agendar avaliação</a>
    </nav>
  </div>
</header>
<main id="conteudo">
${conteudo}
</main>
<footer class="rodape">
  <div class="rodape__in">
    <div class="rodape__col">
      <p class="rodape__nome">${esc(site.nome)}</p>
      <p>${esc(site.titulo_profissional)}</p>
      <p>Atendimento presencial em ${esc(site.cidade)} e online.</p>
    </div>
    <div class="rodape__col">
      <p class="rodape__tit">Navegue</p>
      ${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}
    </div>
    <div class="rodape__col">
      <p class="rodape__tit">Contato</p>
      <a href="${waLink()}" target="_blank" rel="noopener">WhatsApp ${esc(site.whatsapp_exibicao)}</a>
      <a href="https://instagram.com/${esc(site.instagram)}" target="_blank" rel="noopener">Instagram @${esc(site.instagram)}</a>
      <a href="${esc(site.linktree)}" target="_blank" rel="noopener">Cursos online</a>
    </div>
  </div>
  <p class="rodape__aviso">Este site tem caráter informativo e não substitui avaliação médica ou psiquiátrica. Em caso de emergência, procure o serviço de saúde mais próximo ou ligue 192. Se precisar conversar, o CVV atende 24h pelo 188.</p>
  <p class="rodape__copy">© ${new Date().getFullYear()} ${esc(site.nome)}. Todos os direitos reservados.</p>
</footer>
<a class="wa-flutuante" href="${waLink()}" target="_blank" rel="noopener" aria-label="Conversar no WhatsApp">${ICON_WA}<span>Fale comigo</span></a>
<script src="/js/main.js" defer></script>
${scripts}
</body>
</html>`;
}

const cardPost = (p, nivel = "h3") => `
<article class="card-post">
  <a class="card-post__img" href="${p.url}" tabindex="-1" aria-hidden="true"><img src="${esc(p.capa || "/img/capas/padrao.svg")}" alt="" loading="lazy"></a>
  <div class="card-post__txt">
    ${p.categoria ? `<span class="etiqueta">${esc(p.categoria)}</span>` : ""}
    <${nivel}><a href="${p.url}">${esc(p.titulo)}</a></${nivel}>
    <p>${esc(p.resumo || "")}</p>
    <span class="card-post__meta">${p.video ? "Vídeo · " : ""}${p.minutos} min de leitura</span>
  </div>
</article>`;

// ---------- páginas ----------
// Destaca *trecho* em itálico colorido (como na landing page)
const enfase = (s = "") => esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>");

function paginaInicial(posts) {
  const h = home;
  const recentes = posts.slice(0, 3);
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: site.nome,
    description: site.descricao_seo,
    url: site.url,
    image: abs(site.imagem_compartilhamento),
    telephone: "+" + site.whatsapp,
    areaServed: site.regiao,
    address: { "@type": "PostalAddress", addressLocality: "Amparo", addressRegion: "SP", addressCountry: "BR" },
    sameAs: [`https://instagram.com/${site.instagram}`],
  });
  const iniciais = (h.depoimentos?.itens || []).slice(0, 5).map((d) => `<span>${esc(d.nome[0])}</span>`).join("");
  const estrelas = '<span class="estrelas" aria-label="5 estrelas">★★★★★</span>';
  const temas = (h.temas || []).map((t) => `<span>${esc(t)}</span><i aria-hidden="true">•</i>`).join("");

  const conteudo = `
<section class="hero">
  <div class="hero__in">
    <div class="hero__txt">
      <span class="selo">${icone("pino", "selo__ic")}${esc(h.hero.selo)}</span>
      <h1>${enfase(h.hero.titulo)}</h1>
      <p class="hero__sub">${esc(h.hero.subtitulo)}</p>
      <div class="acoes">
        <a class="btn" href="${waLink()}" target="_blank" rel="noopener">${ICON_WA}${esc(h.hero.botao)}</a>
        <a class="btn btn--linha" href="#tratamento">${esc(h.hero.botao_secundario)}</a>
      </div>
      ${h.hero.prova ? `<div class="prova"><div class="prova__av">${iniciais}</div><div>${estrelas}<small>${esc(h.hero.prova)}</small></div></div>` : ""}
    </div>
    <div class="hero__foto">
      <span class="hx-ring" aria-hidden="true"></span><span class="hx-ring d2" aria-hidden="true"></span><span class="hx-ring d3" aria-hidden="true"></span>
      <div class="hero__moldura"><img src="${esc(h.hero.foto)}" alt="${esc(site.nome)} em seu consultório" fetchpriority="high"></div>
      ${h.hero.selo_foto ? `<div class="hero__cartao">${icone("folha")}<span><strong>${esc(h.hero.selo_foto)}</strong>${esc(site.regiao)}</span></div>` : ""}
    </div>
  </div>
  <ul class="destaques">
    ${h.destaques.map((d) => `<li><strong>${esc(d.numero)}</strong><span>${esc(d.texto)}</span></li>`).join("")}
  </ul>
</section>

${temas ? `<div class="faixa-temas" aria-label="Temas tratados"><div class="faixa-temas__trilho">${temas}${temas}</div></div>` : ""}

<section class="secao" id="para-quem">
  <div class="secao__cab">
    <span class="sobretitulo">Você se reconhece?</span>
    <h2>${enfase(h.para_quem.titulo)}</h2>
    <p>${esc(h.para_quem.intro)}</p>
  </div>
  <div class="grade grade--3">
    ${h.para_quem.itens.map((i) => `<div class="card">${icone(i.icone)}<h3>${esc(i.titulo)}</h3><p>${esc(i.texto)}</p></div>`).join("")}
  </div>
</section>

<section class="secao secao--alt" id="metodo">
  <div class="metodo">
    <div class="metodo__cerebro">
      <div class="metodo__halo" aria-hidden="true"></div>
      <canvas data-cerebro role="img" aria-label="Ilustração em 3D de um cérebro formado por conexões neurais, girando lentamente"></canvas>
    </div>
    <div class="metodo__txt">
      <span class="sobretitulo">O método</span>
      <h2>${enfase(h.metodo.titulo)}</h2>
      ${paragrafos(h.metodo.texto)}
      ${h.metodo.link ? `<a class="link-seta" href="${esc(h.metodo.link)}">${esc(h.metodo.link_texto)} <span aria-hidden="true">→</span></a>` : ""}
    </div>
  </div>
</section>

<section class="secao" id="hipnose">
  <div class="hipnose">
    <div>
      <span class="sobretitulo">Hipnose clínica</span>
      <h2>${enfase(h.hipnose.titulo)}</h2>
      ${paragrafos(h.hipnose.texto)}
    </div>
    <ul class="mitos">
      ${h.hipnose.mitos.map((m) => `<li><p class="mitos__m">“${esc(m.mito)}”</p><p>${esc(m.verdade)}</p></li>`).join("")}
    </ul>
  </div>
</section>

<section class="secao secao--escura" id="tratamento">
  <div class="secao__cab">
    <span class="sobretitulo">Passo a passo</span>
    <h2>${enfase(h.como_funciona.titulo)}</h2>
    <p>${esc(h.como_funciona.intro)}</p>
  </div>
  <ol class="etapas">
    ${h.como_funciona.etapas.map((e, n) => `<li><span class="etapas__n">${String(n + 1).padStart(2, "0")}</span><h3>${esc(e.titulo)}</h3><p>${esc(e.texto)}</p></li>`).join("")}
  </ol>
  <div class="centro"><a class="btn btn--claro" href="${waLink()}" target="_blank" rel="noopener">${ICON_WA}Agendar minha avaliação</a></div>
</section>

<section class="secao" id="sobre">
  <div class="sobre">
    <div class="sobre__foto"><div class="arco arco--alt"><img src="${esc(h.sobre.foto)}" alt="${esc(h.sobre.subtitulo)}" loading="lazy"></div></div>
    <div class="sobre__txt">
      <span class="sobretitulo">${esc(h.sobre.titulo)}</span>
      <h2>${esc(h.sobre.subtitulo)}</h2>
      ${paragrafos(h.sobre.texto)}
      ${h.sobre.numeros ? `<ul class="numeros">${h.sobre.numeros.map((n) => `<li><strong>${esc(n.numero)}</strong><span>${esc(n.texto)}</span></li>`).join("")}</ul>` : ""}
      <ul class="selos">${h.sobre.formacoes.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <a class="btn" href="${waLink()}" target="_blank" rel="noopener">${ICON_WA}Conversar com o Dr. Rodrigo</a>
    </div>
  </div>
</section>

${h.depoimentos?.itens?.length ? `
<section class="secao secao--alt" id="depoimentos">
  <div class="secao__cab">
    <span class="sobretitulo">${estrelas} Google</span>
    <h2>${enfase(h.depoimentos.titulo)}</h2>
    <p>${esc(h.depoimentos.intro)}</p>
  </div>
  <div class="depoimentos">
    ${h.depoimentos.itens.map((d) => `<figure class="depo"><blockquote>${esc(d.texto)}</blockquote><figcaption><span class="depo__av">${esc(d.nome[0])}</span><span><strong>${esc(d.nome)}</strong>${estrelas} no Google</span></figcaption></figure>`).join("")}
  </div>
</section>` : ""}

<section class="secao" id="agendar">
  <div class="secao__cab"><span class="sobretitulo">Primeiro passo</span><h2>${enfase(h.consulta.titulo)}</h2><p>${esc(h.consulta.intro)}</p></div>
  <div class="consultas">
    <a class="consulta" href="${waLink("Olá, Dr. Rodrigo! Vim pelo site e gostaria de agendar uma consulta de avaliação ONLINE.")}" target="_blank" rel="noopener">
      <span class="etiqueta">Online</span>${icone("tela")}<h3>${esc(h.consulta.online_titulo)}</h3><p>${esc(h.consulta.online_texto)}</p><span class="consulta__acao">${ICON_WA}Agendar online</span>
    </a>
    <a class="consulta" href="${waLink("Olá, Dr. Rodrigo! Vim pelo site e gostaria de agendar uma consulta de avaliação PRESENCIAL em Amparo.")}" target="_blank" rel="noopener">
      <span class="etiqueta">Presencial</span>${icone("pino")}<h3>${esc(h.consulta.presencial_titulo)}</h3><p>${esc(h.consulta.presencial_texto)}</p><span class="consulta__acao">${ICON_WA}Agendar presencial</span>
    </a>
  </div>
</section>

${recentes.length ? `
<section class="secao secao--alt" id="blog">
  <div class="secao__cab secao__cab--linha">
    <div><span class="sobretitulo">Blog</span><h2>${enfase(h.blog.titulo)}</h2><p>${esc(h.blog.intro)}</p></div>
    <a class="btn btn--linha" href="/blog/">Ver todos os conteúdos</a>
  </div>
  <div class="grade grade--3">${recentes.map((p) => cardPost(p)).join("")}</div>
</section>` : ""}

<section class="secao">
  <div class="faixa-cursos">
    <div><span class="sobretitulo">Cursos online</span><h2>${enfase(h.cursos.titulo)}</h2><p>${esc(h.cursos.texto)}</p></div>
    <a class="btn btn--linha" href="${esc(h.cursos.link)}" target="_blank" rel="noopener">${esc(h.cursos.botao)}</a>
  </div>
</section>

<section class="secao secao--alt" id="duvidas">
  <div class="secao__cab"><span class="sobretitulo">Dúvidas</span><h2>${enfase(h.faq.titulo)}</h2></div>
  <div class="faq">
    ${h.faq.perguntas.map((q) => `<details><summary>${esc(q.pergunta)}</summary><div>${paragrafos(q.resposta)}</div></details>`).join("")}
  </div>
</section>

<section class="cta-final">
  <div class="cta-final__in">
    <div class="cta-final__txt">
      <h2>${enfase(h.cta_final.titulo)}</h2>
      <p>${esc(h.cta_final.texto)}</p>
      <div class="acoes">
        <a class="btn btn--claro" href="${waLink()}" target="_blank" rel="noopener">${ICON_WA}${esc(h.cta_final.botao)}</a>
        <a class="btn btn--vazado" href="https://instagram.com/${esc(site.instagram)}" target="_blank" rel="noopener">${ICON_IG}Seguir no Instagram</a>
      </div>
    </div>
    ${h.cta_final.foto ? `<div class="cta-final__foto"><img src="${esc(h.cta_final.foto)}" alt="${esc(site.nome)} sorrindo" loading="lazy"></div>` : ""}
  </div>
</section>`;
  return layout({ url: "/", conteudo, jsonld, corpoClasse: "pg-inicio", scripts: '<script src="/js/cerebro.js" defer></script>' });
}

function paginaBlog(posts) {
  const cats = [...new Set(posts.map((p) => p.categoria).filter(Boolean))];
  const conteudo = `
<section class="blog-topo">
  <span class="sobretitulo">Blog</span>
  <h1>${esc(home.blog.titulo)}</h1>
  <p>${esc(home.blog.intro)}</p>
  ${cats.length > 1 ? `<div class="filtros" role="group" aria-label="Filtrar por tema"><button class="ativo" data-filtro="">Todos</button>${cats.map((ct) => `<button data-filtro="${esc(ct)}">${esc(ct)}</button>`).join("")}</div>` : ""}
</section>
<section class="secao secao--blog">
  ${posts.length ? `<div class="grade grade--3 lista-posts">${posts.map((p) => `<div data-cat="${esc(p.categoria || "")}">${cardPost(p, "h2")}</div>`).join("")}</div>` : `<p class="centro">Os primeiros conteúdos chegam em breve.</p>`}
</section>`;
  return layout({ titulo: "Blog", descricao: home.blog.intro, url: "/blog/", conteudo, corpoClasse: "pg-blog" });
}

function paginaPost(p, todos) {
  const { html, toc } = p.render;
  const rel = relacionados(p, todos);
  const url = p.url;
  const shareTxt = encodeURIComponent(`${p.titulo} ${abs(url)}`);
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.titulo,
    description: p.resumo || "",
    image: abs(p.capa || "/img/capas/padrao.svg"),
    datePublished: isoData(p.data),
    dateModified: isoData(p.atualizado ? new Date(p.atualizado) : p.data),
    author: { "@type": "Person", name: site.autor.nome, url: site.url },
    mainEntityOfPage: abs(url),
  });
  const conteudo = `
<div class="progresso" aria-hidden="true"><span></span></div>
<article class="post">
  <header class="post__cab">
    <nav class="migalhas" aria-label="Você está em"><a href="/">Início</a><span>/</span><a href="/blog/">Blog</a>${p.categoria ? `<span>/</span><span>${esc(p.categoria)}</span>` : ""}</nav>
    <h1>${esc(p.titulo)}</h1>
    ${p.resumo ? `<p class="post__resumo">${esc(p.resumo)}</p>` : ""}
    <div class="post__meta">
      <img src="${esc(site.autor.foto)}" alt="" width="40" height="40">
      <span>Por <strong>${esc(site.autor.nome)}</strong></span>
      <span class="ponto">·</span><time datetime="${isoData(p.data)}">${fmtData(p.data)}</time>
      <span class="ponto">·</span><span>${p.minutos} min de leitura</span>
    </div>
  </header>
  ${p.capa ? `<figure class="post__capa"><img src="${esc(p.capa)}" alt="${esc(p.capa_descricao || p.titulo)}"></figure>` : ""}
  <div class="post__grade">
    <div class="post__corpo">
      ${p.video ? videoEmbed(p.video) : ""}
      ${toc.length > 1 ? `
      <details class="indice" open>
        <summary>Neste artigo</summary>
        <ol>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.texto)}</a></li>`).join("")}</ol>
      </details>` : ""}
      <div class="prosa">${html}</div>

      <div class="compartilhar">
        <span>Gostou? Compartilhe:</span>
        <a href="https://wa.me/?text=${shareTxt}" target="_blank" rel="noopener">WhatsApp</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(abs(url))}" target="_blank" rel="noopener">Facebook</a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(abs(url))}" target="_blank" rel="noopener">LinkedIn</a>
        <button type="button" data-copiar="${abs(url)}">Copiar link</button>
      </div>

      <aside class="convite">
        <div>
          <h2>Quer ajuda com isso?</h2>
          <p>Se você se reconheceu neste texto, o primeiro passo é uma conversa. Agende sua consulta de avaliação, presencial em ${esc(site.cidade)} ou online.</p>
        </div>
        <a class="btn btn--claro" href="${waLink(`Olá, Dr. Rodrigo! Li o artigo "${p.titulo}" no site e gostaria de agendar uma consulta de avaliação.`)}" target="_blank" rel="noopener">${ICON_WA}Agendar pelo WhatsApp</a>
      </aside>

      <aside class="autor">
        <img src="${esc(site.autor.foto)}" alt="${esc(site.autor.nome)}" width="96" height="96" loading="lazy">
        <div>
          <span class="sobretitulo">Sobre o autor</span>
          <p class="autor__nome">${esc(site.autor.nome)}</p>
          <p>${esc(site.autor.bio)}</p>
          <a href="https://instagram.com/${esc(site.instagram)}" target="_blank" rel="noopener">${ICON_IG}@${esc(site.instagram)}</a>
        </div>
      </aside>
    </div>
    ${toc.length > 1 ? `
    <aside class="post__lateral" aria-label="Índice">
      <div class="lateral-fixa">
        <p class="lateral-fixa__tit">Neste artigo</p>
        <ol>${toc.map((t) => `<li><a href="#${t.id}">${esc(t.texto)}</a></li>`).join("")}</ol>
        <a class="btn btn--peq" href="${waLink()}" target="_blank" rel="noopener">${ICON_WA}Agendar avaliação</a>
      </div>
    </aside>` : ""}
  </div>
</article>
${rel.length ? `
<section class="secao secao--alt">
  <div class="secao__cab"><span class="sobretitulo">Continue lendo</span><h2>Conteúdos relacionados</h2></div>
  <div class="grade grade--3">${rel.map((r) => cardPost(r)).join("")}</div>
</section>` : ""}`;
  return layout({ titulo: p.titulo, descricao: p.resumo, url, imagem: p.capa, conteudo, jsonld, tipo: "article", corpoClasse: "pg-post" });
}

function pagina404() {
  return layout({
    titulo: "Página não encontrada",
    url: "/404.html",
    conteudo: `<section class="blog-topo"><span class="sobretitulo">Erro 404</span><h1>Esta página não foi encontrada</h1><p>Talvez o endereço tenha mudado. Que tal voltar ao início ou ler os conteúdos do blog?</p><div class="acoes acoes--centro"><a class="btn" href="/">Ir para o início</a><a class="btn btn--linha" href="/blog/">Ver o blog</a></div></section>`,
  });
}

function paginaInscricao() {
  return layout({
    titulo: "Inscreva-se",
    descricao: "Receba por e-mail os novos conteúdos sobre ansiedade, hipnose clínica e regulação emocional do Dr. Rodrigo Vieira.",
    url: "/inscreva-se/",
    corpoClasse: "pg-inscricao",
    conteudo: `<section class="blog-topo">
  <span class="sobretitulo">Inscreva-se</span>
  <h1>Receba os novos conteúdos</h1>
  <p>Deixe seu nome e e-mail e receba cada novo post sobre ansiedade, hipnose clínica e regulação emocional direto na sua caixa de entrada.</p>
</section>
<section class="secao secao--inscricao">
  <form class="form-inscricao" name="inscricao" method="POST" action="/inscreva-se/obrigado/" data-netlify="true" netlify-honeypot="sobrenome">
    <input type="hidden" name="form-name" value="inscricao">
    <p class="escondido"><label>Não preencha: <input name="sobrenome"></label></p>
    <label>Nome<input type="text" name="nome" autocomplete="name" required></label>
    <label>E-mail<input type="email" name="email" autocomplete="email" required></label>
    <label>WhatsApp <small>(opcional)</small><input type="tel" name="whatsapp" autocomplete="tel"></label>
    <label class="form-inscricao__ok"><input type="checkbox" name="autorizo" value="sim" required> Autorizo receber conteúdos do ${esc(site.nome)}. Posso cancelar quando quiser.</label>
    <button class="btn" type="submit">Quero me inscrever</button>
  </form>
</section>`,
  });
}

function paginaObrigado() {
  return layout({
    titulo: "Inscrição confirmada",
    url: "/inscreva-se/obrigado/",
    extraHead: '<meta name="robots" content="noindex">',
    conteudo: `<section class="blog-topo"><span class="sobretitulo">Tudo certo</span><h1>Obrigado pela inscrição!</h1><p>Você vai receber os próximos conteúdos no seu e-mail. Enquanto isso, que tal ler o blog?</p><div class="acoes acoes--centro"><a class="btn" href="/blog/">Ver o blog</a><a class="btn btn--linha" href="/">Ir para o início</a></div></section>`,
  });
}

// Painel de visitas (endereço não divulgado; os números vêm de /api/visitas)
function paginaVisitas() {
  return layout({
    titulo: "Visitas do site",
    url: "/visitas/",
    extraHead: '<meta name="robots" content="noindex">',
    conteudo: `<section class="blog-topo">
  <span class="sobretitulo">Painel</span>
  <h1>Visitas do site</h1>
  <p>Pessoas = visitantes diferentes no dia. Visualizações = páginas abertas.</p>
</section>
<section class="secao secao--visitas">
  <div class="visitas-num" id="v-num"><p class="centro">Carregando…</p></div>
  <h2>Pessoas por dia <small>(últimos 30 dias)</small></h2>
  <div class="visitas-graf" id="v-graf"></div>
  <h2>Páginas mais vistas <small>(últimos 30 dias)</small></h2>
  <ol class="visitas-pag" id="v-pag"></ol>
</section>
<script>
fetch("/api/visitas").then(function (r) { return r.json(); }).then(function (d) {
  function soma(n, k) { return d.slice(-n).reduce(function (t, x) { return t + x[k]; }, 0); }
  var blocos = [["Hoje", 1], ["7 dias", 7], ["30 dias", 30], ["90 dias", 90]];
  document.getElementById("v-num").innerHTML = blocos.map(function (b) {
    return '<div><span>' + b[0] + '</span><strong>' + soma(b[1], "pes") + '</strong><small>pessoas · ' + soma(b[1], "vis") + ' visualizações</small></div>';
  }).join("");
  var ult = d.slice(-30), max = Math.max.apply(null, ult.map(function (x) { return x.pes; }).concat(1));
  document.getElementById("v-graf").innerHTML = ult.map(function (x) {
    var dt = x.dia.split("-").reverse().slice(0, 2).join("/");
    return '<div title="' + dt + ': ' + x.pes + ' pessoas"><i style="height:' + (x.pes / max * 100) + '%"></i><span>' + dt + '</span></div>';
  }).join("");
  var pag = {};
  ult.forEach(function (x) { for (var k in x.pag) pag[k] = (pag[k] || 0) + x.pag[k]; });
  var lista = Object.keys(pag).sort(function (a, b) { return pag[b] - pag[a]; }).slice(0, 15);
  document.getElementById("v-pag").innerHTML = lista.length ? lista.map(function (k) {
    return '<li><a href="' + k.replace(/"/g, "") + '">' + (k === "/" ? "Página inicial" : k.replace(/</g, "&lt;")) + '</a><b>' + pag[k] + '</b></li>';
  }).join("") : "<li>Ainda sem visitas registradas.</li>";
}).catch(function () { document.getElementById("v-num").innerHTML = '<p class="centro">Não foi possível carregar os números agora.</p>'; });
</script>`,
  });
}

// ---------- gravação ----------
function gravar(rel, conteudo) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, conteudo);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, "static"), OUT, { recursive: true });

const posts = lerPosts();
posts.forEach((p) => {
  p.render = renderMarkdown(p.body);
  p.minutos = p.render.minutos;
});

gravar("index.html", paginaInicial(posts));
gravar("blog/index.html", paginaBlog(posts));
posts.forEach((p) => gravar(`blog/${p.slug}/index.html`, paginaPost(p, posts)));
gravar("inscreva-se/index.html", paginaInscricao());
gravar("inscreva-se/obrigado/index.html", paginaObrigado());
gravar("visitas/index.html", paginaVisitas());
gravar("404.html", pagina404());
// Lista de posts lida pelo envio automático de e-mails (netlify/functions/enviar-novidades.mjs)
gravar("novidades.json", JSON.stringify(posts.slice(0, 20).map((p) => ({ url: p.url, titulo: p.titulo, resumo: p.resumo || "", capa: p.capa || "" }))));

const urls = ["/", "/blog/", "/inscreva-se/", ...posts.map((p) => p.url)];
gravar("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${abs(u)}</loc></url>`).join("\n")}\n</urlset>\n`);
gravar("robots.txt", `User-agent: *\nDisallow: /admin/\nDisallow: /visitas/\nSitemap: ${abs("/sitemap.xml")}\n`);

console.log(`Site gerado: ${posts.length} post(s) publicados em /dist`);
