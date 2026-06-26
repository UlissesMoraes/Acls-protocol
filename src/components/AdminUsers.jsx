import { useState, useEffect } from "react";
import { Users, X, Loader2, AlertTriangle, CheckCircle2, Clock, RefreshCw, Wallet } from "lucide-react";
import { supabase } from "../lib/supabase.js";
import { getAccessToken } from "../lib/subscription.js";

const sans = "var(--font)";
const ACCENT = "#2B6CB0";

const fmt = iso => { try { return iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"; } catch { return "—"; } };

export default function AdminUsers({ onClose }) {
  const [state, setState] = useState({ loading: true, error: "", users: [] });
  const [mp, setMp] = useState({ loading: false, done: false, data: null, error: "" });

  const checkMp = async () => {
    setMp({ loading: true, done: false, data: null, error: "" });
    try {
      const token = await getAccessToken();
      const r = await fetch("/api/mp-status", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setMp({ loading: false, done: true, data: null, error: body.error || `Erro ${r.status}` }); return; }
      setMp({ loading: false, done: true, data: body, error: "" });
    } catch (e) {
      setMp({ loading: false, done: true, data: null, error: e.message || "Falha ao verificar." });
    }
  };

  const load = async () => {
    setState(s => ({ ...s, loading: true, error: "" }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setState({ loading: false, error: "Sessão expirada — entre novamente.", users: [] }); return; }
      const r = await fetch("/api/admin-users", { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setState({ loading: false, error: body.detail || body.error || `Erro ${r.status}.`, users: [] }); return; }
      setState({ loading: false, error: "", users: body.users || [] });
    } catch (e) {
      setState({ loading: false, error: e.message || "Falha ao carregar.", users: [] });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, marginTop: "5vh", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.3)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)", background: `color-mix(in srgb,${ACCENT} 8%,var(--surface))` }}>
          <Users size={20} color={ACCENT} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--text-strong)" }}>Usuários cadastrados</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: sans }}>{state.loading ? "Carregando…" : `${state.users.length} usuário(s)`}</div>
          </div>
          <button onClick={load} title="Atualizar" disabled={state.loading} style={iconBtn}><RefreshCw size={16} className={state.loading ? "auth-spin" : ""} /></button>
          <button onClick={onClose} title="Fechar" style={iconBtn}><X size={18} /></button>
        </div>

        <div style={{ padding: 16, maxHeight: "70vh", overflowY: "auto" }}>
          <style>{`@keyframes authSpin{to{transform:rotate(360deg)}}.auth-spin{animation:authSpin 1s linear infinite}`}</style>

          {state.loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 30, color: "var(--muted)", fontFamily: sans, fontSize: 13 }}>
              <Loader2 size={18} className="auth-spin" /> Carregando usuários…
            </div>
          )}

          {!state.loading && state.error && (
            <div style={{ display: "flex", gap: 9, background: "var(--danger-bg)", border: "1px solid var(--danger-bd)", color: "var(--danger-fg)", borderRadius: 10, padding: "12px 14px", fontSize: 13, fontFamily: sans, lineHeight: 1.5 }}>
              <AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} /> {state.error}
            </div>
          )}

          {!state.loading && !state.error && state.users.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--muted)", fontFamily: sans, fontSize: 13, padding: 24 }}>Nenhum usuário cadastrado ainda.</div>
          )}

          {!state.loading && !state.error && state.users.map(u => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderBottom: "1px solid var(--border-2,var(--border))" }}>
              <span style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: `color-mix(in srgb,${ACCENT} 16%,var(--surface))`, color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontFamily: sans }}>
                {(u.email?.[0] || "?").toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans, wordBreak: "break-all" }}>{u.email}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans, display: "flex", flexWrap: "wrap", gap: 10, marginTop: 2 }}>
                  {u.name && <span>{u.name}</span>}
                  <span title="Cadastro">cadastro: {fmt(u.created_at)}</span>
                  <span title="Último acesso" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Clock size={11} /> {fmt(u.last_sign_in_at)}</span>
                </div>
              </div>
              <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: sans, fontWeight: 700, padding: "3px 8px", borderRadius: 20,
                background: u.confirmed ? "color-mix(in srgb,#1E8449 12%,var(--surface))" : "var(--surface-2)", color: u.confirmed ? "#1E8449" : "var(--muted)" }}>
                {u.confirmed ? <><CheckCircle2 size={12} /> confirmado</> : "pendente"}
              </span>
            </div>
          ))}

          {/* Diagnóstico Mercado Pago */}
          <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Wallet size={16} color="#1E8449" />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text-strong)", fontFamily: sans }}>Integração Mercado Pago</span>
              <button onClick={checkMp} disabled={mp.loading} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--text)", fontSize: 12.5, fontFamily: sans, fontWeight: 700, cursor: "pointer" }}>
                {mp.loading ? <Loader2 size={14} className="auth-spin" /> : <RefreshCw size={14} />} Verificar conta
              </button>
            </div>
            {mp.error && <div style={{ fontSize: 12.5, color: "#C53030", fontFamily: sans }}>{mp.error}</div>}
            {mp.done && mp.data && !mp.data.configured && <div style={{ fontSize: 12.5, color: "#B7791F", fontFamily: sans }}>MP_ACCESS_TOKEN não configurado na Vercel.</div>}
            {mp.done && mp.data?.valid && (
              <div style={{ fontSize: 13, fontFamily: sans, color: "var(--text)", lineHeight: 1.7 }}>
                <div>Conta recebedora: <strong>{mp.data.name || "—"}</strong> <span style={{ color: "var(--muted)" }}>({mp.data.nickname})</span></div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>email: {mp.data.email || "—"} · país: {mp.data.site_id || "—"} · id: {mp.data.id}</div>
                {mp.data.looks_test
                  ? <div style={{ marginTop: 4, color: "#B7791F", fontWeight: 700 }}>⚠️ Parece ser uma conta de TESTE — troque pelo token de produção.</div>
                  : <div style={{ marginTop: 4, color: "#1E8449", fontWeight: 700 }}>✓ É o nome que aparece para quem paga o Pix.</div>}
              </div>
            )}
            {mp.done && mp.data && mp.data.configured && mp.data.valid === false && (
              <div style={{ fontSize: 12.5, color: "#C53030", fontFamily: sans }}>Token inválido: {mp.data.error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const iconBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer" };
