// ─── INTEGRAÇÃO: ANÁLISE → PROTOCOLOS E ESCORES DO APP ────────────────────────
// A partir dos apontamentos da análise (hipóteses, red flags, conduta, CID),
// sugere o protocolo e os escores correspondentes do app para abrir com 1 toque.

const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Padrões em texto SEM acento (a busca é feita sobre o texto normalizado).
const RULES = [
  { re: /sepse|septic|choque septico/, protocol: "sepse", scores: ["qsofa", "sofa"] },
  { re: /\bavc\b|acidente vascular|isquemic cerebral|hemorragia cerebral|deficit neurol|hemipares/, protocol: "avc", scores: ["nihss", "gcs"] },
  { re: /infarto|\biam\b|sindrome coronarian|\bsca\b|supra de st|angina|dor toracica/, protocol: "iamcssst", scores: ["heart", "grace"] },
  { re: /anafilaxia|asma|broncoespasmo|edema de glote|urticaria com/, protocol: "amax4", scores: [] },
  { re: /taquicardi|taquiarritmia|fibrilacao atrial|flutter|\btsv\b/, protocol: "taquiarritmias", scores: ["chadsvasc", "hasbled"] },
  { re: /bradicardi|bloqueio av|\bbav\b/, protocol: "bradiarritmias", scores: [] },
  { re: /parada cardiorrespirat|\bpcr\b|assistolia|fibrilacao ventricular|\baesp\b/, protocol: "pcr", scores: [] },
  { re: /cetoacidose|\bcad\b/, protocol: "cad", scores: [] },
  { re: /hiperosmolar|\behh\b|\bhhns\b/, protocol: "hhns", scores: [] },
  { re: /convuls|epileptic|estado de mal/, protocol: "convulsoes", scores: [] },
  { re: /intoxica|envenenamento|overdose|abstinencia/, protocol: "intoxicacoes", scores: [] },
  { re: /hipertens|pressao alta|crise hipertensiv|emergencia hipertensiv/, protocol: "hipertensao", scores: [] },
  { re: /\btep\b|embolia pulmonar|tromboembolismo|trombose venosa|\btvp\b/, protocol: null, scores: ["wells"] },
  { re: /eletrolit|hipercalemia|hipocalemia|hiponatremia|hipernatremia|hipocalcemia|hipercalcemia/, protocol: "hidroeletroliticos", scores: [] },
  { re: /intuba|via aerea|sequencia rapida|insuficiencia respiratoria/, protocol: "iot", scores: [] },
  { re: /\bqt\b|qt longo|torsades|prolongamento do qt/, protocol: null, scores: ["qtc"] },
];

// Rótulos curtos dos escores (estáveis).
export const SCORE_SHORT = {
  qsofa: "qSOFA", sofa: "SOFA", heart: "HEART", grace: "GRACE", nihss: "NIHSS",
  gcs: "Glasgow", wells: "Wells (TEP)", chadsvasc: "CHA₂DS₂-VASc", hasbled: "HAS-BLED", qtc: "QTc",
};

export function suggestLinks(parsed) {
  if (!parsed) return { protocolIds: [], scoreIds: [] };
  const hay = norm([
    ...(parsed.hipoteses || []),
    ...(parsed.redFlags || []),
    ...(parsed.conduta || []),
    ...((parsed.cid || []).map(c => c.desc || "")),
  ].join("  \n  "));

  const protocolIds = [], scoreIds = [];
  for (const r of RULES) {
    if (!r.re.test(hay)) continue;
    if (r.protocol && !protocolIds.includes(r.protocol)) protocolIds.push(r.protocol);
    for (const s of r.scores) if (!scoreIds.includes(s)) scoreIds.push(s);
  }
  return { protocolIds, scoreIds };
}
