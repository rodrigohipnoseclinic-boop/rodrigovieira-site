// Cenas em estilo mangá (v2): tinta preta, papel com grão, retícula (screentone) em degradê, linhas de foco e velocidade.
// Cada cena é uma página 600x900 com quadros. A câmera visita os quadros na ordem, enquanto a narração toca.
(() => {
const INK = "#14110f", PAPEL = "#fdfbf5";
let nid = 0; const U = () => "m" + (++nid);
const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 16807 + 11) % 2147483647) / 2147483647; };

const grao = (() => { const r = rng(77); return Array.from({ length: 70 }, () => `<circle cx="${(r() * 120).toFixed(1)}" cy="${(r() * 120).toFixed(1)}" r="${(.3 + r() * .7).toFixed(2)}" fill="#6b5a3a" opacity="${(.12 + r() * .25).toFixed(2)}"/>`).join(""); })();
const DEFS = `<defs>
<pattern id="tp1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1" fill="${INK}"/></pattern>
<pattern id="tp2" width="4.4" height="4.4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.2" cy="2.2" r="1.2" fill="${INK}"/></pattern>
<pattern id="tp3" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="1.7" cy="1.7" r="1.45" fill="${INK}"/></pattern>
<pattern id="tpw" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.3" fill="${PAPEL}"/></pattern>
<pattern id="hat" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V5" stroke="${INK}" stroke-width="1"/></pattern>
<pattern id="hat2" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 0V3" stroke="${INK}" stroke-width="1.1"/></pattern>
<pattern id="grao" width="120" height="120" patternUnits="userSpaceOnUse">${grao}</pattern>
</defs>`;

/* ---------- ferramentas de tinta ---------- */
// tom em degradê: a retícula some gradualmente de (x1,y1) para (x2,y2)
const tomGrad = (x, y, w, h, x1, y1, x2, y2, pat = "tp2", inv = false) => { const id = U();
  return `<defs><linearGradient id="g${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${inv ? "#000" : "#fff"}"/><stop offset="1" stop-color="${inv ? "#fff" : "#000"}"/></linearGradient><mask id="${id}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#g${id})"/></mask></defs><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${pat})" mask="url(#${id})"/>`; };
const foco = (cx, cy, r0, r1, n, seed, larg = .04, cor = INK) => { const r = rng(seed);
  return `<g class="m-foco" style="transform-origin:${cx}px ${cy}px">${Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n + r() * .1, w = larg * (.4 + r()), l = r1 * (.75 + .25 * r());
    return `<path d="M${cx + Math.cos(a - w) * l} ${cy + Math.sin(a - w) * l}L${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0}L${cx + Math.cos(a + w) * l} ${cy + Math.sin(a + w) * l}z" fill="${cor}"/>`; }).join("")}</g>`; };
const velo = (x0, x1, y0, y1, n, seed, cor = INK, dir = 1) => { const r = rng(seed);
  return Array.from({ length: n }, () => { const y = y0 + r() * (y1 - y0), x = x0 + r() * (x1 - x0), l = 50 + r() * 140, d = .35 + r() * .4;
    return `<path class="${dir > 0 ? "m-mv" : "m-mvr"}" style="animation-duration:${d}s;animation-delay:-${r() * d}s" d="M${x} ${y}h${l}" stroke="${cor}" stroke-width="${.8 + r() * 2.2}" stroke-linecap="round"/>`; }).join(""); };
const sol = (cx, cy, r) => `<g class="m-gira" style="transform-origin:${cx}px ${cy}px">${Array.from({ length: 28 }, (_, i) => { const a = i * Math.PI * 2 / 28, l = r * (i % 2 ? 1.7 : 2.4);
  return `<path d="M${cx + Math.cos(a) * r * 1.3} ${cy + Math.sin(a) * r * 1.3}L${cx + Math.cos(a) * l} ${cy + Math.sin(a) * l}" stroke="${INK}" stroke-width="${i % 2 ? 1.4 : 2.4}" stroke-linecap="round"/>`; }).join("")}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${PAPEL}" stroke="${INK}" stroke-width="3.5"/>`;
const nuv = (x, y, s = 1, tom = true) => { const c = [[-26, -2, 14], [-4, -10, 20], [22, -4, 16], [40, 4, 11]];
  return `<g class="m-deriva"><g transform="translate(${x} ${y}) scale(${s})"><g fill="${INK}">${c.map(([a, b, r]) => `<circle cx="${a}" cy="${b}" r="${r + 2.4 / s}"/>`).join("")}<ellipse cx="6" cy="6" rx="${48 + 2.4 / s}" ry="${10 + 2.4 / s}"/></g><g fill="${PAPEL}">${c.map(([a, b, r]) => `<circle cx="${a}" cy="${b}" r="${r}"/>`).join("")}<ellipse cx="6" cy="6" rx="48" ry="10"/></g>${tom ? `<path d="M-40 6Q-10 18 44 6Q40 12 6 16Q-30 14-40 6z" fill="url(#tp1)"/><path d="M-8 -22Q4 -26 14 -18M-30 -12Q-24 -17-16 -14" fill="none" stroke="${INK}" stroke-width="${1 / s + .5}"/>` : ""}</g></g>`; };
const sfx = (txt, x, y, tam, rot = 0, claro = false, skew = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) skewX(${skew})"><text class="m-sfx" text-anchor="middle" style="font:900 italic ${tam}px Impact,'Arial Black','Helvetica Neue',sans-serif;letter-spacing:2px" fill="${claro ? PAPEL : INK}" stroke="${claro ? INK : PAPEL}" stroke-width="${tam / 6}" paint-order="stroke" stroke-linejoin="round">${txt}</text></g>`;
const estrela = (x, y, s, cor = PAPEL) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="m-brilha" d="M0-12Q1.6-1.6 12 0Q1.6 1.6 0 12Q-1.6 1.6-12 0Q-1.6-1.6 0-12z" fill="${cor}" stroke="${INK}" stroke-width="1.2"/></g>`;
const balao = (x, y, w, h, txt, cx, cy) => {
  const tam = txt.length > 26 ? 17 : 19, cpl = Math.max(6, Math.floor(w * .72 / (tam * .54))), linhas = []; let at = "";
  txt.split(" ").forEach(p => { const t = at ? at + " " + p : p; if (t.length > cpl && at) { linhas.push(at); at = p; } else at = t; }); linhas.push(at);
  const H = Math.max(h, linhas.length * (tam + 5) + 30), ty = y + H / 2 - (linhas.length - 1) * (tam + 5) / 2 + 6;
  return `<g><path d="M${x + w * .28} ${y + H * .8}Q${(x + w * .3 + cx) / 2} ${(y + H + cy) / 2} ${cx} ${cy}Q${x + w * .44} ${y + H * .94} ${x + w * .5} ${y + H * .9}z" fill="${PAPEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="${x + w / 2}" cy="${y + H / 2}" rx="${w / 2}" ry="${H / 2}" fill="${PAPEL}" stroke="${INK}" stroke-width="3.4"/><path d="M${x + w * .3} ${y + H * .86}Q${x + w * .4} ${y + H * .94} ${x + w * .49} ${y + H * .9}" stroke="${PAPEL}" stroke-width="6" fill="none"/><text text-anchor="middle" style="font:800 ${tam}px 'Noto Sans','Hiragino Kaku Gothic ProN',system-ui,sans-serif" fill="${INK}">${linhas.map((l, i) => `<tspan x="${x + w / 2}" y="${ty + i * (tam + 5)}">${l}</tspan>`).join("")}</text></g>`; };
const gota = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" class="m-gota"><path d="M0 -14Q10 0 6 8Q0 14-6 8Q-10 0 0 -14z" fill="${PAPEL}" stroke="${INK}" stroke-width="2"/><path d="M-3 2Q-4 6-1 8" stroke="${INK}" stroke-width="1.4" fill="none"/></g>`;
const caixa = (x, y, w, txt) => `<g><rect x="${x}" y="${y}" width="${w}" height="28" fill="${PAPEL}" stroke="${INK}" stroke-width="2.6"/><text x="${x + w / 2}" y="${y + 19}" text-anchor="middle" style="font:800 13px 'Noto Sans',system-ui,sans-serif" fill="${INK}">${txt}</text></g>`;

/* ---------- personagens ---------- */
const sw = s => Math.max(1, 3.4 / s);
const costas = (x, y, s = 1, o = {}) => { const B = { baixo: [[-6, -26, -9, -13], [6, -26, 9, -13]], alto: [[-6, -26, -9, -13], [6, -26, 12, -44]], ambos: [[-6, -26, -12, -44], [6, -26, 12, -44]], reza: [[-6, -26, -3, -22], [6, -26, 3, -22]], frente: [[-6, -26, -9, -13], [6, -26, 22, -31]], crianca: [[-6, -26, -9, -13], [6, -26, 9, -13]] }[o.braco ?? "baixo"], w = sw(s);
  const braco = ([a, b, c, d]) => `<path d="M${a} ${b}L${c} ${d}" stroke="${INK}" stroke-width="${5.2 + w}" stroke-linecap="round"/><path d="M${a} ${b}L${c} ${d}" stroke="${PAPEL}" stroke-width="${5.2 - w * .4}" stroke-linecap="round"/><circle cx="${c}" cy="${d}" r="2.4" fill="${PAPEL}" stroke="${INK}" stroke-width="${w * .8}"/>`;
  const cajado = o.cajado ? (() => { const [, , hx, hy] = B[1]; return `<path d="M${hx} ${hy - 12}V${hy + 40}" stroke="${INK}" stroke-width="${2.6 + w}" stroke-linecap="round"/><path d="M${hx} ${hy - 12}V${hy + 40}" stroke="${PAPEL}" stroke-width="1" stroke-linecap="round"/>`; })() : "";
  const extra = o.braco === "crianca" ? `<circle cx="10" cy="-32" r="4" fill="${PAPEL}" stroke="${INK}" stroke-width="${w}"/><path d="M6 -29Q10 -22 14 -29z" fill="${INK}"/><path d="M6.2 -34Q10 -39 14 -34Q10 -36.5 6.2 -34z" fill="${INK}"/>` : "";
  const trouxa = o.trouxa ? `<g><path d="M-9 -41Q-10 -52 0 -53Q10 -52 9 -41Z" fill="${INK}" stroke="${INK}" stroke-width="${w}"/><path d="M-6 -46Q0 -49 6 -46" fill="none" stroke="${PAPEL}" stroke-width="${w * .6}"/></g>` : "";
  const cab = o.velho ? "#bdb7a8" : INK;
  return `<g transform="translate(${x} ${y}) scale(${s * (o.flip ? -1 : 1)} ${s})" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"><ellipse cy="1" rx="13" ry="2.6" fill="${INK}" stroke="none" opacity=".4"/><g class="${o.mov ? "m-anda" : ""}" style="${o.at ? `animation-delay:-${o.at}s` : ""}">
  <path d="M-9 -28Q-15 -12 -14 0H14Q15 -12 9 -28Z" fill="${PAPEL}"/><path d="M-9 -28Q-15 -12 -14 0H-3Q-4 -14 -9 -28Z" fill="url(#tp1)" stroke="none"/>
  <path d="M-7.5 -29Q-10.5 -12 -9.5 0H9.5Q10.5 -12 7.5 -29Q0 -32 -7.5 -29Z" fill="${o.robe ?? PAPEL}"/><path d="M2 -30Q4 -14 4 0H9.5Q10.5 -12 7.5 -29Z" fill="url(#tp2)" stroke="none"/>
  <path d="M-3 -25Q-2 -12 -4 -1M5 -22Q6 -10 5 -1" fill="none" stroke-width="${w * .7}"/><path d="M-8.6 -17Q0 -14.6 8.6 -17" fill="none"/>
  ${B.map(braco).join("")}${cajado}${extra}
  <rect x="-2.2" y="-32" width="4.4" height="4.6" fill="${PAPEL}" stroke-width="${w * .7}"/>
  <circle cy="-36" r="5.8" fill="${cab}"/><path d="M-3.4 -38.6Q0 -41 3.4 -38.6" fill="none" stroke="${PAPEL}" stroke-width="${w * .5}" opacity=".7"/>
  <path class="m-vento" d="M4 -40Q14 -39 18 -30Q10 -34 4 -33Z" fill="${cab}"/>${trouxa}</g></g>`; };
const sil = (x, y, s = 1, o = {}) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${INK}"><g class="${o.mov ? "m-anda" : ""}" style="${o.at ? `animation-delay:-${o.at}s` : ""}"><path d="M-8 -26Q-13 -12 -12 0H12Q13 -12 8 -26Q0 -30 -8 -26Z"/><circle cy="-33" r="5.4"/>${o.braco ? `<path d="M6 -24L11 -42M-6 -24L-11 -42" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` : ""}${o.cajado ? `<path d="M11 -40V4" stroke="${INK}" stroke-width="2.4"/>` : ""}</g></g>`;

// Moisés em pose heroica (visto de trás, de três quartos), manto ao vento. Origem nos pés, altura ~190 + cajado.
const moises = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="${3 / s}" stroke-linejoin="round" stroke-linecap="round">
  <ellipse cy="2" rx="46" ry="6" fill="${INK}" stroke="none" opacity=".35"/>
  <g class="m-manto"><path d="M-18 -118Q-70 -104 -112 -60Q-88 -70 -74 -34Q-60 -50 -44 -6Q-34 -20 -30 0L-40 0Q-38 -70 -18 -118z" fill="${PAPEL}"/>
    <path d="M-18 -118Q-70 -104 -112 -60Q-88 -70 -74 -34Q-60 -50 -44 -6L-30 -40Q-40 -80 -18 -118z" fill="url(#tp2)" stroke="none"/>
    <path d="M-30 -104Q-62 -86 -90 -58M-34 -84Q-58 -66 -70 -40M-34 -60Q-46 -40 -48 -14" fill="none" stroke-width="${1.6 / s}"/></g>
  <path d="M-22 -118Q-36 -70 -40 0L42 0Q36 -70 24 -116Q0 -128 -22 -118Z" fill="${PAPEL}"/>
  <path d="M-22 -118Q-36 -70 -40 0L-6 0Q-10 -70 -2 -120Z" fill="url(#tp1)" stroke="none"/><path d="M10 -120Q22 -70 22 0L42 0Q36 -70 24 -116Z" fill="url(#tp3)" stroke="none"/>
  <path d="M-14 -96Q-6 -50 -10 -2M6 -100Q14 -50 10 -2M22 -96Q28 -50 30 -2" fill="none" stroke-width="${1.5 / s}"/><path d="M-34 -64Q0 -52 38 -64" fill="none" stroke-width="${3.4 / s}"/>
  <path d="M-20 -112Q-36 -90 -32 -62L-18 -60Q-20 -88 -10 -108Z" fill="${PAPEL}"/><circle cx="-24" cy="-58" r="5" fill="${PAPEL}"/>
  <path d="M-24 -114Q-36 -132 -30 -148Q-24 -168 -4 -170Q16 -170 22 -154Q14 -160 8 -158Q4 -148 6 -140Q-6 -132 -8 -116Z" fill="${INK}"/>
  <g class="m-vento"><path d="M14 -150Q44 -156 70 -138Q46 -140 16 -134z" fill="${INK}"/><path d="M12 -140Q40 -138 58 -122Q38 -126 14 -126z" fill="${INK}"/><path d="M8 -156Q30 -170 52 -164Q32 -160 10 -148z" fill="${INK}"/></g>
  <path d="M8 -158Q22 -156 24 -144L30 -138L24 -135Q25 -128 20 -124L10 -121Q2 -126 4 -138z" fill="${PAPEL}"/><path d="M12 -146L21 -147M10 -152L23 -151" stroke="${INK}" stroke-width="3" fill="none"/><path d="M20 -126Q30 -112 18 -96Q6 -90 0 -104Q8 -108 10 -118Z" fill="${INK}"/><path d="M14 -116L20 -106M9 -110L13 -100M17 -112L22 -104" stroke="${PAPEL}" stroke-width="1.4"/>
  <path d="M20 -114Q36 -140 38 -172L58 -168Q54 -136 40 -106Z" fill="${PAPEL}"/><path d="M20 -114Q34 -140 38 -172L44 -170Q40 -138 28 -110Z" fill="url(#tp2)" stroke="none"/>
  <path d="M38 -172Q30 -186 46 -190Q62 -190 58 -168Z" fill="${PAPEL}"/><path d="M42 -176Q46 -182 52 -178M44 -183Q50 -188 56 -182" fill="none" stroke-width="${1.3 / s}"/>
  <circle cx="52" cy="-186" r="8" fill="${PAPEL}"/><path d="M46 -190v7M50 -193v8M54 -193v8M58 -190v7" stroke-width="${1.2 / s}"/>
  <path d="M52 -266V-60" stroke="${INK}" stroke-width="${6 / s}"/><path d="M52 -266V-60" stroke="${PAPEL}" stroke-width="${1.6 / s}"/><path d="M52 -266Q40 -274 48 -284Q58 -290 62 -280" fill="none" stroke="${INK}" stroke-width="${5 / s}"/></g>`;

/* ---------- cavalo e carro ---------- */
const FORMA_CAVALO = `<path d="M34 -78C14 -86 -18 -86 -34 -74C-46 -66 -46 -48 -36 -40C-22 -30 8 -34 22 -38C38 -40 46 -52 44 -64C42 -72 38 -76 34 -78Z"/>
  <path d="M34 -78C46 -92 56 -104 66 -112L80 -104C72 -92 64 -80 50 -64Z"/>
  <path d="M66 -112C72 -122 82 -122 90 -114L112 -88C116 -82 112 -76 106 -78L90 -82C80 -86 72 -96 66 -112Z"/>
  <path d="M74 -120L78 -135L85 -120Z"/><path d="M68 -118L68 -130L74 -118Z"/>
  <path d="M64 -112L52 -123L55 -108L40 -115L45 -98L28 -103L37 -86L22 -89L34 -78Z"/>
  <path d="M-44 -64C-64 -72 -86 -64 -98 -46C-90 -54 -78 -52 -70 -46C-80 -40 -90 -34 -94 -20C-78 -32 -66 -38 -52 -42Z"/>
  <path d="M24 -50L58 -38L52 -27L22 -38Z"/><path d="M54 -38L92 -31L90 -22L50 -28Z"/><path d="M90 -32L101 -28L99 -18L88 -22Z"/>
  <path d="M30 -46L54 -56L60 -47L34 -38Z"/><path d="M52 -54L66 -44L59 -34L46 -44Z"/><path d="M62 -42L72 -38L68 -29L58 -34Z"/>
  <path d="M-36 -48L-64 -30L-52 -21L-26 -38Z"/><path d="M-60 -31L-92 -27L-90 -17L-56 -20Z"/><path d="M-90 -28L-101 -25L-99 -14L-88 -17Z"/>
  <path d="M-22 -42L-36 -20L-26 -10L-12 -30Z"/><path d="M-34 -22L-48 -6L-40 0L-26 -14Z"/>`;
const cavalo = (x, y, s = 1, fase = 0) => `<g transform="translate(${x} ${y}) scale(${s})" stroke-linejoin="round"><g class="m-galope" style="animation-delay:-${fase}s">
  <g fill="${PAPEL}" stroke="${PAPEL}" stroke-width="7">${FORMA_CAVALO}</g><g fill="${INK}" stroke="${INK}" stroke-width="1">${FORMA_CAVALO}</g>
  <path d="M-28 -82C-8 -88 18 -86 32 -78" stroke="${PAPEL}" stroke-width="2" fill="none"/><path d="M-30 -42C-12 -34 14 -36 30 -42" stroke="${PAPEL}" stroke-width="1.3" fill="none" opacity=".8"/><path d="M30 -70C40 -62 40 -52 34 -44" stroke="${PAPEL}" stroke-width="1.3" fill="none" opacity=".8"/><path d="M60 -106C66 -98 72 -92 80 -88" stroke="${PAPEL}" stroke-width="1.2" fill="none" opacity=".8"/><circle cx="96" cy="-104" r="2" fill="${PAPEL}"/><path d="M110 -84l-3 -2" stroke="${PAPEL}" stroke-width="1.2"/></g></g>`;
const carro = (x, y, s = 1, fase = 0) => `<g transform="translate(${x} ${y}) scale(${s})">${cavalo(86, -6, .9, fase + .12)}${cavalo(20, 4, 1, fase)}
  <g fill="${INK}"><g fill="${PAPEL}" stroke="${PAPEL}" stroke-width="6"><path d="M-130 -34H-70L-64 -64Q-76 -64 -80 -50H-134z"/></g><path d="M-130 -34H-70L-64 -64Q-76 -64 -80 -50H-134z"/><path d="M-70 -34L-40 -52Q-20 -44 0 -54" fill="none" stroke="${INK}" stroke-width="5"/>
  <g transform="translate(-104 -34)"><path d="M-10 0Q-12 -34 -4 -52Q0 -66 8 -60Q16 -54 12 -36L10 0z"/><circle cx="0" cy="-70" r="8"/><path d="M-9 -72Q-12 -84 0 -88Q12 -84 9 -72Q0 -66-9 -72z"/><path d="M-9 -76L-17 -62 -9 -62z"/><path d="M8 -50L34 -66L40 -60L12 -42z"/><path d="M34 -66L46 -78" stroke="${INK}" stroke-width="2" fill="none"/></g></g>
  <g class="m-roda" style="transform-origin:-94px 6px"><circle cx="-94" cy="6" r="24" fill="${INK}"/><circle cx="-94" cy="6" r="18" fill="${PAPEL}"/>${[0, 30, 60, 90, 120, 150].map(a => `<path d="M-94 -12V24" stroke="${INK}" stroke-width="2" transform="rotate(${a} -94 6)"/>`).join("")}<circle cx="-94" cy="6" r="4" fill="${INK}"/></g></g>`;

/* ---------- olhos ---------- */
const olho = (cx, cy, w, flip = false) => `<g transform="translate(${cx} ${cy}) scale(${(flip ? -1 : 1) * w / 110} ${w / 110})">
  <path d="M-70 -50Q-8 -92 74 -48Q22 -64-64 -42z" fill="${INK}"/><path d="M-60 -30Q-30 -66 10 -62Q50 -56 68 -22" fill="none" stroke="${INK}" stroke-width="1.8"/>
  <path d="M-54 8Q-30 -38 10 -34Q44 -28 60 6Q30 3 4 4Q-24 6-54 8z" fill="${PAPEL}"/>
  <circle cx="8" cy="-8" r="25" fill="${INK}"/><circle cx="-2" cy="-18" r="9" fill="${PAPEL}"/><circle cx="18" cy="4" r="3.8" fill="${PAPEL}"/><circle cx="12" cy="-22" r="2.2" fill="${PAPEL}"/>
  ${Array.from({ length: 18 }, (_, i) => { const a = i * Math.PI * 2 / 18; return `<path d="M${8 + Math.cos(a) * 9} ${-8 + Math.sin(a) * 9}L${8 + Math.cos(a) * 22} ${-8 + Math.sin(a) * 22}" stroke="${PAPEL}" stroke-width=".9" opacity=".75"/>`; }).join("")}
  <path d="M-58 -2Q-30 -42 10 -36Q46 -32 66 0" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <path d="M-58 -2L-70 8M-46 -16L-60 -12M-30 -28L-42 -30M62 -2L74 6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M-50 12Q0 32 58 10" fill="none" stroke="${INK}" stroke-width="2.4"/>
  <path d="M-44 24l-10 8M-26 30l-8 10M-6 32l-4 10M14 31l2 10M34 26l8 9" stroke="${INK}" stroke-width="1.5"/></g>`;

/* ---------- quadros ---------- */
const P = (pts, conteudo, o = {}) => ({ pts, conteudo, ...o });
const box = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; };
const curl = (x, y, s = 1) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0Q6-20 28-18Q46-14 44 6Q36-8 26-4Q18 0 14 10Q8 6 0 0z" fill="${PAPEL}" stroke="${INK}" stroke-width="2"/>`;
const peixe = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0Q-2-9 10 0Q-2 9-14 0zM9 0L19-7V7z" fill="${INK}"/><circle cx="-8" cy="-1" r="1.2" fill="${PAPEL}"/></g>`;

/* ---------- biblioteca de elementos (cenas 2 a 10) ---------- */
const BX = pts => { const [x, y, w, h] = box(pts); return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, r: x + w, b: y + h }; };
const Q = (pts, fn, o = {}) => ({ pts, conteudo: fn(BX(pts)), ...o });
const LAY = {
  A: [[[24, 24], [576, 24], [576, 250], [24, 250]], [[24, 262], [346, 262], [330, 500], [24, 500]], [[358, 262], [576, 262], [576, 500], [342, 500]], [[24, 512], [270, 512], [270, 876], [24, 876]], [[282, 512], [576, 512], [576, 876], [282, 876]]],
  B: [[[24, 24], [300, 24], [284, 300], [24, 300]], [[312, 24], [576, 24], [576, 300], [296, 300]], [[24, 312], [576, 312], [576, 560], [24, 560]], [[24, 572], [330, 572], [314, 876], [24, 876]], [[342, 572], [576, 572], [576, 876], [326, 876]]],
  C: [[[24, 24], [576, 24], [576, 200], [24, 200]], [[24, 212], [576, 212], [576, 520], [24, 520]], [[24, 532], [212, 532], [196, 876], [24, 876]], [[224, 532], [400, 532], [384, 876], [208, 876]], [[412, 532], [576, 532], [576, 876], [396, 876]]]
};
const ceuNoite = (b, seed = 1, lua = false) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${INK}"/>${Array.from({ length: Math.round(b.w * b.h / 1800) }, (_, i) => { const r = rng(seed * 50 + i); return `<circle class="m-brilha" style="animation-delay:-${r() * 2}s" cx="${b.x + r() * b.w}" cy="${b.y + r() * b.h * .8}" r="${.7 + r() * 1.5}" fill="${PAPEL}"/>`; }).join("")}${lua ? `<circle cx="${b.x + b.w * .82}" cy="${b.y + b.h * .18}" r="${Math.min(b.w, b.h) * .09}" fill="${PAPEL}"/><circle cx="${b.x + b.w * .8}" cy="${b.y + b.h * .16}" r="${Math.min(b.w, b.h) * .025}" fill="#d9d4c4"/>` : ""}`;
const ceuDia = (b, seed = 1) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h * .6, 0, b.y, 0, b.y + b.h * .55, "tp1", false)}${nuv(b.x + b.w * .2, b.y + b.h * .2, Math.max(.7, b.w / 380))}${nuv(b.x + b.w * .72, b.y + b.h * .13, Math.max(.6, b.w / 480))}`;
const terreno = (b, v, tom = "tp2", seed = 3) => { const y = b.y + b.h * v, r = rng(seed); let d = `M${b.x - 10} ${y}`; for (let i = 1; i <= 6; i++) d += `Q${b.x + b.w * (i - .5) / 6} ${y - 8 - r() * 16} ${b.x + b.w * i / 6 + 10} ${y - r() * 8}`; return `<path d="${d}V${b.b + 10}H${b.x - 10}Z" fill="url(#${tom})" stroke="${INK}" stroke-width="3"/>`; };
const colinas = (b, v, alt, seed = 5, cor = PAPEL) => { const r = rng(seed), y = b.y + b.h * v; let d = `M${b.x - 10} ${y}`; for (let i = 1; i <= 5; i++) d += `Q${b.x + b.w * (i - .5) / 5} ${y - alt * (.5 + r())} ${b.x + b.w * i / 5} ${y - alt * .25 * r()}`; return `<path d="${d}L${b.r + 10} ${y + 40}V${b.b}H${b.x - 10}Z" fill="${cor}" stroke="${INK}" stroke-width="3"/><path d="${d}L${b.r + 10} ${y + 30}H${b.x - 10}Z" fill="url(#hat)" opacity=".5"/>`; };
const agua = (b, v, n = 6, cor = INK) => { const y0 = b.y + b.h * v, h = b.b - y0; return Array.from({ length: n }, (_, i) => { const y = y0 + h * (i + .5) / n, amp = 3 + i * 1.5; return `<path class="m-onda2" style="animation-delay:-${i * .5}s" d="M${b.x - 40} ${y}${Array.from({ length: Math.ceil(b.w / 40) + 3 }, (_, k) => `q10 ${k % 2 ? amp : -amp} 20 0`).join("")}" fill="none" stroke="${cor}" stroke-width="${1.4 + i * .25}"/>`; }).join(""); };
const relampago = (x, y, s = 1, cor = PAPEL) => `<g class="m-relamp" transform="translate(${x} ${y}) scale(${s})"><path d="M0 0L-20 50L-3 50L-30 112L10 58L-8 58L16 0Z" fill="${cor}" stroke="${cor === PAPEL ? INK : PAPEL}" stroke-width="2.4" stroke-linejoin="miter"/></g>`;
const chama = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="m-chama"><path d="M0 0C-28-10-36-42-14-64C-10-48 0-50 2-72C14-54 36-42 32-14C30-4 14 4 0 0Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M2-2C-12-8-14-26-6-40C-2-30 6-28 8-44C18-30 20-14 14-6Z" fill="${INK}"/><path d="M-6-12C-4-20 2-22 4-30" stroke="${PAPEL}" stroke-width="1.6" fill="none"/></g></g>`;
const asas = (x, y, s = 1) => { const asa = `<path d="M0 0C-30-42-84-46-118-10C-106-8-100-2-96 8C-90 0-82 4-78 14C-72 6-62 10-56 20C-48 12-38 18-32 26C-22 18-10 20 0 28Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/><path d="M-6 6C-30-28-62-34-98-12M-8 14C-34-14-60-18-84 0M-8 22C-28 4-46 4-62 14" fill="none" stroke="${INK}" stroke-width="1.5"/><path d="M0 0C-12-18-22-24-34-26C-30-12-20-2-10 8Z" fill="url(#tp2)"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><g class="m-asa-l">${asa}</g><g transform="scale(-1 1)" class="m-asa-r">${asa}</g></g>`; };
const anjo = (x, y, s = 1, o = {}) => `${o.luz === false ? "" : foco(x, y - 40 * s, 36 * s, 260 * s, 40, 21, .035, PAPEL)}<g class="m-flutua">${asas(x, y - 34 * s, s * 1.05)}${costas(x, y, s * 1.5, { braco: o.braco ?? "ambos", robe: PAPEL })}<circle cx="${x}" cy="${y - 36 * 1.5 * s}" r="${15 * s}" fill="none" stroke="${INK}" stroke-width="2.4"/></g>`;
const pomba = (x, y, s = 1, ramo = false) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="m-flutua">
  <g class="m-asa" opacity=".9"><path d="M0 -4C-2-30-24-54-54-52C-42-42-38-30-38-18C-30-24-22-22-18-12Z" fill="${PAPEL}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/></g>
  <path d="M-20 2L-58 -6L-50 3L-60 10L-20 8Z" fill="${PAPEL}" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><path d="M-20 2C-16-12 8-14 22-6C28-2 28 4 22 8C8 14-14 12-20 2Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-10 6C0 10 12 8 20 4" stroke="${INK}" stroke-width="1.2" fill="none"/>
  <circle cx="24" cy="-8" r="5.2" fill="${PAPEL}" stroke="${INK}" stroke-width="2.8"/><path d="M28-8L36-6 28-4Z" fill="${INK}"/><circle cx="25.5" cy="-9" r="1.1" fill="${INK}"/>
  <g class="m-asa"><path d="M-4 -6C-8-36-34-58-66-54C-52-46-46-34-44-22C-38-30-30-28-26-18C-20-26-12-22-8-12Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-8-12C-24-34-44-42-60-42M-10-6C-26-22-40-26-52-22" fill="none" stroke="${INK}" stroke-width="1.4"/></g>
  ${ramo ? `<path d="M30 0Q46 4 56 -6" stroke="${INK}" stroke-width="2.6" fill="none"/><path d="M40 2Q44-9 54-9Q52 1 40 2ZM50-2Q56-12 64-10Q60 0 50-2Z" fill="${PAPEL}" stroke="${INK}" stroke-width="1.6"/>` : ""}</g></g>`;
const barco = (x, y, s = 1, o = {}) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="${o.tomba ? "m-tomba" : "m-balanca"}"><path d="M-74 -14Q-66 24 -36 28H52Q78 24 88 -14Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M-74 -14Q-66 24 -36 28L-30 -14Z" fill="url(#tp2)"/><path d="M-66 -4H82M-56 8H70M-44 18H56" stroke="${INK}" stroke-width="1.6"/><path d="M-74 -14H88" stroke="${INK}" stroke-width="5.4"/><path d="M6 -14V-134" stroke="${INK}" stroke-width="6.4"/>
  ${o.vela === false ? "" : `<path d="M10 -130Q66 -98 68 -22H10Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M10 -130Q34 -98 32 -22H10Z" fill="url(#tp1)"/><path d="M20 -112Q50 -94 54 -34M36 -122Q62 -92 62 -28" stroke="${INK}" stroke-width="1.3" fill="none"/>`}</g></g>`;
const arca = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-130 -30Q-120 30 -70 34H80Q130 30 142 -30Z" fill="${PAPEL}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-130 -30Q-120 30 -70 34L-60 -30Z" fill="url(#tp2)"/><path d="M-118 -16H132M-104 -2H120M-88 12H104M-70 24H84" stroke="${INK}" stroke-width="1.6"/>
  <path d="M-70 -30V-92L2 -126 74 -92V-30Z" fill="${PAPEL}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M-70 -30V-92L2 -126V-30Z" fill="url(#tp1)"/><path d="M-86 -90L2 -134 90 -90" fill="none" stroke="${INK}" stroke-width="6"/><path d="M-50 -34V-88M-30 -34V-96M-10 -34V-112M16 -34V-112M36 -34V-96M56 -34V-88" stroke="${INK}" stroke-width="1.4"/><path d="M-14 -30V-68Q0 -80 14 -68V-30Z" fill="${INK}"/></g>`;
const camelo = (x, y, s = 1) => { const F = `<path d="M-30 -38C-30 -58-6 -60 6 -52C10 -64 22 -66 26 -54C32 -58 44 -54 44 -40C40 -30 4 -26-30 -38Z"/><path d="M28 -44C44 -60 46 -76 50 -90L62 -90C60 -66 52 -48 40 -34Z"/><path d="M48 -92C54 -102 70 -100 72 -92C74 -86 66 -84 60 -84Z"/><path d="M-22 -34V0M-8 -30V0M14 -30V0M32 -34V0" stroke-width="7" fill="none"/><path d="M-30 -42C-38 -38-40 -26-38 -16" stroke-width="3" fill="none"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke-linejoin="round" stroke-linecap="round"><g fill="${PAPEL}" stroke="${PAPEL}" stroke-width="6">${F}</g><g fill="${INK}" stroke="${INK}" stroke-width="1">${F}</g><circle cx="64" cy="-92" r="1.6" fill="${PAPEL}"/></g>`; };
const estrelaGrande = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="m-pulsa">${foco(0, 0, 18, 200, 40, 6, .05, PAPEL)}<path d="M0-60L9-16 60 0 9 16 0 60-9 16-60 0-9-16Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.4" stroke-linejoin="round"/><path d="M0-30L5-5 30 0 5 5 0 30-5 5-30 0-5-5Z" fill="${INK}"/><circle r="5" fill="${PAPEL}"/></g></g>`;
const casa = (x, y, w, h, luz = true) => `<g><path d="M${x} ${y}V${y - h}H${x + w}V${y}Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M${x + w * .55} ${y - h}H${x + w}V${y}H${x + w * .55}Z" fill="url(#tp2)"/><path d="M${x - 4} ${y - h}H${x + w + 4}" stroke="${INK}" stroke-width="5"/><rect x="${x + w * .16}" y="${y - h * .58}" width="${w * .22}" height="${h * .3}" fill="${luz ? PAPEL : INK}" stroke="${INK}" stroke-width="2.2"/>${luz ? `<path d="M${x + w * .16} ${y - h * .43}H${x + w * .38}M${x + w * .27} ${y - h * .58}V${y - h * .28}" stroke="${INK}" stroke-width="1.2"/>` : ""}<path d="M${x + w * .62} ${y}V${y - h * .4}Q${x + w * .72} ${y - h * .5} ${x + w * .82} ${y - h * .4}V${y}Z" fill="${INK}"/></g>`;
const manjedoura = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${foco(0, -40, 24, 240, 44, 9, .045)}<path d="M-56 -4L-40 28M56 -4L40 28M-44 -2L40 26M44 -2L-40 26" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M-66 -2L-54 -30H54L66 -2Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M-58 -10H58M-50 -20H50" stroke="${INK}" stroke-width="1.6"/>
  <path d="M-52 -30l8-14 8 14 8-16 8 16 8-14 8 14 8-16 8 16 8-14 8 14 8-16 8 16 8-14 8 14" fill="${PAPEL}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="6" cy="-44" rx="34" ry="13" fill="${PAPEL}" stroke="${INK}" stroke-width="3"/><path d="M-20 -40Q6 -32 38 -42Q30 -34 6 -32Q-14 -32-20 -40z" fill="url(#tp2)"/><circle cx="-30" cy="-50" r="11" fill="${PAPEL}" stroke="${INK}" stroke-width="3"/><path d="M-38 -54Q-30 -62 -22 -54" fill="none" stroke="${INK}" stroke-width="2.4"/><circle cx="-33" cy="-50" r="1.2" fill="${INK}"/><circle cx="-30" cy="-50" r="26" fill="none" stroke="${INK}" stroke-width="1.8" stroke-dasharray="3 5"/></g>`;
const escada = (x1, y1, x2, y2, n = 12) => { const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L * 22, ny = dx / L * 22; return `<g class="m-pulsa"><path d="M${x1 - nx} ${y1 - ny}L${x2 - nx} ${y2 - ny}M${x1 + nx} ${y1 + ny}L${x2 + nx} ${y2 + ny}" stroke="${PAPEL}" stroke-width="9" stroke-linecap="round"/><path d="M${x1 - nx} ${y1 - ny}L${x2 - nx} ${y2 - ny}M${x1 + nx} ${y1 + ny}L${x2 + nx} ${y2 + ny}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>${Array.from({ length: n }, (_, i) => { const t = (i + .5) / n; return `<path d="M${x1 + dx * t - nx} ${y1 + dy * t - ny}L${x1 + dx * t + nx} ${y1 + dy * t + ny}" stroke="${PAPEL}" stroke-width="6" stroke-linecap="round"/><path d="M${x1 + dx * t - nx} ${y1 + dy * t - ny}L${x1 + dx * t + nx} ${y1 + dy * t + ny}" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`; }).join("")}</g>`; };
const pao = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse rx="13" ry="8" fill="${PAPEL}" stroke="${INK}" stroke-width="2.6"/><ellipse cx="3" cy="3" rx="9" ry="4" fill="url(#tp2)"/><path d="M-7 -2Q-3-6 0-2M2 -2Q5-6 8-2" stroke="${INK}" stroke-width="1.4" fill="none"/></g>`;
const peixeM = (x, y, s = 1, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-16 0Q-2-11 12 0Q-2 11-16 0zM11 0L23-8V8z" fill="${PAPEL}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-6 -6Q0 0-6 6" stroke="${INK}" stroke-width="1.4" fill="none"/><circle cx="-10" cy="-1.5" r="1.4" fill="${INK}"/></g>`;
const cesto = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-20 -18H20L14 0H-14Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M-17 -11H17M-15 -5H15M-6 -18L-8 0M6 -18L8 0" stroke="${INK}" stroke-width="1.3"/>${pao(-8, -20, .55)}${pao(7, -21, .55)}${pao(0, -25, .5)}</g>`;
const muralha = (x, y, w, h, cai = false, seed = 7) => { let b = ""; const bw = 26, bh = 16, cols = Math.ceil(w / bw), rows = Math.ceil(h / bh), r = rng(seed);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const bx = x + i * bw + (j % 2) * 12 - 6, by = y - (j + 1) * bh, t = (i + j) % 4 === 0;
    b += `<rect ${cai ? `class="m-bloco" style="animation-delay:${(.3 + r() * 2.2).toFixed(2)}s;--rot:${Math.round((r() - .5) * 70)}deg;--dy:${Math.round(40 + r() * 70)}px" ` : ""}x="${bx}" y="${by}" width="${bw - 1.5}" height="${bh - 1.5}" rx="1.5" fill="${t ? "url(#tp2)" : PAPEL}" stroke="${INK}" stroke-width="1.8"/>`; }
  return b; };
const shofar = (x, y, s = 1, f = 1) => `<g transform="translate(${x} ${y}) scale(${s * f} ${s})"><path d="M0 0C20-6 40-24 50-50C54-62 64-72 76-76C68-60 66-44 60-30C48-4 24 12 0 12Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M0 0C20-6 40-24 50-50C54-62 64-72 76-76C70-64 66-58 62-50C50-20 24-4 0 2Z" fill="url(#tp2)"/><path d="M8 0C28-8 44-26 54-48M4 6C26-2 42-18 52-38" stroke="${INK}" stroke-width="1.4" fill="none"/><ellipse cx="78" cy="-78" rx="5" ry="9" transform="rotate(35 78 -78)" fill="${INK}"/></g>`;
const ondasSom = (x, y, f = 1, n = 4) => `<g>${Array.from({ length: n }, (_, i) => `<path class="m-ponda" style="animation-delay:${i * .35}s" d="M${x + f * (16 + i * 18)} ${y - 18 - i * 8}Q${x + f * (30 + i * 20)} ${y} ${x + f * (16 + i * 18)} ${y + 18 + i * 8}" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`).join("")}</g>`;
const pedraRolando = (x, y, r) => `<g transform="translate(${x} ${y})"><g class="m-pedra"><circle r="${r}" fill="${PAPEL}" stroke="${INK}" stroke-width="4"/><circle r="${r}" fill="url(#tp2)" opacity=".6"/><path d="M${-r * .6} ${-r * .3}Q${-r * .2} ${-r * .8} ${r * .5} ${-r * .6}" stroke="${INK}" stroke-width="2" fill="none"/><path d="M${-r * .3} ${r * .2}L${r * .1} ${r * .5}" stroke="${INK}" stroke-width="2"/></g></g>`;
const tumuloBoca = (b, aberto) => `<path d="M${b.x - 10} ${b.b + 10}V${b.y + b.h * .62}Q${b.x + b.w * .25} ${b.y + b.h * .3} ${b.x + b.w * .5} ${b.y + b.h * .36}Q${b.x + b.w * .8} ${b.y + b.h * .28} ${b.r + 10} ${b.y + b.h * .6}V${b.b + 10}Z" fill="${PAPEL}" stroke="${INK}" stroke-width="4"/><path d="M${b.x - 10} ${b.b + 10}V${b.y + b.h * .62}Q${b.x + b.w * .25} ${b.y + b.h * .3} ${b.x + b.w * .5} ${b.y + b.h * .36}Q${b.x + b.w * .8} ${b.y + b.h * .28} ${b.r + 10} ${b.y + b.h * .6}V${b.b + 10}Z" fill="url(#tp2)"/><path d="M${b.cx - Math.min(b.w * .2, 64)} ${b.b + 10}V${b.y + b.h * .66}Q${b.cx - Math.min(b.w * .2, 64)} ${b.y + b.h * .42} ${b.cx} ${b.y + b.h * .42}Q${b.cx + Math.min(b.w * .2, 64)} ${b.y + b.h * .42} ${b.cx + Math.min(b.w * .2, 64)} ${b.y + b.h * .66}V${b.b + 10}Z" fill="${aberto ? PAPEL : INK}" stroke="${INK}" stroke-width="4"/>`;
// herói de frente/perfil (Jesus): sem cajado, mão aberta; pao=true segura um pão no alto
const jesus = (x, y, s = 1, o = {}) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="${3 / s}" stroke-linejoin="round" stroke-linecap="round">
  <ellipse cy="2" rx="46" ry="6" fill="${INK}" stroke="none" opacity=".35"/>
  <g class="m-manto"><path d="M-18 -118Q-66 -100 -104 -56Q-84 -64 -70 -30Q-58 -46 -42 -4L-30 0L-40 0Q-38 -70 -18 -118z" fill="${PAPEL}"/><path d="M-18 -118Q-66 -100 -104 -56Q-84 -64 -70 -30Q-58 -46 -42 -4L-30 -40Q-40 -80 -18 -118z" fill="url(#tp2)" stroke="none"/><path d="M-30 -104Q-60 -86 -86 -58M-34 -84Q-56 -66 -66 -40" fill="none" stroke-width="${1.6 / s}"/></g>
  <path d="M-22 -118Q-36 -70 -40 0L42 0Q36 -70 24 -116Q0 -128 -22 -118Z" fill="${PAPEL}"/><path d="M-22 -118Q-36 -70 -40 0L-6 0Q-10 -70 -2 -120Z" fill="url(#tp1)" stroke="none"/><path d="M-14 -96Q-6 -50 -10 -2M6 -100Q14 -50 10 -2M22 -96Q28 -50 30 -2" fill="none" stroke-width="${1.5 / s}"/><path d="M-30 -66Q0 -54 34 -66" fill="none" stroke-width="${3 / s}"/>
  <path d="M-20 -112Q-36 -90 -32 -62L-18 -60Q-20 -88 -10 -108Z" fill="${PAPEL}"/><circle cx="-24" cy="-58" r="5" fill="${PAPEL}"/>
  <path d="M-24 -114Q-36 -132 -30 -148Q-24 -168 -4 -170Q16 -170 22 -154Q14 -160 8 -158Q4 -148 6 -140Q-6 -132 -8 -116Z" fill="${INK}"/><g class="m-vento"><path d="M14 -150Q40 -154 62 -138Q42 -140 16 -134z" fill="${INK}"/><path d="M12 -140Q36 -138 52 -124Q34 -128 14 -126z" fill="${INK}"/></g>
  <path d="M8 -158Q22 -156 24 -144L30 -138L24 -135Q25 -128 20 -124L10 -121Q2 -126 4 -138z" fill="${PAPEL}"/><path d="M12 -146L21 -147M10 -152L23 -151" stroke="${INK}" stroke-width="3" fill="none"/><path d="M20 -126Q30 -112 18 -96Q6 -90 0 -104Q8 -108 10 -118Z" fill="${INK}"/><path d="M14 -116L20 -106M9 -110L13 -100" stroke="${PAPEL}" stroke-width="1.4"/>
  <path d="M20 -114Q36 -140 40 -168L58 -164Q54 -134 40 -106Z" fill="${PAPEL}"/><path d="M20 -114Q34 -140 40 -168L46 -166Q42 -136 30 -110Z" fill="url(#tp2)" stroke="none"/>
  <path d="M40 -168Q34 -186 52 -188Q66 -186 58 -164Z" fill="${PAPEL}"/><path d="M44 -184v-12M50 -187v-14M56 -186v-13M61 -182v-11" stroke-width="${2.4 / s}"/>
  ${o.pao ? `<g transform="translate(52 -214)">${pao(0, 0, 1.6)}</g>` : ""}${o.halo === false ? "" : `<circle cx="-4" cy="-146" r="34" fill="none" stroke-width="${2 / s}" stroke-dasharray="${4 / s} ${6 / s}"/>`}</g>`;
const mulher = (x, y, s = 1, o = {}) => costas(x, y, s, { robe: PAPEL, ...o });
const bichoSil = (x, y, s = 1, t = 0) => t === 0 ? `<g transform="translate(${x} ${y}) scale(${s})" fill="${INK}"><ellipse cy="-14" rx="18" ry="9"/><path d="M12 -18Q22 -30 28 -34L32 -28Q26 -20 22 -12z"/><path d="M-12 -8V0M-4 -6V0M6 -6V0M14 -8V0" stroke="${INK}" stroke-width="4"/></g>` : `<g transform="translate(${x} ${y}) scale(${s})">${ovelha(0, 0, 1)}</g>`;
const ovelha = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-6 -4V0M6 -4V0" stroke="${INK}" stroke-width="3"/><g fill="${PAPEL}" stroke="${INK}" stroke-width="2"><circle cx="-8" cy="-12" r="7"/><circle cx="0" cy="-15" r="8"/><circle cx="8" cy="-12" r="7"/><ellipse cy="-8" rx="13" ry="7"/></g><ellipse cx="15" cy="-12" rx="4.4" ry="3.6" fill="${INK}"/></g>`;
const dormindo = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="${3 / s}" stroke-linejoin="round"><ellipse cy="2" rx="60" ry="6" fill="${INK}" stroke="none" opacity=".35"/><path d="M-56 0Q-58-26-26-28H40Q62-26 60 0Z" fill="${PAPEL}"/><path d="M-56 0Q-58-26-26-28H4Q-6-14-4 0Z" fill="url(#tp2)" stroke="none"/><path d="M-40-10Q0 0 50-10" fill="none"/><circle cx="-66" cy="-18" r="10" fill="${PAPEL}"/><path d="M-76-20Q-74-32-62-30Q-58-24-62-18Q-70-14-76-20Z" fill="${INK}"/><path d="M-70-16Q-66-14-62-16" fill="none"/><ellipse cx="-80" cy="-4" rx="12" ry="7" fill="url(#tp1)"/></g>`;
const sandalia = (x, y, s = 1, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0 0C-16-10-20-50-8-84C0-110 24-110 28-84C32-50 22-6 0 0Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round"/><path d="M0 0C-12-6-16-30-10-56L12-60C10-30 14-8 0 0Z" fill="url(#tp2)"/><path d="M-12-46Q10-64 30-46M-9-32Q10-48 26-32" stroke="${INK}" stroke-width="3" fill="none"/><path d="M10-98Q10-76 8-62" stroke="${INK}" stroke-width="3" fill="none"/></g>`;
const ZZ = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" style="font:900 italic 22px Impact,'Arial Black',sans-serif" fill="${PAPEL}" stroke="${INK}" stroke-width="3" paint-order="stroke"><text class="m-sfx">Z</text><text x="16" y="-14" class="m-sfx">Z</text><text x="34" y="-28" class="m-sfx">z</text></g>`;

const mar = {
  t: "O mar se abre", ref: "Êxodo 14",
  paineis: [
    // 0 · O êxodo (plano geral)
    P([[24, 24], [576, 24], [576, 250], [24, 250]], `<rect x="24" y="24" width="552" height="226" fill="${PAPEL}"/>
      ${tomGrad(24, 24, 552, 130, 0, 24, 0, 150, "tp1", false)}
      ${foco(470, 104, 46, 520, 54, 3, .03)}${sol(470, 104, 30)}
      <path d="M24 196L84 150 130 174 206 120 262 168 336 138 414 176 500 146 576 188V250H24Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3"/><path d="M206 120L262 168 336 138 414 176 340 206 206 206Z" fill="url(#hat)" opacity=".8"/><path d="M84 150L130 174 110 196 60 190Z" fill="url(#hat2)" opacity=".7"/>
      ${nuv(112, 66, 1.2)}${nuv(336, 50, .85)}${nuv(262, 100, .6)}
      <g class="m-pulsa"><path d="M150 214Q138 150 154 108 144 66 160 14L198 14Q210 66 196 108 212 150 198 214Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.4"/><path d="M162 56Q180 50 190 66M158 98Q182 90 194 106M156 138Q180 132 196 148M158 178Q180 170 196 186" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M150 214Q138 150 154 108 144 66 160 14L172 14Q158 66 168 108 156 150 168 214Z" fill="url(#tp1)"/></g>
      <path d="M24 214Q150 190 300 212T576 204V250H24Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3"/>
      <g class="m-marcha">${Array.from({ length: 16 }, (_, i) => sil(236 + i * 22 + (i % 3) * 4, 216 + (i % 2) * 5, .62 + (i % 3) * .05, { mov: true, at: i * .11, cajado: i % 4 === 0 })).join("")}</g>
      <g class="m-marcha">${costas(210, 296, 2.3, { cajado: true, mov: true, trouxa: true, velo: 1 })}${costas(318, 300, 2.5, { braco: "crianca", mov: true, at: .2 })}${costas(430, 298, 2.4, { cajado: true, mov: true, at: .4, velho: true })}${costas(528, 302, 2.6, { mov: true, at: .1, trouxa: true })}</g>
      ${sfx("ZAK ZAK ZAK", 130, 238, 22, -3, true)}`, { som: "marcha" }),
    // 1 · Os carros do faraó
    P([[24, 262], [346, 262], [330, 500], [24, 500]], `<rect x="24" y="262" width="322" height="238" fill="${PAPEL}"/><rect x="24" y="262" width="322" height="238" fill="url(#tp1)"/>
      ${tomGrad(24, 262, 322, 238, 0, 262, 0, 400, "tp3", true)}
      ${velo(24, 346, 276, 480, 20, 5)}
      ${nuv(60, 480, 2.8)}${nuv(176, 498, 3.2)}${nuv(296, 476, 2.4)}
      ${carro(94, 384, .42, .2)}${carro(158, 478, .86, 0)}
      <path d="M24 486H346" stroke="${INK}" stroke-width="4"/><rect x="24" y="486" width="322" height="14" fill="url(#tp3)"/>
      ${sfx("DADADADA", 134, 322, 48, -8, false, -8)}`, { som: "cavalos", tremor: true }),
    // 2 · Medo e coragem
    P([[358, 262], [576, 262], [576, 500], [342, 500]], `<rect x="342" y="262" width="234" height="238" fill="${PAPEL}"/>
      ${foco(462, 410, 50, 340, 64, 8, .035)}
      ${olho(404, 416, 118, false)}${olho(520, 416, 118, true)}
      <path d="M458 400Q470 450 460 492" fill="none" stroke="${INK}" stroke-width="2.6"/><path d="M450 440Q458 452 452 470" fill="none" stroke="${INK}" stroke-width="1.4"/>
      ${gota(380, 334, 1.1)}${gota(546, 344, .9)}
      ${balao(362, 268, 190, 62, "Não temais!", 430, 372)}
      ${sfx("TUM!", 548, 492, 28, 8)}`),
    // 3 · Moisés (quadro alto)
    P([[24, 512], [270, 512], [270, 876], [24, 876]], `<rect x="24" y="512" width="246" height="364" fill="${INK}"/>
      ${Array.from({ length: 60 }, (_, i) => { const r = rng(i + 4); return `<circle class="m-brilha" style="animation-delay:-${r() * 2}s" cx="${30 + r() * 236}" cy="${516 + r() * 220}" r="${.8 + r() * 1.5}" fill="${PAPEL}"/>`; }).join("")}
      <circle cx="214" cy="586" r="30" fill="${PAPEL}"/><circle cx="204" cy="578" r="8" fill="#d9d4c4"/><circle cx="224" cy="596" r="5" fill="#d9d4c4"/>
      ${velo(24, 270, 540, 860, 30, 9, PAPEL)}
      <circle cx="140" cy="690" r="120" fill="url(#tpw)" opacity=".5"/>
      ${moises(116, 866, 1.12)}
      <path d="M24 850Q100 832 160 846T270 838V876H24Z" fill="${PAPEL}"/>${[0, 1, 2].map(i => `<path class="m-onda2" style="animation-delay:-${i * .6}s" d="M${30 + i * 60} ${858 + i * 6}q14-8 28 0t28 0" fill="none" stroke="${INK}" stroke-width="2"/>`).join("")}
      ${sfx("GOOOOO", 126, 636, 36, -6, true)}`, { som: "gooo", tremor: true }),
    // 4 · A travessia (quadro grande)
    P([[282, 512], [576, 512], [576, 876], [282, 876]], `<rect x="282" y="512" width="294" height="364" fill="${PAPEL}"/>
      ${foco(430, 700, 16, 420, 90, 11, .028)}
      <path d="M282 512L402 590V740L282 876Z" fill="${PAPEL}"/><path d="M576 512L458 590V740L576 876Z" fill="${PAPEL}"/>
      <path d="M282 512L402 590V740L282 876Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3.6"/><path d="M576 512L458 590V740L576 876Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3.6"/>
      ${tomGrad(282, 512, 120, 364, 282, 560, 402, 700, "tp3", true)}${tomGrad(458, 512, 118, 364, 576, 560, 458, 700, "tp3", true)}
      <path d="M282 512L402 590V740L282 876Z" fill="url(#hat2)" opacity=".45"/><path d="M576 512L458 590V740L576 876Z" fill="url(#hat2)" opacity=".45"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<path class="m-onda2" style="animation-delay:-${i * .5}s" d="M${290 + i * 14} ${600 + i * 40}q10-8 20 0t20 0t20 0" fill="none" stroke="${PAPEL}" stroke-width="2"/><path class="m-onda2" style="animation-delay:-${i * .4}s" d="M${570 - i * 14} ${600 + i * 40}q-10-8-20 0t-20 0t-20 0" fill="none" stroke="${PAPEL}" stroke-width="2"/>`).join("")}
      ${curl(286, 536, .8)}${curl(330, 560, .7)}${curl(520, 540, .8)}${curl(470, 566, .7)}
      ${[[310, 640, 1.2], [350, 700, 1], [540, 650, 1.1], [500, 720, 1.3], [320, 790, 1.4], [550, 800, 1.2]].map(([x, y, s], i) => `<g class="m-nada" style="animation-delay:-${i}s">${peixe(x, y, s)}</g>`).join("")}
      <path d="M402 740L458 740 520 876H340Z" fill="${PAPEL}"/><path d="M402 740L458 740" stroke="${INK}" stroke-width="2"/>${brilhoCirc(430, 712)}
      <g class="m-marcha2">${Array.from({ length: 7 }, (_, i) => { const t = i / 7; return sil(430 + (i % 2 ? 9 : -9) * (1 - t) + (i % 3 - 1) * 4, 776 + (1 - t) * 0 + t * 0 + (6 - i) * 14 - 40, 1.2 * (1 - .6 * t) + .15, { mov: true, at: i * .15, cajado: i % 3 === 0 }); }).join("")}</g>
      ${costas(392, 884, 2.6, { mov: true, cajado: true, trouxa: true })}${costas(474, 888, 2.8, { braco: "crianca", mov: true, at: .3 })}
      ${sfx("ZAAAAAA", 424, 556, 26, -8)}`, { som: "agua" }),
    // 5 · Quadro sobreposto: a alegria
    P([[440, 704], [566, 704], [566, 866], [440, 866]], `<rect x="440" y="704" width="126" height="162" fill="${PAPEL}"/>
      ${foco(503, 770, 30, 220, 48, 14, .045)}${sol(503, 770, 20)}
      ${estrela(458, 722, 1)}${estrela(552, 734, .8)}${estrela(536, 836, .9)}${estrela(452, 800, .7)}
      ${costas(484, 872, 2.2, { braco: "ambos", mov: true })}${costas(534, 878, 2.4, { braco: "ambos", mov: true, at: .3 })}`, { grosso: true })
  ],
  beats: [
    { fala: "Israel saiu do Egito, libertado da escravidão. Deus guiava o povo de dia numa coluna de nuvem e, de noite, numa coluna de fogo.", p: [0] },
    { fala: "Mas o faraó mudou de ideia e saiu atrás deles com os seus carros de guerra. O povo, acuado diante do Mar Vermelho, teve medo. Moisés respondeu: não temais, parai e vede o livramento do Senhor.", p: [1, 2] },
    { fala: "Então Moisés estendeu a mão sobre o mar. Durante toda aquela noite, o Senhor o fez retirar-se por um forte vento oriental, e as águas se dividiram.", p: [3] },
    { fala: "O povo de Israel atravessou em terra seca, tendo as águas como muralha à direita e à esquerda. Ao amanhecer, as águas voltaram, e Israel viu o grande poder do Senhor.", p: [4, 5] }
  ]
};
function brilhoCirc(x, y) { return `<circle cx="${x}" cy="${y}" r="26" fill="${PAPEL}" opacity=".9"/><circle cx="${x}" cy="${y}" r="14" fill="${PAPEL}" stroke="${INK}" stroke-width="2"/>`; }
mar.n = mar.beats.map(b => b.fala).join(" ");

/* ---------- cenas 2 a 10 ---------- */
const cena = (t, ref, paineis, beats) => { const c = { t, ref, paineis, beats }; c.n = beats.map(b => b.fala).join(" "); return c; };
const roda = (b, n = 4) => Array.from({ length: n }, (_, i) => i);

const estrelaCena = cena("A estrela guia", "Mateus 2", [
  Q(LAY.B[0], b => `${ceuNoite(b, 3)}${anjo(b.cx + 10, b.y + b.h * .5, .9)}${terreno(b, .78, "tp2", 4)}${ovelha(b.x + 46, b.y + b.h * .92, 1.5)}${ovelha(b.x + 104, b.y + b.h * .96, 1.6)}${costas(b.x + 176, b.y + b.h * 1.0, 2.3, { cajado: true })}${costas(b.x + 222, b.y + b.h * 1.03, 2.1)}`),
  Q(LAY.B[1], b => `${ceuNoite(b, 5)}${foco(b.cx, b.cy, 40, 340, 64, 5, .035, PAPEL)}${asas(b.cx, b.y + b.h * .58, 1.8)}${costas(b.cx, b.b + 70, 4.6, { braco: "ambos" })}${balao(b.x + 40, b.y + 12, b.w - 120, 56, "Não temais!", b.cx - 20, b.y + b.h * .38)}`, { som: "agua" }),
  Q(LAY.B[2], b => `${ceuNoite(b, 7)}${estrelaGrande(b.x + b.w * .8, b.y + b.h * .24, .9)}${terreno(b, .72, "tp2", 11)}${[[.16, 1.2], [.46, 1.4], [.76, 1.3]].map(([u, s], i) => camelo(b.x + b.w * u, b.y + b.h * .98, s)).join("")}${[[.16, 1.2], [.46, 1.4], [.76, 1.3]].map(([u, s]) => costas(b.x + b.w * u + 6, b.y + b.h * .98 - 60 * s, 1.0, { braco: "alto" })).join("")}${sfx("PAT PAT", b.x + 100, b.y + b.h * .24, 24, -4, true)}`, { som: "marcha" }),
  Q(LAY.B[3], b => `${ceuNoite(b, 13)}<path d="M${b.cx - 16} ${b.y + b.h * .26}L${b.cx - 80} ${b.b}H${b.cx + 80}L${b.cx + 16} ${b.y + b.h * .26}Z" fill="${PAPEL}" opacity=".3"/>${estrelaGrande(b.cx, b.y + b.h * .2, .85)}${terreno(b, .76, "tp3", 5)}${casa(b.x + 14, b.y + b.h * .94, 64, 50, false)}${casa(b.x + 94, b.y + b.h * .9, 56, 44, true)}${casa(b.cx - 44, b.b - 4, 88, 74, true)}${casa(b.r - 96, b.y + b.h * .92, 60, 50, false)}${velo(b.x, b.r, b.y + 30, b.y + b.h * .5, 8, 4, PAPEL)}`, { som: "agua" }),
  Q(LAY.B[4], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, b.cx, b.y, b.cx, b.b, "tp3", true)}${manjedoura(b.cx, b.y + b.h * .66, 1.7)}${costas(b.x + 52, b.b + 4, 2.9, { braco: "reza" })}${costas(b.r - 52, b.b + 8, 3.1, { braco: "reza", velo: 1 })}${estrela(b.x + 40, b.y + 40, 1.3)}${estrela(b.r - 40, b.y + 60, 1)}${estrela(b.cx, b.y + 24, .8)}`)
], [
  { fala: "Havia pastores nos campos de Belém, guardando o seu rebanho durante a noite. De repente, um anjo do Senhor apareceu, e a glória de Deus brilhou ao redor deles. O anjo disse: não temais, hoje vos nasceu o Salvador, que é Cristo, o Senhor.", p: [0, 1] },
  { fala: "Longe dali, no Oriente, uns magos viram uma estrela e perguntaram: onde está o rei dos judeus que acaba de nascer? Nós vimos a sua estrela e viemos adorá-lo.", p: [2] },
  { fala: "A estrela que tinham visto no Oriente ia adiante deles, até parar sobre o lugar onde estava o menino.", p: [3] },
  { fala: "Ao entrarem na casa, viram o menino com Maria, sua mãe. Prostrando-se, o adoraram. E, abrindo os seus tesouros, ofertaram-lhe ouro, incenso e mirra.", p: [4] }
]);

const arcaCena = cena("O arco-íris da aliança", "Gênesis 6 a 9", [
  Q(LAY.A[0], b => `${ceuDia(b)}${colinas(b, .8, 40, 12)}${terreno(b, .9, "tp2", 6)}${arca(b.x + b.w * .58, b.y + b.h * .95, 1.05)}${costas(b.x + 110, b.b + 6, 2.4, { braco: "alto" })}${costas(b.x + 170, b.b + 10, 2.1, { mov: true })}${sfx("TOC TOC TOC", b.x + 120, b.y + 44, 22, -4)}`),
  Q(LAY.A[1], b => `${ceuDia(b)}${terreno(b, .86, "tp2", 8)}${arca(b.r - 90, b.y + b.h * .92, .72)}<path d="M${b.x + 30} ${b.y + b.h * .96}L${b.r - 120} ${b.y + b.h * .74}V${b.y + b.h * .8}L${b.x + 30} ${b.b}Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3"/>${[[.2, .88, 0], [.36, .84, 1], [.52, .8, 0], [.66, .77, 1]].map(([u, v, t]) => bichoSil(b.x + b.w * u, b.y + b.h * v, 1.3, t)).join("")}${costas(b.x + 30, b.b + 4, 2.2, { braco: "alto" })}`),
  Q(LAY.A[2], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${INK}"/>${velo(b.x, b.r, b.y, b.b, 26, 3, PAPEL)}${relampago(b.x + b.w * .3, b.y + 14, 1.5)}${terreno(b, .74, "tp3", 4)}${agua(b, .74, 5, PAPEL)}<g transform="translate(${b.cx} ${b.y + b.h * .62}) rotate(-8)">${arca(0, 0, .7)}</g>${sfx("ZAAAAA", b.cx + 20, b.y + 220, 30, -6, true)}`, { som: "agua", tremor: true }),
  Q(LAY.A[3], b => `${ceuDia(b)}${foco(b.cx, b.y + b.h * .32, 40, 380, 70, 3, .03)}${agua(b, .8, 6)}${arca(b.cx + 40, b.b - 6, .55)}${pomba(b.cx + 34, b.y + b.h * .36, 1.7, true)}${estrela(b.x + 40, b.y + 60, 1.2)}${estrela(b.r - 40, b.y + 110, 1)}`),
  Q(LAY.A[4], b => { const tons = [INK, "url(#hat2)", PAPEL, "url(#tp2)", PAPEL, "url(#tp1)"], base = b.b - 74; return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, base, 30, 460, 80, 17, .03)}${tons.map((t, i) => { const rx = b.w / 2 + 6 - i * 23, ry = rx * .9, d = `M${b.cx - rx} ${base}A${rx} ${ry} 0 0 1 ${b.cx + rx} ${base}`; return `<path class="m-arco" style="animation-delay:${i * .25}s" pathLength="1" d="${d}" fill="none" stroke="${INK}" stroke-width="24"/><path class="m-arco" style="animation-delay:${i * .25}s" pathLength="1" d="${d}" fill="none" stroke="${t}" stroke-width="19"/>`; }).join("")}${nuv(b.x + 40, base - 6, 1.6)}${nuv(b.r - 50, base - 2, 1.8)}${terreno(b, .86, "tp2", 9)}${arca(b.cx - 40, b.b - 4, .8)}${costas(b.r - 80, b.b + 6, 2.2, { braco: "ambos", mov: true })}${costas(b.r - 36, b.b + 10, 2.4, { braco: "ambos", mov: true, at: .3 })}${estrela(b.x + 50, b.y + 40, 1.4)}${estrela(b.r - 60, b.y + 60, 1.1)}${estrela(b.cx, b.y + 30, 1)}${caixa(b.x + 12, b.y + 12, 148, "O ARCO DA ALIANÇA")}`; })
], [
  { fala: "Deus viu que a maldade na terra era grande e mandou Noé construir uma arca. Noé obedeceu e fez tudo como o Senhor lhe ordenou.", p: [0] },
  { fala: "Noé entrou na arca com a sua família e com os animais, e o Senhor fechou a porta. Então a chuva caiu sobre a terra, quarenta dias e quarenta noites.", p: [1, 2] },
  { fala: "Mas Deus se lembrou de Noé. Fez passar um vento sobre a terra, e as águas baixaram. Uma pomba voltou a ele trazendo no bico uma folha de oliveira.", p: [3] },
  { fala: "Então Deus disse: ponho o meu arco nas nuvens, como sinal da aliança entre mim e a terra. Nunca mais as águas se tornarão em dilúvio para destruir toda a carne.", p: [4] }
]);

const sarcaCena = cena("A sarça que ardia", "Êxodo 3", [
  Q(LAY.C[0], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp1", false)}${foco(b.x + b.w * .2, b.y + b.h * .7, 30, 520, 50, 3, .03)}${sol(b.x + b.w * .2, b.y + b.h * .7, 26)}${colinas(b, .78, 34, 7)}${terreno(b, .88, "tp2", 5)}${[0, 1, 2, 3].map(i => ovelha(b.x + 280 + i * 60, b.b - 8 + (i % 2) * 6, 1.5)).join("")}${costas(b.x + 200, b.b + 4, 2.6, { cajado: true, mov: true })}`),
  Q(LAY.C[1], b => `${ceuNoite(b, 3)}${foco(b.cx + 60, b.cy + 20, 40, 480, 90, 8, .03, PAPEL)}${terreno(b, .82, "tp3", 6)}<g fill="${INK}" stroke="${PAPEL}" stroke-width="3">${[[-70, 0, 38], [-20, -10, 46], [34, -6, 42], [84, 4, 34]].map(([dx, dy, r]) => `<circle cx="${b.cx + 60 + dx}" cy="${b.b - 56 + dy}" r="${r}"/>`).join("")}</g>${[[-60, 1.7], [-18, 2.4], [30, 2.2], [78, 1.6], [4, 1.5]].map(([dx, s], i) => chama(b.cx + 60 + dx, b.b - 40 - (i % 2) * 14, s)).join("")}${costas(b.x + 80, b.b + 10, 2.6, { cajado: true })}${sfx("FUUUUU", b.x + 120, b.y + 60, 34, -5, true)}`, { som: "gooo", tremor: true }),
  Q(LAY.C[2], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.cy - 40, 50, 360, 60, 4, .04)}${olho(b.cx - 44, b.cy - 40, 84, false)}${olho(b.cx + 50, b.cy - 40, 84, true)}${gota(b.cx + 70, b.cy - 100, .9)}${balao(b.x + 8, b.b - 130, b.w - 30, 64, "Eis-me aqui!", b.cx - 20, b.b - 150)}`),
  Q(LAY.C[3], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${INK}"/>${foco(b.cx, b.y + b.h * .5, 40, 380, 70, 9, .04, PAPEL)}${terreno(b, .5, "tpw", 3)}${sandalia(b.cx - 36, b.cy + 120, 1.15, -8)}${sandalia(b.cx + 40, b.cy + 126, 1.15, 6)}${Array.from({ length: 24 }, (_, i) => { const r = rng(i + 30); return `<circle class="m-brilha" style="animation-delay:-${r() * 2}s" cx="${b.x + 20 + r() * (b.w - 40)}" cy="${b.y + 20 + r() * (b.h - 40)}" r="${1.2 + r() * 2}" fill="${PAPEL}"/>`; }).join("")}${caixa(b.x + 8, b.y + 10, b.w - 16, "TERRA SANTA")}`),
  Q(LAY.C[4], b => `${ceuNoite(b, 5)}${foco(b.cx, b.cy, 50, 320, 80, 11, .035, PAPEL)}${[[-50, 2], [0, 2.6], [50, 2.1], [-20, 1.5], [24, 1.6]].map(([dx, s], i) => chama(b.cx + dx, b.b - 10 - (i > 2 ? 30 : 0), s)).join("")}${moises(b.cx - 6, b.b - 20, .72)}${balao(b.x + 10, b.y + 12, b.w - 20, 70, "Eu serei contigo", b.cx, b.y + 120)}`, { som: "gooo" })
], [
  { fala: "Moisés cuidava das ovelhas do seu sogro no deserto, e chegou ao monte de Deus, o Horebe.", p: [0] },
  { fala: "Ali, o Anjo do Senhor lhe apareceu numa chama de fogo, no meio de uma sarça. A sarça ardia, mas não se consumia.", p: [1] },
  { fala: "Moisés se aproximou, e Deus o chamou pelo nome: Moisés, Moisés! E ele respondeu: eis-me aqui. Deus disse: tira as sandálias dos pés, porque o lugar em que estás é terra santa.", p: [2, 3] },
  { fala: "Eu vi a aflição do meu povo no Egito, disse o Senhor. Vai, eu te envio para libertá-lo. E Deus prometeu: eu serei contigo.", p: [4] }
]);

const tempestadeCena = cena("Jesus acalma a tempestade", "Marcos 4", [
  Q(LAY.B[0], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp2", false)}${foco(b.cx, b.y + b.h * .6, 24, 360, 60, 3, .03)}${sol(b.cx, b.y + b.h * .6, 26)}${nuv(b.x + 60, b.y + 60, 1.2)}${nuv(b.r - 70, b.y + 90, 1)}${agua(b, .62, 6)}${barco(b.cx - 20, b.y + b.h * .86, .8)}`),
  Q(LAY.B[1], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${INK}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tpw", true)}${velo(b.x, b.r, b.y, b.b, 24, 6, PAPEL)}${relampago(b.x + b.w * .25, b.y + 10, 1.5)}${agua(b, .56, 7, PAPEL)}${curl(b.x + 30, b.y + b.h * .64, 1.2)}${curl(b.r - 100, b.y + b.h * .7, 1.4)}<g transform="rotate(-12 ${b.cx} ${b.y + b.h * .7})">${barco(b.cx, b.y + b.h * .74, .9, { tomba: true })}</g>${sfx("ZABUUUN", b.cx, b.y + b.h * .5, 30, -8, true)}`, { som: "agua", tremor: true }),
  Q(LAY.B[2], b => `${ceuNoite(b, 9)}${velo(b.x, b.r, b.y, b.cy, 18, 4, PAPEL)}${relampago(b.x + 70, b.y + 8, 1.5)}${relampago(b.r - 80, b.y + 4, 1.2)}<path d="M${b.x} ${b.cy + 40}Q${b.cx} ${b.cy - 10} ${b.r} ${b.cy + 40}V${b.b}H${b.x}Z" fill="${PAPEL}" stroke="${INK}" stroke-width="4"/><path d="M${b.x} ${b.cy + 40}Q${b.cx} ${b.cy - 10} ${b.r} ${b.cy + 40}V${b.cy + 70}Q${b.cx} ${b.cy + 24} ${b.x} ${b.cy + 70}Z" fill="url(#tp2)"/>${dormindo(b.cx, b.b - 28, 1.5)}${ZZ(b.cx - 90, b.b - 90, 1.2)}${costas(b.x + 90, b.b + 4, 2.4, { braco: "ambos" })}${costas(b.r - 90, b.b + 8, 2.6, { braco: "alto" })}${gota(b.x + 70, b.y + b.h * .5, 1.1)}${gota(b.r - 70, b.y + b.h * .5, 1.1)}${balao(b.cx - 150, b.y + 14, 300, 56, "Mestre, não te importa que pereçamos?", b.x + 100, b.y + b.h * .62)}`),
  Q(LAY.B[3], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${INK}"/>${velo(b.x, b.r, b.y, b.b, 26, 8, PAPEL)}${relampago(b.x + b.w * .76, b.y + 6, 1.7)}${foco(b.cx, b.y + b.h * .42, 36, 360, 70, 7, .03, PAPEL)}${jesus(b.cx - 10, b.b - 10, 1.0)}${balao(b.x + 20, b.y + 10, 190, 60, "Cala-te! Aquieta-te!", b.cx - 40, b.y + 112)}`, { som: "gooo", tremor: true }),
  Q(LAY.B[4], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.y + b.h * .3, 30, 360, 70, 12, .035)}${sol(b.cx, b.y + b.h * .3, 34)}${nuv(b.x + 50, b.y + b.h * .14, 1)}${agua(b, .5, 8)}${barco(b.cx, b.b - 60, 1.1)}${estrela(b.x + 40, b.y + b.h * .5, 1)}${estrela(b.r - 44, b.y + b.h * .6, 1.2)}${caixa(b.x + 10, b.b - 40, b.w - 20, "GRANDE BONANÇA")}`)
], [
  { fala: "Ao entardecer, Jesus disse aos discípulos: passemos para o outro lado do mar. E eles partiram no barco, enquanto o dia se despedia.", p: [0] },
  { fala: "De repente, levantou-se uma grande tempestade. As ondas batiam no barco, e ele já se enchia de água. Jesus estava dormindo na popa. Os discípulos o acordaram: Mestre, não te importa que pereçamos?", p: [1, 2] },
  { fala: "Então Ele se levantou, repreendeu o vento e disse ao mar: cala-te, aquieta-te.", p: [3] },
  { fala: "O vento cessou, e houve grande bonança. Então Jesus perguntou: por que sois tão medrosos? Ainda não tendes fé?", p: [4] }
]);

const paesCena = cena("Cinco pães e dois peixes", "João 6", [
  Q(LAY.A[0], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp1", false)}${foco(b.r - 90, b.y + 70, 30, 520, 50, 3, .03)}${sol(b.r - 90, b.y + 70, 26)}${colinas(b, .5, 34, 7)}<path d="M${b.x - 10} ${b.b}V${b.y + b.h * .62}Q${b.cx} ${b.y + b.h * .5} ${b.r + 10} ${b.y + b.h * .64}V${b.b}Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3"/>${Array.from({ length: 4 }, (_, j) => Array.from({ length: 16 }, (_, i) => sil(b.x + 20 + i * 34 + (j % 2) * 16, b.y + b.h * (.74 + j * .1), .95 + j * .12, {})).join("")).join("")}${costas(b.cx, b.y + b.h * .64, 1.9, { braco: "alto" })}`),
  Q(LAY.A[1], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.cy, 50, 340, 60, 5, .035)}${jesus(b.cx - 40, b.b + 70, 1.9, { halo: false })}${balao(b.x + 150, b.y + 14, 160, 78, "Onde compraremos pão?", b.cx + 30, b.y + b.h * .42)}`),
  Q(LAY.A[2], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.b, 0, b.y, "tp2", false)}${costas(b.cx - 30, b.b + 6, 3.4, { braco: "frente" })}${cesto(b.cx + 40, b.cy + 70, 2.2)}${peixeM(b.cx + 20, b.cy + 10, 1.5, -10)}${peixeM(b.cx + 78, b.cy + 20, 1.4, 10)}${balao(b.x + 14, b.y + 14, b.w - 30, 66, "Cinco pães e dois peixes!", b.cx, b.cy - 40)}`),
  Q(LAY.A[3], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx + 10, b.y + 130, 40, 460, 90, 6, .03)}${tomGrad(b.x, b.y, b.w, b.h, 0, b.b, 0, b.y + b.h * .3, "tp2", false)}${jesus(b.cx - 22, b.b - 6, 1.05, { pao: true })}${sfx("PIKAAA", b.cx + 40, b.y + 50, 34, -6)}${estrela(b.x + 40, b.y + 100, 1.2)}${estrela(b.r - 40, b.y + 160, 1)}`, { som: "agua" }),
  Q(LAY.A[4], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.cy, 60, 400, 80, 7, .03)}${Array.from({ length: 30 }, (_, i) => { const r = rng(i + 90); return i % 4 === 0 ? peixeM(b.x + 20 + r() * (b.w - 40), b.y + 20 + r() * (b.h * .55), 1 + r() * .7, r() * 40 - 20) : pao(b.x + 20 + r() * (b.w - 40), b.y + 20 + r() * (b.h * .55), 1 + r() * .7); }).join("")}${Array.from({ length: 12 }, (_, i) => cesto(b.x + 26 + (i % 6) * 48, b.b - 70 + Math.floor(i / 6) * 40, 1.2)).join("")}${Array.from({ length: 8 }, (_, i) => sil(b.x + 20 + i * 38, b.b + 4, 1.5, { braco: i % 2 === 0 })).join("")}${estrela(b.x + 30, b.y + 30, 1.2)}${estrela(b.r - 30, b.y + 40, 1)}${caixa(b.x + b.w / 2 - 84, b.y + 10, 168, "DOZE CESTOS CHEIOS")}`)
], [
  { fala: "Uma grande multidão seguia Jesus, e já era tarde. Jesus perguntou a Filipe: onde compraremos pão para dar de comer a esta gente?", p: [0, 1] },
  { fala: "André respondeu: aqui está um rapaz que tem cinco pães de cevada e dois peixinhos. Mas o que é isso para tanta gente?", p: [2] },
  { fala: "Jesus mandou o povo sentar-se na relva. Então tomou os pães, deu graças e os repartiu. Fez o mesmo com os peixes, e todos comeram até ficarem satisfeitos.", p: [3] },
  { fala: "Depois, os discípulos recolheram os pedaços que sobraram e encheram doze cestos. Eram cerca de cinco mil homens que haviam comido.", p: [4] }
]);

const batismoCena = cena("O Espírito como pomba", "Mateus 3", [
  Q(LAY.C[0], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp1", false)}${foco(b.r - 110, b.y + 60, 24, 520, 50, 2, .03)}${sol(b.r - 110, b.y + 60, 24)}${colinas(b, .8, 36, 3)}${agua(b, .84, 3)}${costas(b.x + 130, b.b + 6, 2.6, { braco: "alto", robe: PAPEL })}${Array.from({ length: 9 }, (_, i) => sil(b.x + 260 + i * 30, b.b - 4, 1, { cajado: i % 3 === 0 })).join("")}`),
  Q(LAY.C[1], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h * .5, 0, b.y, 0, b.cy, "tp1", false)}${colinas(b, .34, 40, 5)}${nuv(b.x + 90, b.y + 40, 1.4)}${Array.from({ length: 3 }, (_, j) => Array.from({ length: 8 }, (_, i) => costas(b.x + 40 + i * 70 + (j % 2) * 30, b.y + b.h * (.62 + j * .16), 1.6 + j * .35, { mov: true, at: i * .2 })).join("")).join("")}<path d="M${b.x} ${b.y + b.h * .8}Q${b.cx} ${b.y + b.h * .72} ${b.r} ${b.y + b.h * .8}V${b.b}H${b.x}Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3"/>${agua(b, .8, 4)}`),
  Q(LAY.C[2], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.cy - 80, 50, 380, 60, 4, .035)}${jesus(b.cx - 20, b.b - 90, .86, { halo: true })}<path d="M${b.x - 10} ${b.b - 90}Q${b.cx} ${b.b - 110} ${b.r + 10} ${b.b - 90}V${b.b}H${b.x - 10}Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3"/>${agua(b, .85, 4)}${[0, 1, 2].map(i => `<ellipse class="m-anel" style="animation-delay:${i * .8}s" cx="${b.cx}" cy="${b.b - 70}" rx="70" ry="12" fill="none" stroke="${INK}" stroke-width="2.4"/>`).join("")}`),
  Q(LAY.C[3], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.y + 30, 30, 480, 90, 6, .03)}<path d="M${b.cx - 28} ${b.y}L${b.cx - 150} ${b.b}H${b.cx + 150}L${b.cx + 28} ${b.y}Z" fill="url(#tp1)" opacity=".7"/>${pomba(b.cx + 18, b.y + b.h * .44, 1.3)}${nuv(b.x + 40, b.y + 40, 1.3)}${nuv(b.r - 40, b.y + 60, 1.1)}${estrela(b.x + 30, b.y + b.h * .6, 1.2)}${estrela(b.r - 30, b.y + b.h * .7, 1)}${estrela(b.cx + 40, b.y + b.h * .86, .9)}`, { som: "agua" }),
  Q(LAY.C[4], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.y + 90, 36, 520, 100, 8, .03)}${sol(b.cx, b.y + 90, 30)}${nuv(b.x + 30, b.y + b.h * .3, 1.8)}${nuv(b.r - 30, b.y + b.h * .34, 1.9)}${balao(b.x + 10, b.y + b.h * .5, b.w - 20, 110, "Este é o meu Filho amado!", b.cx, b.y + b.h * .3)}${estrela(b.x + 34, b.b - 60, 1.2)}${estrela(b.r - 34, b.b - 90, 1)}`, { som: "gooo", tremor: true })
], [
  { fala: "João Batista pregava no deserto da Judeia: arrependei-vos, porque está próximo o reino dos céus. O povo vinha de Jerusalém e de toda a região para ser batizado por ele no rio Jordão.", p: [0, 1] },
  { fala: "Então Jesus veio da Galileia ao Jordão para ser batizado por João. Quando saiu da água, os céus se abriram sobre Ele.", p: [2] },
  { fala: "E o Espírito de Deus desceu como uma pomba e pairou sobre Ele.", p: [3] },
  { fala: "E uma voz dos céus disse: este é o meu Filho amado, em quem me comprazo.", p: [4] }
]);

const jacoCena = cena("A escada de Jacó", "Gênesis 28", [
  Q(LAY.B[0], b => `${ceuNoite(b, 4, true)}${terreno(b, .74, "tp3", 6)}${[[.2, .86, 1.2], [.7, .82, 1], [.5, .94, 1.5]].map(([u, v, s]) => `<ellipse cx="${b.x + b.w * u}" cy="${b.y + b.h * v}" rx="${16 * s}" ry="${9 * s}" fill="${PAPEL}" stroke="${INK}" stroke-width="3"/>`).join("")}${dormindo(b.cx + 10, b.y + b.h * .88, 1.7)}${ZZ(b.cx - 60, b.y + b.h * .7, 1.2)}`),
  Q(LAY.B[1], b => `${ceuNoite(b, 8)}${foco(b.r - 30, b.y + 20, 30, 400, 60, 8, .035, PAPEL)}${escada(b.x + 60, b.b - 20, b.r - 50, b.y + 40, 10)}${estrela(b.x + 40, b.y + 50, 1.3)}${estrela(b.r - 90, b.y + b.h * .6, 1)}`),
  Q(LAY.B[2], b => `${ceuNoite(b, 11)}${foco(b.cx, b.cy, 60, 520, 100, 11, .03, PAPEL)}${escada(b.x + 120, b.b - 10, b.r - 120, b.y + 10, 12)}${[[.3, .72, 1], [.42, .5, 1], [.56, .36, 1.1], [.66, .2, 1.2]].map(([u, v, s], i) => `<g class="${i % 2 ? "m-desce" : "m-sobe"}" style="animation-delay:${i * 1.1}s">${anjo(b.x + b.w * u, b.y + b.h * v, s * .45, { luz: false })}</g>`).join("")}${estrela(b.x + 60, b.y + 40, 1.4)}${estrela(b.r - 60, b.y + 60, 1.2)}`),
  Q(LAY.B[3], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.y + 20, 20, 520, 120, 12, .03)}${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp2", true)}${nuv(b.x + 50, b.y + 40, 1.6)}${nuv(b.r - 60, b.y + 70, 1.5)}${balao(b.x + 20, b.cy - 20, b.w - 60, 110, "Eu estou contigo!", b.cx, b.y + 120)}${caixa(b.x + 10, b.b - 40, b.w - 40, "EU TE GUARDAREI")}${estrela(b.cx, b.y + 40, 1.6)}`, { som: "gooo", tremor: true }),
  Q(LAY.B[4], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h * .6, 0, b.y, 0, b.cy, "tp1", false)}${foco(b.cx, b.y + 120, 24, 400, 70, 13, .03)}${sol(b.cx, b.y + 120, 26)}${colinas(b, .6, 28, 4)}${terreno(b, .76, "tp2", 2)}<path d="M${b.r - 70} ${b.b - 30}V${b.b - 150}Q${b.r - 52} ${b.b - 168} ${b.r - 34} ${b.b - 150}V${b.b - 30}Z" fill="${PAPEL}" stroke="${INK}" stroke-width="4"/>${costas(b.cx - 30, b.b + 4, 3.2, { braco: "ambos" })}${caixa(b.x + 10, b.y + 10, b.w - 20, "CASA DE DEUS")}`)
], [
  { fala: "Jacó saiu de Berseba e foi a caminho de Harã. Ao chegar a um certo lugar, passou a noite ali. Tomou uma pedra para travesseiro e deitou-se para dormir.", p: [0] },
  { fala: "Dormindo, teve um sonho: uma escada apoiada na terra, cujo topo tocava o céu. E os anjos de Deus subiam e desciam por ela.", p: [1, 2] },
  { fala: "Do alto, o Senhor lhe disse: eu sou o Deus de Abraão e de Isaque. A terra em que dormes te darei. Eis que estou contigo e te guardarei por onde quer que fores.", p: [3] },
  { fala: "Jacó acordou e disse: verdadeiramente o Senhor está neste lugar, e eu não o sabia. Este lugar é a casa de Deus e a porta do céu.", p: [4] }
]);

const jerico = cena("As muralhas de Jericó", "Josué 6", [
  Q(LAY.A[0], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp1", false)}${foco(b.x + 70, b.y + 60, 24, 520, 50, 3, .03)}${sol(b.x + 70, b.y + 60, 22)}${terreno(b, .86, "tp2", 5)}${muralha(b.x + 150, b.b - 14, 330, 150)}<path d="M${b.cx + 20} ${b.b - 14}V${b.b - 80}Q${b.cx + 60} ${b.b - 116} ${b.cx + 100} ${b.b - 80}V${b.b - 14}Z" fill="${INK}" stroke="${INK}" stroke-width="3"/>${[0, 1, 2].map(i => `<rect x="${b.x + 170 + i * 120}" y="${b.b - 190}" width="34" height="44" fill="${PAPEL}" stroke="${INK}" stroke-width="3"/>`).join("")}${sil(b.x + 70, b.b + 4, 1.6, { cajado: true })}`),
  Q(LAY.A[1], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx + 40, b.y + 50, 40, 380, 80, 4, .035)}<path d="M${b.cx - 10} ${b.y}L${b.cx - 130} ${b.b}H${b.cx + 110}L${b.cx + 30} ${b.y}Z" fill="url(#tp1)" opacity=".7"/>${costas(b.cx - 30, b.b + 40, 4.4, { cajado: true, braco: "alto" })}${balao(b.x + 14, b.y + 12, 190, 64, "Eu a entreguei!", b.cx + 20, b.y + 92)}`),
  Q(LAY.A[2], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp1", false)}${colinas(b, .5, 24, 7)}${terreno(b, .72, "tp2", 6)}${[0, 1, 2, 3].map(i => `<g>${costas(b.x + 36 + i * 52, b.b - 14 + (i % 2) * 8, 2.1, { braco: "alto", mov: true, at: i * .15 })}${shofar(b.x + 44 + i * 52, b.b - 90, .5)}</g>`).join("")}<rect x="${b.cx - 28}" y="${b.y + 80}" width="56" height="34" fill="${PAPEL}" stroke="${INK}" stroke-width="4"/><path d="M${b.cx - 28} ${b.y + 90}H${b.cx + 28}" stroke="${INK}" stroke-width="3"/>${sfx("TUUUU", b.cx + 20, b.y + 50, 30, -5)}`, { som: "marcha" }),
  Q(LAY.A[3], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.cy, 60, 420, 80, 9, .04)}${shofar(b.x + 30, b.b - 150, 3.2)}${ondasSom(b.x + 200, b.cy - 30, 1, 5)}${sfx("TUUUUU!", b.cx + 20, b.y + 70, 44, -6)}`, { som: "gooo", tremor: true }),
  Q(LAY.A[4], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp1", false)}${foco(b.cx, b.cy, 40, 440, 80, 12, .03)}${terreno(b, .82, "tp2", 8)}${muralha(b.x - 10, b.b - 120, 320, 210, true)}${muralha(b.x + 320, b.b - 120, 160, 210, true, 11)}${[0, 1, 2, 3, 4].map(i => `<circle class="m-poeira" style="animation-delay:${.6 + i * .3}s" cx="${b.x + 40 + i * 62}" cy="${b.b - 120}" r="34" fill="${PAPEL}" stroke="${INK}" stroke-width="3"/>`).join("")}${Array.from({ length: 6 }, (_, i) => costas(b.x + 30 + i * 46, b.b + 6, 2.2, { braco: "ambos", mov: true, at: i * .12 })).join("")}${sfx("BOOOOM!", b.cx, b.y + 80, 54, -4)}`, { som: "gooo", tremor: true })
], [
  { fala: "Jericó estava bem fechada por causa dos israelitas. Ninguém saía, ninguém entrava. Então o Senhor disse a Josué: eu entreguei Jericó nas tuas mãos.", p: [0, 1] },
  { fala: "Marchem ao redor da cidade uma vez por dia, durante seis dias. Sete sacerdotes levarão sete trombetas de chifre de carneiro, diante da arca da aliança.", p: [2] },
  { fala: "No sétimo dia, deram sete voltas, e os sacerdotes tocaram as trombetas. Josué disse ao povo: gritai, porque o Senhor vos deu a cidade!", p: [3] },
  { fala: "O povo gritou, e as muralhas caíram. Israel entrou na cidade, porque o Senhor lhes deu a vitória.", p: [4] }
]);

const tumulo = cena("A pedra removida", "Lucas 24", [
  Q(LAY.C[0], b => `${ceuNoite(b, 12, true)}${tumuloBoca(b, false)}<g transform="translate(${b.cx} ${b.b - 52})"><circle r="58" fill="${PAPEL}" stroke="${INK}" stroke-width="4"/><circle r="58" fill="url(#tp2)" opacity=".5"/><path d="M-34 -22Q-10 -44 24 -36" stroke="${INK}" stroke-width="3" fill="none"/></g>`),
  Q(LAY.C[1], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${tomGrad(b.x, b.y, b.w, b.h, 0, b.y, 0, b.b, "tp1", false)}${foco(b.cx, b.y + b.h * .6, 30, 560, 70, 3, .03)}${sol(b.cx, b.y + b.h * .62, 28)}${colinas(b, .6, 40, 5)}${terreno(b, .8, "tp2", 7)}${[0, 1, 2, 3].map(i => mulher(b.x + 90 + i * 110, b.b + 6 - (i % 2) * 6, 2.5 + (i % 2) * .2, { mov: true, at: i * .2, trouxa: i % 2 === 0 })).join("")}${sfx("TAP TAP", b.x + 120, b.y + 50, 24, -3)}`, { som: "marcha" }),
  Q(LAY.C[2], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${INK}"/>${foco(b.cx, b.cy + 40, 40, 400, 80, 3, .04, PAPEL)}${tumuloBoca({ x: b.x, y: b.y + 60, w: b.w, h: b.h - 60, r: b.r, b: b.b, cx: b.cx, cy: b.cy }, true)}${pedraRolando(b.x + 30, b.b - 110, 54)}${sfx("GOOOO", b.cx, b.y + 60, 36, -5, true)}`, { som: "gooo", tremor: true }),
  Q(LAY.C[3], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.cy + 60, 50, 420, 80, 5, .04)}${anjo(b.cx, b.b - 40, 1.7, { luz: false, braco: "alto" })}${balao(b.x + 8, b.y + 12, b.w - 20, 96, "Não está aqui, ressuscitou!", b.cx, b.y + 150)}`),
  Q(LAY.C[4], b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${PAPEL}"/>${foco(b.cx, b.y + 130, 40, 520, 100, 6, .03)}${sol(b.cx, b.y + 130, 34)}${nuv(b.x + 40, b.y + 50, 1.3)}${terreno(b, .8, "tp2", 4)}${mulher(b.cx - 30, b.b + 8, 2.8, { braco: "ambos", mov: true })}${mulher(b.cx + 40, b.b + 14, 2.6, { braco: "ambos", mov: true, at: .3 })}${estrela(b.x + 30, b.y + b.h * .5, 1.3)}${estrela(b.r - 30, b.y + b.h * .6, 1)}${caixa(b.x + 6, b.b - 40, b.w - 12, "A ESPERANÇA VIVE")}`)
], [
  { fala: "Jesus foi sepultado num túmulo novo, e uma grande pedra foi colocada na entrada. Tudo parecia ter terminado.", p: [0] },
  { fala: "Na madrugada do primeiro dia da semana, as mulheres foram ao túmulo, levando as especiarias que tinham preparado.", p: [1] },
  { fala: "Elas encontraram a pedra removida da entrada do sepulcro. Dois homens com vestes resplandecentes lhes disseram: por que buscais entre os mortos aquele que vive? Não está aqui, mas ressuscitou.", p: [2, 3] },
  { fala: "Elas voltaram correndo para contar a notícia. Jesus venceu a morte, e a esperança está viva.", p: [4] }
]);

const pagina = m => `${DEFS}<rect width="600" height="900" fill="#efe7d3"/><rect x="8" y="8" width="584" height="884" fill="#f6f0e0" stroke="${INK}" stroke-width="1.5"/>
${m.paineis.map(q => `<polygon points="${q.pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="#14110f33" stroke-width="2" stroke-dasharray="6 6"/>`).join("")}
<defs>${m.paineis.map((q, i) => `<clipPath id="cp${i}"><polygon points="${q.pts.map(p => p.join(",")).join(" ")}"/></clipPath>`).join("")}</defs>
${m.paineis.map((q, i) => `<g class="m-painel" data-i="${i}"><g clip-path="url(#cp${i})">${q.conteudo}<rect x="0" y="0" width="600" height="900" fill="white" class="m-flash"/></g><polygon points="${q.pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${INK}" stroke-width="${q.grosso ? 8 : 5}" stroke-linejoin="miter"/></g>`).join("")}
<rect x="0" y="0" width="600" height="900" fill="url(#grao)" pointer-events="none"/>`;

window.MANGA = { lista: [mar, estrelaCena, arcaCena, sarcaCena, tempestadeCena, paesCena, batismoCena, jacoCena, jerico, tumulo], especial: tumulo, pagina, box };
})();
