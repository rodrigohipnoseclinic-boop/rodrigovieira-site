// Link de sessão: pessoal, válido por poucas horas e de uso único.
// O cliente agenda a partir da data liberada para ele ou pede a desmarcação
// (motivo + aceite da taxa). Quem desmarca de fato é o consultório.
(() => {
  const $ = (s) => document.querySelector(s);
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const br = (d) => d.split("-").reverse().join("/");
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const q = new URLSearchParams(location.search);
  const cred = { s: q.get("s") || "", t: q.get("t") || "" };
  const qs = `s=${encodeURIComponent(cred.s)}&t=${encodeURIComponent(cred.t)}`;
  const st = { info: null, mes: null, data: null, inicio: null };
  const mostrar = (el, txt, tipo) => { el.textContent = txt; el.classList.toggle("oculto", !txt); if (tipo) el.className = `aviso aviso--${tipo}${txt ? "" : " oculto"}`; };

  async function api(caminho, opcoes) {
    const r = await fetch(`/api/agenda/sessao${caminho}`, opcoes);
    const j = await r.json().catch(() => ({ erro: "Falha de conexão." }));
    if (!r.ok) throw Object.assign(new Error(j.erro || "Erro"), j);
    return j;
  }
  const post = (caminho, dados) => api(caminho, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cred, ...dados }) });

  async function carregar() {
    try { st.info = await api(`?${qs}`); } catch (e) { $("#agendar").classList.add("oculto"); return mostrar($("#erro-geral"), e.message); }
    const i = st.info;
    $("#titulo").textContent = `Olá, ${i.nome}!`;
    $("#resumo").innerHTML = `<span>Sessão ${esc(i.modalidade.toLowerCase())} com ${esc(i.profissional)}</span><span>Duração: ${i.duracao} min</span>${i.valor ? `<span>Valor: <strong>${reais(i.valor)}</strong></span>` : ""}`;
    $("#agendar").classList.add("oculto");
    $("#marcada").classList.add("oculto");
    $("#pix").classList.add("oculto");
    clearInterval(st.timer);
    if (i.consulta) return mostrarMarcada();
    if (i.usado) return mostrar($("#erro-geral"), i.cancelada ? "Esta sessão foi cancelada. Para remarcar, chame o consultório no WhatsApp." : "Este link já foi usado. Para uma nova sessão, chame o consultório no WhatsApp.", "info");
    if (i.pix && i.pix.status !== "pago") return mostrarPix(i.pix);
    $("#agendar").classList.remove("oculto");
    if (!i.expira_em) $("#intervalo").textContent = `Pagamento confirmado ✓ Horários disponíveis a partir de ${br(i.data_minima)}.`;
    if (!i.expira_em) { st.mes = i.data_minima.slice(0, 7); return; }
    const horas = Math.max(0, Math.round((Date.parse(i.expira_em) - Date.now()) / 36e5));
    $("#intervalo").textContent = `Horários disponíveis a partir de ${br(i.data_minima)}. Este link vale por mais ${horas} hora(s) e permite um único agendamento.`;
    st.mes = i.data_minima.slice(0, 7);
  }

  // Pix antes do calendário: a confirmação vem do banco (Asaas), não do comprovante.
  function mostrarPix(p) {
    $("#pix").classList.remove("oculto");
    $("#pix-valor").textContent = reais(p.valor);
    if (p.status === "divergente" || p.status === "estornado" || p.status === "expirado" || p.status === "cancelado")
      return mostrar($("#erro-pix"), `Houve um problema com o pagamento (${p.status}). Chame o consultório no WhatsApp.`);
    const pendente = p.status === "pendente";
    $("#pix-gerar").classList.toggle("oculto", pendente);
    $("#pix-cpf-campo").classList.toggle("oculto", !p.precisa_cpf);
    $("#pix-pagar").classList.toggle("oculto", !pendente);
    if (pendente) {
      $("#pix-codigo").value = p.copia_cola;
      $("#pix-qr").src = p.qr_imagem || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Ctext x='1' y='6' font-size='2'%3EPIX TESTE%3C/text%3E%3C/svg%3E";
      st.timer = setInterval(verificarPix, 5000);
    }
  }
  async function verificarPix() {
    try {
      const r = await api(`/pix?${qs}`);
      if (r.status !== "pendente") { clearInterval(st.timer); carregar(); }
    } catch { /* tenta de novo no próximo ciclo */ }
  }

  function mostrarMarcada() {
    const i = st.info, c = i.consulta;
    $("#marcada").classList.remove("oculto");
    $("#marcada-txt").innerHTML = `<p><strong>${br(c.data)}</strong>, das ${c.inicio} às ${c.fim} · ${esc(i.modalidade)}</p>
      ${c.endereco ? `<p>Endereço: ${esc(c.endereco)}</p>` : ""}${c.orientacoes ? `<p class="muted">${esc(c.orientacoes)}</p>` : ""}
      <p class="muted">Desmarcações têm taxa de ${reais(i.taxas.normal)} com pelo menos ${i.prazo_horas} horas de antecedência e de ${reais(i.taxas.tardia)} depois disso.</p>`;
    $("#quero-desmarcar").classList.toggle("oculto", !!i.desmarcacao);
    mostrar($("#desm-pendente"), i.desmarcacao ? `Seu pedido de desmarcação foi enviado (taxa de ${reais(i.desmarcacao.taxa)}). Aguarde a confirmação do consultório.${i.chave_pix ? ` Chave Pix para a taxa: ${i.chave_pix}` : ""}` : "");
    $("#desm-taxa").textContent = `Faltam cerca de ${c.taxa.horas} horas para a sessão. A taxa de desmarcação agora é de ${reais(c.taxa.taxa)}.`;
    $("#desm-aceite").textContent = `Estou de acordo com a taxa de ${reais(c.taxa.taxa)}.`;
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
    // Ao abrir, pula para o primeiro mês com horários (até 3 meses à frente).
    if (!dias.length && pular > 0 && st.mes < st.info.ate.slice(0, 7)) return mudarMes(1, pular - 1);
    const prim = new Date(Date.UTC(a, m - 1, 1)).getUTCDay(), total = new Date(Date.UTC(a, m, 0)).getUTCDate();
    let h = ["D", "S", "T", "Q", "Q", "S", "S"].map((d) => `<span aria-hidden="true">${d}</span>`).join("") + "<span></span>".repeat(prim);
    for (let d = 1; d <= total; d++) {
      const data = `${st.mes}-${String(d).padStart(2, "0")}`, livre = dias.includes(data);
      h += `<button type="button" data-data="${data}" class="${livre ? "livre" : ""}" ${livre ? "" : "disabled"} aria-label="${d} de ${MESES[m - 1]}${livre ? ", com horários" : ""}">${d}</button>`;
    }
    $("#cal").innerHTML = h;
    $("#cal-msg").textContent = dias.length ? "Toque em um dia destacado." : "Sem horários livres neste mês. Veja o próximo.";
  }
  function mudarMes(n, pular = 0) {
    const [a, m] = st.mes.split("-").map(Number);
    st.mes = new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
    return carregarMes(pular);
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

  $("#pix-gerar-btn").addEventListener("click", async () => {
    const btn = $("#pix-gerar-btn");
    btn.disabled = true; btn.textContent = "Gerando Pix…";
    try {
      await post("/pix", { cpf: $("#pix-cpf").value });
      mostrar($("#erro-pix"), "");
      await carregar();
    } catch (e) {
      if (e.precisa_cpf) $("#pix-cpf-campo").classList.remove("oculto");
      mostrar($("#erro-pix"), e.message);
    } finally { btn.disabled = false; btn.textContent = "Gerar Pix"; }
  });
  $("#pix-copiar").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#pix-codigo").value); } catch { $("#pix-codigo").select(); document.execCommand("copy"); }
    $("#pix-copiar").textContent = "Copiado ✓";
  });
  $("#abrir-cal").addEventListener("click", () => { $("#abrir-cal").classList.add("oculto"); $("#cal-box").classList.remove("oculto"); carregarMes(3); });
  $("#cal").addEventListener("click", (e) => { const b = e.target.closest("button.livre"); if (b) carregarHorarios(b.dataset.data); });
  $("#horas").addEventListener("click", (e) => {
    const b = e.target.closest(".hora");
    if (!b) return;
    st.inicio = b.dataset.h;
    document.querySelectorAll(".hora").forEach((x) => x.classList.toggle("sel", x === b));
    $("#escolha").textContent = `${br(st.data)} às ${st.inicio}`;
    $("#confirmar-box").classList.remove("oculto");
  });
  $("#mes-ant").addEventListener("click", () => mudarMes(-1));
  $("#mes-prox").addEventListener("click", () => mudarMes(1));
  $("#confirmar").addEventListener("click", async () => {
    const btn = $("#confirmar");
    btn.disabled = true;
    try {
      await post("/reservar", { data: st.data, inicio: st.inicio });
      await carregar();
    } catch (e) {
      mostrar($("#erro-cal"), e.message);
      if (e.indisponivel) carregarHorarios(st.data);
    } finally { btn.disabled = false; }
  });
  $("#quero-desmarcar").addEventListener("click", () => { $("#desm").classList.remove("oculto"); $("#quero-desmarcar").classList.add("oculto"); });
  $("#desm").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const f = ev.target;
    try {
      await post("/desmarcar", { motivo: f.motivo.value, aceite: f.aceite.checked });
      f.classList.add("oculto");
      await carregar();
    } catch (e) { mostrar($("#erro-desm"), e.message); }
  });
  carregar();
})();
