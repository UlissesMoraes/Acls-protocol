import { useState, useEffect } from "react";
import { P, CATS } from "./data/protocols.js";
import { SCORES_DEF } from "./data/scores.js";
import { TOOL_GROUPS } from "./data/tools.js";
import ScoreWidget from "./components/ScoreWidget.jsx";
import DoseCalc from "./components/DoseCalc.jsx";
import InfusionCalc from "./components/InfusionCalc.jsx";
import CodeTimer from "./components/CodeTimer.jsx";
import usePersistentState from "./hooks/usePersistentState.js";

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [proto, setProto] = useState(null);
  const [tools, setTools] = useState(false);
  const [tab, setTab] = useState("cascade");
  const [openSteps, setOpenSteps] = useState({});
  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");
  const [checks, setChecks] = useState({});
  const [clMode, setClMode] = useState(false);

  // Estado persistido entre sessões
  const [weight, setWeight] = usePersistentState("acls.weight", "");
  const [recents, setRecents] = usePersistentState("acls.recents", []);
  const [favs, setFavs] = usePersistentState("acls.favs", []);

  const cur = P.find(p => p.id === proto);

  const matchProto = (p, ql) =>
    p.label.toLowerCase().includes(ql)
    || p.sub.toLowerCase().includes(ql)
    || p.drugs.some(d => d.name.toLowerCase().includes(ql) || d.ind.toLowerCase().includes(ql) || d.cat.toLowerCase().includes(ql))
    || p.antidotes.some(a => a.agent.toLowerCase().includes(ql) || a.antidote.toLowerCase().includes(ql))
    || p.cascade.some(s => s.phase.toLowerCase().includes(ql) || s.items.some(it => it.toLowerCase().includes(ql)));

  const filtered = P.filter(p => {
    if (cat !== "Todos" && p.cat !== cat) return false;
    if (!q.trim()) return true;
    return matchProto(p, q.toLowerCase());
  });

  // Fármaco específico encontrado na busca → atalho direto para a aba de medicamentos
  const drugHits = q.trim().length >= 3
    ? P.flatMap(p => p.drugs
        .filter(d => d.name.toLowerCase().includes(q.toLowerCase()))
        .map(d => ({ proto:p, drug:d })))
        .slice(0, 6)
    : [];

  const pushView = state => window.history.pushState(state, "");

  const openProto = (id, focusTab = "cascade") => {
    setProto(id); setTools(false); setTab(focusTab); setOpenSteps({}); setChecks({}); setClMode(false);
    setRecents(r => [id, ...r.filter(x => x !== id)].slice(0, 4));
    window.scrollTo({ top:0 });
    pushView({ proto:id });
  };
  const openTools = () => { setTools(true); setProto(null); window.scrollTo({ top:0 }); pushView({ tools:true }); };

  // Botão "voltar" do navegador/celular navega dentro do app em vez de sair
  useEffect(() => {
    const onPop = e => {
      const s = e.state || {};
      setProto(s.proto || null);
      setTools(!!s.tools);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const toggleFav = (id, e) => { e?.stopPropagation?.(); setFavs(f => f.includes(id) ? f.filter(x=>x!==id) : [...f, id]); };
  const toggleCheck = i => setChecks(p => ({...p,[i]:!p[i]}));
  const done = cur ? cur.cascade.filter((_,i)=>checks[i]).length : 0;
  const allOpen = cur ? cur.cascade.every((_,i)=>openSteps[i]) : false;
  const toggleAllSteps = () => setOpenSteps(allOpen ? {} : Object.fromEntries(cur.cascade.map((_,i)=>[i,true])));

  const recentProtos = recents.map(id => P.find(p=>p.id===id)).filter(Boolean);
  const favProtos = favs.map(id => P.find(p=>p.id===id)).filter(Boolean);

  const F = "#F7F9FC", W = "#FFFFFF", BD = "#E2E8F0", T = "#2D3748", S = "#718096";
  const serif = "'Georgia','Times New Roman',serif";
  const sans = "sans-serif";

  const Label = ({txt}) => (
    <div style={{ fontSize:10, color:S, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{txt}</div>
  );

  const SectionTitle = ({txt}) => (
    <div style={{ fontSize:12, color:S, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", margin:"4px 0 10px" }}>{txt}</div>
  );

  const renderCard = p => {
    const isFav = favs.includes(p.id);
    return (
      <button key={p.id} onClick={()=>openProto(p.id)} className="proto-card"
        style={{ position:"relative", background:W, border:`1px solid ${BD}`, borderLeft:`4px solid ${p.border}`, borderRadius:10, cursor:"pointer", textAlign:"left", fontFamily:serif, boxShadow:"0 1px 4px rgba(0,0,0,.04)", width:"100%", transition:"all .18s" }}
        onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-2px)"}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)";e.currentTarget.style.transform="translateY(0)"}}>
        <span onClick={e=>toggleFav(p.id,e)} role="button" aria-label={isFav?"Remover dos favoritos":"Adicionar aos favoritos"}
          style={{ position:"absolute", top:8, right:8, fontSize:18, lineHeight:1, cursor:"pointer", color:isFav?"#D4AC0D":"#CBD5E0", padding:4, zIndex:2 }}>
          {isFav ? "★" : "☆"}
        </span>
        <div className="proto-card-inner" style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ fontSize:28, lineHeight:1 }}>{p.icon}</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div style={{ fontFamily:serif, fontSize:15, fontWeight:700, color:"#1A202C", lineHeight:1.3, paddingRight:24 }}>{p.label}</div>
            </div>
            <span style={{ fontSize:10, background:p.light, color:p.color, border:`1px solid ${p.border}44`, padding:"2px 8px", borderRadius:20, fontFamily:sans, fontWeight:600, whiteSpace:"nowrap", display:"inline-block", marginBottom:8 }}>{p.cat}</span>
            <div style={{ fontSize:12, color:S, fontFamily:sans, lineHeight:1.5, marginBottom:10 }}>{p.sub}</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:"#4A5568", fontFamily:sans }}>📋 {p.cascade.length} etapas</span>
              <span style={{ fontSize:11, color:"#4A5568", fontFamily:sans }}>💊 {p.drugs.length} fármacos</span>
              {p.antidotes.length>0 && <span style={{ fontSize:11, color:"#4A5568", fontFamily:sans }}>🧪 {p.antidotes.length} antídotos</span>}
              {p.scores.length>0 && <span style={{ fontSize:11, color:"#4A5568", fontFamily:sans }}>📊 {p.scores.length} escore(s)</span>}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:F, fontFamily:serif, color:"#1A202C", overflowX:"hidden" }}>

      {/* HEADER */}
      <div style={{ background:W, borderBottom:`1px solid ${BD}`, position:"sticky", top:0, zIndex:200, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 16px" }}>
          <div className="hdr-inner" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {(proto || tools) && (
                <button onClick={()=>window.history.back()} aria-label="Voltar"
                  style={{ background:"none", border:"none", cursor:"pointer", color:S, fontSize:13, fontFamily:sans, padding:"8px 10px", borderRadius:6, minHeight:40 }}>
                  ← Voltar
                </button>
              )}
              <button onClick={()=>{ setProto(null); setTools(false); window.scrollTo({top:0}); pushView({}); }} aria-label="Início"
                style={{ background:"none", border:"none", textAlign:"left", cursor:"pointer", padding:0 }}>
                <div style={{ fontFamily:serif, fontSize:17, fontWeight:700, color:"#1A202C" }}>Protocolos de Emergência</div>
                <div style={{ fontSize:11, color:S, fontFamily:sans }}>ACLS 2025 · Sala de Emergência · CFM/CRM</div>
              </button>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {!tools && (
                <button onClick={openTools} aria-label="Abrir ferramentas e calculadoras"
                  style={{ background:"#EBF8FF", color:"#2B6CB0", border:"1px solid #BEE3F8", borderRadius:8, padding:"8px 14px", fontSize:12, fontFamily:sans, fontWeight:700, cursor:"pointer", minHeight:38, whiteSpace:"nowrap" }}>
                  🧰 Ferramentas
                </button>
              )}
              {proto !== "pcr" && (
                <button onClick={()=>openProto("pcr")} aria-label="Acesso rápido — Parada Cardiorrespiratória"
                  style={{ background:"#C53030", color:"#fff", border:"none", borderRadius:8, padding:"8px 14px", fontSize:12, fontFamily:sans, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, minHeight:38, boxShadow:"0 1px 4px rgba(197,48,48,.35)", whiteSpace:"nowrap" }}>
                  🚨 PCR
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── INDEX ── */}
        {!proto && !tools && (
          <>
            <div style={{ paddingTop:24, paddingBottom:16 }}>
              <div style={{ position:"relative", marginBottom:12 }}>
                <input value={q} onChange={e=>setQ(e.target.value)} type="search" inputMode="search"
                  aria-label="Pesquisar protocolo, medicamento, sigla ou condição"
                  placeholder="🔍 Pesquisar protocolo, medicamento, sigla ou condição..."
                  style={{ width:"100%", boxSizing:"border-box", background:W, border:`1px solid #CBD5E0`, borderRadius:8, padding:"12px 44px 12px 16px", fontSize:16, fontFamily:sans, color:T, outline:"none", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }} />
                {q && (
                  <button onClick={()=>setQ("")} aria-label="Limpar pesquisa"
                    style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"#EDF2F7", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", color:"#4A5568", fontSize:14, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                )}
              </div>
              <div className="cat-row">
                {CATS.map(c => (
                  <button key={c} onClick={()=>setCat(c)} style={{
                    padding:"5px 13px", borderRadius:20, border:"1px solid",
                    borderColor: cat===c ? "#2B6CB0" : "#CBD5E0",
                    background: cat===c ? "#EBF8FF" : W,
                    color: cat===c ? "#2B6CB0" : "#4A5568",
                    fontSize:12, fontFamily:sans, fontWeight: cat===c ? 700 : 400, cursor:"pointer",
                  }}>{c}</button>
                ))}
              </div>
              {q.trim() && (
                <div style={{ marginTop:8, fontSize:12, color:S, fontFamily:sans }}>
                  {filtered.length===0 ? `Sem resultados para "${q}"` : `${filtered.length} protocolo(s) encontrado(s) para "${q}"`}
                </div>
              )}
            </div>

            {/* Atalhos diretos para fármacos encontrados */}
            {drugHits.length>0 && (
              <div style={{ marginBottom:16 }}>
                <SectionTitle txt="💊 Medicamentos encontrados" />
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {drugHits.map(({proto:p,drug:d},i) => (
                    <button key={i} onClick={()=>openProto(p.id,"drugs")}
                      style={{ background:W, border:`1px solid ${p.border}55`, borderLeft:`3px solid ${p.border}`, borderRadius:8, padding:"8px 12px", cursor:"pointer", textAlign:"left", fontFamily:sans }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#1A202C" }}>{d.name}</div>
                      <div style={{ fontSize:11, color:S }}>{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ferramentas — CTA */}
            {!q.trim() && (
              <button onClick={openTools}
                style={{ width:"100%", marginBottom:16, background:"linear-gradient(135deg,#EBF8FF,#E6FFFA)", border:"1px solid #BEE3F8", borderRadius:12, padding:"16px 18px", cursor:"pointer", textAlign:"left", fontFamily:sans, display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:30 }}>🧰</span>
                <span style={{ flex:1, minWidth:0 }}>
                  <span style={{ display:"block", fontSize:15, fontWeight:700, color:"#1A202C" }}>Ferramentas & Calculadoras</span>
                  <span style={{ display:"block", fontSize:12, color:S, marginTop:2 }}>Bomba de infusão · Modo Código RCP · {Object.keys(SCORES_DEF).length} escores e fórmulas clínicas</span>
                </span>
                <span style={{ fontSize:20, color:"#2B6CB0" }}>→</span>
              </button>
            )}

            {/* Favoritos */}
            {!q.trim() && favProtos.length>0 && (
              <div style={{ marginBottom:16 }}>
                <SectionTitle txt="⭐ Favoritos" />
                <div className="proto-grid">{favProtos.map(renderCard)}</div>
              </div>
            )}

            {/* Recentes */}
            {!q.trim() && recentProtos.length>0 && (
              <div style={{ marginBottom:16 }}>
                <SectionTitle txt="🕐 Acessados recentemente" />
                <div className="proto-grid">{recentProtos.map(renderCard)}</div>
              </div>
            )}

            {(!q.trim() && (favProtos.length>0 || recentProtos.length>0)) && <SectionTitle txt="Todos os protocolos" />}
            <div className="proto-grid">
              {filtered.map(renderCard)}
            </div>

            <div style={{ background:"#FFFBEB", border:"1px solid #F6E05E", borderRadius:8, padding:"12px 16px", marginBottom:32, fontFamily:sans, fontSize:12, color:"#744210", lineHeight:1.6 }}>
              <strong>⚕️ Nota de uso clínico:</strong> Sistema baseado nas diretrizes <strong>AHA/ACLS 2020–2025</strong>, Surviving Sepsis Campaign 2021 e SBC. As decisões terapêuticas são de responsabilidade exclusiva do médico assistente.
            </div>
          </>
        )}

        {/* ── TOOLS HUB ── */}
        {tools && (
          <div style={{ paddingTop:20, paddingBottom:60 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8 }}>
              <span style={{ fontSize:34 }}>🧰</span>
              <div>
                <div style={{ fontFamily:serif, fontSize:22, fontWeight:700, color:"#1A202C" }}>Ferramentas & Calculadoras</div>
                <div style={{ fontSize:13, color:S, fontFamily:sans }}>Cálculos de beira-leito e escores validados — independentes do protocolo</div>
              </div>
            </div>

            {/* Peso global compartilhado pelas ferramentas */}
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"#EBF8FF", border:"1px solid #BEE3F8", borderRadius:10, padding:"10px 14px", marginBottom:20, flexWrap:"wrap" }}>
              <label htmlFor="peso-tools" style={{ fontSize:12, color:"#2B6CB0", fontFamily:sans, fontWeight:700 }}>⚖️ Peso do paciente</label>
              <input id="peso-tools" type="number" inputMode="decimal" min={1} max={300} placeholder="kg" value={weight}
                onChange={e=>setWeight(e.target.value)}
                style={{ width:90, border:"1px solid #CBD5E0", borderRadius:6, padding:"8px 10px", fontSize:16, fontFamily:sans, outline:"none", background:"#fff" }} />
              <span style={{ fontSize:12, color:S, fontFamily:sans }}>kg — usado nas calculadoras por peso</span>
            </div>

            {TOOL_GROUPS.map(group => (
              <div key={group.cat} style={{ marginBottom:24 }}>
                <div style={{ fontSize:11, color:group.color, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10, paddingBottom:6, borderBottom:`2px solid ${group.border}33` }}>{group.cat}</div>
                {group.items.map(item => {
                  if (item.kind === "infusion") return <div key={item.id} style={{ marginBottom:14 }}><InfusionCalc globalW={weight} /></div>;
                  if (item.kind === "code") return <div key={item.id} style={{ marginBottom:14 }}><CodeTimer /></div>;
                  return <ScoreWidget key={item.id} scoreKey={item.id} color={group.color} light={group.light} border={group.border} globalW={weight} />;
                })}
              </div>
            ))}

            <div style={{ background:"#FFFBEB", border:"1px solid #F6E05E", borderRadius:8, padding:"12px 16px", marginBottom:32, fontFamily:sans, fontSize:12, color:"#744210", lineHeight:1.6 }}>
              <strong>⚕️ Aviso:</strong> Calculadoras são apoio à decisão. Confira sempre doses, diluições e contraindicações — a responsabilidade terapêutica é do médico assistente.
            </div>
          </div>
        )}

        {/* ── PROTOCOL DETAIL ── */}
        {proto && cur && (
          <div style={{ paddingTop:20, paddingBottom:60 }}>

            {/* Protocol header */}
            <div className="proto-hdr" style={{ background:W, border:`1px solid ${BD}`, borderLeft:`5px solid ${cur.border}`, borderRadius:10, marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:16, minWidth:0, flex:1 }}>
                  <div style={{ fontSize:38 }}>{cur.icon}</div>
                  <div>
                    <div style={{ fontSize:10, color:cur.color, fontFamily:sans, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>{cur.cat}</div>
                    <div style={{ fontFamily:serif, fontSize:21, fontWeight:700, color:"#1A202C", marginBottom:3 }}>{cur.label}</div>
                    <div style={{ fontSize:13, color:S, fontFamily:sans }}>{cur.sub}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, background:cur.light, border:`1px solid ${cur.border}44`, borderRadius:8, padding:"8px 12px", flexShrink:0 }}>
                  <label htmlFor="peso-paciente" style={{ fontSize:11, color:cur.color, fontFamily:sans, fontWeight:700, whiteSpace:"nowrap" }}>⚖️ Peso do paciente</label>
                  <input id="peso-paciente" type="number" inputMode="decimal" min={1} max={300} placeholder="—" value={weight}
                    onChange={e=>setWeight(e.target.value)}
                    style={{ width:72, border:"1px solid #CBD5E0", borderRadius:6, padding:"7px 8px", fontSize:16, fontFamily:sans, outline:"none", background:"#fff" }} />
                  <span style={{ fontSize:12, color:S, fontFamily:sans }}>kg</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs-row">
              {[
                { k:"cascade", lbl:`📋 Cascata (${cur.cascade.length})` },
                { k:"drugs", lbl:`💊 Medicamentos (${cur.drugs.length})` },
                ...(cur.antidotes.length>0 ? [{ k:"antidotes", lbl:`🧪 Antídotos (${cur.antidotes.length})` }] : []),
                ...(cur.scores.length>0 ? [{ k:"scores", lbl:`📊 Escores (${cur.scores.length})` }] : []),
              ].map(t => (
                <button key={t.k} onClick={()=>setTab(t.k)} className="tab-btn" style={{
                  background: tab===t.k ? cur.light : "transparent",
                  color: tab===t.k ? cur.color : S,
                  fontWeight: tab===t.k ? 700 : 400,
                  borderLeft: tab===t.k ? `2px solid ${cur.border}` : "2px solid transparent",
                }}>{t.lbl}</button>
              ))}
            </div>

            {/* ── CASCADE TAB ── */}
            {tab === "cascade" && (
              <div>
                {/* Checklist bar */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, padding:"10px 14px", background:W, border:`1px solid ${BD}`, borderRadius:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                    <span style={{ fontSize:13, fontFamily:sans, color:"#4A5568" }}>
                      {clMode ? `✅ Checklist — ${done}/${cur.cascade.length} etapas` : "Modo leitura"}
                    </span>
                    {clMode && done>0 && (
                      <div style={{ background:"#E2E8F0", borderRadius:20, height:6, width:70, overflow:"hidden", flexShrink:0 }}>
                        <div style={{ height:6, background:cur.border, width:`${(done/cur.cascade.length)*100}%`, transition:"width .3s" }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    <button onClick={toggleAllSteps} style={{ padding:"5px 12px", border:`1px solid #CBD5E0`, borderRadius:6, background:W, color:"#4A5568", fontSize:12, fontFamily:sans, fontWeight:600, cursor:"pointer", minHeight:32 }}>
                      {allOpen ? "− Recolher tudo" : "+ Expandir tudo"}
                    </button>
                    {clMode && done>0 && (
                      <button onClick={()=>setChecks({})} style={{ padding:"4px 10px", border:`1px solid ${BD}`, borderRadius:6, background:W, color:S, fontSize:11, fontFamily:sans, cursor:"pointer", minHeight:32 }}>Limpar</button>
                    )}
                    <button onClick={()=>{setClMode(m=>!m);setChecks({});}} style={{
                      padding:"5px 12px", border:`1px solid ${clMode?cur.border:"#CBD5E0"}`,
                      borderRadius:6, background:clMode?cur.light:W, color:clMode?cur.color:"#4A5568",
                      fontSize:12, fontFamily:sans, fontWeight:600, cursor:"pointer",
                    }}>{clMode?"✓ Checklist ON":"☐ Ativar Checklist"}</button>
                  </div>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {cur.cascade.map((step, idx) => {
                    const isOpen = !!openSteps[idx];
                    const isDone = !!checks[idx];
                    return (
                      <div key={idx} style={{ background:W, border:`1px solid ${isDone&&clMode?cur.border:BD}`, borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)", opacity:isDone&&clMode?.75:1, transition:"all .2s" }}>
                        <button onClick={()=>setOpenSteps(p=>({...p,[idx]:!p[idx]}))} className="step-hdr" aria-expanded={isOpen} style={{
                          width:"100%", border:"none", cursor:"pointer", textAlign:"left",
                          display:"flex", alignItems:"center", gap:12, fontFamily:serif,
                          background: isOpen?(step.alert?"#FFF5F5":"#F7FAFC"):(isDone&&clMode?cur.light:W),
                          borderBottom: isOpen?`1px solid ${BD}`:"none", transition:"background .15s",
                        }}>
                          {clMode && (
                            <div onClick={e=>{e.stopPropagation();toggleCheck(idx);}} style={{
                              width:22, height:22, borderRadius:6, flexShrink:0,
                              border:`2px solid ${isDone?cur.border:"#CBD5E0"}`,
                              background: isDone?cur.light:W,
                              display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                            }}>
                              {isDone && <span style={{ color:cur.color, fontSize:13, fontWeight:900 }}>✓</span>}
                            </div>
                          )}
                          <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, fontFamily:sans,
                            background:step.alert?"#FED7D7":cur.light, border:`2px solid ${step.alert?"#FC8181":cur.border}`,
                            color:step.alert?"#C53030":cur.color }}>
                            {step.step}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              {step.alert && <span style={{ fontSize:10, background:"#FED7D7", color:"#C53030", border:"1px solid #FC8181", padding:"1px 8px", borderRadius:20, fontFamily:sans, fontWeight:700 }}>ATENÇÃO</span>}
                              {isDone&&clMode && <span style={{ fontSize:10, background:cur.light, color:cur.color, border:`1px solid ${cur.border}55`, padding:"1px 8px", borderRadius:20, fontFamily:sans, fontWeight:700 }}>CONCLUÍDO</span>}
                              <span style={{ fontSize:10, color:step.alert?"#9B2C2C":"#2C3E50", fontFamily:sans, fontWeight:700, letterSpacing:"0.05em", lineHeight:1.4 }}>{step.phase}</span>
                            </div>
                          </div>
                          <span style={{ color:"#A0AEC0", fontSize:12, transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s", flexShrink:0 }}>▼</span>
                        </button>

                        {isOpen && (
                          <div className="step-body">
                            {step.items.length>0 && (
                              <div style={{ marginBottom:step.decision?16:0 }}>
                                {step.items.map((it,i) => (
                                  <div key={i} style={{ display:"flex", gap:12, paddingTop:9, paddingBottom:9, borderBottom:i<step.items.length-1?`1px solid #F0F4F8`:"none" }}>
                                    <div style={{ width:6, height:6, borderRadius:"50%", background:cur.border, marginTop:7, flexShrink:0 }} />
                                    <span style={{ fontSize:14, lineHeight:1.65, color:T, fontFamily:sans }}>{it}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {step.decision && (
                              <div style={{ background:"#F7FAFC", border:`1px solid ${BD}`, borderRadius:8, padding:"14px 16px", marginTop:step.items.length>0?12:0 }}>
                                <div style={{ fontSize:13, fontWeight:700, color:T, fontFamily:sans, marginBottom:8 }}>🔀 Ponto de Decisão</div>
                                <div style={{ fontSize:13, color:"#4A5568", fontFamily:sans, marginBottom:10, fontStyle:"italic" }}>{step.decision.q}</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                                    <span style={{ fontSize:11, background:"#C6F6D5", color:"#276749", border:"1px solid #9AE6B4", padding:"2px 10px", borderRadius:20, fontFamily:sans, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>SIM</span>
                                    <span style={{ fontSize:13, color:T, fontFamily:sans }}>{step.decision.yes}</span>
                                  </div>
                                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                                    <span style={{ fontSize:11, background:"#FED7D7", color:"#9B2C2C", border:"1px solid #FC8181", padding:"2px 10px", borderRadius:20, fontFamily:sans, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>NÃO</span>
                                    <span style={{ fontSize:13, color:T, fontFamily:sans }}>{step.decision.no}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DRUGS TAB ── */}
            {tab==="drugs" && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {cur.drugs.map((d,i) => (
                  <div key={i} style={{ background:W, border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
                    <div style={{ background:cur.light, borderBottom:`1px solid ${cur.border}33`, padding:"12px 18px" }}>
                      <div style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:"#1A202C" }}>{d.name}</div>
                      <div style={{ fontSize:11, color:cur.color, fontFamily:sans, fontWeight:600 }}>{d.cat}</div>
                    </div>
                    <div className="drug-body">
                      <div className="drug-grid">
                        <div><Label txt="Dose" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.dose}</div></div>
                        <div><Label txt="Via de Administração" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.via}</div></div>
                      </div>
                      <div style={{ marginBottom:10 }}><Label txt="Indicação" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.ind}</div></div>
                      <div style={{ marginBottom:d.obs?10:0 }}><Label txt="Contraindicações" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.ci}</div></div>
                      {d.obs && (
                        <div style={{ background:"#FFFBEB", border:"1px solid #F6E05E", borderRadius:6, padding:"10px 12px", marginBottom:10 }}>
                          <div style={{ fontSize:11, color:"#744210", fontFamily:sans, fontWeight:700, marginBottom:3 }}>⚠️ Observação Clínica</div>
                          <div style={{ fontSize:13, color:"#744210", fontFamily:sans, lineHeight:1.5 }}>{d.obs}</div>
                        </div>
                      )}
                      <DoseCalc drugName={d.name} protocolId={cur.id} color={cur.color} light={cur.light} border={cur.border} globalW={weight} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ANTIDOTES TAB ── */}
            {tab==="antidotes" && cur.antidotes.length>0 && (
              <div>
                {/* Desktop table */}
                <div className="ant-table-wrap" style={{ background:W, border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:cur.light, borderBottom:`2px solid ${cur.border}44` }}>
                        {["Agente / Tóxico","Antídoto","Dose / Regime","Observações Clínicas"].map(h => (
                          <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, color:cur.color, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cur.antidotes.map((r,i) => (
                        <tr key={i} style={{ borderBottom:i<cur.antidotes.length-1?`1px solid #F0F4F8`:"none", background:i%2===0?W:"#FAFBFC" }}>
                          <td style={{ padding:"11px 14px", fontSize:13, fontFamily:sans, fontWeight:600, color:T, verticalAlign:"top" }}>{r.agent}</td>
                          <td style={{ padding:"11px 14px", verticalAlign:"top" }}>
                            <span style={{ fontSize:13, fontFamily:sans, fontWeight:700, color:cur.color, background:cur.light, padding:"2px 10px", borderRadius:20, display:"inline-block" }}>{r.antidote}</span>
                          </td>
                          <td style={{ padding:"11px 14px", fontSize:13, fontFamily:sans, color:T, lineHeight:1.5, verticalAlign:"top" }}>{r.dose}</td>
                          <td style={{ padding:"11px 14px", fontSize:12, fontFamily:sans, color:S, lineHeight:1.6, verticalAlign:"top" }}>{r.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="ant-cards-wrap" style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {cur.antidotes.map((r,i) => (
                    <div key={i} style={{ background:W, border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden" }}>
                      <div style={{ background:cur.light, borderBottom:`1px solid ${cur.border}33`, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:14, fontWeight:700, color:"#1A202C", fontFamily:sans }}>{r.agent}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:cur.color, background:W, border:`1px solid ${cur.border}55`, padding:"2px 10px", borderRadius:20, fontFamily:sans }}>{r.antidote}</span>
                      </div>
                      <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                        <div><Label txt="Dose / Regime" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{r.dose}</div></div>
                        <div><Label txt="Observações" /><div style={{ fontSize:13, color:S, fontFamily:sans, lineHeight:1.5 }}>{r.notes}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SCORES TAB ── */}
            {tab==="scores" && cur.scores.length>0 && (
              <div>
                <div style={{ background:"#EBF8FF", border:"1px solid #BEE3F8", borderRadius:8, padding:"10px 14px", marginBottom:16, fontFamily:sans, fontSize:12, color:"#2C5282" }}>
                  ℹ️ Escores clínicos validados para este protocolo. Marque os critérios presentes e veja a interpretação clínica automática.
                </div>
                {cur.scores.map(sk => (
                  <ScoreWidget key={sk} scoreKey={sk} color={cur.color} light={cur.light} border={cur.border} />
                ))}
              </div>
            )}

            <div style={{ background:"#FFFBEB", border:"1px solid #F6E05E", borderRadius:8, padding:"10px 14px", marginTop:24, fontFamily:sans, fontSize:11, color:"#744210", lineHeight:1.6 }}>
              ⚕️ Ferramenta de apoio à decisão clínica. Confira doses, vias e contraindicações antes de prescrever — a responsabilidade terapêutica é do médico assistente.
            </div>

          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        button:focus { outline: 2px solid #4299E1; outline-offset: 2px; }

        .hdr-inner { padding-top:14px; padding-bottom:14px; }
        .page-pad { padding: 0 20px; }
        .proto-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; padding-bottom:32px; }
        .proto-card-inner { padding: 18px 20px; }
        .proto-hdr { padding: 20px 24px; }
        .cat-row { display:flex; gap:8px; flex-wrap:wrap; }
        .tabs-row { display:flex; background:#fff; border:1px solid #E2E8F0; border-radius:8px; padding:4px; max-width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom:20px; }
        .tab-btn { padding:8px 16px; border-radius:6px; border:none; font-size:13px; font-family:sans-serif; cursor:pointer; transition:all .15s; white-space:nowrap; flex-shrink:0; }
        .step-hdr { padding: 14px 18px; }
        .step-body { padding: 16px 18px 18px; }
        .drug-body { padding: 14px 18px; }
        .drug-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
        .ant-table-wrap { display:block; }
        .ant-cards-wrap { display:none; }

        @media (max-width: 640px) {
          .hdr-inner { padding-top:12px; padding-bottom:12px; }
          .page-pad { padding: 0 12px; }
          .upd-badge { display:none; }
          .proto-grid { grid-template-columns:1fr; gap:10px; }
          .proto-card-inner { padding: 14px 14px; }
          .proto-hdr { padding: 14px 14px; }
          .tab-btn { padding:7px 10px; font-size:11px; flex:1; text-align:center; min-height:44px; }
          .step-hdr { padding: 12px 12px; min-height:48px; }
          .step-body { padding: 12px 12px 14px; }
          .drug-body { padding: 12px 12px; }
          .drug-grid { grid-template-columns:1fr; gap:10px; }
          .ant-table-wrap { display:none; }
          .ant-cards-wrap { display:flex; flex-direction:column; gap:12px; }
        }
      `}</style>
    </div>
  );
}
