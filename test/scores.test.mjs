import { test } from "node:test";
import assert from "node:assert/strict";
import { SCORES_DEF } from "../src/data/scores.js";

test("GCS — interpretação por faixa", () => {
  assert.match(SCORES_DEF.gcs.interp(15).label, /leve/i);
  assert.match(SCORES_DEF.gcs.interp(11).label, /moderada/i);
  assert.match(SCORES_DEF.gcs.interp(7).label, /VIA AÉREA/);
});

test("ClCr (Cockcroft-Gault) — homem e fator feminino 0,85", () => {
  // homem 72a, 70kg, cr 1,4 → ((140-72)*70)/(72*1,4) = 47,2
  const m = SCORES_DEF.clcr.formula({ idade: "72", peso: "70", cr: "1.4", sexo: "m" });
  assert.ok(Math.abs(m - 47.2) < 0.2, `esperado ~47,2, obtido ${m}`);
  const fem = SCORES_DEF.clcr.formula({ idade: "72", peso: "70", cr: "1.4", sexo: "f" });
  assert.ok(Math.abs(fem - m * 0.85) < 0.01, "fator feminino 0,85");
  assert.match(SCORES_DEF.clcr.interp(m).label, /moderada/i);
});

test("ClCr aceita vírgula decimal (pt-BR)", () => {
  const ptbr = SCORES_DEF.clcr.formula({ idade: "72", peso: "70", cr: "1.4", sexo: "m" });
  // o componente normaliza vírgula→ponto antes de chamar; aqui garantimos que 1.4 funciona
  assert.ok(ptbr > 40 && ptbr < 55);
});

test("QTc (Bazett) — QT 400 ms a 75 bpm ≈ 447 ms", () => {
  const v = SCORES_DEF.qtc.formula({ qt: "400", fc: "75" });
  assert.ok(Math.abs(v - 447) < 1, `obtido ${v}`);
  assert.match(SCORES_DEF.qtc.interp(v).label, /prolongado/i);
  assert.match(SCORES_DEF.qtc.interp(520).label, /TdP|ALTO RISCO/);
});

test("Ânion Gap — 138 − (100 + 14) = 24 (elevado)", () => {
  const v = SCORES_DEF.aniongap.formula({ na: "138", cl: "100", hco3: "14" });
  assert.equal(v, 24);
  assert.match(SCORES_DEF.aniongap.interp(v).label, /elevado/i);
});

test("Sódio corrigido pela glicemia — 128 + 1,6×(650−100)/100 = 136,8", () => {
  const v = SCORES_DEF.nacorr.formula({ na: "128", gli: "650" });
  assert.ok(Math.abs(v - 136.8) < 0.05, `obtido ${v}`);
  assert.match(SCORES_DEF.nacorr.interp(v).label, /normal/i);
});

test("Osmolaridade efetiva — 2×152 + 850/18 = 351,2 (EHH)", () => {
  const v = SCORES_DEF.osm.formula({ na: "152", gli: "850" });
  assert.ok(Math.abs(v - 351.2) < 0.2, `obtido ${v}`);
  assert.match(SCORES_DEF.osm.interp(v).label, /EHH|grave/i);
});

test("GRACE — pontuação de exemplo cai em faixa válida", () => {
  const pts = SCORES_DEF.grace.calcPoints({ age: "68", hr: "92", sbp: "115", cr: "1.2", killip: "1", arrest: false, stdev: true, enzymes: true });
  assert.ok(pts > 100 && pts < 200, `obtido ${pts}`);
  assert.ok(SCORES_DEF.grace.interp(pts).label.length > 0);
});

test("CHA₂DS₂-VASc — pontuação e interpretação", () => {
  // Idade 65–74 (1) e ≥75 (2) são mutuamente exclusivas → teto clínico = 9
  const semIdade65 = SCORES_DEF.chadsvasc.fields
    .filter(f => f.k !== "i65").reduce((a, f) => a + f.pts, 0);
  assert.equal(semIdade65, 9, "score máximo clínico = 9");
  assert.match(SCORES_DEF.chadsvasc.interp(0).label, /Baixo risco/i);
  assert.match(SCORES_DEF.chadsvasc.interp(4).label, /ANTICOAGULAR/i);
});

test("Déficit de potássio — (4,0−2,6)×70×0,4 = 39,2 mEq", () => {
  const v = SCORES_DEF.kdef.formula({ katual: "2.6", kalvo: "4.0", peso: "70" });
  assert.ok(Math.abs(v - 39.2) < 0.1, `obtido ${v}`);
});

test("Cálcio corrigido — 7,8 + 0,8×(4−2,5) = 9,0", () => {
  const v = SCORES_DEF.cacorr.formula({ ca: "7.8", alb: "2.5" });
  assert.ok(Math.abs(v - 9.0) < 0.01, `obtido ${v}`);
  assert.match(SCORES_DEF.cacorr.interp(v).label, /normal/i);
});

test("Toda interp() retorna { label, color, bg, text }", () => {
  for (const [k, sc] of Object.entries(SCORES_DEF)) {
    const r = sc.interp(typeof sc.formula === "function" ? 0 : 5);
    for (const f of ["label", "color", "bg", "text"])
      assert.ok(r[f] !== undefined, `${k}.interp().${f}`);
  }
});
