// ─── WEBHOOK DO MERCADO PAGO — Vercel Edge Function ───────────────────────────
// O Mercado Pago chama aqui quando há evento de pagamento. Buscamos o pagamento
// na API do MP (fonte da verdade) e, se aprovado, liberamos a assinatura por 30
// dias para o user.id (external_reference). Sempre responde 200 para o MP.
//
// Env (Vercel): MP_ACCESS_TOKEN (obrigatório), MP_WEBHOOK_SECRET (opcional, valida
//   a assinatura do webhook), SUB_DAYS (opcional, padrão 30).

import { upsertSubscription, SUB_DAYS } from "./_lib/access.js";

export const config = { runtime: "edge" };
const ok = () => new Response("ok", { status: 200 });

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST" && req.method !== "GET") return ok();

  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (!mpToken) return ok();

  const url = new URL(req.url);
  let payload = {};
  try { payload = await req.json(); } catch {}

  // id do pagamento pode vir no corpo ou na query
  const paymentId = payload?.data?.id || payload?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
  const topic = payload?.type || payload?.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  if (!paymentId || (topic && !String(topic).includes("payment"))) return ok();

  // Validação opcional da assinatura do webhook (recomendada)
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    try {
      const sigHeader = req.headers.get("x-signature") || "";
      const reqId = req.headers.get("x-request-id") || "";
      const parts = Object.fromEntries(sigHeader.split(",").map(kv => kv.split("=").map(s => s.trim())));
      const dataId = url.searchParams.get("data.id") || String(paymentId);
      const manifest = `id:${dataId};request-id:${reqId};ts:${parts.ts};`;
      const expected = await hmacHex(secret, manifest);
      if (!parts.v1 || parts.v1 !== expected) return ok(); // assinatura inválida → ignora
    } catch { return ok(); }
  }

  // Busca o pagamento (fonte da verdade) e libera se aprovado
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${mpToken}` } });
    if (!r.ok) return ok();
    const p = await r.json();
    if (p.status === "approved" && p.external_reference) {
      const until = new Date(Date.now() + SUB_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await upsertSubscription(p.external_reference, until, paymentId);
    }
  } catch { /* ignora — MP re-tenta */ }

  return ok();
}
