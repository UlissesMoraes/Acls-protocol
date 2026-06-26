import { useState, useEffect, useRef } from "react";
import { UserRound, LogOut, KeyRound, Loader2, Check, X } from "lucide-react";
import { supabase, authErrorPt } from "../lib/supabase.js";

const sans = "var(--font)";

// Controle de conta no cabeçalho: email do usuário, alterar senha e sair.
export default function AccountMenu() {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [pwMode, setPwMode] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data?.user?.email || "")).catch(() => {});
  }, []);

  useEffect(() => {
    const onClick = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setPwMode(false); } };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!supabase) return null;

  const logout = async () => { await supabase.auth.signOut(); };
  const changePw = async () => {
    if (busy) return;
    if (newPw.length < 6) { setMsg("Mínimo de 6 caracteres."); return; }
    setBusy(true); setMsg("");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setMsg("Senha alterada ✓"); setNewPw("");
      setTimeout(() => { setPwMode(false); setMsg(""); }, 1400);
    } catch (e) { setMsg(authErrorPt(e?.message)); }
    finally { setBusy(false); }
  };

  const initial = (email[0] || "?").toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Conta" title={email}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", cursor: "pointer", fontWeight: 800, fontSize: 15, fontFamily: sans }}>
        {initial !== "?" ? initial : <UserRound size={18} />}
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: 46, width: 248, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,.16)", zIndex: 300, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: sans }}>Conectado como</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-strong)", fontFamily: sans, wordBreak: "break-all" }}>{email || "—"}</div>
          </div>

          {!pwMode ? (
            <div style={{ padding: 6 }}>
              <button onClick={() => { setPwMode(true); setMsg(""); }} style={itemStyle}>
                <KeyRound size={16} /> Alterar senha
              </button>
              <button onClick={logout} style={{ ...itemStyle, color: "#C53030" }}>
                <LogOut size={16} /> Sair
              </button>
            </div>
          ) : (
            <div style={{ padding: 12 }}>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Nova senha" autoFocus
                onKeyDown={e => { if (e.key === "Enter") changePw(); }}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 11px", borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--input-bg)", color: "var(--text)", fontSize: 15, fontFamily: sans, outline: "none" }} />
              {msg && <div style={{ fontSize: 11.5, color: msg.includes("✓") ? "#1E8449" : "#C53030", fontFamily: sans, marginTop: 7 }}>{msg}</div>}
              <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
                <button onClick={changePw} disabled={busy} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderRadius: 9, border: "none", background: "#2B6CB0", color: "#fff", fontSize: 13, fontFamily: sans, fontWeight: 700, cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
                  {busy ? <Loader2 size={15} className="auth-spin" /> : <Check size={15} />} Salvar
                </button>
                <button onClick={() => { setPwMode(false); setMsg(""); setNewPw(""); }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, borderRadius: 9, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--muted)", cursor: "pointer" }}>
                  <X size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const itemStyle = {
  width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 11px", borderRadius: 8,
  background: "none", border: "none", color: "var(--text)", fontSize: 13.5, fontFamily: sans, fontWeight: 600, cursor: "pointer", textAlign: "left",
};
