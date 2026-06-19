import { useState } from "react";
import { FORMULAS } from "../data/formulas.js";
import { toNum } from "../utils/format.js";

// ─── DOSE CALCULATOR ──────────────────────────────────────────────────────────
export default function DoseCalc({ drugName, protocolId, color, light, border, globalW }) {
  const [local, setLocal] = useState("");
  const key = `${drugName}|${protocolId}`;
  const fn = FORMULAS[key];
  const w = local !== "" ? local : (globalW || "");
  const wNum = toNum(w);
  const usingGlobal = local === "" && !!globalW;
  const calc = fn && wNum > 0 ? fn(wNum) : null;
  return (
    <div style={{ marginTop:12, background:light, border:`1px solid ${border}55`, borderRadius:8, padding:"10px 14px" }}>
      <div style={{ fontSize:11, color:color, fontFamily:"sans-serif", fontWeight:700, marginBottom:8 }}>⚖️ Calculadora de Dose por Peso</div>
      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
        <input type="number" inputMode="decimal" placeholder="Peso (kg)" min={1} max={300} value={w} onChange={e=>setLocal(e.target.value)}
          aria-label={`Peso do paciente para cálculo de dose de ${drugName}`}
          style={{ width:110, border:"1px solid var(--input-border)", borderRadius:6, padding:"8px 10px", fontSize:16, fontFamily:"sans-serif", outline:"none", background:"var(--surface)" }} />
        <span style={{ fontSize:12, color:"var(--muted)", fontFamily:"sans-serif" }}>kg</span>
        {usingGlobal && <span style={{ fontSize:11, color:color, fontFamily:"sans-serif", background:"var(--surface)", border:`1px solid ${border}44`, padding:"2px 8px", borderRadius:12 }}>usando peso do paciente</span>}
        {!fn && w && <span style={{ fontSize:12, color:"var(--muted-2)", fontFamily:"sans-serif", fontStyle:"italic" }}>Dose fixa — ver campo Dose acima</span>}
      </div>
      {calc && (
        <div style={{ marginTop:10, background:"var(--surface)", border:`1px solid ${border}44`, borderRadius:6, padding:"10px 12px" }}>
          <div style={{ fontSize:15, fontWeight:700, color:color, fontFamily:"sans-serif", marginBottom:6 }}>{calc.result}</div>
          {calc.details.map((d,i) => (
            <div key={i} style={{ fontSize:12, color:"var(--text)", fontFamily:"sans-serif", lineHeight:1.5, display:"flex", gap:6 }}>
              <span style={{ color:border, flexShrink:0 }}>·</span>{d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
