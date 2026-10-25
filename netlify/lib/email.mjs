// Envio de e-mails pela conta Gmail do site.
// Precisa de duas variáveis no Netlify: GMAIL_USUARIO e GMAIL_SENHA_APP (senha de app do Google).
import nodemailer from "nodemailer";
import site from "../../content/config/site.json" with { type: "json" };

export const SITE = site.url.replace(/\/$/, "");
export const configurado = () => !!(process.env.GMAIL_USUARIO && process.env.GMAIL_SENHA_APP);

export function transporte() {
  return nodemailer.createTransport({
    service: "gmail",
    pool: true,
    auth: { user: process.env.GMAIL_USUARIO, pass: process.env.GMAIL_SENHA_APP.replace(/\s/g, "") },
  });
}

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const abs = (u = "") => (u.startsWith("http") ? u : SITE + u);
const c = site.cores;

function moldura(conteudo, linkCancelar) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:${c.fundo};font-family:Arial,Helvetica,sans-serif;color:${c.texto}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
${conteudo}
<tr><td style="padding:20px 28px;border-top:1px solid #eee;font-size:12px;color:#777;line-height:1.5">
${esc(site.nome)} · ${esc(site.titulo_profissional)}<br>
Você recebe este e-mail porque se inscreveu em <a href="${SITE}" style="color:#777">${SITE.replace(/^https?:\/\//, "")}</a>.
<a href="${linkCancelar}" style="color:#777">Cancelar inscrição</a>.
</td></tr></table></td></tr></table></body></html>`;
}

const botao = (href, txt) =>
  `<a href="${href}" style="display:inline-block;background:${c.principal};color:#fff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:999px">${txt}</a>`;

export function emailPost(post, nome, linkCancelar) {
  const ola = nome ? `Olá, ${esc(nome.split(" ")[0])}!` : "Olá!";
  const html = moldura(`
${post.capa ? `<tr><td><a href="${abs(post.url)}"><img src="${abs(post.capa)}" alt="" width="560" style="display:block;width:100%;height:auto"></a></td></tr>` : ""}
<tr><td style="padding:28px">
<p style="margin:0 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${c.principal}">Novo post no blog</p>
<h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:${c.principal_escura}">${esc(post.titulo)}</h1>
<p style="margin:0 0 8px;font-size:16px;line-height:1.6">${ola}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6">${esc(post.resumo || "")}</p>
${botao(abs(post.url), "Ler o post completo")}
</td></tr>`, linkCancelar);
  const texto = `${ola}\n\nNovo post no blog: ${post.titulo}\n\n${post.resumo || ""}\n\nLeia em: ${abs(post.url)}\n\nCancelar inscrição: ${linkCancelar}`;
  return { assunto: post.titulo, html, texto };
}

export function emailBoasVindas(nome, linkCancelar) {
  const ola = nome ? `Olá, ${esc(nome.split(" ")[0])}!` : "Olá!";
  const html = moldura(`<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:24px;color:${c.principal_escura}">Inscrição confirmada</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6">${ola} Obrigado por se inscrever.</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.6">A partir de agora, sempre que sair um conteúdo novo sobre ansiedade, hipnose clínica e regulação emocional, você recebe aqui no seu e-mail.</p>
${botao(SITE + "/blog/", "Ver o blog")}
</td></tr>`, linkCancelar);
  const texto = `${ola} Obrigado por se inscrever.\n\nSempre que sair um conteúdo novo, você recebe aqui no seu e-mail.\n\nBlog: ${SITE}/blog/\n\nCancelar inscrição: ${linkCancelar}`;
  return { assunto: `Inscrição confirmada | ${site.nome}`, html, texto };
}

export const remetente = () => ({ name: site.nome, address: process.env.GMAIL_USUARIO });
export const linkCancelar = (id, token) => `${SITE}/api/cancelar?id=${id}&t=${token}`;
