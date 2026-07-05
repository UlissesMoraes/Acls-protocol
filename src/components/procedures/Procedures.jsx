import { useState, lazy, Suspense } from "react";
import { Syringe, Wind, Droplets, HeartPulse, ChevronRight, Box, Loader2 } from "lucide-react";
import { PROCEDURES } from "../../data/procedures.js";

const sans = "var(--font)";
// O visualizador 3D (three.js) é carregado SÓ quando um procedimento é aberto.
const ProcedureViewer = lazy(() => import("./ProcedureViewer.jsx"));

const ICON = { io: Syringe, intub: Wind, thorax: Droplets, rcp: HeartPulse };

function Loader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "60px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 }}>
      <style>{`@keyframes procSpin{to{transform:rotate(360deg)}}`}</style>
      <Loader2 size={30} color="#2B6CB0" style={{ animation: "procSpin 1s linear infinite" }} />
      <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: sans }}>Carregando o modelo 3D…</div>
    </div>
  );
}

export default function Procedures() {
  const [sel, setSel] = useState(null);

  if (sel) {
    return (
      <Suspense fallback={<Loader />}>
        <ProcedureViewer proc={sel} onBack={() => setSel(null)} />
      </Suspense>
    );
  }

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ background: "color-mix(in srgb,#2B6CB0 8%,var(--surface))", borderBottom: "1px solid var(--border)", padding: "13px 16px", display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: "color-mix(in srgb,#2B6CB0 16%,var(--surface))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Box size={20} color="#2B6CB0" />
        </span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Procedimentos 3D</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans }}>Passo a passo com modelo tridimensional animado</div>
        </div>
      </div>

      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {PROCEDURES.map(p => {
          const Ic = ICON[p.scene] || Box;
          return (
            <button key={p.id} onClick={() => setSel(p)}
              style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", borderRadius: 12, cursor: "pointer", textAlign: "left", fontFamily: sans,
                background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `4px solid ${p.color}`, transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
              <span style={{ width: 44, height: 44, borderRadius: 11, background: `color-mix(in srgb,${p.color} 14%,var(--surface))`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic size={23} color={p.color} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)" }}>{p.label}</span>
                <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2, lineHeight: 1.4 }}>{p.sub}</span>
                <span style={{ display: "inline-block", marginTop: 6, fontSize: 10.5, fontWeight: 700, color: p.color, background: `color-mix(in srgb,${p.color} 12%,var(--surface))`, padding: "2px 8px", borderRadius: 20 }}>{p.steps.length} passos · {p.cat}</span>
              </span>
              <ChevronRight size={20} color="var(--muted-2)" style={{ flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      <div style={{ padding: "0 16px 14px", fontSize: 10.5, color: "var(--muted)", fontFamily: sans, lineHeight: 1.5 }}>
        Modelos 3D esquemáticos (geometria e movimento ilustrativos) renderizados no aparelho, sem servidor — funcionam offline. Apoio ao treino; a técnica final é do operador.
      </div>
    </div>
  );
}
