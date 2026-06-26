// ─── CLIENTE DA ÁREA DE ANAMNESE (front-end) ──────────────────────────────────
// Fala apenas com /api/anamnese-auth e /api/transcribe (mesma origem). A senha e a
// chave da OpenAI NUNCA passam pelo bundle — vivem só nas funções serverless.

import { AnamneseAuthError, AnamneseConfigError, SubscriptionRequiredError } from "./aiClient.js";

// Valida a senha para destravar a UI. Retorna true/false; lança AnamneseConfigError
// se a área não estiver configurada no servidor.
export async function verifyPassword(password, signal) {
  let res;
  try {
    res = await fetch("/api/anamnese-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    throw new Error("Sem conexão com o servidor.");
  }
  if (res.status === 503) {
    const i = await res.json().catch(() => ({}));
    throw new AnamneseConfigError(i.detail || "Área de anamnese não configurada no servidor.");
  }
  if (res.ok) { const d = await res.json().catch(() => ({})); return !!d.ok; }
  if (res.status === 401) return false;
  throw new Error(`Erro ${res.status} ao validar a senha.`);
}

// Envia o áudio para transcrição (Whisper). Retorna o texto transcrito.
export async function transcribeAudio(blob, { authKey, accessToken, filename = "audio.webm", signal } = {}) {
  const form = new FormData();
  form.append("file", blob, filename);

  const headers = { "x-anamnese-key": authKey || "" };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch("/api/transcribe", { method: "POST", headers, body: form, signal });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    throw new Error("Sem conexão com o servidor de transcrição.");
  }
  if (res.status === 503) {
    const i = await res.json().catch(() => ({}));
    throw new AnamneseConfigError(i.detail || "Transcrição não configurada no servidor.");
  }
  if (res.status === 402) throw new SubscriptionRequiredError("Assinatura necessária.");
  if (res.status === 401) throw new AnamneseAuthError("Senha incorreta ou sessão expirada.");
  if (!res.ok) {
    const i = await res.json().catch(() => ({}));
    throw new Error(i.error || `Erro ${res.status} na transcrição.`);
  }
  const d = await res.json();
  return (d.text || "").trim();
}
