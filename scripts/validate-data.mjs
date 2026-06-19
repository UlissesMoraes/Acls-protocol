// Validação de integridade dos dados clínicos.
// Roda no CI / pré-commit: um campo faltando quebraria a renderização em runtime.
import { P, CATS } from "../src/data/protocols.js";
import { SCORES_DEF } from "../src/data/scores.js";
import { FORMULAS } from "../src/data/formulas.js";
import { TOOL_GROUPS } from "../src/data/tools.js";

let errors = 0;
const fail = msg => { console.error("  ✗ " + msg); errors++; };

const scoreKeys = new Set(Object.keys(SCORES_DEF));
const protoIds = new Set();

// ── Protocolos ──
for (const p of P) {
  const where = `protocolo "${p.id || "?"}"`;
  for (const f of ["id", "label", "icon", "cat", "color", "light", "border", "sub"])
    if (!p[f]) fail(`${where}: campo obrigatório "${f}" ausente`);
  if (protoIds.has(p.id)) fail(`${where}: id duplicado`);
  protoIds.add(p.id);
  if (!CATS.includes(p.cat)) fail(`${where}: categoria "${p.cat}" não está em CATS`);

  for (const [i, s] of (p.cascade || []).entries()) {
    if (typeof s.step !== "number") fail(`${where} cascata[${i}]: "step" inválido`);
    if (!s.phase) fail(`${where} cascata[${i}]: "phase" ausente`);
    if (!Array.isArray(s.items)) fail(`${where} cascata[${i}]: "items" não é array`);
    if (s.decision && (!s.decision.q || s.decision.yes === undefined || s.decision.no === undefined))
      fail(`${where} cascata[${i}]: decisão incompleta`);
  }
  for (const [i, d] of (p.drugs || []).entries())
    for (const f of ["name", "cat", "dose", "via", "ind", "ci"])
      if (!d[f]) fail(`${where} fármaco[${i}] (${d.name || "?"}): "${f}" ausente`);
  for (const [i, a] of (p.antidotes || []).entries())
    for (const f of ["agent", "antidote", "dose", "notes"])
      if (!a[f]) fail(`${where} antídoto[${i}]: "${f}" ausente`);
  for (const sk of (p.scores || []))
    if (!scoreKeys.has(sk)) fail(`${where}: escore "${sk}" não existe em SCORES_DEF`);
}

// ── Escores ──
for (const [k, sc] of Object.entries(SCORES_DEF)) {
  const where = `escore "${k}"`;
  for (const f of ["label", "sub", "type", "interp"])
    if (!sc[f]) fail(`${where}: campo "${f}" ausente`);
  if (typeof sc.interp !== "function") { fail(`${where}: interp não é função`); continue; }
  // interp deve retornar um objeto com label/color/bg/text para entradas plausíveis
  const probe = sc.type === "calc" || sc.type === "grace_calc"
    ? sc.interp(0) : sc.interp(0);
  for (const f of ["label", "color", "bg", "text"])
    if (!probe || probe[f] === undefined) fail(`${where}: interp() não retorna "${f}"`);
  if ((sc.type === "calc") && typeof sc.formula !== "function") fail(`${where}: calc sem formula()`);
  if ((sc.type === "grace_calc") && typeof sc.calcPoints !== "function") fail(`${where}: grace_calc sem calcPoints()`);
}

// ── Fórmulas de dose: a chave "Nome|protocolo" deve casar com um fármaco real ──
const drugKeys = new Set(P.flatMap(p => p.drugs.map(d => `${d.name}|${p.id}`)));
for (const key of Object.keys(FORMULAS)) {
  if (!drugKeys.has(key)) fail(`fórmula "${key}": nenhum fármaco correspondente em protocols.js`);
  if (typeof FORMULAS[key] !== "function") { fail(`fórmula "${key}": não é função`); continue; }
  const out = FORMULAS[key](70);
  if (!out || !out.result || !Array.isArray(out.details))
    fail(`fórmula "${key}": retorno deve ter { result, details[] }`);
}

// ── Catálogo de ferramentas ──
for (const g of TOOL_GROUPS)
  for (const it of g.items)
    if (it.kind === "score" && !scoreKeys.has(it.id))
      fail(`ferramentas: escore "${it.id}" do grupo "${g.cat}" não existe`);

if (errors) {
  console.error(`\n❌ Validação de dados falhou — ${errors} problema(s).`);
  process.exit(1);
}
console.log(`✅ Dados válidos — ${P.length} protocolos, ${scoreKeys.size} escores, ${Object.keys(FORMULAS).length} fórmulas.`);
