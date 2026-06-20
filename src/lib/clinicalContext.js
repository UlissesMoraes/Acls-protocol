// ─── CONTEXTO CLÍNICO PARA A IA ───────────────────────────────────────────────
// Condensa os protocolos do app em texto compacto, enviado como "fonte oficial"
// para ancorar as respostas da IA (padrão RAG simples — a base é o próprio app).

// Resumo de UM protocolo, em texto enxuto.
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

// Base de conhecimento completa (todos os protocolos).
export function buildKnowledgeBase(protocols) {
  return (protocols || []).map(protoToText).join("\n\n");
}

// Contexto focado: o protocolo atual em destaque + índice dos demais (economiza tokens).
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

// ── Narração de RCP: transforma o estado/log do Copiloto em texto estruturado ──
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
