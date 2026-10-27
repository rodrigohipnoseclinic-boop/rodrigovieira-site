// Simula o Netlify Blobs em produção: leitura devolve etag e a gravação
// condicional falha se o dado mudou. Pausas aleatórias forçam disputas.
const pausa = () => new Promise((r) => setTimeout(r, Math.random() * 4));
export class LojaMemoria {
  m = new Map(); v = 0;
  async getWithMetadata(k) { await pausa(); const x = this.m.get(k); return x ? { data: structuredClone(x.d), etag: x.e, metadata: {} } : null; }
  async get(k, o = {}) { await pausa(); const x = this.m.get(k); if (!x) return null; return o.type === "json" ? structuredClone(x.d) : x.d.buffer.slice(x.d.byteOffset, x.d.byteOffset + x.d.byteLength); }
  async setJSON(k, d, o = {}) { return this.gravar(k, structuredClone(d), o); }
  async set(k, d, o = {}) { return this.gravar(k, Buffer.from(d), o); }
  async gravar(k, d, o) {
    await pausa();
    const x = this.m.get(k);
    if (o.onlyIfNew && x) return { modified: false };
    if (o.onlyIfMatch && (!x || x.e !== o.onlyIfMatch)) return { modified: false };
    const e = `"${++this.v}"`; this.m.set(k, { d, e }); return { modified: true, etag: e };
  }
  async delete(k) { this.m.delete(k); }
  async list({ prefix = "" } = {}) { return { blobs: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; }
}
