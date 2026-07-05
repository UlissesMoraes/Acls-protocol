// ─── FÓRMULAS DE DOSE POR PESO — PEDIÁTRICAS (PALS) ────────────────────────────
// Cada função recebe o peso (kg) e devolve { result, details[] }. Todas aplicam
// os TETOS (doses máximas) do PALS — segurança-crítico, coberto por testes.

const clamp = (v, min, max) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
// Arredonda para no máx `d` casas, removendo zeros à direita ("0.50" → "0,5").
const f = (n, d = 2) => {
  const r = Number(n.toFixed(d));
  return String(r).replace(".", ",");
};

export const FORMULAS_PED = {
  // ── PCR (PALS) ──
  "Adrenalina|pcr_ped": w => {
    const mg = clamp(w * 0.01, null, 1);
    const ml = mg / 0.1; // solução 1:10.000 = 0,1 mg/mL
    return { result: `${f(mg)} mg IV/IO (${f(ml)} mL de 1:10.000)`, details: [
      `0,01 mg/kg × ${f(w,1)} kg = ${f(w*0.01)} mg${w*0.01 > 1 ? " → limitado a 1 mg (máx)" : ""}`,
      `Volume: ${f(ml)} mL da solução 1:10.000 (0,1 mg/mL)`,
      "Repetir a cada 3–5 min",
    ] };
  },
  "Amiodarona|pcr_ped": w => {
    const mg = clamp(w * 5, null, 300);
    return { result: `${f(mg,0)} mg IV/IO em bolus`, details: [
      `5 mg/kg × ${f(w,1)} kg = ${f(w*5,0)} mg${w*5 > 300 ? " → limitado a 300 mg (máx/dose)" : ""}`,
      "Pode repetir até 2× (FV/TV sem pulso refratária)",
    ] };
  },
  "Lidocaína|pcr_ped": w => ({ result: `${f(w*1,0)} mg IV/IO em bolus`, details: [
    `1 mg/kg × ${f(w,1)} kg = ${f(w*1,0)} mg`,
    "Manutenção (se eficaz): 20–50 mcg/kg/min",
  ] }),

  // ── Bradicardia ──
  "Adrenalina|bradicardia_ped": w => {
    const mg = clamp(w * 0.01, null, 1);
    return { result: `${f(mg)} mg IV/IO (${f(mg/0.1)} mL de 1:10.000)`, details: [
      `0,01 mg/kg × ${f(w,1)} kg = ${f(w*0.01)} mg${w*0.01 > 1 ? " → limitado a 1 mg (máx)" : ""}`,
      "Repetir a cada 3–5 min",
    ] };
  },
  "Atropina|bradicardia_ped": w => {
    const mg = clamp(w * 0.02, 0.1, 0.5);
    let nota = "";
    if (w * 0.02 < 0.1) nota = " → elevado ao mínimo de 0,1 mg";
    else if (w * 0.02 > 0.5) nota = " → limitado a 0,5 mg (máx)";
    return { result: `${f(mg)} mg IV/IO`, details: [
      `0,02 mg/kg × ${f(w,1)} kg = ${f(w*0.02)} mg${nota}`,
      "Mín 0,1 mg · máx 0,5 mg · pode repetir 1×",
    ] };
  },

  // ── Taquicardia ──
  "Adenosina|taquicardia_ped": w => {
    const d1 = clamp(w * 0.1, null, 6), d2 = clamp(w * 0.2, null, 12);
    return { result: `1ª: ${f(d1)} mg → 2ª: ${f(d2)} mg IV rápido`, details: [
      `1ª dose: 0,1 mg/kg = ${f(w*0.1)} mg${w*0.1 > 6 ? " → máx 6 mg" : ""}`,
      `2ª dose: 0,2 mg/kg = ${f(w*0.2)} mg${w*0.2 > 12 ? " → máx 12 mg" : ""}`,
      "Bolus ultrarrápido em veia proximal + flush de SF",
    ] };
  },
  "Amiodarona|taquicardia_ped": w => {
    const mg = clamp(w * 5, null, 300);
    return { result: `${f(mg,0)} mg IV em 20–60 min`, details: [
      `5 mg/kg × ${f(w,1)} kg = ${f(w*5,0)} mg${w*5 > 300 ? " → máx 300 mg/dose" : ""}`,
      "TV/TSV COM pulso: infundir lentamente (monitorar PA/QT)",
    ] };
  },

  // ── Choque séptico ──
  "Cristaloide (bolus)|choque_ped": w => ({ result: `${f(w*10,0)}–${f(w*20,0)} mL em bolus`, details: [
    `10 mL/kg = ${f(w*10,0)} mL · 20 mL/kg = ${f(w*20,0)} mL`,
    `Total até 40–60 mL/kg na 1ª hora = ${f(w*40,0)}–${f(w*60,0)} mL, reavaliando`,
    "Cardiopatia/desnutrição/anemia grave: usar 10 mL/kg e reavaliar",
  ] }),
  "Adrenalina (infusão)|choque_ped": w => ({ result: `${f(w*0.05)}–${f(w*0.3)} mcg/min`, details: [
    `0,05–0,3 mcg/kg/min × ${f(w,1)} kg = ${f(w*0.05)}–${f(w*0.3)} mcg/min`,
    "Choque frio · titular pela perfusão",
  ] }),
  "Noradrenalina (infusão)|choque_ped": w => ({ result: `${f(w*0.05)}–${f(w*0.3)} mcg/min`, details: [
    `0,05–0,3 mcg/kg/min × ${f(w,1)} kg = ${f(w*0.05)}–${f(w*0.3)} mcg/min`,
    "Choque quente · titular pela PA/idade",
  ] }),
  "Hidrocortisona|choque_ped": w => {
    const mg = clamp(w * 2, null, 100);
    return { result: `${f(mg,0)} mg IV`, details: [
      `2 mg/kg × ${f(w,1)} kg = ${f(w*2,0)} mg${w*2 > 100 ? " → máx 100 mg" : ""}`,
      "Choque refratário a catecolaminas",
    ] };
  },

  // ── Anafilaxia ──
  "Adrenalina IM|anafilaxia_ped": w => {
    const mg = clamp(w * 0.01, null, 0.5);
    return { result: `${f(mg)} mg IM (${f(mg/1)} mL de 1:1.000)`, details: [
      `0,01 mg/kg × ${f(w,1)} kg = ${f(w*0.01)} mg${w*0.01 > 0.5 ? " → limitado a 0,5 mg (máx)" : ""}`,
      `Volume: ${f(mg/1)} mL da solução 1:1.000 (1 mg/mL)`,
      "Vasto lateral da coxa · repetir a cada 5–15 min",
    ] };
  },
  "Cristaloide (bolus)|anafilaxia_ped": w => ({ result: `${f(w*20,0)} mL em bolus`, details: [
    `20 mL/kg × ${f(w,1)} kg = ${f(w*20,0)} mL`,
    "Repetir se hipotensão/má perfusão persistir",
  ] }),

  // ── Estado de mal epiléptico ──
  "Midazolam|convulsao_ped": w => {
    const im = clamp(w * 0.2, null, 10), iv = w * 0.1;
    return { result: `IM ${f(im)} mg · IV ${f(iv)} mg`, details: [
      `IM/IN: 0,2 mg/kg = ${f(w*0.2)} mg${w*0.2 > 10 ? " → máx 10 mg" : ""}`,
      `IV/IO: 0,1 mg/kg = ${f(iv)} mg`,
    ] };
  },
  "Diazepam|convulsao_ped": w => {
    const mg = clamp(w * 0.3, null, 10);
    return { result: `${f(mg)} mg IV (0,2–0,5 mg/kg)`, details: [
      `0,3 mg/kg × ${f(w,1)} kg = ${f(w*0.3)} mg${w*0.3 > 10 ? " → máx 10 mg" : ""}`,
      `Faixa 0,2–0,5 mg/kg = ${f(w*0.2)}–${f(w*0.5)} mg · retal 0,5 mg/kg`,
    ] };
  },
  "Levetiracetam|convulsao_ped": w => {
    const mg = clamp(w * 60, null, 4500);
    return { result: `${f(mg,0)} mg IV em 15 min`, details: [
      `40–60 mg/kg = ${f(w*40,0)}–${f(w*60,0)} mg${w*60 > 4500 ? " → máx 4.500 mg" : ""}`,
    ] };
  },
  "Fenitoína|convulsao_ped": w => {
    const mg = clamp(w * 20, null, 1500);
    return { result: `${f(mg,0)} mg IV`, details: [
      `20 mg/kg × ${f(w,1)} kg = ${f(w*20,0)} mg${w*20 > 1500 ? " → máx ~1.500 mg" : ""}`,
      "Velocidade ≤ 1 mg/kg/min · diluir em SF (não em glicose)",
    ] };
  },

  // ── CAD pediátrica ──
  "Insulina Regular|cad_ped": w => ({ result: `${f(w*0.05)}–${f(w*0.1)} U/h IV contínua`, details: [
    `0,05–0,1 U/kg/h × ${f(w,1)} kg = ${f(w*0.05)}–${f(w*0.1)} U/h`,
    "SEM bolus de insulina na criança · iniciar 1–2 h após o fluido",
  ] }),
  "Cristaloide (bolus)|cad_ped": w => ({ result: `${f(w*10,0)} mL SF em bolus (se choque)`, details: [
    `10 mL/kg × ${f(w,1)} kg = ${f(w*10,0)} mL`,
    "Evitar bolus repetidos · reposição do déficit lenta (24–48 h)",
  ] }),
};
