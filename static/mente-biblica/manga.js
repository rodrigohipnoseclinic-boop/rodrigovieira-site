// Cenas em estilo mangá: tinta preta, papel, retícula de pontos (screentone), linhas de foco e de velocidade.
// Cada cena é uma página 600x900 com quadros. A câmera visita os quadros na ordem, enquanto a narração toca.
(() => {
const INK = "#14110f", PAPEL = "#fdfbf5";
const rng = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 16807 + 11) % 2147483647) / 2147483647; };

const DEFS = `<defs>
<pattern id="tp1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3" cy="3" r="1" fill="${INK}"/></pattern>
<pattern id="tp2" width="4.4" height="4.4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.2" cy="2.2" r="1.2" fill="${INK}"/></pattern>
<pattern id="tp3" width="3.4" height="3.4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="1.7" cy="1.7" r="1.45" fill="${INK}"/></pattern>
<pattern id="tpw" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.5" cy="2.5" r="1.3" fill="${PAPEL}"/></pattern>
<pattern id="hat" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><path d="M0 0V5" stroke="${INK}" stroke-width="1"/></pattern>
<pattern id="hat2" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><path d="M0 0V3" stroke="${INK}" stroke-width="1.1"/></pattern>
</defs>`;

/* ---------- ferramentas de tinta ---------- */
// linhas de foco: cunhas largas por fora e finas por dentro, convergindo para (cx,cy)
const foco = (cx, cy, r0, r1, n, seed, larg = .04, cor = INK) => { const r = rng(seed);
  return `<g class="m-foco" style="transform-origin:${cx}px ${cy}px">${Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n + r() * .1, w = larg * (.4 + r()), l = r1 * (.75 + .25 * r());
    return `<path d="M${cx + Math.cos(a - w) * l} ${cy + Math.sin(a - w) * l}L${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0}L${cx + Math.cos(a + w) * l} ${cy + Math.sin(a + w) * l}z" fill="${cor}"/>`; }).join("")}</g>`; };
// linhas de velocidade horizontais
const velo = (x0, x1, y0, y1, n, seed, cor = INK) => { const r = rng(seed);
  return Array.from({ length: n }, () => { const y = y0 + r() * (y1 - y0), x = x0 + r() * (x1 - x0), l = 50 + r() * 140, d = .35 + r() * .4;
    return `<path class="m-mv" style="animation-duration:${d}s;animation-delay:-${r() * d}s" d="M${x} ${y}h${l}" stroke="${cor}" stroke-width="${.8 + r() * 2.2}" stroke-linecap="round"/>`; }).join(""); };
const sol = (cx, cy, r) => `<g class="m-gira" style="transform-origin:${cx}px ${cy}px">${Array.from({ length: 28 }, (_, i) => { const a = i * Math.PI * 2 / 28, l = r * (i % 2 ? 1.7 : 2.4);
  return `<path d="M${cx + Math.cos(a) * r * 1.3} ${cy + Math.sin(a) * r * 1.3}L${cx + Math.cos(a) * l} ${cy + Math.sin(a) * l}" stroke="${INK}" stroke-width="${i % 2 ? 1.4 : 2.4}" stroke-linecap="round"/>`; }).join("")}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="${PAPEL}" stroke="${INK}" stroke-width="3.5"/>`;
const nuv = (x, y, s = 1) => { const c = [[-26, -2, 14], [-4, -10, 20], [22, -4, 16], [40, 4, 11]];
  return `<g class="m-deriva" transform="translate(${x} ${y}) scale(${s})"><g fill="${INK}">${c.map(([a, b, r]) => `<circle cx="${a}" cy="${b}" r="${r + 2.4 / s}"/>`).join("")}<ellipse cx="6" cy="6" rx="${48 + 2.4 / s}" ry="${10 + 2.4 / s}"/></g><g fill="${PAPEL}">${c.map(([a, b, r]) => `<circle cx="${a}" cy="${b}" r="${r}"/>`).join("")}<ellipse cx="6" cy="6" rx="48" ry="10"/></g><path d="M-30 8Q-4 16 34 8" fill="none" stroke="${INK}" stroke-width="${1 / s + .6}" opacity=".8"/><ellipse cx="6" cy="9" rx="40" ry="5" fill="url(#tp1)"/></g>`; };
const sfx = (txt, x, y, tam, rot = 0, claro = false) => `<g transform="translate(${x} ${y}) rotate(${rot})"><text class="m-sfx" text-anchor="middle" style="font:900 italic ${tam}px Impact,'Arial Black','Helvetica Neue',sans-serif;letter-spacing:2px" fill="${claro ? PAPEL : INK}" stroke="${claro ? INK : PAPEL}" stroke-width="${tam / 7}" paint-order="stroke" stroke-linejoin="round">${txt}</text></g>`;
const estrela = (x, y, s, cor = PAPEL) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="m-brilha" d="M0-12Q1.6-1.6 12 0Q1.6 1.6 0 12Q-1.6 1.6-12 0Q-1.6-1.6 0-12z" fill="${cor}" stroke="${INK}" stroke-width="1.2"/></g>`;
const balao = (x, y, w, h, txt, cx, cy) => `<g><path d="M${x + w * .3} ${y + h * .86}L${cx} ${cy}L${x + w * .5} ${y + h * .9}z" fill="${PAPEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${PAPEL}" stroke="${INK}" stroke-width="3.4"/><path d="M${x + w * .32} ${y + h * .84}L${x + w * .5} ${y + h * .9}" stroke="${PAPEL}" stroke-width="5"/><text x="${x + w / 2}" y="${y + h / 2 + 6}" text-anchor="middle" style="font:800 19px 'Noto Sans','Hiragino Kaku Gothic ProN',system-ui,sans-serif" fill="${INK}">${txt}</text></g>`;

/* ---------- personagens em tinta ---------- */
const sw = s => Math.max(1, 3.4 / s);
const costas = (x, y, s = 1, o = {}) => { const B = { baixo: [[-6, -26, -9, -13], [6, -26, 9, -13]], alto: [[-6, -26, -9, -13], [6, -26, 12, -44]], ambos: [[-6, -26, -12, -44], [6, -26, 12, -44]] }[o.braco ?? "baixo"], w = sw(s);
  const braco = ([a, b, c, d]) => `<path d="M${a} ${b}L${c} ${d}" stroke="${INK}" stroke-width="${5.2 + w}" stroke-linecap="round"/><path d="M${a} ${b}L${c} ${d}" stroke="${PAPEL}" stroke-width="${5.2 - w * .4}" stroke-linecap="round"/><circle cx="${c}" cy="${d}" r="2.4" fill="${PAPEL}" stroke="${INK}" stroke-width="${w * .8}"/>`;
  const cajado = o.cajado ? (() => { const [, , hx, hy] = B[1]; return `<path d="M${hx} ${hy - 12}V${hy + 40}" stroke="${INK}" stroke-width="${2.6 + w}" stroke-linecap="round"/><path d="M${hx} ${hy - 12}V${hy + 40}" stroke="${PAPEL}" stroke-width="1" stroke-linecap="round"/>`; })() : "";
  return `<g transform="translate(${x} ${y}) scale(${s * (o.flip ? -1 : 1)} ${s})" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"><ellipse cy="1" rx="13" ry="2.6" fill="${INK}" stroke="none" opacity=".4"/><g class="${o.mov ? "m-anda" : ""}" style="${o.at ? `animation-delay:-${o.at}s` : ""}">
  <path d="M-9 -28Q-15 -12 -14 0H14Q15 -12 9 -28Z" fill="${PAPEL}"/><path d="M-9 -28Q-15 -12 -14 0H-3Q-4 -14 -9 -28Z" fill="url(#tp1)" stroke="none"/>
  <path d="M-7.5 -29Q-10.5 -12 -9.5 0H9.5Q10.5 -12 7.5 -29Q0 -32 -7.5 -29Z" fill="${PAPEL}"/><path d="M2 -30Q4 -14 4 0H9.5Q10.5 -12 7.5 -29Z" fill="url(#tp2)" stroke="none"/>
  <path d="M-3 -25Q-2 -12 -4 -1M5 -22Q6 -10 5 -1" fill="none" stroke-width="${w * .7}"/><path d="M-8.6 -17Q0 -14.6 8.6 -17" fill="none"/>
  ${B.map(braco).join("")}${cajado}
  <circle cy="-35.5" r="5.4" fill="${PAPEL}"/>
  <path d="M-6.4 -35Q-7.4 -45 0 -44.6Q7.4 -45 6.4 -35Q4.6 -31 0 -31.6Q-4.6 -31 -6.4 -35Z" fill="${INK}"/>
  <path class="m-vento" d="M4 -40Q14 -39 18 -30Q10 -34 4 -33Z" fill="${INK}"/></g></g>`; };
const sil = (x, y, s = 1, o = {}) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${INK}"><g class="${o.mov ? "m-anda" : ""}" style="${o.at ? `animation-delay:-${o.at}s` : ""}"><path d="M-8 -26Q-13 -12 -12 0H12Q13 -12 8 -26Q0 -30 -8 -26Z"/><circle cy="-33" r="5.4"/>${o.braco ? `<path d="M6 -24L11 -42" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M-6 -24L-11 -42" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>` : ""}${o.cajado ? `<path d="M11 -40V4" stroke="${INK}" stroke-width="2.4"/>` : ""}</g></g>`;
const olho = (cx, cy, w, flip = false, rug = 0) => `<g transform="translate(${cx} ${cy}) scale(${(flip ? -1 : 1) * w / 110} ${w / 110})">
  <path d="M-66 -52Q-8 -86 70 -52Q20 -62-62 -44z" fill="${INK}"/><path d="M-58 -10Q-30 -52 12 -46Q48 -40 62 -6" fill="none" stroke="${INK}" stroke-width="2.6"/>
  <path d="M-52 6Q-30 -34 10 -30Q42 -26 58 4Q30 2 4 4Q-24 6-52 6z" fill="${PAPEL}"/>
  <circle cx="8" cy="-6" r="23" fill="${INK}"/><circle cx="-1" cy="-15" r="8.5" fill="${PAPEL}"/><circle cx="17" cy="5" r="3.6" fill="${PAPEL}"/>
  ${Array.from({ length: 14 }, (_, i) => { const a = i * Math.PI * 2 / 14; return `<path d="M${8 + Math.cos(a) * 8} ${-6 + Math.sin(a) * 8}L${8 + Math.cos(a) * 20} ${-6 + Math.sin(a) * 20}" stroke="${PAPEL}" stroke-width=".9" opacity=".7"/>`; }).join("")}
  <path d="M-56 -2Q-28 -40 10 -34Q44 -30 62 2" fill="none" stroke="${INK}" stroke-width="7.5" stroke-linecap="round"/>
  <path d="M-48 10Q0 28 56 8" fill="none" stroke="${INK}" stroke-width="2.2"/>
  ${rug ? `<path d="M-40 22l-10 8M-24 28l-8 10M-4 30l-4 10M16 29l2 10M36 24l8 9" stroke="${INK}" stroke-width="1.4"/>` : ""}</g>`;
const carro = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${INK}"><g class="m-galope"><ellipse cx="22" cy="-26" rx="24" ry="11"/><path d="M40 -32Q54 -40 58 -56L66 -54Q74 -52 70 -46L60 -42Q58 -30 50 -22z"/><path d="M-2 -28Q-14 -26 -20 -14Q-14 -20 -2 -20z"/>
  <path d="M8 -20L-2 0M16 -18L10 2M34 -18L44 -2M42 -22L54 -8" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><path d="M60 -56L58 -66 64 -60z"/></g>
  <path d="M-62 -18H-18L-12 -40H-66z"/><g class="m-roda" style="transform-origin:-40px 0px"><circle cx="-40" cy="0" r="16" fill="${INK}"/><circle cx="-40" cy="0" r="12" fill="${PAPEL}"/>${[0, 45, 90, 135].map(a => `<path d="M-40 -12V12" stroke="${INK}" stroke-width="1.6" transform="rotate(${a} -40 0)"/>`).join("")}<circle cx="-40" cy="0" r="3" fill="${INK}"/></g></g>`;

/* ---------- quadros ---------- */
const P = (pts, conteudo) => ({ pts, conteudo });
const box = pts => { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; };

const mar = {
  t: "O mar se abre", ref: "Êxodo 14",
  paineis: [
    P([[24, 24], [576, 24], [576, 262], [24, 262]], `<rect x="24" y="24" width="552" height="238" fill="${PAPEL}"/>
      ${foco(470, 108, 46, 520, 54, 3, .03)}${sol(470, 108, 30)}
      <path d="M24 200L84 154 130 178 206 124 262 172 336 142 414 180 500 150 576 192V262H24Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3"/><path d="M206 124L262 172 336 142 414 180 340 210 206 210Z" fill="url(#hat)" opacity=".8"/>
      ${nuv(112, 74, 1.2)}${nuv(332, 56, .85)}
      <path d="M24 218Q150 194 300 216T576 208V262H24Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3"/>
      <g class="m-pulsa"><path d="M150 214Q138 150 154 110 144 70 160 18L198 18Q210 70 196 110 212 150 198 214Z" fill="${PAPEL}" stroke="${INK}" stroke-width="3.4"/><path d="M162 60Q180 54 190 70M158 100Q182 92 194 108M156 140Q180 134 196 150M158 180Q180 172 196 188" fill="none" stroke="${INK}" stroke-width="1.6"/><path d="M150 214Q138 150 154 110 144 70 160 18L172 18Q158 70 168 110 156 150 168 214Z" fill="url(#tp1)"/></g>
      <path d="M24 244Q200 230 340 244T576 238V262H24Z" fill="${INK}"/>
      <g class="m-marcha">${Array.from({ length: 13 }, (_, i) => sil(250 + i * 30 + (i % 3) * 5, 238 + (i % 2) * 8, .95 + (i % 2) * .15, { mov: true, at: i * .13, cajado: i % 4 === 0 })).join("")}</g>
      ${sfx("ZAK ZAK ZAK", 120, 252, 24, -3, true)}`),
    P([[24, 274], [300, 274], [284, 520], [24, 520]], `<rect x="24" y="274" width="280" height="246" fill="${PAPEL}"/><rect x="24" y="274" width="280" height="246" fill="url(#tp1)"/>
      ${velo(24, 300, 286, 500, 16, 5)}
      ${nuv(70, 470, 2.4)}${nuv(176, 486, 2.8)}${nuv(262, 462, 2)}
      ${carro(138, 440, 1.5)}${carro(246, 484, 1.9)}${carro(70, 404, 1.2)}
      <path d="M24 500H300" stroke="${INK}" stroke-width="4"/><rect x="24" y="500" width="280" height="20" fill="url(#tp3)"/>
      ${sfx("DADADADA", 112, 330, 46, -7)}`),
    P([[312, 274], [576, 274], [576, 520], [296, 520]], `<rect x="296" y="274" width="280" height="246" fill="${PAPEL}"/>
      ${foco(436, 420, 54, 340, 60, 8, .035)}
      ${olho(382, 424, 124, false, 1)}${olho(504, 424, 124, true, 1)}
      <path d="M432 410Q444 460 436 500" fill="none" stroke="${INK}" stroke-width="2.4"/>
      ${balao(330, 284, 224, 66, "Não temais!", 400, 372)}
      ${sfx("TUM!", 536, 506, 30, 8)}`),
    P([[24, 532], [576, 532], [576, 690], [24, 690]], `<rect x="24" y="532" width="552" height="158" fill="${INK}"/>
      ${Array.from({ length: 46 }, (_, i) => { const r = rng(i + 4); return `<circle class="m-brilha" style="animation-delay:-${r() * 2}s" cx="${40 + r() * 520}" cy="${540 + r() * 100}" r="${.8 + r() * 1.4}" fill="${PAPEL}"/>`; }).join("")}
      <circle cx="486" cy="586" r="26" fill="${PAPEL}"/><circle cx="478" cy="580" r="7" fill="#d9d4c4"/>
      ${velo(24, 576, 548, 684, 26, 9, PAPEL)}
      <path d="M270 690Q300 664 340 672T440 668T576 676V690Z" fill="${PAPEL}"/>${[0, 1, 2, 3].map(i => `<path class="m-onda2" style="animation-delay:-${i * .6}s" d="M${260 + i * 30} ${676 + i * 3}q14-8 28 0t28 0t28 0" fill="none" stroke="${INK}" stroke-width="2"/>`).join("")}
      <circle cx="168" cy="600" r="70" fill="url(#tpw)"/>${costas(168, 704, 3.7, { braco: "alto", cajado: true })}
      ${sfx("GOOOOOO", 388, 640, 40, -4, true)}`),
    P([[24, 702], [400, 702], [384, 876], [24, 876]], `<rect x="24" y="702" width="376" height="174" fill="${PAPEL}"/>
      <path d="M24 702L186 742V806L24 876Z" fill="${PAPEL}"/><path d="M400 702L238 742V806L384 876Z" fill="${PAPEL}"/>
      ${foco(212, 780, 14, 330, 70, 11, .03)}
      <path d="M24 702L190 738V806L24 876Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3.4"/><path d="M400 702L234 738V806L384 876Z" fill="url(#tp2)" stroke="${INK}" stroke-width="3.4"/>
      <path d="M24 702L190 738V806L24 876Z" fill="url(#hat2)" opacity=".5"/><path d="M400 702L234 738V806L384 876Z" fill="url(#hat2)" opacity=".5"/>
      ${[0, 1, 2, 3, 4].map(i => `<path class="m-onda2" style="animation-delay:-${i * .5}s" d="M${30 + i * 24} ${730 + i * 22}q10-8 20 0t20 0" fill="none" stroke="${PAPEL}" stroke-width="2"/><path class="m-onda2" style="animation-delay:-${i * .4}s" d="M${380 - i * 24} ${730 + i * 22}q-10-8-20 0t-20 0" fill="none" stroke="${PAPEL}" stroke-width="2"/>`).join("")}
      ${[[60, 760, 1], [110, 790, .9], [330, 770, .9], [360, 812, 1.1], [90, 836, 1.2]].map(([x, y, s], i) => `<g class="m-nada" style="animation-delay:-${i}s"><path d="M${x - 12 * s} ${y}q10-8 22 0q-10 8-22 0zM${x + 10 * s} ${y}l9-6v12z" fill="${INK}"/></g>`).join("")}
      <path d="M190 806L234 806 262 876H140Z" fill="${PAPEL}"/><circle cx="212" cy="776" r="12" fill="${PAPEL}" stroke="${INK}" stroke-width="2"/>
      <g class="m-marcha2">${Array.from({ length: 9 }, (_, i) => { const t = i / 9; return sil(212 + (i % 2 ? 10 : -10) * (1 - t) + (i % 3 - 1) * 4, 868 - t * 78, 1.7 * (1 - .62 * t), { mov: true, at: i * .15, cajado: i % 3 === 0 }); }).join("")}</g>
      ${sfx("ZAAAAA", 100, 724, 24, -5)}`),
    P([[412, 702], [576, 702], [576, 876], [396, 876]], `<rect x="396" y="702" width="180" height="174" fill="${PAPEL}"/>
      ${foco(494, 770, 36, 240, 48, 14, .04)}${sol(494, 772, 22)}
      ${estrela(436, 728, 1.1)}${estrela(560, 740, .9)}${estrela(524, 836, 1)}${estrela(430, 800, .8)}
      ${[0, 1, 2].map(i => sil(444 + i * 44, 882, 1.7 - i * .1, { braco: true, mov: true, at: i * .2 })).join("")}`)
  ],
  beats: [
    { fala: "Israel saiu do Egito, libertado da escravidão. Deus guiava o povo de dia numa coluna de nuvem e, de noite, numa coluna de fogo.", p: [0] },
    { fala: "Mas o faraó mudou de ideia e saiu atrás deles com os seus carros de guerra. O povo, acuado diante do Mar Vermelho, teve medo. Moisés respondeu: não temais, parai e vede o livramento do Senhor.", p: [1, 2] },
    { fala: "Então Moisés estendeu a mão sobre o mar. Durante toda aquela noite, o Senhor o fez retirar-se por um forte vento oriental, e as águas se dividiram.", p: [3] },
    { fala: "O povo de Israel atravessou em terra seca, tendo as águas como muralha à direita e à esquerda. Ao amanhecer, as águas voltaram, e Israel viu o grande poder do Senhor.", p: [4, 5] }
  ]
};
mar.n = mar.beats.map(b => b.fala).join(" ");

// monta a página inteira (papel, moldes dos quadros e quadros com clip)
const pagina = m => `${DEFS}<rect width="600" height="900" fill="#efe7d3"/><rect x="8" y="8" width="584" height="884" fill="#f6f0e0" stroke="${INK}" stroke-width="1.5"/>
${m.paineis.map((q, i) => `<polygon points="${q.pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="#14110f33" stroke-width="2" stroke-dasharray="6 6"/>`).join("")}
<defs>${m.paineis.map((q, i) => `<clipPath id="cp${i}"><polygon points="${q.pts.map(p => p.join(",")).join(" ")}"/></clipPath>`).join("")}</defs>
${m.paineis.map((q, i) => `<g class="m-painel" data-i="${i}"><g clip-path="url(#cp${i})">${q.conteudo}</g><polygon points="${q.pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="miter"/></g>`).join("")}`;

window.MANGA = { lista: [mar], pagina, box };
})();
