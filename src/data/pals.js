// Regras determinísticas do algoritmo de PCR PEDIÁTRICA (PALS 2020/2025).
// Doses por kg com tetos. Mantidas separadas da UI e cobertas por testes.

const fmtNum = (n, d = 2) => String(Number(n.toFixed(d))).replace(".", ",");
const clamp = (v, max) => Math.min(max ?? Infinity, v);

// Medicação devida no ciclo que SEGUE o choque nº n (ritmo chocável), por peso.
//  • choque par (≥2) → Adrenalina 0,01 mg/kg (máx 1 mg)
//  • 3º choque       → Amiodarona 5 mg/kg (máx 300 mg) — 1ª dose
//  • 5º choque       → Amiodarona 5 mg/kg (máx 300 mg) — 2ª dose
export function shockableMedPed(n, w) {
  const hasW = typeof w === "number" && w > 0;
  if (n === 3 || n === 5) {
    const mg = hasW ? clamp(w * 5, 300) : null;
    return { key: n === 3 ? "amio300" : "amio150", drug: "Amiodarona",
      label: hasW ? `Amiodarona ${fmtNum(mg, 0)} mg` : "Amiodarona 5 mg/kg (informe o peso)" };
  }
  if (n >= 2 && n % 2 === 0) {
    const mg = hasW ? clamp(w * 0.01, 1) : null;
    return { key: "epi", drug: "Adrenalina",
      label: hasW ? `Adrenalina ${fmtNum(mg)} mg` : "Adrenalina 0,01 mg/kg (informe o peso)" };
  }
  return null;
}

// Adrenalina pediátrica (ritmo não chocável / cadência), por peso.
export function epiMedPed(w) {
  const hasW = typeof w === "number" && w > 0;
  const mg = hasW ? clamp(w * 0.01, 1) : null;
  return { key: "epi", drug: "Adrenalina",
    label: hasW ? `Adrenalina ${fmtNum(mg)} mg` : "Adrenalina 0,01 mg/kg (informe o peso)" };
}

// Energia da desfibrilação pediátrica para o choque nº `shockNumber` (1-based), por peso.
//  • 1º choque: 2 J/kg · 2º+: 4 J/kg · teto 10 J/kg, sem exceder a dose adulto (200 J).
export function palsEnergy(shockNumber, w) {
  const jPerKg = shockNumber <= 1 ? 2 : 4;
  if (!(typeof w === "number" && w > 0)) return { jPerKg, joules: null };
  const joules = Math.min(Math.round(jPerKg * w), 10 * w, 200);
  return { jPerKg, joules: Math.round(joules) };
}

// Causas reversíveis (PALS enfatiza hipoglicemia).
export const H6_PED = [
  "Hipovolemia",
  "Hipóxia",
  "Hidrogênio (acidose)",
  "Hipo/Hipercalemia e distúrbios metabólicos",
  "Hipoglicemia",
  "Hipotermia",
];
export const T6_PED = [
  "Tamponamento cardíaco",
  "Tensão no tórax (pneumotórax hipertensivo)",
  "Trombose pulmonar (TEP)",
  "Trombose coronária (raro na criança)",
  "Toxinas",
];

// Orientação ventilatória pediátrica conforme a via aérea.
export function ventilationPed(airway) {
  return airway === "advanced"
    ? { txt: "1 ventilação a cada 2–3 s (20–30/min) com compressões contínuas", sub: "Via aérea avançada — não pausar as compressões" }
    : { txt: "15:2 (2 socorristas) · 30:2 (1 socorrista)", sub: "Pausar compressões para as ventilações" };
}

// Estimativa de peso por idade (fórmulas APLS) — usada quando o peso é desconhecido.
//  • 0–12 meses: (idade_meses ÷ 2) + 4
//  • 1–5 anos:   (idade_anos × 2) + 8
//  • 6–12 anos:  (idade_anos × 3) + 7
export function weightFromAge({ years = 0, months = 0 }) {
  const totalMonths = years * 12 + months;
  if (totalMonths <= 0) return null;
  if (totalMonths < 12) return +( (totalMonths / 2) + 4 ).toFixed(1);
  const y = totalMonths / 12;
  if (y <= 5) return +( (y * 2) + 8 ).toFixed(1);
  if (y <= 12) return +( (y * 3) + 7 ).toFixed(1);
  return null; // > 12 anos: usar peso real / dose adulto
}
