import { useState } from "react";
import { Info } from "lucide-react";
import { SCORES_DEF } from "../data/scores.js";
import { normVals } from "../utils/format.js";

// ─── SCORE WIDGET ──────────────────────────────────────────────────────────────
export default function ScoreWidget({ scoreKey, color, light, border, globalW }) {
  const sc = SCORES_DEF[scoreKey];
  const [checks, setChecks] = useState({});
  const [nums, setNums]     = useState({});
  const [selects, setSelects] = useState({});
  const [bools, setBools]   = useState({});
  const [nihssVals, setNihssVals] = useState({});
  if (!sc) return null;

  // Campos de peso herdam o peso global do paciente quando não preenchidos localmente
  const numVal = k => (nums[k] !== undefined ? nums[k] : (k === "peso" && globalW ? String(globalW) : ""));
  const numsResolved = () => {
    const out = { ...nums };
    if (globalW && nums.peso === undefined && (sc.inputs||[]).some(i=>i.k==="peso")) out.peso = String(globalW);
    return out;
  };

  const sans = "var(--font)";
  const BD = "var(--border)";

  const isScale = sc.type === "nihss_scale" || sc.type === "scale";
  // Valor de um item de escala: seleção do usuário ou padrão clínico do item (ex: GCS inicia normal)
  const scaleVal = it => nihssVals[it.k] !== undefined ? parseInt(nihssVals[it.k]) : (it.def ?? 0);

  // ── Calcular total por tipo ──
  let total = 0;
  if (sc.type === "check") {
    total = (sc.fields||[]).reduce((a,f) => a + (checks[f.k] ? f.pts : 0), 0);
  } else if (sc.type === "calc") {
    total = sc.formula(normVals({...numsResolved(), ...selects}));
  } else if (sc.type === "grace_calc") {
    total = sc.calcPoints(normVals({...nums, ...selects, ...bools}));
  } else if (isScale) {
    total = (sc.items||[]).reduce((a,it) => a + scaleVal(it), 0);
  }

  const interp = sc.interp(total);

  return (
    <div style={{ background:"var(--surface)", border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden", marginBottom:16, boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
      {/* Header */}
      <div style={{ background:light, borderBottom:`1px solid ${border}33`, padding:"12px 16px" }}>
        <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:700, color:"var(--text-strong)" }}>{sc.label}</div>
        <div style={{ fontSize:11, color:"var(--muted)", fontFamily:sans, marginTop:2 }}>{sc.sub}</div>
        {sc.ref && <div style={{ fontSize:10, color:"var(--muted-2)", fontFamily:sans, marginTop:4, fontStyle:"italic" }}>Ref: {sc.ref}</div>}
      </div>

      <div style={{ padding:"14px 16px" }}>
        {/* Nota clínica */}
        {sc.note && (
          <div style={{ display:"flex", gap:8, background:"#EBF8FF", border:"1px solid #BEE3F8", borderRadius:6, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#2C5282", fontFamily:sans, lineHeight:1.5 }}>
            <Info size={15} style={{ flexShrink:0, marginTop:1 }} /> <span>{sc.note}</span>
          </div>
        )}

        {/* ── TIPO: check (qSOFA, CHA₂DS₂-VASc) ── */}
        {sc.type === "check" && (sc.fields||[]).map(f => (
          <div key={f.k}>
            <label style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom:`1px solid var(--border-2)`, cursor:"pointer" }}>
              <input type="checkbox" checked={!!checks[f.k]} onChange={() => setChecks(p=>({...p,[f.k]:!p[f.k]}))}
                style={{ width:16, height:16, accentColor:color, cursor:"pointer", flexShrink:0, marginTop:2 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:"var(--text)", fontFamily:sans, fontWeight:600 }}>{f.label}</div>
                {f.detail && <div style={{ fontSize:11, color:"var(--muted)", fontFamily:sans, marginTop:2, lineHeight:1.4 }}>{f.detail}</div>}
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--muted)", fontFamily:sans, background:"var(--border-2)", padding:"2px 8px", borderRadius:12, flexShrink:0 }}>+{f.pts}</span>
            </label>
          </div>
        ))}

        {/* ── TIPO: calc (Osmolaridade, ClCr, QTc, fórmulas) ── */}
        {sc.type === "calc" && (sc.inputs||[]).map(inp => (
          <div key={inp.k} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:"var(--muted)", fontFamily:sans, fontWeight:700, display:"block", marginBottom:4 }}>{inp.label}</label>
            {inp.type === "select" ? (
              <select value={selects[inp.k]||inp.options[0].v}
                onChange={e => setSelects(p=>({...p,[inp.k]:e.target.value}))}
                style={{ width:"100%", maxWidth:280, border:`1px solid ${BD}`, borderRadius:6, padding:"8px 10px", fontSize:14, fontFamily:sans, outline:"none", background:"var(--surface)" }}>
                {inp.options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="number" inputMode="decimal" placeholder={inp.ph} value={numVal(inp.k)}
                  onChange={e => setNums(p=>({...p,[inp.k]:e.target.value}))}
                  style={{ width:140, border:`1px solid ${BD}`, borderRadius:6, padding:"8px 10px", fontSize:16, fontFamily:sans, outline:"none" }} />
                <span style={{ fontSize:12, color:"var(--muted)", fontFamily:sans }}>{inp.unit}</span>
                {inp.k==="peso" && globalW && nums.peso===undefined && <span style={{ fontSize:11, color, fontFamily:sans }}>peso do paciente</span>}
              </div>
            )}
          </div>
        ))}

        {/* ── TIPO: grace_calc (GRACE 2.0) ── */}
        {sc.type === "grace_calc" && (sc.fields||[]).map(f => (
          <div key={f.k} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:"var(--muted)", fontFamily:sans, fontWeight:700, display:"block", marginBottom:4 }}>{f.label}</label>
            {f.type === "number" && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="number" placeholder={f.ph} value={nums[f.k]||""}
                  onChange={e => setNums(p=>({...p,[f.k]:e.target.value}))}
                  style={{ width:130, border:`1px solid ${BD}`, borderRadius:6, padding:"7px 10px", fontSize:14, fontFamily:sans, outline:"none" }} />
                <span style={{ fontSize:12, color:"var(--muted)", fontFamily:sans }}>{f.unit}</span>
              </div>
            )}
            {f.type === "select" && (
              <select value={selects[f.k]||"1"}
                onChange={e => setSelects(p=>({...p,[f.k]:e.target.value}))}
                style={{ width:"100%", border:`1px solid ${BD}`, borderRadius:6, padding:"7px 10px", fontSize:13, fontFamily:sans, outline:"none", background:"var(--surface)" }}>
                {f.options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            )}
            {f.type === "bool" && (
              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                <input type="checkbox" checked={bools[f.k]===true}
                  onChange={() => setBools(p=>({...p,[f.k]:!p[f.k]}))}
                  style={{ width:16, height:16, accentColor:color, cursor:"pointer", flexShrink:0 }} />
                <span style={{ fontSize:13, color:"var(--text)", fontFamily:sans }}>Presente</span>
                <span style={{ fontSize:11, fontWeight:700, color:"var(--muted)", fontFamily:sans, background:"var(--border-2)", padding:"1px 8px", borderRadius:12, marginLeft:"auto" }}>+{f.pts} pts</span>
              </label>
            )}
          </div>
        ))}

        {/* ── TIPO: escala por itens (NIHSS, GCS, SOFA, HEART) ── */}
        {isScale && (sc.items||[]).map(it => {
          const val = scaleVal(it);
          return (
            <div key={it.k} style={{ marginBottom:12, borderBottom:`1px solid var(--border-2)`, paddingBottom:12 }}>
              <div style={{ fontSize:13, color:"var(--text-strong)", fontFamily:sans, fontWeight:700, marginBottom:2 }}>{it.label}</div>
              {it.detail && <div style={{ fontSize:11, color:"var(--muted)", fontFamily:sans, marginBottom:6, lineHeight:1.4 }}>{it.detail}</div>}
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {it.options.map(o => (
                  <label key={o.v} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 8px", borderRadius:6,
                    background: val===o.v ? light : "transparent",
                    border: val===o.v ? `1px solid ${border}55` : "1px solid transparent" }}>
                    <input type="radio" name={`${scoreKey}_${it.k}`} value={o.v}
                      checked={val===o.v}
                      onChange={() => setNihssVals(p=>({...p,[it.k]:o.v}))}
                      style={{ accentColor:color, cursor:"pointer", flexShrink:0 }} />
                    <span style={{ fontSize:12, color:"var(--text)", fontFamily:sans, flex:1 }}>{o.label}</span>
                    <span style={{ fontSize:11, fontWeight:700, color: val===o.v ? color : "var(--muted-2)", fontFamily:sans, background:"var(--border-2)", padding:"1px 7px", borderRadius:12 }}>{o.v}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {/* ── RESULTADO ── */}
        <div style={{ marginTop:14, padding:"12px 14px", background:interp.bg, borderRadius:8, border:`1px solid ${interp.color}44` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:700, color:interp.color, fontFamily:sans, flex:1, marginRight:8 }}>{interp.label}</span>
            <span style={{ fontSize:24, fontWeight:900, color:interp.color, fontFamily:sans, flexShrink:0 }}>
              {sc.type==="calc" ? total.toFixed(1) : total} {sc.unit||"pts"}
            </span>
          </div>
          <div style={{ fontSize:12, color:interp.color, fontFamily:sans, lineHeight:1.6 }}>{interp.text}</div>
        </div>
      </div>
    </div>
  );
}
