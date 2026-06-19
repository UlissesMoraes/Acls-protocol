import { test } from "node:test";
import assert from "node:assert/strict";
import { FORMULAS } from "../src/data/formulas.js";

const f = (k, w) => FORMULAS[k](w);

test("Tenecteplase (IAMCSSST) — faixa de peso", () => {
  assert.match(f("Tenecteplase (TNKase)|iamcssst", 55).result, /30 mg/);
  assert.match(f("Tenecteplase (TNKase)|iamcssst", 65).result, /35 mg/);
  assert.match(f("Tenecteplase (TNKase)|iamcssst", 95).result, /50 mg/);
});

test("Alteplase (AVC) — 0,9 mg/kg com teto de 90 mg", () => {
  assert.match(f("Alteplase (rt-PA)|avc", 80).result, /72\.0 mg/);
  assert.match(f("Alteplase (rt-PA)|avc", 120).result, /90\.0 mg/); // teto
});

test("Adrenalina IM (AMAX4) — faixa pediátrica por peso", () => {
  assert.match(f("Adrenalina IM|amax4", 30).result, /0\.5 mg/);
  assert.match(f("Adrenalina IM|amax4", 18).result, /0\.3 mg/);
  assert.match(f("Adrenalina IM|amax4", 8).result, /0\.15 mg/);
});

test("Noradrenalina (vasoativas) — vazão na diluição 64 mcg/mL", () => {
  // 70 kg, início 0,05 mcg/kg/min = 3,5 mcg/min ; 3,5/64*60 = 3,28 → 3.3 mL/h
  const r = f("Noradrenalina (Norepinefrina)|vasoativas", 70);
  assert.match(r.result, /3\.5 mcg\/min/);
  assert.match(r.result, /3\.3 mL\/h/);
});

test("Dobutamina (vasoativas) — início 5 mcg/kg/min em 70 kg", () => {
  // 5*70 = 350 mcg/min ; 350/1000*60 = 21 mL/h
  const r = f("Dobutamina|vasoativas", 70);
  assert.match(r.result, /350 mcg\/min/);
  assert.match(r.result, /21\.0 mL\/h/);
});

test("Milrinona (vasoativas) — ataque 50 mcg/kg", () => {
  assert.match(f("Milrinona|vasoativas", 70).result, /3500 mcg/);
});

test("Toda fórmula retorna { result:string, details:array }", () => {
  for (const [k, fn] of Object.entries(FORMULAS)) {
    const out = fn(70);
    assert.equal(typeof out.result, "string", `${k}: result`);
    assert.ok(Array.isArray(out.details), `${k}: details`);
  }
});
