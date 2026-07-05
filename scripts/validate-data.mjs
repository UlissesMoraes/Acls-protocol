// Validação de integridade dos dados clínicos.
// Roda no CI / pré-commit: um campo faltando quebraria a renderização em runtime.
import { P, CATS } from "../src/data/protocols.js";
import { P_PED, CATS_PED } from "../src/data/protocolsPed.js";
import { SCORES_DEF } from "../src/data/scores.js";
import { FORMULAS } from "../src/data/formulas.js";
import { FORMULAS_PED } from "../src/data/formulasPed.js";
import { TOOL_GROUPS } from "../src/data/tools.js";
import { PROCEDURES } from "../src/data/procedures.js";

let errors = 0;
const fail = msg => { console.error("  ✗ " + msg); errors++; };

const scoreKeys = new Set(Object.keys(SCORES_DEF));

// Valida um conjunto de protocolos (adulto ou pediátrico) contra o mesmo schema.
function validateProtocols(list, cats, tag) {
  const ids = new Set();
  for (const p of list) {
    const where = `protocolo ${tag} "${p.id || "?"}"`;
    for (const f of ["id", "label", "icon", "cat", "color", "light", "border", "sub"])
      if (!p[f]) fail(`${where}: campo obrigatório "${f}" ausente`);
    if (ids.has(p.id)) fail(`${where}: id duplicado`);
    ids.add(p.id);
    if (!cats.includes(p.cat)) fail(`${where}: categoria "${p.cat}" não está em CATS`);

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
  return ids;
}

const protoIds = validateProtocols(P, CATS, "adulto");
const protoIdsPed = validateProtocols(P_PED, CATS_PED, "ped");

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
function validateFormulas(formulas, list, probeWeight, tag) {
  const drugKeys = new Set(list.flatMap(p => p.drugs.map(d => `${d.name}|${p.id}`)));
  for (const key of Object.keys(formulas)) {
    if (!drugKeys.has(key)) fail(`fórmula ${tag} "${key}": nenhum fármaco correspondente`);
    if (typeof formulas[key] !== "function") { fail(`fórmula ${tag} "${key}": não é função`); continue; }
    const out = formulas[key](probeWeight);
    if (!out || !out.result || !Array.isArray(out.details))
      fail(`fórmula ${tag} "${key}": retorno deve ter { result, details[] }`);
  }
}
validateFormulas(FORMULAS, P, 70, "adulto");
validateFormulas(FORMULAS_PED, P_PED, 15, "ped");

// ── Procedimentos (3D) ──
const SCENE_KEYS = new Set(["io", "intub", "thorax", "rcp"]);
const procIds = new Set();
for (const p of PROCEDURES) {
  const where = `procedimento "${p.id || "?"}"`;
  for (const f of ["id", "label", "cat", "color", "scene", "sub"])
    if (!p[f]) fail(`${where}: campo "${f}" ausente`);
  if (procIds.has(p.id)) fail(`${where}: id duplicado`);
  procIds.add(p.id);
  if (!SCENE_KEYS.has(p.scene)) fail(`${where}: cena 3D "${p.scene}" sem componente correspondente`);
  if (!Array.isArray(p.steps) || !p.steps.length) fail(`${where}: "steps" vazio`);
  for (const [i, s] of (p.steps || []).entries())
    if (!s.t || !s.d) fail(`${where} passo[${i}]: faltando título/descrição`);
  for (const f of ["indications", "contra", "materials", "complications"])
    if (!Array.isArray(p[f]) || !p[f].length) fail(`${where}: "${f}" vazio`);
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
console.log(`✅ Dados válidos — ${P.length} protocolos adultos + ${P_PED.length} pediátricos, ${scoreKeys.size} escores, ${Object.keys(FORMULAS).length + Object.keys(FORMULAS_PED).length} fórmulas, ${PROCEDURES.length} procedimentos 3D.`);
