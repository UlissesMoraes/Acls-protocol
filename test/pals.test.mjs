import { test } from "node:test";
import assert from "node:assert/strict";
import { shockableMedPed, epiMedPed, palsEnergy, weightFromAge } from "../src/data/pals.js";
import { FORMULAS_PED } from "../src/data/formulasPed.js";

// ── Sequência de medicação PALS (ritmo chocável) ──
test("PALS: adrenalina 0,01 mg/kg após o 2º choque", () => {
  const m = shockableMedPed(2, 20);
  assert.equal(m.key, "epi");
  assert.match(m.label, /0,2 mg/); // 20 kg × 0,01 = 0,2 mg
});

test("PALS: 1º choque não dá medicação", () => {
  assert.equal(shockableMedPed(1, 20), null);
});

test("PALS: amiodarona 5 mg/kg após 3º e 5º choque", () => {
  assert.match(shockableMedPed(3, 20).label, /Amiodarona 100 mg/); // 20×5
  assert.match(shockableMedPed(5, 20).label, /Amiodarona 100 mg/);
});

test("PALS: adrenalina respeita teto de 1 mg", () => {
  assert.match(shockableMedPed(2, 200).label, /Adrenalina 1 mg/); // 200×0,01=2 → teto 1
});

test("PALS: amiodarona respeita teto de 300 mg", () => {
  assert.match(shockableMedPed(3, 100).label, /Amiodarona 300 mg/); // 100×5=500 → teto 300
});

test("PALS: sem peso, rótulo pede o peso", () => {
  assert.match(epiMedPed(0).label, /informe o peso/);
  assert.match(shockableMedPed(2).label, /informe o peso/);
});

// ── Energia da desfibrilação ──
test("PALS energia: 1º choque 2 J/kg, demais 4 J/kg", () => {
  assert.equal(palsEnergy(1, 10).joules, 20);
  assert.equal(palsEnergy(2, 10).joules, 40);
  assert.equal(palsEnergy(3, 10).jPerKg, 4);
});

test("PALS energia: não excede 200 J (dose adulto)", () => {
  assert.equal(palsEnergy(2, 80).joules, 200); // 4×80=320 → 200
});

// ── Estimativa de peso por idade (APLS) ──
test("Peso por idade: lactente, pré-escolar e escolar", () => {
  assert.equal(weightFromAge({ months: 6 }), 7);   // 6/2+4
  assert.equal(weightFromAge({ years: 3 }), 14);   // 3×2+8
  assert.equal(weightFromAge({ years: 8 }), 31);   // 8×3+7
  assert.equal(weightFromAge({ years: 15 }), null); // > 12 anos
});

// ── Fórmulas de dose pediátricas (tetos) ──
test("formulasPed: adrenalina PCR limita a 1 mg e calcula mL", () => {
  const r = FORMULAS_PED["Adrenalina|pcr_ped"](200);
  assert.match(r.result, /1 mg/);
  assert.match(r.result, /10 mL/); // 1 mg / 0,1 mg/mL
});

test("formulasPed: atropina respeita mínimo de 0,1 mg", () => {
  const r = FORMULAS_PED["Atropina|bradicardia_ped"](2); // 0,04 mg → mín 0,1
  assert.match(r.result, /0,1 mg/);
});

test("formulasPed: adenosina 1ª e 2ª dose com tetos 6/12 mg", () => {
  const r = FORMULAS_PED["Adenosina|taquicardia_ped"](100); // 10 e 20 → 6 e 12
  assert.match(r.result, /6 mg/);
  assert.match(r.result, /12 mg/);
});

test("formulasPed: toda fórmula devolve result + details[]", () => {
  for (const [key, fn] of Object.entries(FORMULAS_PED)) {
    const out = fn(15);
    assert.ok(typeof out.result === "string" && out.result.length, `${key} sem result`);
    assert.ok(Array.isArray(out.details), `${key} sem details[]`);
  }
});
