import { useState, useRef, useEffect } from "react";
import { Stethoscope, Sparkles, Mic, MicOff, Square, ChevronRight, AlertTriangle } from "lucide-react";
import { streamChat, AIConfigError } from "../lib/aiClient.js";
import { ProtoIcon } from "../icons.jsx";

const sans = "var(--font)";

// Reconhecimento de voz pt-BR (preenche o textarea).
function useSpeech(onText) {
  const recRef = useRef(null);
  const [listening, setListening] = useState(false);
  const supported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const toggle = () => {
    if (!supported) return;
    if (listening) { recRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = false;
    let finalText = "";
    rec.onresult = e => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t; else interim += t;
      }
      onText((finalText + interim).trim());
    };
    rec.onend = () => { setListening(false); recRef.current = null; };
    rec.onerror = () => { setListening(false); recRef.current = null; };
    recRef.current = rec; setListening(true); rec.start();
  };
  useEffect(() => () => recRef.current?.abort?.(), []);
  return { supported: !!supported, listening, toggle };
}

// Extrai a linha [[id1, id2]] do fim da resposta e devolve { text, ids }.
function parseTriage(raw, validIds) {
  const m = raw.match(/\[\[([^\]]*)\]\]/);
  let ids = [];
  if (m) ids = m[1].split(",").map(s => s.trim().toLowerCase()).filter(id => validIds.includes(id));
  const text = raw.replace(/\[\[[^\]]*\]\]/g, "").trim();
  return { text, ids: [...new Set(ids)] };
}

export default function SymptomTriage({ protocols, onOpen }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const speech = useSpeech(setInput);

  const validIds = protocols.map(p => p.id);
  const { text, ids } = parseTriage(raw, validIds);
  const matched = ids.map(id => protocols.find(p => p.id === id)).filter(Boolean);

  const run = async () => {
    const content = input.trim();
    if (!content || busy) return;
    setError(null); setRaw("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      await streamChat({
        mode: "triage", signal: ctrl.signal,
        messages: [{ role: "user", content: `Quadro clínico: ${content}` }],
        onToken: d => setRaw(prev => prev + d),
      });
    } catch (e) {
      if (e?.name !== "AbortError")
        setError(e instanceof AIConfigError ? "IA não configurada (defina OPENAI_API_KEY na Vercel)." : (e.message || "Falha na triagem."));
    } finally { setBusy(false); abortRef.current = null; }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: "color-mix(in srgb,#7C3AED 7%,var(--surface))", border: "1px solid color-mix(in srgb,#7C3AED 30%,var(--border))", borderRadius: 12, padding: "13px 16px", cursor: "pointer", textAlign: "left", fontFamily: sans }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: "color-mix(in srgb,#7C3AED 16%,var(--surface))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Stethoscope size={20} color="#7C3AED" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>Triagem por sintomas (IA)</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Descreva o caso e a IA sugere os protocolos certos</span>
        </span>
        <ChevronRight size={20} color="var(--muted-2)" style={{ flexShrink: 0 }} />
      </button>
    );
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb,#7C3AED 30%,var(--border))", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ background: "color-mix(in srgb,#7C3AED 9%,var(--surface))", padding: "11px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" }}>
        <Stethoscope size={17} color="#7C3AED" />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans }}>Triagem por sintomas (IA)</span>
        <button onClick={() => { setOpen(false); abortRef.current?.abort(); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>✕</button>
      </div>

      <div style={{ padding: "14px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={2}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }}
            placeholder="Ex: homem 60a, dor torácica em aperto, sudorese, irradiando p/ braço esquerdo, PA 90×60..."
            style={{ flex: 1, resize: "none", minHeight: 56, padding: "11px 12px", borderRadius: 10, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 15, fontFamily: sans, outline: "none", lineHeight: 1.4 }} />
          {speech.supported && (
            <button onClick={speech.toggle} disabled={busy} aria-label={speech.listening ? "Parar" : "Falar"}
              style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 10, border: `1px solid ${speech.listening ? "#C53030" : "var(--input-border)"}`, background: speech.listening ? "var(--danger-bg)" : "var(--surface)", color: speech.listening ? "#C53030" : "var(--muted)", cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {speech.listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          {busy ? (
            <button onClick={() => abortRef.current?.abort()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: "#C53030", color: "#fff", fontSize: 13, fontFamily: sans, fontWeight: 700, cursor: "pointer" }}>
              <Square size={13} fill="#fff" /> Parar
            </button>
          ) : (
            <button onClick={run} disabled={!input.trim()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, border: "none", background: input.trim() ? "#7C3AED" : "var(--border)", color: "#fff", fontSize: 13, fontFamily: sans, fontWeight: 700, cursor: input.trim() ? "pointer" : "default" }}>
              <Sparkles size={15} /> Analisar
            </button>
          )}
        </div>

        {(text || busy) && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--surface-2)", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, color: "var(--text)", fontFamily: sans, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {text}{busy && <span style={{ opacity: .5 }}>▍</span>}
          </div>
        )}

        {matched.length > 0 && !busy && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", fontFamily: sans, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Abrir protocolo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {matched.map(p => (
                <button key={p.id} onClick={() => onOpen(p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${p.border}55`, borderLeft: `3px solid ${p.border}`, background: "var(--surface)", cursor: "pointer", textAlign: "left", fontFamily: sans }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: `color-mix(in srgb,${p.color} 14%,var(--surface))`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ProtoIcon id={p.id} color={p.color} size={18} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)" }}>{p.label}</span>
                    <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>{p.cat}</span>
                  </span>
                  <ChevronRight size={18} color="var(--muted-2)" />
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, background: "var(--danger-bg)", border: "1px solid var(--danger-bd)", color: "var(--danger-fg)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, fontFamily: sans }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--muted)", fontFamily: sans, lineHeight: 1.5 }}>
          Sugestão de navegação por IA — não é diagnóstico. A avaliação clínica é do médico assistente.
        </div>
      </div>
    </div>
  );
}
