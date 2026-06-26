// ─── LISTA DE USUÁRIOS (somente ADMIN) — Vercel Edge Function ─────────────────
// Valida o token do solicitante, confere se o email é de administrador e então
// usa a SUPABASE_SERVICE_ROLE_KEY (somente no servidor) para listar os usuários.
// A service_role NUNCA vai para o bundle do front-end.
//
// Variáveis de ambiente (Vercel → Project → Settings → Environment):
//   SUPABASE_URL (ou VITE_SUPABASE_URL)        — URL do projeto
//   SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY) — chave publishable (valida o token)
//   SUPABASE_SERVICE_ROLE_KEY  (obrigatória, secreta) — lista usuários
//   ADMIN_EMAILS               (opcional)      — emails admin separados por vírgula

export const config = { runtime: "edge" };

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json" } });

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  // URL e chave publishable são públicas — fallback embutido para não exigir
  // configuração extra na Vercel (igual ao front-end). Só a service_role é secreta.
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://rjexmjigzxyrpbuwlnur.supabase.co";
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_QkRlpKhtxhl8iQkxOlLbiw_wgg2IH4w";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) {
    return json({ error: "Painel de admin não configurado", detail: "Defina SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente da Vercel e faça um novo deploy.", code: "no_admin" }, 503);
  }

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);

  // 1) Valida o usuário pelo token de sessão
  let user;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon || service, Authorization: `Bearer ${token}` } });
    if (!r.ok) return json({ error: "Sessão inválida ou expirada" }, 401);
    user = await r.json();
  } catch (e) {
    return json({ error: "Falha ao validar a sessão", detail: String(e) }, 502);
  }

  // 2) Confere se é administrador
  const admins = (process.env.ADMIN_EMAILS || "ulissessm15@gmail.com").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  if (!user?.email || !admins.includes(user.email.toLowerCase())) {
    return json({ error: "Acesso restrito ao administrador" }, 403);
  }

  // 3) Lista os usuários com a service_role
  const sp = new URL(req.url).searchParams;
  const page = sp.get("page") || "1";
  let data;
  try {
    const r = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    if (!r.ok) { const d = await r.text().catch(() => ""); return json({ error: "Erro ao listar usuários", status: r.status, detail: d.slice(0, 300) }, 502); }
    data = await r.json();
  } catch (e) {
    return json({ error: "Falha ao listar usuários", detail: String(e) }, 502);
  }

  const users = (data.users || []).map(u => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.nome || "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    confirmed: !!(u.email_confirmed_at || u.confirmed_at),
  }));
  // mais recentes primeiro
  users.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return json({ users, total: users.length });
}
