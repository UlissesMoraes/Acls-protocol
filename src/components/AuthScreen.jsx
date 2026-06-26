import { useState } from "react";
import { Stethoscope, Mail, Lock, User, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase, authErrorPt } from "../lib/supabase.js";

const sans = "var(--font)";
const ACCENT = "#2B6CB0";

export default function AuthScreen({ mode: initialMode = "login", onDone }) {
  const [mode, setMode] = useState(initialMode); // login | signup | forgot | recover
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const reset = () => { setError(""); setInfo(""); };

  const submit = async () => {
    if (busy) return;
    reset();
    const mail = email.trim().toLowerCase();
    if (mode !== "recover" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { setError("Informe um email válido."); return; }
    if (mode !== "forgot" && senha.length < 6) { setError("A senha deve ter ao menos 6 caracteres."); return; }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password: senha });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: mail, password: senha,
          options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) { setInfo("Cadastro realizado! Confirme seu email pelo link que enviamos para entrar."); setMode("login"); }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: window.location.origin });
        if (error) throw error;
        setInfo("Enviamos um link de redefinição para o seu email.");
      } else if (mode === "recover") {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
        setInfo("Senha atualizada com sucesso.");
        onDone?.();
      }
    } catch (e) {
      setError(authErrorPt(e?.message));
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    login: "Entrar", signup: "Criar conta", forgot: "Recuperar senha", recover: "Definir nova senha",
  };
  const ctaLabel = { login: "Entrar", signup: "Cadastrar", forgot: "Enviar link", recover: "Salvar senha" }[mode];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "var(--bg, #f4f6f9)" }}>
      <style>{`@keyframes authSpin{to{transform:rotate(360deg)}}.auth-spin{animation:authSpin 1s linear infinite}`}</style>
      <div style={{ width: "100%", maxWidth: 400, background: "var(--surface,#fff)", border: "1px solid var(--border,#e2e8f0)", borderRadius: 18, padding: 26, boxShadow: "0 10px 40px rgba(0,0,0,.10)" }}>

        {/* Marca */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <span style={{ width: 60, height: 60, borderRadius: 17, background: `color-mix(in srgb,${ACCENT} 14%,var(--surface,#fff))`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Stethoscope size={30} color={ACCENT} />
          </span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, color: "var(--text-strong,#1a202c)", marginTop: 10 }}>Protocolos de Emergência</div>
          <div style={{ fontSize: 12.5, color: "var(--muted,#718096)", fontFamily: sans, marginTop: 2 }}>{titles[mode]}</div>
        </div>

        {(mode === "forgot" || mode === "recover") && (
          <button onClick={() => { setMode("login"); reset(); }} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, fontFamily: sans, cursor: "pointer", padding: "4px 0", marginBottom: 6 }}>
            <ArrowLeft size={15} /> Voltar ao login
          </button>
        )}

        {/* Campos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {mode === "signup" && (
            <Input Ic={User} placeholder="Nome (opcional)" value={nome} onChange={setNome} type="text" />
          )}
          {mode !== "recover" && (
            <Input Ic={Mail} placeholder="Email" value={email} onChange={setEmail} type="email" autoComplete="email" onEnter={submit} />
          )}
          {mode !== "forgot" && (
            <div style={{ position: "relative" }}>
              <Input Ic={Lock} placeholder={mode === "recover" ? "Nova senha" : "Senha"} value={senha} onChange={setSenha} type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} onEnter={submit} pad />
              <button onClick={() => setShow(s => !s)} aria-label="Mostrar senha" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 6 }}>
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          )}
        </div>

        {error && <Msg Ic={AlertTriangle} color="#C53030" bg="var(--danger-bg,#fdecec)">{error}</Msg>}
        {info && <Msg Ic={CheckCircle2} color="#1E8449" bg="color-mix(in srgb,#1E8449 10%,var(--surface,#fff))">{info}</Msg>}

        <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 11, border: "none", background: ACCENT, color: "#fff", fontSize: 15, fontFamily: sans, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? <Loader2 size={18} className="auth-spin" /> : null} {ctaLabel}
        </button>

        {/* Rodapé de navegação */}
        {mode === "login" && (
          <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, fontFamily: sans, color: "var(--text)" }}>
            <button onClick={() => { setMode("forgot"); reset(); }} style={linkStyle}>Esqueci minha senha</button>
            <div style={{ marginTop: 10, color: "var(--muted)" }}>
              Não tem conta? <button onClick={() => { setMode("signup"); reset(); }} style={{ ...linkStyle, fontWeight: 700 }}>Criar conta grátis</button>
            </div>
          </div>
        )}
        {mode === "signup" && (
          <div style={{ marginTop: 14, textAlign: "center", fontSize: 13, fontFamily: sans, color: "var(--muted)" }}>
            Já tem conta? <button onClick={() => { setMode("login"); reset(); }} style={{ ...linkStyle, fontWeight: 700 }}>Entrar</button>
          </div>
        )}

        <div style={{ marginTop: 18, fontSize: 10.5, color: "var(--muted)", fontFamily: sans, textAlign: "center", lineHeight: 1.5 }}>
          Acesso gratuito · uso profissional. Ferramenta de apoio à decisão — a responsabilidade clínica é do médico assistente.
        </div>
      </div>
    </div>
  );
}

function Input({ Ic, placeholder, value, onChange, type, autoComplete, onEnter, pad }) {
  return (
    <div style={{ position: "relative" }}>
      <Ic size={17} color="var(--muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete}
        onKeyDown={e => { if (e.key === "Enter") onEnter?.(); }}
        style={{ width: "100%", boxSizing: "border-box", padding: pad ? "12px 38px 12px 36px" : "12px 12px 12px 36px", borderRadius: 11, border: "1px solid var(--input-border,#cbd5e0)", background: "var(--input-bg,#fff)", color: "var(--text,#1a202c)", fontSize: 16, fontFamily: sans, outline: "none" }}
      />
    </div>
  );
}

function Msg({ Ic, color, bg, children }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, padding: "10px 12px", borderRadius: 10, background: bg, color, fontSize: 12.5, fontFamily: sans, lineHeight: 1.45 }}>
      <Ic size={16} style={{ flexShrink: 0 }} /> {children}
    </div>
  );
}

const linkStyle = { background: "none", border: "none", color: ACCENT, fontFamily: sans, fontSize: 13, cursor: "pointer", padding: 0, textDecoration: "underline" };
