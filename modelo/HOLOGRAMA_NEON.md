# Modelo "Holograma Neon"

Vídeo vertical explicativo (Reels/TikTok/Shorts) com animação wireframe neon, narrado pela voz do Rodrigo. Aprovado pelo Rodrigo na versão `hipnose_v4` (tema: medo de hipnose).
Referência de estilo: "Os vícios explicados – Parte 3" (@dougsan). Ficha técnica da referência: `MODELO_VIDEO.md`.

## Como pedir
"Faz no Holograma Neon" + o vídeo/áudio da fala (ou o roteiro em texto).

## Especificações
- 720x1280, 30 fps, MP4 H.264 + AAC; fala acelerada em **1,1x** (tom preservado)
- Fundo degradê vinho (#5E2756 -> #12021A) com estrelas; plataforma luminosa circular; objetos wireframe em lilás/branco, destaque em rosa neon (#FF3B6B)
- Rodapé fixo: "Rodrigo Vieira · Hipnose Clínica" (trocar se o Rodrigo passar o @)
- Selos no topo (caixa neon) para números e ideias-chave; rótulos neon junto ao objeto

## Legenda (aprovada)
Palavra por palavra, caixa alta, Inter 800 ~40 px, centro y~960, até 5 palavras por bloco. Palavra falada acende em rosa com "pop"; já ditas brancas; próximas apagadas (50%).

## Áudio (aprovado)
- Voz: passa-alta 80 Hz, +2 dB em 3 kHz, compressor 3:1, loudnorm -14 LUFS
- Trilha: pad ambiente Lá menor (Am-F-C-G), bem baixa (volume 0,14), com sidechain: abaixa quando a voz fala
- Efeitos MODERADOS (só ~10 em 2 min): whoosh suave só nas viradas de assunto; ping/estrondo só em dado de impacto; estilhaço quando uma ideia é "desmontada"; sino no fecho. NÃO usar ping em todo rótulo, risers ou pulsos constantes.
- Pausas da fala >= 0,25 s encurtadas para ~0,12 s (animação, voz e efeitos cortados juntos)

## Estrutura narrativa
Capa -> gancho -> mitos e "não é isso" -> mecanismo explicado com 1 objeto por ideia -> dado/ciência (selo) -> uso responsável -> controle/medo -> fecho com chamada para avaliação.
Uma ideia visual nova a cada ~6-10 s, sempre alinhada ao que está sendo dito.

## Pipeline (código em `animacao/`)
1. Transcrever (faster-whisper, modelo "small", pt, word_timestamps). Requer liberar hosts do Hugging Face no ambiente; passar o áudio como array numpy (bug do `av`).
2. Corrigir erros da transcrição, gerar `legendas.js` (CAPS2) por palavra.
3. Escrever as cenas em `animacao/index.html` (funções `sc(inicio, fim, fn)` com tempos da fala).
4. Renderizar quadros: `node render.cjs <dir> 30 0 <dur> <worker> 4` (4 em paralelo, ~3 min). Arquivo é `.cjs` porque o projeto usa ESM.
5. `python3 cortar_silencios.py <video_original> <quadros> <saida>` -> quadros sem pausas, `voz.wav`, `cortes.json`.
6. `python3 audio.py <saida> <saida>/cortes.json` -> `music.wav`, `sfx.wav` (ajustar a lista de efeitos para o novo roteiro).
7. Mistura final e 1,1x com ffmpeg (voz + trilha com sidechain + sfx, loudnorm -14, atempo 1.1, setpts=PTS/1.1).

## Cuidados
- Conferir dados/fontes citados na fala antes de postar (ex.: "60-70%, Divisão 30 da APA, 2024").
- Frases truncadas da transcrição: confirmar com o Rodrigo antes de "completar".
- Cada cena nova precisa de objetos novos (a lista de formas está em `index.html`: cabeça, cérebro, engrenagens, nó, barras, pessoas etc.).
