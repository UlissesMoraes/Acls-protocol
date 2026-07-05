// ─── CONTEXTO CLÍNICO PARA A IA ───────────────────────────────────────────────
// Condensa os protocolos do app em texto compacto enviado como "fonte oficial".

function protoToText(p) {
  const lines = [];
  lines.push(`### ${p.label} — ${p.cat}`);
  if (p.sub) lines.push(p.sub);

  if (p.cascade?.length) {
    lines.push("Conduta (cascata):");
    for (const s of p.cascade) {
      const items = (s.items || []).join("; ");
      lines.push(`- ${s.phase}${items ? `: ${items}` : ""}`);
      if (s.decision) lines.push(`  • Decisão: ${s.decision.q} → SIM: ${s.decision.yes} | NÃO: ${s.decision.no}`);
    }
  }

  if (p.drugs?.length) {
    lines.push("Medicações:");
    for (const d of p.drugs) {
      const parts = [d.name, d.dose && `dose ${d.dose}`, d.via && `via ${d.via}`, d.dilui && `diluição ${d.dilui}`]
        .filter(Boolean).join(" · ");
      lines.push(`- ${parts}${d.ci ? ` | CI: ${d.ci}` : ""}`);
    }
  }

  if (p.antidotes?.length) {
    lines.push("Antídotos:");
    for (const a of p.antidotes) lines.push(`- ${a.agent} → ${a.antidote} (${a.dose || "ver protocolo"})`);
  }

  return lines.join("\n");
}

export function buildKnowledgeBase(protocols) {
  return (protocols || []).map(protoToText).join("\n\n");
}

export function buildFocusedContext(protocols, focusId) {
  if (!protocols?.length) return "";
  const focus = protocols.find(p => p.id === focusId);
  if (!focus) return buildKnowledgeBase(protocols);
  const others = protocols
    .filter(p => p.id !== focusId)
    .map(p => `- ${p.label} (${p.cat})`)
    .join("\n");
  return `PROTOCOLO EM FOCO:\n${protoToText(focus)}\n\nOUTROS PROTOCOLOS DISPONÍVEIS NO APP:\n${others}`;
}

// ── Narração de RCP ──────────────────────────────────────────────────────────
export function buildRcpLogText({ startTs, durationStr, shocks, epiCount, amioCount, events }) {
  const head = [
    `Início da PCR: ${startTs ? new Date(startTs).toLocaleString("pt-BR") : "—"}`,
    `Duração: ${durationStr}`,
    `Desfibrilações: ${shocks} · Adrenalina (doses): ${epiCount} · Amiodarona (doses): ${amioCount}`,
    "",
    "Linha do tempo (mm:ss — evento):",
  ];
  const body = (events || []).map(e => `${e.tStr} — ${e.label}`);
  return [...head, ...body].join("\n");
}

// ── Debriefing pós-código ────────────────────────────────────────────────────
// Formata o log com contexto de ritmo para análise de aderência ao protocolo.
export function buildDebriefText({ startTs, durationStr, shocks, epiCount, amioCount, rhythm, events }) {
  const lines = [
    `=== LOG DE ATENDIMENTO ===`,
    `Data/hora: ${startTs ? new Date(startTs).toLocaleString("pt-BR") : "—"}`,
    `Duração total: ${durationStr}`,
    `Ritmo inicial: ${rhythm === "shock" ? "CHOCÁVEL (FV/TV sem pulso)" : rhythm === "nonshock" ? "NÃO CHOCÁVEL (AESP/Assistolia)" : "não registrado"}`,
    `Desfibrilações: ${shocks}`,
    `Adrenalina (nº de doses): ${epiCount}`,
    `Amiodarona (nº de doses): ${amioCount}`,
    "",
    "Linha do tempo:",
    ...(events || []).map(e => `  ${e.tStr}  ${e.label}`),
    "",
    "=== FIM DO LOG ===",
    "Analise SOMENTE os dados acima. Não invente eventos não registrados.",
  ];
  return lines.join("\n");
}

// ── Priorizador de 5H/5T ─────────────────────────────────────────────────────
export function buildPrioritizerInput({ k, temp, context, rhythm, elapsed }) {
  const parts = [
    `Contexto da PCR:`,
    `- Ritmo: ${rhythm === "shock" ? "chocável (FV/TV)" : rhythm === "nonshock" ? "não chocável (AESP/Assistolia)" : "não definido"}`,
    `- Duração da PCR até agora: ${elapsed}`,
  ];
  if (k) parts.push(`- Potássio sérico: ${k} mEq/L`);
  if (temp) parts.push(`- Temperatura: ${temp} °C`);
  if (context?.trim()) parts.push(`- Contexto clínico/histórico: ${context.trim()}`);
  parts.push("", "Com base nesses dados, ranqueie as causas reversíveis mais prováveis (5H e 5T).");
  return parts.join("\n");
}
