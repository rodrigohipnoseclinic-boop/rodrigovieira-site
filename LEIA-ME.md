# Site do Dr. Rodrigo Vieira

Site profissional com blog em **rodrigovieiraterapeuta.com.br**, hospedado no Netlify.
Tudo o que aparece no site é editado pelo painel em **rodrigovieiraterapeuta.com.br/admin**.

## Como publicar um post

1. Entre em `rodrigovieiraterapeuta.com.br/admin` e clique em **Entrar com GitHub**.
2. Abra **Posts do blog** → **Novo post**.
3. Preencha título, data, resumo, capa e categoria.
4. Escreva o texto. Para cada subtítulo em forma de pergunta, use o estilo **Título 2 (H2)**: o índice clicável é criado sozinho.
5. Para colocar um vídeo:
   - **No topo do post:** cole o link do YouTube, Vimeo ou Reels no campo *Vídeo principal*.
   - **No meio do texto:** cole o link sozinho numa linha.
6. Clique em **Salvar**. Em 1 a 2 minutos o post está no ar.

Quer deixar guardado sem publicar? Marque **Salvar como rascunho**.
Colocou uma data futura? O post aparece a partir dessa data, na próxima atualização do site.

O tempo de leitura, o índice, a caixa do autor, os posts relacionados e o convite para agendar pelo WhatsApp são montados automaticamente.

## Como mudar textos, fotos e cores da página inicial

No painel, abra **Página inicial e configurações**:

- **Textos da página inicial:** todas as seções, na ordem em que aparecem no site.
  Coloque `*asteriscos*` em volta de uma palavra do título para ela ficar em itálico verde.
- **Contato, autor e cores:** WhatsApp, Instagram, mini biografia dos posts e as cores do site.

## Estrutura dos arquivos

| Pasta / arquivo | O que é |
|---|---|
| `content/posts/` | Um arquivo por post do blog |
| `content/config/home.json` | Textos da página inicial |
| `content/config/site.json` | Contato, autor, cores |
| `static/` | Imagens, estilos, scripts e o painel (`/admin`) |
| `static/js/cerebro.js` | O cérebro 3D animado |
| `build.mjs` | Monta o site (o Netlify roda sozinho a cada alteração) |

Para gerar o site no computador: `node build.mjs` (o resultado fica em `dist/`). Não precisa instalar nada além do Node.

## Visitas e inscritos

- **Visitas:** abra `rodrigovieiraterapeuta.com.br/visitas/` (não aparece no menu).
- **Inscritos:** painel do Netlify → **Forms → inscricao** (dá para baixar em planilha).
- **E-mail automático:** a cada hora o site verifica se há post novo e envia aos inscritos pelo Gmail.
  Precisa de duas variáveis no Netlify (*Site configuration → Environment variables*):
  `GMAIL_USUARIO` (o Gmail que envia) e `GMAIL_SENHA_APP` (senha de app criada em myaccount.google.com/apppasswords).
