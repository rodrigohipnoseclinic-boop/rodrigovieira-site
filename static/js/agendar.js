// Página pública de agendamento.
// Sem Pix: modalidade → dia e horário → dados e selfie.
// Com Pix: modalidade → dados e selfie → Pix → (pagamento confirmado) → dia e horário.
(() => {
  const $ = (s) => document.querySelector(s);
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const br = (d) => d.split("-").reverse().join("/");
  const st = { info: null, modalidade: null, mes: null, data: null, inicio: null, foto: null, pix: false, pedido: null, token: null, pago: false };
  const cred = () => (st.pix ? `&pedido=${encodeURIComponent(st.pedido)}&token=${encodeURIComponent(st.token)}` : "");
  const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const GUARDA = "agenda-pedido";

  async function api(caminho, opcoes) {
    const r = await fetch(`/api/agenda/${caminho}`, opcoes);
    const j = await r.json().catch(() => ({ erro: "Falha de conexão." }));
    if (!r.ok) throw Object.assign(new Error(j.erro || "Erro"), j, { status: r.status });
    return j;
  }
  const mostrar = (el, txt) => { el.textContent = txt; el.classList.toggle("oculto", !txt); };
  const habilitar = (id, sim) => $(id).setAttribute("aria-disabled", sim ? "false" : "true");

  async function iniciar() {
    try {
      st.info = await api("info");
    } catch (e) {
      mostrar($("#erro-geral"), "Não foi possível carregar a agenda. Tente de novo em instantes.");
      return;
    }
    const i = st.info;
    $("#titulo").textContent = i.servico;
    $("#descricao").textContent = i.descricao;
    $("#resumo").innerHTML = `<span>${esc(i.profissional)}</span><span>Duração: ${i.duracao} min</span>`;
    $("#aviso-pag").textContent = i.aviso_pagamento;
    $("#aviso-pag").classList.toggle("oculto", !i.aviso_pagamento);
    $("#modalidades").innerHTML = i.modalidades.map((m) => `
      <label class="opcao"><input type="radio" name="modalidade" value="${m.id}">
        <strong>${esc(m.nome)}</strong><span class="muted">${esc(m.endereco || (m.id === "online" ? "Por videochamada" : ""))}</span></label>`).join("");
    if (!i.modalidades.length) mostrar($("#erro-geral"), "No momento não há agenda aberta. Fale pelo contato: " + i.contato);
    st.mes = i.hoje.slice(0, 7);
    if (i.pix.ativo) modoPix();
  }

  // ---------- Pix ----------
  function modoPix() {
    st.pix = true;
    const i = st.info;
    $("#form").insertBefore($("#p3"), $("#p2"));
    $("#form").insertBefore($("#p-pix"), $("#p2"));
    $("#p3 .passo-tit b").textContent = "2";
    $("#p2 .passo-tit b").textContent = "4";
    $("#p2 .passo-tit").lastChild.textContent = " Escolha o dia e o horário (liberado após o pagamento)";
    $("#campo-cpf").classList.remove("oculto");
    $("#escolha").classList.add("oculto");
    $("#enviar").textContent = "Gerar Pix";
    $("#resumo").insertAdjacentHTML("beforeend", `<span>Valor: <strong>${reais(i.pix.valor)}</strong></span>`);
    $("#aviso-pag").textContent = `Pagamento via Pix (${reais(i.pix.valor)}). Depois da confirmação, o calendário é liberado para você escolher o horário. Prazo para agendar: ${i.pix.prazo_dias} dias.`;
    const q = new URLSearchParams(location.search);
    let salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(GUARDA) || "null"); } catch { /* sem armazenamento */ }
    const p = q.get("p") || salvo?.p, t = q.get("t") || salvo?.t;
    if (p && t) retomar(p, t);
  }
  const guardar = () => { try { localStorage.setItem(GUARDA, JSON.stringify({ p: st.pedido, t: st.token })); } catch { /* ok */ } };
  const esquecer = () => { try { localStorage.removeItem(GUARDA); } catch { /* ok */ } };

  async function retomar(p, t) {
    st.pedido = p; st.token = t;
    try {
      const { pedido } = await api(`pedido?pedido=${encodeURIComponent(p)}&token=${encodeURIComponent(t)}`);
      aplicarPedido(pedido);
    } catch (e) {
      esquecer();
      if (new URLSearchParams(location.search).get("p")) mostrar($("#erro-geral"), e.message);
    }
  }

  function aplicarPedido(p) {
    st.modalidade = st.modalidade || p.modalidade;
    const r = document.querySelector(`#modalidades input[value="${st.modalidade}"]`);
    if (r) r.checked = true;
    if (p.status === "pendente") return mostrarPix(p);
    if (p.status === "pago") return liberarCalendario(p);
    esquecer();
    const msg = {
      usado: "Este pagamento já foi usado para agendar uma consulta. Confira seu e-mail de confirmação.",
      estornado: "Este pagamento foi estornado.", expirado: "Este Pix expirou. Preencha os dados para gerar outro.",
      cancelado: "Esta cobrança foi cancelada. Preencha os dados para gerar outra.",
      divergente: "Recebemos um valor diferente do cobrado. Fale com o consultório: " + st.info.contato,
    }[p.status] || "Não foi possível usar este pagamento.";
    mostrar($("#erro-geral"), msg);
  }

  function mostrarPix(p) {
    habilitar("#p1", false); habilitar("#p3", false);
    $("#p-pix").classList.remove("oculto");
    $("#pix-valor").textContent = reais(p.valor);
    $("#pix-codigo").value = p.copia_cola;
    $("#pix-qr").src = p.qr_imagem || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Ctext x='1' y='6' font-size='2'%3EPIX TESTE%3C/text%3E%3C/svg%3E";
    $("#p-pix").scrollIntoView({ behavior: "smooth", block: "start" });
    clearInterval(st.timer);
    st.timer = setInterval(() => verificar(false), 5000);
  }

  async function verificar(manual) {
    try {
      const { pedido } = await api(`pedido?pedido=${encodeURIComponent(st.pedido)}&token=${encodeURIComponent(st.token)}`);
      if (pedido.status === "pendente") {
        if (manual) $("#pix-status").textContent = "Ainda não recebemos a confirmação. Se já pagou, aguarde alguns segundos.";
        return;
      }
      clearInterval(st.timer);
      aplicarPedido(pedido);
    } catch (e) {
      if (manual) $("#pix-status").textContent = e.message;
    }
  }

  function liberarCalendario(p) {
    clearInterval(st.timer);
    st.pago = true;
    guardar();
    habilitar("#p1", true); habilitar("#p3", false);
    $("#p3").classList.add("oculto");
    $("#p-pix").classList.remove("oculto");
    $("#p-pix").innerHTML = `<p class="passo-tit"><b>3</b> Pagamento confirmado ✓</p><p class="aviso aviso--ok">Pagamento de ${reais(p.valor)} confirmado${p.nome ? `, ${esc(p.nome.split(" ")[0])}` : ""}. Escolha o horário${p.prazo_ate ? ` até ${br(p.prazo_ate)}` : ""}. Se precisar sair, use o link que enviamos por e-mail para voltar.</p>`;
    habilitar("#p2", true);
    carregarMes();
    $("#p2").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function gerarPix(f) {
    const erro = (t) => { mostrar($("#erro"), t); $("#erro").scrollIntoView({ block: "center" }); };
    if (!st.modalidade) return erro("Escolha presencial ou online.");
    if (!f.nome.value.trim() || !f.email.value.trim() || !f.telefone.value.trim() || !f.cpf.value.trim()) return erro("Preencha nome, CPF, e-mail e WhatsApp.");
    if (!st.foto) return erro("Tire uma selfie ou envie uma foto para continuar.");
    if (!f.consentimento.checked) return erro("Para continuar, marque a autorização de uso dos dados.");
    mostrar($("#erro"), "");
    const btn = $("#enviar");
    btn.disabled = true; btn.textContent = "Gerando Pix…";
    try {
      const r = await api("pedido", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modalidade: st.modalidade, nome: f.nome.value, email: f.email.value, telefone: f.telefone.value,
          cpf: f.cpf.value, foto: st.foto, consentimento: true, site: f.site.value }),
      });
      st.pedido = r.pedido.id; st.token = r.token;
      guardar();
      aplicarPedido(r.pedido);
    } catch (e) {
      erro(e.message);
    } finally {
      btn.disabled = false; btn.textContent = "Gerar Pix";
    }
  }

  async function confirmarHorario() {
    const box = $("#erro-cal");
    if (!st.inicio) return mostrar(box, "Escolha um horário.");
    mostrar(box, "");
    const btn = $("#confirmar-horario");
    btn.disabled = true; btn.textContent = "Confirmando…";
    try {
      const r = await api("reservar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido: st.pedido, token: st.token, modalidade: st.modalidade, data: st.data, inicio: st.inicio }),
      });
      esquecer();
      sucesso(r, "");
    } catch (e) {
      mostrar(box, e.message);
      if (e.indisponivel) { st.inicio = null; mostrarAlternativas(e.alternativas, "#alternativas-cal"); }
    } finally {
      btn.disabled = false; btn.textContent = "Confirmar horário";
    }
  }

  async function carregarMes() {
    const [a, m] = st.mes.split("-").map(Number);
    $("#mes-nome").textContent = `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a}`;
    $("#mes-ant").disabled = st.mes <= st.info.hoje.slice(0, 7);
    $("#mes-prox").disabled = st.mes >= st.info.ate.slice(0, 7);
    $("#cal").innerHTML = "";
    $("#cal-msg").textContent = "Carregando dias disponíveis…";
    let dias = [];
    try {
      dias = (await api(`dias?modalidade=${st.modalidade}&mes=${st.mes}${cred()}`)).dias;
    } catch (e) {
      $("#cal-msg").textContent = e.message;
      return;
    }
    const prim = new Date(Date.UTC(a, m - 1, 1)).getUTCDay();
    const total = new Date(Date.UTC(a, m, 0)).getUTCDate();
    let h = ["D", "S", "T", "Q", "Q", "S", "S"].map((d) => `<span aria-hidden="true">${d}</span>`).join("");
    h += "<span></span>".repeat(prim);
    for (let d = 1; d <= total; d++) {
      const data = `${st.mes}-${String(d).padStart(2, "0")}`;
      const livre = dias.includes(data);
      h += `<button type="button" data-data="${data}" class="${livre ? "livre" : ""}${data === st.data ? " sel" : ""}" ${livre ? "" : "disabled"} aria-label="${d} de ${MESES[m - 1]}${livre ? ", com horários" : ", sem horários"}">${d}</button>`;
    }
    $("#cal").innerHTML = h;
    $("#cal-msg").textContent = dias.length ? "Toque em um dia destacado." : "Sem horários livres neste mês. Veja o próximo.";
  }

  async function carregarHorarios(data) {
    st.data = data; st.inicio = null;
    document.querySelectorAll("#cal button").forEach((b) => b.classList.toggle("sel", b.dataset.data === data));
    $("#horas").innerHTML = "";
    if (!st.pix) habilitar("#p3", false);
    $("#confirmar-box").classList.add("oculto");
    $("#cal-msg").textContent = "Carregando horários…";
    try {
      const { horarios } = await api(`horarios?modalidade=${st.modalidade}&data=${data}${cred()}`);
      $("#cal-msg").textContent = horarios.length ? `Horários em ${br(data)}:` : "Esse dia acabou de lotar. Escolha outro.";
      $("#horas").innerHTML = horarios.map((h) => `<button type="button" class="hora" data-h="${h}">${h}</button>`).join("");
    } catch (e) {
      $("#cal-msg").textContent = e.message;
    }
  }

  function escolherHora(data, h) {
    st.data = data; st.inicio = h;
    document.querySelectorAll(".hora").forEach((b) => b.classList.toggle("sel", b.dataset.h === h && (b.dataset.data || data) === data));
    const mod = st.info.modalidades.find((m) => m.id === st.modalidade);
    if (st.pix) {
      $("#escolha-pix").textContent = `${mod.nome} · ${br(data)} às ${h}`;
      $("#confirmar-box").classList.remove("oculto");
      $("#confirmar-box").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    $("#escolha").textContent = `${mod.nome} · ${br(data)} às ${h}`;
    habilitar("#p3", true);
    $("#p3").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Reduz a foto no próprio aparelho (máx. 900 px, JPEG) antes de enviar.
  async function prepararFoto(arquivo) {
    if (!arquivo || !arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
    let img;
    try {
      img = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch {
      img = await new Promise((ok, falha) => {
        const i = new Image();
        i.onload = () => ok(i); i.onerror = () => falha(new Error("Não foi possível abrir esta imagem."));
        i.src = URL.createObjectURL(arquivo);
      });
    }
    const esc = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  }
  async function aoEscolherFoto(ev) {
    const prev = $("#foto-prev");
    try {
      st.foto = await prepararFoto(ev.target.files[0]);
      prev.style.backgroundImage = `url(${st.foto})`;
      prev.textContent = "";
      prev.classList.add("ok");
      mostrar($("#erro"), "");
    } catch (e) {
      mostrar($("#erro"), e.message);
    }
    ev.target.value = "";
  }

  function mostrarAlternativas(alts, onde = "#alternativas") {
    const box = $(onde);
    if (!alts?.length) { box.classList.add("oculto"); return; }
    box.innerHTML = "<p><strong>Horários ainda livres:</strong></p>" + alts.map((a) =>
      `<p class="muted" style="margin:.6em 0 .3em">${br(a.data)}</p><div class="horas" style="margin:0">${a.horarios.map((h) =>
        `<button type="button" class="hora" data-data="${a.data}" data-h="${h}">${h}</button>`).join("")}</div>`).join("");
    box.classList.remove("oculto");
  }

  function sucesso(r, email) {
    const c = r.consulta;
    $("#form").classList.add("oculto");
    $("#sucesso-txt").innerHTML = `
      <p><strong>${esc(c.modalidade)}</strong> · ${br(c.data)}, das ${c.inicio} às ${c.fim}</p>
      ${c.endereco ? `<p>Endereço: ${esc(c.endereco)}</p>` : ""}
      ${c.orientacoes ? `<p class="muted">${esc(c.orientacoes)}</p>` : ""}
      ${st.pix ? "" : `<p class="muted">${esc(st.info.aviso_pagamento)}</p>`}
      <p class="muted">${r.email_enviado ? `Enviamos a confirmação${email ? ` para ${esc(email)}` : " por e-mail"}.` : "Não conseguimos enviar o e-mail agora, mas sua consulta está registrada."}</p>
      <p class="muted">${esc(st.info.orientacoes_alteracao)}</p>`;
    $("#sucesso").classList.remove("oculto");
    $("#sucesso").focus();
  }

  async function enviar(ev) {
    ev.preventDefault();
    const f = ev.target;
    if (st.pix) return gerarPix(f);
    const erro = (t) => { mostrar($("#erro"), t); $("#erro").scrollIntoView({ block: "center" }); };
    if (!st.inicio) return erro("Escolha o dia e o horário.");
    if (!f.nome.value.trim() || !f.email.value.trim() || !f.telefone.value.trim()) return erro("Preencha nome, e-mail e WhatsApp.");
    if (!st.foto) return erro("Tire uma selfie ou envie uma foto para concluir.");
    if (!f.consentimento.checked) return erro("Para agendar, marque a autorização de uso dos dados.");
    mostrar($("#erro"), "");
    const btn = $("#enviar");
    btn.disabled = true; btn.textContent = "Confirmando…";
    try {
      const r = await api("reservar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modalidade: st.modalidade, data: st.data, inicio: st.inicio, nome: f.nome.value, email: f.email.value,
          telefone: f.telefone.value, foto: st.foto, consentimento: true, site: f.site.value }),
      });
      sucesso(r, f.email.value);
    } catch (e) {
      erro(e.message);
      if (e.indisponivel) {
        st.inicio = null;
        mostrarAlternativas(e.alternativas);
        if (!e.alternativas?.length) $("#alternativas").innerHTML = "";
      }
    } finally {
      btn.disabled = false; btn.textContent = "Confirmar agendamento";
    }
  }

  $("#modalidades").addEventListener("change", (e) => {
    st.modalidade = e.target.value; st.data = null; st.inicio = null;
    $("#horas").innerHTML = "";
    $("#confirmar-box").classList.add("oculto");
    if (st.pix && !st.pago) { habilitar("#p3", true); return; }
    habilitar("#p2", true); if (!st.pix) habilitar("#p3", false);
    carregarMes();
  });
  $("#cal").addEventListener("click", (e) => { const b = e.target.closest("button.livre"); if (b) carregarHorarios(b.dataset.data); });
  $("#horas").addEventListener("click", (e) => { const b = e.target.closest(".hora"); if (b) escolherHora(st.data, b.dataset.h); });
  $("#alternativas").addEventListener("click", (e) => {
    const b = e.target.closest(".hora");
    if (!b) return;
    escolherHora(b.dataset.data, b.dataset.h);
    document.querySelectorAll("#alternativas .hora").forEach((x) => x.classList.toggle("sel", x === b));
    mostrar($("#erro"), "");
  });
  const mudarMes = (n) => {
    const [a, m] = st.mes.split("-").map(Number);
    const d = new Date(Date.UTC(a, m - 1 + n, 1));
    st.mes = d.toISOString().slice(0, 7);
    carregarMes();
  };
  $("#mes-ant").addEventListener("click", () => mudarMes(-1));
  $("#mes-prox").addEventListener("click", () => mudarMes(1));
  $("#foto-cam").addEventListener("change", aoEscolherFoto);
  $("#foto-arq").addEventListener("change", aoEscolherFoto);
  $("#form").addEventListener("submit", enviar);
  $("#confirmar-horario").addEventListener("click", confirmarHorario);
  $("#pix-verificar").addEventListener("click", () => verificar(true));
  $("#pix-copiar").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#pix-codigo").value); } catch { $("#pix-codigo").select(); document.execCommand("copy"); }
    $("#pix-copiar").textContent = "Copiado ✓";
  });
  $("#alternativas-cal").addEventListener("click", (e) => {
    const b = e.target.closest(".hora");
    if (!b) return;
    escolherHora(b.dataset.data, b.dataset.h);
    document.querySelectorAll("#alternativas-cal .hora").forEach((x) => x.classList.toggle("sel", x === b));
  });
  iniciar();
})();
