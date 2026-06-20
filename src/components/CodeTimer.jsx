import { useState, useEffect, useRef } from "react";
import { Siren, Timer, Zap, Syringe, TriangleAlert, Wind, Check, ChevronDown, Activity, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { shockableMed, H5, T5, ventilation } from "../data/acls.js";

const sans = "var(--font)";
const CYCLE_S = 120;   // ciclo de RCP: 2 min
const EPI_S = 180;     // intervalo da adrenalina: 3 min
const BPM = 110;       // metrônomo: meio da faixa 100–120

const fmt = s => {
  const m = Math.floor(Math.max(0, s) / 60), r = Math.floor(Math.max(0, s) % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

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
  const [doneCycle, setDoneCycle] = useState(-1); // ciclo em que a medicação da fase foi dada

  const [events, setEvents] = useState([]);
  const [metroOn, setMetroOn] = useState(false);
  const [showCauses, setShowCauses] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  const running = startTs !== null && endTs === null;
  const elapsed = startTs ? ((endTs || now) - startTs) / 1000 : 0;
  const cycleLeft = phase === "cpr" && cycleStart ? CYCLE_S - (now - cycleStart) / 1000 : null;
  const expired = phase === "cpr" && cycleLeft !== null && cycleLeft <= 0;
  const epiSince = lastEpiTs ? (now - lastEpiTs) / 1000 : null;

  const log = label => setEvents(ev => [...ev, { t: startTs ? (Date.now() - startTs) / 1000 : 0, label }]);

  // Relógio
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  // Fim do ciclo de 2 min → volta a analisar o ritmo
  useEffect(() => {
    if (expired) {
      setPhase("analyze");
      log("Fim do ciclo de 2 min — reavaliar ritmo");
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    }
  }, [expired]); // eslint-disable-line

  // Wake Lock — tela não apaga durante a ressuscitação
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock = null;
    const acquire = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch {} };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); if (lock) lock.release().catch(() => {}); };
  }, [running]);

  // Metrônomo (Web Audio)
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
  };

  const recheck = () => { setPhase("analyze"); log("Reavaliação de ritmo (antecipada)"); };
  const rce = () => { setEndTs(Date.now()); setMetroOn(false); setPhase("idle"); log("RCE — retorno da circulação espontânea · cuidados pós-PCR"); };
  const reset = () => { setStartTs(null); setEndTs(null); setPhase("idle"); setRhythm(null); setEvents([]); setMetroOn(false); };

  const copyLog = async () => {
    const head = `REGISTRO DE RCP — ${new Date(startTs).toLocaleString("pt-BR")}\nDuração: ${fmt(elapsed)}\nChoques: ${shocks} · Adrenalina: ${epiCount} · Amiodarona: ${(amio300 ? 1 : 0) + (amio150 ? 1 : 0)}\n\n`;
    const body = events.map(e => `${fmt(e.t)} — ${e.label}`).join("\n");
    try { await navigator.clipboard.writeText(head + body + "\n\nGerado pelo app Protocolos ACLS — conferir antes de registrar em prontuário."); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  // ── estilos auxiliares ──
  const tile = (bg) => ({ background: bg, borderRadius: 12, padding: "14px", textAlign: "center" });
  const vent = ventilation(airway);

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <style>{`
        @keyframes codePulse { 0%,100% { box-shadow:0 0 0 0 rgba(197,48,48,.0); } 50% { box-shadow:0 0 0 4px rgba(197,48,48,.18); } }
        @keyframes medPulse  { 0%,100% { box-shadow:0 0 0 0 rgba(214,158,46,.0); } 50% { box-shadow:0 0 0 4px rgba(214,158,46,.22); } }
        .code-pulse { animation: codePulse 1.3s ease-in-out infinite; }
        .med-pulse  { animation: medPulse 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .code-pulse,.med-pulse{ animation:none; } }
      `}</style>

      <div style={{ background: "#FDEDEC", borderBottom: "1px solid #C0392B33", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>
          <Timer size={17} color="#C53030" /> Copiloto de RCP — ACLS Adulto
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, marginTop: 2 }}>Guia passo a passo · medicações por ritmo · ciclos de 2 min · 5H/5T</div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        {!startTs && (
          <>
            <button onClick={start} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "20px", borderRadius: 10, border: "none", background: "#C53030", color: "#fff", fontSize: 18, fontFamily: sans, fontWeight: 900, cursor: "pointer", boxShadow: "0 2px 8px rgba(197,48,48,.4)" }}>
              <Siren size={22} /> INICIAR RCP
            </button>
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--muted)", fontFamily: sans, lineHeight: 1.6, textAlign: "center" }}>
              O app guia cada etapa: análise do ritmo, choque, RCP de 2 min e a medicação correta de cada fase.
            </div>
          </>
        )}

        {startTs && (
          <>
            {/* (3) tempo + contadores */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <div style={{ ...tile("#1A202C"), flex: 1, minWidth: 120 }}>
                <div style={{ fontSize: 10, color: "#A0AEC0", fontFamily: sans, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Tempo de PCR</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", fontFamily: sans, fontVariantNumeric: "tabular-nums" }}>{fmt(elapsed)}</div>
                <div style={{ fontSize: 11, color: "#A0AEC0", fontFamily: sans }}>{shocks} choque(s) · {epiCount} adren. · {(amio300 ? 1 : 0) + (amio150 ? 1 : 0)} amio.</div>
              </div>
              {phase === "cpr" && (
                <div style={{ ...tile(cycleLeft <= 15 ? "#C53030" : "#2D3748"), flex: 1, minWidth: 120, transition: "background .3s" }}>
                  <div style={{ fontSize: 10, color: "#E2E8F0", fontFamily: sans, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{cycleLeft <= 15 ? "Preparar reavaliação" : "RCP — ciclo 2 min"}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", fontFamily: sans, fontVariantNumeric: "tabular-nums" }}>{fmt(cycleLeft)}</div>
                  <div style={{ background: "rgba(255,255,255,.25)", borderRadius: 10, height: 5, overflow: "hidden", marginTop: 4 }}>
                    <div style={{ height: 5, background: "#fff", width: `${Math.max(0, (cycleLeft / CYCLE_S) * 100)}%`, transition: "width .5s linear" }} />
                  </div>
                </div>
              )}
            </div>

            {/* (1) PRÓXIMA AÇÃO — herói */}
            {phase === "analyze" && (
              <div className="code-pulse" style={{ border: "2px solid #C53030", background: "#FFF5F5", borderRadius: 12, padding: "14px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: "#9B2C2C", fontFamily: sans, marginBottom: 10 }}>
                  <Activity size={18} /> ANALISAR O RITMO
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={chooseShockable} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 10px", borderRadius: 10, border: "1px solid #FC8181", background: "#FED7D7", color: "#9B2C2C", fontFamily: sans, fontWeight: 800, fontSize: 13, cursor: "pointer", minHeight: 64 }}>
                    <Zap size={22} /> Chocável<span style={{ fontSize: 10, fontWeight: 600 }}>FV / TV sem pulso</span>
                  </button>
                  <button onClick={chooseNonShock} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "14px 10px", borderRadius: 10, border: "1px solid #90CDF4", background: "#EBF8FF", color: "#2C5282", fontFamily: sans, fontWeight: 800, fontSize: 13, cursor: "pointer", minHeight: 64 }}>
                    <Activity size={22} /> Não chocável<span style={{ fontSize: 10, fontWeight: 600 }}>AESP / Assistolia</span>
                  </button>
                </div>
              </div>
            )}

            {phase === "shock" && (
              <div className="code-pulse" style={{ border: "2px solid #C53030", background: "#C53030", borderRadius: 12, padding: "16px", marginBottom: 12, textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 900, color: "#fff", fontFamily: sans, marginBottom: 4 }}>
                  <Zap size={20} /> DESFIBRILAR — Choque nº {shocks + 1}
                </div>
                <div style={{ fontSize: 12, color: "#FFD7D7", fontFamily: sans, marginBottom: 12 }}>Carga máxima (bifásico 200 J). Afastar todos · retomar RCP logo após.</div>
                <button onClick={deliverShock} style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "#fff", color: "#9B2C2C", fontFamily: sans, fontWeight: 900, fontSize: 15, cursor: "pointer" }}>
                  ✓ Choque aplicado → iniciar RCP
                </button>
              </div>
            )}

            {phase === "cpr" && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", marginBottom: 12, background: "var(--surface-2)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-strong)", fontFamily: sans, marginBottom: 4 }}>RCP de alta qualidade — 2 minutos</div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: sans }}>100–120/min · 5–6 cm · retorno total do tórax · rodízio do compressor</div>
                <button onClick={recheck} style={{ marginTop: 10, width: "100%", padding: "9px", borderRadius: 8, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--text)", fontFamily: sans, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  Reavaliar ritmo agora
                </button>
              </div>
            )}

            {/* (2) MEDICAÇÃO da fase */}
            {phase === "cpr" && medPending && (
              <div className="med-pulse" style={{ border: "2px solid #D69E2E", background: "#FFFBEB", borderRadius: 12, padding: "14px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "#975A16", fontFamily: sans, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                  <Syringe size={17} /> Próxima medicação
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#744210", fontFamily: sans, marginBottom: 10 }}>{cycleMed.label}</div>
                <button onClick={() => giveMed(cycleMed)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px", borderRadius: 8, border: "none", background: "#D69E2E", color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                  <Check size={18} /> Confirmar administração
                </button>
              </div>
            )}
            {phase === "cpr" && rhythm === "shock" && !cycleMed && shocks < 2 && (
              <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: sans, marginBottom: 12, padding: "0 2px" }}>
                Sem medicação neste ciclo — adrenalina entra após o 2º choque.
              </div>
            )}

            {/* lembrete de adrenalina (segurança temporal) */}
            {epiCount > 0 && phase !== "idle" && (
              <div style={{ fontSize: 12, fontFamily: sans, marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: (epiSince >= EPI_S ? "#FEFCBF" : "var(--surface-2)"), color: (epiSince >= EPI_S ? "#744210" : "var(--muted)"), border: `1px solid ${epiSince >= EPI_S ? "#F6E05E" : "var(--border)"}`, fontWeight: epiSince >= EPI_S ? 700 : 400 }}>
                {epiSince >= EPI_S ? "⚠ Adrenalina liberada — última há " : "Última adrenalina há "}{fmt(epiSince)} (repetir a cada 3–5 min)
              </div>
            )}

            {/* (4) CAUSAS REVERSÍVEIS — 5H/5T */}
            <div style={{ border: `1px solid ${rhythm === "nonshock" ? "#F6AD55" : "var(--border)"}`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}
              className={rhythm === "nonshock" ? "med-pulse" : undefined}>
              <button onClick={() => setShowCauses(s => !s)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: rhythm === "nonshock" ? "#FFFAF0" : "var(--surface-2)", border: "none", cursor: "pointer", fontFamily: sans }}>
                <TriangleAlert size={17} color="#C05621" />
                <span style={{ flex: 1, textAlign: "left", fontSize: 13, fontWeight: 800, color: "#9C4221" }}>Verificar causas reversíveis (5H e 5T)</span>
                <ChevronDown size={18} color="var(--muted-2)" style={{ transform: showCauses ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {showCauses && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderTop: "1px solid var(--border)" }}>
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

            {/* (5) VENTILAÇÃO + via aérea */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Wind size={17} color="#2B6CB0" />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans }}>{vent.txt}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, marginBottom: 10 }}>{vent.sub}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["basic", "Sem via aérea avançada"], ["advanced", "TOT / Supraglótico"]].map(([k, lbl]) => (
                  <button key={k} onClick={() => { setAirway(k); log(k === "advanced" ? "Via aérea avançada — ventilação contínua 1/6s" : "Sem via aérea avançada — 30:2"); }}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 11, fontFamily: sans, fontWeight: 700, cursor: "pointer",
                      border: `1px solid ${airway === k ? "#2B6CB0" : "var(--input-border)"}`, background: airway === k ? "#EBF8FF" : "var(--surface)", color: airway === k ? "#2B6CB0" : "var(--muted)" }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* secundário */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button onClick={() => setMetroOn(m => !m)} style={{ flex: 1, minWidth: 130, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 8, border: `1px solid ${metroOn ? "#F6E05E" : "var(--input-border)"}`, background: metroOn ? "#FEFCBF" : "var(--surface)", color: metroOn ? "#744210" : "var(--muted)", fontFamily: sans, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {metroOn ? <Volume2 size={16} /> : <VolumeX size={16} />} Metrônomo {metroOn ? `${BPM}` : ""}
              </button>
              <button onClick={rce} style={{ flex: 1, minWidth: 130, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 8, border: "1px solid #276749", background: "#276749", color: "#fff", fontFamily: sans, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
                <Check size={16} /> RCE — circulação retornou
              </button>
            </div>

            {endTs && (
              <div style={{ background: "#C6F6D5", border: "1px solid #9AE6B4", borderRadius: 8, padding: "12px 14px", marginBottom: 12, fontSize: 13, color: "#276749", fontFamily: sans, lineHeight: 1.6 }}>
                <strong>RCE após {fmt(elapsed)}.</strong> Cuidados pós-PCR: SpO₂ 92–98%, PAS ≥ 90 (noradrenalina se preciso), alvo térmico 32–36 °C, ECG 12 derivações imediato.
              </div>
            )}

            {/* log */}
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ background: "var(--surface-2)", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
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

            <button onClick={reset} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid var(--input-border)", background: "var(--surface)", fontSize: 12, fontFamily: sans, color: "var(--muted)", cursor: "pointer" }}>
              <RotateCcw size={14} /> Reiniciar (limpa o registro)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
