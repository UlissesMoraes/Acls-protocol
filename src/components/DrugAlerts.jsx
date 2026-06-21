import { useState, useRef } from "react";
import { ShieldAlert, Sparkles, Square, ChevronDown } from "lucide-react";
import { streamChat, AIConfigError } from "../lib/aiClient.js";

const sans = "var(--font)";

// Painel de alertas de interação/segurança das drogas de UM protocolo.
export default function DrugAlerts({ protocol, weight, color = "#C53030" }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const abortRef = useRef(null);

  const run = async () => {
    if (busy) return;
    setError(null); setResult(""); setDone(false); setBusy(true);
    const drugList = protocol.drugs
      .map(d => `- ${d.name}${d.dose ? ` (${d.dose})` : ""}${d.via ? ` ${d.via}` : ""}`)
      .join("\n");
    const input = [
      `Protocolo: ${protocol.label}.`,
      weight ? `Peso do paciente: ${weight} kg.` : "Peso não informado.",
      `Medicações deste protocolo:`,
      drugList,
      ``,
      `Liste os alertas de interação e segurança relevantes entre essas drogas.`,
    ].join("\n");

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamChat({
        mode: "alerts", signal: ctrl.signal,
        messages: [{ role: "user", content: input }],
        onToken: d => setResult(prev => prev + d),
      });
      setDone(true);
    } catch (e) {
      if (e?.name !== "AbortError")
        setError(e instanceof AIConfigError ? "IA não configurada (defina OPENAI_API_KEY na Vercel)." : (e.message || "Falha ao verificar."));
    } finally { setBusy(false); abortRef.current = null; }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !result && !busy) run();
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb,#C53030 28%,var(--border))", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
      <button onClick={toggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "color-mix(in srgb,#C53030 7%,var(--surface))", border: "none", cursor: "pointer", fontFamily: sans }}>
        <span style={{ width: 34, height: 34, borderRadius: 9, background: "color-mix(in srgb,#C53030 14%,var(--surface))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ShieldAlert size={19} color="#C53030" />
        </span>
        <span style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)" }}>Verificar interações e alertas (IA)</span>
          <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>Segurança das {protocol.drugs.length} medicações deste protocolo</span>
        </span>
        <ChevronDown size={18} color="var(--muted-2)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
          {(result || busy) && (
            <div style={{ fontSize: 13, color: "var(--text)", fontFamily: sans, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {result}{busy && <span style={{ opacity: .5 }}>▍</span>}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 12.5, color: "var(--danger-fg)", fontFamily: sans, background: "var(--danger-bg)", border: "1px solid var(--danger-bd)", borderRadius: 8, padding: "10px 12px" }}>{error}</div>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            {busy ? (
              <button onClick={() => abortRef.current?.abort()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 7, border: "none", background: "#C53030", color: "#fff", fontSize: 12, fontFamily: sans, fontWeight: 700, cursor: "pointer" }}>
                <Square size={11} fill="#fff" /> Parar
              </button>
            ) : (done || error) && (
              <button onClick={run} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "1px solid var(--input-border)", background: "var(--surface)", fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: "pointer", color: "var(--text)" }}>
                <Sparkles size={13} /> Verificar de novo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
