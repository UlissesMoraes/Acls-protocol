// ─── TRANSCRIÇÃO DE ÁUDIO (Vercel Edge Function — OpenAI Whisper) ─────────────
// Recebe um áudio (multipart/form-data) e o envia à API de transcrição da OpenAI.
// A chave da OpenAI fica APENAS aqui (OPENAI_API_KEY). A área é protegida por
// senha (ANAMNESE_PASSWORD), revalidada a cada chamada — o gate não depende do
// front-end.
//
// Variáveis de ambiente (Vercel → Project → Settings → Environment):
//   OPENAI_API_KEY            (obrigatória) — chave secreta sk-...
//   ANAMNESE_PASSWORD         (obrigatória) — senha da área de anamnese
//   OPENAI_TRANSCRIBE_MODEL   (opcional)    — padrão: whisper-1
//   AI_ALLOWED_ORIGIN         (opcional)    — restringe a origem

import { anamneseAccess } from "./_lib/access.js";

export const config = { runtime: "edge" };

const MAX_BYTES = 25 * 1024 * 1024; // limite da API de transcrição da OpenAI

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const allowed = process.env.AI_ALLOWED_ORIGIN;
  if (allowed) {
    const origin = req.headers.get("origin") || "";
    if (origin && origin !== allowed) return json({ error: "Origem não autorizada" }, 403);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json({ error: "IA não configurada", detail: "Defina OPENAI_API_KEY nas variáveis de ambiente da Vercel.", code: "no_key" }, 503);
  }

  // Acesso à anamnese: senha OU admin OU assinatura ativa.
  const acc = await anamneseAccess(req);
  if (!acc.ok) return json({ error: acc.error, code: acc.code }, acc.status);

  let form;
  try { form = await req.formData(); } catch { return json({ error: "Formato inválido — multipart/form-data esperado" }, 400); }

  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "Áudio ausente no campo 'file'" }, 400);
  if (file.size === 0) return json({ error: "Áudio vazio" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Áudio acima de 25 MB — grave trechos menores ou reduza a qualidade" }, 413);

  const model = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";
  // Viés de domínio: melhora o reconhecimento de termos clínicos, fala coloquial
  // e truncada, nomes de fármacos e doses em pt-BR.
  const PROMPT = "Consulta médica em português do Brasil. Transcreva fielmente a fala, incluindo sintomas, queixas em linguagem coloquial, termos clínicos, nomes de medicamentos, doses e unidades (mg, mL, mcg/kg/min).";
  const upstreamForm = new FormData();
  upstreamForm.append("file", file, file.name || "audio.webm");
  upstreamForm.append("model", model);
  upstreamForm.append("language", "pt");
  upstreamForm.append("prompt", PROMPT);
  upstreamForm.append("response_format", "json");

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstreamForm,
    });
  } catch (e) {
    return json({ error: "Falha ao contatar a OpenAI", detail: String(e) }, 502);
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return json({ error: "Erro na transcrição", status: upstream.status, detail: detail.slice(0, 500) }, 502);
  }

  const data = await upstream.json().catch(() => ({}));
  return json({ text: (data.text || "").trim() });
}
