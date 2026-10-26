// Roda sozinho a cada inscrição recebida pelo formulário (Netlify Forms).
// Guarda o inscrito na lista e manda o e-mail de boas-vindas.
import crypto from "node:crypto";
import { connectLambda, getStore } from "@netlify/blobs";
import { configurado, transporte, emailBoasVindas, remetente, linkCancelar } from "../lib/email.mjs";

export async function handler(event) {
  connectLambda(event);
  const { payload } = JSON.parse(event.body || "{}");
  if (payload?.form_name !== "inscricao") return { statusCode: 200 };

  const email = String(payload.data?.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { statusCode: 200 };
  const nome = String(payload.data?.nome || "").trim().slice(0, 80);
  const id = crypto.createHash("sha256").update(email).digest("hex").slice(0, 24);

  // Esta função roda no modo Lambda (connectLambda), que não traz a configuração
  // de leitura "strong" do Netlify Blobs e dava BlobsConsistencyError.
  const loja = getStore({ name: "inscritos" });
  const existente = await loja.get(`pessoa/${id}`, { type: "json" });
  const token = existente?.token || crypto.randomBytes(16).toString("hex");
  await loja.setJSON(`pessoa/${id}`, { email, nome, token, desde: existente?.desde || new Date().toISOString() });

  if (!existente && configurado()) {
    const m = emailBoasVindas(nome, linkCancelar(id, token));
    const t = transporte();
    try {
      await t.sendMail({ from: remetente(), to: email, subject: m.assunto, html: m.html, text: m.texto });
    } catch (e) {
      console.error("Falha no e-mail de boas-vindas:", e.message);
    } finally {
      t.close();
    }
  }
  return { statusCode: 200 };
}
