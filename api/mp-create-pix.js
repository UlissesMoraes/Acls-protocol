// ─── GERA COBRANÇA PIX (Mercado Pago) — Vercel Edge Function ──────────────────
// O usuário logado pede um Pix de R$20; devolvemos o QR (copia-e-cola + imagem).
// external_reference = user.id → o webhook sabe quem pagou. Token MP só no servidor.
//
// Env (Vercel): MP_ACCESS_TOKEN (obrigatório), APP_URL (opcional, p/ notification_url),
//   SUB_PRICE (opcional, padrão 20).

import { verifyUser, SUB_PRICE } from "./_lib/access.js";

export const config = { runtime: "edge" };

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const mpToken = process.env.MP_ACCESS_TOKEN;
  if (!mpToken) return json({ error: "Pagamento não configurado", detail: "Defina MP_ACCESS_TOKEN na Vercel.", code: "no_mp" }, 503);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await verifyUser(token);
  if (!user) return json({ error: "Faça login para assinar." }, 401);

  const amount = SUB_PRICE;
  const appUrl = process.env.APP_URL || req.headers.get("origin") || "";
  const idem = `${user.id}-${Date.now()}`;

  const description = process.env.SUB_DESCRIPTION || "ACLS Protocolos - Anamnese IA (assinatura mensal - 30 dias)";
  const body = {
    transaction_amount: amount,
    description,
    statement_descriptor: (process.env.SUB_STATEMENT || "ACLSPROTOCOLOS").replace(/[^A-Za-z0-9]/g, "").slice(0, 22),
    payment_method_id: "pix",
    payer: { email: user.email },
    external_reference: user.id,
    additional_info: { items: [{ id: "anamnese-mensal", title: description, quantity: 1, unit_price: amount }] },
    ...(appUrl ? { notification_url: `${appUrl}/api/mp-webhook` } : {}),
  };

  let r, data;
  try {
    r = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: { Authorization: `Bearer ${mpToken}`, "Content-Type": "application/json", "X-Idempotency-Key": idem },
      body: JSON.stringify(body),
    });
    data = await r.json();
  } catch (e) {
    return json({ error: "Falha ao contatar o Mercado Pago", detail: String(e) }, 502);
  }
  if (!r.ok) return json({ error: "Não foi possível gerar o Pix", detail: JSON.stringify(data).slice(0, 300) }, 502);

  const tx = data.point_of_interaction?.transaction_data || {};
  return json({
    id: data.id,
    status: data.status,
    amount,
    qr_code: tx.qr_code || "",
    qr_code_base64: tx.qr_code_base64 || "",
    ticket_url: tx.ticket_url || "",
  });
}
