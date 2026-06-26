// ─── ADMINISTRADORES ──────────────────────────────────────────────────────────
// Lista de emails com acesso de administrador (ver usuários cadastrados).
// Isto controla apenas a EXIBIÇÃO do botão no app — a autorização real é
// server-side em api/admin-users.js (que revalida o email + usa a service_role).

export const ADMIN_EMAILS = ["ulissessm15@gmail.com"];

export const isAdmin = email => !!email && ADMIN_EMAILS.includes(email.toLowerCase());
