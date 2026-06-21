import { useState, useRef, useEffect, useMemo } from "react";
import { Sparkles, Send, Mic, MicOff, Volume2, VolumeX, Square, Trash2, AlertTriangle, Stethoscope } from "lucide-react";
import { streamChat, AIConfigError } from "../lib/aiClient.js";
import { buildKnowledgeBase, buildFocusedContext } from "../lib/clinicalContext.js";

const sans = "var(--font)";

// ── Markdown leve → React (negrito, código, títulos, listas) — sem dependências ──
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

function Markdown({ text }) {
  const lines = text.split("\n");
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

const stripMd = s => s.replace(/[#*`>]/g, "").replace(/\n{2,}/g, ". ");

// ── Reconhecimento de voz (Web Speech API) ──
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

const SUGGESTIONS = [
  "Por que a amiodarona só entra após o 3º choque na FV?",
  "Noradrenalina 0,2 mcg/kg/min para 80 kg: quantos mL/h?",
  "Quais os critérios de qSOFA e o que muda na conduta?",
  "Resumo da conduta inicial no AVC isquêmico (< 4,5h).",
];

export default function AIAssistant({ protocols, weight, focusId, focusLabel }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);
  const taRef = useRef(null);

  const context = useMemo(
    () => (focusId ? buildFocusedContext(protocols, focusId) : buildKnowledgeBase(protocols)),
    [protocols, focusId]
  );

  // Sugestões: específicas do protocolo em foco (modo explicativo) ou genéricas.
  const suggestions = useMemo(() => {
    if (focusLabel) return [
      `Explique o racional da conduta inicial de ${focusLabel}.`,
      `Quais os erros mais comuns no manejo de ${focusLabel}?`,
      `Quais critérios definem gravidade em ${focusLabel}?`,
      `Resuma as doses-chave deste protocolo.`,
    ];
    return SUGGESTIONS;
  }, [focusLabel]);

  const speech = useSpeech(setInput);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const speak = txt => {
    if (!speakOn || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(stripMd(txt));
    u.lang = "pt-BR"; u.rate = 1.05;
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setError(null); setInput("");
    const weightNote = weight ? `\n\n[Peso do paciente informado no app: ${weight} kg]` : "";
    const history = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const payloadMsgs = history.map((m, i) =>
        i === history.length - 1 ? { ...m, content: m.content + weightNote } : m
      );
      let acc = "";
      await streamChat({
        messages: payloadMsgs, context, signal: ctrl.signal,
        onToken: d => {
          acc += d;
          setMessages(prev => { const n = [...prev]; n[n.length - 1] = { role: "assistant", content: acc }; return n; });
        },
      });
      speak(acc);
    } catch (e) {
      if (e?.name === "AbortError") {
        setMessages(prev => { const n = [...prev]; if (!n.at(-1)?.content) n.pop(); return n; });
      } else if (e instanceof AIConfigError) {
        setNotConfigured(true);
        setMessages(prev => prev.slice(0, -1));
      } else {
        setError(e.message || "Erro ao consultar a IA.");
        setMessages(prev => { const n = [...prev]; if (!n.at(-1)?.content) n.pop(); return n; });
      }
    } finally {
      setStreaming(false); abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();
  const clear = () => { setMessages([]); setError(null); window.speechSynthesis?.cancel(); };

  if (notConfigured) {
    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-strong)", marginBottom: 10 }}>
          <AlertTriangle size={18} color="#D69E2E" /> Assistente ainda não configurado
        </div>
        <div style={{ fontSize: 13, color: "var(--text)", fontFamily: sans, lineHeight: 1.65 }}>
          A inteligência precisa da chave da OpenAI no servidor. Na Vercel, vá em <strong>Project → Settings → Environment Variables</strong> e adicione:
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", margin: "10px 0", fontFamily: "monospace", fontSize: 12.5 }}>
            OPENAI_API_KEY = sk-...
          </div>
          Depois faça um novo deploy. A chave fica só no servidor — nunca no app.
        </div>
        <button onClick={() => setNotConfigured(false)} style={{ marginTop: 6, padding: "9px 16px", borderRadius: 8, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--text)", fontFamily: sans, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Entendi</button>
      </div>
    );
  }

  const empty = messages.length === 0;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", height: "min(72vh, 640px)" }}>
      <style>{`@keyframes aiBlink{0%,100%{opacity:.2}50%{opacity:1}} .ai-cursor{display:inline-block;width:7px;height:14px;background:var(--text);margin-left:2px;border-radius:1px;animation:aiBlink 1s infinite;vertical-align:middle}`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg,color-mix(in srgb,#7C3AED 12%,var(--surface)),var(--surface))", borderBottom: "1px solid var(--border)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb,#7C3AED 18%,var(--surface))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sparkles size={20} color="#7C3AED" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Copiloto Clínico</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, display: "flex", alignItems: "center", gap: 5 }}>
            {focusLabel
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "color-mix(in srgb,#7C3AED 16%,var(--surface))", color: "#7C3AED", fontWeight: 700, padding: "1px 8px", borderRadius: 20, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Foco: {focusLabel}</span>
              : "Ancorado nos protocolos do app · ACLS/SBC"}
          </div>
        </div>
        <button onClick={() => setSpeakOn(s => { if (s) window.speechSynthesis?.cancel(); return !s; })} aria-label={speakOn ? "Desativar leitura em voz" : "Ler respostas em voz"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: `1px solid ${speakOn ? "#7C3AED" : "var(--input-border)"}`, background: speakOn ? "color-mix(in srgb,#7C3AED 14%,var(--surface))" : "var(--surface)", color: speakOn ? "#7C3AED" : "var(--muted)", cursor: "pointer" }}>
          {speakOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        {messages.length > 0 && (
          <button onClick={clear} aria-label="Limpar conversa" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer" }}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {empty && (
          <div style={{ margin: "auto 0", textAlign: "center", padding: "8px 4px" }}>
            <span style={{ width: 56, height: 56, borderRadius: 16, background: "color-mix(in srgb,#7C3AED 14%,var(--surface))", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <Stethoscope size={28} color="#7C3AED" />
            </span>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans }}>{focusLabel ? `Tire dúvidas sobre ${focusLabel}` : "Pergunte sobre os protocolos"}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", fontFamily: sans, marginTop: 4, marginBottom: 16, lineHeight: 1.5 }}>Tire dúvidas de conduta, peça o porquê de cada passo ou calcule doses conversando.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{ textAlign: "left", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: 13, fontFamily: sans, cursor: "pointer", lineHeight: 1.4 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLast = i === messages.length - 1;
          return (
            <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "88%", padding: "10px 14px", borderRadius: 14, fontSize: 13.5, fontFamily: sans, lineHeight: 1.6,
                background: isUser ? "#2B6CB0" : "var(--surface-2)",
                color: isUser ? "#fff" : "var(--text)",
                border: isUser ? "none" : "1px solid var(--border)",
                borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4,
              }}>
                {isUser ? m.content : <><Markdown text={m.content} />{streaming && isLast && <span className="ai-cursor" />}</>}
              </div>
            </div>
          );
        })}

        {error && (
          <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-bd)", color: "var(--danger-fg)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, fontFamily: sans, display: "flex", gap: 8, alignItems: "center" }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}
      </div>

      {/* Aviso clínico */}
      <div style={{ padding: "6px 14px", fontSize: 10.5, color: "var(--muted)", fontFamily: sans, textAlign: "center", borderTop: "1px solid var(--border-2)" }}>
        Apoio à decisão. Confira doses e contraindicações — a responsabilidade é do médico assistente.
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-end", background: "var(--surface)" }}>
        {speech.supported && (
          <button onClick={speech.toggle} aria-label={speech.listening ? "Parar de ouvir" : "Falar"} disabled={streaming}
            style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 11, border: `1px solid ${speech.listening ? "#C53030" : "var(--input-border)"}`, background: speech.listening ? "var(--danger-bg)" : "var(--surface)", color: speech.listening ? "#C53030" : "var(--muted)", cursor: streaming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {speech.listening ? <MicOff size={19} /> : <Mic size={19} />}
          </button>
        )}
        <textarea ref={taRef} value={input} onChange={e => setInput(e.target.value)} rows={1}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={speech.listening ? "Ouvindo…" : "Pergunte sobre conduta, doses, escores…"}
          style={{ flex: 1, resize: "none", maxHeight: 120, minHeight: 42, padding: "11px 12px", borderRadius: 11, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 15, fontFamily: sans, outline: "none", lineHeight: 1.4 }} />
        {streaming ? (
          <button onClick={stop} aria-label="Parar" style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 11, border: "none", background: "#C53030", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Square size={17} fill="#fff" />
          </button>
        ) : (
          <button onClick={() => send()} disabled={!input.trim()} aria-label="Enviar"
            style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 11, border: "none", background: input.trim() ? "#7C3AED" : "var(--border)", color: "#fff", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}>
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
