// Ponta a ponta do fluxo com Pix (provedor simulado) no navegador.
// Uso: servidor com AGENDA_PIX_SIMULADO=1; node test/e2e-pix.mjs <base> <foto.jpg> <pasta-capturas>
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");

const [BASE, FOTO, CAPT] = process.argv.slice(2);
const ok = (m) => console.log("✓", m);
const b = await chromium.launch();

// administrador liga o Pix
const pc = await b.newPage({ viewport: { width: 1366, height: 860 } });
await pc.goto(`${BASE}/painel/`);
await pc.fill("[name=codigo]", "segredo-de-teste-com-mais-de-24");
await pc.fill("[name=nome]", "Rodrigo");
await pc.fill("[name=email]", "rodrigo@exemplo.com");
await pc.fill("[name=senha]", "senha-muito-forte");
await pc.click("button.btn");
await pc.locator("nav.pn-menu").waitFor();
await pc.click("[data-tela=config]");
await pc.check("[name=pix_ativo]");
await pc.click("#fc button.btn");
await pc.locator("#m:not(.oculto)").waitFor();
assert.match(await pc.locator("#m").textContent(), /valor/i);
ok("não liga o Pix sem valor da consulta");
await pc.fill("[name=pix_valor]", "200");
await pc.click("#fc button.btn");
await pc.locator("#m.aviso--ok").waitFor();
ok("Pix ligado no painel com valor de R$ 200,00");

// calendário bloqueado sem pagamento
const info = await (await fetch(`${BASE}/api/agenda/info`)).json();
assert.equal(info.pix.ativo, true);
const semPagar = await fetch(`${BASE}/api/agenda/dias?modalidade=online&mes=${info.hoje.slice(0, 7)}`);
assert.equal(semPagar.status, 404);
const reservaDireta = await fetch(`${BASE}/api/agenda/reservar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modalidade: "online", data: info.hoje, inicio: "09:00" }) });
assert.ok(reservaDireta.status >= 400);
ok("sem pagamento, calendário e reserva são recusados pelo servidor");

// paciente
const cel = await b.newPage({ viewport: { width: 390, height: 844 } });
await cel.goto(`${BASE}/agendar/`);
await cel.getByText("Presencial", { exact: true }).click();
assert.ok(await cel.locator("#campo-cpf").evaluate((e) => e.classList.contains("oculto")));
assert.equal((await cel.locator("#enviar").textContent()).trim(), "Enviar cadastro");
ok("com Pix ligado, presencial continua só com cadastro (sem Pix e sem calendário)");
await cel.getByText("Online", { exact: true }).click();
assert.equal((await cel.locator("#enviar").textContent()).trim(), "Gerar Pix");
assert.equal(await cel.locator("#p2").getAttribute("aria-disabled"), "true");
await cel.fill("[name=nome]", "Bruno Paciente Pix");
await cel.fill("[name=cpf]", "529.982.247-25");
await cel.fill("[name=email]", "bruno@exemplo.com");
await cel.fill("[name=telefone]", "(19) 98888-7777");
await cel.setInputFiles("#foto-arq", FOTO);
await cel.waitForFunction(() => document.querySelector("#foto-prev").classList.contains("ok"));
await cel.check("[name=consentimento]");
await cel.click("#enviar");
await cel.locator("#p-pix:not(.oculto)").waitFor();
assert.match(await cel.locator("#pix-codigo").inputValue(), /PIX-SIMULADO/);
assert.equal(await cel.locator("#p2").getAttribute("aria-disabled"), "true");
await cel.screenshot({ path: `${CAPT}/7-pix-aguardando.png`, fullPage: true });
ok("Pix gerado com valor e copia e cola; calendário continua bloqueado");

await cel.click("#pix-verificar");
await cel.waitForFunction(() => /Ainda não/.test(document.querySelector("#pix-status").textContent));
ok("\"Já paguei\" sem pagamento real não libera");

const { p, t } = await cel.evaluate(() => JSON.parse(localStorage.getItem("agenda-pedido")));
await fetch(`${BASE}/api/agenda/simular-pagamento?pedido=${p}&token=${t}`, { method: "POST" });
await cel.locator("#p2[aria-disabled=false]").waitFor({ timeout: 15000 });
ok("pagamento confirmado pelo provedor libera o calendário automaticamente");

// recarregar a página no meio: retoma sem pagar de novo
await cel.reload();
await cel.locator("#p2[aria-disabled=false]").waitFor();
ok("ao recarregar a página, retoma no calendário sem nova cobrança");
await cel.locator("#cal button.livre").first().click();
await cel.locator(".hora").first().waitFor();
await cel.locator(".hora").first().click();
await cel.screenshot({ path: `${CAPT}/8-pix-calendario.png`, fullPage: true });
await cel.click("#confirmar-horario");
await cel.locator("#sucesso:not(.oculto)").waitFor();
ok("horário escolhido e consulta confirmada");

// link reutilizado
const link = await cel.evaluate(([p, t]) => `/agendar/?p=${p}&t=${t}`, [p, t]);
await cel.goto(BASE + link);
await cel.locator("#erro-geral:not(.oculto)").waitFor();
assert.match(await cel.locator("#erro-geral").textContent(), /já foi usado/);
ok("o mesmo pagamento não agenda uma segunda consulta");

// webhook sem autenticação
const wh = await fetch(`${BASE}/api/agenda/webhook`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
assert.equal(wh.status, 401);
ok("webhook sem autenticação é recusado");

// painel: pagamentos, cancelar e liberar novo horário
await pc.click("[data-tela=pagamentos]");
await pc.locator("td", { hasText: "pago e agendado" }).waitFor();
await pc.screenshot({ path: `${CAPT}/9-painel-pagamentos.png`, fullPage: true });
await pc.click("[data-acao=liberar]");
await pc.locator("#m:not(.oculto)").waitFor();
assert.match(await pc.locator("#m").textContent(), /Cancele/);
ok("não libera novo horário com a consulta ainda ativa");
await pc.click("[data-tela=agenda]");
await pc.click("[data-vista=mes]");
if (!(await pc.locator(".ev[data-id]").count())) await pc.click("[data-nav='1']");
await pc.locator(".ev[data-id]", { hasText: "Bruno" }).click();
assert.equal(await pc.locator("dialog .etq", { hasText: "Pix" }).count(), 1);
await pc.click("#btn-cancelar");
await pc.click("#fc button.btn");
await pc.locator("dialog").waitFor({ state: "hidden" });
await pc.click("[data-tela=pagamentos]");
await pc.click("[data-acao=liberar]");
await pc.locator("td", { hasText: "pago, sem horário" }).waitFor();
ok("consulta cancelada e pagamento liberado para novo agendamento");
pc.on("dialog", (d) => d.accept());
await pc.click("[data-acao=estornar]");
await pc.locator("td", { hasText: "estornado" }).waitFor();
ok("estorno feito pelo painel");

await b.close();
console.log("\nFluxo Pix: todos os cenários passaram.");
