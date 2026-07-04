import { useState, useMemo } from "react";
import { Gauge, Activity, Wind, FlaskConical, Droplet, AlertTriangle, Stethoscope } from "lucide-react";
import { analyzeGas } from "../lib/gasometria.js";

const sans = "var(--font)";
const ACCENT = "#0E7490";

const FIELDS = [
  { k: "ph", label: "pH", ph: "7,40", req: true },
  { k: "pco2", label: "PaCO₂ (mmHg)", ph: "40", req: true },
  { k: "hco3", label: "HCO₃⁻ (mEq/L)", ph: "24", req: true },
  { k: "na", label: "Na⁺ (mEq/L)", ph: "140" },
  { k: "cl", label: "Cl⁻ (mEq/L)", ph: "104" },
  { k: "pao2", label: "PaO₂ (mmHg)", ph: "90" },
  { k: "fio2", label: "FiO₂ (%)", ph: "21" },
  { k: "lactato", label: "Lactato (mmol/L)", ph: "1,5" },
];

export default function GasometriaTool() {
  const [v, setV] = useState({});
  const set = (k, x) => setV(p => ({ ...p, [k]: x }));
  const res = useMemo(() => analyzeGas(v), [v]);

  const acidColor = res.valid && res.phStatus === "acidemia" ? "#C0392B" : res.valid && res.phStatus === "alcalemia" ? "#2471A3" : "#1E8449";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Entradas */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Gauge size={18} color={ACCENT} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans }}>Gasometria arterial</span>
          <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, marginLeft: "auto" }}>pH · PaCO₂ · HCO₃⁻ obrigatórios</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
          {FIELDS.map(f => (
            <label key={f.k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11.5, color: f.req ? "var(--text-strong)" : "var(--muted)", fontFamily: sans, fontWeight: f.req ? 700 : 600 }}>{f.label}{f.req && " *"}</span>
              <input type="text" inputMode="decimal" value={v[f.k] || ""} onChange={e => set(f.k, e.target.value)} placeholder={f.ph}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 11px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 15, fontFamily: sans, outline: "none" }} />
            </label>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--muted)", fontFamily: sans, marginTop: 10 }}>Referências: pH 7,35–7,45 · PaCO₂ 35–45 · HCO₃⁻ 22–26 · AG 8–12 · aceita vírgula (ex.: 7,32).</div>
      </div>

      {/* Resultado */}
      {res.valid && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ background: `color-mix(in srgb,${acidColor} 10%,var(--surface))`, border: `1px solid color-mix(in srgb,${acidColor} 30%,var(--surface))`, borderRadius: 12, padding: "11px 13px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: acidColor, fontFamily: sans, textTransform: "uppercase", letterSpacing: ".04em" }}>Interpretação</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans, marginTop: 3, lineHeight: 1.4 }}>{res.conclusion}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: sans, marginTop: 3 }}>
              pH {res.ph} ({res.phStatus}) · PaCO₂ {res.pco2} · HCO₃⁻ {res.hco3}
            </div>
          </div>

          {res.primary && <Row Ic={Activity} color="#6C2377" title="Distúrbio primário" text={res.primary.label} />}
          {res.compensation && <Row Ic={Wind} color={res.compensation.adequate ? "#1E8449" : "#B7791F"} title="Compensação" text={res.compensation.text} />}
          {res.anionGap && <Row Ic={FlaskConical} color={res.anionGap.high ? "#C0392B" : "#2B6CB0"} title="Ânion gap" text={res.anionGap.text} />}
          {res.correctedHco3 && <Row Ic={FlaskConical} color="#7D6608" title="HCO₃⁻ corrigido (delta)" text={res.correctedHco3.text} />}
          {res.oxygenation && <Row Ic={Droplet} color={res.oxygenation.hypoxemia ? "#C0392B" : "#0E7490"} title="Oxigenação" text={res.oxygenation.text} />}

          <div style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 10.5, color: "var(--muted)", fontFamily: sans, lineHeight: 1.5, marginTop: 2 }}>
            <Stethoscope size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            Apoio à decisão — interprete junto ao quadro clínico. Correlacione com a clínica; distúrbios mistos são comuns. Corrigir o ânion gap pela albumina em hipoalbuminemia.
          </div>
        </div>
      )}

      {!res.valid && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--info-bg)", border: "1px solid var(--info-bd)", borderRadius: 10, padding: "11px 13px", fontSize: 12.5, color: "#2B6CB0", fontFamily: sans }}>
          <AlertTriangle size={16} /> Preencha ao menos <strong>pH</strong>, <strong>PaCO₂</strong> e <strong>HCO₃⁻</strong> para a análise.
        </div>
      )}
    </div>
  );
}

function Row({ Ic, color, title, text }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: `color-mix(in srgb,${color} 14%,var(--surface))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ic size={16} color={color} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, color, fontFamily: sans, textTransform: "uppercase", letterSpacing: ".03em" }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "var(--text)", fontFamily: sans, lineHeight: 1.5, marginTop: 1 }}>{text}</div>
      </div>
    </div>
  );
}
