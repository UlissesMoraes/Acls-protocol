// Gera os ícones PNG do PWA (sem dependências externas) usando zlib.
// Ícone: cruz médica branca sobre quadrado vermelho. Versões "any" (cantos
// arredondados, fundo transparente) e "maskable" (full-bleed para a máscara do SO).
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const RED = [197, 48, 48];
const WHITE = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// Cobertura do desenho num ponto (coordenadas 0..1). Retorna [r,g,b] ou null (transparente).
function sample(u, v, maskable) {
  const cx = 0.5, cy = 0.5;
  // Quadrado arredondado (apenas no modo "any")
  if (!maskable) {
    const r = 0.18;
    const dx = Math.max(Math.abs(u - cx) - (0.5 - r), 0);
    const dy = Math.max(Math.abs(v - cy) - (0.5 - r), 0);
    if (Math.hypot(dx, dy) > r) return null; // fora do quadrado arredondado → transparente
  }
  // Cruz (plus) centralizada — menor na versão maskable (zona segura da máscara)
  const arm = maskable ? 0.26 : 0.30;   // meio-comprimento do braço
  const th  = maskable ? 0.085 : 0.10;  // metade da espessura
  const inH = Math.abs(u - cx) <= th && Math.abs(v - cy) <= arm;
  const inV = Math.abs(v - cy) <= th && Math.abs(u - cx) <= arm;
  return (inH || inV) ? WHITE : RED;
}

function render(size, maskable) {
  const SS = 4; // supersampling para suavizar bordas
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          const c = sample(u, v, maskable);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
        }
      }
      const n = SS * SS, i = (y * size + x) * 4;
      const cov = a / (n * 255);
      // Pré-multiplicação evitada: cor média ponderada apenas sobre amostras cobertas
      out[i]   = a ? Math.round(r / (a / 255)) : 0;
      out[i+1] = a ? Math.round(g / (a / 255)) : 0;
      out[i+2] = a ? Math.round(b / (a / 255)) : 0;
      out[i+3] = Math.round(cov * 255);
    }
  }
  return png(size, size, out);
}

const targets = [
  ["public/icon-192.png", 192, false],
  ["public/icon-512.png", 512, false],
  ["public/icon-maskable-192.png", 192, true],
  ["public/icon-maskable-512.png", 512, true],
];
for (const [path, size, maskable] of targets) {
  writeFileSync(path, render(size, maskable));
  console.log("✔", path, `(${size}px${maskable ? ", maskable" : ""})`);
}
