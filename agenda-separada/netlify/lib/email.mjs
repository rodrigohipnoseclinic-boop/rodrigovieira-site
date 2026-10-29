// Envio de e-mails pela conta Gmail do consultório.
// Precisa de duas variáveis no Netlify: GMAIL_USUARIO e GMAIL_SENHA_APP (senha de app do Google).
import nodemailer from "nodemailer";
import site from "../../config/site.json" with { type: "json" };

// Endereço público da agenda (pode ser trocado pela variável AGENDA_URL).
export const SITE = (process.env.AGENDA_URL || site.url).replace(/\/$/, "");
export const configurado = () => !!(process.env.GMAIL_USUARIO && process.env.GMAIL_SENHA_APP);

export function transporte() {
  return nodemailer.createTransport({
    service: "gmail",
    pool: true,
    auth: { user: process.env.GMAIL_USUARIO, pass: process.env.GMAIL_SENHA_APP.replace(/\s/g, "") },
  });
}

export const remetente = () => ({ name: site.nome, address: process.env.GMAIL_USUARIO });
