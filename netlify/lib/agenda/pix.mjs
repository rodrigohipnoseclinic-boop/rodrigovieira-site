// Provedores de Pix. A confirmação nunca vem do navegador: o status é
// sempre consultado na API do provedor.
//
// Variáveis no Netlify:
//   ASAAS_API_KEY        chave da conta (sandbox ou produção)
//   ASAAS_AMBIENTE       "sandbox" (padrão) ou "producao"
//   ASAAS_WEBHOOK_TOKEN  token configurado no webhook do Asaas
//   AGENDA_PIX_SIMULADO  "1" só para testes locais (pagamento de mentira)
import crypto from "node:crypto";
import { Erro } from "./config.mjs";

const STATUS_ASAAS = {
  RECEIVED: "pago", CONFIRMED: "pago", RECEIVED_IN_CASH: "pago",
  PENDING: "pendente", AWAITING_RISK_ANALYSIS: "pendente",
  OVERDUE: "expirado", REFUNDED: "estornado", REFUND_REQUESTED: "estornado", REFUND_IN_PROGRESS: "estornado",
  DELETED: "cancelado",
};

export function asaas(fetchFn = fetch) {
  const chave = process.env.ASAAS_API_KEY;
  const base = process.env.ASAAS_AMBIENTE === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
  async function chamar(metodo, caminho, dados) {
    if (!chave) throw new Erro("Pix ainda não configurado (ASAAS_API_KEY).", 503);
    const r = await fetchFn(base + caminho, {
      method: metodo,
      headers: { access_token: chave, "Content-Type": "application/json", "User-Agent": "agenda-rodrigovieira" },
      body: dados ? JSON.stringify(dados) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = j.errors?.map((e) => e.description).join(" ") || `HTTP ${r.status}`;
      throw new Erro(`Provedor Pix recusou: ${msg}`, r.status >= 500 ? 502 : 400);
    }
    return j;
  }
  return {
    nome: "asaas",
    configurado: !!chave,
    async criarCobranca({ pedidoId, valor, descricao, cliente, vencimento }) {
      const cli = await chamar("POST", "/customers", {
        name: cliente.nome, cpfCnpj: cliente.cpf, email: cliente.email, mobilePhone: cliente.telefone.replace(/\D/g, "").slice(-11),
        externalReference: pedidoId, notificationDisabled: true,
      });
      const pg = await chamar("POST", "/payments", {
        customer: cli.id, billingType: "PIX", value: valor, dueDate: vencimento, description: descricao, externalReference: pedidoId,
      });
      const qr = await chamar("GET", `/payments/${pg.id}/pixQrCode`);
      return { provedor_id: pg.id, qr_imagem: `data:image/png;base64,${qr.encodedImage}`, copia_cola: qr.payload, expira: qr.expirationDate || null };
    },
    async consultar(id) {
      const pg = await chamar("GET", `/payments/${encodeURIComponent(id)}`);
      return { status: STATUS_ASAAS[pg.status] || "pendente", valor: pg.value, referencia: pg.externalReference, bruto: pg.status };
    },
    async estornar(id) {
      await chamar("POST", `/payments/${encodeURIComponent(id)}/refund`, {});
    },
    // O Asaas envia o token configurado no cabeçalho asaas-access-token.
    webhookAutentico(req) {
      const esperado = process.env.ASAAS_WEBHOOK_TOKEN || "";
      const veio = req.headers.get("asaas-access-token") || "";
      return esperado.length >= 16 && veio.length === esperado.length && crypto.timingSafeEqual(Buffer.from(veio), Buffer.from(esperado));
    },
    idDoWebhook: (b) => b?.payment?.id || null,
  };
}

// Pagamentos de mentira para testes locais. "Pagar" chama simularPagamento().
const simulados = new Map();
export function simulado() {
  return {
    nome: "simulado",
    configurado: true,
    async criarCobranca({ pedidoId, valor }) {
      const id = `sim_${crypto.randomBytes(6).toString("hex")}`;
      simulados.set(id, { status: "pendente", valor, referencia: pedidoId });
      return { provedor_id: id, qr_imagem: "", copia_cola: `00020126PIX-SIMULADO-${id}`, expira: null };
    },
    async consultar(id) {
      const p = simulados.get(id);
      if (!p) throw new Erro("Cobrança não encontrada.", 404);
      return { ...p };
    },
    async estornar(id) { simulados.get(id).status = "estornado"; },
    webhookAutentico: (req) => req.headers.get("x-simulado") === "1",
    idDoWebhook: (b) => b?.id || null,
  };
}
export const simularPagamento = (id) => { const p = simulados.get(id); if (p) p.status = "pago"; return !!p; };

export const provedor = () => (process.env.AGENDA_PIX_SIMULADO === "1" ? simulado() : asaas());
