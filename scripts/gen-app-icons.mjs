// Requer jimp (dev): npm i -D jimp
// Gera os ícones do PWA a partir de public/icon-source.png (arte 1024×1024).
//  - icon-192/512.png        → "any" (arte completa, cantos já arredondados)
//  - icon-maskable-192/512   → arte reduzida (82%) sobre fundo azul, na zona segura
import { Jimp, JimpMime } from "jimp";
import { writeFileSync } from "node:fs";

const SRC = "assets/icon-source.png";
const src = await Jimp.read(SRC);

async function save(img, path) {
  const buf = await img.getBuffer(JimpMime.png);
  writeFileSync(path, buf);
  console.log("✔", path, `${img.width}x${img.height}`);
}

// "any" — arte completa redimensionada
for (const size of [192, 512]) {
  const img = src.clone().resize({ w: size, h: size });
  await save(img, `public/icon-${size}.png`);
}

// "maskable" — arte a 82% centrada sobre fundo azul (sobrevive ao corte do Android)
const N = 1024;
const bgColor = src.getPixelColor(10, 10);           // azul do canto da arte
for (const size of [192, 512]) {
  const canvas = new Jimp({ width: N, height: N, color: bgColor });
  const inner = src.clone().resize({ w: Math.round(N * 0.82) });
  const off = Math.round((N - inner.width) / 2);
  canvas.composite(inner, off, off);
  canvas.resize({ w: size, h: size });
  await save(canvas, `public/icon-maskable-${size}.png`);
}

// favicon/atalho menor (apple-touch usa o 192)
await save(src.clone().resize({ w: 180, h: 180 }), "public/apple-touch-icon.png");
console.log("Ícones gerados.");
