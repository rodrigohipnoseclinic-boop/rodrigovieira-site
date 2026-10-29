// WhatsApp pela API oficial da Meta (WhatsApp Cloud API).
// Mensagens iniciadas pelo sistema precisam de um modelo aprovado pela Meta.
//
// Variáveis no Netlify:
//   WHATSAPP_TOKEN     token de acesso permanente (usuário do sistema no Meta Business)
//   WHATSAPP_PHONE_ID  ID do número de envio (painel do WhatsApp → API Setup)
//   WHATSAPP_VERSAO    opcional, versão da Graph API (padrão v21.0)
export const whatsappConfigurado = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

// "(19) 99999-0000" → "5519999990000". Números sem DDI recebem 55 (Brasil).
export function numeroWhatsapp(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  if (d.length < 10) return "";
  return d.length <= 11 ? `55${d}` : d;
}

export async function enviarWhatsapp(reg, fetchFn = fetch) {
  if (!whatsappConfigurado()) throw new Error("WhatsApp não configurado (WHATSAPP_TOKEN e WHATSAPP_PHONE_ID).");
  const versao = process.env.WHATSAPP_VERSAO || "v21.0";
  const r = await fetchFn(`https://graph.facebook.com/${versao}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp", to: reg.para, type: "template",
      template: {
        name: reg.modelo, language: { code: reg.idioma || "pt_BR" },
        components: [{ type: "body", parameters: reg.parametros.map((text) => ({ type: "text", text: String(text).slice(0, 200) || "-" })) }],
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`WhatsApp recusou: ${j.error?.message || `HTTP ${r.status}`}`);
  reg.mensagem_id = j.messages?.[0]?.id || null;
}
