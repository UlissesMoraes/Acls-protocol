import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeGas } from "../src/lib/gasometria.js";

test("gasometria: valores incompletos → inválido", () => {
  assert.equal(analyzeGas({ ph: 7.4 }).valid, false);
});

test("gasometria: normal", () => {
  const r = analyzeGas({ ph: 7.40, pco2: 40, hco3: 24 });
  assert.equal(r.phStatus, "normal");
  assert.equal(r.primary, null);
  assert.match(r.conclusion, /normalidade/);
});

test("gasometria: acidose metabólica com compensação adequada (Winter)", () => {
  // pH 7.30, PaCO2 30, HCO3 15 → Winter esperado 1.5*15+8 = 30.5 (±2) → 30 adequado
  const r = analyzeGas({ ph: 7.30, pco2: 30, hco3: 15 });
  assert.equal(r.primary.label, "Acidose metabólica");
  assert.equal(r.compensation.adequate, true);
});

test("gasometria: acidose metabólica com AG elevado + HCO3 corrigido", () => {
  const r = analyzeGas({ ph: 7.20, pco2: 25, hco3: 10, na: 140, cl: 100 });
  assert.equal(r.anionGap.high, true);
  assert.equal(r.anionGap.value, 30);
  assert.ok(r.correctedHco3); // 10 + (30-12) = 28 → alcalose metabólica associada
  assert.match(r.correctedHco3.text, /alcalose metabólica associada/);
});

test("gasometria: acidose respiratória mostra HCO3 esperado agudo/crônico", () => {
  const r = analyzeGas({ ph: 7.28, pco2: 60, hco3: 26 });
  assert.equal(r.primary.label, "Acidose respiratória");
  assert.match(r.compensation.text, /agudo/);
});

test("gasometria: alcalose respiratória", () => {
  const r = analyzeGas({ ph: 7.50, pco2: 28, hco3: 22 });
  assert.equal(r.primary.label, "Alcalose respiratória");
});

test("gasometria: relação PaO2/FiO2 (SDRA moderada)", () => {
  const r = analyzeGas({ ph: 7.40, pco2: 40, hco3: 24, pao2: 80, fio2: 50 });
  assert.equal(r.oxygenation.pfRatio, 160);
  assert.match(r.oxygenation.text, /SDRA moderada/);
});
