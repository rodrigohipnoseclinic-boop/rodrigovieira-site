// Mini animações de passagens bíblicas mostradas ao vencer uma fase. SVG puro, animado por CSS (ver style.css, ".cena").
(() => {
const estrelas = pts => `<g fill="#f6efe0" opacity=".8">${pts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("")}</g>`;
const POMBA = `<g><ellipse cx="0" cy="0" rx="11" ry="6" fill="#fff"/><circle cx="10" cy="-4" r="4.2" fill="#fff"/><path d="M13.5 -4.5l5 1.5-5 1.5z" fill="#e8c76a"/><path class="a-asa" d="M-2 -3q-8-15-21-12 5 7 11 15z" fill="#e9eef7"/><path d="M-10 2l-9 5 11-1z" fill="#e9eef7"/></g>`;
const NOITE = `<rect width="300" height="150" fill="#16203d"/>`;
const CRE = `<rect width="300" height="150" fill="#22335a"/>`;

window.CENAS = {
  lista: [
    { t: "O mar se abre", n: "Êxodo, capítulo 14. Diante do Mar Vermelho, Deus abriu o caminho, e o povo de Israel atravessou a pé enxuto, com as águas como muralhas dos dois lados.", ref: "Êxodo 14", svg: `${CRE}<circle cx="256" cy="30" r="13" fill="#e8c76a"/><rect y="118" width="300" height="32" fill="#c9a24b" opacity=".45"/>
      <g class="a-mar-e"><rect x="-10" y="0" width="120" height="150" fill="#2f6fb0"/><path d="M-10 18q20-10 40 0t40 0 40 0V0H-10z" fill="#5b9bd5"/></g>
      <g class="a-mar-d"><rect x="190" y="0" width="120" height="150" fill="#2f6fb0"/><path d="M190 18q20-10 40 0t40 0 40 0V0H190z" fill="#5b9bd5"/></g>
      <g class="a-povo" fill="#f6efe0">${[0, 1, 2].map(i => `<g transform="translate(${-i * 20} 0)"><circle cx="0" cy="102" r="5"/><rect x="-4" y="108" width="8" height="16" rx="3"/></g>`).join("")}</g>` },

    { t: "A estrela guia", n: "Mateus, capítulo 2. Magos do Oriente viram uma estrela e a seguiram até encontrar o menino Jesus, para adorá-lo.", ref: "Mateus 2", svg: `${NOITE}${estrelas([[30, 22, 1.5], [90, 40, 1], [215, 18, 1.5], [272, 52, 1], [160, 10, 1]])}
      <path d="M100 150V114l50-30 50 30v36z" fill="#8a6a45"/><path d="M92 116l58-36 58 36z" fill="#6b4f31"/><rect x="136" y="122" width="28" height="28" rx="3" fill="#e8c76a" opacity=".85"/>
      <g class="a-estrela-pos"><g class="a-estrela"><circle r="34" fill="#e8c76a" opacity=".16"/><path d="M0-24L5-7 24 0 5 7 0 24-5 7-24 0-7-7z" fill="#e8c76a"/></g></g>` },

    { t: "O arco-íris da aliança", n: "Gênesis, capítulo 9. Depois do dilúvio, Deus colocou o arco-íris nas nuvens como sinal da sua aliança: as águas nunca mais destruiriam toda a vida.", ref: "Gênesis 9", svg: `${CRE}${["#e05a4f", "#f2a03c", "#f2d04a", "#5aa37d", "#5b86c9", "#8a6cc0"].map((c, i) => `<path class="a-arco" style="animation-delay:${i * .25}s" pathLength="1" d="M${40 + i * 8} 128A${110 - i * 8} ${92 - i * 8} 0 0 1 ${260 - i * 8} 128" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("")}
      <path d="M118 128h64l-9 14h-46z" fill="#8a6a45"/><rect x="136" y="116" width="28" height="12" rx="2" fill="#a07a4f"/>
      <g class="a-voa" transform="translate(0 40)">${POMBA}</g>` },

    { t: "A sarça que ardia", n: "Êxodo, capítulo 3. Moisés viu uma sarça que ardia em fogo e não se consumia. Dali, Deus o chamou para libertar o seu povo.", ref: "Êxodo 3", svg: `<rect width="300" height="150" fill="#2b2238"/><rect y="124" width="300" height="26" fill="#6b4f31"/>
      <circle class="a-brilho" cx="150" cy="92" r="52" fill="#f2a03c" opacity=".25"/>
      <g fill="#3f7a4f"><circle cx="128" cy="108" r="18"/><circle cx="150" cy="100" r="22"/><circle cx="173" cy="108" r="18"/></g>
      ${[[132, 90, 1], [150, 70, 1.35], [168, 88, 1.1], [142, 82, .8], [158, 82, .9]].map(([x, y, k], i) => `<path class="a-chama" style="animation-delay:${i * .17}s" d="M${x} ${y + 30 * k}q-14-14-5-26 3 6 6 3 0-12 8-22 4 16 10 24 4 10-4 21z" fill="${i % 2 ? "#f2d04a" : "#f2a03c"}"/>`).join("")}` },

    { t: "Jesus acalma a tempestade", n: "Marcos, capítulo 4. No meio de uma forte tempestade, Jesus se levantou e ordenou que o vento e o mar se aquietassem. E houve grande calmaria.", ref: "Marcos 4", svg: `<rect width="300" height="150" fill="#3a4766"/>
      <g class="a-ceu-fim"><rect width="300" height="150" fill="#6fa7d8"/><circle cx="240" cy="36" r="16" fill="#f2d04a"/></g>
      <g class="a-nuvens" fill="#252f48"><ellipse cx="70" cy="28" rx="60" ry="20"/><ellipse cx="170" cy="22" rx="70" ry="22"/><ellipse cx="250" cy="34" rx="50" ry="18"/>
        <g stroke="#9db4d8" stroke-width="1.5" opacity=".7">${Array.from({ length: 14 }, (_, i) => `<path d="M${20 + i * 20} 50l-6 16"/>`).join("")}</g></g>
      <g class="a-barco"><path d="M118 104h64l-10 16h-44z" fill="#8a6a45"/><rect x="148" y="66" width="3" height="38" fill="#6b4f31"/><path d="M152 68l24 28h-24z" fill="#f6efe0"/></g>
      <path d="M0 118q18-10 37 0t38 0 38 0 38 0 38 0 38 0 38 0 37 0V150H0z" fill="#2f6fb0"/><path class="a-onda" d="M0 128q18-8 37 0t38 0 38 0 38 0 38 0 38 0 38 0 37 0V150H0z" fill="#245a93"/>` },

    { t: "Cinco pães e dois peixes", n: "João, capítulo 6. Com cinco pães e dois peixes de um menino, Jesus alimentou uma multidão, e ainda sobraram doze cestos.", ref: "João 6", svg: `<rect width="300" height="150" fill="#2c3b2f"/><rect y="118" width="300" height="32" fill="#4d6b3d"/>
      <path d="M92 106h116l-14 34H106z" fill="#a07a4f"/><path d="M92 106h116" stroke="#6b4f31" stroke-width="4"/>
      ${Array.from({ length: 10 }, (_, i) => `<ellipse class="a-pao" style="animation-delay:${.15 * i}s" cx="${112 + (i % 5) * 19}" cy="${i < 5 ? 96 : 80}" rx="10" ry="7" fill="${i % 2 ? "#e0a84e" : "#c9892f"}"/>`).join("")}
      ${[0, 1].map(i => `<g transform="translate(${34 + i * 34} ${44 + i * 12})"><g class="a-pao" style="animation-delay:${1.7 + i * .2}s"><ellipse rx="13" ry="6" fill="#8fb8de"/><path d="M12 0l9-6v12z" fill="#8fb8de"/><circle cx="-7" cy="-1" r="1.4" fill="#16203d"/></g></g>`).join("")}` },

    { t: "O Espírito como pomba", n: "Mateus, capítulo 3. Quando Jesus foi batizado no Jordão, os céus se abriram e o Espírito de Deus desceu como uma pomba sobre ele.", ref: "Mateus 3", svg: `<rect width="300" height="150" fill="#3b5d8a"/><g class="a-raios" opacity=".5">${Array.from({ length: 7 }, (_, i) => `<path d="M150 0L${70 + i * 27} 150H${86 + i * 27}z" fill="#f2e6b0"/>`).join("")}</g>
      <rect y="112" width="300" height="38" fill="#2f6fb0"/>${[0, 1, 2].map(i => `<ellipse class="a-onda-anel" style="animation-delay:${i * .8}s" cx="150" cy="124" rx="40" ry="7" fill="none" stroke="#bcd6f2" stroke-width="2"/>`).join("")}
      <g class="a-desce"><g transform="translate(150 0) scale(1.5)">${POMBA}</g></g>` },

    { t: "A escada de Jacó", n: "Gênesis, capítulo 28. Jacó sonhou com uma escada apoiada na terra, que chegava ao céu, e anjos de Deus subiam e desciam por ela.", ref: "Gênesis 28", svg: `${NOITE}${estrelas([[26, 20, 1.5], [70, 50, 1], [230, 24, 1.5], [270, 70, 1], [190, 12, 1], [40, 90, 1]])}
      <circle cx="205" cy="26" r="26" fill="#e8c76a" opacity=".12"/>
      <path d="M118 142L186 22M136 142L204 22" stroke="#c9a24b" stroke-width="3"/>${Array.from({ length: 8 }, (_, i) => { const t = (i + .5) / 8; return `<path d="M${127 - 9 + 68 * t + 0} ${142 - 120 * t}h18" stroke="#c9a24b" stroke-width="2.5" transform="translate(${0} 0)"/>`; }).join("")}
      <path d="M96 150q24-18 50 0z" fill="#3a2f26"/>
      ${[0, 1, 2].map(i => `<g class="${i === 1 ? "a-anjo-desce" : "a-anjo-sobe"}" style="animation-delay:${i * 1.1}s"><g transform="translate(127 142)"><circle cy="-8" r="4" fill="#fff"/><path d="M0-4l-9 3 9 9 9-9z" fill="#fff" opacity=".9"/></g></g>`).join("")}` },

    { t: "As muralhas de Jericó", n: "Josué, capítulo 6. O povo marchou ao redor de Jericó e, ao som das trombetas e do grito, as muralhas caíram.", ref: "Josué 6", svg: `<rect width="300" height="150" fill="#3a2f4a"/><circle cx="60" cy="34" r="12" fill="#f2d04a" opacity=".9"/><rect y="126" width="300" height="24" fill="#6b4f31"/>
      ${Array.from({ length: 18 }, (_, i) => { const r = Math.floor(i / 6), c = i % 6; return `<rect class="a-bloco" style="animation-delay:${.35 + (i * 37 % 11) * .09}s" x="${72 + c * 26 + (r % 2) * 10}" y="${102 - r * 24}" width="24" height="22" rx="2" fill="${(r + c) % 2 ? "#b08d5a" : "#a07a4f"}"/>`; }).join("")}
      ${[0, 1, 2].map(i => `<circle class="a-poeira" style="animation-delay:${1 + i * .25}s" cx="${100 + i * 50}" cy="120" r="14" fill="#d9c3a0"/>`).join("")}` },
  ],
  especial: { t: "A pedra removida", n: "Lucas, capítulo 24. Na madrugada do primeiro dia da semana, as mulheres encontraram a pedra removida do túmulo. Jesus havia ressuscitado.", ref: "Lucas 24", svg: `<rect width="300" height="150" fill="#2b2a4a"/><g class="a-aurora"><rect width="300" height="150" fill="#f2c27a" opacity=".35"/></g>
      <path d="M0 150V96q40-20 80-10l60 14 80-18 80 14v54z" fill="#4a3f3a"/><path d="M112 150V96q38-38 76 0v54z" fill="#16131f"/>
      <g class="a-luz"><circle cx="150" cy="112" r="26" fill="#f6e6a6"/>${Array.from({ length: 8 }, (_, i) => `<path d="M150 112L${150 + 110 * Math.cos(i * Math.PI / 4)} ${112 + 110 * Math.sin(i * Math.PI / 4)}" stroke="#f6e6a6" stroke-width="4" opacity=".45"/>`).join("")}</g>
      <g class="a-pedra"><circle cx="150" cy="116" r="30" fill="#8a8794"/><path d="M132 106q10-12 26-6" stroke="#a9a6b4" stroke-width="3" fill="none"/></g>` }
};
})();
