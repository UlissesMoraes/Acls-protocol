// ─── EXPORTAÇÃO DA ANAMNESE EM PDF ────────────────────────────────────────────
// Gera um PDF clínico estruturado diretamente (jsPDF, carregado sob demanda) e
// faz o download do arquivo — sem depender do diálogo de impressão do navegador
// (que no mobile imprimia a página inteira). Layout: cabeçalho, contexto, seções
// coloridas conforme a análise e rodapé com a marca em todas as páginas.

const ACCENT = [157, 23, 77], INK = [26, 32, 44], MUTED = [113, 128, 150];
const RED = [197, 48, 48], LINE = [226, 232, 240], CTXBG = [253, 242, 248], CTXBD = [243, 199, 218];

// jsPDF (fontes padrão) usa WinAnsi → acentos do português OK. Só precisamos
// neutralizar emojis e alguns símbolos técnicos.
function san(s) {
  return String(s == null ? "" : s)
    .replace(/→/g, "->").replace(/⇒/g, "=>")
    .replace(/≥/g, ">=").replace(/≤/g, "<=")
    .replace(/≈/g, "~")
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, d => "₀₁₂₃₄₅₆₇₈₉".indexOf(d).toString())
    .replace(/–|—/g, "-").replace(/•/g, "-")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️‍]/gu, "")
    .replace(/[ \t]{2,}/g, " ");
}
const clean = s => san(String(s).replace(/\*\*/g, "").replace(/`/g, "")).trim();
const norm = s => san(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function splitSections(md) {
  const secs = [];
  let cur = null;
  for (const raw of String(md || "").split("\n")) {
    const h = /^#{1,4}\s+(.*)/.exec(raw.trim());
    if (h) { cur = { title: h[1], items: [] }; secs.push(cur); }
    else if (cur) {
      const line = raw.replace(/\s+$/, "");
      const b = /^\s*[-•]\s+(.*)/.exec(line) || /^\s*\d+\.\s+(.*)/.exec(line);
      if (b) cur.items.push({ li: true, text: b[1] });
      else if (line.trim()) cur.items.push({ li: false, text: line.trim() });
    }
  }
  return secs;
}

function fileStamp() {
  try {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
  } catch { return "anamnese"; }
}

export async function exportAnamnesePDF(data) {
  const { jsPDF } = await import("jspdf");
  const doc = buildAnamneseDoc(jsPDF, data);
  doc.save(`Anamnese_${fileStamp()}.pdf`);
}

// Construção pura do documento (testável em Node com o construtor jsPDF).
export function buildAnamneseDoc(jsPDF, { analysis, transcript, idade, sexo, nota, templateLabel }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const M = 15, PW = 210, PH = 297, CW = PW - 2 * M, LH = 4.5, BOTTOM = PH - 18;
  const fill = c => doc.setFillColor(c[0], c[1], c[2]);
  const ink = c => doc.setTextColor(c[0], c[1], c[2]);
  const draw = c => doc.setDrawColor(c[0], c[1], c[2]);
  let y = 0;

  const ensure = need => { if (y + need > BOTTOM) { doc.addPage(); y = 18; } };

  const sectionHeader = (title, color) => {
    ensure(13);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); ink(color);
    doc.text(san(title).trim().toUpperCase(), M, y);
    y += 2.3;
    draw(color); doc.setLineWidth(0.4); doc.line(M, y, M + CW, y); doc.setLineWidth(0.2);
    y += 4.4;
  };

  const renderItems = (items, color) => {
    for (const it of items) {
      const txt = clean(it.text);
      if (!txt) continue;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
      if (it.li) {
        const lines = doc.splitTextToSize(txt, CW - 5);
        ensure(lines.length * LH);
        ink(color); doc.text("•", M + 0.5, y);
        ink(INK); doc.text(lines, M + 4.5, y);
        y += lines.length * LH + 1.4;
      } else {
        const lines = doc.splitTextToSize(txt, CW);
        ensure(lines.length * LH);
        ink(INK); doc.text(lines, M, y);
        y += lines.length * LH + 1.4;
      }
    }
    y += 3;
  };

  // ── Cabeçalho ──
  fill(ACCENT); doc.rect(0, 0, PW, 24, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
  doc.text("ANAMNESE CLÍNICA", M, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  let dateStr = "";
  try { dateStr = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch {}
  doc.text(dateStr, PW - M, 11.5, { align: "right" });
  doc.setFontSize(7.5); doc.text("Documento gerado com apoio de IA", PW - M, 16.5, { align: "right" });
  if (templateLabel && !/geral/i.test(templateLabel)) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
    doc.text(san(`Modelo: ${templateLabel}`), M, 20.5);
  }
  y = 32;

  // ── Caixa de contexto do paciente ──
  const parts = [];
  if (idade) parts.push(`Idade: ${idade}`);
  if (sexo) parts.push(`Sexo: ${sexo}`);
  if (nota && nota.trim()) parts.push(`Observações: ${nota.trim()}`);
  const ctxStr = parts.length ? parts.join("     |     ") : "Sem dados de contexto informados.";
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  const ctxLines = doc.splitTextToSize(san(ctxStr), CW - 8);
  const ctxH = ctxLines.length * LH + 5;
  fill(CTXBG); draw(CTXBD); doc.roundedRect(M, y, CW, ctxH, 2, 2, "FD");
  ink(INK); doc.text(ctxLines, M + 4, y + 5.5);
  y += ctxH + 7;

  // ── Seções da análise ──
  const sections = splitSections(analysis);
  if (sections.length) {
    for (const sec of sections) {
      const isRed = /alarme|red flag/.test(norm(sec.title));
      sectionHeader(sec.title, isRed ? RED : ACCENT);
      renderItems(sec.items, isRed ? RED : ACCENT);
    }
  } else {
    // Fallback: análise sem seções reconhecíveis → texto corrido.
    renderItems(String(analysis || "").split("\n").filter(l => l.trim()).map(t => ({ li: false, text: t })), ACCENT);
  }

  // ── Transcrição (anexo) ──
  if (transcript && transcript.trim()) {
    ensure(16);
    sectionHeader("Transcrição (registro)", MUTED);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); ink([45, 55, 72]);
    for (const line of doc.splitTextToSize(san(transcript.trim()), CW)) {
      ensure(LH); doc.text(line, M, y); y += 4;
    }
  }

  // ── Rodapé + numeração em todas as páginas ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    draw(LINE); doc.setLineWidth(0.2); doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.8); ink(MUTED);
    doc.text("Documento gerado por IA a partir de transcrição — revisar e validar antes de registrar em prontuário. Responsabilidade do médico assistente.", M, PH - 10);
    doc.setFont("helvetica", "bold");
    doc.text("Idealizado pelo Dr. Maurício Moraes", M, PH - 6.5);
    doc.setFont("helvetica", "normal");
    doc.text("Desenvolvido pela Prime Automate", M + 52, PH - 6.5);
    doc.text(`${p} / ${pages}`, PW - M, PH - 6.5, { align: "right" });
  }

  return doc;
}
