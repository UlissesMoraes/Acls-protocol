// ─── PARSER DA ANÁLISE → APONTAMENTOS VISUAIS ─────────────────────────────────
// Converte o Markdown estruturado da análise (cabeçalhos fixos do system prompt)
// em dados que o app renderiza como cards visuais (alertas, hipóteses, CID-10,
// conduta, pendências, exames). Robusto a emoji/acentos nos títulos.

const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const clean = s => (s || "").replace(/^[\s\-•\d.]+/, "").replace(/\*\*/g, "").replace(/`/g, "").trim();

export function parseAnamnese(md) {
  const out = {
    identificacao: [], hma: [], antecedentes: [], revisao: [],
    redFlags: [], hipoteses: [], cid: [], exames: [], conduta: [], pendencias: [],
  };
  if (!md) return out;

  const sections = [];
  let cur = null;
  for (const raw of md.split("\n")) {
    const h = /^#{1,4}\s+(.*)/.exec(raw.trim());
    if (h) { cur = { title: h[1], lines: [] }; sections.push(cur); }
    else if (cur) cur.lines.push(raw);
  }

  const itemsOf = sec => {
    const bullets = sec.lines.filter(l => /^\s*[-•]/.test(l) || /^\s*\d+\.\s/.test(l)).map(clean).filter(Boolean);
    if (bullets.length) return bullets;
    return sec.lines.map(clean).filter(Boolean);
  };

  for (const sec of sections) {
    const t = norm(sec.title);
    if (t.includes("alarme") || t.includes("red flag")) out.redFlags = itemsOf(sec);
    else if (t.includes("identifica") || t.includes("queixa")) out.identificacao = itemsOf(sec);
    else if (t.includes("molestia") || t.includes("hma") || t.includes("historia da")) out.hma = itemsOf(sec);
    else if (t.includes("antecedent") || t.includes("medicac") || t.includes("alergia")) out.antecedentes = itemsOf(sec);
    else if (t.includes("revisao")) out.revisao = itemsOf(sec);
    else if (t.includes("hipotese")) out.hipoteses = itemsOf(sec);
    else if (t.includes("cid")) {
      for (const it of itemsOf(sec)) {
        const m = it.match(/\b[A-TV-Z]\d{2}(?:\.\d)?\b/);
        if (m) out.cid.push({ code: m[0], desc: it.replace(m[0], "").replace(/^[\s—\-:()]+/, "").trim() });
      }
    }
    else if (t.includes("exame")) out.exames = itemsOf(sec);
    else if (t.includes("conduta") || t.includes("plano")) out.conduta = itemsOf(sec);
    else if (t.includes("pendencia") || t.includes("esclarecer")) out.pendencias = itemsOf(sec);
  }
  return out;
}

// Nome curto da hipótese para o chip (antes de "—", "-" ou ":").
export const shortHip = s => clean(s).split(/\s+[—–-]\s+|:\s+/)[0].slice(0, 60);

export const hasApontamentos = d =>
  !!(d && (d.redFlags.length || d.hipoteses.length || d.cid.length || d.conduta.length || d.pendencias.length || d.exames.length));

// Monta o SOAP a partir das seções já extraídas (derivado — sem chamada à IA).
const VITALS = /\b(pa|press[aã]o|fc|fr|sat|satura|temperatura|tax|febr|afebr|glicemia|glasgow|exame f|ausculta|murm[uú]rio|abdome|pupil|edema|ictus)\b/i;
export function buildSoap(p) {
  if (!p) return { S: [], O: [], A: [], alarms: [], P: [] };
  const S = [...p.identificacao, ...p.hma, ...p.antecedentes, ...p.revisao];
  const pool = [...p.hma, ...p.revisao, ...p.antecedentes, ...p.conduta, ...p.redFlags];
  const O = pool.filter(t => VITALS.test(t));
  const A = [...p.hipoteses, ...p.cid.map(c => `${c.code}${c.desc ? " — " + c.desc : ""}`)];
  const P = [
    ...p.conduta,
    ...p.exames.map(e => `Solicitar: ${e}`),
    ...p.pendencias.map(q => `Esclarecer: ${q}`),
  ];
  return { S, O, A, alarms: p.redFlags, P };
}

export const hasSoap = s => !!(s && (s.S.length || s.O.length || s.A.length || s.P.length));
