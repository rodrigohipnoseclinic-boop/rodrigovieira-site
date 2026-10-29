// Link de sessão: o cliente agenda a sessão do estágio atual (1ª ou 2ª) a
// partir da data liberada para ele, ou pede a desmarcação de uma sessão
// marcada (motivo + aceite da taxa). Quem desmarca de fato é o consultório.
(() => {
  const $ = (s) => document.querySelector(s);
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const br = (d) => d.split("-").reverse().join("/");
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const q = new URLSearchParams(location.search);
  const cred = { s: q.get("s") || "", t: q.get("t") || "" };
  const qs = `s=${encodeURIComponent(cred.s)}&t=${encodeURIComponent(cred.t)}`;
  const st = { info: null, mes: null, data: null, inicio: null, desmarcar: null };
  const mostrar = (el, txt) => { el.textContent = txt; el.classList.toggle("oculto", !txt); };

  async function api(caminho, opcoes) {
    const r = await fetch(`/api/agenda/sessao${caminho}`, opcoes);
    const j = await r.json().catch(() => ({ erro: "Falha de conexão." }));
    if (!r.ok) throw Object.assign(new Error(j.erro || "Erro"), j);
    return j;
  }
  const post = (caminho, dados) => api(caminho, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cred, ...dados }) });

  async function carregar() {
    try { st.info = await api(`?${qs}`); } catch (e) { return mostrar($("#erro-geral"), e.message); }
    const i = st.info;
    $("#titulo").textContent = `Olá, ${i.nome}!`;
    $("#resumo").innerHTML = `<span>Sessões ${esc(i.modalidade.toLowerCase())} com ${esc(i.profissional)}</span><span>Duração: ${i.duracao} min</span>${i.valor ? `<span>Valor: <strong>${reais(i.valor)}</strong></span>` : ""}`;
    mostrarMarcadas();
    const pode = i.estagio !== "concluido";
    $("#agendar").classList.toggle("oculto", !pode);
    if (pode) {
      $("#abrir-cal").textContent = "Agendar sua sessão";
      $("#abrir-cal").classList.remove("oculto");
      $("#cal-box").classList.add("oculto");
      $("#confirmar-box").classList.add("oculto");
      $("#intervalo").textContent = `${i.rotulo}: horários disponíveis a partir de ${br(i.data_minima)}. Você pode escolher qualquer data a partir daí.`;
      st.mes = i.data_minima.slice(0, 7);
    }
  }

  function mostrarMarcadas() {
    const i = st.info;
    $("#marcadas").classList.toggle("oculto", !i.marcadas.length && !i.desmarcacao);
    $("#lista-marcadas").innerHTML = i.marcadas.map((m) => `<div style="border-top:1px solid var(--c-linha);padding:10px 0">
      <p style="margin:0"><strong>${m.rotulo}</strong> · ${br(m.data)}, das ${m.inicio} às ${m.fim} · ${esc(i.modalidade)}</p>
      ${m.endereco ? `<p class="muted" style="margin:0">Endereço: ${esc(m.endereco)}</p>` : ""}
      ${i.desmarcacao ? "" : `<button type="button" class="btn btn--linha btn--peq" data-desmarcar="${m.id}" style="margin-top:6px">Preciso desmarcar</button>`}</div>`).join("")
      + `<p class="muted" style="margin-top:8px">Desmarcações têm taxa de ${reais(i.taxas.normal)} com pelo menos ${i.prazo_horas} horas de antecedência e de ${reais(i.taxas.tardia)} depois disso.</p>`;
    mostrar($("#desm-pendente"), i.desmarcacao ? `Seu pedido de desmarcação foi enviado (taxa de ${reais(i.desmarcacao.taxa)}). Aguarde a confirmação do consultório.${i.chave_pix ? ` Chave Pix para a taxa: ${i.chave_pix}` : ""}` : "");
  }

  async function carregarMes(pular = 0) {
    const [a, m] = st.mes.split("-").map(Number);
    $("#mes-nome").textContent = `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a}`;
    $("#mes-ant").disabled = st.mes <= st.info.data_minima.slice(0, 7);
    $("#mes-prox").disabled = st.mes >= st.info.ate.slice(0, 7);
    $("#cal").innerHTML = ""; $("#horas").innerHTML = "";
    $("#cal-msg").textContent = "Carregando dias disponíveis…";
    let dias = [];
    try { dias = (await api(`/dias?${qs}&mes=${st.mes}`)).dias; } catch (e) { $("#cal-msg").textContent = e.message; return; }
    const prim = new Date(Date.UTC(a, m - 1, 1)).getUTCDay(), total = new Date(Date.UTC(a, m, 0)).getUTCDate();
    let h = ["D", "S", "T", "Q", "Q", "S", "S"].map((d) => `<span aria-hidden="true">${d}</span>`).join("") + "<span></span>".repeat(prim);
    for (let d = 1; d <= total; d++) {
      const data = `${st.mes}-${String(d).padStart(2, "0")}`, livre = dias.includes(data);
      h += `<button type="button" data-data="${data}" class="${livre ? "livre" : ""}" ${livre ? "" : "disabled"} aria-label="${d} de ${MESES[m - 1]}${livre ? ", com horários" : ""}">${d}</button>`;
    }
    // Ao abrir, pula para o primeiro mês com horários (até 3 meses à frente).
    if (!dias.length && pular > 0 && st.mes < st.info.ate.slice(0, 7)) return mudarMes(1, pular - 1);
    $("#cal").innerHTML = h;
    $("#cal-msg").textContent = dias.length ? "Toque em um dia destacado." : "Sem horários livres neste mês. Veja o próximo.";
  }

  async function carregarHorarios(data) {
    st.data = data; st.inicio = null;
    document.querySelectorAll("#cal button").forEach((b) => b.classList.toggle("sel", b.dataset.data === data));
    $("#confirmar-box").classList.add("oculto");
    try {
      const { horarios } = await api(`/horarios?${qs}&data=${data}`);
      $("#cal-msg").textContent = horarios.length ? `Horários em ${br(data)}:` : "Esse dia acabou de lotar. Escolha outro.";
      $("#horas").innerHTML = horarios.map((x) => `<button type="button" class="hora" data-h="${x}">${x}</button>`).join("");
    } catch (e) { $("#cal-msg").textContent = e.message; }
  }

  $("#abrir-cal").addEventListener("click", () => { $("#abrir-cal").classList.add("oculto"); $("#cal-box").classList.remove("oculto"); carregarMes(3); });
  $("#cal").addEventListener("click", (e) => { const b = e.target.closest("button.livre"); if (b) carregarHorarios(b.dataset.data); });
  $("#horas").addEventListener("click", (e) => {
    const b = e.target.closest(".hora");
    if (!b) return;
    st.inicio = b.dataset.h;
    document.querySelectorAll(".hora").forEach((x) => x.classList.toggle("sel", x === b));
    $("#escolha").textContent = `${st.info.rotulo}: ${br(st.data)} às ${st.inicio}`;
    $("#confirmar-box").classList.remove("oculto");
  });
  function mudarMes(n, pular = 0) {
    const [a, m] = st.mes.split("-").map(Number);
    st.mes = new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
    return carregarMes(pular);
  }
  $("#mes-ant").addEventListener("click", () => mudarMes(-1));
  $("#mes-prox").addEventListener("click", () => mudarMes(1));
  $("#confirmar").addEventListener("click", async () => {
    const btn = $("#confirmar");
    btn.disabled = true;
    try {
      await post("/reservar", { data: st.data, inicio: st.inicio });
      mostrar($("#erro-cal"), "");
      await carregar();
      $("#marcadas").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      mostrar($("#erro-cal"), e.message);
      if (e.indisponivel) carregarHorarios(st.data);
    } finally { btn.disabled = false; }
  });
  $("#lista-marcadas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-desmarcar]");
    if (!b) return;
    const m = st.info.marcadas.find((x) => x.id === b.dataset.desmarcar);
    st.desmarcar = m.id;
    $("#desm-taxa").textContent = `${m.rotulo} de ${br(m.data)}: faltam cerca de ${m.taxa.horas} horas. A taxa de desmarcação agora é de ${reais(m.taxa.taxa)}.`;
    $("#desm-aceite").textContent = `Estou de acordo com a taxa de ${reais(m.taxa.taxa)}.`;
    $("#desm").classList.remove("oculto");
    $("#desm").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#desm-cancelar").addEventListener("click", () => $("#desm").classList.add("oculto"));
  $("#desm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    try {
      await post("/desmarcar", { consulta: st.desmarcar, motivo: f.motivo.value, aceite: f.aceite.checked });
      f.classList.add("oculto");
      await carregar();
    } catch (e) { mostrar($("#erro-desm"), e.message); }
  });
  carregar();
})();
