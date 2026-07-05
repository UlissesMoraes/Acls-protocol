// ─── HELPERS DE ACESSO (auth + assinatura) — usados pelas funções serverless ───
// Pasta _lib (prefixo _) não vira rota na Vercel. URL e chave publishable são
// públicas (fallback embutido); a service_role vive só no servidor.

export const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://rjexmjigzxyrpbuwlnur.supabase.co";
export const SUPA_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_QkRlpKhtxhl8iQkxOlLbiw_wgg2IH4w";
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const SUB_DAYS = Number(process.env.SUB_DAYS || 30);
export const SUB_PRICE = Number(process.env.SUB_PRICE || 20);

export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "ulissessm15@gmail.com").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
}

// Valida o token de sessão do usuário e retorna o objeto do usuário (ou null).
export async function verifyUser(token) {
  if (!token) return null;
  try {
    const r = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { apikey: SUPA_ANON, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// Lê a assinatura do usuário (via service_role) e diz se está ativa.
export async function getSubscription(userId) {
  if (!SERVICE_KEY || !userId) return { active: false };
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=status,valid_until`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!r.ok) return { active: false };
    const row = (await r.json())?.[0];
    if (!row) return { active: false };
    const active = row.status === "active" && row.valid_until && new Date(row.valid_until) > new Date();
    return { active, valid_until: row.valid_until };
  } catch { return { active: false }; }
}

// Cria/atualiza a assinatura (upsert) — só o webhook usa, com a service_role.
export async function upsertSubscription(userId, validUntilISO, paymentId) {
  if (!SERVICE_KEY || !userId) return false;
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/subscriptions?on_conflict=user_id`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ user_id: userId, status: "active", valid_until: validUntilISO, last_payment_id: String(paymentId || ""), updated_at: new Date().toISOString() }]),
    });
    return r.ok;
  } catch { return false; }
}

// Decide se a requisição pode acessar a anamnese: senha OU admin OU assinatura.
// Retorna { ok, status?, error?, code?, via?, user? }.
export async function anamneseAccess(req) {
  const pw = process.env.ANAMNESE_PASSWORD;
  const key = req.headers.get("x-anamnese-key") || "";
  if (pw && key === pw) return { ok: true, via: "password" };

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await verifyUser(token);
  if (!user) return { ok: false, status: 401, error: "Faça login para acessar a anamnese.", code: "login_required" };
  if (adminEmails().includes((user.email || "").toLowerCase())) return { ok: true, via: "admin", user };

  const sub = await getSubscription(user.id);
  if (sub.active) return { ok: true, via: "subscription", user };
  return { ok: false, status: 402, error: "Assinatura necessária para usar a anamnese.", code: "subscription_required" };
}
