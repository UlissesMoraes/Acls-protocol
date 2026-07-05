// ─── WEBHOOK DO MERCADO PAGO — Vercel Edge Function ───────────────────────────
// O Mercado Pago chama aqui quando há evento de pagamento. Buscamos o pagamento
// na API do MP (fonte da verdade) e, se aprovado, liberamos a assinatura por
// SUB_DAYS dias para o user.id (external_reference). SEMPRE responde 200 ao MP —
// nunca devolve 5xx, para não dar "falha na entrega".
//
// Env (Vercel): MP_ACCESS_TOKEN (obrigatório), MP_WEBHOOK_SECRET (opcional, valida
//   a assinatura), SUPABASE_SERVICE_ROLE_KEY, SUB_DAYS (opcional, padrão 30).

export const config = { runtime: "edge" };

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://rjexmjigzxyrpbuwlnur.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUB_DAYS = Number(process.env.SUB_DAYS || 30);

const ok = (info) => new Response(JSON.stringify({ ok: true, ...info }), { status: 200, headers: { "Content-Type": "application/json" } });

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function upsertSubscription(userId, validUntilISO, paymentId) {
  if (!SERVICE_KEY || !userId) return false;
  const r = await fetch(`${SUPA_URL}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ user_id: userId, status: "active", valid_until: validUntilISO, last_payment_id: String(paymentId || ""), updated_at: new Date().toISOString() }]),
  });
  return r.ok;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  // Tudo dentro de um try/catch — qualquer erro vira 200 (MP não re-tenta infinito).
  try {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    const url = new URL(req.url);

    let payload = {};
    try { payload = await req.json(); } catch {}

    const paymentId = payload?.data?.id || payload?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    const type = payload?.type || payload?.topic || url.searchParams.get("type") || url.searchParams.get("topic") || "";

    if (!mpToken) return ok({ skipped: "no_token" });
    if (!paymentId) return ok({ skipped: "no_payment_id" });
    if (type && !String(type).includes("payment")) return ok({ skipped: "not_payment" });

    // Validação opcional da assinatura do webhook
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (secret) {
      try {
        const parts = Object.fromEntries((req.headers.get("x-signature") || "").split(",").map(kv => kv.split("=").map(s => s.trim())));
        const reqId = req.headers.get("x-request-id") || "";
        const dataId = url.searchParams.get("data.id") || String(paymentId);
        const expected = await hmacHex(secret, `id:${dataId};request-id:${reqId};ts:${parts.ts};`);
        if (!parts.v1 || parts.v1 !== expected) return ok({ skipped: "bad_signature" });
      } catch { /* se a validação falhar, segue pela re-checagem na API */ }
    }

    // Busca o pagamento (fonte da verdade) e libera se aprovado
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${mpToken}` } });
    if (!r.ok) return ok({ skipped: "payment_fetch_failed", status: r.status });
    const p = await r.json();
    if (p.status === "approved" && p.external_reference) {
      const until = new Date(Date.now() + SUB_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const done = await upsertSubscription(p.external_reference, until, paymentId);
      return ok({ granted: done, user: p.external_reference, until });
    }
    return ok({ status: p.status });
  } catch (e) {
    return ok({ error: String(e).slice(0, 200) });
  }
}
