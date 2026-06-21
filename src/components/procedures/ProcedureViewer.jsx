import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, RotateCcw, AlertTriangle, ListChecks, Ban, Package } from "lucide-react";
import IOScene from "./scenes/IOScene.jsx";
import IntubationScene from "./scenes/IntubationScene.jsx";
import ThoraxScene from "./scenes/ThoraxScene.jsx";
import RCPScene from "./scenes/RCPScene.jsx";

const sans = "var(--font)";
const SCENES = { io: IOScene, intub: IntubationScene, thorax: ThoraxScene, rcp: RCPScene };

const reduceMotion = typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function ProcedureViewer({ proc, onBack }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const Scene = SCENES[proc.scene];
  const last = proc.steps.length - 1;
  const timer = useRef(null);

  // Auto-play: avança os passos e para no final
  useEffect(() => {
    if (!playing) return;
    if (step >= last) { setPlaying(false); return; }
    timer.current = setTimeout(() => setStep(s => Math.min(last, s + 1)), 3600);
    return () => clearTimeout(timer.current);
  }, [playing, step, last]);

  const go = (n) => { setPlaying(false); setStep(Math.max(0, Math.min(last, n))); };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <style>{`
        .proc-split { display:flex; flex-direction:column; }
        .proc-3d { height:300px; }
        @media (min-width:860px){
          .proc-split { flex-direction:row; align-items:stretch; }
          .proc-3d { height:auto; flex:1 1 48%; min-height:440px; }
          .proc-text { flex:1 1 52%; max-height:560px; overflow-y:auto; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border)", background: `color-mix(in srgb,${proc.color} 8%,var(--surface))` }}>
        <button onClick={onBack} aria-label="Voltar aos procedimentos" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer" }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>{proc.label}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans }}>{proc.cat} · modelo 3D esquemático</div>
        </div>
      </div>

      <div className="proc-split">
        {/* 3D */}
        <div className="proc-3d" style={{ position: "relative", background: "#0F141A" }}>
          <Canvas dpr={[1, 1.8]} camera={{ position: [0, 0.4, 6.2], fov: 42 }} gl={{ antialias: true }}>
            <color attach="background" args={["#0F141A"]} />
            <ambientLight intensity={0.75} />
            <directionalLight position={[3, 5, 4]} intensity={1.1} />
            <directionalLight position={[-4, 2, -3]} intensity={0.45} />
            <Scene step={step} />
            <OrbitControls enablePan={false} minDistance={3.2} maxDistance={11}
              autoRotate={!reduceMotion && !playing} autoRotateSpeed={0.5} enableDamping />
          </Canvas>
          <div style={{ position: "absolute", left: 10, bottom: 10, fontSize: 10.5, color: "#7C8A99", fontFamily: sans, background: "rgba(15,20,26,.6)", padding: "3px 8px", borderRadius: 6, pointerEvents: "none" }}>
            arraste para girar · role para aproximar
          </div>
          {/* Controles de passo sobre o 3D */}
          <div style={{ position: "absolute", right: 10, bottom: 10, display: "flex", gap: 6 }}>
            <button onClick={() => go(step - 1)} disabled={step === 0} aria-label="Passo anterior" style={ctrl(step === 0)}><ChevronLeft size={18} /></button>
            <button onClick={() => setPlaying(p => !p)} aria-label={playing ? "Pausar" : "Reproduzir"} style={ctrl(false, proc.color)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
            {step === last
              ? <button onClick={() => go(0)} aria-label="Recomeçar" style={ctrl(false)}><RotateCcw size={16} /></button>
              : <button onClick={() => go(step + 1)} aria-label="Próximo passo" style={ctrl(false)}><ChevronRight size={18} /></button>}
          </div>
        </div>

        {/* Texto */}
        <div className="proc-text" style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
          {/* Passo atual em destaque */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: proc.color, fontFamily: sans, background: `color-mix(in srgb,${proc.color} 14%,var(--surface))`, padding: "3px 10px", borderRadius: 20 }}>
              Passo {step + 1} de {proc.steps.length}
            </span>
            <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${((step + 1) / proc.steps.length) * 100}%`, height: "100%", background: proc.color, transition: "width .3s" }} />
            </div>
          </div>

          {/* Lista de passos clicável */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {proc.steps.map((s, i) => {
              const on = i === step, done = i < step;
              return (
                <button key={i} onClick={() => go(i)} style={{ display: "flex", gap: 10, textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontFamily: sans,
                  border: `1px solid ${on ? proc.color : "var(--border)"}`, background: on ? `color-mix(in srgb,${proc.color} 9%,var(--surface))` : "var(--surface)" }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800,
                    background: on || done ? proc.color : "var(--border)", color: on || done ? "#fff" : "var(--muted)" }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: on ? 700 : 600, color: "var(--text-strong)" }}>{s.t}</span>
                    {on && <span style={{ display: "block", fontSize: 12.5, color: "var(--text)", marginTop: 3, lineHeight: 1.55 }}>{s.d}</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <Section Ic={ListChecks} color="#2B6CB0" title="Indicações" items={proc.indications} />
          <Section Ic={Ban} color="#C0392B" title="Contraindicações" items={proc.contra} />
          <Section Ic={Package} color="#0E7490" title="Materiais" items={proc.materials} />
          <Section Ic={AlertTriangle} color="#B7791F" title="Complicações" items={proc.complications} />

          <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--muted)", fontFamily: sans, lineHeight: 1.5 }}>
            Modelo 3D esquemático para treino e referência — a geometria e o movimento são ilustrativos, não foto-realistas. A execução é de responsabilidade do operador.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ Ic, color, title, items }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color, fontFamily: sans, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 7 }}>
        <Ic size={14} /> {title}
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "var(--text)", fontFamily: sans, lineHeight: 1.55, marginBottom: 4 }}>
          <span style={{ color, flexShrink: 0 }}>•</span>{it}
        </div>
      ))}
    </div>
  );
}

const ctrl = (disabled, bg) => ({
  display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 9,
  border: "none", background: bg || "rgba(255,255,255,.12)", color: "#fff",
  cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, backdropFilter: "blur(4px)",
});
