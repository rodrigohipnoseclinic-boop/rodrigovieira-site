// Servidor local para testar /agendar e /painel sem Netlify.
// Uso: AGENDA_SEGREDO=<24+ caracteres> node test/servidor-dev.mjs [porta]
// Os dados ficam só na memória e somem ao encerrar.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { usarLojas } from "../netlify/lib/agenda/armazem.mjs";
import { LojaMemoria } from "./loja-memoria.mjs";
import agenda from "../netlify/functions/agenda.mjs";
import painel from "../netlify/functions/painel.mjs";

const L = { dados: new LojaMemoria(), fotos: new LojaMemoria() };
usarLojas(() => L);
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../static");
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fn = url.pathname.startsWith("/api/agenda/") ? agenda : url.pathname.startsWith("/api/painel/") ? painel : null;
  if (fn) {
    const partes = [];
    for await (const p of req) partes.push(p);
    const r = await fn(new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(partes) }), { ip: req.socket.remoteAddress });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let arq = path.join(RAIZ, decodeURIComponent(url.pathname));
  if (!arq.startsWith(RAIZ)) return res.writeHead(403).end();
  if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, "index.html");
  if (!fs.existsSync(arq)) return res.writeHead(404).end("não encontrado");
  res.writeHead(200, { "Content-Type": TIPOS[path.extname(arq)] || "application/octet-stream" });
  fs.createReadStream(arq).pipe(res);
}).listen(Number(process.argv[2]) || 8888, () => console.log(`http://localhost:${Number(process.argv[2]) || 8888}/agendar/`));
