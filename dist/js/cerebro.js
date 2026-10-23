/* Cérebro 3D da landing page original: rede de neurônios girando devagar,
   com impulsos dourados percorrendo as conexões. Cores vindas do tema do site. */
(function () {
  function corTema(nome, padrao) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
    return v || padrao;
  }
  function hexRgb(h, padrao) {
    h = String(h || padrao).replace("#", "");
    if (h.length === 3) h = h.split("").map(function (c) { return c + c; }).join("");
    var m = parseInt(h, 16);
    if (isNaN(m)) return hexRgb(padrao, "#3F6F63");
    return [(m >> 16) & 255, (m >> 8) & 255, m & 255];
  }

  function iniciar(el) {
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var pts = [], i, j, u, v, n, x, y, z, t;
    for (i = 0; i < 820; i++) {
      u = rnd() * Math.PI * 2;
      v = Math.acos(2 * rnd() - 1);
      n = 1 + 0.06 * Math.sin(7 * u) * Math.sin(9 * v) + 0.04 * Math.sin(13 * u + 3 * v);
      x = Math.sin(v) * Math.cos(u) * 0.95 * n;
      y = Math.cos(v) * 0.78 * n;
      z = Math.sin(v) * Math.sin(u) * 1.25 * n;
      x += x >= 0 ? 0.06 : -0.06;
      if (y < -0.35) y = -0.35 + (y + 0.35) * 0.5;
      pts.push([x, y + 0.1, z]);
    }
    for (i = 0; i < 140; i++) {
      u = rnd() * Math.PI * 2;
      v = Math.acos(2 * rnd() - 1);
      pts.push([Math.sin(v) * Math.cos(u) * 0.55, -0.5 + Math.cos(v) * 0.22, -0.8 + Math.sin(v) * Math.sin(u) * 0.32]);
    }
    for (i = 0; i < 40; i++) {
      u = rnd() * Math.PI * 2;
      t = rnd();
      pts.push([Math.cos(u) * 0.12, -0.55 - t * 0.5, -0.4 + Math.sin(u) * 0.12 - t * 0.1]);
    }
    var edges = [];
    for (i = 0; i < pts.length; i++) {
      var best = [];
      for (j = 0; j < pts.length; j++) {
        if (j === i) continue;
        var dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], dz = pts[i][2] - pts[j][2];
        var d = dx * dx + dy * dy + dz * dz;
        if (d < 0.06) best.push([d, j]);
      }
      best.sort(function (a, b) { return a[0] - b[0]; });
      for (j = 0; j < Math.min(3, best.length); j++) if (best[j][1] > i) edges.push([i, best[j][1]]);
    }
    var pulses = [];
    for (i = 0; i < 18; i++) pulses.push({ e: Math.floor(rnd() * edges.length), t: rnd(), s: 0.01 + rnd() * 0.016 });

    var ctx = el.getContext("2d");
    var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    var ang = 0.9, raf = null, visivel = true;
    var proj = new Array(pts.length);
    var c = hexRgb(corTema("--c-principal", "#3F6F63"), "#3F6F63");
    var g = hexRgb(corTema("--c-destaque", "#B8873A"), "#B8873A");
    var rgb = c.join(","), ouro = g.join(",");
    function depth(zz) { var q = 1 - (zz + 1.3) / 2.6; return q < 0 ? 0 : q > 1 ? 1 : q; }

    function frame() {
      raf = null;
      var dpr = window.devicePixelRatio || 1;
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) { raf = requestAnimationFrame(frame); return; }
      var W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (el.width !== W || el.height !== H) { el.width = W; el.height = H; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var sc = Math.min(w, h) * 0.36;
      var ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(-0.22), st = Math.sin(-0.22);
      var k, p, A, B;
      for (k = 0; k < pts.length; k++) {
        p = pts[k];
        var x1 = p[0] * ca - p[2] * sa, z1 = p[0] * sa + p[2] * ca;
        var y1 = p[1] * ct - z1 * st, z2 = p[1] * st + z1 * ct;
        var f = 3.2 / (3.2 + z2);
        proj[k] = [w / 2 + x1 * sc * f, h / 2 - y1 * sc * f + h * 0.03, z2, f];
      }
      ctx.lineWidth = 0.8;
      for (k = 0; k < edges.length; k++) {
        A = proj[edges[k][0]]; B = proj[edges[k][1]];
        ctx.strokeStyle = "rgba(" + rgb + "," + (0.06 + 0.3 * depth((A[2] + B[2]) / 2)) + ")";
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
      for (k = 0; k < proj.length; k++) {
        p = proj[k];
        var dd = depth(p[2]);
        ctx.fillStyle = "rgba(" + rgb + "," + (0.25 + 0.65 * dd) + ")";
        ctx.beginPath(); ctx.arc(p[0], p[1], (0.8 + 1.6 * dd) * p[3], 0, 6.2832); ctx.fill();
      }
      for (k = 0; k < pulses.length; k++) {
        var q = pulses[k], E = edges[q.e];
        if (!E) continue;
        A = proj[E[0]]; B = proj[E[1]];
        var px = A[0] + (B[0] - A[0]) * q.t, py = A[1] + (B[1] - A[1]) * q.t;
        var dp = depth(A[2]);
        ctx.fillStyle = "rgba(" + ouro + "," + (0.06 + 0.18 * dp) + ")";
        ctx.beginPath(); ctx.arc(px, py, 7, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "rgba(" + ouro + "," + (0.5 + 0.5 * dp) + ")";
        ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 6.2832); ctx.fill();
        if (!reduce) {
          q.t += q.s;
          if (q.t >= 1) { q.e = Math.floor(Math.random() * edges.length); q.t = 0; }
        }
      }
      if (!reduce && visivel) { ang += 0.0028; raf = requestAnimationFrame(frame); }
    }
    // pausa quando sai da tela, para poupar bateria no celular
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) {
        visivel = e[0].isIntersecting;
        if (visivel && !raf) raf = requestAnimationFrame(frame);
      }).observe(el);
    }
    frame();
  }

  function go() { document.querySelectorAll("canvas[data-cerebro]").forEach(iniciar); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
