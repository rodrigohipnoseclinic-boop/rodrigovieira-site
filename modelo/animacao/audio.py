"""Gera trilha (pad ambiente) e efeitos sonoros sincronizados com as cenas.
Uso: python3 audio.py pasta_saida   -> escreve music.wav e sfx.wav (44,1 kHz, estéreo)
Tempos na linha do tempo original (antes da aceleração)."""
import sys, wave
import numpy as np

SR = 44100
DUR = 162.0
rng = np.random.default_rng(11)
N = int(SR * DUR)


def t_arr(d): return np.arange(int(SR * d)) / SR
def env_ad(n, a, d):  # ataque linear, queda exponencial
    t = np.arange(n) / SR
    return np.minimum(t / max(a, 1e-4), 1) * np.exp(-t / d)


def lp(x, fc):  # passa-baixa de um polo
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s += a * (x[i] - s); y[i] = s
    return y


def put(buf, x, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i < 0:
        x = x[-i:]; i = 0
    if i >= len(buf) or len(x) == 0: return
    n = min(len(x), len(buf) - i)
    buf[i:i + n, 0] += x[:n] * gain * (1 - max(pan, 0))
    buf[i:i + n, 1] += x[:n] * gain * (1 + min(pan, 0))


# ---------------- efeitos ----------------
def whoosh(d=.8):
    n = int(SR * d); noise = rng.standard_normal(n)
    out = np.zeros(n); t = np.arange(n) / n
    # varredura: mistura de passa-baixas com corte subindo e depois descendo
    for fc, w in ((300, 1), (900, 1), (2600, 1), (6000, .6)):
        y = lp(noise, fc)
        out += y * w * np.sin(np.pi * np.clip((t - (fc / 9000)) / (1 - fc / 9000), 0, 1))
    out *= np.sin(np.pi * t) ** 1.6
    return out / (np.abs(out).max() + 1e-9)


def ping(f, d=.7):
    t = t_arr(d); e = env_ad(len(t), .004, .16)
    return (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 2.01 * t) + .15 * np.sin(2 * np.pi * f * 3.02 * t)) * e


def tick(d=.12):
    t = t_arr(d); return np.sin(2 * np.pi * 1800 * t) * env_ad(len(t), .001, .02)


def boom(d=1.4):
    t = t_arr(d); f = 70 * np.exp(-t * 1.5) + 38
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(len(t), .004, .5)
    nz = lp(rng.standard_normal(len(t)), 500) * env_ad(len(t), .002, .08) * .6
    return (s + nz) / 1.4


def shatter(d=1.0):
    n = int(SR * d); x = np.zeros(n)
    for _ in range(26):
        at = int(rng.random() * n * .55); f = rng.uniform(2200, 7000); m = int(SR * .05)
        t = np.arange(m) / SR; x[at:at + m] += np.sin(2 * np.pi * f * t) * np.exp(-t / .012) * rng.uniform(.3, 1)
    return x / (np.abs(x).max() + 1e-9)


def riser(d=2.0):
    n = int(SR * d); t = np.arange(n) / n
    nz = lp(rng.standard_normal(n), 3500) * t ** 2.2
    f = 220 + 900 * t ** 2
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * t ** 2.5 * .4
    return (nz + s) / 1.5


def chime():
    out = np.zeros(int(SR * 1.8))
    for k, f in enumerate((523.25, 659.25, 783.99, 1046.5)):
        p = ping(f, 1.4); i = int(k * .09 * SR); out[i:i + len(p)] += p
    return out / 2.2


def heartbeat():
    out = np.zeros(int(SR * .6))
    for at in (0, .22):
        b = boom(.35) * .8; i = int(at * SR); out[i:i + len(b)] += b[:len(out) - i]
    return out


# ---------------- remapeamento de tempo (pausas removidas) ----------------
import json, os
CUTS = json.load(open(sys.argv[2])) if len(sys.argv) > 2 and os.path.exists(sys.argv[2]) else []
def nt(t):
    f = t * 30; rem = 0
    for cs, ce in CUTS:
        if f > cs: rem += min(f, ce) - cs
    return (f - rem) / 30
NEWDUR = nt(DUR - .4)

# ---------------- efeitos: poucos, só onde fazem diferença ----------------
sfx = np.zeros((N, 2))
for c in (36.3, 72.0, 111.7, 148.0):           # viradas de assunto
    put(sfx, whoosh(.9), nt(c) - .45, .30, pan=rng.uniform(-.3, .3))
put(sfx, tick(), nt(6.9), .12)                   # cadeado abre
put(sfx, shatter(1.2), nt(36.55), .30)           # "desmontar essa ideia"
put(sfx, boom(1.4), nt(36.5), .28)
put(sfx, ping(1318.5, .7), nt(14.7), .22)        # 60-70%
put(sfx, boom(1.2), nt(14.7), .26)
put(sfx, ping(1318.5, .7), nt(88.6), .20)        # real e mensurável
put(sfx, heartbeat(), nt(119.2), .28)            # nó aperta
put(sfx, ping(1568, .9), nt(145.0), .14)         # nó se desfaz
put(sfx, chime(), nt(157.8), .40)                # fechamento

# ---------------- trilha: pad em Lá menor, bem discreto ----------------
CH = [(110.0, 130.81, 164.81, 220.0), (87.31, 110.0, 130.81, 174.61),
      (130.81, 164.81, 196.0, 261.63), (98.0, 123.47, 146.83, 196.0)]  # Am F C G
BAR = 8.0
mus = np.zeros((N, 2))
tt = np.arange(N) / SR
for b in range(int(DUR / BAR) + 1):
    for f in CH[b % 4]:
        d = BAR + 2.5
        t = t_arr(d)
        e = np.minimum(t / 2.2, 1) * np.minimum((d - t) / 2.2, 1)
        for det, pan in ((0.996, -.4), (1.004, .4)):
            s = (np.sin(2 * np.pi * f * det * t) + .4 * np.sin(2 * np.pi * f * 2 * det * t)
                 + .15 * np.sin(2 * np.pi * f * 3 * det * t)) * e * (1 + .12 * np.sin(2 * np.pi * .23 * t + f))
            put(mus, s, b * BAR - 1.2, .06, pan)
# entrada e saída acompanham a duração nova
fade = np.minimum(tt / 3, 1) * np.minimum(np.maximum(NEWDUR - tt, 0) / 3, 1)
mus *= fade[:, None]


def save(name, a):
    a = np.clip(a / max(np.abs(a).max(), 1e-9) * .9, -1, 1)
    with wave.open(name, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((a * 32767).astype('<i2').tobytes())


out = sys.argv[1] if len(sys.argv) > 1 else '.'
save(f'{out}/music.wav', mus)
save(f'{out}/sfx.wav', sfx)
print('ok')
