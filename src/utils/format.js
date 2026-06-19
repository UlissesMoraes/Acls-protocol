// Utilidades de parsing numérico tolerantes ao formato pt-BR (vírgula decimal).
// Um médico digita "1,4" — parseFloat puro retorna 1 e corrompe o cálculo.

export const toNum = v => {
  if (v === null || v === undefined || v === "") return NaN;
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isNaN(n) ? NaN : n;
};

// Normaliza todos os valores string de um objeto (vírgula → ponto) antes de
// entregá-los às fórmulas de escore, que usam parseFloat/parseInt internamente.
export const normVals = obj => {
  const out = {};
  for (const k in obj) {
    const v = obj[k];
    out[k] = typeof v === "string" ? v.replace(",", ".") : v;
  }
  return out;
};

// Remove acentos e baixa a caixa para busca tolerante (ex: "amiodarona" = "amiodaróna").
export const deburr = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Sinônimos clínicos comuns — o termo digitado é expandido para também buscar os equivalentes.
const SYNONYMS = {
  adrenalina: ["epinefrina"], epinefrina: ["adrenalina"],
  noradrenalina: ["norepinefrina"], norepinefrina: ["noradrenalina"],
  avc: ["acidente vascular", "derrame", "stroke"],
  iam: ["infarto", "infarto agudo do miocardio"], infarto: ["iam"],
  pcr: ["parada", "parada cardiorrespiratoria", "rcp"],
  cad: ["cetoacidose"], ehh: ["estado hiperosmolar", "hiperosmolar"],
  tep: ["embolia pulmonar", "tromboembolismo"],
  fa: ["fibrilacao atrial"],
  vaso: ["vasoativa", "vasopressor", "droga vasoativa"],
  taqui: ["taquicardia", "taquiarritmia"], bradi: ["bradicardia", "bradiarritmia"],
};

// Gera a lista de termos a casar a partir da query (já deburrada).
export const expandQuery = q => {
  const base = deburr(q).trim();
  if (!base) return [];
  const extra = SYNONYMS[base] || [];
  return [base, ...extra.map(deburr)];
};
