import { useState, useEffect, useRef } from "react";

const sans = "sans-serif";
const CYCLE_S = 120;   // ciclo de RCP: 2 min
const EPI_S = 180;     // intervalo mínimo de adrenalina: 3 min
const BPM = 110;       // metrônomo: meio da faixa 100–120

const fmt = s => {
  const m = Math.floor(Math.max(0, s) / 60), r = Math.floor(Math.max(0, s) % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

export default function CodeTimer() {
  const [startTs, setStartTs] = useState(null);
  const [endTs, setEndTs] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [cycleTs, setCycleTs] = useState(null);
  const [epiTs, setEpiTs] = useState(null);
  const [events, setEvents] = useState([]);
  const [metroOn, setMetroOn] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  const running = startTs !== null && endTs === null;

  // Relógio do atendimento
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  // Wake Lock — impede a tela de apagar durante a ressuscitação
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock = null;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request("screen"); } catch { /* negado/indisponível */ }
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (lock) { lock.release().catch(() => {}); lock = null; }
    };
  }, [running]);

  // Metrônomo de compressões (Web Audio)
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

  const elapsed = startTs ? ((endTs || now) - startTs) / 1000 : 0;
  const cycleLeft = cycleTs ? CYCLE_S - (now - cycleTs) / 1000 : 0;
  const epiElapsed = epiTs ? (now - epiTs) / 1000 : null;
  const epiReady = epiElapsed === null || epiElapsed >= EPI_S;
  const cycleUrgent = running && cycleLeft <= 15;

  const log = label => setEvents(ev => [...ev, { t: (Date.now() - startTs) / 1000, label }]);

  const start = () => {
    const t = Date.now();
    setStartTs(t); setEndTs(null); setNow(t); setCycleTs(t); setEpiTs(null);
    setEvents([{ t: 0, label: "Início da RCP — PCR identificada" }]);
    if (navigator.vibrate) navigator.vibrate(80);
  };
  const newCycle = () => { setCycleTs(Date.now()); log("Checagem de ritmo / troca de compressor — novo ciclo de 2 min"); };
  const shock = () => { setCycleTs(Date.now()); log("CHOQUE — desfibrilação aplicada (retomar RCP imediatamente)"); };
  const epi = () => { setEpiTs(Date.now()); log("Adrenalina 1 mg IV/IO administrada"); };
  const amio = () => log("Amiodarona 300 mg IV administrada");
  const rce = () => { setEndTs(Date.now()); setMetroOn(false); log("RCE — Retorno da Circulação Espontânea · iniciar cuidados pós-PCR"); };
  const reset = () => { setStartTs(null); setEndTs(null); setCycleTs(null); setEpiTs(null); setEvents([]); setMetroOn(false); };

  const copyLog = async () => {
    const head = `REGISTRO DE RCP — ${new Date(startTs).toLocaleString("pt-BR")}\nDuração total: ${fmt(elapsed)}\n`;
    const lines = events.map(e => `${fmt(e.t)} — ${e.label}`).join("\n");
    const shocks = events.filter(e => e.label.startsWith("CHOQUE")).length;
    const epis = events.filter(e => e.label.startsWith("Adrenalina")).length;
    const txt = `${head}Choques: ${shocks} · Adrenalina: ${epis} dose(s)\n\n${lines}\n\nGerado pelo app Protocolos ACLS — conferir antes de registrar em prontuário.`;
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard indisponível */ }
  };

  const btn = (bg, fg, br) => ({ padding:"12px 14px", borderRadius:8, border:`1px solid ${br}`, background:bg, color:fg, fontSize:13, fontFamily:sans, fontWeight:700, cursor:"pointer", minHeight:48 });
  const shocks = events.filter(e => e.label.startsWith("CHOQUE")).length;
  const epis = events.filter(e => e.label.startsWith("Adrenalina")).length;

  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ background:"#FDEDEC", borderBottom:"1px solid #C0392B33", padding:"12px 16px" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:15, fontWeight:700, color:"var(--text-strong)" }}>⏱️ Modo Código — Timers de RCP</div>
        <div style={{ fontSize:11, color:"var(--muted)", fontFamily:sans, marginTop:2 }}>Cronômetro do atendimento · ciclos de 2 min · metrônomo {BPM} bpm · log de eventos</div>
      </div>

      <div style={{ padding:"14px 16px" }}>
        {!startTs && (
          <button onClick={start} style={{ width:"100%", padding:"20px", borderRadius:10, border:"none", background:"#C53030", color:"#fff", fontSize:18, fontFamily:sans, fontWeight:900, cursor:"pointer", boxShadow:"0 2px 8px rgba(197,48,48,.4)" }}>
            🚨 INICIAR RCP
          </button>
        )}

        {startTs && (
          <>
            {/* Cronômetros principais */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
              <div style={{ background:"#1A202C", borderRadius:10, padding:"14px", textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#A0AEC0", fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>Tempo de PCR</div>
                <div style={{ fontSize:38, fontWeight:900, color:"#fff", fontFamily:sans, fontVariantNumeric:"tabular-nums" }}>{fmt(elapsed)}</div>
                <div style={{ fontSize:11, color:"#A0AEC0", fontFamily:sans }}>⚡ {shocks} choque(s) · 💉 {epis} adrenalina(s)</div>
              </div>
              <div style={{ background: cycleUrgent ? "#C53030" : "#2D3748", borderRadius:10, padding:"14px", textAlign:"center", transition:"background .3s" }}>
                <div style={{ fontSize:11, color:"#E2E8F0", fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  {running ? (cycleUrgent ? "CHECAR RITMO / TROCAR" : "Ciclo de 2 min") : "Atendimento encerrado"}
                </div>
                <div style={{ fontSize:38, fontWeight:900, color:"#fff", fontFamily:sans, fontVariantNumeric:"tabular-nums" }}>{running ? fmt(cycleLeft) : "—"}</div>
                {running && (
                  <div style={{ background:"rgba(255,255,255,.25)", borderRadius:10, height:6, overflow:"hidden" }}>
                    <div style={{ height:6, background:"#fff", width:`${Math.max(0, (cycleLeft / CYCLE_S) * 100)}%`, transition:"width .5s linear" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Status da adrenalina */}
            {running && (
              <div style={{ background: epiReady ? "#C6F6D5" : "#FEFCBF", border:`1px solid ${epiReady ? "#9AE6B4" : "#F6E05E"}`, borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:13, fontFamily:sans, fontWeight:700, color: epiReady ? "#276749" : "#744210" }}>
                {epiElapsed === null
                  ? "💉 Adrenalina ainda não administrada — na FV/TVsp, após o 2º choque; na AESP/assistolia, o quanto antes"
                  : epiReady
                  ? `💉 ADRENALINA LIBERADA — última dose há ${fmt(epiElapsed)}`
                  : `💉 Próxima adrenalina em ${fmt(EPI_S - epiElapsed)} (última há ${fmt(epiElapsed)})`}
              </div>
            )}

            {/* Ações */}
            {running && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:8, marginBottom:14 }}>
                <button onClick={shock} style={btn("#FED7D7", "#9B2C2C", "#FC8181")}>⚡ Choque</button>
                <button onClick={epi} style={btn(epiReady ? "#C6F6D5" : "#EDF2F7", epiReady ? "#276749" : "#A0AEC0", epiReady ? "#9AE6B4" : "#E2E8F0")}>💉 Adrenalina 1 mg</button>
                <button onClick={amio} style={btn("#EBF8FF", "#2B6CB0", "#BEE3F8")}>💊 Amiodarona 300 mg</button>
                <button onClick={newCycle} style={btn("#F7FAFC", "#4A5568", "#CBD5E0")}>🔄 Ritmo checado</button>
                <button onClick={()=>setMetroOn(m=>!m)} style={btn(metroOn ? "#FEFCBF" : "#F7FAFC", metroOn ? "#744210" : "#4A5568", metroOn ? "#F6E05E" : "#CBD5E0")}>
                  {metroOn ? `🔊 Metrônomo ON (${BPM})` : "🔇 Metrônomo"}
                </button>
                <button onClick={rce} style={btn("#276749", "#fff", "#276749")}>✅ RCE — circulação retornou</button>
              </div>
            )}

            {endTs && (
              <div style={{ background:"#C6F6D5", border:"1px solid #9AE6B4", borderRadius:8, padding:"12px 14px", marginBottom:14, fontSize:13, color:"#276749", fontFamily:sans, lineHeight:1.6 }}>
                <strong>✅ RCE após {fmt(elapsed)}.</strong> Cuidados pós-PCR: SpO₂ 92–98%, PAS ≥ 90 (noradrenalina se necessário), temperatura-alvo 32–36 °C, ECG 12 derivações imediato.
              </div>
            )}

            {/* Log de eventos */}
            <div style={{ border:"1px solid var(--border)", borderRadius:8, overflow:"hidden", marginBottom:12 }}>
              <div style={{ background:"var(--surface-2)", padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:12, fontWeight:700, color:"var(--text)", fontFamily:sans }}>📋 Log do atendimento ({events.length})</span>
                <button onClick={copyLog} style={{ padding:"4px 12px", borderRadius:6, border:"1px solid var(--input-border)", background:"var(--surface)", fontSize:11, fontFamily:sans, fontWeight:600, cursor:"pointer", color:"var(--text)" }}>
                  {copied ? "✓ Copiado!" : "Copiar log"}
                </button>
              </div>
              <div style={{ maxHeight:200, overflowY:"auto" }}>
                {[...events].reverse().map((e, i) => (
                  <div key={events.length - i} style={{ display:"flex", gap:10, padding:"7px 12px", borderBottom:"1px solid var(--border-2)", fontSize:12, fontFamily:sans }}>
                    <span style={{ fontWeight:700, color:"#2B6CB0", fontVariantNumeric:"tabular-nums", flexShrink:0 }}>{fmt(e.t)}</span>
                    <span style={{ color:"var(--text)" }}>{e.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={reset} style={{ padding:"8px 14px", borderRadius:6, border:"1px solid var(--input-border)", background:"var(--surface)", fontSize:12, fontFamily:sans, color:"var(--muted)", cursor:"pointer" }}>
              ↺ Reiniciar (limpa o registro)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
