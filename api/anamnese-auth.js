// ─── AUTENTICAÇÃO DA ÁREA DE ANAMNESE (Vercel Edge Function) ──────────────────
// Valida a senha da área protegida de anamnese. A senha vive APENAS na variável
// de ambiente ANAMNESE_PASSWORD da Vercel — nunca no bundle do front-end.
// Este endpoint só destrava a UI; toda chamada paga (transcrição/análise) revalida
// a senha no servidor, então o gate real não depende do front-end.

export const config = { runtime: "edge" };

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

// Comparação de tempo ~constante (evita timing attack trivial).
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const allowed = process.env.AI_ALLOWED_ORIGIN;
  if (allowed) {
    const origin = req.headers.get("origin") || "";
    if (origin && origin !== allowed) return json({ error: "Origem não autorizada" }, 403);
  }

  const pw = process.env.ANAMNESE_PASSWORD;
  if (!pw) {
    return json(
      { error: "Área de anamnese não configurada", detail: "Defina ANAMNESE_PASSWORD nas variáveis de ambiente da Vercel.", code: "no_password" },
      503
    );
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }
  const password = typeof body.password === "string" ? body.password : "";

  if (!safeEqual(password, pw)) return json({ ok: false, error: "Senha incorreta" }, 401);
  return json({ ok: true });
}
