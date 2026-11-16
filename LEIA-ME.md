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

## Hospedagem, visitas e inscritos

- **Hospedagem:** Cloudflare Workers (gratuito). Build: `node build.mjs`; deploy: `npx wrangler deploy` (configuração em `wrangler.jsonc`, pasta publicada: `dist`).
- **Visitas:** painel da Cloudflare → Web Analytics.
- **Inscritos:** o formulário usa o Web3Forms (grátis, 250 por mês). Cada inscrição chega por e-mail.
  A chave do formulário fica em **Página inicial e configurações → Contato, autor e cores**.
  Enquanto estiver vazia, a página Inscreva-se mostra um botão de WhatsApp.

## App Mente Renovada (treino mental bíblico)

Jogo instalável (PWA) em **rodrigovieiraterapeuta.com.br/mente-biblica/**. Fica em `static/mente-biblica/` e é copiado para `dist/` pelo `node build.mjs`.

- **Jornada:** cada fase sorteia um dos 12 desafios; o nível sobe com o XP (600 e 1600). A cada 20 a 30 fases o jogador ganha uma cena de mangá, com narração.
- **Arquivos:** `app.js` (regras e telas), `data.js` / `puzzles.js` / `vocab.js` (versículos, perguntas, palavras), `manga.js` (as 10 cenas), `style.css`, `sw.js` (funciona offline).
- **Ver uma cena direto:** `/mente-biblica/?manga=0` até `?manga=9`.
- **Se mudar os arquivos do jogo**, aumente a versão em `sw.js` (`mente-renovada-vN`), senão quem já instalou continua vendo a versão antiga.

### Modo dono (convidar amigos)

- Em **Progresso → Área do dono**, digite a mesma senha do painel de visitas (segredo `VISITAS_SENHA`). O jogo confere no servidor; nenhuma senha fica no código.
- Com o modo dono ligado, a tela inicial mostra **Convidar amigos** (WhatsApp e e-mail) e um campo de nome. Quem recebe o link não vê esses botões.
- Isso só esconde os botões: não impede alguém de copiar o endereço do navegador.
- No iPhone, o app instalado guarda dados separados do Safari: libere o modo dono dentro do app instalado.

### Contagem anônima do jogo

- O jogo envia só somas por dia para `POST /api/jogo`: `abriu` (1x por dia), `jogou` e `instalou` (1x por aparelho), `fase`, `cena`, `nivel`. Não guarda nome, IP, aparelho nem localização. O dono não é contado.
- O nome digitado no convite vira `?de=nome` no link. O painel **/visitas/** mostra "Jogo Mente Renovada" e "Por convite".
- Há um aviso de transparência no rodapé de Progresso. Mantenha-o (LGPD).
- Depois de mudar `src/worker.js`, publique com `npx wrangler deploy` (a tabela `jogo` é criada sozinha).

### Pendências conhecidas

- Revisar os textos escritos por IA: versículos (Almeida Revista e Corrigida), perguntas do quiz, dicas da cruzadinha e falas das cenas.
- Jogo de debate teológico (60% NT / 40% AT): combinado, ainda não feito.

