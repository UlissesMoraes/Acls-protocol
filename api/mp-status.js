// ─── DIAGNÓSTICO MERCADO PAGO (somente ADMIN) — Vercel Edge Function ──────────
// Mostra de qual conta MP é o MP_ACCESS_TOKEN configurado (nome/apelido), para
// confirmar que o recebedor é a conta certa. Não expõe o token.

import { verifyUser, adminEmails } from "./_lib/access.js";

export const config = { runtime: "edge" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await verifyUser(token);
  if (!user) return json({ error: "Não autenticado" }, 401);
  if (!adminEmails().includes((user.email || "").toLowerCase())) return json({ error: "Acesso restrito ao administrador" }, 403);

  const mp = process.env.MP_ACCESS_TOKEN;
  if (!mp) return json({ configured: false });

  try {
    const r = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${mp}` } });
    const d = await r.json();
    if (!r.ok) return json({ configured: true, valid: false, error: d.message || `Erro ${r.status}` });
    return json({
      configured: true, valid: true,
      id: d.id,
      nickname: d.nickname,
      name: [d.first_name, d.last_name].filter(Boolean).join(" "),
      email: d.email,
      site_id: d.site_id,
      // Heurística: contas/usuários de teste do MP costumam ter apelido "TEST..."
      looks_test: /^test/i.test(d.nickname || "") || /test/i.test(d.email || ""),
    });
  } catch (e) {
    return json({ configured: true, valid: false, error: String(e).slice(0, 200) });
  }
}
