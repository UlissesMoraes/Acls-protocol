import { useState, useEffect, useRef } from "react";
import { Lock, QrCode, Copy, Check, Loader2, AlertTriangle, ShieldCheck, KeyRound, RefreshCw, Sparkles } from "lucide-react";
import { createPix, getMySubscription } from "../lib/subscription.js";

const sans = "var(--font)";
const ACCENT = "#9D174D";

export default function Paywall({ onUnlocked, onUsePassword }) {
  const [pix, setPix] = useState(null);     // { qr_code, qr_code_base64, amount }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const gen = async () => {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const data = await createPix();
      setPix(data);
      startPolling();
    } catch (e) { setError(e.message || "Falha ao gerar o Pix."); }
    finally { setLoading(false); }
  };

  const startPolling = () => {
    setWaiting(true);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const sub = await getMySubscription();
      if (sub.active) { clearInterval(pollRef.current); setWaiting(false); onUnlocked?.(); }
    }, 4000);
  };

  const checkNow = async () => {
    const sub = await getMySubscription();
    if (sub.active) { clearInterval(pollRef.current); onUnlocked?.(); }
    else setError("Pagamento ainda não identificado. Se já pagou, aguarde alguns segundos.");
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(pix.qr_code); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-sm)", maxWidth: 440, margin: "0 auto" }}>
      <style>{`@keyframes pwSpin{to{transform:rotate(360deg)}}.pw-spin{animation:pwSpin 1s linear infinite}`}</style>

      <div style={{ textAlign: "center" }}>
        <span style={{ width: 58, height: 58, borderRadius: 16, background: `color-mix(in srgb,${ACCENT} 13%,var(--surface))`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Lock size={28} color={ACCENT} />
        </span>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--text-strong)", marginTop: 10 }}>Anamnese com IA</div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: sans, marginTop: 3, lineHeight: 1.5 }}>
          Recurso por assinatura. Libere a transcrição e a análise clínica.
        </div>
        <div style={{ display: "inline-flex", alignItems: "baseline", gap: 4, marginTop: 12, color: ACCENT }}>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: sans }}>R$</span>
          <span style={{ fontSize: 38, fontWeight: 800, fontFamily: "var(--font-display)" }}>{pix?.amount || 20}</span>
          <span style={{ fontSize: 14, color: "var(--muted)", fontFamily: sans }}>/mês · via Pix</span>
        </div>
      </div>

      {/* Benefícios */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, margin: "16px 0", fontSize: 13, color: "var(--text)", fontFamily: sans }}>
        {["Transcrição do atendimento por voz (Whisper)", "Análise clínica estruturada + apontamentos", "Hipóteses, CID-10, conduta e SOAP", "Modelos (politrauma, PS, dor torácica…) e PDF"].map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Check size={15} color="#1E8449" style={{ flexShrink: 0 }} /> {b}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--danger-bg)", border: "1px solid var(--danger-bd)", color: "var(--danger-fg)", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, fontFamily: sans, marginBottom: 12 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {!pix ? (
        <button onClick={gen} disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 12, border: "none", background: ACCENT, color: "#fff", fontSize: 15, fontFamily: sans, fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? <Loader2 size={18} className="pw-spin" /> : <QrCode size={18} />} {loading ? "Gerando Pix…" : "Assinar com Pix"}
        </button>
      ) : (
        <div>
          {pix.qr_code_base64 && (
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" style={{ width: 200, height: 200, borderRadius: 12, border: "1px solid var(--border)", background: "#fff", padding: 6 }} />
            </div>
          )}
          <button onClick={copyCode} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 11, border: `1px solid ${ACCENT}`, background: `color-mix(in srgb,${ACCENT} 8%,var(--surface))`, color: ACCENT, fontSize: 13.5, fontFamily: sans, fontWeight: 700, cursor: "pointer" }}>
            {copied ? <Check size={16} color="#1E8449" /> : <Copy size={16} />} {copied ? "Código copiado!" : "Copiar Pix copia-e-cola"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 14, fontSize: 12.5, color: "var(--muted)", fontFamily: sans }}>
            {waiting && <Loader2 size={15} className="pw-spin" />} Aguardando confirmação do pagamento…
          </div>
          <button onClick={checkNow} style={{ width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 10, border: "1px solid var(--input-border)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: sans, fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={15} /> Já paguei — verificar agora
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center", marginTop: 16, fontSize: 11, color: "var(--muted)", fontFamily: sans }}>
        <ShieldCheck size={13} color="#1E8449" /> Pagamento seguro via Mercado Pago. Acesso liberado por 30 dias.
      </div>

      {onUsePassword && (
        <button onClick={onUsePassword} style={{ width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, fontFamily: sans, cursor: "pointer", textDecoration: "underline" }}>
          <KeyRound size={14} /> Tenho a senha de acesso
        </button>
      )}
    </div>
  );
}
