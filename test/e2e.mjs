// Teste ponta a ponta no navegador contra test/servidor-dev.mjs.
// Uso: node test/e2e.mjs http://localhost:8888 caminho/da/foto.jpg pasta-das-capturas
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // já instalado no ambiente
import assert from "node:assert/strict";

const [BASE, FOTO, CAPT] = process.argv.slice(2);
const ok = (m) => console.log("✓", m);
const b = await chromium.launch();
const SEG = "segredo-de-teste-com-mais-de-24";

// ---------- paciente (celular) ----------
const cel = await b.newPage({ viewport: { width: 390, height: 844 } });
await cel.goto(`${BASE}/agendar/`);
await cel.getByText("Presencial").click();
await cel.locator("#cal button.livre").first().click();
await cel.locator(".hora").first().waitFor();
const primeiraHora = await cel.locator(".hora").first().textContent();
await cel.locator(".hora").first().click();
await cel.fill("[name=nome]", "Ana Paciente Teste");
await cel.fill("[name=email]", "ana@exemplo.com");
await cel.fill("[name=telefone]", "(19) 99999-0000");
await cel.click("#enviar");
await cel.locator("#erro:not(.oculto)").waitFor();
assert.match(await cel.locator("#erro").textContent(), /selfie|foto/i);
ok("sem foto o agendamento é recusado");
await cel.setInputFiles("#foto-arq", FOTO);
await cel.waitForFunction(() => document.querySelector("#foto-prev").classList.contains("ok"));
await cel.screenshot({ path: `${CAPT}/1-paciente-dados.png`, fullPage: true });
await cel.click("#enviar");
assert.match(await cel.locator("#erro").textContent(), /autoriza/i);
ok("sem consentimento LGPD é recusado");
await cel.check("[name=consentimento]");
await cel.click("#enviar");
await cel.locator("#sucesso:not(.oculto)").waitFor();
assert.match(await cel.locator("#sucesso").textContent(), new RegExp(primeiraHora));
await cel.screenshot({ path: `${CAPT}/2-paciente-confirmado.png`, fullPage: true });
ok(`paciente agendou presencial às ${primeiraHora} com selfie`);

// horário ocupado some da lista
const info = await (await fetch(`${BASE}/api/agenda/info`)).json();
const dias = (await (await fetch(`${BASE}/api/agenda/dias?modalidade=presencial&mes=${info.hoje.slice(0, 7)}`)).json()).dias;
let dia = dias[0];
if (!dia) dia = (await (await fetch(`${BASE}/api/agenda/dias?modalidade=presencial&mes=${info.ate.slice(0, 7)}`)).json()).dias[0];

// ---------- disputa: duas reservas simultâneas no mesmo horário ----------
const { horarios } = await (await fetch(`${BASE}/api/agenda/horarios?modalidade=online&data=${dia}`)).json();
const foto = "data:image/jpeg;base64," + (await import("node:fs")).readFileSync(FOTO).toString("base64");
const corpo = (n) => JSON.stringify({ modalidade: "online", data: dia, inicio: horarios.at(-1), nome: `Pessoa ${n}`, email: `p${n}@ex.com`, telefone: "19988887777", foto, consentimento: true });
const rs = await Promise.all([1, 2].map((n) => fetch(`${BASE}/api/agenda/reservar`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": String(n) }, body: corpo(n) })));
const st = rs.map((r) => r.status).sort();
assert.deepEqual(st, [201, 409]);
const perdeu = await rs.find((r) => r.status === 409).json();
assert.ok(perdeu.indisponivel && Array.isArray(perdeu.alternativas));
ok(`duas reservas simultâneas: ${st.join(" e ")}; quem perdeu recebe ${perdeu.alternativas.length} dia(s) de alternativas`);

// ---------- painel (computador) ----------
const pc = await b.newPage({ viewport: { width: 1366, height: 860 } });
await pc.goto(`${BASE}/painel/`);
await pc.fill("[name=codigo]", "errado");
await pc.fill("[name=nome]", "Rodrigo");
await pc.fill("[name=email]", "rodrigo@exemplo.com");
await pc.fill("[name=senha]", "senha-muito-forte");
await pc.click("button.btn");
await pc.locator("#m:not(.oculto)").waitFor();
ok("primeiro acesso com código errado é recusado");
await pc.fill("[name=codigo]", SEG);
await pc.click("button.btn");
await pc.locator(".pn-menu").waitFor();
ok("administrador criado e logado");

// agenda: mês com a consulta do paciente
await pc.click("[data-vista=mes]");
if (!(await pc.locator(".ev[data-id]").count())) await pc.click("[data-nav='1']");
await pc.locator(".ev[data-id]").first().waitFor();
await pc.screenshot({ path: `${CAPT}/3-painel-mes.png`, fullPage: true });
await pc.locator(".ev[data-id]", { hasText: "Ana Paciente" }).click();
await pc.locator("dialog img.foto-g").waitFor();
assert.ok(await pc.locator("dialog img.foto-g").evaluate((i) => i.complete && i.naturalWidth > 0));
await pc.screenshot({ path: `${CAPT}/4-painel-detalhe-foto.png` });
ok("detalhe da consulta mostra a selfie e os contatos");

// transferir para o dia seguinte disponível, outro horário
await pc.click("#transf");
await pc.locator("#ft select[name=inicio] option").first().waitFor({ state: "attached" });
await pc.waitForFunction(() => !document.querySelector("#ft select[name=inicio]").textContent.includes("carregando"));
const alvo = await pc.locator("#ft select[name=inicio] option").last().textContent();
await pc.click("#ft button.btn");
await pc.locator("dialog").waitFor({ state: "hidden" });
ok(`consulta transferida para ${alvo}`);

// nova consulta manual em horário já ocupado → conflito
await pc.click("[data-vista=dia]");
await pc.click("#nova");
await pc.fill("#fn [name=data]", dia);
await pc.dispatchEvent("#fn [name=data]", "change");
await pc.fill("#fn [name=inicio_livre]", horarios.at(-1));
await pc.selectOption("#fn [name=modalidade]", "online");
await pc.fill("#fn [name=nome]", "Carlos Manual");
await pc.fill("#fn [name=telefone]", "19977776666");
await pc.click("#fn button.btn");
await pc.locator("#fn #m:not(.oculto)").waitFor();
assert.match(await pc.locator("#fn #m").textContent(), /Conflita/);
ok("painel não deixa sobrepor consultas");
await pc.fill("#fn [name=inicio_livre]", "07:00");
await pc.click("#fn button.btn");
await pc.locator("dialog").waitFor({ state: "hidden" });
ok("painel criou consulta manual fora do horário padrão (07:00)");

// cancelar a consulta manual
await pc.locator(".ev[data-id]", { hasText: "Carlos Manual" }).click();
await pc.click("#btn-cancelar");
await pc.fill("#fc [name=motivo]", "teste");
await pc.click("#fc button.btn");
await pc.locator("dialog").waitFor({ state: "hidden" });
ok("consulta cancelada pelo painel");

// bloqueio com conflito → aviso → forçar
await pc.click("[data-tela=bloqueios]");
await pc.fill("#fb [name=inicio_data]", dia);
await pc.fill("#fb [name=fim_data]", dia);
await pc.click("#fb button.btn");
await pc.locator("#forcar").waitFor();
await pc.screenshot({ path: `${CAPT}/5-bloqueio-conflito.png` });
ok("bloqueio em dia com consulta mostra o aviso de conflito");
await pc.click("#forcar");
await pc.locator("table.tabela").waitFor();
const livresDepois = (await (await fetch(`${BASE}/api/agenda/horarios?modalidade=presencial&data=${dia}`)).json()).horarios;
assert.equal(livresDepois.length, 0);
ok("dia bloqueado deixa de oferecer horários ao paciente");

// configurações: duração 60
await pc.click("[data-tela=config]");
await pc.fill("#fc [name=duracao]", "60");
await pc.click("#fc button.btn");
await pc.locator("#m.aviso--ok").waitFor();
const inf2 = await (await fetch(`${BASE}/api/agenda/info`)).json();
assert.equal(inf2.duracao, 60);
ok("duração alterada para 60 min pelo painel");

// horários: remover sábado/adicionar período
await pc.click("[data-tela=horarios]");
await pc.locator("[data-mod=online] [data-add='6']").click();
await pc.click("#salvar");
await pc.locator("#m:not(.oculto)").waitFor();
await pc.screenshot({ path: `${CAPT}/6-horarios.png`, fullPage: true });
const cfg = await pc.evaluate(async () => (await (await fetch("/api/painel/config")).json()).config);
assert.ok(cfg.modalidades.online.semana[6]?.length === 1);
ok("período de sábado online adicionado pelo painel");

// registros: e-mails com falha (SMTP não configurado localmente)
await pc.click("[data-tela=registros]");
await pc.locator("[data-reenviar]").first().waitFor();
ok("falhas de e-mail aparecem nos registros com botão Reenviar");

// assistente
await pc.click("[data-tela=conta]");
await pc.fill("#fu [name=nome]", "Assistente");
await pc.fill("#fu [name=email]", "assist@exemplo.com");
await pc.fill("#fu [name=senha]", "senha-da-assistente");
await pc.click("#fu button.btn");
await pc.locator("td", { hasText: "assist@exemplo.com" }).waitFor();
const as = await b.newPage();
await as.goto(`${BASE}/painel/`);
await as.fill("[name=email]", "assist@exemplo.com");
await as.fill("[name=senha]", "senha-da-assistente");
await as.click("button.btn");
await as.locator(".pn-menu").waitFor();
assert.equal(await as.locator("[data-tela=config]").count(), 0);
assert.equal(await as.locator("[data-tela=horarios]").count(), 0);
const proibido = await as.evaluate(async () => (await fetch("/api/painel/config", { method: "PUT", headers: { "X-Painel": "1", "Content-Type": "application/json" }, body: "{}" })).status);
assert.equal(proibido, 403);
ok("assistente entra, não vê nem altera configurações (403)");

const semSessao = await fetch(`${BASE}/api/painel/clientes`);
assert.equal(semSessao.status, 401);
const fotoSemSessao = await fetch(`${BASE}/api/painel/clientes/abc/foto`);
assert.equal(fotoSemSessao.status, 401);
ok("sem login não há acesso a clientes nem fotos");

await b.close();
console.log("\nTodos os cenários passaram.");
