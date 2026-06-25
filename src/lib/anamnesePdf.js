// ─── EXPORTAÇÃO DA ANAMNESE EM PDF ────────────────────────────────────────────
// Monta um documento clínico bem formatado e o envia para o motor de impressão do
// navegador (→ "Salvar como PDF"). Suporta todo o Unicode (emojis, símbolos,
// acentos), gera texto vetorial nítido e funciona offline — sem dependências.

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inlineMd = s => esc(s)
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/`([^`]+)`/g, "<code>$1</code>");

function mdToHtml(md) {
  const lines = String(md || "").split("\n");
  let html = "", inList = false;
  const close = () => { if (inList) { html += "</ul>"; inList = false; } };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const h = /^#{1,4}\s+(.*)/.exec(line);
    const b = /^[-•]\s+(.*)/.exec(line);
    const num = /^\d+\.\s+(.*)/.exec(line);
    if (h) { close(); html += `<h2>${inlineMd(h[1])}</h2>`; }
    else if (b || num) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inlineMd((b || num)[1])}</li>`; }
    else if (line.trim() === "") { close(); }
    else { close(); html += `<p>${inlineMd(line)}</p>`; }
  }
  close();
  return html;
}

export function exportAnamnesePDF({ analysis, transcript, idade, sexo, nota }) {
  let dateStr = "";
  try { dateStr = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch {}

  const ctx = [
    idade && `<b>Idade:</b> ${esc(idade)}`,
    sexo && `<b>Sexo:</b> ${esc(sexo)}`,
    nota && nota.trim() && `<b>Observações:</b> ${esc(nota.trim())}`,
  ].filter(Boolean).join(" &nbsp;·&nbsp; ") || "<span class='muted'>Sem dados de contexto informados.</span>";

  const transcriptHtml = transcript && transcript.trim()
    ? `<div class="appendix"><h2>Transcrição (registro)</h2><div class="transcript">${esc(transcript.trim())}</div></div>`
    : "";

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Anamnese Clínica</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color:#1a202c; font-size:11.5px; line-height:1.55; margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .header { border-bottom:3px solid #9D174D; padding-bottom:10px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:flex-end; gap:16px; }
  .header h1 { color:#9D174D; font-size:21px; margin:0; letter-spacing:-.3px; }
  .header .sub { color:#718096; font-size:10.5px; margin-top:2px; }
  .header .date { color:#4a5568; font-size:10.5px; text-align:right; white-space:nowrap; }
  .ctx { background:#FDF2F8; border:1px solid #F3C7DA; border-radius:8px; padding:9px 12px; margin:0 0 14px; font-size:11px; color:#3b2230; }
  h2 { color:#9D174D; font-size:13px; margin:15px 0 5px; padding-bottom:3px; border-bottom:1px solid #eee; page-break-after:avoid; }
  ul { margin:4px 0 9px; padding-left:18px; }
  li { margin-bottom:3px; }
  p { margin:4px 0; }
  code { background:#f1f1f4; padding:1px 4px; border-radius:3px; font-size:.94em; }
  .muted { color:#a0aec0; }
  .appendix { margin-top:20px; padding-top:10px; border-top:1px dashed #cbd5e0; page-break-inside:avoid; }
  .appendix h2 { color:#4a5568; border:none; }
  .transcript { white-space:pre-wrap; background:#f7f7f9; border:1px solid #edf0f4; border-radius:6px; padding:10px 12px; font-size:10.5px; color:#2d3748; }
  .foot { margin-top:22px; padding-top:9px; border-top:1px solid #e2e8f0; color:#718096; font-size:9px; text-align:center; line-height:1.5; }
  .foot b { color:#4a5568; }
</style></head>
<body>
  <div class="header">
    <div><h1>Anamnese Clínica</h1><div class="sub">Documento gerado com apoio de IA — apoio à decisão</div></div>
    <div class="date">${esc(dateStr)}</div>
  </div>
  <div class="ctx">${ctx}</div>
  ${mdToHtml(analysis)}
  ${transcriptHtml}
  <div class="foot">
    ⚠️ Documento gerado por IA a partir de transcrição — revisar e validar antes de registrar em prontuário. A responsabilidade clínica é do médico assistente.<br>
    Idealizado pelo <b>Dr. Maurício Moraes</b> · Desenvolvido pela <b>Prime Automate</b>
  </div>
</body></html>`;

  // Impressão isolada via iframe oculto → o usuário escolhe "Salvar como PDF".
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", visibility: "hidden" });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();

  const win = iframe.contentWindow;
  let removed = false;
  const remove = () => { if (!removed) { removed = true; setTimeout(() => iframe.remove(), 300); } };
  win.onafterprint = remove;
  setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 350);
  // Rede de segurança caso 'afterprint' não dispare (alguns navegadores móveis).
  setTimeout(remove, 120000);
}
