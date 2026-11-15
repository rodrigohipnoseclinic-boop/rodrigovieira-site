"""Remove pausas da fala, mantendo animação e voz sincronizadas.
Uso: python3 cortar_silencios.py video_original.mp4 pasta_quadros pasta_saida
Gera: pasta_saida/quadros/f%06d.jpg (sequência sem as pausas), pasta_saida/voz.wav e pasta_saida/cortes.json"""
import sys, os, json, subprocess, wave
import numpy as np
V, FR, OUT = sys.argv[1:4]
FPS, SR = 30, 44100
os.makedirs(f'{OUT}/quadros', exist_ok=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',V,'-vn','-ac','1','-ar','16000',f'{OUT}/a16.wav'],check=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',V,'-vn','-ac','2','-ar',str(SR),f'{OUT}/voz_orig.wav'],check=True)
w = wave.open(f'{OUT}/a16.wav'); x = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(float)/32768
hop = 160; n = len(x)//hop
db = np.array([20*np.log10(np.sqrt(np.mean(x[i*hop:(i+1)*hop]**2))+1e-9) for i in range(n)])
sil = db < -46; gaps = []; i = 0
while i < n:
    if sil[i]:
        j = i
        while j < n and sil[j]: j += 1
        if (j-i)*.01 >= .25: gaps.append((i*.01, j*.01))
        i = j
    else: i += 1
KEEP = .06   # sobra de cada lado da pausa
cuts = []
for a, b in gaps:
    cs = int(np.ceil((a+KEEP)*FPS)); ce = int(np.floor((b-KEEP)*FPS))
    if ce-cs >= 3: cuts.append([cs, ce])
json.dump(cuts, open(f'{OUT}/cortes.json','w'))
nfr = len([f for f in os.listdir(FR) if f.endswith('.jpg')])
cut = set(f for cs, ce in cuts for f in range(cs, ce))
kept = [f for f in range(nfr) if f not in cut]
for k, f in enumerate(kept):
    d = f'{OUT}/quadros/f{k:06d}.jpg'
    if os.path.lexists(d): os.remove(d)
    os.symlink(f'{FR}/f{f:06d}.jpg', d)
# voz: mesmas fronteiras de quadro, com micro-fades de 5 ms
v = wave.open(f'{OUT}/voz_orig.wav'); a = np.frombuffer(v.readframes(v.getnframes()), dtype='<i2').reshape(-1,2).astype(float)
spf = SR//FPS; segs = []; s0 = None
for f in range(nfr+1):
    if f < nfr and f not in cut:
        if s0 is None: s0 = f
    elif s0 is not None: segs.append((s0, f)); s0 = None
parts = []; fd = int(.005*SR)
for s, e in segs:
    p = a[s*spf:min(e*spf, len(a))].copy()
    if len(p) > 2*fd:
        p[:fd] *= np.linspace(0,1,fd)[:,None]; p[-fd:] *= np.linspace(1,0,fd)[:,None]
    parts.append(p)
o = np.concatenate(parts)
with wave.open(f'{OUT}/voz.wav','wb') as ww:
    ww.setnchannels(2); ww.setsampwidth(2); ww.setframerate(SR); ww.writeframes(o.astype('<i2').tobytes())
print(f'{len(cuts)} cortes; {nfr/FPS:.1f}s -> {len(kept)/FPS:.1f}s (-{(nfr-len(kept))/FPS:.1f}s)')
