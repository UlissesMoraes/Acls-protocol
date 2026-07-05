// Configuração do backend de conteúdo (Supabase).
// A chave publishable é de leitura pública (protegida por RLS) — pode ser embutida
// no cliente. Pode ser sobrescrita por variáveis de ambiente na Vercel se desejado.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://rjexmjigzxyrpbuwlnur.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_QkRlpKhtxhl8iQkxOlLbiw_wgg2IH4w";

// Liga/desliga a busca de conteúdo remoto (fallback sempre é o conteúdo embutido).
export const REMOTE_CONTENT_ENABLED =
  (import.meta.env.VITE_REMOTE_CONTENT ?? "on") !== "off" && !!SUPABASE_URL;
