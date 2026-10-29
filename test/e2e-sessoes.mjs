// Links de sessão no navegador: gerar link, cliente agenda, pede desmarcação, você aprova.
// Uso: node test/e2e-sessoes.mjs <base> <pasta-capturas>
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const [BASE, CAPT] = process.argv.slice(2);
const ok = (m) => console.log("✓", m);
const b = await chromium.launch();
const pc = await b.newPage({ viewport: { width: 1366, height: 900 } });
pc.on("dialog", (d) => d.accept());
await pc.goto(`${BASE}/painel/`);
await pc.fill("[name=codigo]", "segredo-de-teste-com-mais-de-24");
await pc.fill("[name=nome]", "Rodrigo");
await pc.fill("[name=email]", "rodrigo@exemplo.com");
await pc.fill("[name=senha]", "senha-muito-forte");
await pc.click("button.btn");
await pc.locator("nav.pn-menu").waitFor();

await pc.click("[data-tela=clientes]");
await pc.click("#novo-cli");
await pc.fill("#fcli [name=nome]", "Sara Sessões");
await pc.fill("#fcli [name=telefone]", "19933332222");
await pc.uncheck("#fcli [name=aguardando]");
await pc.click("#fcli button.btn");
await pc.locator("td a", { hasText: "Sara Sessões" }).waitFor();

await pc.click("[data-tela=sessoes]");
await pc.fill("#fs-cfg [name=chave_pix]", "pix@rodrigo.com");
await pc.click("#fs-cfg button.btn");
await pc.locator("#m-cfg.aviso--ok").waitFor();
await pc.fill("#fs-novo [name=cliente]", "Sara Sessões");
await pc.fill("#fs-novo [name=valor]", "280");
await pc.click("#fs-novo button.btn");
await pc.locator("#m-novo.aviso--ok").waitFor();
assert.match(await pc.locator("#m-novo").textContent(), /1ª sessão fica disponível a partir de/);
const href = await pc.locator("a.btn", { hasText: "WhatsApp" }).first().getAttribute("href");
assert.match(decodeURIComponent(href), /wa\.me\/5519933332222\?text=Olá, Sara!.*\/sessao\/\?s=/);
const link = await pc.locator("[data-copiar]").first().getAttribute("data-copiar");
ok("link gerado com prazos padrão (1ª: +2 dias do envio; 2ª: +22 dias da 1ª) e botão de envio pelo WhatsApp");

// cliente
const cel = await b.newPage({ viewport: { width: 390, height: 844 } });
await cel.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
await cel.locator("#abrir-cal").waitFor();
assert.equal(await cel.locator("text=Agendar sua sessão").count(), 1);
assert.match(await cel.locator("#resumo").textContent(), /R\$\s?280,00/);
await cel.click("#abrir-cal");
const info = await cel.evaluate(async () => (await (await fetch(`/api/agenda/sessao${location.search}`)).json()));
const hoje = new Date(info.hoje + "T00:00:00Z");
const min = new Date(info.data_minima + "T00:00:00Z");
assert.equal((min - hoje) / 864e5, 2);
await cel.locator("#cal button.livre").first().waitFor();
const primeiro = await cel.locator("#cal button.livre").first().getAttribute("data-data");
assert.ok(primeiro >= info.data_minima);
ok(`horários só a partir de ${info.data_minima} (2 dias após o envio)`);
await cel.locator("#cal button.livre").first().click();
await cel.locator(".hora").first().click();
await cel.click("#confirmar");
await cel.locator("#marcadas:not(.oculto)").waitFor();
await cel.locator("#intervalo", { hasText: "2ª sessão" }).waitFor({ state: "attached" });
const info2 = await cel.evaluate(async () => (await (await fetch(`/api/agenda/sessao${location.search}`)).json()));
assert.equal(info2.estagio, "segunda");
assert.equal((new Date(info2.data_minima + "T00:00:00Z") - new Date(primeiro + "T00:00:00Z")) / 864e5, 22);
await cel.screenshot({ path: `${CAPT}/12-sessao-marcada.png`, fullPage: true });
ok(`1ª sessão agendada em ${primeiro}; o mesmo link já libera a 2ª só a partir de ${info2.data_minima} (+22 dias)`);
await cel.reload();
await cel.locator("#abrir-cal", { hasText: "Agendar sua sessão" }).waitFor();
ok("reabrindo o link, o cliente vê a 1ª marcada e o botão \"Agendar sua sessão\" para a 2ª");

await cel.click("[data-desmarcar]");
assert.match(await cel.locator("#desm-taxa").textContent(), /R\$\s?25,00/);
await cel.fill("#desm [name=motivo]", "Viagem de trabalho");
await cel.click("#desm button.btn");
await cel.locator("#erro-desm:not(.oculto)").waitFor();
await cel.check("#desm [name=aceite]");
await cel.click("#desm button.btn");
await cel.locator("#desm-pendente:not(.oculto)").waitFor();
assert.match(await cel.locator("#desm-pendente").textContent(), /pix@rodrigo\.com/);
await cel.screenshot({ path: `${CAPT}/13-sessao-desmarcacao.png`, fullPage: true });
ok("pedido de desmarcação exige o aceite da taxa (R$ 25) e mostra a chave Pix; a sessão continua marcada");

await pc.click("[data-tela=sessoes]");
await pc.locator("text=Pedidos de desmarcação (1)").waitFor();
await pc.locator("text=Viagem de trabalho").waitFor();
await pc.click("[data-dec=taxa-paga]");
await pc.locator("text=Pedidos de desmarcação (1) >> .. >> .etq", { hasText: "paga" }).first().waitFor();
await pc.click("[data-dec=aprovar]");
await pc.locator("text=Pedidos de desmarcação").waitFor({ state: "detached" });
await pc.locator("td", { hasText: "aguardando 1ª" }).waitFor();
ok("você marcou a taxa como paga e aprovou; a 1ª foi cancelada e o link voltou a liberar a 1ª");
await cel.reload();
await cel.locator("#abrir-cal").waitFor();
ok("cliente pode agendar outra data pelo mesmo link");

// assistente sem acesso a Sessões
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
assert.equal(await as.locator("[data-tela=sessoes]").count(), 0);
assert.equal(await as.evaluate(async () => (await fetch("/api/painel/sessoes")).status), 403);
ok("assistente não vê nem acessa Sessões (403)");
await b.close();
console.log("\nSessões: todos os cenários passaram.");
