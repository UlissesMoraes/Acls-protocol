import { useState } from "react";
import { Baby, Scale, ArrowRight } from "lucide-react";
import { weightFromAge } from "../data/pals.js";
import { toNum } from "../utils/format.js";

const sans = "var(--font)";
const C = "#0E7490";

// Estimador de peso por idade (fórmulas APLS) — quando o peso real é desconhecido.
// Se `onApply` for fornecido, permite usar o peso estimado como peso global do app.
export default function PedWeight({ onApply, currentWeight }) {
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("");

  const y = Math.max(0, Math.floor(toNum(years) || 0));
  const m = Math.max(0, Math.floor(toNum(months) || 0));
  const est = (y > 0 || m > 0) ? weightFromAge({ years: y, months: m }) : null;
  const tooOld = (y > 0 || m > 0) && est === null && (y * 12 + m) > 0;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ background: `color-mix(in srgb,${C} 9%,var(--surface))`, borderBottom: "1px solid var(--border)", padding: "13px 16px", display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb,${C} 16%,var(--surface))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Baby size={20} color={C} />
        </span>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Estimador de peso por idade</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans }}>Fórmulas APLS — use quando o peso real for desconhecido</div>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--muted)", fontFamily: sans, fontWeight: 700, marginBottom: 4 }}>Anos</label>
            <input value={years} onChange={e => setYears(e.target.value)} type="number" inputMode="numeric" min={0} max={18} placeholder="0"
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 16, fontFamily: sans, outline: "none" }} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--muted)", fontFamily: sans, fontWeight: 700, marginBottom: 4 }}>Meses (se &lt; 1 ano)</label>
            <input value={months} onChange={e => setMonths(e.target.value)} type="number" inputMode="numeric" min={0} max={11} placeholder="0"
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 16, fontFamily: sans, outline: "none" }} />
          </div>
        </div>

        {est !== null && (
          <div style={{ marginTop: 14, background: `color-mix(in srgb,${C} 8%,var(--surface))`, border: `1px solid color-mix(in srgb,${C} 30%,var(--border))`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Scale size={16} color={C} />
              <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: sans, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Peso estimado</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: C, fontFamily: sans }}>{String(est).replace(".", ",")} kg</div>
            {onApply && (
              <button onClick={() => onApply(String(est))} style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: C, color: "#fff", fontSize: 13, fontFamily: sans, fontWeight: 700, cursor: "pointer" }}>
                Usar como peso do paciente <ArrowRight size={15} />
              </button>
            )}
            {currentWeight && <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--muted)", fontFamily: sans }}>Peso atual no app: {currentWeight} kg</div>}
          </div>
        )}

        {tooOld && (
          <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--warn-fg)", background: "var(--warn-bg)", border: "1px solid var(--warn-bd)", borderRadius: 10, padding: "11px 14px", fontFamily: sans, lineHeight: 1.5 }}>
            Acima de 12 anos as fórmulas não se aplicam — use o peso real (ou dose de adulto quando o peso ≥ adulto).
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 11, color: "var(--muted)", fontFamily: sans, lineHeight: 1.6 }}>
          <strong>Fórmulas:</strong> 0–12 m: (meses ÷ 2) + 4 · 1–5 a: (anos × 2) + 8 · 6–12 a: (anos × 3) + 7.
          Estimativa para emergência — confirme com o peso real assim que possível (fita de Broselow, balança).
        </div>
      </div>
    </div>
  );
}
