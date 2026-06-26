// ─── CLIENTE SUPABASE (autenticação) ──────────────────────────────────────────
// Usa a mesma URL + chave publishable do conteúdo remoto. A chave é pública
// (protegida por RLS no servidor) — pode ficar no bundle. Os usuários cadastrados
// aparecem no painel do Supabase (Authentication → Users).

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config.js";

export const AUTH_ENABLED = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = AUTH_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

// Traduz mensagens de erro comuns do Supabase Auth para pt-BR.
export function authErrorPt(message = "") {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Email ou senha incorretos.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Este email já está cadastrado. Faça login.";
  if (m.includes("password should be at least")) return "A senha deve ter ao menos 6 caracteres.";
  if (m.includes("email not confirmed")) return "Confirme seu email antes de entrar (verifique a caixa de entrada e o spam).";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Email inválido.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde um instante e tente de novo.";
  if (m.includes("network") || m.includes("failed to fetch")) return "Sem conexão. Verifique a internet.";
  return message || "Não foi possível concluir. Tente novamente.";
}
