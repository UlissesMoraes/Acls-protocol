import { useState, useEffect, useRef } from "react";
import { Siren, Timer, Zap, Syringe, Pill, TriangleAlert, Wind, Check, ChevronDown, Activity, RotateCcw, Volume2, VolumeX, HeartPulse, Sparkles, FileText, Square } from "lucide-react";
import { shockableMed, H5, T5, ventilation } from "../data/acls.js";
import { streamChat, AIConfigError } from "../lib/aiClient.js";
import { buildRcpLogText } from "../lib/clinicalContext.js";

const sans = "var(--font)";
const CYCLE_S = 120;   // ciclo de RCP: 2 min
const EPI_S = 180;     // intervalo da adrenalina: 3 min
const BPM = 110;       // metrônomo: meio da faixa 100–120

const fmt = s => {
  const m = Math.floor(Math.max(0, s) / 60), r = Math.floor(Math.max(0, s) % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

// Anel circular de contagem do ciclo de 2 min
function CycleRing({ left }) {
  const R = 48, C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(1, left / CYCLE_S));
  const color = left <= 15 ? "#FC8181" : left <= 35 ? "#F6C453" : "#48BB78";
  return (
    <div style={{ position: "relative", width: 116, height: 116, flexShrink: 0 }}>
      <svg width="116" height="116" viewBox="0 0 116 116">
        <circle cx="58" cy="58" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="9" />
        <circle cx="58" cy="58" r={R} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 58 58)"
          style={{ transition: "stroke-dashoffset .5s linear, stroke .4s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{fmt(left)}</div>
        <div style={{ fontSize: 9, color: "#94A3B8", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", marginTop: 3 }}>ciclo</div>
      </div>
    </div>
  );
}

export default function CodeTimer() {
  const [startTs, setStartTs] = useState(null);
  const [endTs, setEndTs] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [phase, setPhase] = useState("idle");   // idle | analyze | shock | cpr
  const [rhythm, setRhythm] = useState(null);    // 'shock' | 'nonshock'
  const [airway, setAirway] = useState("basic"); // 'basic' | 'advanced'

  const [shocks, setShocks] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [cycleStart, setCycleStart] = useState(null);
  const [epiCount, setEpiCount] = useState(0);
  const [lastEpiTs, setLastEpiTs] = useState(null);
  const [amio300, setAmio300] = useState(false);
  const [amio150, setAmio150] = useState(false);
  const [doneCycle, setDoneCycle] = useState(-1);

  const [events, setEvents] = useState([]);
  const [metroOn, setMetroOn] = useState(false);
  const [showCauses, setShowCauses] = useState(false);
  const [copied, setCopied] = useState(false);
  const [narrative, setNarrative] = useState("");
  const [narrating, setNarrating] = useState(false);
  const [narrErr, setNarrErr] = useState(null);
  const [narrCopied, setNarrCopied] = useState(false);
  const audioRef = useRef(null);
  const narrAbort = useRef(null);

  const running = startTs !== null && endTs === null;
  const elapsed = startTs ? ((endTs || now) - startTs) / 1000 : 0;
  const cycleLeft = phase === "cpr" && cycleStart ? CYCLE_S - (now - cycleStart) / 1000 : null;
  const expired = phase === "cpr" && cycleLeft !== null && cycleLeft <= 0;
  const epiSince = lastEpiTs ? (now - lastEpiTs) / 1000 : null;
  const amioCount = (amio300 ? 1 : 0) + (amio150 ? 1 : 0);

  const log = label => setEvents(ev => [...ev, { t: startTs ? (Date.now() - startTs) / 1000 : 0, label }]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (expired) {
      setPhase("analyze");
      log("Fim do ciclo de 2 min — reavaliar ritmo");
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    }
  }, [expired]); // eslint-disable-line

  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock = null;
    const acquire = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch {} };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); if (lock) lock.release().catch(() => {}); };
  }, [running]);

  useEffect(() => {
    if (!metroOn || !running) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = audioRef.current || new Ctx();
    audioRef.current = ctx;
    if (ctx.state === "suspended") ctx.resume();
    const id = setInterval(() => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(); osc.stop(ctx.currentTime + 0.07);
    }, 60000 / BPM);
    return () => clearInterval(id);
  }, [metroOn, running]);

  // ── Medicação devida na fase atual ──
  let cycleMed = null;
  if (phase === "cpr") {
    if (rhythm === "shock") cycleMed = shockableMed(shocks);
    else if (rhythm === "nonshock" && (epiCount === 0 || (epiSince ?? 999) >= EPI_S))
      cycleMed = { key: "epi", label: "Adrenalina 1 mg", drug: "Adrenalina" };
  }
  const medPending = cycleMed && doneCycle !== cycle;

  // ── Handlers ──
  const start = () => {
    const t = Date.now();
    setStartTs(t); setEndTs(null); setNow(t);
    setPhase("analyze"); setRhythm(null);
    setShocks(0); setCycle(0); setCycleStart(null);
    setEpiCount(0); setLastEpiTs(null); setAmio300(false); setAmio150(false); setDoneCycle(-1);
    setEvents([{ t: 0, label: "Início da RCP — iniciar compressões e analisar ritmo" }]);
    if (navigator.vibrate) navigator.vibrate(80);
  };
  const beginCycle = () => { setCycle(c => c + 1); setCycleStart(Date.now()); setPhase("cpr"); };
  const chooseShockable = () => { setRhythm("shock"); setPhase("shock"); log("Ritmo CHOCÁVEL (FV/TV sem pulso)"); };
  const chooseNonShock = () => { setRhythm("nonshock"); log("Ritmo NÃO CHOCÁVEL (AESP/Assistolia)"); beginCycle(); };
  const deliverShock = () => {
    const n = shocks + 1;
    setShocks(n);
    log(`Choque nº ${n} aplicado — retomar RCP imediatamente`);
    if (navigator.vibrate) navigator.vibrate(150);
    setCycle(c => c + 1); setCycleStart(Date.now()); setPhase("cpr");
  };
  const giveMed = med => {
    if (med.key === "epi") { setEpiCount(c => c + 1); setLastEpiTs(Date.now()); }
    if (med.key === "amio300") setAmio300(true);
    if (med.key === "amio150") setAmio150(true);
    setDoneCycle(cycle);
    log(`${med.label} administrada`);
    if (navigator.vibrate) navigator.vibrate(60);
  };
  const recheck = () => { setPhase("analyze"); log("Reavaliação de ritmo (antecipada)"); };
  const rce = () => { setEndTs(Date.now()); setMetroOn(false); setPhase("idle"); log("RCE — retorno da circulação espontânea · cuidados pós-PCR"); };
  const reset = () => { setStartTs(null); setEndTs(null); setPhase("idle"); setRhythm(null); setEvents([]); setMetroOn(false); setNarrative(""); setNarrErr(null); narrAbort.current?.abort(); };

  const copyLog = async () => {
    const head = `REGISTRO DE RCP — ${new Date(startTs).toLocaleString("pt-BR")}\nDuração: ${fmt(elapsed)}\nChoques: ${shocks} · Adrenalina: ${epiCount} · Amiodarona: ${amioCount}\n\n`;
    const body = events.map(e => `${fmt(e.t)} — ${e.label}`).join("\n");
    try { await navigator.clipboard.writeText(head + body + "\n\nGerado pelo app Protocolos ACLS — conferir antes de registrar em prontuário."); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  // Gera o relatório de parada (narração) com IA, a partir do log estruturado.
  const generateNarrative = async () => {
    if (narrating || !events.length) return;
    setNarrErr(null); setNarrative("");
    const logText = buildRcpLogText({
      startTs, durationStr: fmt(elapsed), shocks, epiCount, amioCount,
      events: events.map(e => ({ tStr: fmt(e.t), label: e.label })),
    });
    setNarrating(true);
    const ctrl = new AbortController();
    narrAbort.current = ctrl;
    try {
      await streamChat({
        mode: "narrate", signal: ctrl.signal,
        messages: [{ role: "user", content: `Gere o relatório de parada a partir deste log:\n\n${logText}` }],
        onToken: d => setNarrative(prev => prev + d),
      });
    } catch (e) {
      if (e?.name !== "AbortError")
        setNarrErr(e instanceof AIConfigError ? "IA não configurada no servidor (defina OPENAI_API_KEY na Vercel)." : (e.message || "Falha ao gerar relatório."));
    } finally {
      setNarrating(false); narrAbort.current = null;
    }
  };
  const copyNarrative = async () => {
    try { await navigator.clipboard.writeText(narrative + "\n\nDocumento gerado por assistente — conferir antes de registrar em prontuário."); setNarrCopied(true); setTimeout(() => setNarrCopied(false), 2000); } catch {}
  };

  const vent = ventilation(airway);
  const chip = (Ic, n, c) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.08)", color: c, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20 }}>
      <Ic size={12} /> {n}
    </span>
  );

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <style>{`
        @keyframes rcpPulse { 0%,100% { box-shadow:0 0 0 0 rgba(197,48,48,0); } 50% { box-shadow:0 0 0 5px rgba(197,48,48,.16); } }
        @keyframes rcpMed   { 0%,100% { box-shadow:0 0 0 0 rgba(214,158,46,0); } 50% { box-shadow:0 0 0 5px rgba(214,158,46,.20); } }
        @keyframes rcpUp    { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes rcpBeat  { 0%,100%{ transform:scale(1);} 18%{ transform:scale(1.28);} 36%{ transform:scale(1);} }
        @keyframes rcpGlow  { 0%,100%{ box-shadow:0 0 0 0 rgba(197,48,48,.5);} 50%{ box-shadow:0 0 0 14px rgba(197,48,48,0);} }
        .rcp-pulse { animation: rcpPulse 1.3s ease-in-out infinite; }
        .rcp-med   { animation: rcpMed 1.1s ease-in-out infinite; }
        .rcp-up    { animation: rcpUp .28s ease-out; }
        .rcp-beat  { animation: rcpBeat ${(60/BPM).toFixed(3)}s ease-in-out infinite; }
        .rcp-start { animation: rcpGlow 1.8s ease-out infinite; }
        .rcp-act:active { transform: scale(.97); }
        @media (prefers-reduced-motion: reduce){ .rcp-pulse,.rcp-med,.rcp-up,.rcp-beat,.rcp-start{ animation:none; } }
      `}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(180deg,#FDEDEC,var(--surface))", borderBottom: "1px solid #C0392B22", padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>
          <HeartPulse size={18} color="#C53030" className={running ? "rcp-beat" : undefined} /> Copiloto de RCP — ACLS Adulto
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, marginTop: 2 }}>Guia passo a passo · medicações por ritmo · ciclos de 2 min · 5H/5T</div>
      </div>

      <div style={{ padding: "16px" }}>
        {/* IDLE */}
        {!startTs && (
          <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
            <div style={{ width: 76, height: 76, borderRadius: "50%", background: "#FDEDEC", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <HeartPulse size={38} color="#C53030" />
            </div>
            <button onClick={start} className="rcp-act rcp-start" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "20px", borderRadius: 14, border: "none", background: "#C53030", color: "#fff", fontSize: 19, fontFamily: sans, fontWeight: 900, cursor: "pointer", transition: "transform .1s" }}>
              <Siren size={24} /> INICIAR RCP
            </button>
            <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)", fontFamily: sans, lineHeight: 1.6 }}>
              O app guia cada etapa: análise do ritmo, choque, RCP de 2 min e a medicação correta de cada fase.
            </div>
          </div>
        )}

        {startTs && (
          <>
            {/* PLACAR */}
            <div style={{ background: "#0F141A", borderRadius: 16, padding: "16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Tempo de PCR</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>{fmt(elapsed)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {chip(Zap, shocks, "#FCA5A5")}
                  {chip(Syringe, epiCount, "#FCD9A5")}
                  {chip(Pill, amioCount, "#A5D8FC")}
                </div>
              </div>
              {phase === "cpr"
                ? <CycleRing left={cycleLeft} />
                : (
                  <div style={{ width: 116, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <div className="rcp-beat" style={{ width: 60, height: 60, borderRadius: "50%", background: phase === "shock" ? "#C53030" : "#1E293B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {phase === "shock" ? <Zap size={28} color="#fff" /> : <Activity size={28} color="#F6C453" />}
                    </div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{phase === "shock" ? "Desfibrilar" : "Analisar"}</div>
                  </div>
                )}
            </div>

            {/* HERO — PRÓXIMA AÇÃO */}
            {phase === "analyze" && (
              <div key="analyze" className="rcp-pulse rcp-up" style={{ border: "2px solid #C53030", background: "var(--danger-bg)", borderRadius: 14, padding: "14px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: "var(--danger-fg)", fontFamily: sans, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".03em" }}>
                  <Activity size={18} /> Analisar o ritmo
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={chooseShockable} className="rcp-act" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "16px 10px", borderRadius: 12, border: "1px solid #FC8181", background: "#C53030", color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 13, cursor: "pointer", minHeight: 76, transition: "transform .1s" }}>
                    <Zap size={24} /> Chocável<span style={{ fontSize: 10, fontWeight: 600, opacity: .9 }}>FV / TV sem pulso</span>
                  </button>
                  <button onClick={chooseNonShock} className="rcp-act" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "16px 10px", borderRadius: 12, border: "1px solid #90CDF4", background: "#2B6CB0", color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 13, cursor: "pointer", minHeight: 76, transition: "transform .1s" }}>
                    <Activity size={24} /> Não chocável<span style={{ fontSize: 10, fontWeight: 600, opacity: .9 }}>AESP / Assistolia</span>
                  </button>
                </div>
              </div>
            )}

            {phase === "shock" && (
              <div key="shock" className="rcp-pulse rcp-up" style={{ border: "2px solid #9B2C2C", background: "linear-gradient(180deg,#E0392B,#C53030)", borderRadius: 14, padding: "16px", marginBottom: 12, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 900, color: "#fff", fontFamily: sans, marginBottom: 4 }}>
                  <Zap size={20} /> DESFIBRILAR — Choque nº {shocks + 1}
                </div>
                <div style={{ fontSize: 12, color: "#FFE0E0", fontFamily: sans, marginBottom: 12 }}>Carga máxima (bifásico 200 J) · afastar todos · retomar RCP logo após</div>
                <button onClick={deliverShock} className="rcp-act" style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: "#fff", color: "#9B2C2C", fontFamily: sans, fontWeight: 900, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform .1s" }}>
                  <Check size={20} /> Choque aplicado → iniciar RCP
                </button>
              </div>
            )}

            {phase === "cpr" && (
              <div key="cpr" className="rcp-up" style={{ border: "1px solid var(--border)", borderRadius: 14, padding: "13px 14px", marginBottom: 12, background: "var(--surface-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <HeartPulse size={17} color="#C53030" className={metroOn ? "rcp-beat" : undefined} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-strong)", fontFamily: sans }}>RCP de alta qualidade</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: sans }}>100–120/min · 5–6 cm · retorno total do tórax · rodízio a cada 2 min</div>
                <button onClick={recheck} className="rcp-act" style={{ marginTop: 10, width: "100%", padding: "10px", borderRadius: 10, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--text)", fontFamily: sans, fontWeight: 700, fontSize: 12.5, cursor: "pointer", transition: "transform .1s" }}>
                  Reavaliar ritmo agora
                </button>
              </div>
            )}

            {/* MEDICAÇÃO */}
            {phase === "cpr" && medPending && (
              <div className="rcp-med rcp-up" style={{ border: "2px solid #D69E2E", background: "var(--warn-bg)", borderRadius: 14, padding: "14px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "var(--warn-fg)", fontFamily: sans, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                  <Syringe size={17} /> Próxima medicação
                </div>
                <div style={{ fontSize: 21, fontWeight: 900, color: "var(--warn-fg)", fontFamily: sans, marginBottom: 10 }}>{cycleMed.label}</div>
                <button onClick={() => giveMed(cycleMed)} className="rcp-act" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "#D69E2E", color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "transform .1s" }}>
                  <Check size={18} /> Confirmar administração
                </button>
              </div>
            )}
            {phase === "cpr" && rhythm === "shock" && !cycleMed && shocks < 2 && (
              <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: sans, marginBottom: 12, padding: "0 2px" }}>
                Sem medicação neste ciclo — adrenalina entra após o 2º choque.
              </div>
            )}

            {epiCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontFamily: sans, marginBottom: 12, padding: "9px 12px", borderRadius: 10, background: epiSince >= EPI_S ? "var(--warn-bg)" : "var(--surface-2)", color: epiSince >= EPI_S ? "var(--warn-fg)" : "var(--muted)", border: `1px solid ${epiSince >= EPI_S ? "var(--warn-bd)" : "var(--border)"}`, fontWeight: epiSince >= EPI_S ? 700 : 500 }}>
                <Syringe size={14} /> {epiSince >= EPI_S ? "Adrenalina liberada — última há " : "Última adrenalina há "}{fmt(epiSince)} <span style={{ opacity: .8 }}>(a cada 3–5 min)</span>
              </div>
            )}

            {/* 5H/5T */}
            <div className={rhythm === "nonshock" ? "rcp-med" : undefined} style={{ border: `1px solid ${rhythm === "nonshock" ? "#F6AD55" : "var(--border)"}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
              <button onClick={() => setShowCauses(s => !s)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: rhythm === "nonshock" ? "var(--warn-bg)" : "var(--surface-2)", border: "none", cursor: "pointer", fontFamily: sans }}>
                <TriangleAlert size={17} color="#C05621" />
                <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 800, color: "var(--warn-fg)" }}>Causas reversíveis — 5H e 5T</span>
                <ChevronDown size={18} color="var(--muted-2)" style={{ transform: showCauses ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {showCauses && (
                <div className="rcp-up" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--border)" }}>
                  <div style={{ padding: "10px 14px", borderRight: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#C05621", fontFamily: sans, marginBottom: 6 }}>5H</div>
                    {H5.map((h, i) => <div key={i} style={{ fontSize: 12, color: "var(--text)", fontFamily: sans, lineHeight: 1.7 }}>• {h}</div>)}
                  </div>
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#C05621", fontFamily: sans, marginBottom: 6 }}>5T</div>
                    {T5.map((t, i) => <div key={i} style={{ fontSize: 12, color: "var(--text)", fontFamily: sans, lineHeight: 1.7 }}>• {t}</div>)}
                  </div>
                </div>
              )}
            </div>

            {/* VENTILAÇÃO */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Wind size={17} color="#2B6CB0" />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans }}>{vent.txt}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, marginBottom: 10 }}>{vent.sub}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["basic", "Sem via aérea avançada"], ["advanced", "TOT / Supraglótico"]].map(([k, lbl]) => (
                  <button key={k} onClick={() => { setAirway(k); log(k === "advanced" ? "Via aérea avançada — ventilação contínua 1/6s" : "Sem via aérea avançada — 30:2"); }}
                    className="rcp-act"
                    style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 11, fontFamily: sans, fontWeight: 700, cursor: "pointer", transition: "transform .1s",
                      border: `1px solid ${airway === k ? "#2B6CB0" : "var(--input-border)"}`, background: airway === k ? "var(--info-bg)" : "var(--surface)", color: airway === k ? "#2B6CB0" : "var(--muted)" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTROLES */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button onClick={() => setMetroOn(m => !m)} className="rcp-act" style={{ flex: 1, minWidth: 130, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: `1px solid ${metroOn ? "#F6E05E" : "var(--input-border)"}`, background: metroOn ? "var(--warn-bg)" : "var(--surface)", color: metroOn ? "var(--warn-fg)" : "var(--muted)", fontFamily: sans, fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "transform .1s" }}>
                {metroOn ? <Volume2 size={16} className="rcp-beat" /> : <VolumeX size={16} />} Metrônomo {metroOn ? `${BPM}/min` : ""}
              </button>
              <button onClick={rce} className="rcp-act" style={{ flex: 1, minWidth: 130, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px", borderRadius: 10, border: "1px solid #276749", background: "#276749", color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 12, cursor: "pointer", transition: "transform .1s" }}>
                <Check size={16} /> RCE — circulação retornou
              </button>
            </div>

            {endTs && (
              <div className="rcp-up" style={{ background: "var(--ok-bg)", border: "1px solid var(--ok-bd)", borderRadius: 12, padding: "13px 14px", marginBottom: 12, fontSize: 13, color: "var(--ok-fg)", fontFamily: sans, lineHeight: 1.6 }}>
                <strong>RCE após {fmt(elapsed)}.</strong> Cuidados pós-PCR: SpO₂ 92–98%, PAS ≥ 90 (noradrenalina se preciso), alvo térmico 32–36 °C, ECG 12 derivações imediato.
              </div>
            )}

            {/* LOG */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ background: "var(--surface-2)", padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", fontFamily: sans }}>Registro do atendimento ({events.length})</span>
                <button onClick={copyLog} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid var(--input-border)", background: "var(--surface)", fontSize: 11, fontFamily: sans, fontWeight: 600, cursor: "pointer", color: "var(--text)" }}>
                  {copied ? "✓ Copiado!" : "Copiar"}
                </button>
              </div>
              <div style={{ maxHeight: 190, overflowY: "auto" }}>
                {[...events].reverse().map((e, i) => (
                  <div key={events.length - i} style={{ display: "flex", gap: 10, padding: "7px 12px", borderBottom: "1px solid var(--border-2)", fontSize: 12, fontFamily: sans }}>
                    <span style={{ fontWeight: 700, color: "#2B6CB0", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fmt(e.t)}</span>
                    <span style={{ color: "var(--text)" }}>{e.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RELATÓRIO DE PARADA (IA) */}
            <div style={{ border: "1px solid color-mix(in srgb,#7C3AED 35%,var(--border))", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ background: "color-mix(in srgb,#7C3AED 9%,var(--surface))", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, borderBottom: narrative || narrErr || narrating ? "1px solid var(--border)" : "none" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans }}>
                  <FileText size={15} color="#7C3AED" /> Relatório de parada (IA)
                </span>
                {narrating ? (
                  <button onClick={() => narrAbort.current?.abort()} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, border: "none", background: "#C53030", color: "#fff", fontSize: 11, fontFamily: sans, fontWeight: 700, cursor: "pointer" }}>
                    <Square size={11} fill="#fff" /> Parar
                  </button>
                ) : (
                  <button onClick={generateNarrative} disabled={!events.length} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 7, border: "none", background: events.length ? "#7C3AED" : "var(--border)", color: "#fff", fontSize: 11.5, fontFamily: sans, fontWeight: 700, cursor: events.length ? "pointer" : "default" }}>
                    <Sparkles size={13} /> {narrative ? "Refazer" : "Gerar"}
                  </button>
                )}
              </div>
              {(narrative || narrating) && (
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 12.5, color: "var(--text)", fontFamily: sans, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {narrative}{narrating && <span style={{ opacity: .5 }}>▍</span>}
                  </div>
                  {narrative && !narrating && (
                    <button onClick={copyNarrative} style={{ marginTop: 10, padding: "6px 14px", borderRadius: 7, border: "1px solid var(--input-border)", background: "var(--surface)", fontSize: 11.5, fontFamily: sans, fontWeight: 600, cursor: "pointer", color: "var(--text)" }}>
                      {narrCopied ? "✓ Copiado!" : "Copiar relatório"}
                    </button>
                  )}
                </div>
              )}
              {narrErr && (
                <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--danger-fg)", fontFamily: sans, background: "var(--danger-bg)" }}>{narrErr}</div>
              )}
              {!narrative && !narrating && !narrErr && (
                <div style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--muted)", fontFamily: sans, lineHeight: 1.5 }}>
                  Gera um texto cronológico do atendimento (ritmo, choques, medicações, desfecho) pronto para conferência e prontuário.
                </div>
              )}
            </div>

            <button onClick={reset} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid var(--input-border)", background: "var(--surface)", fontSize: 12, fontFamily: sans, color: "var(--muted)", cursor: "pointer" }}>
              <RotateCcw size={14} /> Reiniciar (limpa o registro)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
