import { useState, useEffect, useRef } from "react";
import { CATS } from "./data/protocols.js";
import { P_PED, CATS_PED } from "./data/protocolsPed.js";
import { SCORES_DEF } from "./data/scores.js";
import { TOOL_GROUPS } from "./data/tools.js";
import ScoreWidget from "./components/ScoreWidget.jsx";
import DoseCalc from "./components/DoseCalc.jsx";
import InfusionCalc from "./components/InfusionCalc.jsx";
import CodeTimer from "./components/CodeTimer.jsx";
import AIAssistant from "./components/AIAssistant.jsx";
import AnamneseTool from "./components/AnamneseTool.jsx";
import AccountMenu from "./components/AccountMenu.jsx";
import SymptomTriage from "./components/SymptomTriage.jsx";
import DrugAlerts from "./components/DrugAlerts.jsx";
import PedWeight from "./components/PedWeight.jsx";
import Procedures from "./components/procedures/Procedures.jsx";
import usePersistentState from "./hooks/usePersistentState.js";
import useInstallPrompt from "./hooks/useInstallPrompt.js";
import useProtocols from "./hooks/useProtocols.js";
import { deburr, expandQuery } from "./utils/format.js";
import { ProtoIcon, Icons, TOOL_META } from "./icons.jsx";

// Data da última revisão do conteúdo clínico (governança/rastreabilidade)
const REV = "junho/2026";

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [proto, setProto] = useState(null);
  const [tools, setTools] = useState(false);
  const [tool, setTool] = useState(null);
  const [aiFocus, setAiFocus] = useState(null);
  const [tab, setTab] = useState("cascade");
  const [openSteps, setOpenSteps] = useState({});
  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");
  const [checks, setChecks] = useState({});
  const [clMode, setClMode] = useState(false);
  const [catOpen, setCatOpen] = useState(true);

  // Estado persistido entre sessões
  const [weight, setWeight] = usePersistentState("acls.weight", "");
  const [recents, setRecents] = usePersistentState("acls.recents", []);
  const [favs, setFavs] = usePersistentState("acls.favs", []);
  const [theme, setTheme] = usePersistentState("acls.theme", "light");

  const [updateReady, setUpdateReady] = useState(false);
  const { canInstall, promptInstall, isIOS, isAndroid, isStandalone, showInstall } = useInstallPrompt();
  const [installHelp, setInstallHelp] = useState(false);
  const [installDismissed, setInstallDismissed] = usePersistentState("acls.installDismissed", false);
  const onInstallClick = async () => {
    if (canInstall) { const r = await promptInstall(); if (r !== "accepted") setInstallHelp(false); }
    else setInstallHelp(true);
  };

  // Aplica o tema ao documento e atualiza a cor da barra do navegador
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#1A212B" : "#C53030");
  }, [theme]);

  // Aviso de nova versão disponível (PWA)
  useEffect(() => {
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener("sw-update", onUpdate);
    return () => window.removeEventListener("sw-update", onUpdate);
  }, []);
  const applyUpdate = () => {
    if (navigator.serviceWorker)
      navigator.serviceWorker.getRegistration().then(r => r?.waiting?.postMessage({ type: "SKIP_WAITING" }));
  };

  const { protocols: adultProtocols, updated: contentUpdated, dismissUpdated } = useProtocols();
  // Modo clínico: adulto (ACLS, conteúdo vivo via backend) ou pediátrico (PALS, embutido).
  const [mode, setMode] = usePersistentState("acls.mode", "adult");
  const isPed = mode === "ped";
  const protocols = isPed ? P_PED : adultProtocols;
  const activeCats = isPed ? CATS_PED : CATS;
  const cur = protocols.find(p => p.id === proto);

  // Ao trocar de modo, volta à home e zera filtros (ids não coincidem entre os conjuntos).
  const switchMode = (m) => {
    if (m === mode) return;
    setMode(m); setProto(null); setTools(false); setTool(null); setCat("Todos"); setQ("");
    window.scrollTo({ top: 0 }); pushView({});
  };

  const terms = expandQuery(q);
  // Texto completo do protocolo, deburrado uma vez por filtragem
  const protoHaystack = p => deburr([
    p.label, p.sub, p.cat,
    ...p.drugs.flatMap(d => [d.name, d.ind, d.cat]),
    ...p.antidotes.flatMap(a => [a.agent, a.antidote]),
    ...p.cascade.flatMap(s => [s.phase, ...s.items]),
  ].join(" "));
  const matchProto = p => { const h = protoHaystack(p); return terms.some(t => h.includes(t)); };

  // Ordem de exibição: emergências tempo-dependentes primeiro
  const ORDER = ["pcr","amax4","taquiarritmias","bradiarritmias","iamcssst","iamssst","avc","convulsoes","sepse","vasoativas","cad","hhns","hidroeletroliticos","intoxicacoes"];
  const rank = id => { const i = ORDER.indexOf(id); return i === -1 ? 999 : i; };

  const filtered = protocols
    .filter(p => {
      if (cat !== "Todos" && p.cat !== cat) return false;
      if (!terms.length) return true;
      return matchProto(p);
    })
    .sort((a, b) => rank(a.id) - rank(b.id));

  // Fármaco específico encontrado na busca → atalho direto para a aba de medicamentos
  const drugHits = q.trim().length >= 3
    ? protocols.flatMap(p => p.drugs
        .filter(d => terms.some(t => deburr(d.name).includes(t)))
        .map(d => ({ proto:p, drug:d })))
        .slice(0, 6)
    : [];

  const pushView = state => window.history.pushState(state, "");
  const searchRef = useRef(null);

  const goHome = () => { setProto(null); setTools(false); setTool(null); window.scrollTo({ top:0 }); pushView({}); };
  const goSearch = () => { goHome(); setTimeout(() => searchRef.current?.focus(), 60); };

  const openProto = (id, focusTab = "cascade") => {
    setProto(id); setTools(false); setTab(focusTab); setOpenSteps({}); setChecks({}); setClMode(false);
    setRecents(r => [id, ...r.filter(x => x !== id)].slice(0, 4));
    window.scrollTo({ top:0 });
    pushView({ proto:id });
  };
  const openTools = () => { setTools(true); setTool(null); setProto(null); window.scrollTo({ top:0 }); pushView({ tools:true }); };
  const openTool = (id, focus = null) => { setTools(true); setTool(id); setAiFocus(focus); setProto(null); window.scrollTo({ top:0 }); pushView({ tools:true, tool:id, aiFocus:focus }); };
  const QUICK_TOOLS = [
    { Ic:Icons.Siren, color:"#C53030", label:isPed?"Código PALS":"Códigos RCP", sub:isPed?"Pediátrico · por kg":"Adulto · ACLS", id:"code" },
    ...(isPed ? [{ Ic:Icons.Baby, color:"#0E7490", label:"Peso por idade", sub:"Estimar (APLS)", id:"pedweight" }] : []),
    { Ic:Icons.Sparkles, color:"#7C3AED", label:"Copiloto Clínico", sub:"IA · voz e texto", id:"assistant" },
    { Ic:Icons.Drug,  color:"#0E7490", label:"Bomba de Infusão", sub:"Dose ↔ mL/h", id:"infusion" },
    { Ic:Icons.Score, color:"#2B6CB0", label:"Escores", sub:`${Object.keys(SCORES_DEF).length} validados`, id:null },
  ];

  // Botão "voltar" do navegador/celular navega dentro do app em vez de sair
  useEffect(() => {
    const onPop = e => {
      const s = e.state || {};
      setProto(s.proto || null);
      setTools(!!s.tools);
      setTool(s.tool || null);
      setAiFocus(s.aiFocus || null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const toggleFav = (id, e) => { e?.stopPropagation?.(); setFavs(f => f.includes(id) ? f.filter(x=>x!==id) : [...f, id]); };
  const toggleCheck = i => setChecks(p => ({...p,[i]:!p[i]}));
  const done = cur ? cur.cascade.filter((_,i)=>checks[i]).length : 0;
  const allOpen = cur ? cur.cascade.every((_,i)=>openSteps[i]) : false;
  const toggleAllSteps = () => setOpenSteps(allOpen ? {} : Object.fromEntries(cur.cascade.map((_,i)=>[i,true])));

  const recentProtos = recents.map(id => protocols.find(p=>p.id===id)).filter(Boolean);
  const favProtos = favs.map(id => protocols.find(p=>p.id===id)).filter(Boolean);

  const F = "var(--bg)", W = "var(--surface)", BD = "var(--border)", T = "var(--text)", S = "var(--muted)";
  const serif = "var(--font-display)";
  const sans = "var(--font)";
  // Tinta da cor do protocolo adaptada ao tema (clara no claro, escura no escuro)
  const tint = (c, p = 14) => `color-mix(in srgb, ${c} ${p}%, var(--surface))`;

  const Label = ({txt}) => (
    <div style={{ fontSize:10, color:S, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{txt}</div>
  );

  const SectionTitle = ({txt, Ic}) => (
    <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, color:S, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", margin:"4px 0 10px" }}>
      {Ic && <Ic size={14} strokeWidth={2.2} />}{txt}
    </div>
  );

  const renderCard = p => {
    const isFav = favs.includes(p.id);
    const open = () => openProto(p.id);
    return (
      <div key={p.id} role="button" tabIndex={0} onClick={open}
        onKeyDown={e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); open(); } }}
        aria-label={`Abrir protocolo ${p.label}`} className="proto-card"
        style={{ position:"relative", background:"var(--surface)", border:`1px solid var(--border)`, borderLeft:`4px solid ${p.border}`, borderRadius:12, cursor:"pointer", textAlign:"left", fontFamily:serif, boxShadow:"var(--shadow-sm)", width:"100%", transition:"all .18s" }}
        onMouseEnter={e=>{e.currentTarget.style.boxShadow="var(--shadow-md)";e.currentTarget.style.transform="translateY(-2px)"}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow="var(--shadow-sm)";e.currentTarget.style.transform="translateY(0)"}}>
        <button type="button" onClick={e=>toggleFav(p.id,e)} aria-pressed={isFav} aria-label={isFav?`Remover ${p.label} dos favoritos`:`Adicionar ${p.label} aos favoritos`}
          style={{ position:"absolute", top:6, right:6, display:"flex", lineHeight:1, cursor:"pointer", color:isFav?"#D4AC0D":"var(--muted-2)", background:"none", border:"none", padding:6, zIndex:2 }}>
          <Icons.Star size={18} fill={isFav?"#D4AC0D":"none"} />
        </button>
        <div className="proto-card-inner" style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
          <div style={{ width:46, height:46, borderRadius:12, background:tint(p.color), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <ProtoIcon id={p.id} color={p.color} size={26} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div style={{ fontFamily:serif, fontSize:15, fontWeight:700, color:"var(--text-strong)", lineHeight:1.3, paddingRight:24 }}>{p.label}</div>
            </div>
            <span style={{ fontSize:10, background:tint(p.color), color:p.color, border:`1px solid ${p.border}44`, padding:"2px 8px", borderRadius:20, fontFamily:sans, fontWeight:600, whiteSpace:"nowrap", display:"inline-block", marginBottom:8 }}>{p.cat}</span>
            <div style={{ fontSize:12, color:"var(--muted)", fontFamily:sans, lineHeight:1.5, marginBottom:10 }}>{p.sub}</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, color:"var(--text)", fontFamily:sans }}><Icons.Cascade size={13} /> {p.cascade.length} etapas</span>
              <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, color:"var(--text)", fontFamily:sans }}><Icons.Drug size={13} /> {p.drugs.length} fármacos</span>
              {p.antidotes.length>0 && <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, color:"var(--text)", fontFamily:sans }}><Icons.Antidote size={13} /> {p.antidotes.length} antídotos</span>}
              {p.scores.length>0 && <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, color:"var(--text)", fontFamily:sans }}><Icons.Score size={13} /> {p.scores.length} escore(s)</span>}
            </div>
          </div>
          <Icons.ChevronRight size={20} color="var(--muted-2)" style={{ alignSelf:"center", flexShrink:0 }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:F, fontFamily:serif, color:"var(--text-strong)", overflowX:"hidden" }}>

      {/* Instrução de instalação manual (quando não há prompt nativo) */}
      {installHelp && (
        <div onClick={()=>setInstallHelp(false)} style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"var(--surface)", borderRadius:"14px 14px 0 0", padding:"20px", maxWidth:460, width:"100%", boxShadow:"0 -4px 24px rgba(0,0,0,.25)" }}>
            <div style={{ fontFamily:serif, fontSize:18, fontWeight:700, color:"var(--text-strong)", marginBottom:10 }}>
              📲 {isIOS ? "Instalar no iPhone/iPad" : "Adicionar à tela inicial"}
            </div>
            <ol style={{ margin:"0 0 16px 18px", padding:0, fontSize:14, color:"var(--text)", fontFamily:sans, lineHeight:1.9 }}>
              {isIOS ? (
                <>
                  <li>No <strong>Safari</strong>, toque no botão <strong>Compartilhar</strong> (seta para cima).</li>
                  <li>Role e toque em <strong>“Adicionar à Tela de Início”</strong>.</li>
                  <li>Confirme em <strong>“Adicionar”</strong>.</li>
                </>
              ) : isAndroid ? (
                <>
                  <li>No <strong>Chrome</strong>, toque no menu <strong>⋮</strong> (canto superior direito).</li>
                  <li>Toque em <strong>“Instalar app”</strong> ou <strong>“Adicionar à tela inicial”</strong>.</li>
                  <li>Confirme em <strong>“Instalar”</strong>.</li>
                </>
              ) : (
                <>
                  <li>Abra o menu do navegador (⋮ ou ⋯).</li>
                  <li>Escolha <strong>“Instalar app”</strong> / <strong>“Adicionar à tela inicial”</strong>.</li>
                  <li>Use um navegador compatível (Chrome/Edge) e acesse por <strong>HTTPS</strong>.</li>
                </>
              )}
            </ol>
            <button onClick={()=>setInstallHelp(false)} style={{ width:"100%", background:"#2F855A", color:"#fff", border:"none", borderRadius:8, padding:"12px", fontSize:14, fontFamily:sans, fontWeight:700, cursor:"pointer" }}>Entendi</button>
          </div>
        </div>
      )}

      {/* Toast de conteúdo atualizado (backend) */}
      {contentUpdated && !isPed && (
        <div style={{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", zIndex:500, background:"#2F855A", color:"#fff", borderRadius:10, padding:"10px 12px 10px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 4px 20px rgba(0,0,0,.3)", maxWidth:"92vw" }}>
          <span style={{ fontSize:13, fontFamily:sans }}>✅ Conteúdo dos protocolos atualizado</span>
          <button onClick={dismissUpdated} aria-label="Dispensar" style={{ background:"none", border:"none", color:"var(--ok-bg)", fontSize:16, cursor:"pointer", padding:"4px 6px" }}>✕</button>
        </div>
      )}

      {/* Toast de atualização do PWA */}
      {updateReady && (
        <div style={{ position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", zIndex:500, background:"#1A202C", color:"#fff", borderRadius:10, padding:"10px 12px 10px 16px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 4px 20px rgba(0,0,0,.3)", maxWidth:"92vw" }}>
          <span style={{ fontSize:13, fontFamily:sans }}>🔄 Nova versão disponível</span>
          <button onClick={applyUpdate} style={{ background:"#48BB78", color:"#fff", border:"none", borderRadius:6, padding:"7px 14px", fontSize:13, fontFamily:sans, fontWeight:700, cursor:"pointer" }}>Atualizar</button>
          <button onClick={()=>setUpdateReady(false)} aria-label="Dispensar" style={{ background:"none", border:"none", color:"#A0AEC0", fontSize:16, cursor:"pointer", padding:"4px 6px" }}>✕</button>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:W, borderBottom:`1px solid ${BD}`, position:"sticky", top:0, zIndex:200, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 16px" }}>
          <div className="hdr-inner" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {(proto || tools) && (
                <button onClick={()=>window.history.back()} aria-label="Voltar"
                  style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:S, fontSize:13, fontFamily:sans, padding:"8px 10px", borderRadius:6, minHeight:40, whiteSpace:"nowrap" }}>
                  <Icons.ArrowLeft size={18} /><span className="btn-label">Voltar</span>
                </button>
              )}
              <button onClick={()=>{ setProto(null); setTools(false); window.scrollTo({top:0}); pushView({}); }} aria-label="Início"
                style={{ background:"none", border:"none", textAlign:"left", cursor:"pointer", padding:0, minWidth:0 }}>
                <div className="hdr-title" style={{ fontFamily:serif, fontSize:17, fontWeight:700, color:"var(--text-strong)" }}>{tools ? (tool ? (TOOL_META[tool]?.short || "Ferramenta") : "Ferramentas & Calculadoras") : "Protocolos de Emergência"}</div>
                <div className="hdr-sub" style={{ fontSize:11, color:S, fontFamily:sans }}>{tools ? "Acesso rápido. Decisão segura." : "Condutas rápidas. Decisões seguras."}</div>
              </button>
            </div>
            <div className="hdr-actions" style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              {showInstall && (
                <button onClick={onInstallClick} aria-label="Instalar aplicativo"
                  style={{ display:"flex", alignItems:"center", gap:6, background:"#2F855A", color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, fontFamily:sans, fontWeight:700, cursor:"pointer", minHeight:38, whiteSpace:"nowrap" }}>
                  <Icons.Install size={16} /><span className="btn-label">Instalar</span>
                </button>
              )}
              <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} aria-label={theme==="dark"?"Ativar modo claro":"Ativar modo escuro"}
                style={{ display:"flex", alignItems:"center", justifyContent:"center", background:"var(--surface-2)", color:"var(--text)", border:`1px solid ${BD}`, borderRadius:8, padding:"8px 10px", cursor:"pointer", minHeight:38, lineHeight:1 }}>
                {theme==="dark" ? <Icons.Sun size={17} /> : <Icons.Moon size={17} />}
              </button>
              {!tools && (
                <button onClick={openTools} aria-label="Abrir ferramentas e calculadoras" className="tool-btn hdr-tools-btn"
                  style={{ display:"flex", alignItems:"center", gap:6, background:"var(--chip-tool-bg)", color:"var(--chip-tool-fg)", border:"1px solid var(--chip-tool-bd)", borderRadius:8, padding:"8px 12px", fontSize:12, fontFamily:sans, fontWeight:700, cursor:"pointer", minHeight:38, whiteSpace:"nowrap" }}>
                  <Icons.Wrench size={16} /><span className="btn-label">Ferramentas</span>
                </button>
              )}
              {proto !== (isPed ? "pcr_ped" : "pcr") && (
                <button onClick={()=>openProto(isPed ? "pcr_ped" : "pcr")} aria-label="Acesso rápido — Parada Cardiorrespiratória"
                  style={{ background:"#C53030", color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", fontSize:12, fontFamily:sans, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6, minHeight:38, boxShadow:"0 1px 4px rgba(197,48,48,.35)", whiteSpace:"nowrap" }}>
                  <Icons.Siren size={16} /><span className="btn-label">PCR</span>
                </button>
              )}
              <AccountMenu />
            </div>
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── INDEX ── */}
        {!proto && !tools && (
          <>
            {/* Seletor de modo clínico: Adulto (ACLS) ⇄ Pediátrico (PALS) */}
            <div style={{ display:"flex", gap:6, background:W, border:`1px solid ${BD}`, borderRadius:12, padding:5, marginTop:24, boxShadow:"var(--shadow-sm)" }}>
              {[
                { k:"adult", lbl:"Adulto", sub:"ACLS", Ic:Icons.Protocols, c:"#C53030" },
                { k:"ped",   lbl:"Pediátrico", sub:"PALS", Ic:Icons.Baby, c:"#0E7490" },
              ].map(o => {
                const on = mode===o.k;
                return (
                  <button key={o.k} onClick={()=>switchMode(o.k)} aria-pressed={on}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"11px 10px", borderRadius:9, border:"none", cursor:"pointer", fontFamily:sans,
                      background: on ? tint(o.c,14) : "transparent", color: on ? o.c : "var(--muted)", transition:"all .15s" }}>
                    <o.Ic size={18} strokeWidth={2.1} />
                    <span style={{ fontSize:14, fontWeight:on?800:600 }}>{o.lbl}</span>
                    <span style={{ fontSize:10, fontWeight:700, opacity:.8, background: on?`${o.c}22`:"transparent", padding:"1px 7px", borderRadius:10 }}>{o.sub}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ paddingTop:16, paddingBottom:16 }}>
              <div style={{ display:"flex", gap:8, marginBottom:12 }}>
                <div style={{ position:"relative", flex:1, minWidth:0 }}>
                  <Icons.Search size={18} color="var(--muted)" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }} />
                  <input ref={searchRef} value={q} onChange={e=>setQ(e.target.value)} type="search" inputMode="search"
                    aria-label="Pesquisar protocolo, medicamento, sigla ou condição"
                    placeholder="Pesquisar protocolo, medicamento, sintomas..."
                    style={{ width:"100%", boxSizing:"border-box", background:W, border:`1px solid var(--input-border)`, borderRadius:10, padding:"12px 42px 12px 42px", fontSize:16, fontFamily:sans, color:T, outline:"none", boxShadow:"var(--shadow-sm)" }} />
                  {q && (
                    <button onClick={()=>setQ("")} aria-label="Limpar pesquisa"
                      style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", background:"var(--border-2)", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", color:"var(--text)", fontSize:14, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                  )}
                </div>
                <button onClick={()=>setCatOpen(o=>!o)} aria-label="Filtrar por categoria" aria-pressed={catOpen}
                  style={{ flexShrink:0, width:46, borderRadius:10, border:`1px solid ${catOpen||cat!=="Todos"?"#2B6CB0":"var(--input-border)"}`, background:catOpen||cat!=="Todos"?"var(--info-bg)":W, color:catOpen||cat!=="Todos"?"#2B6CB0":"var(--muted)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icons.Filter size={18} />
                </button>
              </div>
              {catOpen && (
                <div className="cat-row">
                  {activeCats.map(c => (
                    <button key={c} onClick={()=>setCat(c)} style={{
                      padding:"5px 13px", borderRadius:20, border:"1px solid",
                      borderColor: cat===c ? "#2B6CB0" : "var(--input-border)",
                      background: cat===c ? "var(--info-bg)" : W,
                      color: cat===c ? "#2B6CB0" : "var(--text)",
                      fontSize:12, fontFamily:sans, fontWeight: cat===c ? 700 : 400, cursor:"pointer",
                    }}>{c}</button>
                  ))}
                </div>
              )}
              {q.trim() && (
                <div style={{ marginTop:8, fontSize:12, color:S, fontFamily:sans }}>
                  {filtered.length===0 ? `Sem resultados para "${q}"` : `${filtered.length} protocolo(s) encontrado(s) para "${q}"`}
                </div>
              )}
            </div>

            {/* Banner de instalação do app */}
            {showInstall && !installDismissed && !q.trim() && (
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", background:"var(--ok-bg)", border:"1px solid var(--ok-bd)", borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
                <img src="/icon-192.png" alt="" width={44} height={44} style={{ borderRadius:10, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--text-strong)", fontFamily:sans }}>Instalar na tela inicial</div>
                  <div style={{ fontSize:12, color:"var(--muted)", fontFamily:sans, marginTop:2 }}>Acesso em 1 toque e funciona offline na sala de emergência.</div>
                </div>
                <button onClick={onInstallClick}
                  style={{ background:"#2F855A", color:"#fff", border:"none", borderRadius:8, padding:"9px 16px", fontSize:13, fontFamily:sans, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  {canInstall ? "Instalar" : "Como instalar"}
                </button>
                <button onClick={()=>setInstallDismissed(true)} aria-label="Dispensar"
                  style={{ background:"none", border:"none", color:"var(--muted)", fontSize:16, cursor:"pointer", padding:"4px 6px", flexShrink:0 }}>✕</button>
              </div>
            )}

            {/* Atalhos diretos para fármacos encontrados */}
            {drugHits.length>0 && (
              <div style={{ marginBottom:16 }}>
                <SectionTitle Ic={Icons.Drug} txt="Medicamentos encontrados" />
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {drugHits.map(({proto:p,drug:d},i) => (
                    <button key={i} onClick={()=>openProto(p.id,"drugs")}
                      style={{ background:W, border:`1px solid ${p.border}55`, borderLeft:`3px solid ${p.border}`, borderRadius:8, padding:"8px 12px", cursor:"pointer", textAlign:"left", fontFamily:sans }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--text-strong)" }}>{d.name}</div>
                      <div style={{ fontSize:11, color:S }}>{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Triagem por sintomas (IA) — disponível no modo adulto */}
            {!q.trim() && !isPed && (
              <div style={{ marginBottom:18 }}>
                <SymptomTriage protocols={protocols} onOpen={(id)=>openProto(id)} />
              </div>
            )}

            {/* Ferramentas rápidas */}
            {!q.trim() && (
              <div style={{ marginBottom:18 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", margin:"4px 0 10px" }}>
                  <SectionTitle txt="Ferramentas rápidas" Ic={Icons.Wrench} />
                  <button onClick={()=>openTools()} style={{ background:"none", border:"none", cursor:"pointer", color:"#2B6CB0", fontSize:12, fontFamily:sans, fontWeight:700, display:"flex", alignItems:"center", gap:2 }}>
                    Ver todas <Icons.ChevronRight size={15} />
                  </button>
                </div>
                <div className="quick-grid">
                  {QUICK_TOOLS.map(t => (
                    <button key={t.label} onClick={()=>t.id?openTool(t.id):openTools()} className="quick-card"
                      style={{ background:W, border:`1px solid ${BD}`, borderRadius:12, padding:"14px", cursor:"pointer", textAlign:"left", fontFamily:sans, display:"flex", flexDirection:"column", gap:8, boxShadow:"var(--shadow-sm)", transition:"all .15s" }}>
                      <span style={{ width:40, height:40, borderRadius:10, background:tint(t.color,16), display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <t.Ic size={21} color={t.color} />
                      </span>
                      <span style={{ fontSize:13, fontWeight:700, color:"var(--text-strong)", lineHeight:1.2 }}>{t.label}</span>
                      <span style={{ fontSize:11, color:S }}>{t.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Favoritos */}
            {!q.trim() && favProtos.length>0 && (
              <div style={{ marginBottom:16 }}>
                <SectionTitle Ic={Icons.Star} txt="Favoritos" />
                <div className="proto-grid">{favProtos.map(renderCard)}</div>
              </div>
            )}

            {/* Recentes */}
            {!q.trim() && recentProtos.length>0 && (
              <div style={{ marginBottom:16 }}>
                <SectionTitle Ic={Icons.Clock} txt="Acessados recentemente" />
                <div className="proto-grid">{recentProtos.map(renderCard)}</div>
              </div>
            )}

            {(!q.trim() && (favProtos.length>0 || recentProtos.length>0)) && <SectionTitle txt="Todos os protocolos" />}
            {filtered.length === 0 && drugHits.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 20px", color:"var(--muted)", fontFamily:sans }}>
                <Icons.Search size={40} color="var(--muted-2)" strokeWidth={1.5} />
                <div style={{ fontSize:15, fontWeight:700, color:"var(--text)", marginTop:12 }}>Nenhum resultado para “{q}”</div>
                <div style={{ fontSize:13, marginTop:4 }}>Tente outro termo, uma sigla (ex: IAM, TEP) ou um medicamento.</div>
                <button onClick={()=>setQ("")} style={{ marginTop:16, padding:"9px 18px", borderRadius:8, border:`1px solid ${BD}`, background:W, color:"var(--text)", fontFamily:sans, fontSize:13, fontWeight:600, cursor:"pointer" }}>Limpar busca</button>
              </div>
            ) : (
              <div className="proto-grid">
                {filtered.map(renderCard)}
              </div>
            )}

            <div style={{ display:"flex", alignItems:"flex-start", gap:12, background:W, border:`1px solid ${BD}`, borderRadius:12, padding:"14px 16px", marginBottom:32, boxShadow:"var(--shadow-sm)" }}>
              <span style={{ width:36, height:36, borderRadius:9, background:tint("#2F855A",16), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icons.Shield size={20} color="#2F855A" />
              </span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text-strong)", fontFamily:sans }}>Conteúdo baseado em diretrizes atualizadas</div>
                <div style={{ fontSize:12, color:S, fontFamily:sans, lineHeight:1.5, marginTop:2 }}>{isPed ? "AHA/PALS 2020–2025 · SBP. Doses por peso (kg) — confira cada cálculo; a decisão é do médico assistente." : "AHA/ACLS 2020–2025 · Surviving Sepsis 2021 · SBC. Verifique a data de revisão dentro de cada protocolo — a decisão é do médico assistente."}</div>
              </div>
            </div>
          </>
        )}

        {/* ── TOOLS — CATÁLOGO ── */}
        {tools && !tool && (
          <div style={{ paddingTop:20, paddingBottom:60 }}>
            {TOOL_GROUPS.filter(g => !g.mode || g.mode === mode).map(group => (
              <div key={group.cat} style={{ marginBottom:22 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, color:group.color, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>
                  {group.cat==="Fluxo crítico" && <Icons.Siren size={14} />}{group.cat==="Inteligência" && <Icons.Sparkles size={14} />}{group.cat}
                </div>
                <div className="tool-cat-grid">
                  {group.items.map(item => {
                    const meta = TOOL_META[item.id] || {};
                    const Ic = meta.Ic || Icons.Score;
                    const crit = group.cat==="Fluxo crítico";
                    return (
                      <button key={item.id} onClick={()=>openTool(item.id)} className="tool-card"
                        style={{ display:"flex", flexDirection:"column", gap:9, padding:"14px", borderRadius:14, cursor:"pointer", textAlign:"left", fontFamily:sans,
                          background: crit ? tint(group.color,12) : W, border:`1px solid ${crit?group.border+"66":BD}`, boxShadow:"var(--shadow-sm)", transition:"all .15s" }}>
                        <span style={{ width:42, height:42, borderRadius:11, background:tint(group.color,16), display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <Ic size={22} color={group.color} />
                        </span>
                        <span style={{ fontSize:13, fontWeight:700, color:"var(--text-strong)", lineHeight:1.2 }}>{meta.short || item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:W, border:`1px solid ${BD}`, borderRadius:12, padding:"12px 14px", marginBottom:32, boxShadow:"var(--shadow-sm)" }}>
              <Icons.Alert size={18} color="var(--warn-fg)" style={{ flexShrink:0, marginTop:1 }} />
              <span style={{ fontSize:12, color:S, fontFamily:sans, lineHeight:1.5 }}>Calculadoras são apoio à decisão. Confira sempre doses, diluições e contraindicações — a responsabilidade é do médico assistente.</span>
            </div>
          </div>
        )}

        {/* ── TOOLS — FERRAMENTA DEDICADA ── */}
        {tools && tool && (() => {
          let kind = "score", gcolor = "#2B6CB0", gborder = "#2B6CB0", gcat = "";
          for (const g of TOOL_GROUPS) { const it = g.items.find(i => i.id === tool); if (it) { kind = it.kind || "score"; gcolor = g.color; gborder = g.border; gcat = g.cat; break; } }
          const meta = TOOL_META[tool] || {};
          const needsWeight = kind === "infusion" || (kind === "code" && isPed) || (kind === "score" && (SCORES_DEF[tool]?.inputs || []).some(i => i.k === "peso"));
          return (
            <div style={{ paddingTop:16, paddingBottom:60 }}>
              <button onClick={()=>window.history.back()} style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"none", cursor:"pointer", color:S, fontSize:13, fontFamily:sans, padding:"6px 0", marginBottom:8 }}>
                <Icons.ArrowLeft size={17} /> Ferramentas
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                <span style={{ width:46, height:46, borderRadius:12, background:tint(gcolor,16), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {meta.Ic ? <meta.Ic size={24} color={gcolor} /> : <Icons.Score size={24} color={gcolor} />}
                </span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:serif, fontSize:20, fontWeight:700, color:"var(--text-strong)" }}>{meta.short || "Ferramenta"}</div>
                  <div style={{ fontSize:12, color:S, fontFamily:sans }}>{gcat}</div>
                </div>
              </div>

              {needsWeight && (
                <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--info-bg)", border:"1px solid var(--info-bd)", borderRadius:10, padding:"10px 14px", marginBottom:16, flexWrap:"wrap" }}>
                  <label htmlFor="peso-tool" style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#2B6CB0", fontFamily:sans, fontWeight:700 }}><Icons.Scale size={15} /> Peso do paciente</label>
                  <input id="peso-tool" type="number" inputMode="decimal" min={1} max={300} placeholder="kg" value={weight}
                    onChange={e=>setWeight(e.target.value)}
                    style={{ width:90, border:"1px solid var(--input-border)", borderRadius:6, padding:"8px 10px", fontSize:16, fontFamily:sans, outline:"none", background:"var(--input-bg)" }} />
                  <span style={{ fontSize:12, color:S, fontFamily:sans }}>kg</span>
                </div>
              )}

              {kind === "code" && <CodeTimer pals={isPed} weight={weight} />}
              {kind === "procedures" && <Procedures />}
              {kind === "pedweight" && <PedWeight onApply={setWeight} currentWeight={weight} />}
              {kind === "assistant" && <AIAssistant protocols={protocols} weight={weight} focusId={aiFocus} focusLabel={protocols.find(p=>p.id===aiFocus)?.label} />}
              {kind === "anamnese" && <AnamneseTool onOpenProtocol={openProto} onOpenTool={openTool} protocols={protocols} />}
              {kind === "infusion" && <InfusionCalc globalW={weight} />}
              {kind === "score" && <ScoreWidget scoreKey={tool} color={gcolor} light={tint(gcolor)} border={gborder} globalW={weight} />}
            </div>
          );
        })()}

        {/* ── PROTOCOL DETAIL ── */}
        {proto && cur && (
          <div style={{ paddingTop:20, paddingBottom:60 }}>

            {/* Protocol header */}
            <div className="proto-hdr" style={{ background:W, border:`1px solid ${BD}`, borderLeft:`5px solid ${cur.border}`, borderRadius:10, marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
              <div className="proto-hdr-row" style={{ display:"flex", alignItems:"center", gap:16, justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:16, minWidth:0, flex:1 }}>
                  <div style={{ width:58, height:58, borderRadius:14, background:tint(cur.color), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <ProtoIcon id={cur.id} color={cur.color} size={32} />
                  </div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:10, color:cur.color, fontFamily:sans, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>{cur.cat}</div>
                    <div style={{ fontFamily:serif, fontSize:21, fontWeight:700, color:"var(--text-strong)", marginBottom:3, overflowWrap:"break-word" }}>{cur.label}</div>
                    <div style={{ fontSize:13, color:S, fontFamily:sans, marginBottom:6, overflowWrap:"break-word" }}>{cur.sub}</div>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:10, color:cur.color, background:tint(cur.color), border:`1px solid ${cur.border}44`, padding:"2px 8px", borderRadius:12, fontFamily:sans, fontWeight:600 }}>
                      ✔ Revisado em {REV}
                    </span>
                  </div>
                </div>
                <div className="weight-box" style={{ display:"flex", alignItems:"center", gap:8, background:tint(cur.color), border:`1px solid ${cur.border}44`, borderRadius:8, padding:"8px 12px", flexShrink:0 }}>
                  <label htmlFor="peso-paciente" style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:cur.color, fontFamily:sans, fontWeight:700, whiteSpace:"nowrap" }}><Icons.Scale size={14} /> Peso do paciente</label>
                  <input id="peso-paciente" type="number" inputMode="decimal" min={1} max={300} placeholder="—" value={weight}
                    onChange={e=>setWeight(e.target.value)}
                    style={{ width:72, border:"1px solid var(--input-border)", borderRadius:6, padding:"7px 8px", fontSize:16, fontFamily:sans, outline:"none", background:"var(--input-bg)" }} />
                  <span style={{ fontSize:12, color:S, fontFamily:sans }}>kg</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs-row">
              {[
                { k:"cascade", Ic:Icons.Cascade, lbl:`Cascata (${cur.cascade.length})` },
                { k:"drugs", Ic:Icons.Drug, lbl:`Medicamentos (${cur.drugs.length})` },
                ...(cur.antidotes.length>0 ? [{ k:"antidotes", Ic:Icons.Antidote, lbl:`Antídotos (${cur.antidotes.length})` }] : []),
                ...(cur.scores.length>0 ? [{ k:"scores", Ic:Icons.Score, lbl:`Escores (${cur.scores.length})` }] : []),
              ].map(t => (
                <button key={t.k} onClick={()=>setTab(t.k)} className="tab-btn" style={{
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  background: tab===t.k ? tint(cur.color) : "transparent",
                  color: tab===t.k ? cur.color : S,
                  fontWeight: tab===t.k ? 700 : 400,
                  borderLeft: tab===t.k ? `2px solid ${cur.border}` : "2px solid transparent",
                }}><t.Ic size={15} strokeWidth={2} /> {t.lbl}</button>
              ))}
            </div>

            {/* Atalho: explicar este protocolo com IA */}
            <button onClick={()=>openTool("assistant", cur.id)}
              style={{ display:"flex", alignItems:"center", gap:9, width:"100%", marginBottom:18, padding:"11px 14px", borderRadius:10, cursor:"pointer", textAlign:"left", fontFamily:sans,
                background:"color-mix(in srgb,#7C3AED 7%,var(--surface))", border:"1px solid color-mix(in srgb,#7C3AED 28%,var(--border))" }}>
              <span style={{ width:34, height:34, borderRadius:9, background:"color-mix(in srgb,#7C3AED 16%,var(--surface))", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icons.Sparkles size={18} color="#7C3AED" />
              </span>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"block", fontSize:13, fontWeight:700, color:"var(--text-strong)" }}>Tirar dúvidas com a IA</span>
                <span style={{ display:"block", fontSize:11.5, color:S }}>Por que de cada passo, doses e gravidade — focado em {cur.label}</span>
              </span>
              <Icons.ChevronRight size={18} color="var(--muted-2)" style={{ flexShrink:0 }} />
            </button>

            {/* ── CASCADE TAB ── */}
            {tab === "cascade" && (
              <div>
                {/* Checklist bar */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, padding:"10px 14px", background:W, border:`1px solid ${BD}`, borderRadius:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                    <span style={{ fontSize:13, fontFamily:sans, color:"var(--text)" }}>
                      {clMode ? `✅ Checklist — ${done}/${cur.cascade.length} etapas` : "Modo leitura"}
                    </span>
                    {clMode && done>0 && (
                      <div style={{ background:"var(--border)", borderRadius:20, height:6, width:70, overflow:"hidden", flexShrink:0 }}>
                        <div style={{ height:6, background:cur.border, width:`${(done/cur.cascade.length)*100}%`, transition:"width .3s" }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
                    <button onClick={toggleAllSteps} style={{ padding:"5px 12px", border:`1px solid var(--input-border)`, borderRadius:6, background:W, color:"var(--text)", fontSize:12, fontFamily:sans, fontWeight:600, cursor:"pointer", minHeight:32 }}>
                      {allOpen ? "− Recolher tudo" : "+ Expandir tudo"}
                    </button>
                    {clMode && done>0 && (
                      <button onClick={()=>setChecks({})} style={{ padding:"4px 10px", border:`1px solid ${BD}`, borderRadius:6, background:W, color:S, fontSize:11, fontFamily:sans, cursor:"pointer", minHeight:32 }}>Limpar</button>
                    )}
                    <button onClick={()=>{setClMode(m=>!m);setChecks({});}} style={{
                      padding:"5px 12px", border:`1px solid ${clMode?cur.border:"var(--input-border)"}`,
                      borderRadius:6, background:clMode?tint(cur.color):W, color:clMode?cur.color:"var(--text)",
                      fontSize:12, fontFamily:sans, fontWeight:600, cursor:"pointer",
                    }}>{clMode?"✓ Checklist ON":"☐ Ativar Checklist"}</button>
                  </div>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {cur.cascade.map((step, idx) => {
                    const isOpen = !!openSteps[idx];
                    const isDone = !!checks[idx];
                    return (
                      <div key={idx} className="step-row" style={{ display:"flex", gap:12, position:"relative" }}>
                        <div style={{ position:"relative", flexShrink:0, width:32, display:"flex", justifyContent:"center" }}>
                          {idx < cur.cascade.length-1 && (
                            <div style={{ position:"absolute", top:34, bottom:-12, left:"50%", width:2, transform:"translateX(-50%)", background:(isDone&&clMode)?cur.border:"var(--border)" }} />
                          )}
                          <div style={{ position:"relative", zIndex:1, width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, fontFamily:sans,
                            background:step.alert?"var(--danger-bg)":tint(cur.color), border:`2px solid ${step.alert?"var(--danger-bd)":cur.border}`,
                            color:step.alert?"var(--danger-fg)":cur.color }}>
                            {isDone&&clMode ? "✓" : step.step}
                          </div>
                        </div>
                        <div style={{ flex:1, minWidth:0, background:W, border:`1px solid ${isDone&&clMode?cur.border:BD}`, borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)", opacity:isDone&&clMode?.78:1, transition:"all .2s" }}>
                          <button onClick={()=>setOpenSteps(p=>({...p,[idx]:!p[idx]}))} className="step-hdr" aria-expanded={isOpen} style={{
                            width:"100%", border:"none", cursor:"pointer", textAlign:"left",
                            display:"flex", alignItems:"center", gap:10, fontFamily:serif,
                            background: isOpen?(step.alert?"color-mix(in srgb,#C53030 8%,var(--surface))":"var(--surface-2)"):W,
                            borderBottom: isOpen?`1px solid ${BD}`:"none", transition:"background .15s",
                          }}>
                            {clMode && (
                              <div onClick={e=>{e.stopPropagation();toggleCheck(idx);}} style={{
                                width:22, height:22, borderRadius:6, flexShrink:0,
                                border:`2px solid ${isDone?cur.border:"var(--input-border)"}`,
                                background: isDone?tint(cur.color):W,
                                display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                              }}>
                                {isDone && <span style={{ color:cur.color, fontSize:13, fontWeight:900 }}>✓</span>}
                              </div>
                            )}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              {step.alert && <span style={{ fontSize:10, background:"var(--danger-bg)", color:"var(--danger-fg)", border:"1px solid var(--danger-bd)", padding:"1px 8px", borderRadius:20, fontFamily:sans, fontWeight:700 }}>ATENÇÃO</span>}
                              {isDone&&clMode && <span style={{ fontSize:10, background:tint(cur.color), color:cur.color, border:`1px solid ${cur.border}55`, padding:"1px 8px", borderRadius:20, fontFamily:sans, fontWeight:700 }}>CONCLUÍDO</span>}
                              <span style={{ fontSize:10, color:step.alert?"var(--danger-fg)":"var(--text-strong)", fontFamily:sans, fontWeight:700, letterSpacing:"0.05em", lineHeight:1.4 }}>{step.phase}</span>
                            </div>
                          </div>
                          <span style={{ display:"flex", color:"var(--muted-2)", transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s", flexShrink:0 }}><Icons.ChevronDown size={18} /></span>
                        </button>

                        {isOpen && (
                          <div className="step-body">
                            {step.items.length>0 && (
                              <div style={{ marginBottom:step.decision?16:0 }}>
                                {step.items.map((it,i) => (
                                  <div key={i} style={{ display:"flex", gap:12, paddingTop:9, paddingBottom:9, borderBottom:i<step.items.length-1?`1px solid var(--border-2)`:"none" }}>
                                    <div style={{ width:6, height:6, borderRadius:"50%", background:cur.border, marginTop:7, flexShrink:0 }} />
                                    <span style={{ fontSize:14, lineHeight:1.65, color:T, fontFamily:sans }}>{it}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {step.decision && (
                              <div style={{ background:"var(--surface-2)", border:`1px solid ${BD}`, borderRadius:8, padding:"14px 16px", marginTop:step.items.length>0?12:0 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, fontWeight:700, color:T, fontFamily:sans, marginBottom:8 }}><Icons.Decision size={16} color={cur.color} /> Ponto de Decisão</div>
                                <div style={{ fontSize:13, color:"var(--text)", fontFamily:sans, marginBottom:10, fontStyle:"italic" }}>{step.decision.q}</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                                    <span style={{ fontSize:11, background:"var(--ok-bg)", color:"var(--ok-fg)", border:"1px solid var(--ok-bd)", padding:"2px 10px", borderRadius:20, fontFamily:sans, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>SIM</span>
                                    <span style={{ fontSize:13, color:T, fontFamily:sans }}>{step.decision.yes}</span>
                                  </div>
                                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                                    <span style={{ fontSize:11, background:"var(--danger-bg)", color:"var(--danger-fg)", border:"1px solid var(--danger-bd)", padding:"2px 10px", borderRadius:20, fontFamily:sans, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>NÃO</span>
                                    <span style={{ fontSize:13, color:T, fontFamily:sans }}>{step.decision.no}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DRUGS TAB ── */}
            {tab==="drugs" && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {cur.drugs.length>1 && <DrugAlerts protocol={cur} weight={weight} color={cur.color} />}
                {cur.drugs.map((d,i) => (
                  <div key={i} style={{ background:W, border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
                    <div style={{ background:tint(cur.color), borderBottom:`1px solid ${cur.border}33`, padding:"12px 18px" }}>
                      <div style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:"var(--text-strong)" }}>{d.name}</div>
                      <div style={{ fontSize:11, color:cur.color, fontFamily:sans, fontWeight:600 }}>{d.cat}</div>
                    </div>
                    <div className="drug-body">
                      {d.dilui && (
                        <div style={{ background:tint(cur.color), border:`1px solid ${cur.border}44`, borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
                          <Label txt="💧 Diluição padrão" />
                          <div style={{ fontSize:13, color:"var(--text-strong)", fontFamily:sans, fontWeight:600, lineHeight:1.5 }}>{d.dilui}</div>
                        </div>
                      )}
                      <div className="drug-grid">
                        <div><Label txt="Dose" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.dose}</div></div>
                        <div><Label txt="Via de Administração" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.via}</div></div>
                      </div>
                      <div style={{ marginBottom:10 }}><Label txt="Indicação" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.ind}</div></div>
                      <div style={{ marginBottom:d.obs?10:0 }}><Label txt="Contraindicações" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.ci}</div></div>
                      {d.obs && (
                        <div style={{ background:"var(--warn-bg)", border:"1px solid var(--warn-bd)", borderRadius:6, padding:"10px 12px", marginBottom:10 }}>
                          <div style={{ fontSize:11, color:"var(--warn-fg)", fontFamily:sans, fontWeight:700, marginBottom:3 }}>⚠️ Observação Clínica</div>
                          <div style={{ fontSize:13, color:"var(--warn-fg)", fontFamily:sans, lineHeight:1.5 }}>{d.obs}</div>
                        </div>
                      )}
                      <DoseCalc drugName={d.name} protocolId={cur.id} color={cur.color} light={tint(cur.color)} border={cur.border} globalW={weight} />
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
                      <tr style={{ background:tint(cur.color), borderBottom:`2px solid ${cur.border}44` }}>
                        {["Agente / Tóxico","Antídoto","Dose / Regime","Observações Clínicas"].map(h => (
                          <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, color:cur.color, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cur.antidotes.map((r,i) => (
                        <tr key={i} style={{ borderBottom:i<cur.antidotes.length-1?`1px solid var(--border-2)`:"none", background:i%2===0?W:"var(--surface-2)" }}>
                          <td style={{ padding:"11px 14px", fontSize:13, fontFamily:sans, fontWeight:600, color:T, verticalAlign:"top" }}>{r.agent}</td>
                          <td style={{ padding:"11px 14px", verticalAlign:"top" }}>
                            <span style={{ fontSize:13, fontFamily:sans, fontWeight:700, color:cur.color, background:tint(cur.color), padding:"2px 10px", borderRadius:20, display:"inline-block" }}>{r.antidote}</span>
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
                      <div style={{ background:tint(cur.color), borderBottom:`1px solid ${cur.border}33`, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:14, fontWeight:700, color:"var(--text-strong)", fontFamily:sans }}>{r.agent}</span>
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
                <div style={{ background:"var(--info-bg)", border:"1px solid var(--info-bd)", borderRadius:8, padding:"10px 14px", marginBottom:16, fontFamily:sans, fontSize:12, color:"var(--info-fg)" }}>
                  ℹ️ Escores clínicos validados para este protocolo. Marque os critérios presentes e veja a interpretação clínica automática.
                </div>
                {cur.scores.map(sk => (
                  <ScoreWidget key={sk} scoreKey={sk} color={cur.color} light={tint(cur.color)} border={cur.border} />
                ))}
              </div>
            )}

            <div style={{ background:"var(--warn-bg)", border:"1px solid var(--warn-bd)", borderRadius:8, padding:"10px 14px", marginTop:24, fontFamily:sans, fontSize:11, color:"var(--warn-fg)", lineHeight:1.6 }}>
              ⚕️ Ferramenta de apoio à decisão clínica. Confira doses, vias e contraindicações antes de prescrever — a responsabilidade terapêutica é do médico assistente.
            </div>

          </div>
        )}
      </div>

      {/* BOTTOM NAV (mobile) */}
      <nav className="bottom-nav" aria-label="Navegação principal">
        {[
          { k:"protocolos", Ic:Icons.Protocols, lbl:"Protocolos", active: !tools, onClick: goHome },
          { k:"buscar",     Ic:Icons.Search,    lbl:"Buscar",     active: false,   onClick: goSearch },
          { k:"ferramentas",Ic:Icons.Wrench,    lbl:"Ferramentas",active: tools,   onClick: openTools },
        ].map(it => (
          <button key={it.k} onClick={it.onClick} aria-current={it.active ? "page" : undefined}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"8px 4px",
              color: it.active ? "#C53030" : "var(--muted)", fontFamily:sans, fontSize:10, fontWeight: it.active ? 700 : 500 }}>
            <it.Ic size={22} strokeWidth={it.active ? 2.3 : 1.9} />
            {it.lbl}
          </button>
        ))}
      </nav>

      {/* RODAPÉ — créditos */}
      <footer style={{ borderTop:`1px solid ${BD}`, background:"var(--surface)", padding:"30px 20px 42px", textAlign:"center" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <svg className="ecg-line" width="120" height="26" viewBox="0 0 120 26" fill="none" style={{ marginBottom:10, opacity:.9 }} aria-hidden="true">
            <path d="M0 13 H34 l5 -9 l6 18 l5 -13 l4 6 H78 l5 -10 l6 16 H120"
              stroke="#C53030" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontFamily:serif, fontSize:15, color:"var(--text)", marginBottom:4 }}>
            Idealizado pelo <strong style={{ color:"var(--text-strong)" }}>Dr. Maurício Moraes</strong>
          </div>
          <div style={{ fontSize:13, color:"var(--muted)", fontFamily:sans }}>
            Desenvolvido pela{" "}
            <span style={{ fontWeight:800, letterSpacing:".02em", background:"linear-gradient(90deg,#2B6CB0,#0E7490)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>
              Prime Automate
            </span>
          </div>
          <div style={{ fontSize:11, color:"var(--muted-2)", fontFamily:sans, marginTop:14 }}>
            Protocolos de Emergência · ACLS 2025 · © {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      <style>{`
        .ecg-line path { stroke-dasharray: 240; stroke-dashoffset: 240; animation: ecg 2.4s ease-in-out infinite; }
        @keyframes ecg { 0% { stroke-dashoffset: 240; } 55% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: 0; opacity:.35; } }
        @media (prefers-reduced-motion: reduce) { .ecg-line path { animation: none; stroke-dashoffset: 0; } }

        :root, [data-theme="light"] {
          --bg:#F7F9FC; --surface:#FFFFFF; --surface-2:#F7FAFC;
          --border:#E2E8F0; --border-2:#EDF2F7;
          --text-strong:#1A202C; --text:#2D3748; --muted:#718096; --muted-2:#A0AEC0;
          --input-bg:#FFFFFF; --input-border:#CBD5E0;
          --chip-tool-bg:#EBF8FF; --chip-tool-fg:#2B6CB0; --chip-tool-bd:#BEE3F8;
          --info-bg:#EBF8FF; --info-bd:#BEE3F8; --info-fg:#2C5282;
          --warn-bg:#FFFBEB; --warn-bd:#F6E05E; --warn-fg:#744210;
          --ok-bg:#C6F6D5; --ok-bd:#9AE6B4; --ok-fg:#276749;
          --danger-bg:#FED7D7; --danger-bd:#FC8181; --danger-fg:#9B2C2C;
          --shadow-sm:0 1px 3px rgba(0,0,0,.06); --shadow-md:0 4px 16px rgba(0,0,0,.10);
        }
        [data-theme="dark"] {
          --bg:#0E1217; --surface:#1A212B; --surface-2:#222C38;
          --border:#2C3744; --border-2:#283341;
          --text-strong:#F1F5F9; --text:#DCE3EC; --muted:#94A3B8; --muted-2:#64748B;
          --input-bg:#10161D; --input-border:#3A4654;
          --chip-tool-bg:#15293B; --chip-tool-fg:#7CC0F0; --chip-tool-bd:#2A4A66;
          --info-bg:#13283B; --info-bd:#244B6B; --info-fg:#9FCBEC;
          --warn-bg:#2E2410; --warn-bd:#5C4A1A; --warn-fg:#E8C766;
          --ok-bg:#10291B; --ok-bd:#1F5235; --ok-fg:#86E0A6;
          --danger-bg:#2E1416; --danger-bd:#6B2A2E; --danger-fg:#F4A6A6;
          --shadow-sm:0 1px 3px rgba(0,0,0,.4); --shadow-md:0 6px 20px rgba(0,0,0,.55);
        }
        :root {
          --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif;
          --font-display: var(--font);
        }
        html, body { background: var(--bg); font-family: var(--font); -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
        * { box-sizing: border-box; }
        .bottom-nav { display: none; }
        .quick-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .quick-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .tool-cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
        .tool-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        @media (hover: none) { .quick-card:active, .tool-card:active { transform: scale(.98); } }
        button:focus-visible, [role="button"]:focus-visible { outline: 2px solid #4299E1; outline-offset: 2px; }
        button:focus:not(:focus-visible) { outline: none; }

        .hdr-inner { padding-top:14px; padding-bottom:14px; }
        .page-pad { padding: 0 20px; }
        .proto-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; padding-bottom:32px; }
        .proto-card-inner { padding: 18px 20px; }
        .proto-hdr { padding: 20px 24px; }
        .cat-row { display:flex; gap:8px; flex-wrap:wrap; }
        .tabs-row { display:flex; background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:4px; max-width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom:20px; }
        .tab-btn { padding:8px 16px; border-radius:6px; border:none; font-size:13px; font-family:sans-serif; cursor:pointer; transition:all .15s; white-space:nowrap; flex-shrink:0; }
        .step-hdr { padding: 14px 18px; }
        .step-body { padding: 16px 18px 18px; }
        .drug-body { padding: 14px 18px; }
        .drug-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
        .ant-table-wrap { display:block; }
        .ant-cards-wrap { display:none; }

        @media (max-width: 640px) {
          .hdr-inner { padding-top:12px; padding-bottom:12px; gap:8px; }
          .hdr-actions { gap:6px; }
          .btn-label { display:none; }            /* botões viram só ícone no mobile */
          .hdr-title { font-size:15px; line-height:1.2; }
          .hdr-sub { display:none; }
          .proto-hdr-row { flex-direction:column; align-items:stretch; gap:14px; }
          .weight-box { width:100%; justify-content:flex-start; }
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
          .hdr-tools-btn { display:none; }
          .bottom-nav { display:flex; position:fixed; left:0; right:0; bottom:0; z-index:300;
            background:var(--surface); border-top:1px solid var(--border); box-shadow:0 -2px 12px rgba(0,0,0,.07);
            padding-bottom:env(safe-area-inset-bottom,0px); }
          footer { padding-bottom:88px; }
        }
      `}</style>
    </div>
  );
}
