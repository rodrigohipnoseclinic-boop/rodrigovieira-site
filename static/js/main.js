(function () {
  // Menu no celular
  var btn = document.querySelector(".menu-btn");
  var menu = document.getElementById("menu");
  if (btn && menu) {
    btn.addEventListener("click", function () {
      var aberto = menu.classList.toggle("aberto");
      btn.setAttribute("aria-expanded", aberto);
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) { menu.classList.remove("aberto"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  // Borda do topo ao rolar + barra de progresso de leitura
  var topo = document.getElementById("topo");
  var barra = document.querySelector(".progresso span");
  var artigo = document.querySelector(".post__corpo");
  function aoRolar() {
    if (topo) topo.classList.toggle("rolou", window.scrollY > 8);
    if (barra && artigo) {
      var r = artigo.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = Math.min(1, Math.max(0, -r.top / (total || 1)));
      barra.style.width = p * 100 + "%";
    }
  }
  window.addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  // Índice lateral: destaca a seção atual
  var links = document.querySelectorAll(".lateral-fixa a[href^='#']");
  if (links.length && "IntersectionObserver" in window) {
    var mapa = {};
    links.forEach(function (a) { mapa[a.getAttribute("href").slice(1)] = a; });
    var obs = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (en.isIntersecting) {
          links.forEach(function (l) { l.classList.remove("atual"); });
          var a = mapa[en.target.id];
          if (a) a.classList.add("atual");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(mapa).forEach(function (id) { var el = document.getElementById(id); if (el) obs.observe(el); });
  }

  // Filtro de temas no blog
  var filtros = document.querySelectorAll(".filtros button");
  filtros.forEach(function (b) {
    b.addEventListener("click", function () {
      filtros.forEach(function (x) { x.classList.remove("ativo"); });
      b.classList.add("ativo");
      var f = b.getAttribute("data-filtro");
      document.querySelectorAll(".lista-posts > [data-cat]").forEach(function (el) {
        el.hidden = f && el.getAttribute("data-cat") !== f;
      });
    });
  });

  // Copiar link
  document.querySelectorAll("[data-copiar]").forEach(function (b) {
    b.addEventListener("click", function () {
      var txt = b.getAttribute("data-copiar");
      var ok = function () { var o = b.textContent; b.textContent = "Link copiado!"; setTimeout(function () { b.textContent = o; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, ok); else ok();
    });
  });

  // Entrada suave dos blocos
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var alvos = document.querySelectorAll(".card, .pilar, .etapas li, .card-post, .faq details, .sobre__txt, .faixa-cursos");
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("visivel"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    alvos.forEach(function (el) { el.classList.add("revelar"); io.observe(el); });
  }
})();
