// ─── CATÁLOGO DE FERRAMENTAS ──────────────────────────────────────────────────
// Agrupa as ferramentas de beira-leito e os escores clínicos por área.
// Os rótulos dos escores são lidos de SCORES_DEF no momento da renderização.

export const TOOL_GROUPS = [
  {
    cat: "Fluxo crítico",
    color: "#C53030", light: "#FDEDEC", border: "#E74C3C",
    items: [
      { id: "code", kind: "code", label: "Copiloto de RCP — ACLS", sub: "Guia passo a passo, ciclos de 2 min, medicações por ritmo e 5H/5T" },
    ],
  },
  {
    cat: "Inteligência",
    color: "#7C3AED", light: "#F3EEFD", border: "#7C3AED",
    items: [
      { id: "assistant", kind: "assistant", label: "Copiloto Clínico (IA)", sub: "Tire dúvidas de conduta, peça o porquê dos passos e calcule doses conversando — por voz ou texto" },
    ],
  },
  {
    cat: "Beira-leito",
    color: "#0E7490", light: "#ECFEFF", border: "#0891B2",
    items: [
      { id: "infusion", kind: "infusion", label: "Bomba de Infusão", sub: "Conversão dose ↔ mL/h · vasoativos, sedação e insulina" },
    ],
  },
  {
    cat: "Cardiovascular",
    color: "#1A5276", light: "#EBF5FB", border: "#2980B9",
    items: [
      { id: "grace",     kind: "score" },
      { id: "chadsvasc", kind: "score" },
      { id: "hasbled",   kind: "score" },
      { id: "heart",     kind: "score" },
      { id: "qtc",       kind: "score" },
    ],
  },
  {
    cat: "Neurologia",
    color: "#4A235A", light: "#F5EEF8", border: "#8E44AD",
    items: [
      { id: "nihss", kind: "score" },
      { id: "gcs",   kind: "score" },
    ],
  },
  {
    cat: "Sepse / UTI",
    color: "#1E8449", light: "#E9F7EF", border: "#27AE60",
    items: [
      { id: "qsofa", kind: "score" },
      { id: "sofa",  kind: "score" },
      { id: "clcr",  kind: "score" },
    ],
  },
  {
    cat: "Pneumologia / Trombose",
    color: "#0F766E", light: "#F0FDFA", border: "#14B8A6",
    items: [
      { id: "wells", kind: "score" },
    ],
  },
  {
    cat: "Metabólico / Eletrólitos",
    color: "#7D6608", light: "#FEF9E7", border: "#D4AC0D",
    items: [
      { id: "osm",      kind: "score" },
      { id: "nacorr",   kind: "score" },
      { id: "cacorr",   kind: "score" },
      { id: "aniongap", kind: "score" },
      { id: "h2odef",   kind: "score" },
      { id: "kdef",     kind: "score" },
    ],
  },
];
