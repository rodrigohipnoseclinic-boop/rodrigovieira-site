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
      jogoEscolha({ ...c, rodadas: 6, fazer: i => {
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
      jogoEscolha({ ...c, rodadas: 8, fazer: i => ({ enun: esc(qs[i].p), opcoes: qs[i].o, certa: 0, explica: `Resposta: <b>${esc(qs[i].o[0])}</b>.` }) });
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
    iniciar({ stage, progresso, terminar }) {
      const R = 6, lista = sample(D.palavras, R);
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
const ORDEM = ["versiculo", "quiz", "pares", "intruso", "calculo", "sequencia", "ordem", "palavras"];

/* ---------- treino diário, sequência e progresso ---------- */
const treinoDoDia = ds => { const d = diaIdx(ds), n = ORDEM.length; return [ORDEM[d % n], ORDEM[(d + 3) % n], ORDEM[(d + 5) % n]]; };
const jogadosNoDia = ds => new Set(store.hist.filter(h => h.d === ds).map(h => h.g));
const diaCompleto = ds => { const j = jogadosNoDia(ds); return treinoDoDia(ds).every(g => j.has(g)); };
function sequenciaDias() {
  let ds = dataStr(), n = 0;
  if (!diaCompleto(ds)) ds = addDias(ds, -1);
  while (diaCompleto(ds)) { n++; ds = addDias(ds, -1); }
  return n;
}
const partidas = id => store.hist.filter(h => h.g === id).length;
const nivelDe = id => Math.min(3, 1 + Math.floor(partidas(id) / 3));
const mediaCat = cat => {
  const ult = store.hist.filter(h => JOGOS[h.g] && JOGOS[h.g].cat === cat).slice(-6);
  return ult.length ? Math.round(ult.reduce((s, h) => s + h.s, 0) / ult.length) : null;
};
const versiculoDoDia = () => D.versiculos[diaIdx() % D.versiculos.length];
const textoVersiculo = v => v.t.replace("___", v.r);

/* ---------- telas ---------- */
let fila = null; // treino em andamento
function marcarNav(go) { document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.go === go)); }
function ir(tela) {
  limpar(); appEl.classList.remove("em-jogo"); fila = tela === "treino" ? fila : null;
  ({ home: telaHome, games: telaJogos, progress: telaProgresso }[tela] || telaHome)();
  marcarNav(tela); window.scrollTo(0, 0);
}

function linhaJogo(id, extra = "", feito = false) {
  const g = JOGOS[id];
  return `<button class="jogo" data-play="${id}"><span class="ico">${g.ico}</span><span><span class="tag">${g.cat}</span><b>${g.nome}</b><small>${extra || g.desc}</small></span>${feito ? '<span class="ok">✅</span>' : ""}</button>`;
}
function ligarJogos(raiz) { raiz.querySelectorAll("[data-play]").forEach(b => b.onclick = () => jogar(b.dataset.play)); }

function telaHome() {
  const hoje = dataStr(), lista = treinoDoDia(hoje), feitos = jogadosNoDia(hoje);
  const n = lista.filter(g => feitos.has(g)).length, seq = sequenciaDias(), v = versiculoDoDia();
  const hora = new Date().getHours(), saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  view.innerHTML = `
    <div class="topo"><small>Treino mental bíblico</small><h1>${saud}! 🙏</h1><p>${esc(D.dicas[diaIdx() % D.dicas.length])}</p>
      <div class="chips"><span class="chip">🔥 <b>${seq}</b> ${seq === 1 ? "dia" : "dias"} seguidos</span><span class="chip">✅ <b>${n}/3</b> hoje</span></div></div>
    <div class="sobe">
      <div class="card"><div class="rot">Versículo do dia</div><div class="versiculo">“${esc(textoVersiculo(v))}”<cite>${esc(v.ref)}</cite></div></div>
      <div class="card treino"><div class="rot">Treino de hoje</div><h2>3 jogos para a sua mente</h2>
        <p class="pequeno" style="margin:2px 0 12px">Complete os três para manter a sequência.</p>
        <div class="lista">${lista.map(g => linhaJogo(g, "", feitos.has(g))).join("")}</div>
        <div class="espaco"></div><button class="btn ouro" id="comecar">${n === 3 ? "Treino concluído! Jogar de novo" : n ? "Continuar treino" : "Começar treino"}</button></div>
    </div>`;
  ligarJogos(view);
  $("#comecar").onclick = () => {
    const pendentes = lista.filter(g => !feitos.has(g));
    fila = (pendentes.length ? pendentes : lista).slice(); jogar(fila.shift(), true);
  };
}

function telaJogos() {
  view.innerHTML = `<div class="topo" style="padding-bottom:24px"><small>Escolha</small><h1>Todos os jogos</h1><p>Treine memória, atenção, linguagem e raciocínio.</p></div>
    <div class="pad"><div class="lista">${ORDEM.map(g => linhaJogo(g, `${JOGOS[g].desc} · Nível ${nivelDe(g)}`)).join("")}</div></div>`;
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
        <p class="pequeno" style="margin-top:12px">Sequência atual: <b>${sequenciaDias()}</b> · Partidas: <b>${store.hist.length}</b></p></div>
      <div class="card"><div class="rot">Áreas da mente</div>
        ${CATS.map(c => { const m = mediaCat(c); return `<div class="cat"><div class="t"><span>${c}</span><span>${m === null ? "ainda não jogou" : m + "%"}</span></div><div class="trilho"><i style="width:${m || 0}%"></i></div></div>`; }).join("")}</div>
      <div class="card"><div class="rot">Últimas partidas</div>
        ${ult.length ? `<div class="hist">${ult.map(h => `<div><span>${JOGOS[h.g].ico} ${JOGOS[h.g].nome}</span><b>${h.s}%</b></div>`).join("")}</div>` : '<p class="pequeno">Jogue o primeiro jogo para ver o seu histórico aqui.</p>'}</div>
      <button class="link" id="zerar">Apagar meu progresso</button>
      <p class="pequeno" style="margin-top:14px">Versículos na tradução Almeida Revista e Corrigida. O progresso fica salvo apenas neste aparelho.</p>
    </div>`;
  $("#zerar").onclick = () => { if (confirm("Apagar todo o seu progresso neste aparelho?")) { store = { hist: [] }; salvar(); telaProgresso(); } };
}

function jogar(id, treino = false) {
  limpar(); appEl.classList.add("em-jogo"); window.scrollTo(0, 0);
  const g = JOGOS[id], nivel = nivelDe(id);
  view.innerHTML = `<div class="gbar"><button class="x" id="sai" aria-label="Sair">✕</button><h2>${g.ico} ${g.nome}</h2><span class="prog" id="prog"></span></div>
    <div class="barra"><i id="barra"></i></div><div class="stage" id="stage"></div>`;
  $("#sai").onclick = () => { fila = null; ir("home"); };
  const progresso = (i, total) => { $("#prog").textContent = total > 1 ? `${Math.min(i + 1, total)}/${total}` : ""; $("#barra").style.width = (i / total * 100) + "%"; };
  g.iniciar({ stage: $("#stage"), progresso, nivel, terminar: s => resultado(id, s, treino) });
}

function resultado(id, score, treino) {
  limpar();
  store.hist.push({ g: id, s: score, d: dataStr(), t: Date.now() });
  if (store.hist.length > 400) store.hist = store.hist.slice(-400);
  salvar();
  const est = score >= 85 ? 3 : score >= 60 ? 2 : score >= 30 ? 1 : 0;
  const msgs = ["Continue treinando, cada partida fortalece a mente.", "Bom começo! Mais uma partida e você melhora.", "Muito bom! Sua mente está ficando mais afiada.", "Excelente! Sabedoria e atenção em dia."];
  const v = pick(D.versiculos);
  const proximo = fila && fila.length ? fila.shift() : null;
  const fim = treino && !proximo;
  view.innerHTML = `<div class="resultado">
    <div class="estrelas">${[0, 1, 2].map(i => `<span class="${i < est ? "" : "apagada"}">⭐</span>`).join("")}</div>
    <div class="pontos">${score}<small>%</small></div>
    <p>${fim ? "Treino de hoje concluído! 🎉 " : ""}${msgs[est]}</p>
    <div class="versiculo">“${esc(textoVersiculo(v))}”<cite>${esc(v.ref)}</cite></div>
    ${proximo ? `<button class="btn ouro" id="prox">Próximo jogo: ${JOGOS[proximo].nome}</button>` : ""}
    <button class="btn ${proximo ? "claro" : "ouro"}" id="again">Jogar de novo</button>
    <button class="btn claro" id="inicio">Voltar ao início</button>
    ${navigator.share ? '<button class="link" id="share">Compartilhar resultado</button>' : ""}</div>`;
  if (proximo) $("#prox").onclick = () => jogar(proximo, true);
  $("#again").onclick = () => { fila = null; jogar(id); };
  $("#inicio").onclick = () => { fila = null; ir("home"); };
  const sh = $("#share"); if (sh) sh.onclick = () => navigator.share({ title: "Mente Renovada", text: `Fiz ${score}% em “${JOGOS[id].nome}” no Mente Renovada! ${"⭐".repeat(est)}`, url: location.href.split("#")[0] }).catch(() => {});
  window.scrollTo(0, 0);
}

document.querySelectorAll("#nav button").forEach(b => b.onclick = () => ir(b.dataset.go));
ir("home");
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
