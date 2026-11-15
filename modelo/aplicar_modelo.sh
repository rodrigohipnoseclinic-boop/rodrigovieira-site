#!/bin/bash
# Uso: ./aplicar_modelo.sh entrada.mp4 legendas.srt saida.mp4 "@seuperfil"
# Normaliza para 720x1280/30fps, aplica fundo vinho-degradê (se o vídeo não preencher),
# legenda no estilo do modelo (centro, y~950) e o @ no rodapé.
IN="$1"; SRT="$2"; OUT="$3"; HANDLE="${4:-@seuperfil}"
ffmpeg -y -i "$IN" -vf "\
scale=720:1280:force_original_aspect_ratio=decrease,\
pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=0x1a031d,\
fps=30,\
subtitles=$SRT:force_style='FontName=Montserrat,FontSize=14,PrimaryColour=&H00FFFFFF,Outline=0,Shadow=0,Alignment=2,MarginV=300',\
drawtext=text='$HANDLE':fontcolor=white@0.7:fontsize=18:x=(w-text_w)/2:y=1182" \
-af "loudnorm=I=-17:TP=-1" -c:v libx264 -crf 23 -c:a aac -ar 44100 "$OUT"
