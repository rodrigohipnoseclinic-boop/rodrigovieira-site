// Painel da agenda: consultas, bloqueios, horários, configurações,
// clientes, registros e usuários. Fala só com /api/painel.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s = "") => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const br = (d) => d.split("-").reverse().join("/");
  const SEM = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  const hojeISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const soma = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const dow = (d) => new Date(d + "T00:00:00Z").getUTCDay();
  const st = { eu: null, cfg: null, tela: "agenda", vista: "semana", ref: hojeISO() };
  const pode = (area) => st.eu?.papel === "admin" || ["agenda", "consultas", "bloqueios", "clientes", "emails", "pagamentos"].includes(area);

  async function api(caminho, { metodo = "GET", dados } = {}) {
    const r = await fetch(`/api/painel/${caminho}`, {
      method: metodo, credentials: "same-origin",
      headers: dados !== undefined || metodo !== "GET" ? { "Content-Type": "application/json", "X-Painel": "1" } : {},
      body: dados !== undefined ? JSON.stringify(dados) : undefined,
    });
    const j = await r.json().catch(() => ({ erro: "Falha de conexão." }));
    if (r.status === 401 && st.eu && caminho !== "entrar") { st.eu = null; telaLogin("Sua sessão expirou. Entre novamente."); }
    if (!r.ok) throw Object.assign(new Error(j.erro || "Erro"), j, { status: r.status });
    return j;
  }
  const form = (f) => Object.fromEntries(new FormData(f).entries());
  const aviso = (el, txt, tipo = "erro") => { el.className = `aviso aviso--${tipo}`; el.textContent = txt; el.classList.toggle("oculto", !txt); };
  const dlg = $("#dlg");
  const abrir = (html) => { $("#dlg-c").innerHTML = html; dlg.showModal(); };
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-fechar]")) dlg.close(); });

  // ---------- login ----------
  async function iniciar() {
    let e;
    try { e = await api("estado"); } catch (x) { return telaSimples(`<div class="aviso aviso--erro">${esc(x.message)}</div>`); }
    if (!e.configurado) return telaSimples(`<h1>Painel da agenda</h1><div class="aviso aviso--info">O painel ainda não foi ativado. É preciso criar a variável <strong>AGENDA_SEGREDO</strong> no Netlify (Configuração do site → Variáveis de ambiente) com uma frase secreta de pelo menos 24 caracteres e publicar o site de novo.</div>`);
    if (e.primeiro_acesso) return telaPrimeiro();
    if (!e.usuario) return telaLogin();
    st.eu = e.usuario;
    entrarNoPainel();
  }
  const telaSimples = (html) => { $("#app").innerHTML = `<main class="ag" style="max-width:460px">${html}</main>`; };

  function telaLogin(msg = "") {
    telaSimples(`<h1>Painel da agenda</h1><form class="cartao" id="f">
      <label class="campo"><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label>
      <label class="campo"><span>Senha</span><input name="senha" type="password" autocomplete="current-password" required></label>
      <div id="m" class="aviso oculto" role="alert"></div><button class="btn">Entrar</button></form>`);
    if (msg) aviso($("#m"), msg, "info");
    $("#f").onsubmit = async (ev) => {
      ev.preventDefault();
      try { st.eu = (await api("entrar", { metodo: "POST", dados: form(ev.target) })).usuario; entrarNoPainel(); }
      catch (x) { aviso($("#m"), x.message); }
    };
  }

  function telaPrimeiro() {
    telaSimples(`<h1>Primeiro acesso</h1><p class="muted">Crie a conta de administrador. O código de configuração é o valor da variável AGENDA_SEGREDO.</p>
      <form class="cartao" id="f">
      <label class="campo"><span>Código de configuração</span><input name="codigo" type="password" required></label>
      <label class="campo"><span>Seu nome</span><input name="nome" required></label>
      <label class="campo"><span>E-mail</span><input name="email" type="email" autocomplete="username" required></label>
      <label class="campo"><span>Senha (mínimo 10 caracteres)</span><input name="senha" type="password" autocomplete="new-password" minlength="10" required></label>
      <div id="m" class="aviso oculto" role="alert"></div><button class="btn">Criar acesso</button></form>`);
    $("#f").onsubmit = async (ev) => {
      ev.preventDefault();
      try { st.eu = (await api("primeiro-acesso", { metodo: "POST", dados: form(ev.target) })).usuario; entrarNoPainel(); }
      catch (x) { aviso($("#m"), x.message); }
    };
  }

  // ---------- estrutura ----------
  const TELAS = [
    ["agenda", "Agenda", "agenda"], ["pagamentos", "Pagamentos", "pagamentos"], ["bloqueios", "Bloqueios e extras", "bloqueios"], ["horarios", "Horários de atendimento", "config"],
    ["config", "Configurações", "config"], ["clientes", "Clientes", "clientes"], ["registros", "Registros", "emails"], ["conta", "Usuários e conta", "agenda"],
  ];
  async function entrarNoPainel() {
    st.cfg = (await api("config")).config;
    $("#app").innerHTML = `<div class="pn"><nav class="pn-menu"><strong>Agenda</strong>
      ${TELAS.filter((t) => pode(t[2])).map(([id, nome]) => `<button data-tela="${id}">${nome}</button>`).join("")}
      <a class="pn-link" href="/agendar/" target="_blank" rel="noopener">Ver página pública ↗</a>
      <span class="pn-eu">${esc(st.eu.nome)} · ${st.eu.papel === "admin" ? "administrador" : "assistente"}<br><button data-sair style="padding:4px 0">Sair</button></span>
      </nav><main class="pn-main" id="tela"></main></div>`;
    $(".pn-menu").onclick = async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.sair !== undefined) { await api("sair", { metodo: "POST" }); st.eu = null; return telaLogin(); }
      ir(b.dataset.tela);
    };
    ir(st.tela);
  }
  function ir(tela) {
    st.tela = tela;
    $("#tela").onclick = null;
    document.querySelectorAll(".pn-menu [data-tela]").forEach((b) => b.classList.toggle("at", b.dataset.tela === tela));
    $("#tela").innerHTML = `<p class="muted">Carregando…</p>`;
    ({ agenda: telaAgenda, pagamentos: telaPagamentos, bloqueios: telaBloqueios, horarios: telaHorarios, config: telaConfig, clientes: telaClientes, registros: telaRegistros, conta: telaConta })[tela]()
      .catch((e) => { $("#tela").innerHTML = `<div class="aviso aviso--erro">${esc(e.message)}</div>`; });
  }
  const nomeMod = (m) => st.cfg.modalidades[m]?.nome || m;

  // ---------- agenda ----------
  function periodo() {
    const r = st.ref;
    if (st.vista === "dia") return [r, r];
    if (st.vista === "semana") { const ini = soma(r, -dow(r)); return [ini, soma(ini, 6)]; }
    const ini = r.slice(0, 8) + "01";
    const ultimo = soma(soma(ini, 32).slice(0, 8) + "01", -1);
    return [soma(ini, -dow(ini)), soma(ultimo, 6 - dow(ultimo))];
  }
  const evento = (c) => `<button class="ev ${c.modalidade} ${c.status}" data-id="${c.id}">
    <strong>${c.inicio}–${c.fim}</strong> ${esc(c.cliente.nome)}<br><small>${esc(nomeMod(c.modalidade))}${c.status === "cancelada" ? " · cancelada" : ""}</small></button>`;
  const excDoDia = (excs, d) => excs.filter((e) => e.inicio_data <= d && d <= e.fim_data).map((e) =>
    `<div class="ev ${e.tipo === "extra" ? "extra" : "bloq"}"><small>${e.tipo === "extra" ? "Extra" : "Bloqueio"} ${e.inicio ? `${e.inicio}–${e.fim}` : "dia todo"}${e.modalidade !== "todas" ? ` · ${esc(nomeMod(e.modalidade))}` : ""}${e.motivo ? ` · ${esc(e.motivo)}` : ""}</small></div>`).join("");

  async function telaAgenda() {
    const [de, ate] = periodo();
    const { consultas, excecoes } = await api(`agenda?de=${de}&ate=${ate}`);
    const porDia = (d) => consultas.filter((c) => c.data === d && (st.mostrarCanceladas || c.status !== "cancelada"));
    const [a, m] = st.ref.split("-").map(Number);
    const titulo = st.vista === "dia" ? `${SEM[dow(st.ref)]}, ${br(st.ref)}` : st.vista === "semana" ? `${br(de)} a ${br(ate)}` : `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a}`;
    let corpo;
    if (st.vista === "dia") {
      const cs = porDia(st.ref);
      corpo = `${excDoDia(excecoes, st.ref)}${cs.length ? cs.map(evento).join("") : `<p class="muted">Nenhuma consulta neste dia.</p>`}`;
    } else {
      const dias = []; for (let d = de; d <= ate; d = soma(d, 1)) dias.push(d);
      corpo = `<div class="rol"><div class="${st.vista === "semana" ? "semana" : "mes"}">${st.vista === "mes" ? SEM.map((n) => `<h3 style="text-align:center">${n.slice(0, 3)}</h3>`).join("") : ""}${dias.map((d) => `
        <div class="${d === hojeISO() ? "hoje" : ""} ${st.vista === "mes" && d.slice(0, 7) !== st.ref.slice(0, 7) ? "fora" : ""}">
        <h3><a href="#" data-dia="${d}" style="color:inherit">${st.vista === "semana" ? SEM[dow(d)].slice(0, 3) + " " : ""}${d.slice(8)}</a></h3>
        ${excDoDia(excecoes, d)}${porDia(d).map(evento).join("")}</div>`).join("")}</div></div>`;
    }
    const ativas = consultas.filter((c) => c.status === "confirmada" && c.data >= de && c.data <= ate).length;
    $("#tela").innerHTML = `<h1>Agenda</h1>
      <div class="barra"><div class="seg">${["dia", "semana", "mes"].map((v) => `<button data-vista="${v}" class="${st.vista === v ? "at" : ""}">${{ dia: "Dia", semana: "Semana", mes: "Mês" }[v]}</button>`).join("")}</div>
        <button class="btn btn--linha btn--peq" data-nav="-1">‹</button><button class="btn btn--linha btn--peq" data-nav="0">Hoje</button><button class="btn btn--linha btn--peq" data-nav="1">›</button>
        <strong>${titulo}</strong><span class="esp"></span>
        <label class="check" style="margin:0"><input type="checkbox" id="ver-canc" ${st.mostrarCanceladas ? "checked" : ""}> canceladas</label>
        ${pode("consultas") ? `<button class="btn btn--peq" id="nova">+ Nova consulta</button>` : ""}</div>
      <p class="muted">${ativas} consulta(s) confirmada(s) no período.</p>${corpo}`;
    const t = $("#tela");
    t.querySelectorAll("[data-vista]").forEach((b) => b.onclick = () => { st.vista = b.dataset.vista; telaAgenda(); });
    t.querySelectorAll("[data-nav]").forEach((b) => b.onclick = () => {
      const n = Number(b.dataset.nav);
      if (!n) st.ref = hojeISO();
      else if (st.vista === "dia") st.ref = soma(st.ref, n);
      else if (st.vista === "semana") st.ref = soma(st.ref, 7 * n);
      else { const d = new Date(Date.UTC(a, m - 1 + n, 1)); st.ref = d.toISOString().slice(0, 10); }
      telaAgenda();
    });
    t.querySelectorAll("[data-dia]").forEach((x) => x.onclick = (e) => { e.preventDefault(); st.ref = x.dataset.dia; st.vista = "dia"; telaAgenda(); });
    t.querySelectorAll(".ev[data-id]").forEach((b) => b.onclick = () => detalhe(consultas.find((c) => c.id === b.dataset.id)));
    $("#ver-canc").onchange = (e) => { st.mostrarCanceladas = e.target.checked; telaAgenda(); };
    if ($("#nova")) $("#nova").onclick = () => novaConsulta();
  }

  function detalhe(c) {
    const tel = (c.cliente.telefone || "").replace(/\D/g, "");
    const wa = tel ? `https://wa.me/${tel.length <= 11 ? "55" + tel : tel}` : "";
    const hist = c.historico.map((h) => `<li>${new Date(h.quando).toLocaleString("pt-BR")}: ${esc(h.acao)}${h.de ? ` (antes ${br(h.de.data)} ${h.de.inicio})` : ""}${h.motivo ? ` · ${esc(h.motivo)}` : ""} · ${esc(h.por)}</li>`).join("");
    abrir(`<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
        ${c.cliente.id ? `<img class="foto-g" alt="Foto de ${esc(c.cliente.nome)}" src="/api/painel/clientes/${c.cliente.id}/foto" onerror="this.style.display='none'">` : ""}
        <div style="flex:1;min-width:200px"><h2>${esc(c.cliente.nome)}</h2>
        <p style="margin:0">${SEM[dow(c.data)]}, ${br(c.data)} · ${c.inicio}–${c.fim} (${c.duracao} min)</p>
        <p style="margin:0"><span class="etq ${c.modalidade === "online" ? "etq--azul" : ""}">${esc(nomeMod(c.modalidade))}</span> ${c.status === "cancelada" ? `<span class="etq etq--erro">cancelada</span>` : ""} ${c.pedido ? `<span class="etq">pago via Pix</span>` : ""}</p></div></div>
      <p style="margin-top:12px">${c.cliente.telefone ? `📞 <a href="tel:${esc(c.cliente.telefone)}">${esc(c.cliente.telefone)}</a> · <a href="${wa}" target="_blank" rel="noopener">WhatsApp</a><br>` : ""}
        ${c.cliente.email ? `✉️ <a href="mailto:${esc(c.cliente.email)}">${esc(c.cliente.email)}</a>` : ""}</p>
      ${c.observacao ? `<p class="muted">Obs.: ${esc(c.observacao)}</p>` : ""}
      <details><summary class="muted">Histórico · ${c.id}</summary><ul class="muted" style="font-size:.85rem">${hist}</ul></details>
      <div id="m" class="aviso oculto" role="alert"></div><div id="acao"></div>
      <div class="acoes">${c.status === "confirmada" && pode("consultas") ? `<button class="btn btn--peq" id="transf">Transferir</button><button class="btn btn--perigo btn--peq" id="btn-cancelar">Cancelar consulta</button>` : ""}
      ${st.eu.papel === "admin" && c.cliente.id ? `<button class="btn btn--linha btn--peq" id="pront">Prontuário</button>` : ""}
      <button class="btn btn--linha btn--peq" data-fechar>Fechar</button></div>`);
    if ($("#pront")) $("#pront").onclick = () => { dlg.close(); telaProntuario(c.cliente.id); };
    if (!$("#transf")) return;
    $("#transf").onclick = () => {
      $("#acao").innerHTML = `<form id="ft" class="cartao" style="background:var(--c-fundo);margin-top:12px"><strong>Transferir para</strong>
        ${camposDataHora(c.modalidade, c.data)}
        <label class="check"><input type="checkbox" name="avisar" checked> Avisar o paciente por e-mail</label>
        <button class="btn btn--peq">Confirmar transferência</button></form>`;
      ligarDataHora($("#ft"));
      $("#ft").onsubmit = async (ev) => {
        ev.preventDefault();
        const d = form(ev.target);
        try {
          await api(`consultas/${c.id}/transferir`, { metodo: "POST", dados: { data: d.data, inicio: d.inicio_livre || d.inicio, modalidade: d.modalidade, avisar: !!d.avisar } });
          dlg.close(); telaAgenda();
        } catch (x) { aviso($("#m"), x.message); }
      };
    };
    $("#btn-cancelar").onclick = () => {
      $("#acao").innerHTML = `<form id="fc" class="cartao" style="background:var(--c-fundo);margin-top:12px">
        <label class="campo"><span>Motivo (opcional)</span><input name="motivo" maxlength="300"></label>
        <label class="check"><input type="checkbox" name="avisar" checked> Avisar o paciente por e-mail</label>
        <button class="btn btn--perigo btn--peq">Confirmar cancelamento</button></form>`;
      $("#fc").onsubmit = async (ev) => {
        ev.preventDefault();
        const d = form(ev.target);
        try { await api(`consultas/${c.id}/cancelar`, { metodo: "POST", dados: { motivo: d.motivo, avisar: !!d.avisar } }); dlg.close(); telaAgenda(); }
        catch (x) { aviso($("#m"), x.message); }
      };
    };
  }

  // Data + modalidade + horários livres (ou horário digitado livremente).
  const camposDataHora = (mod, data) => `<div class="linha2">
      <label class="campo"><span>Modalidade</span><select name="modalidade">${Object.keys(st.cfg.modalidades).map((m) => `<option value="${m}" ${m === mod ? "selected" : ""}>${esc(nomeMod(m))}</option>`).join("")}</select></label>
      <label class="campo"><span>Data</span><input type="date" name="data" value="${data}" required></label></div>
    <div class="linha2"><label class="campo"><span>Horários livres</span><select name="inicio"><option value="">carregando…</option></select></label>
      <label class="campo"><span>Ou outro horário</span><input type="time" name="inicio_livre" step="300"></label></div>`;
  function ligarDataHora(f) {
    const carregar = async () => {
      const sel = f.inicio;
      sel.innerHTML = `<option value="">carregando…</option>`;
      try {
        const { horarios } = await api(`livres?modalidade=${f.modalidade.value}&data=${f.data.value}`);
        sel.innerHTML = horarios.length ? horarios.map((h) => `<option>${h}</option>`).join("") : `<option value="">nenhum no horário de atendimento</option>`;
      } catch { sel.innerHTML = `<option value="">—</option>`; }
    };
    f.modalidade.onchange = carregar; f.data.onchange = carregar; carregar();
  }

  async function novaConsulta() {
    const { clientes } = await api("clientes");
    abrir(`<h2>Nova consulta</h2><form id="fn">
      ${camposDataHora(Object.keys(st.cfg.modalidades).find((m) => st.cfg.modalidades[m].ativa), st.vista === "dia" ? st.ref : hojeISO())}
      <label class="campo"><span>Duração (min)</span><input type="number" name="duracao" min="10" max="480" value="${st.cfg.duracao}"></label>
      <label class="campo"><span>Paciente</span><input name="nome" list="lista-cli" required autocomplete="off" placeholder="Nome completo"></label>
      <datalist id="lista-cli">${clientes.map((c) => `<option value="${esc(c.nome)}">`).join("")}</datalist>
      <div class="linha2"><label class="campo"><span>WhatsApp</span><input name="telefone" type="tel" required></label>
      <label class="campo"><span>E-mail (opcional)</span><input name="email" type="email"></label></div>
      <label class="campo"><span>Observação interna</span><input name="observacao" maxlength="500"></label>
      <label class="check"><input type="checkbox" name="avisar" checked> Enviar confirmação ao paciente (se tiver e-mail)</label>
      <div id="m" class="aviso oculto" role="alert"></div>
      <div class="acoes"><button class="btn btn--peq">Agendar</button><button type="button" class="btn btn--linha btn--peq" data-fechar>Cancelar</button></div></form>`);
    const f = $("#fn");
    ligarDataHora(f);
    f.nome.onchange = () => {
      const c = clientes.find((x) => x.nome === f.nome.value);
      if (c) { f.telefone.value = c.telefone; f.email.value = c.email; }
    };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const d = form(f);
      const inicio = d.inicio_livre || d.inicio;
      if (!inicio) return aviso($("#m"), "Escolha ou digite um horário.");
      try {
        await api("consultas", { metodo: "POST", dados: { modalidade: d.modalidade, data: d.data, inicio, duracao: Number(d.duracao), observacao: d.observacao,
          avisar: !!d.avisar, cliente: { nome: d.nome, telefone: d.telefone, email: d.email } } });
        dlg.close(); st.ref = d.data; telaAgenda();
      } catch (x) { aviso($("#m"), x.message); }
    };
  }

  // ---------- pagamentos ----------
  async function telaPagamentos() {
    const r = await api("pagamentos");
    const reais = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const ST = { pendente: ["aguardando", ""], pago: ["pago, sem horário", "etq--azul"], usado: ["pago e agendado", ""], estornado: ["estornado", "etq--erro"],
      expirado: ["expirado", "etq--erro"], cancelado: ["cancelado", "etq--erro"], divergente: ["valor diferente", "etq--erro"] };
    const recebido = r.pedidos.filter((p) => ["pago", "usado"].includes(p.status)).reduce((s, p) => s + p.valor, 0);
    $("#tela").innerHTML = `<h1>Pagamentos</h1>
      <div class="cartao"><p style="margin:0">Pix ${st.cfg.pix.ativo ? `<span class="etq">ligado</span> · ${reais(st.cfg.pix.valor)}` : `<span class="etq etq--erro">desligado</span>`}
        · Provedor: ${esc(r.provedor)} ${r.configurado ? `(${esc(r.ambiente)})` : `<span class="etq etq--erro">sem chave</span>`}</p>
        ${st.eu.papel === "admin" ? `<p class="muted" style="margin:.4em 0 0">Endereço do webhook para cadastrar no Asaas: <code>${esc(r.webhook)}</code></p>` : ""}
        <p class="muted" style="margin:.4em 0 0">Recebido (listados): <strong>${reais(recebido)}</strong></p></div>
      ${r.pedidos.length ? `<div class="rol"><table class="tabela"><tr><th>Data</th><th>Paciente</th><th>Valor</th><th>Status</th><th>Consulta</th><th></th></tr>
      ${r.pedidos.map((p) => `<tr><td>${new Date(p.criado).toLocaleString("pt-BR")}</td><td>${esc(p.cliente.nome)}<br><small class="muted">${esc(p.cliente.telefone)}</small></td>
        <td>${reais(p.valor)}</td><td><span class="etq ${ST[p.status]?.[1] || ""}">${ST[p.status]?.[0] || p.status}</span></td><td>${p.consulta ? `<small>${p.consulta}</small>` : "—"}</td>
        <td style="white-space:nowrap">${p.status === "pendente" ? `<button class="btn btn--linha btn--peq" data-acao="verificar" data-id="${p.id}">Verificar</button>` : ""}
          ${p.status === "usado" ? `<button class="btn btn--linha btn--peq" data-acao="liberar" data-id="${p.id}" title="Depois de cancelar a consulta, envia ao paciente um link para escolher outro horário">Liberar novo horário</button>` : ""}
          ${st.eu.papel === "admin" && ["pago", "usado", "divergente"].includes(p.status) ? `<button class="btn btn--perigo btn--peq" data-acao="estornar" data-id="${p.id}">Estornar</button>` : ""}</td></tr>`).join("")}</table></div>`
      : `<p class="muted">Nenhum pagamento ainda.</p>`}<div id="m" class="aviso oculto" role="alert"></div>`;
    $("#tela").querySelectorAll("[data-acao]").forEach((b) => b.onclick = async () => {
      const a = b.dataset.acao;
      if (a === "estornar" && !confirm("Devolver o valor ao paciente pelo Pix? Não dá para desfazer.")) return;
      b.disabled = true;
      try { await api(`pagamentos/${b.dataset.id}/${a}`, { metodo: "POST" }); telaPagamentos(); }
      catch (x) { aviso($("#m"), x.message); b.disabled = false; }
    });
  }

  // ---------- bloqueios e extras ----------
  async function telaBloqueios() {
    const { excecoes } = await api("excecoes");
    const hoje = hojeISO();
    const lista = excecoes.filter((e) => e.fim_data >= hoje).sort((a, b) => (a.inicio_data + (a.inicio || "")).localeCompare(b.inicio_data + (b.inicio || "")));
    $("#tela").innerHTML = `<h1>Bloqueios e horários extras</h1>
      <form class="cartao" id="fb"><div class="linha2">
        <label class="campo"><span>Tipo</span><select name="tipo"><option value="bloqueio">Bloquear (indisponível)</option><option value="extra">Abrir horário extra</option></select></label>
        <label class="campo"><span>Vale para</span><select name="modalidade"><option value="todas">Todas as modalidades</option>${Object.keys(st.cfg.modalidades).map((m) => `<option value="${m}">${esc(nomeMod(m))}</option>`).join("")}</select></label></div>
        <div class="linha2"><label class="campo"><span>De</span><input type="date" name="inicio_data" value="${hoje}" required></label>
        <label class="campo"><span>Até</span><input type="date" name="fim_data" value="${hoje}" required></label></div>
        <label class="check"><input type="checkbox" name="dia_todo" checked> Dia inteiro</label>
        <div class="linha2" id="hrs" hidden><label class="campo"><span>Das</span><input type="time" name="inicio" step="300"></label>
        <label class="campo"><span>Às</span><input type="time" name="fim" step="300"></label></div>
        <label class="campo"><span>Motivo (interno)</span><input name="motivo" maxlength="200" placeholder="Férias, congresso, consulta médica…"></label>
        <div id="m" class="aviso oculto" role="alert"></div><button class="btn btn--peq">Salvar</button></form>
      <h2>Próximos</h2>${lista.length ? `<div class="rol"><table class="tabela"><tr><th>Tipo</th><th>Período</th><th>Horário</th><th>Modalidade</th><th>Motivo</th><th></th></tr>
      ${lista.map((e) => `<tr><td>${e.tipo === "extra" ? `<span class="etq">extra</span>` : `<span class="etq etq--erro">bloqueio</span>`}</td>
        <td>${br(e.inicio_data)}${e.fim_data !== e.inicio_data ? ` a ${br(e.fim_data)}` : ""}</td><td>${e.inicio ? `${e.inicio}–${e.fim}` : "dia todo"}</td>
        <td>${e.modalidade === "todas" ? "todas" : esc(nomeMod(e.modalidade))}</td><td>${esc(e.motivo)}</td><td><button class="x" data-del="${e.id}" title="Remover" aria-label="Remover">×</button></td></tr>`).join("")}</table></div>`
      : `<p class="muted">Nenhum bloqueio ou extra futuro.</p>`}`;
    const f = $("#fb");
    const ajustar = () => {
      if (f.tipo.value === "extra") f.dia_todo.checked = false;
      $("#hrs").hidden = f.dia_todo.checked;
    };
    f.dia_todo.onchange = ajustar; f.tipo.onchange = ajustar;
    f.inicio_data.onchange = () => { if (f.fim_data.value < f.inicio_data.value) f.fim_data.value = f.inicio_data.value; };
    const salvar = async (forcar) => {
      const d = form(f);
      const dados = { ...d, inicio: d.dia_todo ? null : d.inicio, fim: d.dia_todo ? null : d.fim, forcar };
      try { await api("excecoes", { metodo: "POST", dados }); telaBloqueios(); }
      catch (x) {
        if (x.conflitos) {
          $("#m").className = "aviso aviso--info";
          $("#m").innerHTML = `${esc(x.message)}<ul>${x.conflitos.map((c) => `<li>${br(c.data)} ${c.inicio}–${c.fim} · ${esc(c.nome)}</li>`).join("")}</ul>
            <button type="button" class="btn btn--perigo btn--peq" id="forcar">Bloquear mesmo assim</button>`;
          $("#forcar").onclick = () => salvar(true);
        } else aviso($("#m"), x.message);
      }
    };
    f.onsubmit = (ev) => { ev.preventDefault(); salvar(false); };
    $("#tela").querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
      if (!confirm("Remover este item?")) return;
      await api(`excecoes/${b.dataset.del}`, { metodo: "DELETE" }); telaBloqueios();
    });
  }

  // ---------- horários de atendimento ----------
  async function telaHorarios() {
    st.cfg = (await api("config")).config;
    const c = structuredClone(st.cfg);
    const mods = Object.keys(c.modalidades);
    const render = () => {
      $("#tela").innerHTML = `<h1>Horários de atendimento</h1>
        <div class="cartao"><label class="check" style="margin:0"><input type="checkbox" id="comp" ${compartilhadaAtual() ? "checked" : ""}>
        <span><strong>Presencial e online usam a mesma agenda</strong><br><span class="muted">Marcado: nunca haverá duas consultas no mesmo horário, mesmo em modalidades diferentes. Desmarcado: as duas agendas são independentes.</span></span></label></div>
        ${mods.map((m) => {
          const x = c.modalidades[m];
          return `<section class="cartao" data-mod="${m}"><h2>${esc(x.nome)}</h2>
          <label class="check"><input type="checkbox" data-campo="ativa" ${x.ativa ? "checked" : ""}> Aceitar agendamentos ${esc(x.nome.toLowerCase())}</label>
          ${[1, 2, 3, 4, 5, 6, 0].map((d) => `<div class="dia-sem"><strong>${SEM[d]}</strong><div>
            ${(x.semana[d] || []).map((p, i) => `<div class="per"><input type="time" step="300" value="${p.inicio}" data-d="${d}" data-i="${i}" data-k="inicio"> até
              <input type="time" step="300" value="${p.fim}" data-d="${d}" data-i="${i}" data-k="fim"><button class="x" data-rem="${d}:${i}" aria-label="Remover período">×</button></div>`).join("") || `<span class="muted">Sem atendimento</span>`}
            <div><button class="btn btn--linha btn--peq" data-add="${d}" style="padding:.35em .9em">+ período</button>
            ${d !== 1 && (x.semana[1] || []).length ? `<button class="btn btn--linha btn--peq" data-copiar="${d}" style="padding:.35em .9em">copiar segunda</button>` : ""}</div></div></div>`).join("")}
          <label class="campo" style="margin-top:14px"><span>${m === "presencial" ? "Endereço" : "Endereço (não se aplica)"}</span><input data-campo="endereco" value="${esc(x.endereco)}" ${m === "online" ? "disabled" : ""}></label>
          <label class="campo"><span>Orientações enviadas no e-mail de confirmação</span><textarea data-campo="orientacoes" rows="2">${esc(x.orientacoes)}</textarea></label></section>`;
        }).join("")}
        <div id="m" class="aviso oculto" role="alert"></div><button class="btn" id="salvar">Salvar horários</button>`;
    };
    const compartilhadaAtual = () => c.modalidades.presencial.agenda === c.modalidades.online.agenda;
    const ler = () => {
      $("#tela").querySelectorAll("[data-mod]").forEach((s) => {
        const x = c.modalidades[s.dataset.mod];
        x.ativa = $("[data-campo=ativa]", s).checked;
        x.endereco = $("[data-campo=endereco]", s).value;
        x.orientacoes = $("[data-campo=orientacoes]", s).value;
        s.querySelectorAll("input[data-k]").forEach((i) => { x.semana[i.dataset.d][i.dataset.i][i.dataset.k] = i.value; });
      });
      c.modalidades.online.agenda = $("#comp").checked ? c.modalidades.presencial.agenda : "online";
      if (!$("#comp").checked && c.modalidades.presencial.agenda === "online") c.modalidades.presencial.agenda = "principal";
    };
    render();
    $("#tela").onclick = async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const s = b.closest("[data-mod]");
      if (s) ler();
      const x = s && c.modalidades[s.dataset.mod];
      if (b.dataset.add) { const l = x.semana[b.dataset.add] ||= []; const ult = l.at(-1); l.push({ inicio: ult ? ult.fim : "09:00", fim: ult ? "18:00" : "12:00" }); render(); }
      else if (b.dataset.rem) { const [d, i] = b.dataset.rem.split(":"); x.semana[d].splice(i, 1); if (!x.semana[d].length) delete x.semana[d]; render(); }
      else if (b.dataset.copiar) { x.semana[b.dataset.copiar] = structuredClone(x.semana[1]); render(); }
      else if (b.id === "salvar") {
        ler();
        try {
          const r = await api("config", { metodo: "PUT", dados: c });
          st.cfg = r.config;
          const fora = r.fora_do_horario || [];
          aviso($("#m"), fora.length ? `Salvo. Atenção: ${fora.length} consulta(s) futura(s) ficaram fora do novo horário e continuam marcadas: ${fora.map((f) => `${br(f.data)} ${f.inicio} ${f.nome}`).join("; ")}.` : "Horários salvos.", fora.length ? "info" : "ok");
        } catch (x2) { aviso($("#m"), x2.message); }
      }
    };
  }

  // ---------- configurações ----------
  async function telaConfig() {
    const rc = await api("config");
    st.cfg = rc.config;
    const c = st.cfg;
    const campo = (nome, rot, tipo = "text", extra = "") => `<label class="campo"><span>${rot}</span><input name="${nome}" type="${tipo}" value="${esc(c[nome])}" ${extra}></label>`;
    $("#tela").innerHTML = `<h1>Configurações</h1><form class="cartao" id="fc">
      <h2>Consulta</h2>${campo("servico", "Nome do atendimento")}
      <label class="campo"><span>Descrição na página de agendamento</span><textarea name="descricao" rows="2">${esc(c.descricao)}</textarea></label>
      <div class="linha2">${campo("duracao", "Duração da consulta (minutos)", "number", 'min="10" max="480" required')}
      ${campo("intervalo", "Intervalo entre consultas (minutos)", "number", 'min="0" max="240"')}</div>
      <div class="linha2">${campo("passo", "Espaçamento dos horários (min) · 0 = duração + intervalo", "number", 'min="0" max="480"')}
      ${campo("antecedencia_horas", "Antecedência mínima (horas)", "number", 'min="0" max="720"')}</div>
      ${campo("janela_dias", "Agenda aberta para os próximos (dias)", "number", 'min="1" max="365"')}
      <p class="muted">Mudar a duração vale para os novos agendamentos. As consultas já marcadas mantêm a duração original.</p>
      <h2>Contato e e-mails</h2>${campo("profissional", "Nome do profissional")}
      ${campo("email_admin", "E-mail que recebe as confirmações", "email")}
      ${campo("contato", "Contato informado ao paciente")}
      ${campo("aviso_pagamento", "Aviso sobre pagamento (quando o Pix está desligado)")}
      <h2>Pagamento via Pix</h2>
      <label class="check"><input type="checkbox" name="pix_ativo" ${c.pix.ativo ? "checked" : ""}> <span><strong>Exigir Pix antes de liberar o calendário</strong><br><span class="muted">Desligado: o paciente agenda direto e o pagamento é combinado à parte.</span></span></label>
      <div class="linha2"><label class="campo"><span>Valor da consulta (R$)</span><input name="pix_valor" type="number" step="0.01" min="0" value="${c.pix.valor}"></label>
      <label class="campo"><span>Prazo para agendar após pagar (dias)</span><input name="pix_prazo_dias" type="number" min="1" max="365" value="${c.pix.prazo_dias}"></label></div>
      <h2>WhatsApp</h2>
      <p class="muted">${rc.whatsapp_configurado ? `<span class="etq">credenciais da Meta configuradas</span>` : `<span class="etq etq--erro">faltam WHATSAPP_TOKEN e WHATSAPP_PHONE_ID no Netlify</span>`}</p>
      <label class="check"><input type="checkbox" name="wa_ativo" ${c.whatsapp.ativo ? "checked" : ""}> <span><strong>Enviar mensagens pelo WhatsApp</strong><br><span class="muted">Confirmação ao paciente e aviso para você a cada novo agendamento.</span></span></label>
      <label class="campo"><span>Seu WhatsApp (recebe o aviso de novo agendamento)</span><input name="wa_numero_admin" type="tel" value="${esc(c.whatsapp.numero_admin)}" placeholder="(19) 99999-9999"></label>
      <div class="linha2"><label class="campo"><span>Modelo: confirmação ao paciente</span><input name="wa_modelo_paciente" value="${esc(c.whatsapp.modelo_paciente)}"></label>
      <label class="campo"><span>Modelo: aviso para você</span><input name="wa_modelo_admin" value="${esc(c.whatsapp.modelo_admin)}"></label></div>
      <div class="linha2"><label class="campo"><span>Modelo: remarcação (opcional)</span><input name="wa_modelo_transferencia" value="${esc(c.whatsapp.modelo_transferencia)}"></label>
      <label class="campo"><span>Modelo: cancelamento (opcional)</span><input name="wa_modelo_cancelamento" value="${esc(c.whatsapp.modelo_cancelamento)}"></label></div>
      <p class="muted">Use os nomes exatos dos modelos aprovados no WhatsApp Business. Deixe vazio para não enviar aquele tipo de mensagem.</p>
      <label class="campo"><span>Como pedir alterações (vai no e-mail do paciente)</span><textarea name="orientacoes_alteracao" rows="2">${esc(c.orientacoes_alteracao)}</textarea></label>
      <div id="m" class="aviso oculto" role="alert"></div><button class="btn">Salvar configurações</button></form>`;
    $("#fc").onsubmit = async (ev) => {
      ev.preventDefault();
      const d = form(ev.target);
      for (const k of ["duracao", "intervalo", "passo", "antecedencia_horas", "janela_dias"]) d[k] = Number(d[k]);
      d.pix = { ativo: !!d.pix_ativo, valor: Number(d.pix_valor), prazo_dias: Number(d.pix_prazo_dias) };
      delete d.pix_ativo; delete d.pix_valor; delete d.pix_prazo_dias;
      d.whatsapp = { ...st.cfg.whatsapp, ativo: !!d.wa_ativo };
      for (const k of Object.keys(d)) if (k.startsWith("wa_")) { if (k !== "wa_ativo") d.whatsapp[k.slice(3)] = d[k]; delete d[k]; }
      try { st.cfg = (await api("config", { metodo: "PUT", dados: { ...st.cfg, ...d } })).config; aviso($("#m"), "Configurações salvas.", "ok"); }
      catch (x) { aviso($("#m"), x.message); }
    };
  }

  // ---------- clientes ----------
  async function telaClientes() {
    const { clientes } = await api("clientes");
    const lista = (filtro = "") => clientes.filter((c) => `${c.nome} ${c.email} ${c.telefone}`.toLowerCase().includes(filtro.toLowerCase()));
    const tabela = (l) => l.length ? `<div class="rol"><table class="tabela"><tr><th>Nome</th><th>WhatsApp</th><th>E-mail</th><th>Foto</th><th>Consultas</th></tr>
      ${l.map((c) => `<tr><td><a href="#" data-cli="${c.id}">${esc(c.nome)}</a></td><td>${esc(c.telefone)}</td><td>${esc(c.email)}</td><td>${c.foto ? "✓" : "—"}</td><td>${(c.consultas || []).length}</td></tr>`).join("")}</table></div>`
      : `<p class="muted">Nenhum cliente encontrado.</p>`;
    $("#tela").innerHTML = `<h1>Clientes</h1><div class="barra"><input id="busca" class="campo" style="margin:0;max-width:320px;padding:.6em .8em;border:1.5px solid var(--c-linha);border-radius:12px;font:inherit" placeholder="Buscar por nome, e-mail ou telefone"></div><div id="lista">${tabela(lista())}</div>`;
    $("#busca").oninput = (e) => { $("#lista").innerHTML = tabela(lista(e.target.value)); };
    $("#tela").onclick = async (e) => {
      const a = e.target.closest("[data-cli]");
      if (!a) return;
      e.preventDefault();
      const { cliente: c, consultas } = await api(`clientes/${a.dataset.cli}`);
      abrir(`<div style="display:flex;gap:16px;flex-wrap:wrap">${c.foto ? `<img class="foto-g" alt="Foto de ${esc(c.nome)}" src="/api/painel/clientes/${c.id}/foto">` : `<div class="foto-g"></div>`}
        <div><h2>${esc(c.nome)}</h2><p style="margin:0">📞 ${esc(c.telefone)}<br>✉️ ${esc(c.email || "—")}</p>
        <p class="muted" style="font-size:.85rem">Cadastro: ${new Date(c.criado).toLocaleDateString("pt-BR")}${c.consentimento ? ` · consentimento LGPD em ${new Date(c.consentimento).toLocaleDateString("pt-BR")}` : ""}</p></div></div>
        <h3 style="margin-top:12px">Consultas</h3><ul>${consultas.reverse().map((x) => `<li>${br(x.data)} ${x.inicio} · ${esc(nomeMod(x.modalidade))} · ${x.status}</li>`).join("") || "<li class='muted'>nenhuma</li>"}</ul>
        <div id="m" class="aviso oculto"></div><div class="acoes">${st.eu.papel === "admin" ? `<button class="btn btn--peq" id="pront">Prontuário</button><button class="btn btn--perigo btn--peq" id="excluir">Excluir dados (LGPD)</button>` : ""}<button class="btn btn--linha btn--peq" data-fechar>Fechar</button></div>`);
      if ($("#pront")) $("#pront").onclick = () => { dlg.close(); telaProntuario(c.id); };
      if ($("#excluir")) $("#excluir").onclick = async () => {
        if (!confirm(`Excluir cadastro e foto de ${c.nome}? As consultas ficarão apenas com o nome. Não dá para desfazer.`)) return;
        try { await api(`clientes/${c.id}`, { metodo: "DELETE" }); dlg.close(); telaClientes(); } catch (x) { aviso($("#m"), x.message); }
      };
    };
  }

  // ---------- prontuário ----------
  async function telaProntuario(cid) {
    document.querySelectorAll(".pn-menu [data-tela]").forEach((b) => b.classList.toggle("at", b.dataset.tela === "clientes"));
    $("#tela").onclick = null;
    let r;
    try { r = await api(`prontuario/${cid}`); }
    catch (x) { $("#tela").innerHTML = `<button class="btn btn--linha btn--peq" id="voltar">‹ Clientes</button><div class="aviso aviso--erro">${esc(x.message)}</div>`; $("#voltar").onclick = () => ir("clientes"); return; }
    const { cliente: c, prontuario: p, max } = r;
    const atual = p.processos.find((x) => !x.fim);
    const passados = p.processos.filter((x) => x.fim).reverse();
    const evo = (e, editavel) => `<article class="cartao" style="padding:14px 16px;margin-bottom:10px" data-ev="${e.id}">
      <div class="barra" style="margin:0 0 6px"><strong>${br(e.data)}</strong>${e.editado ? `<small class="muted">editada</small>` : ""}<span class="esp"></span>
        <button class="btn btn--linha btn--peq" data-copiar="${e.id}" style="padding:.3em .8em">Copiar</button>
        ${editavel ? `<button class="btn btn--linha btn--peq" data-editar="${e.id}" style="padding:.3em .8em">Editar</button><button class="x" data-apagar="${e.id}" aria-label="Excluir evolução">×</button>` : ""}</div>
      <div style="white-space:pre-wrap" data-texto>${esc(e.texto)}</div></article>`;
    const todas = p.processos.flatMap((x) => x.evolucoes);
    const n = atual ? atual.evolucoes.length : 0;
    $("#tela").innerHTML = `<button class="btn btn--linha btn--peq" id="voltar">‹ Clientes</button>
      <div style="display:flex;gap:16px;align-items:center;margin:14px 0">${c.foto ? `<img class="foto-g" style="width:72px;height:72px" alt="" src="/api/painel/clientes/${c.id}/foto">` : ""}
        <div><h1 style="margin:0">${esc(c.nome)}</h1><p class="muted" style="margin:0">${esc(c.telefone)} · ${p.processos.length} processo(s) · ${todas.length} evolução(ões)</p></div></div>
      <section class="cartao"><div class="barra"><h2 style="margin:0">${atual ? `Processo ${atual.numero}${atual.titulo ? ` · ${esc(atual.titulo)}` : ""}` : "Novo processo"}</h2><span class="esp"></span>
        <span class="etq ${n >= max ? "etq--erro" : ""}">${n}/${max} evoluções</span></div>
        ${atual ? `<p class="muted" style="margin-top:0">Iniciado em ${br(atual.inicio)}</p>` : ""}
        ${n >= max ? `<p class="aviso aviso--info">Este processo chegou a ${max} evoluções. Inicie um novo processo para continuar.</p>` : `
        <form id="fe"><label class="campo" style="max-width:220px"><span>Data da sessão</span><input type="date" name="data" value="${hojeISO()}" required></label>
          <label class="campo"><span>Evolução</span><textarea name="texto" rows="8" placeholder="Cole aqui a evolução da sessão" required></textarea></label>
          <div id="m" class="aviso oculto" role="alert"></div><button class="btn btn--peq">Salvar evolução</button></form>`}
        <div class="acoes"><button class="btn btn--linha btn--peq" id="novo-proc">Iniciar novo processo</button></div>
        <div style="margin-top:16px">${atual ? atual.evolucoes.slice().reverse().map((e) => evo(e, true)).join("") || `<p class="muted">Nenhuma evolução neste processo ainda.</p>` : ""}</div></section>
      ${passados.length ? `<h2>Processos anteriores</h2>${passados.map((x) => `<details class="cartao"><summary><strong>Processo ${x.numero}${x.titulo ? ` · ${esc(x.titulo)}` : ""}</strong>
        <span class="muted"> · ${br(x.inicio)} a ${br(x.fim)} · ${x.evolucoes.length} evolução(ões)</span></summary><div style="margin-top:12px">${x.evolucoes.map((e) => evo(e, true)).join("")}</div></details>`).join("")}` : ""}`;
    $("#voltar").onclick = () => ir("clientes");
    const recarregar = () => telaProntuario(cid);
    if ($("#fe")) $("#fe").onsubmit = async (ev) => {
      ev.preventDefault();
      try { await api(`prontuario/${cid}/evolucoes`, { metodo: "POST", dados: form(ev.target) }); recarregar(); }
      catch (x) { aviso($("#m"), x.message); }
    };
    $("#novo-proc").onclick = async () => {
      const titulo = prompt("Iniciar um novo processo de atendimento. O processo atual será encerrado e continuará disponível para consulta.\n\nTítulo (opcional):", "");
      if (titulo === null) return;
      try { await api(`prontuario/${cid}/processos`, { metodo: "POST", dados: { titulo } }); recarregar(); } catch (x) { alert(x.message); }
    };
    $("#tela").onclick = async (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const ev = b.dataset.copiar || b.dataset.editar || b.dataset.apagar;
      if (!ev) return;
      const e1 = todas.find((x) => x.id === ev);
      if (b.dataset.copiar) {
        try { await navigator.clipboard.writeText(e1.texto); b.textContent = "Copiado ✓"; } catch { alert("Não foi possível copiar."); }
      } else if (b.dataset.apagar) {
        if (!confirm(`Excluir a evolução de ${br(e1.data)}? Não dá para desfazer.`)) return;
        await api(`prontuario/${cid}/evolucoes/${ev}`, { metodo: "DELETE" }); recarregar();
      } else {
        const art = b.closest("[data-ev]");
        art.innerHTML = `<form><label class="campo" style="max-width:220px"><span>Data</span><input type="date" name="data" value="${e1.data}"></label>
          <textarea name="texto" rows="8" style="width:100%;font:inherit;padding:.7em;border:1.5px solid var(--c-linha);border-radius:12px">${esc(e1.texto)}</textarea>
          <div class="acoes" style="margin-top:8px"><button class="btn btn--peq">Salvar</button><button type="button" class="btn btn--linha btn--peq" data-cancelar>Cancelar</button></div></form>`;
        art.querySelector("[data-cancelar]").onclick = recarregar;
        art.querySelector("form").onsubmit = async (x) => {
          x.preventDefault();
          try { await api(`prontuario/${cid}/evolucoes/${ev}`, { metodo: "PUT", dados: form(x.target) }); recarregar(); } catch (y) { alert(y.message); }
        };
      }
    };
  }

  // ---------- registros ----------
  async function telaRegistros() {
    const [{ emails }, log] = await Promise.all([api("emails"), st.eu.papel === "admin" ? api("log") : Promise.resolve({ registros: [] })]);
    const ev = { confirmacao: "confirmação", transferencia: "transferência", cancelamento: "cancelamento", pagamento: "pagamento" };
    const canal = (e) => (e.canal === "whatsapp" ? "WhatsApp" : "e-mail");
    $("#tela").innerHTML = `<h1>Registros</h1><h2>Mensagens (e-mail e WhatsApp)</h2>
      ${emails.length ? `<div class="rol"><table class="tabela"><tr><th>Quando</th><th>Para</th><th>Tipo</th><th>Status</th><th></th></tr>
      ${emails.map((e) => `<tr><td>${new Date(e.criado).toLocaleString("pt-BR")}</td><td>${esc(e.para || "—")}<br><small class="muted">${e.quem}</small></td><td>${ev[e.evento] || e.evento}<br><small class="muted">${canal(e)}</small></td>
        <td>${e.status === "enviado" ? `<span class="etq">enviado</span>` : `<span class="etq etq--erro">${e.status}</span><br><small>${esc(e.erro || "")}</small>`}</td>
        <td>${e.status !== "enviado" ? `<button class="btn btn--linha btn--peq" data-reenviar="${e.id}">Reenviar</button>` : ""}</td></tr>`).join("")}</table></div>` : `<p class="muted">Nenhum e-mail ainda.</p>`}
      ${st.eu.papel === "admin" ? `<h2 style="margin-top:24px">Alterações (últimos 2 meses)</h2><div class="rol"><table class="tabela"><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhes</th></tr>
      ${log.registros.map((r) => `<tr><td>${new Date(r.quando).toLocaleString("pt-BR")}</td><td>${esc(r.usuario)}</td><td>${esc(r.acao)}</td><td><small>${esc(JSON.stringify(r.detalhe || {}))}</small></td></tr>`).join("")}</table></div>` : ""}`;
    $("#tela").querySelectorAll("[data-reenviar]").forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await api(`emails/${b.dataset.reenviar}/reenviar`, { metodo: "POST" }); } catch (x) { alert(x.message); }
      telaRegistros();
    });
  }

  // ---------- usuários e conta ----------
  async function telaConta() {
    const admin = st.eu.papel === "admin";
    const us = admin ? (await api("usuarios")).usuarios : [];
    $("#tela").innerHTML = `<h1>Usuários e conta</h1>
      <form class="cartao" id="fs"><h2>Minha senha</h2><div class="linha2">
        <label class="campo"><span>Senha atual</span><input type="password" name="atual" autocomplete="current-password" required></label>
        <label class="campo"><span>Nova senha (mín. 10)</span><input type="password" name="nova" autocomplete="new-password" minlength="10" required></label></div>
        <div id="ms" class="aviso oculto"></div><button class="btn btn--peq">Trocar senha</button></form>
      ${admin ? `<section class="cartao"><h2>Usuários</h2><div class="rol"><table class="tabela"><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr>
        ${us.map((u) => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${u.papel}</td><td>${u.email !== st.eu.email ? `<button class="x" data-rem="${esc(u.email)}" aria-label="Remover">×</button>` : ""}</td></tr>`).join("")}</table></div>
        <form id="fu" style="margin-top:16px"><h3>Adicionar acesso</h3><div class="linha2">
          <label class="campo"><span>Nome</span><input name="nome" required></label><label class="campo"><span>E-mail</span><input name="email" type="email" required></label></div>
          <div class="linha2"><label class="campo"><span>Perfil</span><select name="papel"><option value="assistente">Assistente</option><option value="admin">Administrador</option></select></label>
          <label class="campo"><span>Senha inicial (mín. 10)</span><input name="senha" type="text" minlength="10" required></label></div>
          <p class="muted">Assistente: vê e gerencia agenda, consultas, bloqueios, clientes e reenvio de e-mails. Não altera horários, configurações nem usuários.</p>
          <div id="mu" class="aviso oculto"></div><button class="btn btn--peq">Adicionar</button></form></section>
      <section class="cartao"><h2>Cópia de segurança</h2><p class="muted">Baixa um arquivo com consultas, clientes, bloqueios e configurações (sem fotos e sem senhas). Guarde em local seguro.</p>
        <a class="btn btn--linha btn--peq" href="/api/painel/backup" download>Baixar backup</a></section>` : ""}`;
    $("#fs").onsubmit = async (ev) => {
      ev.preventDefault();
      try { await api("senha", { metodo: "POST", dados: form(ev.target) }); aviso($("#ms"), "Senha alterada.", "ok"); ev.target.reset(); }
      catch (x) { aviso($("#ms"), x.message); }
    };
    if (!admin) return;
    $("#fu").onsubmit = async (ev) => {
      ev.preventDefault();
      try { await api("usuarios", { metodo: "POST", dados: form(ev.target) }); telaConta(); } catch (x) { aviso($("#mu"), x.message); }
    };
    $("#tela").querySelectorAll("[data-rem]").forEach((b) => b.onclick = async () => {
      if (!confirm(`Remover o acesso de ${b.dataset.rem}?`)) return;
      await api(`usuarios/${encodeURIComponent(b.dataset.rem)}`, { metodo: "DELETE" }); telaConta();
    });
  }

  iniciar();
})();
