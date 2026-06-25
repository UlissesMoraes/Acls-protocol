import { useState, useRef, useEffect } from "react";
import {
  Lock, ShieldCheck, Mic, Square, Upload, FileText, ClipboardList, Sparkles,
  Copy, FileDown, Trash2, AlertTriangle, Loader2, Stethoscope, LogOut, Check,
  History, RotateCcw, ChevronDown,
} from "lucide-react";
import { streamChat, AIConfigError, AnamneseAuthError, AnamneseConfigError } from "../lib/aiClient.js";
import { verifyPassword, transcribeAudio } from "../lib/anamneseClient.js";
import { Markdown, stripMd } from "../lib/markdown.jsx";
import { useWakeLock } from "../hooks/useWakeLock.js";
import { exportAnamnesePDF } from "../lib/anamnesePdf.js";
import { loadHistory, saveEntry, deleteEntry, clearHistory } from "../lib/anamneseHistory.js";

const clock = ts => { try { return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
const preview = h => (h.transcript || stripMd(h.analysis || "") || "").trim().replace(/\s+/g, " ").slice(0, 80) || "anamnese";

// Extrai idade/sexo/observações da transcrição (heurística pt-BR, só preenche
// campos vazios — nunca sobrescreve o que o médico digitou).
function extractContext(text) {
  const t = (text || "").toLowerCase();
  const mAge = t.match(/(\d{1,3})\s*(?:anos?|a\b)/);
  const idade = mAge ? `${mAge[1]}a` : "";
  let sexo = "";
  if (/\b(feminino|mulher|gestante|gr[áa]vida|sexo feminino|paciente do sexo feminino)\b/.test(t)) sexo = "feminino";
  else if (/\b(masculino|homem|sexo masculino|paciente do sexo masculino)\b/.test(t)) sexo = "masculino";
  const KW = [
    [/hipertens|press[ãa]o alta|\bhas\b/, "HAS"],
    [/diab[ée]t|\bdm\b/, "diabético"],
    [/al[ée]rg/, "alergia relatada"],
    [/tabagis|fumante|fuma\b/, "tabagista"],
    [/etilis|alco[óo]l/, "etilista"],
    [/infarto|\biam\b|card[íi]aco/, "antecedente cardíaco"],
    [/asma|\bdpoc\b/, "doença respiratória"],
    [/gestante|gr[áa]vida/, "gestante"],
  ];
  const obs = [...new Set(KW.filter(([re]) => re.test(t)).map(([, l]) => l))].join(", ");
  return { idade, sexo, obs };
}

const sans = "var(--font)";
const ACCENT = "#9D174D";
const SESSION_KEY = "anamnese_key";

function pickMime() {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";
  for (const o of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"])
    if (window.MediaRecorder.isTypeSupported?.(o)) return o;
  return "";
}
const extFor = mime => (mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm");
const fmtTime = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function AnamneseTool() {
  // ── Auth ──
  const [authKey, setAuthKey] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || ""; } catch { return ""; }
  });
  const authed = !!authKey;
  const [pw, setPw] = useState("");
  const [checking, setChecking] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);

  // ── Áudio / gravação ──
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState("");
  const mrRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  // ── Transcrição / análise ──
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [idade, setIdade] = useState("");
  const [sexo, setSexo] = useState("");
  const [nota, setNota] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [history, setHistory] = useState([]);
  const [showHist, setShowHist] = useState(false);
  const abortRef = useRef(null);

  // Mantém a tela ligada durante a gravação (não interromper o atendimento).
  useWakeLock(recording);

  // Carrega o histórico local (24h) ao desbloquear a área.
  useEffect(() => { if (authed) setHistory(loadHistory()); }, [authed]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    mrRef.current?.stream?.getTracks?.().forEach(t => t.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const lock = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setAuthKey(""); setPw(""); setAuthErr("");
  };

  const unlock = async () => {
    const value = pw.trim();
    if (!value || checking) return;
    setChecking(true); setAuthErr("");
    try {
      const ok = await verifyPassword(value);
      if (ok) { try { sessionStorage.setItem(SESSION_KEY, value); } catch {} setAuthKey(value); setPw(""); }
      else setAuthErr("Senha incorreta.");
    } catch (e) {
      if (e instanceof AnamneseConfigError) setNotConfigured(true);
      else setAuthErr(e.message || "Falha ao validar a senha.");
    } finally { setChecking(false); }
  };

  // ── Gravação ──
  const startRec = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) { setError("Gravação não suportada neste navegador. Use 'Enviar áudio'."); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setError("Permissão de microfone negada."); return; }
    const mime = pickMime();
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const type = mr.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      blob._ext = extFor(type);
      setAudioBlob(blob);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach(t => t.stop());
    };
    mrRef.current = mr;
    mr.start();
    setRecording(true); setRecSecs(0);
    timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
  };

  const stopRec = () => {
    clearInterval(timerRef.current);
    mrRef.current?.stop();
    setRecording(false);
  };

  const onUpload = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    if (f.size > 25 * 1024 * 1024) { setError("Arquivo acima de 25 MB."); return; }
    f._ext = (f.name.split(".").pop() || "webm").toLowerCase();
    setAudioBlob(f);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(f));
    e.target.value = "";
  };

  const clearAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(""); setRecSecs(0);
  };

  // ── Transcrição ──
  const doTranscribe = async () => {
    if (!audioBlob || transcribing) return;
    setTranscribing(true); setError("");
    try {
      const text = await transcribeAudio(audioBlob, { authKey, filename: `anamnese.${audioBlob._ext || "webm"}` });
      setTranscript(prev => (prev ? prev.trim() + "\n\n" : "") + text);
      // Autopreenche os campos vazios a partir do que foi falado.
      const ex = extractContext(text);
      if (ex.idade) setIdade(p => p || ex.idade);
      if (ex.sexo)  setSexo(p => p || ex.sexo);
      if (ex.obs)   setNota(p => p || ex.obs);
    } catch (e) {
      if (e instanceof AnamneseAuthError) { lock(); setError("Sessão expirada — informe a senha novamente."); }
      else if (e instanceof AnamneseConfigError || e instanceof AIConfigError) setNotConfigured(true);
      else setError(e.message || "Falha na transcrição.");
    } finally { setTranscribing(false); }
  };

  // ── Análise IA ──
  const analyze = async () => {
    if (!transcript.trim() || streaming) return;
    setError(""); setAnalysis("");
    const ctx = [idade && `Idade: ${idade}`, sexo && `Sexo: ${sexo}`].filter(Boolean).join(" · ");
    const userMsg =
      (ctx ? `Dados de contexto: ${ctx}.\n` : "") +
      (nota.trim() ? `Observações do médico: ${nota.trim()}.\n` : "") +
      `\nTranscrição do atendimento:\n"""\n${transcript.trim()}\n"""`;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);
    try {
      let acc = "";
      await streamChat({
        messages: [{ role: "user", content: userMsg }],
        mode: "anamnese", authKey, signal: ctrl.signal,
        onToken: d => { acc += d; setAnalysis(acc); },
      });
      if (acc.trim()) setHistory(saveEntry({ idade, sexo, nota: nota.trim(), transcript: transcript.trim(), analysis: acc }));
    } catch (e) {
      if (e?.name === "AbortError") { /* mantém parcial */ }
      else if (e instanceof AnamneseAuthError) { lock(); setError("Sessão expirada — informe a senha novamente."); }
      else if (e instanceof AnamneseConfigError || e instanceof AIConfigError) setNotConfigured(true);
      else setError(e.message || "Falha na análise.");
    } finally { setStreaming(false); abortRef.current = null; }
  };
  const stopAnalyze = () => abortRef.current?.abort();

  const copy = async (text, tag) => {
    try { await navigator.clipboard.writeText(text); setCopied(tag); setTimeout(() => setCopied(""), 1500); } catch {}
  };
  const exportPDF = () => exportAnamnesePDF({ analysis, transcript, idade, sexo, nota });

  // ── Histórico (24h) ──
  const reopen = h => {
    setTranscript(h.transcript || ""); setAnalysis(h.analysis || "");
    setIdade(h.idade || ""); setSexo(h.sexo || ""); setNota(h.nota || "");
    setError(""); setShowHist(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Tela "não configurado" ──
  if (notConfigured) {
    return (
      <Card>
        <Title Ic={AlertTriangle} color="#D69E2E">Área de anamnese não configurada</Title>
        <p style={txt}>
          Esta área precisa de duas variáveis de ambiente na Vercel (<strong>Project → Settings → Environment Variables</strong>):
        </p>
        <pre style={code}>OPENAI_API_KEY = sk-...{"\n"}ANAMNESE_PASSWORD = sua-senha-forte</pre>
        <p style={txt}>Depois faça um novo deploy. A chave e a senha ficam só no servidor — nunca no app.</p>
        <button style={btnGhost} onClick={() => setNotConfigured(false)}>Entendi</button>
      </Card>
    );
  }

  // ── Tela de senha ──
  if (!authed) {
    return (
      <Card>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <span style={{ width: 56, height: 56, borderRadius: 16, background: `color-mix(in srgb,${ACCENT} 14%,var(--surface))`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={26} color={ACCENT} />
          </span>
        </div>
        <div style={{ textAlign: "center", fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--text-strong)" }}>Área protegida — Anamnese</div>
        <p style={{ ...txt, textAlign: "center" }}>Recurso exclusivo. Informe a senha para acessar a transcrição e a análise clínica.</p>
        <input
          type="password" value={pw} onChange={e => setPw(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === "Enter") unlock(); }}
          placeholder="Senha de acesso"
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 11, border: `1px solid ${authErr ? "#C53030" : "var(--input-border)"}`, background: "var(--input-bg)", color: "var(--text)", fontSize: 16, fontFamily: sans, outline: "none", marginTop: 6 }}
        />
        {authErr && <div style={{ color: "#C53030", fontSize: 12.5, fontFamily: sans, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> {authErr}</div>}
        <button onClick={unlock} disabled={!pw.trim() || checking}
          style={{ ...btnPrimary, width: "100%", marginTop: 12, justifyContent: "center", opacity: !pw.trim() || checking ? 0.6 : 1 }}>
          {checking ? <Loader2 size={17} className="anam-spin" /> : <ShieldCheck size={17} />} {checking ? "Validando…" : "Entrar"}
        </button>
        <div style={{ display: "flex", gap: 7, marginTop: 14, fontSize: 11, color: "var(--muted)", fontFamily: sans, lineHeight: 1.5 }}>
          <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          A senha é validada no servidor e nunca fica no app. A sessão expira ao fechar a aba.
        </div>
        <style>{spin}</style>
      </Card>
    );
  }

  // ── Área desbloqueada ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{spin}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px", boxShadow: "var(--shadow-sm)" }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: `color-mix(in srgb,${ACCENT} 16%,var(--surface))`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ClipboardList size={20} color={ACCENT} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Anamnese com IA</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, display: "flex", alignItems: "center", gap: 5 }}>
            <ShieldCheck size={12} color="#1E8449" /> Área protegida · transcrição + análise clínica
          </div>
        </div>
        <button onClick={lock} title="Sair da área protegida" style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--muted)", fontSize: 12, fontFamily: sans, fontWeight: 600, cursor: "pointer" }}>
          <LogOut size={15} /> Sair
        </button>
      </div>

      {/* Aviso LGPD */}
      <div style={{ display: "flex", gap: 9, background: "var(--warn-bg, #FEF9E7)", border: "1px solid var(--warn-bd, #F1C40F55)", borderRadius: 12, padding: "11px 13px" }}>
        <AlertTriangle size={16} color="var(--warn-fg, #B7791F)" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11.5, color: "var(--text)", fontFamily: sans, lineHeight: 1.5 }}>
          <strong>LGPD:</strong> o áudio e o texto são enviados à OpenAI para processamento. Evite nomes completos e identificadores diretos do paciente. Obtenha consentimento e siga a política da sua instituição. Conteúdo é apoio à decisão — a responsabilidade é do médico assistente.
        </span>
      </div>

      {/* Histórico local (24h) */}
      {history.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <button onClick={() => setShowHist(s => !s)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "12px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: sans }}>
            <History size={17} color={ACCENT} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)" }}>Histórico (24h)</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT, background: `color-mix(in srgb,${ACCENT} 12%,var(--surface))`, padding: "1px 8px", borderRadius: 20 }}>{history.length}</span>
            <ChevronDown size={17} color="var(--muted)" style={{ marginLeft: "auto", transform: showHist ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {showHist && (
            <div style={{ borderTop: "1px solid var(--border)", padding: "8px 10px 12px" }}>
              {history.map(h => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px", borderRadius: 10, marginBottom: 2 }}>
                  <button onClick={() => reopen(h)} style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, display: "flex", gap: 6, alignItems: "center" }}>
                      {clock(h.ts)} {(h.idade || h.sexo) && <span>· {[h.idade, h.sexo].filter(Boolean).join(" · ")}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text)", fontFamily: sans, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview(h)}</div>
                  </button>
                  <button onClick={() => reopen(h)} title="Reabrir" style={iconBtn}><RotateCcw size={15} /></button>
                  <button onClick={() => setHistory(deleteEntry(h.id))} title="Excluir" style={iconBtn}><Trash2 size={15} /></button>
                </div>
              ))}
              <button onClick={() => { clearHistory(); setHistory([]); }} style={{ ...btnGhost, marginTop: 8, fontSize: 12.5, padding: "8px 13px" }}>
                <Trash2 size={14} /> Limpar histórico
              </button>
              <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: sans, marginTop: 10, lineHeight: 1.5, display: "flex", gap: 6 }}>
                <ShieldCheck size={13} style={{ flexShrink: 0, marginTop: 1 }} /> Guardado só neste aparelho e apagado automaticamente após 24h. Áudio não é salvo.
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1 — Captura de áudio */}
      <Section n={1} title="Gravar ou enviar o áudio">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {!recording ? (
            <button onClick={startRec} style={btnPrimary}><Mic size={17} /> Gravar</button>
          ) : (
            <button onClick={stopRec} style={{ ...btnPrimary, background: "#C53030" }}>
              <Square size={15} fill="#fff" /> Parar · {fmtTime(recSecs)}
            </button>
          )}
          <label style={{ ...btnGhost, cursor: "pointer" }}>
            <Upload size={16} /> Enviar áudio
            <input type="file" accept="audio/*" onChange={onUpload} style={{ display: "none" }} />
          </label>
          {recording && <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#C53030", fontFamily: sans, fontWeight: 600 }}><span className="anam-pulse" /> gravando…</span>}
        </div>
        {recording && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11, color: "var(--muted)", fontFamily: sans }}>
            <ShieldCheck size={13} color="#1E8449" /> A tela permanece ligada durante a gravação para não interromper.
          </div>
        )}

        {audioUrl && !recording && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <audio controls src={audioUrl} style={{ height: 38, maxWidth: "100%" }} />
            <button onClick={clearAudio} title="Descartar áudio" style={{ ...iconBtn }}><Trash2 size={15} /></button>
            <button onClick={doTranscribe} disabled={transcribing} style={{ ...btnPrimary, marginLeft: "auto", opacity: transcribing ? 0.6 : 1 }}>
              {transcribing ? <Loader2 size={16} className="anam-spin" /> : <FileText size={16} />} {transcribing ? "Transcrevendo…" : "Transcrever"}
            </button>
          </div>
        )}
      </Section>

      {/* 2 — Transcrição editável */}
      <Section n={2} title="Transcrição (revise e corrija)">
        <textarea
          value={transcript} onChange={e => setTranscript(e.target.value)} rows={7}
          placeholder="A transcrição aparecerá aqui. Você pode editar livremente antes de analisar."
          style={{ width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 120, padding: "12px 13px", borderRadius: 11, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 14, fontFamily: sans, lineHeight: 1.6, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <Field label="Idade"><input value={idade} onChange={e => setIdade(e.target.value)} placeholder="ex: 54a" style={miniInput} /></Field>
          <Field label="Sexo">
            <select value={sexo} onChange={e => setSexo(e.target.value)} style={{ ...miniInput, width: 120 }}>
              <option value="">—</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option>
            </select>
          </Field>
          <Field label="Observações (opcional)" grow><input value={nota} onChange={e => setNota(e.target.value)} placeholder="ex: HAS, diabético, alérgico a dipirona" style={{ ...miniInput, width: "100%" }} /></Field>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          {!streaming ? (
            <button onClick={analyze} disabled={!transcript.trim()} style={{ ...btnPrimary, background: ACCENT, opacity: transcript.trim() ? 1 : 0.5 }}>
              <Sparkles size={17} /> Analisar com IA
            </button>
          ) : (
            <button onClick={stopAnalyze} style={{ ...btnPrimary, background: "#C53030" }}><Square size={15} fill="#fff" /> Parar</button>
          )}
          {transcript.trim() && (
            <button onClick={() => copy(transcript, "t")} style={btnGhost}>
              {copied === "t" ? <Check size={15} color="#1E8449" /> : <Copy size={15} />} Copiar transcrição
            </button>
          )}
        </div>
      </Section>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-bd)", color: "var(--danger-fg)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, fontFamily: sans, display: "flex", gap: 8, alignItems: "center" }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* 3 — Análise */}
      {(analysis || streaming) && (
        <Section n={3} title="Análise clínica estruturada">
          <div style={{ fontSize: 13.5, fontFamily: sans, color: "var(--text)", lineHeight: 1.6 }}>
            <Markdown text={analysis} />
            {streaming && <span style={{ display: "inline-block", width: 7, height: 14, background: "var(--text)", marginLeft: 2, borderRadius: 1, verticalAlign: "middle", animation: "anamBlink 1s infinite" }} />}
          </div>
          {analysis && !streaming && (
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => copy(analysis, "a")} style={btnGhost}>
                {copied === "a" ? <Check size={15} color="#1E8449" /> : <Copy size={15} />} Copiar análise
              </button>
              <button onClick={() => copy(stripMd(analysis), "p")} style={btnGhost}>
                {copied === "p" ? <Check size={15} color="#1E8449" /> : <Copy size={15} />} Copiar texto puro
              </button>
              <button onClick={exportPDF} style={{ ...btnPrimary, background: ACCENT }}><FileDown size={16} /> Exportar PDF</button>
            </div>
          )}
        </Section>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10.5, color: "var(--muted)", fontFamily: sans, justifyContent: "center", lineHeight: 1.5, padding: "0 8px" }}>
        <Stethoscope size={13} /> Os CID-10 e hipóteses são sugestões da IA — confira antes de registrar em prontuário.
      </div>
    </div>
  );
}

// ── Subcomponentes/estilos ──
const Card = ({ children }) => (
  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 22, boxShadow: "var(--shadow-sm)", maxWidth: 460, margin: "0 auto" }}>{children}</div>
);
const Title = ({ Ic, color, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-strong)", marginBottom: 10 }}>
    <Ic size={18} color={color} /> {children}
  </div>
);
const Section = ({ n, title, children }) => (
  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
      <span style={{ width: 22, height: 22, borderRadius: "50%", background: ACCENT, color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans }}>{n}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans }}>{title}</span>
    </div>
    {children}
  </div>
);
const Field = ({ label, grow, children }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: grow ? "1 1 180px" : "0 0 auto" }}>
    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, fontWeight: 600 }}>{label}</span>
    {children}
  </label>
);

const txt = { fontSize: 13, color: "var(--text)", fontFamily: sans, lineHeight: 1.65, margin: "8px 0" };
const code = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", fontSize: 12.5, color: "var(--text)", whiteSpace: "pre-wrap", margin: "10px 0" };
const btnBase = { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 15px", borderRadius: 11, fontSize: 13.5, fontFamily: sans, fontWeight: 600, cursor: "pointer", border: "none" };
const btnPrimary = { ...btnBase, background: "#2B6CB0", color: "#fff" };
const btnGhost = { ...btnBase, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--input-border)" };
const iconBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer" };
const miniInput = { width: 90, boxSizing: "border-box", padding: "9px 11px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 14, fontFamily: sans, outline: "none" };

const spin = `@keyframes anamSpin{to{transform:rotate(360deg)}}.anam-spin{animation:anamSpin 1s linear infinite}@keyframes anamBlink{0%,100%{opacity:.2}50%{opacity:1}}@keyframes anamPulse{0%,100%{opacity:1}50%{opacity:.3}}.anam-pulse{display:inline-block;width:9px;height:9px;border-radius:50%;background:#C53030;animation:anamPulse 1s infinite}`;
