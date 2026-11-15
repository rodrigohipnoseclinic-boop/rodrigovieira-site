(() => {
"use strict";
const D = window.DADOS;
const $ = (s, el = document) => el.querySelector(s);
const view = $("#view"), appEl = $("#app");

/* ---------- utilidades ---------- */
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad2 = n => String(n).padStart(2, "0");
const dataStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const diaIdx = (ds = dataStr()) => { const [y, m, d] = ds.split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 864e5); };
const addDias = (ds, n) => { const [y, m, d] = ds.split("-").map(Number); return dataStr(new Date(y, m - 1, d + n)); };

/* limpeza de timers ao sair de uma tela */
let limpezas = [];
const aoSair = fn => limpezas.push(fn);
const limpar = () => { limpezas.forEach(f => { try { f(); } catch (e) {} }); limpezas = []; };
const later = (fn, ms) => { const t = setTimeout(fn, ms); aoSair(() => clearTimeout(t)); return t; };

/* ---------- armazenamento ---------- */
const KEY = "mente_renovada_v1";
let store = { hist: [] };
try { store = Object.assign(store, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };

/* ---------- som ---------- */
let ac;
function bip(freq, dur = 0.18) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq; o.type = "sine"; o.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.start(); o.stop(ac.currentTime + dur + 0.02);
  } catch (e) {}
}

/* ---------- jogos ---------- */
const CATS = ["Memória", "Atenção", "Linguagem", "Raciocínio", "Conhecimento"];

// Jogo de múltipla escolha genérico
function jogoEscolha({ stage, progresso, terminar, rodadas, fazer, tempo }) {
  let i = 0, acertos = 0;
  function proxima() {
    if (i >= rodadas) return terminar(Math.round(acertos / rodadas * 100));
    progresso(i, rodadas);
    const q = fazer(i);
    const ordem = shuffle(q.opcoes.map((t, k) => ({ t, ok: k === q.certa })));
    stage.innerHTML = `
      ${tempo ? `<div class="tempo"><i style="animation-duration:${tempo}s"></i></div>` : ""}
      <div class="enun">${q.enun}</div>
      <div class="ops">${ordem.map((o, k) => `<button class="op" data-k="${k}">${esc(o.t)}</button>`).join("")}</div>
      <div id="fb"></div>`;
    let respondida = false;
    const resolver = (k) => {
      if (respondida) return; respondida = true; clearTimeout(tt);
      const ok = k >= 0 && ordem[k].ok;
      if (ok) { acertos++; bip(660, .15); } else bip(180, .25);
      stage.querySelectorAll(".op").forEach((b, n) => {
        b.disabled = true;
        if (ordem[n].ok) b.classList.add("certo"); else if (n === k) b.classList.add("errado");
      });
      const t = $(".tempo i", stage); if (t) t.style.animationPlayState = "paused";
      const msg = (k < 0 ? "Tempo esgotado. " : ok ? "Muito bem! " : "Quase! ") + (q.explica || "");
      $("#fb", stage).innerHTML = `<div class="feedback ${ok ? "ok" : "erro"}">${msg}</div><div class="espaco"></div><button class="btn" id="seg">Continuar</button>`;
      $("#seg", stage).onclick = () => { i++; proxima(); };
      $("#seg", stage).focus({ preventScroll: true });
    };
    const tt = tempo ? setTimeout(() => resolver(-1), tempo * 1000) : 0;
    aoSair(() => clearTimeout(tt));
    stage.querySelectorAll(".op").forEach(b => b.onclick = () => resolver(+b.dataset.k));
  }
  proxima();
}

const JOGOS = {
  versiculo: {
    nome: "Complete o Versículo", cat: "Memória", ico: "📖", desc: "Descubra a palavra que falta.",
    iniciar(c) {
      const vs = sample(D.versiculos, 6);
      jogoEscolha({ ...c, rodadas: 6, tempo: [0, 0, 30][c.nivel - 1], fazer: i => {
        const v = vs[i], correta = v.r, ops = [correta, ...sample(v.ops, 3)];
        const completo = v.t.replace("___", correta);
        return { enun: `<small>${esc(v.ref)}</small>${esc(v.t).replace("___", '<b style="color:var(--ouro)">_____</b>')}`,
          opcoes: ops, certa: 0, explica: `<i>${esc(completo)}</i> — ${esc(v.ref)}` };
      } });
    }
  },

  quiz: {
    nome: "Quiz Bíblico", cat: "Conhecimento", ico: "❓", desc: "Quanto você conhece das Escrituras?",
    iniciar(c) {
      const qs = sample(D.quiz, 8);
      jogoEscolha({ ...c, rodadas: 8, tempo: [0, 25, 15][c.nivel - 1], fazer: i => ({ enun: esc(qs[i].p), opcoes: qs[i].o, certa: 0, explica: `Resposta: <b>${esc(qs[i].o[0])}</b>.` }) });
    }
  },

  intruso: {
    nome: "Quem não pertence?", cat: "Raciocínio", ico: "🔎", desc: "Encontre o intruso do grupo.",
    iniciar(c) {
      const seg = [14, 10, 7][c.nivel - 1];
      const gs = sample(D.grupos, 8);
      jogoEscolha({ ...c, rodadas: 8, tempo: seg, fazer: i => {
        const g = gs[i], membros = sample(g.m, 3), intruso = pick(g.f);
        return { enun: "<small>Qual deles NÃO pertence ao grupo?</small>", opcoes: [intruso, ...membros], certa: 0,
          explica: `<b>${esc(intruso)}</b> não é um dos ${esc(g.nome)}.` };
      } });
    }
  },

  calculo: {
    nome: "Cálculo dos Números", cat: "Atenção", ico: "🔢", desc: "Contas rápidas com números bíblicos.",
    iniciar(c) {
      const seg = [14, 11, 9][c.nivel - 1];
      const modelos = [
        () => { const a = pick([2, 3, 5, 7, 12]), b = pick([2, 3, 5, 7]); return [`Jesus tinha ${a} discípulos próximos e chamou mais ${b}. Quantos são ao todo?`, a + b]; },
        () => { const a = pick([5, 12, 40]), b = pick([2, 3, 5]); return [`Cada um dos ${a} homens recebeu ${b} pães. Quantos pães ao todo?`, a * b]; },
        () => { const t = 40, p = pick([7, 12, 15, 21, 25]); return [`O jejum durou ${t} dias. Se já passaram ${p}, quantos dias faltam?`, t - p]; },
        () => { const a = pick([12, 24, 30, 36]), b = pick([2, 3, 4, 6]); return [`${a} pessoas se dividem em grupos de ${b}. Quantos grupos?`, a / b]; },
        () => { const a = 5, b = 2, k = pick([2, 3, 4]); return [`Em cada cesto há ${a} pães e ${b} peixes. Quantos alimentos em ${k} cestos?`, (a + b) * k]; },
        () => { const a = pick([10, 12, 40, 70]), b = pick([3, 5, 7, 9]); return [`${a} + ${b} − 2 = ?`, a + b - 2]; }
      ];
      jogoEscolha({ ...c, rodadas: 8, tempo: seg, fazer: () => {
        const [enun, r] = pick(modelos.slice(0, c.nivel === 1 ? 4 : 6))();
        const ops = new Set([r]);
        while (ops.size < 4) { const d = r + pick([-10, -5, -3, -2, -1, 1, 2, 3, 5, 10]); if (d > 0) ops.add(d); }
        return { enun: esc(enun), opcoes: [...ops].map(String), certa: 0, explica: `Resposta: <b>${r}</b>.` };
      } });
    }
  },

  pares: {
    nome: "Pares da Palavra", cat: "Memória", ico: "🃏", desc: "Una cada símbolo à sua história.",
    iniciar({ stage, progresso, terminar, nivel }) {
      const n = [4, 6, 8][nivel - 1], cols = n === 8 ? 4 : n === 6 ? 4 : 4;
      const ps = sample(D.pares, n);
      const cartas = shuffle(ps.flatMap((p, id) => [{ id, tipo: "e", txt: p.e }, { id, tipo: "n", txt: p.n }]));
      stage.innerHTML = `<div class="stats"><span id="jg">Jogadas: 0</span><span id="pr">Pares: 0/${n}</span></div>
        <div class="grade" style="grid-template-columns:repeat(${cols},1fr)">${cartas.map((c, k) =>
        `<button class="carta" data-k="${k}" aria-label="Carta"><div class="face costas">✦</div><div class="face frente ${c.tipo === "e" ? "emoji" : ""}">${esc(c.txt)}</div></button>`).join("")}</div>
        <p class="pequeno" style="text-align:center;margin-top:14px">Toque em duas cartas: um símbolo e a história a que pertence.</p>`;
      progresso(0, 1);
      let abertas = [], jogadas = 0, achados = 0, trava = false;
      stage.querySelectorAll(".carta").forEach(el => el.onclick = () => {
        if (trava || el.classList.contains("virada")) return;
        el.classList.add("virada"); abertas.push(el); bip(520, .08);
        if (abertas.length === 2) {
          jogadas++; $("#jg", stage).textContent = "Jogadas: " + jogadas;
          const [a, b] = abertas, ca = cartas[+a.dataset.k], cb = cartas[+b.dataset.k];
          if (ca.id === cb.id && ca.tipo !== cb.tipo) {
            a.classList.add("par"); b.classList.add("par"); abertas = []; achados++;
            bip(760, .15); $("#pr", stage).textContent = `Pares: ${achados}/${n}`; progresso(achados, n);
            if (achados === n) later(() => terminar(Math.max(20, Math.min(100, 100 - (jogadas - n) * 7))), 700);
          } else {
            trava = true;
            later(() => { a.classList.remove("virada"); b.classList.remove("virada"); abertas = []; trava = false; }, 900);
          }
        }
      });
    }
  },

  sequencia: {
    nome: "Sequência da Luz", cat: "Atenção", ico: "💡", desc: "Repita a ordem em que os símbolos acendem.",
    iniciar({ stage, progresso, terminar, nivel }) {
      const simb = ["🕊️", "🔥", "🌿", "⭐"], freq = [392, 440, 523, 659];
      const meta = 9;
      stage.innerHTML = `<div class="msg" id="msg"></div>
        <div class="pads">${simb.map((s, i) => `<button class="pad4" data-i="${i}" aria-label="Símbolo ${i + 1}">${s}</button>`).join("")}</div>
        <p class="pequeno" style="text-align:center">Observe a sequência e repita tocando nos símbolos.</p>`;
      const pads = [...stage.querySelectorAll(".pad4")], msg = $("#msg", stage);
      let seq = Array.from({ length: 1 + nivel }, () => rnd(4)), pos = 0, aceito = false, melhor = 0;
      const acender = (i, ms = 420) => { pads[i].classList.add("acende"); bip(freq[i], ms / 1000); later(() => pads[i].classList.remove("acende"), ms); };
      function mostrar() {
        aceito = false; pos = 0; msg.textContent = "Observe…"; progresso(seq.length - 1, meta);
        seq.forEach((s, k) => later(() => acender(s), 700 + k * 650));
        later(() => { aceito = true; msg.textContent = "Sua vez!"; }, 700 + seq.length * 650);
      }
      pads.forEach((p, i) => p.onclick = () => {
        if (!aceito) return;
        acender(i, 220);
        if (i !== seq[pos]) { aceito = false; bip(160, .4); msg.textContent = "Ops, a ordem era outra."; later(() => terminar(Math.round(Math.min(1, melhor / meta) * 100)), 1100); return; }
        if (++pos === seq.length) {
          melhor = seq.length; aceito = false;
          if (melhor >= meta) { msg.textContent = "Perfeito!"; later(() => terminar(100), 800); return; }
          msg.textContent = "Muito bem!"; seq.push(rnd(4)); later(mostrar, 900);
        }
      });
      later(mostrar, 500);
    }
  },

  ordem: {
    nome: "Ordem Certa", cat: "Raciocínio", ico: "📚", desc: "Coloque livros e acontecimentos em ordem.",
    iniciar({ stage, progresso, terminar, nivel }) {
      const tam = [4, 5, 6][nivel - 1], R = 5;
      let r = 0, erros = 0;
      function rodada() {
        if (r >= R) return terminar(Math.max(0, Math.round(100 - erros * 100 / (R * 3))));
        progresso(r, R);
        const livros = r % 2 === 0;
        const base = livros ? D.livros : D.eventos;
        // escolhe índices distintos e guarda a ordem correta
        const idx = sample(base.map((_, i) => i), tam).sort((a, b) => a - b);
        const itens = shuffle(idx.map(i => base[i]));
        const certa = idx.map(i => base[i]);
        let prox = 0;
        stage.innerHTML = `<div class="enun"><small>Rodada ${r + 1} de ${R}</small>${livros ? "Toque nos livros na ordem em que aparecem na Bíblia" : "Toque nos acontecimentos em ordem cronológica, do mais antigo ao mais recente"}</div>
          <div class="itens">${itens.map(t => `<button class="item"><span class="n"></span>${esc(t)}</button>`).join("")}</div>`;
        stage.querySelectorAll(".item").forEach(b => b.onclick = () => {
          if (b.classList.contains("feito")) return;
          const nome = b.textContent;
          if (nome === certa[prox]) {
            b.classList.add("feito"); $(".n", b).textContent = ++prox; bip(500 + prox * 60, .12);
            if (prox === certa.length) later(() => { r++; rodada(); }, 700);
          } else {
            erros++; bip(170, .2); b.classList.remove("balanca"); void b.offsetWidth; b.classList.add("balanca");
          }
        });
      }
      rodada();
    }
  },

  palavras: {
    nome: "Palavras Embaralhadas", cat: "Linguagem", ico: "🔤", desc: "Monte nomes e termos da Bíblia.",
    iniciar({ stage, progresso, terminar, nivel }) {
      const R = 6, maxLetras = [6, 8, 12][nivel - 1], lista = sample(D.palavras.filter(x => x[0].length <= maxLetras), R);
      let r = 0, pontos = 0;
      function rodada() {
        if (r >= R) return terminar(Math.round(pontos / R * 100));
        progresso(r, R);
        const [palavra, dica] = lista[r], alvo = Array.from(palavra);
        let embaralhada; do { embaralhada = shuffle(alvo); } while (embaralhada.join("") === palavra);
        let montada = [], usadas = new Set(), erros = 0, usouDica = false;
        stage.innerHTML = `<div class="enun"><small>Palavra ${r + 1} de ${R}</small>${esc(dica)}</div>
          <div class="slots" id="slots"></div><div class="letras" id="letras"></div>
          <div class="linha"><button class="btn claro" id="apaga">⌫ Apagar</button><button class="btn claro" id="dica">💡 Dica</button></div>
          <div id="fb"></div>`;
        const slots = $("#slots", stage), letras = $("#letras", stage);
        const pintar = () => {
          slots.innerHTML = alvo.map((_, i) => `<div class="slot">${montada[i] ? esc(montada[i].l) : ""}</div>`).join("");
          letras.innerHTML = embaralhada.map((l, i) => `<button class="letra ${usadas.has(i) ? "usada" : ""}" data-i="${i}">${esc(l)}</button>`).join("");
          letras.querySelectorAll(".letra").forEach(b => b.onclick = () => add(+b.dataset.i));
        };
        const avancar = pt => { pontos += pt; r++; later(rodada, 1500); };
        function add(i) {
          if (montada.length >= alvo.length) return;
          montada.push({ i, l: embaralhada[i] }); usadas.add(i); bip(480, .08); pintar();
          if (montada.length === alvo.length) {
            if (montada.map(m => m.l).join("") === palavra) {
              bip(740, .2); $("#fb", stage).innerHTML = `<div class="feedback ok">Isso! <b>${esc(palavra)}</b></div>`;
              slots.querySelectorAll(".slot").forEach(s => s.style.background = "#e3f3ea");
              avancar(usouDica ? .5 : 1);
            } else {
              erros++; bip(170, .25); slots.classList.add("erro");
              if (erros >= 2) { $("#fb", stage).innerHTML = `<div class="feedback erro">Era <b>${esc(palavra)}</b>.</div>`; avancar(0); return; }
              later(() => { slots.classList.remove("erro"); montada = []; usadas = new Set(); pintar(); }, 450);
            }
          }
        }
        $("#apaga", stage).onclick = () => { const m = montada.pop(); if (m) { usadas.delete(m.i); pintar(); } };
        $("#dica", stage).onclick = () => {
          if (montada.length >= alvo.length) return;
          // devolve letras erradas e coloca a próxima correta
          while (montada.length && montada[montada.length - 1].l !== alvo[montada.length - 1]) { usadas.delete(montada.pop().i); }
          const k = montada.length, i = embaralhada.findIndex((l, n) => l === alvo[k] && !usadas.has(n));
          if (i >= 0) { usouDica = true; add(i); }
        };
        pintar();
      }
      rodada();
    }
  }
};
/* ---------- gerador de grade (roda de letras e cruzadinha) ---------- */
const celulasDe = w => Array.from({ length: w.w.length }, (_, k) => [w.r + (w.h ? 0 : k), w.c + (w.h ? k : 0)]);
function montarGrade(palavras, todas) {
  let melhor = null;
  for (let t = 0; t < 200; t++) {
    const lista = shuffle(palavras).sort((a, b) => b.length - a.length);
    const cel = new Map(), col = [], K = (r, c) => r + "," + c;
    const poe = (w, r, c, h) => {
      for (let k = 0; k < w.length; k++) {
        const key = K(r + (h ? 0 : k), c + (h ? k : 0)), x = cel.get(key) || { ch: w[k], h: false, v: false };
        if (h) x.h = true; else x.v = true; cel.set(key, x);
      }
      col.push({ w, r, c, h });
    };
    const cabe = (w, r, c, h) => {
      const dr = h ? 0 : 1, dc = h ? 1 : 0;
      if (cel.has(K(r - dr, c - dc)) || cel.has(K(r + dr * w.length, c + dc * w.length))) return false;
      let cruz = 0;
      for (let k = 0; k < w.length; k++) {
        const rr = r + dr * k, cc = c + dc * k, x = cel.get(K(rr, cc));
        if (x) { if (x.ch !== w[k] || (h ? x.h : x.v)) return false; cruz++; }
        else if (cel.has(K(rr + dc, cc + dr)) || cel.has(K(rr - dc, cc - dr))) return false;
      }
      return cruz > 0;
    };
    poe(lista[0], 0, 0, true);
    for (const w of lista.slice(1)) {
      const cand = [];
      for (const [k, x] of cel) {
        const [r0, c0] = k.split(",").map(Number);
        for (let i = 0; i < w.length; i++) if (w[i] === x.ch) for (const h of [true, false]) {
          if (h ? x.h : x.v) continue;
          const r = h ? r0 : r0 - i, c = h ? c0 - i : c0;
          if (cabe(w, r, c, h)) cand.push([r, c, h]);
        }
      }
      if (cand.length) { const [r, c, h] = pick(cand); poe(w, r, c, h); }
    }
    const rs = col.flatMap(w => celulasDe({ ...w, w: w.w }).map(p => p[0])), cs = col.flatMap(w => celulasDe(w).map(p => p[1]));
    const area = (Math.max(...rs) - Math.min(...rs) + 1) * (Math.max(...cs) - Math.min(...cs) + 1);
    const nota = col.length * 1000 - area;
    if (!melhor || nota > melhor.nota) melhor = { nota, col, r0: Math.min(...rs), c0: Math.min(...cs), r1: Math.max(...rs), c1: Math.max(...cs) };
    if (col.length === palavras.length && t > 40) break;
    if (todas && col.length === palavras.length && area <= palavras.join("").length * 1.6) break;
  }
  const m = melhor;
  return { words: m.col.map(w => ({ w: w.w, h: w.h, r: w.r - m.r0, c: w.c - m.c0 })), rows: m.r1 - m.r0 + 1, cols: m.c1 - m.c0 + 1 };
}

const caminhoLinha = (a, b) => {
  const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]), n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  return Array.from({ length: n + 1 }, (_, i) => [a[0] + dr * i, a[1] + dc * i]);
};

function gerarCaca(palavras, n, dirs) {
  const ord = [...palavras].sort((a, b) => b.length - a.length);
  for (let t = 0; t < 100; t++) {
    const g = Array.from({ length: n }, () => Array(n).fill(null));
    let ok = true;
    for (const w of ord) {
      let pos = false;
      for (let k = 0; k < 300 && !pos; k++) {
        const [dr, dc] = pick(dirs), r = rnd(n), c = rnd(n), r2 = r + dr * (w.length - 1), c2 = c + dc * (w.length - 1);
        if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= n) continue;
        let cabe = true;
        for (let i = 0; i < w.length; i++) { const x = g[r + dr * i][c + dc * i]; if (x && x !== w[i]) { cabe = false; break; } }
        if (cabe) { for (let i = 0; i < w.length; i++) g[r + dr * i][c + dc * i] = w[i]; pos = true; }
      }
      if (!pos) { ok = false; break; }
    }
    if (ok) {
      const abc = "AEIOSRNDMTLCUPVGBFHJQXZ";
      return g.map(l => l.map(x => x || abc[rnd(abc.length)]));
    }
  }
  return null;
}

/* ---------- jornada da Roda de Letras: fases infinitas, moedas e cartões ---------- */
const VOC = window.VOCAB || [];
const cabeEm = (w, letras) => { const c = [...letras]; return [...w].every(l => { const i = c.indexOf(l); if (i < 0) return false; c.splice(i, 1); return true; }); };
let basesCache = null;
const basesRoda = () => basesCache || (basesCache = VOC.filter(w => w.length >= 4)
  .map(b => ({ b, ws: VOC.filter(w => cabeEm(w, b)) })).filter(x => x.ws.length >= 4));
const fixarNum = (n, a, b) => Math.max(a, Math.min(b, n));
function faseRoda(n, tier = 1) {
  const manual = window.PUZZLES.roda;
  if (n <= manual.length && tier === 1) return manual[n - 1].palavras;
  const m = Math.max(1, n - manual.length) + (tier - 1) * 6, L = fixarNum(4 + Math.floor((m - 1) / 6), 4, 7);
  let cand = basesRoda().filter(x => L >= 6 ? x.b.length >= 5 : x.b.length === L);
  if (!cand.length) cand = basesRoda();
  const base = cand[(m * 7 + 3) % cand.length], T = fixarNum(3 + Math.floor(m / 4), 3, 9);
  return [base.b, ...sample(base.ws.filter(w => w !== base.b), T - 1)];
}
const CARTAS = D.versiculos.map(v => ({ ref: v.ref, t: v.t.replace("___", v.r) }));
const cartaDaFase = n => n % 3 === 0 ? CARTAS[(n / 3 - 1) % CARTAS.length] : null;
const moedas = () => store.moedas == null ? 30 : store.moedas;

/* cartão de versículo como imagem, para compartilhar */
function cartaoPNG(v) {
  return new Promise(res => {
    const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const g = cv.getContext("2d"), grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#1c2a4a"); grad.addColorStop(1, "#2a3d66"); g.fillStyle = grad; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#c9a24b"; g.lineWidth = 6; g.strokeRect(50, 50, W - 100, H - 100);
    g.textAlign = "center"; g.fillStyle = "#e8c76a"; g.font = "700 64px Georgia,serif"; g.fillText("✦", W / 2, 190);
    g.fillStyle = "#f6efe0"; g.font = "italic 54px Georgia,serif";
    const pal = ("“" + v.t + "”").split(" "), linhas = []; let at = "";
    pal.forEach(w => { const t = at ? at + " " + w : w; if (g.measureText(t).width > W - 260) { linhas.push(at); at = w; } else at = t; });
    linhas.push(at);
    const lh = 82, y0 = (H - linhas.length * lh) / 2 + 20;
    linhas.forEach((l, i) => g.fillText(l, W / 2, y0 + i * lh));
    g.fillStyle = "#e8c76a"; g.font = "700 46px Georgia,serif"; g.fillText(v.ref, W / 2, y0 + linhas.length * lh + 50);
    g.fillStyle = "#aab6d3"; g.font = "32px system-ui,sans-serif"; g.fillText("Mente Renovada", W / 2, H - 110);
    cv.toBlob(res, "image/png");
  });
}
async function compartilharCartao(v) {
  const blob = await cartaoPNG(v), file = new File([blob], "versiculo.png", { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: v.ref, text: `${v.t} — ${v.ref}` }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "versiculo.png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

Object.assign(JOGOS, {
  roda: {
    nome: "Roda de Letras", cat: "Linguagem", ico: "🎡", desc: "Ligue as letras e preencha a grade.",
    iniciar({ stage, progresso, terminar, jornada }) {
      const grade = montarGrade(faseRoda(jornada ? (store.rodaN || 0) + 1 : 1 + rnd(40), jornada ? tierXP() : 1), true), palavras = grade.words.map(x => x.w);
      const cont = {};
      palavras.forEach(w => { const c = {}; [...w].forEach(l => c[l] = (c[l] || 0) + 1); for (const l in c) cont[l] = Math.max(cont[l] || 0, c[l]); });
      let letras = shuffle(Object.entries(cont).flatMap(([l, n]) => Array(n).fill(l)));
      const achadas = new Set(), reveladas = new Set(), usada = new Map();
      grade.words.forEach(w => celulasDe(w).forEach(([r, c], k) => usada.set(r + "," + c, w.w[k])));
      let erros = 0, dicas = 0, caminho = [], ativo = false, fim = false;
      const letrasTodas = Object.entries(cont).map(([l, n]) => l.repeat(n)).join("");
      const bonusValidos = VOC.filter(w => !palavras.includes(w) && cabeEm(w, letrasTodas)), bonusAchados = new Set();
      const mostra = (r, c) => reveladas.has(r + "," + c) || grade.words.some(w => achadas.has(w.w) && celulasDe(w).some(([a, b]) => a === r && b === c));
      stage.innerHTML = `<div class="faixa"><b>${jornada ? "Fase " + (store.fase || 1) : "Treino livre"}</b><span id="bn">Bônus: 0</span><span id="moe">🪙 ${moedas()}</span></div>
        <div class="xgrid" id="xg" style="--cols:${grade.cols};grid-template-columns:repeat(${grade.cols},1fr)"></div>
        <div class="atual" id="atual">&nbsp;</div>
        <div class="roda" id="roda"><button class="mistura" id="mistura" aria-label="Embaralhar letras">🔀</button></div>
        <div class="linha"><button class="btn claro" id="dica">💡 Dica (5 🪙)</button></div>`;
      const roda = $("#roda", stage), R = 88;
      const pintarGrade = () => {
        let h = "";
        for (let r = 0; r < grade.rows; r++) for (let c = 0; c < grade.cols; c++) {
          const k = r + "," + c;
          h += usada.has(k) ? `<div class="xc ${mostra(r, c) ? "on" : ""}">${mostra(r, c) ? usada.get(k) : ""}</div>` : '<div class="xc vazio"></div>';
        }
        $("#xg", stage).innerHTML = h; progresso(achadas.size, palavras.length);
      };
      const pintarRoda = () => {
        roda.querySelectorAll(".rl").forEach(e => e.remove());
        letras.forEach((l, i) => {
          const ang = -Math.PI / 2 + i * 2 * Math.PI / letras.length, b = document.createElement("div");
          b.className = "rl" + (caminho.includes(i) ? " sel" : ""); b.dataset.i = i; b.textContent = l;
          b.style.left = (125 + R * Math.cos(ang) - 26) + "px"; b.style.top = (125 + R * Math.sin(ang) - 26) + "px";
          roda.appendChild(b);
        });
        $("#atual", stage).innerHTML = caminho.length ? caminho.map(i => letras[i]).join("") : "&nbsp;";
      };
      const checar = () => {
        grade.words.forEach(w => { if (!achadas.has(w.w) && celulasDe(w).every(([r, c]) => mostra(r, c))) achadas.add(w.w); });
        pintarGrade();
        if (!fim && achadas.size === palavras.length) {
          fim = true; bip(800, .3);
          later(() => terminar(Math.max(30, 100 - dicas * 12 - Math.min(erros, 10) * 2), undefined, { bonus: bonusAchados.size }), 900);
        }
      };
      const letraEm = e => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest(".rl") : null; };
      roda.onpointerdown = e => { const l = letraEm(e); if (!l || fim) return; ativo = true; try { roda.setPointerCapture(e.pointerId); } catch (x) {} caminho = [+l.dataset.i]; bip(440 + 40 * caminho.length, .06); pintarRoda(); };
      roda.onpointermove = e => {
        if (!ativo) return; const l = letraEm(e); if (!l) return; const i = +l.dataset.i;
        if (caminho[caminho.length - 2] === i) caminho.pop(); else if (!caminho.includes(i)) { caminho.push(i); bip(440 + 40 * caminho.length, .06); } else return;
        pintarRoda();
      };
      roda.onpointerup = () => {
        if (!ativo) return; ativo = false;
        const p = caminho.map(i => letras[i]).join("");
        if (palavras.includes(p) && !achadas.has(p)) { achadas.add(p); bip(780, .2); }
        else if (bonusValidos.includes(p) && !bonusAchados.has(p)) {
          bonusAchados.add(p); bip(900, .2); $("#bn", stage).textContent = "Bônus: " + bonusAchados.size;
          $("#atual", stage).classList.add("bonus"); later(() => $("#atual", stage).classList.remove("bonus"), 500);
        }
        else if (p.length >= 3 && !bonusAchados.has(p) && !achadas.has(p)) { erros++; bip(170, .2); $("#atual", stage).classList.add("erro"); later(() => $("#atual", stage).classList.remove("erro"), 400); }
        caminho = []; pintarRoda(); checar();
      };
      roda.onpointercancel = () => { ativo = false; caminho = []; pintarRoda(); };
      $("#mistura", stage).onclick = () => { letras = shuffle(letras); caminho = []; pintarRoda(); };
      $("#dica", stage).onclick = () => {
        if (fim) return;
        if (moedas() < 5) { $("#atual", stage).textContent = "Faltam moedas"; later(pintarRoda, 1200); return; }
        const w = pick(grade.words.filter(x => !achadas.has(x.w)));
        if (!w) return; const livres = celulasDe(w).filter(([r, c]) => !mostra(r, c));
        if (!livres.length) return; const [r, c] = livres[0]; reveladas.add(r + "," + c); dicas++;
        store.moedas = moedas() - 5; salvar(); $("#moe", stage).textContent = "🪙 " + moedas(); checar();
      };
      pintarGrade(); pintarRoda();
    }
  },

  caca: {
    nome: "Caça-Palavras", cat: "Atenção", ico: "🔍", desc: "Deslize o dedo sobre as palavras escondidas.",
    iniciar({ stage, progresso, terminar, nivel }) {
      const P = pick(window.PUZZLES.caca), n = [8, 9, 10][nivel - 1], palavras = sample(P.palavras, nivel === 1 ? 4 : 5);
      const dirs = [[0, 1], [1, 0]]; if (nivel >= 2) dirs.push([1, 1]); if (nivel >= 3) dirs.push([0, -1], [-1, 0], [-1, -1]);
      const g = gerarCaca(palavras, n, dirs);
      const achadas = new Set(); let ini = null, fim = null, erros = 0, dicas = 0, acabou = false;
      stage.innerHTML = `<div class="enun" style="margin-bottom:10px"><small>Tema</small>${esc(P.tema)}</div>
        <div class="caca" id="cg" style="grid-template-columns:repeat(${n},1fr)">${g.map((l, r) => l.map((x, c) => `<div class="cc" data-r="${r}" data-c="${c}">${x}</div>`).join("")).join("")}</div>
        <div class="chips2" id="lista">${palavras.map(w => `<span data-w="${w}">${w}</span>`).join("")}</div>
        <div class="linha" style="margin-top:12px"><button class="btn claro" id="dica">💡 Dica</button></div>`;
      progresso(0, palavras.length);
      const cg = $("#cg", stage), cel = (r, c) => cg.children[r * n + c];
      const el = e => { const x = document.elementFromPoint(e.clientX, e.clientY); return x && x.closest ? x.closest(".cc") : null; };
      const marcar = () => {
        cg.querySelectorAll(".sel").forEach(x => x.classList.remove("sel"));
        if (ini) caminhoLinha(ini, fim).forEach(([r, c]) => cel(r, c).classList.add("sel"));
      };
      cg.onpointerdown = e => { const x = el(e); if (!x || acabou) return; try { cg.setPointerCapture(e.pointerId); } catch (z) {} ini = [+x.dataset.r, +x.dataset.c]; fim = ini; bip(500, .05); marcar(); };
      cg.onpointermove = e => {
        if (!ini) return; const x = el(e); if (!x) return;
        const r = +x.dataset.r, c = +x.dataset.c, dr = r - ini[0], dc = c - ini[1];
        if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) { fim = [r, c]; marcar(); }
      };
      cg.onpointerup = () => {
        if (!ini) return;
        const cam = caminhoLinha(ini, fim), s = cam.map(([r, c]) => g[r][c]).join(""), rev = [...s].reverse().join("");
        const w = palavras.find(p => !achadas.has(p) && (p === s || p === rev));
        if (w) {
          achadas.add(w); bip(780, .2); cam.forEach(([r, c]) => cel(r, c).classList.add("ach"));
          $(`[data-w="${w}"]`, stage).classList.add("feita"); progresso(achadas.size, palavras.length);
          if (achadas.size === palavras.length && !acabou) { acabou = true; later(() => terminar(Math.max(30, 100 - Math.min(erros, 14) * 5 - dicas * 8), P.v), 900); }
        } else if (cam.length > 1) { erros++; bip(170, .15); }
        ini = null; marcar();
      };
      cg.onpointercancel = () => { ini = null; marcar(); };
      $("#dica", stage).onclick = () => {
        const w = pick(palavras.filter(p => !achadas.has(p))); if (!w) return;
        const letra = w[0]; dicas++;
        const alvo = [...cg.children].filter(x => x.textContent === letra && !x.classList.contains("ach"));
        const marca = alvo.slice(0, 40); marca.forEach(x => x.classList.add("dica")); later(() => marca.forEach(x => x.classList.remove("dica")), 1400);
        $(`[data-w="${w}"]`, stage).classList.add("pista"); later(() => { const q = $(`[data-w="${w}"]`, stage); if (q) q.classList.remove("pista"); }, 1400);
      };
    }
  },

  cruzadinha: {
    nome: "Cruzadinha Bíblica", cat: "Conhecimento", ico: "🧩", desc: "Resolva as dicas e cruze as respostas.",
    iniciar({ stage, progresso, terminar, nivel }) {
      const P0 = pick(window.PUZZLES.cruz), P = { ...P0, palavras: sample(P0.palavras, [5, 6, 8][nivel - 1]) }, dicasDe = Object.fromEntries(P.palavras);
      const grade = montarGrade(P.palavras.map(x => x[0]), true), ws = grade.words;
      const resp = new Map(), num = new Map(), user = new Map();
      ws.forEach(w => celulasDe(w).forEach(([r, c], k) => resp.set(r + "," + c, w.w[k])));
      [...ws].sort((a, b) => a.r - b.r || a.c - b.c).forEach(w => { const k = w.r + "," + w.c; if (!num.has(k)) num.set(k, num.size + 1); });
      ws.forEach(w => w.n = num.get(w.r + "," + w.c));
      let ativo = { wi: 0, k: 0, cel: null }, erradas = new Set(), erros = 0, dicas = 0, fim = false;
      const cobre = (w, r, c) => celulasDe(w).some(([a, b]) => a === r && b === c);
      const chave = (r, c) => r + "," + c;
      const ordem = ws.map((w, i) => i).sort((a, b) => ws[a].n - ws[b].n);
      stage.innerHTML = `<div id="cx"></div><div class="pista-atual" id="pista"></div><div id="kb" class="kb"></div>
        <div class="linha" style="margin:10px 0 4px"><button class="btn claro" id="ver">✔ Verificar</button><button class="btn claro" id="dica">💡 Dica</button></div>
        <div id="dicas" class="dicas"></div>`;
      const pintar = () => {
        const w = ws[ativo.wi], cw = celulasDe(w).map(([r, c]) => chave(r, c));
        let h = "";
        for (let r = 0; r < grade.rows; r++) for (let c = 0; c < grade.cols; c++) {
          const k = chave(r, c);
          if (!resp.has(k)) { h += '<div class="cx vazio"></div>'; continue; }
          h += `<button class="cx ${cw.includes(k) ? "pal" : ""} ${ativo.cel === k ? "ativa" : ""} ${erradas.has(k) ? "errada" : ""}" data-r="${r}" data-c="${c}">${num.has(k) ? `<i>${num.get(k)}</i>` : ""}${user.get(k) || ""}</button>`;
        }
        $("#cx", stage).innerHTML = `<div class="cxg" style="--cols:${grade.cols};grid-template-columns:repeat(${grade.cols},1fr)">${h}</div>`;
        $("#pista", stage).innerHTML = `<b>${w.n} ${w.h ? "Horizontal" : "Vertical"}</b> · ${esc(dicasDe[w.w])} <span>(${w.w.length} letras)</span>`;
        $("#dicas", stage).innerHTML = ["Horizontais", "Verticais"].map((t, d) => `<div><b>${t}</b>${ordem.filter(i => ws[i].h === (d === 0)).map(i => `<button data-w="${i}" class="${i === ativo.wi ? "on" : ""}">${ws[i].n}. ${esc(dicasDe[ws[i].w])}</button>`).join("")}</div>`).join("");
        stage.querySelectorAll(".cx[data-r]").forEach(b => b.onclick = () => tocar(+b.dataset.r, +b.dataset.c));
        stage.querySelectorAll("#dicas button").forEach(b => b.onclick = () => { ativo = { wi: +b.dataset.w, k: 0, cel: null }; ativo.k = primeiroVazio(ws[ativo.wi]); defineCel(); pintar(); });
        progresso([...resp].filter(([k, v]) => user.get(k) === v).length, resp.size);
      };
      const primeiroVazio = w => { const i = celulasDe(w).findIndex(([r, c]) => !user.get(chave(r, c))); return i < 0 ? 0 : i; };
      const defineCel = () => { const [r, c] = celulasDe(ws[ativo.wi])[ativo.k]; ativo.cel = chave(r, c); };
      const tocar = (r, c) => {
        const k = chave(r, c), cand = ws.map((w, i) => i).filter(i => cobre(ws[i], r, c));
        let esc2 = cand.includes(ativo.wi) ? ativo.wi : cand[0];
        if (ativo.cel === k && cand.length > 1) esc2 = cand.find(i => i !== ativo.wi);
        ativo.wi = esc2; ativo.k = celulasDe(ws[esc2]).findIndex(([a, b]) => a === r && b === c); ativo.cel = k; pintar();
      };
      const verificarFim = () => {
        if (fim || ![...resp].every(([k, v]) => user.get(k) === v)) return;
        fim = true; bip(800, .3); later(() => terminar(Math.max(30, 100 - erros * 8 - dicas * 10), P.v), 900);
      };
      const digitar = l => {
        if (fim) return; erradas = new Set();
        user.set(ativo.cel, l); const w = ws[ativo.wi];
        if (ativo.k < w.w.length - 1) ativo.k++;
        defineCel(); bip(480, .05); pintar(); verificarFim();
      };
      const apagar = () => {
        if (fim) return; erradas = new Set();
        if (user.get(ativo.cel)) user.delete(ativo.cel); else if (ativo.k > 0) { ativo.k--; defineCel(); user.delete(ativo.cel); }
        pintar();
      };
      $("#kb", stage).innerHTML = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM⌫"].map(l => `<div>${[...l].map(x => `<button data-k="${x}">${x}</button>`).join("")}</div>`).join("");
      stage.querySelectorAll("#kb button").forEach(b => b.onclick = () => b.dataset.k === "⌫" ? apagar() : digitar(b.dataset.k));
      $("#ver", stage).onclick = () => {
        erradas = new Set([...user].filter(([k, v]) => resp.get(k) !== v).map(([k]) => k));
        if (erradas.size) { erros++; bip(170, .25); } pintar();
        if (!erradas.size) { const m = $("#pista", stage); m.innerHTML = "<b>Até aqui, tudo certo!</b>"; }
      };
      $("#dica", stage).onclick = () => { if (fim) return; user.set(ativo.cel, resp.get(ativo.cel)); dicas++; erradas = new Set(); pintar(); verificarFim(); };
      ativo.k = 0; defineCel(); pintar();
    }
  },

  verso: {
    nome: "Versículo Embaralhado", cat: "Memória", ico: "📜", desc: "Recoloque as partes do versículo em ordem.",
    iniciar({ stage, progresso, terminar, nivel }) {
      const limite = [14, 22, 34][nivel - 1];
      const todos = D.versiculos.map(v => ({ ref: v.ref, t: textoVersiculo(v) }));
      const ok = todos.filter(v => v.t.split(/\s+/).length <= limite), v = pick(ok.length ? ok : todos);
      const ps = v.t.split(/\s+/), alvo = [6, 8, 10][nivel - 1], tam = Math.ceil(ps.length / alvo), partes = [];
      for (let i = 0; i < ps.length; i += tam) partes.push(ps.slice(i, i + tam).join(" "));
      let ordem; do { ordem = shuffle(partes.map((_, i) => i)); } while (partes.length > 1 && ordem.every((x, i) => partes[x] === partes[i]));
      let colocadas = [], erros = 0, erradas = new Set(), fim = false;
      stage.innerHTML = `<div class="enun"><small>${esc(v.ref)}</small>Toque nas partes na ordem certa do versículo.</div>
        <div class="area" id="area"></div><div class="banco" id="banco"></div>
        <div class="linha" style="margin-top:14px"><button class="btn claro" id="limpa">↺ Recomeçar</button><button class="btn" id="ver">Verificar</button></div><div id="fb"></div>`;
      const pintar = () => {
        $("#area", stage).innerHTML = colocadas.length ? colocadas.map((i, k) => `<button class="parte ${erradas.has(k) ? "errada" : ""}" data-k="${k}">${esc(partes[i])}</button>`).join(" ") : '<span class="pequeno">Seu versículo aparece aqui…</span>';
        $("#banco", stage).innerHTML = ordem.filter(i => !colocadas.includes(i)).map(i => `<button class="parte" data-i="${i}">${esc(partes[i])}</button>`).join(" ");
        stage.querySelectorAll("#banco .parte").forEach(b => b.onclick = () => { if (fim) return; erradas = new Set(); colocadas.push(+b.dataset.i); bip(480, .06); pintar(); if (colocadas.length === partes.length) verificar(); });
        stage.querySelectorAll("#area .parte").forEach(b => b.onclick = () => { if (fim) return; erradas = new Set(); colocadas.splice(+b.dataset.k, 1); pintar(); });
        progresso(colocadas.length, partes.length);
      };
      const verificar = () => {
        if (fim) return;
        if (colocadas.length < partes.length) { $("#fb", stage).innerHTML = '<div class="feedback erro">Coloque todas as partes antes de verificar.</div>'; return; }
        erradas = new Set(colocadas.map((i, k) => partes[i] === partes[k] ? -1 : k).filter(k => k >= 0));
        if (!erradas.size) { fim = true; bip(800, .3); pintar(); $("#fb", stage).innerHTML = `<div class="feedback ok"><i>${esc(v.t)}</i> — ${esc(v.ref)}</div>`; later(() => terminar(Math.max(30, 100 - erros * 12), v), 1800); }
        else { erros++; bip(170, .25); $("#fb", stage).innerHTML = '<div class="feedback erro">Algumas partes estão fora de lugar. Toque nelas para tirar.</div>'; pintar(); }
      };
      $("#limpa", stage).onclick = () => { if (fim) return; colocadas = []; erradas = new Set(); $("#fb", stage).innerHTML = ""; pintar(); };
      $("#ver", stage).onclick = verificar;
      pintar();
    }
  }
});

const ORDEM = ["roda", "caca", "cruzadinha", "verso", "versiculo", "quiz", "pares", "intruso", "calculo", "sequencia", "ordem", "palavras"];

/* ---------- jornada: XP, nível, baralho de desafios e sequência de dias ---------- */
const NIVEL_XP = [0, 600, 1600];
const xp = () => store.xp || 0;
const nivelXP = () => xp() >= NIVEL_XP[2] ? 3 : xp() >= NIVEL_XP[1] ? 2 : 1;
const tierXP = () => 1 + Math.floor(xp() / 450);
const novoBaralho = ultimo => {
  let b = ultimo ? shuffle(ORDEM) : ["roda", ...shuffle(ORDEM.filter(x => x !== "roda"))];
  if (ultimo && b[0] === ultimo) b.push(b.shift());
  return b;
};
const proximoJogo = () => { if (!store.baralho || !store.baralho.length) store.baralho = novoBaralho(store.ultimo); return store.baralho[0]; };
const fasesNoDia = ds => store.hist.filter(h => h.d === ds && h.j).length;
const diaCompleto = ds => fasesNoDia(ds) >= 3;
function sequenciaDias() {
  let ds = dataStr(), n = 0;
  if (!diaCompleto(ds)) ds = addDias(ds, -1);
  while (diaCompleto(ds)) { n++; ds = addDias(ds, -1); }
  return n;
}
function barraXP() {
  const n = nivelXP(), ini = NIVEL_XP[n - 1], fim = NIVEL_XP[n];
  if (!fim) return `<div class="xpbar"><i style="width:100%"></i></div><small class="pequeno">${xp()} XP · nível máximo. A roda de letras continua crescendo.</small>`;
  return `<div class="xpbar"><i style="width:${Math.round((xp() - ini) / (fim - ini) * 100)}%"></i></div><small class="pequeno">${xp()} / ${fim} XP para o nível ${n + 1}</small>`;
}
function concluirFase(id, score, bonus) {
  const fase = store.fase || 1, antes = nivelXP(), ganho = 10 + (bonus || 0);
  store.xp = xp() + score; store.moedas = moedas() + ganho;
  if (id === "roda") store.rodaN = (store.rodaN || 0) + 1;
  const carta = cartaDaFase(fase), nova = !!carta && !(store.cartas || []).includes(carta.ref);
  if (nova) store.cartas = [...(store.cartas || []), carta.ref];
  store.fase = fase + 1; store.ultimo = id; store.baralho = (store.baralho || []).slice(1);
  proximoJogo();
  return { fase, ganho, nova, carta, xpGanho: score, subiu: nivelXP() > antes, nivel: nivelXP() };
}
const mediaCat = cat => {
  const ult = store.hist.filter(h => JOGOS[h.g] && JOGOS[h.g].cat === cat).slice(-6);
  return ult.length ? Math.round(ult.reduce((s, h) => s + h.s, 0) / ult.length) : null;
};
const versiculoDoDia = () => D.versiculos[diaIdx() % D.versiculos.length];
const textoVersiculo = v => v.t.replace("___", v.r);

/* ---------- instalação como app ---------- */
let promptInstalar = null;
const jaInstalado = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
const ehiOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); promptInstalar = e; if ($("#instalar")) telaHome(); });
window.addEventListener("appinstalled", () => { promptInstalar = null; store.instalado = true; salvar(); if ($("#instalar")) telaHome(); });
const guiaInstalar = () => ehiOS()
  ? `<ol><li>Abra este endereço no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li><li>Role e toque em <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>. O ícone aparece junto dos seus apps.</li></ol>`
  : `<ol><li>Abra este endereço no <b>Chrome</b>.</li><li>Toque no menu <b>⋮</b> (três pontinhos, no canto).</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme. O ícone aparece junto dos seus apps e abre em tela cheia.</li></ol>`;

/* ---------- telas ---------- */
function marcarNav(go) { document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.go === go)); }
function ir(tela) {
  limpar(); appEl.classList.remove("em-jogo");
  ({ home: telaHome, games: telaJogos, progress: telaProgresso }[tela] || telaHome)();
  marcarNav(tela); window.scrollTo(0, 0);
}

function linhaJogo(id, extra = "", feito = false) {
  const g = JOGOS[id];
  return `<button class="jogo" data-play="${id}"><span class="ico">${g.ico}</span><span><span class="tag">${g.cat}</span><b>${g.nome}</b><small>${extra || g.desc}</small></span>${feito ? '<span class="ok">✅</span>' : ""}</button>`;
}
function ligarJogos(raiz) { raiz.querySelectorAll("[data-play]").forEach(b => b.onclick = () => jogar(b.dataset.play)); }

function telaHome() {
  const hoje = dataStr(), n = Math.min(3, fasesNoDia(hoje)), seq = sequenciaDias(), v = versiculoDoDia(), prox = JOGOS[proximoJogo()];
  const hora = new Date().getHours(), saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  view.innerHTML = `
    <div class="topo"><small>Treino mental bíblico</small><h1>${saud}! 🙏</h1><p>${esc(D.dicas[diaIdx() % D.dicas.length])}</p>
      <div class="chips"><span class="chip">🔥 <b>${seq}</b> ${seq === 1 ? "dia" : "dias"} seguidos</span><span class="chip">✅ <b>${n}/3</b> fases hoje</span></div></div>
    <div class="sobe">
      <div class="card"><div class="rot">Sua jornada</div>
        <div class="jornada"><div><h2>Fase ${store.fase || 1} · Nível ${nivelXP()}</h2><p class="pequeno" style="margin:2px 0 0">🪙 ${moedas()} moedas · 🖼️ ${(store.cartas || []).length} cartões</p></div></div>
        ${barraXP()}
        <div class="proxima"><span>${prox.ico}</span><div><small>Próximo desafio</small><b>${prox.nome}</b></div></div>
        <button class="btn ouro" id="jornada">${(store.fase || 1) === 1 ? "Começar jornada" : "Continuar jornada"}</button></div>
      ${jaInstalado() || store.instalado || store.ocultaInstalar ? "" : `<div class="card" id="instalar"><div class="rot">📲 Leve no seu celular</div><h2>Instale o app</h2>
        <p class="pequeno" style="margin:2px 0 12px">Um ícone na tela inicial, em tela cheia e funcionando sem internet.</p>
        <button class="btn ouro" id="btn-instalar">Instalar app</button>
        <div id="guia" class="guia" hidden>${guiaInstalar()}</div>
        <button class="link" id="agora-nao">Agora não</button></div>`}
      <div class="card"><div class="rot">Versículo do dia</div><div class="versiculo">“${esc(textoVersiculo(v))}”<cite>${esc(v.ref)}</cite></div></div>
    </div>`;
  const bi = $("#btn-instalar");
  if (bi) {
    bi.onclick = async () => {
      if (promptInstalar) { promptInstalar.prompt(); try { await promptInstalar.userChoice; } catch (e) {} promptInstalar = null; return; }
      const g = $("#guia"); g.hidden = !g.hidden;
    };
    $("#agora-nao").onclick = () => { store.ocultaInstalar = true; salvar(); telaHome(); };
  }
  $("#jornada").onclick = () => jogar(proximoJogo(), true);
}

function telaJogos() {
  view.innerHTML = `<div class="topo" style="padding-bottom:24px"><small>Pratique à vontade</small><h1>Treino livre</h1><p>Escolha qualquer jogo. Aqui não vale para a jornada.</p></div>
    <div class="pad"><div class="lista">${ORDEM.map(g => linhaJogo(g, `${JOGOS[g].desc} · Nível ${nivelXP()}`)).join("")}</div></div>`;
  ligarJogos(view);
}

function telaProgresso() {
  const hoje = dataStr(), dias = Array.from({ length: 7 }, (_, i) => addDias(hoje, i - 6));
  const nomes = ["D", "S", "T", "Q", "Q", "S", "S"];
  const ult = store.hist.slice(-8).reverse();
  view.innerHTML = `<div class="topo" style="padding-bottom:24px"><small>Sua evolução</small><h1>Progresso</h1><p>Média das suas últimas partidas em cada área.</p></div>
    <div class="pad">
      <div class="card"><div class="rot">Últimos 7 dias</div>
        <div class="cal">${dias.map(d => { const [y, m, dd] = d.split("-").map(Number); const wd = new Date(y, m - 1, dd).getDay();
          return `<div class="${diaCompleto(d) ? "feito" : ""} ${d === hoje ? "hoje" : ""}"><i>${diaCompleto(d) ? "✓" : ""}</i>${nomes[wd]}</div>`; }).join("")}</div>
        <p class="pequeno" style="margin-top:12px">Meta: 3 fases por dia. Sequência atual: <b>${sequenciaDias()}</b> · Fase <b>${store.fase || 1}</b> · Nível <b>${nivelXP()}</b></p>${barraXP()}</div>
      <div class="card"><div class="rot">Áreas da mente</div>
        ${CATS.map(c => { const m = mediaCat(c); return `<div class="cat"><div class="t"><span>${c}</span><span>${m === null ? "ainda não jogou" : m + "%"}</span></div><div class="trilho"><i style="width:${m || 0}%"></i></div></div>`; }).join("")}</div>
      <div class="card"><div class="rot">Últimas partidas</div>
        ${ult.length ? `<div class="hist">${ult.map(h => `<div><span>${JOGOS[h.g].ico} ${JOGOS[h.g].nome}</span><b>${h.s}%</b></div>`).join("")}</div>` : '<p class="pequeno">Jogue o primeiro jogo para ver o seu histórico aqui.</p>'}</div>
      <div class="card"><div class="rot">Meus versículos (${(store.cartas || []).length}/${CARTAS.length})</div>
        ${(store.cartas || []).length ? `<div class="hist">${(store.cartas || []).map(r => CARTAS.find(c => c.ref === r)).filter(Boolean).map((c, i) => `<div style="display:block"><i style="font-family:Georgia,serif">“${esc(c.t)}”</i><br><b>${esc(c.ref)}</b> <button class="link" data-cartao="${i}">compartilhar</button></div>`).join("")}</div>` : '<p class="pequeno">Conclua a fase 3 da jornada para ganhar o primeiro cartão. Um novo a cada 3 fases!</p>'}</div>
      ${jaInstalado() ? "" : `<div class="card"><div class="rot">Instalar no celular</div><div class="guia">${guiaInstalar()}</div></div>`}
      <button class="link" id="zerar">Apagar meu progresso</button>
      <p class="pequeno" style="margin-top:14px">Versículos na tradução Almeida Revista e Corrigida. O progresso fica salvo apenas neste aparelho.</p>
    </div>`;
  const col = (store.cartas || []).map(r => CARTAS.find(c => c.ref === r)).filter(Boolean);
  view.querySelectorAll("[data-cartao]").forEach(b => b.onclick = () => compartilharCartao(col[+b.dataset.cartao]));
  $("#zerar").onclick = () => { if (confirm("Apagar todo o seu progresso neste aparelho?")) { store = { hist: [] }; salvar(); telaProgresso(); } };
}

function jogar(id, jornada = false) {
  limpar(); appEl.classList.add("em-jogo"); window.scrollTo(0, 0);
  const g = JOGOS[id], nivel = nivelXP();
  view.innerHTML = `<div class="gbar"><button class="x" id="sai" aria-label="Sair">✕</button><h2>${g.ico} ${g.nome}</h2><span class="prog" id="prog"></span></div>
    <div class="barra"><i id="barra"></i></div><div class="stage" id="stage"></div>`;
  $("#sai").onclick = () => ir("home");
  const progresso = (i, total) => { $("#prog").textContent = total > 1 ? `${Math.min(i + 1, total)}/${total}` : ""; $("#barra").style.width = (i / total * 100) + "%"; };
  g.iniciar({ stage: $("#stage"), progresso, nivel, jornada, terminar: (s, vv, gi) => resultado(id, s, jornada, vv, gi) });
}

function resultado(id, score, jornada, extra, gi) {
  limpar();
  const info = jornada ? concluirFase(id, score, gi && gi.bonus) : null;
  store.hist.push({ g: id, s: score, d: dataStr(), t: Date.now(), j: jornada ? 1 : 0 });
  if (store.hist.length > 400) store.hist = store.hist.slice(-400);
  salvar();
  const est = score >= 85 ? 3 : score >= 60 ? 2 : score >= 30 ? 1 : 0;
  const msgs = ["Continue treinando, cada partida fortalece a mente.", "Bom começo! Mais uma partida e você melhora.", "Muito bom! Sua mente está ficando mais afiada.", "Excelente! Sabedoria e atenção em dia."];
  const v = (info && info.carta) || extra || pick(D.versiculos);
  const prox = info ? JOGOS[proximoJogo()] : null;
  view.innerHTML = `<div class="resultado">
    <div class="estrelas">${[0, 1, 2].map(i => `<span class="${i < est ? "" : "apagada"}">⭐</span>`).join("")}</div>
    <div class="pontos">${score}<small>%</small></div>
    <p>${info ? `<b>Fase ${info.fase} concluída!</b> +${info.xpGanho} XP · +${info.ganho} 🪙<br>${info.subiu ? `🎉 <b>Você subiu para o nível ${info.nivel}!</b> Os desafios ficam mais difíceis.<br>` : ""}${info.nova ? "✨ Novo cartão de versículo na sua coleção!<br>" : ""}` : ""}${msgs[est]}</p>
    ${info ? barraXP() : ""}
    <div class="versiculo">“${esc(textoVersiculo(v))}”<cite>${esc(v.ref)}</cite></div>
    ${info && info.carta ? '<button class="btn" id="cartao">🖼️ Compartilhar cartão do versículo</button>' : ""}
    ${info ? `<button class="btn ouro" id="prox">Próxima fase: ${prox.ico} ${prox.nome}</button>` : '<button class="btn ouro" id="again">Jogar de novo</button>'}
    <button class="btn claro" id="inicio">Voltar ao início</button>
    ${navigator.share ? '<button class="link" id="share">Compartilhar resultado</button>' : ""}</div>`;
  const ct = $("#cartao"); if (ct) ct.onclick = () => compartilharCartao(v);
  if (info) $("#prox").onclick = () => jogar(proximoJogo(), true); else $("#again").onclick = () => jogar(id);
  $("#inicio").onclick = () => ir("home");
  const sh = $("#share"); if (sh) sh.onclick = () => navigator.share({ title: "Mente Renovada", text: `Fiz ${score}% em “${JOGOS[id].nome}” no Mente Renovada! ${"⭐".repeat(est)}`, url: location.href.split("#")[0] }).catch(() => {});
  window.scrollTo(0, 0);
}

document.querySelectorAll("#nav button").forEach(b => b.onclick = () => ir(b.dataset.go));
ir("home");
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
