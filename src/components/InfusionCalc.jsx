import { useState } from "react";

// ─── DROGAS VASOATIVAS E SEDAÇÃO — DILUIÇÕES USUAIS ───────────────────────────
// factor converte a unidade da solução (mg/UI/mcg) para a unidade da dose.
// conc (unid. de dose por mL) = amount × factor ÷ vol
const DRIPS = [
  { id:"nora",    name:"Noradrenalina",  amount:16,   vol:250, amountUnit:"mg",  factor:1000, doseUnit:"mcg/kg/min", perKg:true,  perMin:true,  range:"0,01–3 mcg/kg/min · início 0,05 · alvo PAM ≥ 65", prep:"4 amp (4 mg/4 mL = 16 mL) + SF/SG5% qsp 250 mL" },
  { id:"adre",    name:"Adrenalina",     amount:1,    vol:100, amountUnit:"mg",  factor:1000, doseUnit:"mcg/kg/min", perKg:true,  perMin:true,  range:"0,01–0,5 mcg/kg/min (infusão)",         prep:"1 amp (1 mg/1 mL) + SF qsp 100 mL → 10 mcg/mL" },
  { id:"vaso",    name:"Vasopressina",   amount:20,   vol:100, amountUnit:"UI",  factor:1,    doseUnit:"UI/min",     perKg:false, perMin:true,  range:"0,01–0,04 UI/min (dose fixa)",          prep:"1 amp (20 UI/1 mL) + SF qsp 100 mL → 0,2 UI/mL" },
  { id:"dobu",    name:"Dobutamina",     amount:250,  vol:250, amountUnit:"mg",  factor:1000, doseUnit:"mcg/kg/min", perKg:true,  perMin:true,  range:"2,5–20 mcg/kg/min",                     prep:"1 amp (250 mg/20 mL) + SG5% qsp 250 mL → 1.000 mcg/mL" },
  { id:"dopa",    name:"Dopamina",       amount:250,  vol:250, amountUnit:"mg",  factor:1000, doseUnit:"mcg/kg/min", perKg:true,  perMin:true,  range:"0,5–3 (renal) · 3–10 (β1) · >10 (α1)",  prep:"5 amp (50 mg/10 mL) + SG5% qsp 250 mL → 1.000 mcg/mL" },
  { id:"milri",   name:"Milrinona",      amount:20,   vol:100, amountUnit:"mg",  factor:1000, doseUnit:"mcg/kg/min", perKg:true,  perMin:true,  range:"0,375–0,75 mcg/kg/min · ataque 50 mcg/kg/10min", prep:"20 mg + SF qsp 100 mL → 200 mcg/mL" },
  { id:"ntg",     name:"Nitroglicerina", amount:50,   vol:250, amountUnit:"mg",  factor:1000, doseUnit:"mcg/min",    perKg:false, perMin:true,  range:"5–200 mcg/min · iniciar 5–10 mcg/min",  prep:"1 amp (50 mg/10 mL) + SG5% qsp 250 mL → 200 mcg/mL" },
  { id:"nps",     name:"Nitroprussiato", amount:50,   vol:250, amountUnit:"mg",  factor:1000, doseUnit:"mcg/kg/min", perKg:true,  perMin:true,  range:"0,3–10 mcg/kg/min · proteger da luz",   prep:"1 amp (50 mg) + SG5% qsp 250 mL → 200 mcg/mL" },
  { id:"amio",    name:"Amiodarona",     amount:900,  vol:500, amountUnit:"mg",  factor:1,    doseUnit:"mg/min",     perKg:false, perMin:true,  range:"1 mg/min 6h → 0,5 mg/min 18h",          prep:"6 amp (150 mg/3 mL) + 482 mL SG5%" },
  { id:"mida",    name:"Midazolam",      amount:100,  vol:100, amountUnit:"mg",  factor:1,    doseUnit:"mg/kg/h",    perKg:true,  perMin:false, range:"0,02–0,2 mg/kg/h (sedação)",            prep:"2 amp (50 mg/10 mL) + 80 mL SF 0,9%" },
  { id:"fenta",   name:"Fentanil",       amount:2500, vol:50,  amountUnit:"mcg", factor:1,    doseUnit:"mcg/kg/h",   perKg:true,  perMin:false, range:"1–3 mcg/kg/h (analgossedação)",          prep:"5 amp (500 mcg/10 mL) puro — 50 mcg/mL" },
  { id:"keta",    name:"Cetamina",       amount:500,  vol:250, amountUnit:"mg",  factor:1,    doseUnit:"mg/kg/h",    perKg:true,  perMin:false, range:"0,5–2 mg/kg/h (sedação) · SE: até 7,5", prep:"1 fr (500 mg/10 mL) + 240 mL SF 0,9%" },
  { id:"insulina",name:"Insulina Regular",amount:100, vol:100, amountUnit:"UI",  factor:1,    doseUnit:"UI/kg/h",    perKg:true,  perMin:false, range:"0,05–0,1 UI/kg/h (CAD/EHH)",            prep:"100 UI + 100 mL SF 0,9% (desprezar 30 mL no equipo)" },
];

const sans = "sans-serif";
const num = v => { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; };

export default function InfusionCalc({ globalW, color="#2B6CB0", light="#EBF8FF", border="#3182CE" }) {
  const [drugId, setDrugId] = useState("nora");
  const [w, setW] = useState("");
  const [amount, setAmount] = useState("");
  const [vol, setVol] = useState("");
  const [dose, setDose] = useState("");
  const [rate, setRate] = useState("");

  const drug = DRIPS.find(d => d.id === drugId);
  const peso = num(w !== "" ? w : globalW);
  const amt = num(amount !== "" ? amount : drug.amount);
  const volume = num(vol !== "" ? vol : drug.vol);
  const conc = volume > 0 ? (amt * drug.factor) / volume : 0; // unid. de dose por mL
  const kgFactor = drug.perKg ? peso : 1;
  const timeFactor = drug.perMin ? 60 : 1;

  const needW = drug.perKg && !peso;
  const mlh = conc > 0 && kgFactor > 0 && num(dose) > 0 ? (num(dose) * kgFactor * timeFactor) / conc : null;
  const doseFromRate = conc > 0 && kgFactor > 0 && num(rate) > 0 ? (num(rate) * conc) / (kgFactor * timeFactor) : null;

  const pickDrug = id => { setDrugId(id); setAmount(""); setVol(""); setDose(""); setRate(""); };

  const inputStyle = { border:"1px solid var(--input-border)", borderRadius:6, padding:"8px 10px", fontSize:16, fontFamily:sans, outline:"none", background:"var(--surface)", width:"100%", boxSizing:"border-box" };
  const lblStyle = { fontSize:11, color:"var(--muted)", fontFamily:sans, fontWeight:700, display:"block", marginBottom:4 };

  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ background:light, borderBottom:`1px solid ${border}33`, padding:"12px 16px" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:15, fontWeight:700, color:"var(--text-strong)" }}>Bomba de Infusão — Dose ↔ mL/h</div>
        <div style={{ fontSize:11, color:"var(--muted)", fontFamily:sans, marginTop:2 }}>Drogas vasoativas e sedação · conversão bidirecional</div>
      </div>

      <div style={{ padding:"14px 16px" }}>
        <div style={{ background:"#FFFBEB", border:"1px solid #F6E05E", borderRadius:6, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#744210", fontFamily:sans, lineHeight:1.5 }}>
          ⚠️ Diluições pré-preenchidas são <strong>usuais</strong> — confirme o padrão do seu serviço e ajuste os campos antes de programar a bomba.
        </div>

        {/* Seleção da droga */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
          {DRIPS.map(d => (
            <button key={d.id} onClick={()=>pickDrug(d.id)} style={{
              padding:"6px 12px", borderRadius:20, border:"1px solid", cursor:"pointer", fontSize:12, fontFamily:sans, minHeight:32,
              borderColor: drugId===d.id ? border : "var(--input-border)",
              background: drugId===d.id ? light : "var(--surface)",
              color: drugId===d.id ? color : "var(--text)",
              fontWeight: drugId===d.id ? 700 : 400,
            }}>{d.name}</button>
          ))}
        </div>

        {/* Faixa terapêutica e preparo usual */}
        <div style={{ background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, padding:"10px 12px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--text-strong)", fontFamily:sans, marginBottom:4 }}>{drug.name} — {drug.range}</div>
          <div style={{ fontSize:12, color:"var(--muted)", fontFamily:sans }}>Preparo usual: {drug.prep}</div>
        </div>

        {/* Diluição editável + peso */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:10, marginBottom:14 }}>
          <div>
            <label style={lblStyle}>Droga na solução ({drug.amountUnit})</label>
            <input type="number" inputMode="decimal" value={amount !== "" ? amount : drug.amount} onChange={e=>setAmount(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={lblStyle}>Volume total (mL)</label>
            <input type="number" inputMode="decimal" value={vol !== "" ? vol : drug.vol} onChange={e=>setVol(e.target.value)} style={inputStyle} />
          </div>
          {drug.perKg && (
            <div>
              <label style={lblStyle}>Peso (kg)</label>
              <input type="number" inputMode="decimal" placeholder="kg" value={w !== "" ? w : (globalW || "")} onChange={e=>setW(e.target.value)} style={inputStyle} />
            </div>
          )}
        </div>

        <div style={{ fontSize:12, color:"var(--text)", fontFamily:sans, marginBottom:14 }}>
          Concentração: <strong>{conc > 0 ? `${conc % 1 === 0 ? conc : conc.toFixed(1)} ${drug.doseUnit.split("/")[0]}/mL` : "—"}</strong>
        </div>

        {needW && (
          <div style={{ background:"#FED7D7", border:"1px solid #FC8181", borderRadius:6, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#9B2C2C", fontFamily:sans }}>
            Informe o peso do paciente — a dose de {drug.name} é calculada por kg.
          </div>
        )}

        {/* Dose → mL/h */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={{ background:light, border:`1px solid ${border}44`, borderRadius:8, padding:"12px" }}>
            <label style={{ ...lblStyle, color }}>Dose prescrita ({drug.doseUnit})</label>
            <input type="number" inputMode="decimal" placeholder="Ex: 0.1" value={dose} onChange={e=>setDose(e.target.value)} style={inputStyle} />
            <div style={{ marginTop:10, fontSize:12, color:"var(--muted)", fontFamily:sans }}>Programar bomba em:</div>
            <div style={{ fontSize:24, fontWeight:900, color, fontFamily:sans }}>
              {mlh !== null && !needW ? `${mlh.toFixed(1)} mL/h` : "—"}
            </div>
          </div>
          <div style={{ background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, padding:"12px" }}>
            <label style={lblStyle}>Conferir bomba (mL/h)</label>
            <input type="number" inputMode="decimal" placeholder="Ex: 10" value={rate} onChange={e=>setRate(e.target.value)} style={inputStyle} />
            <div style={{ marginTop:10, fontSize:12, color:"var(--muted)", fontFamily:sans }}>Dose entregue:</div>
            <div style={{ fontSize:24, fontWeight:900, color:"var(--text)", fontFamily:sans }}>
              {doseFromRate !== null && !needW ? `${doseFromRate < 1 ? doseFromRate.toFixed(3) : doseFromRate.toFixed(2)}` : "—"}
              {doseFromRate !== null && !needW && <span style={{ fontSize:13, fontWeight:600, color:"var(--muted)" }}> {drug.doseUnit}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
