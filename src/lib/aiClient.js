// ─── CLIENTE DE IA (front-end) ────────────────────────────────────────────────
// Conversa apenas com /api/ai (mesma origem). A chave da OpenAI NUNCA passa por
// aqui — ela vive só na função serverless. Faz o parsing do streaming SSE.

const ENDPOINT = "/api/ai";

export class AIConfigError extends Error {}
// Área de anamnese (protegida por senha).
export class AnamneseAuthError extends Error {}
export class AnamneseConfigError extends Error {}

// Lê o stream SSE da OpenAI repassado pelo backend e chama onToken(delta).
// Retorna o texto completo acumulado. `authKey` (opcional) autentica modos
// protegidos (ex.: anamnese) — enviado no header x-anamnese-key.
export async function streamChat({ messages, context, mode = "chat", authKey, signal, onToken }) {
  let res;
  try {
    const headers = { "Content-Type": "application/json" };
    if (authKey) headers["x-anamnese-key"] = authKey;
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages, context, mode }),
      signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    throw new Error("Sem conexão com o servidor de IA.");
  }

  if (!res.ok) {
    let info = {};
    try { info = await res.json(); } catch {}
    if (res.status === 401) throw new AnamneseAuthError(info.error || "Senha incorreta ou sessão expirada.");
    if (res.status === 503 && info.code === "no_password") throw new AnamneseConfigError(info.detail || "Área de anamnese não configurada.");
    if (res.status === 503) throw new AIConfigError(info.detail || "IA não configurada no servidor.");
    throw new Error(info.error || `Erro ${res.status} ao consultar a IA.`);
  }
  if (!res.body) throw new Error("Resposta vazia do servidor.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // guarda linha incompleta

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return full;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) { full += delta; onToken?.(delta); }
      } catch { /* fragmento — ignora */ }
    }
  }
  return full;
}
