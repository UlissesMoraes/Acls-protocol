// ─── Markdown leve → React (negrito, código, títulos, listas) — sem dependências ──
// Compartilhado entre o Copiloto Clínico e a Anamnese.

function inline(text, keyBase) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={`${keyBase}-b${i++}`}>{tok.slice(2, -2)}</strong>);
    else out.push(<code key={`${keyBase}-c${i++}`} style={{ background: "var(--surface-2)", padding: "1px 5px", borderRadius: 4, fontSize: ".92em" }}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }) {
  const lines = (text || "").split("\n");
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };

  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/, "");
    const h = /^(#{1,4})\s+(.*)/.exec(line);
    const bullet = /^[-•]\s+(.*)/.exec(line);
    const num = /^(\d+)\.\s+(.*)/.exec(line);

    if (h) {
      flush();
      blocks.push(<div key={i} style={{ fontWeight: 800, color: "var(--text-strong)", fontSize: 14, margin: "8px 0 2px" }}>{inline(h[2], i)}</div>);
    } else if (bullet || num) {
      const content = bullet ? bullet[1] : num[2];
      const item = <li key={i} style={{ marginBottom: 3 }}>{inline(content, i)}</li>;
      if (!list || list.type !== (num ? "ol" : "ul")) { flush(); list = { type: num ? "ol" : "ul", items: [] }; }
      list.items.push(item);
    } else if (line.trim() === "") {
      flush();
    } else {
      flush();
      blocks.push(<div key={i} style={{ marginBottom: 4 }}>{inline(line, i)}</div>);
    }
  });
  flush();

  return blocks.map((b, i) =>
    b && b.type === "ul" ? <ul key={`l${i}`} style={{ margin: "2px 0 6px", paddingLeft: 20 }}>{b.items}</ul>
      : b && b.type === "ol" ? <ol key={`l${i}`} style={{ margin: "2px 0 6px", paddingLeft: 20 }}>{b.items}</ol>
        : b
  );
}

export const stripMd = s => (s || "").replace(/[#*`>]/g, "").replace(/\n{2,}/g, ". ");
