// Prontuário e configuração do WhatsApp no painel (navegador).
// Uso: servidor com PRONTUARIO_CHAVE definida; node test/e2e-prontuario.mjs <base> <pasta-capturas>
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const [BASE, CAPT] = process.argv.slice(2);
const ok = (m) => console.log("✓", m);
const b = await chromium.launch();
const pc = await b.newPage({ viewport: { width: 1366, height: 900 } });
pc.on("dialog", (d) => d.accept(d.type() === "prompt" ? "Retorno 2027" : undefined));
await pc.goto(`${BASE}/painel/`);
await pc.fill("[name=codigo]", "segredo-de-teste-com-mais-de-24");
await pc.fill("[name=nome]", "Rodrigo");
await pc.fill("[name=email]", "rodrigo@exemplo.com");
await pc.fill("[name=senha]", "senha-muito-forte");
await pc.click("button.btn");
await pc.locator("nav.pn-menu").waitFor();

// WhatsApp nas configurações
await pc.click("[data-tela=config]");
await pc.check("[name=wa_ativo]");
await pc.fill("[name=wa_numero_admin]", "");
await pc.click("#fc button.btn");
await pc.locator("#m:not(.oculto)").waitFor();
assert.match(await pc.locator("#m").textContent(), /número/);
await pc.fill("[name=wa_numero_admin]", "(19) 99749-8217");
await pc.click("#fc button.btn");
await pc.locator("#m.aviso--ok").waitFor();
const cfg = await pc.evaluate(async () => (await (await fetch("/api/painel/config")).json()).config.whatsapp);
assert.equal(cfg.ativo, true);
assert.equal(cfg.modelo_paciente, "consulta_confirmada");
ok("WhatsApp ligado no painel com o número do administrador");

// cliente via nova consulta
await pc.click("[data-tela=agenda]");
await pc.click("#nova");
await pc.fill("#fn [name=inicio_livre]", "07:00");
await pc.fill("#fn [name=nome]", "Carla Evolução");
await pc.fill("#fn [name=telefone]", "19977776666");
await pc.click("#fn button.btn");
await pc.locator("dialog").waitFor({ state: "hidden" });
const regs = await pc.evaluate(async () => (await (await fetch("/api/painel/emails")).json()).emails);
assert.ok(regs.some((e) => e.canal === "whatsapp" && e.quem === "paciente" && e.para === "5519977776666"));
assert.ok(!regs.some((e) => e.canal === "whatsapp" && e.quem === "admin"), "consulta marcada por você não avisa você mesmo");
ok("consulta marcada pelo painel gerou WhatsApp só para o paciente (sem credenciais locais, fica para reenvio)");

// prontuário
await pc.click("[data-tela=clientes]");
await pc.click("[data-cli]");
await pc.click("#pront");
await pc.locator("#fe").waitFor();
const textoSessao = "Sessão 1\nQueixa: ansiedade.\nConduta: indução e ancoragem.";
await pc.fill("#fe [name=texto]", textoSessao);
await pc.click("#fe button.btn");
await pc.locator("text=1/15 evoluções").waitFor();
assert.equal((await pc.locator("[data-texto]").first().innerText()).trim(), textoSessao);
ok("evolução colada e salva, com quebras de linha preservadas (1/15)");
await pc.click("[data-editar]");
await pc.fill("[data-ev] textarea", textoSessao + "\nRetorno em 7 dias.");
await pc.click("[data-ev] button.btn");
await pc.locator("text=Retorno em 7 dias.").waitFor();
ok("evolução editada");
await pc.screenshot({ path: `${CAPT}/10-prontuario.png`, fullPage: true });
await pc.click("#novo-proc");
await pc.locator("text=Processos anteriores").waitFor();
await pc.locator("text=0/15 evoluções").waitFor();
await pc.click("details summary");
await pc.locator("details[open] >> text=Retorno em 7 dias.").waitFor();
ok("novo processo iniciado; o anterior fica disponível para revisão");

// assistente sem acesso
await pc.click("[data-tela=conta]");
await pc.fill("#fu [name=nome]", "Assistente");
await pc.fill("#fu [name=email]", "assist@exemplo.com");
await pc.fill("#fu [name=senha]", "senha-da-assistente");
await pc.click("#fu button.btn");
await pc.locator("td", { hasText: "assist@exemplo.com" }).waitFor();
const as = await (await b.newContext()).newPage();
await as.goto(`${BASE}/painel/`);
await as.fill("[name=email]", "assist@exemplo.com");
await as.fill("[name=senha]", "senha-da-assistente");
await as.click("button.btn");
await as.locator("nav.pn-menu").waitFor();
const cid = await pc.evaluate(async () => (await (await fetch("/api/painel/clientes")).json()).clientes[0].id);
const st = await as.evaluate(async (id) => (await fetch(`/api/painel/prontuario/${id}`)).status, cid);
assert.equal(st, 403);
ok("assistente não acessa o prontuário (403)");
await b.close();
console.log("\nProntuário e WhatsApp: todos os cenários passaram.");
