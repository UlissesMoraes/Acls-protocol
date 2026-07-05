// ─── HISTÓRICO LOCAL DE ANAMNESES (24h) ───────────────────────────────────────
// Guarda as anamneses geradas APENAS no aparelho (localStorage), com expiração
// automática de 24h. Não há envio a servidor — é uma conveniência offline para o
// médico reabrir um atendimento recente. Limpa entradas vencidas a cada leitura.

const KEY = "anamnese_history_v1";
const TTL = 24 * 60 * 60 * 1000; // 24 horas
const MAX = 30;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const cutoff = Date.now() - TTL;
    const list = (JSON.parse(raw) || []).filter(e => e && typeof e.ts === "number" && e.ts >= cutoff);
    localStorage.setItem(KEY, JSON.stringify(list)); // persiste a purga
    return list;
  } catch { return []; }
}

export function saveEntry(entry) {
  try {
    const list = loadHistory();
    const e = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now(), ...entry };
    const next = [e, ...list].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch { return loadHistory(); }
}

export function deleteEntry(id) {
  try {
    const next = loadHistory().filter(e => e.id !== id);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch { return loadHistory(); }
}

export function clearHistory() {
  try { localStorage.removeItem(KEY); } catch {}
  return [];
}
