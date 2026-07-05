// ─── ANALISADOR DE GASOMETRIA ARTERIAL ────────────────────────────────────────
// Função pura (coberta por testes). Interpreta o distúrbio ácido-base primário,
// a compensação esperada, o ânion gap (e HCO₃⁻ corrigido) e a oxigenação.
// Referências: Winter (compensação metabólica), regras de compensação respiratória.

const n = x => {
  const v = parseFloat(String(x ?? "").replace(",", "."));
  return Number.isFinite(v) ? v : null;
};
const r0 = x => Math.round(x);
const r1 = x => Math.round(x * 10) / 10;

export function analyzeGas(inp = {}) {
  const ph = n(inp.ph), pco2 = n(inp.pco2), hco3 = n(inp.hco3);
  const na = n(inp.na), cl = n(inp.cl), pao2 = n(inp.pao2), fio2 = n(inp.fio2), lactato = n(inp.lactato);
  if (ph == null || pco2 == null || hco3 == null) return { valid: false };

  const disorders = [];
  const out = { valid: true, ph, pco2, hco3 };

  // 1. Estado do pH
  const phStatus = ph < 7.35 ? "acidemia" : ph > 7.45 ? "alcalemia" : "normal";
  out.phStatus = phStatus;

  // 2. Distúrbio primário
  let primary = null;
  if (phStatus === "acidemia") {
    if (hco3 < 22) primary = { label: "Acidose metabólica", system: "metabolic", acid: true };
    else if (pco2 > 45) primary = { label: "Acidose respiratória", system: "respiratory", acid: true };
  } else if (phStatus === "alcalemia") {
    if (hco3 > 26) primary = { label: "Alcalose metabólica", system: "metabolic", acid: false };
    else if (pco2 < 35) primary = { label: "Alcalose respiratória", system: "respiratory", acid: false };
  } else {
    // pH normal com HCO₃⁻ e PaCO₂ alterados → distúrbio misto/compensado
    if (hco3 < 22 && pco2 < 35) primary = { label: "Distúrbio misto (acidose metabólica + alcalose respiratória) ou compensado", system: "metabolic", acid: true, mixed: true };
    else if (hco3 > 26 && pco2 > 45) primary = { label: "Distúrbio misto (alcalose metabólica + acidose respiratória) ou compensado", system: "metabolic", acid: false, mixed: true };
  }
  out.primary = primary;
  if (primary) disorders.push(primary.label);

  // 3. Compensação esperada + distúrbio concomitante
  let compensation = null;
  if (primary && !primary.mixed) {
    if (primary.system === "metabolic" && primary.acid) {
      const exp = 1.5 * hco3 + 8, lo = exp - 2, hi = exp + 2; // Winter
      if (pco2 > hi) { compensation = { text: `PaCO₂ acima do esperado (Winter ${r0(lo)}–${r0(hi)}) → acidose respiratória concomitante` }; disorders.push("Acidose respiratória associada"); }
      else if (pco2 < lo) { compensation = { text: `PaCO₂ abaixo do esperado (Winter ${r0(lo)}–${r0(hi)}) → alcalose respiratória concomitante` }; disorders.push("Alcalose respiratória associada"); }
      else compensation = { adequate: true, text: `Compensação respiratória adequada (PaCO₂ esperado ${r0(lo)}–${r0(hi)} — Winter)` };
    } else if (primary.system === "metabolic" && !primary.acid) {
      const exp = 0.7 * hco3 + 21, lo = exp - 5, hi = exp + 5;
      if (pco2 < lo) { compensation = { text: `PaCO₂ abaixo do esperado (${r0(lo)}–${r0(hi)}) → alcalose respiratória concomitante` }; disorders.push("Alcalose respiratória associada"); }
      else if (pco2 > hi) { compensation = { text: `PaCO₂ acima do esperado (${r0(lo)}–${r0(hi)}) → acidose respiratória concomitante` }; disorders.push("Acidose respiratória associada"); }
      else compensation = { adequate: true, text: `Compensação respiratória adequada (PaCO₂ esperado ${r0(lo)}–${r0(hi)})` };
    } else if (primary.system === "respiratory") {
      const d = (pco2 - 40) / 10;
      const acute = 24 + (primary.acid ? 1 : 2) * d;
      const chronic = 24 + (primary.acid ? 4 : 5) * d;
      compensation = { text: `HCO₃⁻ esperado: agudo ≈ ${r0(acute)} · crônico ≈ ${r0(chronic)} (compare com ${r0(hco3)} para agudo vs crônico e distúrbio metabólico associado)` };
    }
  }
  out.compensation = compensation;

  // 4. Ânion gap (+ HCO₃⁻ corrigido)
  if (na != null && cl != null) {
    const ag = na - (cl + hco3);
    const high = ag > 12;
    out.anionGap = { value: r1(ag), high, text: high
      ? `Ânion gap ALTO (${r1(ag)}) → acidose metabólica com AG elevado (GOLD MARK: lactato, cetoacidose, uremia, tóxicos, metanol/etilenoglicol)`
      : ag < 8 ? `Ânion gap baixo (${r1(ag)}) — hipoalbuminemia, paraproteinemia` : `Ânion gap normal (${r1(ag)})` };
    if (high) {
      disorders.push("Acidose metabólica com AG elevado");
      const corr = hco3 + (ag - 12);
      out.correctedHco3 = { value: r1(corr), text: corr > 26
        ? `HCO₃⁻ corrigido ${r1(corr)} > 26 → alcalose metabólica associada`
        : corr < 22 ? `HCO₃⁻ corrigido ${r1(corr)} < 22 → acidose metabólica hiperclorêmica (sem AG) associada`
        : `HCO₃⁻ corrigido ${r1(corr)} normal` };
      if (corr > 26) disorders.push("Alcalose metabólica associada");
      else if (corr < 22) disorders.push("Acidose metabólica hiperclorêmica associada");
    }
  }

  // 5. Oxigenação
  if (pao2 != null) {
    const hypox = pao2 < 60;
    let pf = null, tail = "";
    if (fio2 != null && fio2 > 0) {
      const f = fio2 > 1 ? fio2 / 100 : fio2;
      pf = pao2 / f;
      tail = ` · PaO₂/FiO₂ = ${r0(pf)}${pf < 100 ? " (SDRA grave)" : pf < 200 ? " (SDRA moderada)" : pf <= 300 ? " (SDRA leve / lesão pulmonar aguda)" : ""}`;
    }
    out.oxygenation = { pfRatio: pf == null ? null : r0(pf), hypoxemia: hypox, text: `${hypox ? `Hipoxemia (PaO₂ ${r0(pao2)} < 60)` : `PaO₂ ${r0(pao2)} mmHg`}${tail}` };
  }

  if (lactato != null) { out.lactato = lactato; if (lactato > 2) disorders.push(`Hiperlactatemia (${lactato} mmol/L)`); }

  out.disorders = disorders;
  out.conclusion = disorders.length ? disorders.join(" + ") : (phStatus === "normal" ? "Gasometria dentro da normalidade" : "Distúrbio ácido-base");
  return out;
}
