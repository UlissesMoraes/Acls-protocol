import { SUPABASE_URL, SUPABASE_ANON_KEY, REMOTE_CONTENT_ENABLED } from "../config.js";

// ─── Validação de um protocolo vindo do backend (segurança antes de aplicar) ──
// Conteúdo malformado NUNCA deve ser renderizado — descartamos e mantemos o embutido.
function isValidProtocol(p) {
  if (!p || typeof p !== "object") return false;
  for (const f of ["id", "label", "icon", "cat", "color", "light", "border", "sub"])
    if (typeof p[f] !== "string" || !p[f]) return false;
  if (!Array.isArray(p.cascade) || !Array.isArray(p.drugs)) return false;
  if (!Array.isArray(p.antidotes) || !Array.isArray(p.scores)) return false;
  // Sanidade mínima das etapas e fármacos
  for (const s of p.cascade)
    if (typeof s.phase !== "string" || !Array.isArray(s.items)) return false;
  for (const d of p.drugs)
    if (typeof d.name !== "string" || typeof d.dose !== "string") return false;
  return true;
}

// Busca os protocolos ativos no Supabase. Retorna { items, fetchedAt } ou lança erro.
export async function fetchRemoteProtocols(signal) {
  if (!REMOTE_CONTENT_ENABLED) throw new Error("remote disabled");
  const url = `${SUPABASE_URL}/rest/v1/protocols?select=id,ord,data,updated_at&enabled=eq.true&order=ord.asc`;
  const res = await fetch(url, {
    signal,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) throw new Error("payload inesperado");

  const items = [];
  for (const row of rows) {
    const p = row?.data;
    if (isValidProtocol(p)) items.push(p);   // descarta silenciosamente os inválidos
  }
  // Versão = maior updated_at (para detectar mudanças)
  const fetchedAt = rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), "");
  return { items, fetchedAt };
}

// Mescla protocolos remotos sobre os embutidos (remoto tem prioridade por id;
// ids só existentes no embutido permanecem como fallback).
export function mergeProtocols(bundled, remote) {
  if (!remote || !remote.length) return bundled;
  const byId = new Map(bundled.map(p => [p.id, p]));
  for (const p of remote) byId.set(p.id, p);
  // Mantém a ordem: remotos na ordem recebida, seguidos de embutidos não sobrescritos
  const remoteIds = new Set(remote.map(p => p.id));
  const tailBundled = bundled.filter(p => !remoteIds.has(p.id));
  return [...remote, ...tailBundled].map(p => byId.get(p.id));
}
