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
const balao = (x, y, w, h, txt, cx, cy) => `<g><path d="M${x + w * .28} ${y + h * .82}Q${(x + w * .3 + cx) / 2} ${(y + h + cy) / 2} ${cx} ${cy}Q${x + w * .44} ${y + h * .95} ${x + w * .5} ${y + h * .9}z" fill="${PAPEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${PAPEL}" stroke="${INK}" stroke-width="3.4"/><path d="M${x + w * .3} ${y + h * .86}Q${x + w * .4} ${y + h * .94} ${x + w * .49} ${y + h * .9}" stroke="${PAPEL}" stroke-width="6" fill="none"/><text x="${x + w / 2}" y="${y + h / 2 + 7}" text-anchor="middle" style="font:800 21px 'Noto Sans','Hiragino Kaku Gothic ProN',system-ui,sans-serif" fill="${INK}">${txt}</text></g>`;
const gota = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" class="m-gota"><path d="M0 -14Q10 0 6 8Q0 14-6 8Q-10 0 0 -14z" fill="${PAPEL}" stroke="${INK}" stroke-width="2"/><path d="M-3 2Q-4 6-1 8" stroke="${INK}" stroke-width="1.4" fill="none"/></g>`;
const caixa = (x, y, w, txt) => `<g><rect x="${x}" y="${y}" width="${w}" height="28" fill="${PAPEL}" stroke="${INK}" stroke-width="2.6"/><text x="${x + w / 2}" y="${y + 19}" text-anchor="middle" style="font:800 13px 'Noto Sans',system-ui,sans-serif" fill="${INK}">${txt}</text></g>`;

/* ---------- personagens ---------- */
const sw = s => Math.max(1, 3.4 / s);
const costas = (x, y, s = 1, o = {}) => { const B = { baixo: [[-6, -26, -9, -13], [6, -26, 9, -13]], alto: [[-6, -26, -9, -13], [6, -26, 12, -44]], ambos: [[-6, -26, -12, -44], [6, -26, 12, -44]], crianca: [[-6, -26, -9, -13], [6, -26, 9, -13]] }[o.braco ?? "baixo"], w = sw(s);
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

const pagina = m => `${DEFS}<rect width="600" height="900" fill="#efe7d3"/><rect x="8" y="8" width="584" height="884" fill="#f6f0e0" stroke="${INK}" stroke-width="1.5"/>
${m.paineis.map(q => `<polygon points="${q.pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="#14110f33" stroke-width="2" stroke-dasharray="6 6"/>`).join("")}
<defs>${m.paineis.map((q, i) => `<clipPath id="cp${i}"><polygon points="${q.pts.map(p => p.join(",")).join(" ")}"/></clipPath>`).join("")}</defs>
${m.paineis.map((q, i) => `<g class="m-painel" data-i="${i}"><g clip-path="url(#cp${i})">${q.conteudo}<rect x="0" y="0" width="600" height="900" fill="white" class="m-flash"/></g><polygon points="${q.pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${INK}" stroke-width="${q.grosso ? 8 : 5}" stroke-linejoin="miter"/></g>`).join("")}
<rect x="0" y="0" width="600" height="900" fill="url(#grao)" pointer-events="none"/>`;

window.MANGA = { lista: [mar], pagina, box, _dev: { cavalo, carro, costas, moises } };
})();
