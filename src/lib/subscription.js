// ─── ASSINATURA (front-end) ───────────────────────────────────────────────────
// Lê a assinatura do usuário (RLS: só a própria linha) e gera a cobrança Pix.

import { supabase } from "./supabase.js";

export async function getAccessToken() {
  if (!supabase) return "";
  try { const { data } = await supabase.auth.getSession(); return data?.session?.access_token || ""; }
  catch { return ""; }
}

// Retorna { active, valid_until }.
export async function getMySubscription() {
  if (!supabase) return { active: false };
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { active: false };
    const { data } = await supabase.from("subscriptions").select("status,valid_until").eq("user_id", user.id).maybeSingle();
    if (!data) return { active: false };
    const active = data.status === "active" && data.valid_until && new Date(data.valid_until) > new Date();
    return { active, valid_until: data.valid_until };
  } catch { return { active: false }; }
}

// Gera uma cobrança Pix (Mercado Pago) para o usuário logado.
export async function createPix() {
  const token = await getAccessToken();
  let r;
  try {
    r = await fetch("/api/mp-create-pix", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch { throw new Error("Sem conexão com o servidor de pagamento."); }
  const body = await r.json().catch(() => ({}));
  if (r.status === 503) throw new Error(body.detail || "Pagamento ainda não configurado no servidor.");
  if (r.status === 401) throw new Error("Faça login para assinar.");
  if (!r.ok) throw new Error(body.detail || body.error || `Erro ${r.status} ao gerar o Pix.`);
  return body; // { id, status, amount, qr_code, qr_code_base64, ticket_url }
}
