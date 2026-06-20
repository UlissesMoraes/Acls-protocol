import { test } from "node:test";
import assert from "node:assert/strict";
import { shockableMed, H5, T5, ventilation } from "../src/data/acls.js";

test("Sequência de medicação no ritmo CHOCÁVEL (ACLS)", () => {
  // n = nº do choque já aplicado; medicação do ciclo de RCP que o segue
  assert.equal(shockableMed(1), null, "após 1º choque: sem medicação");
  assert.equal(shockableMed(2).label, "Adrenalina 1 mg", "após 2º choque: adrenalina");
  assert.equal(shockableMed(3).label, "Amiodarona 300 mg", "após 3º choque: amio 300");
  assert.equal(shockableMed(4).label, "Adrenalina 1 mg", "após 4º choque: adrenalina");
  assert.equal(shockableMed(5).label, "Amiodarona 150 mg", "após 5º choque: amio 150");
  assert.equal(shockableMed(6).label, "Adrenalina 1 mg", "após 6º choque: adrenalina");
  assert.equal(shockableMed(7), null, "após 7º choque: sem nova amiodarona");
  assert.equal(shockableMed(8).label, "Adrenalina 1 mg", "após 8º choque: adrenalina");
});

test("Amiodarona não passa de duas doses (300 + 150)", () => {
  const labels = [];
  for (let n = 1; n <= 12; n++) { const m = shockableMed(n); if (m && m.drug === "Amiodarona") labels.push(m.label); }
  assert.deepEqual(labels, ["Amiodarona 300 mg", "Amiodarona 150 mg"]);
});

test("Adrenalina entra só a partir do 2º choque e em choques pares", () => {
  for (let n = 1; n <= 10; n++) {
    const m = shockableMed(n);
    const isEpi = !!(m && m.key === "epi");
    assert.equal(isEpi, n >= 2 && n % 2 === 0, `choque ${n}`);
  }
});

test("Causas reversíveis = 5H e 5T", () => {
  assert.equal(H5.length, 5);
  assert.equal(T5.length, 5);
  assert.ok(H5.includes("Hipovolemia") && H5.includes("Hipotermia"));
  assert.ok(T5.includes("Tamponamento cardíaco") && T5.includes("Toxinas"));
});

test("Ventilação muda com a via aérea avançada", () => {
  assert.match(ventilation("basic").txt, /30 compress/i);
  assert.match(ventilation("advanced").txt, /cont[ií]nuas.*6 s/i);
});
