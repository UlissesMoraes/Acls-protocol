// ─── PROXY SEGURO PARA A OPENAI (Vercel Edge Function) ────────────────────────
// A chave da OpenAI fica APENAS aqui, na variável de ambiente OPENAI_API_KEY,
// nunca no bundle do front-end. O navegador chama /api/ai (mesma origem) e esta
// função conversa com a OpenAI, devolvendo a resposta em streaming (SSE).
//
// Variáveis de ambiente (configurar na Vercel → Project → Settings → Environment):
//   OPENAI_API_KEY   (obrigatória) — sua chave secreta sk-...
//   OPENAI_MODEL     (opcional)    — padrão: gpt-4o-mini
//   AI_ALLOWED_ORIGIN(opcional)    — restringe a origem (ex.: https://seu-app.vercel.app)

export const config = { runtime: "edge" };

const DEFAULT_MODEL = "gpt-4o-mini";
const MAX_MESSAGES = 24;          // teto de histórico por requisição
const MAX_CHARS_PER_MSG = 4000;   // teto por mensagem
const MAX_CONTEXT_CHARS = 24000;  // teto do contexto clínico injetado

// ── Prompts de sistema (governança clínica) ──
const BASE_RULES = `Você é o "Copiloto Clínico" do aplicativo Protocolos de Emergência ACLS 2025, usado por médicos e profissionais de saúde no Brasil.

Princípios obrigatórios:
- Responda SEMPRE em português do Brasil, de forma objetiva, técnica e segura.
- Baseie-se nas diretrizes AHA/ACLS 2020–2025, Surviving Sepsis 2021, AVC (AHA/ASA) e SBC, e PRIORIZE o "CONTEÚDO DOS PROTOCOLOS" fornecido abaixo quando existir — ele é a fonte oficial do app.
- Para doses e infusões, mostre a conta passo a passo (mg, mL, mcg/kg/min, mL/h) e cite a diluição usada. Nunca invente números; se faltar dado (ex.: peso), peça-o.
- Seja conciso: use listas curtas, negrito no que importa e vá direto à conduta. Em emergências tempo-dependentes, primeiro a ação, depois a justificativa.
- Recuse com gentileza pedidos fora do escopo clínico/emergência.
- Use Markdown leve (negrito, listas, títulos curtos). Evite tabelas largas.
- Encerre lembrando, quando pertinente, que é apoio à decisão — a responsabilidade final é do médico assistente.`;

const NARRATE_RULES = `Você gera o RELATÓRIO DE PARADA (registro de RCP) a partir de um log estruturado de um atendimento de parada cardiorrespiratória.

Produza um texto formal, cronológico e conciso, em português do Brasil, pronto para conferência e transcrição em prontuário. Estruture em parágrafo corrido ou tópicos curtos contendo:
- horário de início e duração total da PCR;
- ritmo inicial e mudanças de ritmo;
- número de desfibrilações e carga;
- medicações administradas com horários (adrenalina, amiodarona etc.);
- causas reversíveis investigadas (5H/5T), se registradas;
- desfecho (RCE / em curso) e condutas pós-PCR, se houver.
NÃO invente dados que não estejam no log. Finalize com: "Documento gerado por assistente — conferir antes de registrar em prontuário."`;

function systemPrompt(mode, context) {
  const rules = mode === "narrate" ? NARRATE_RULES : BASE_RULES;
  const ctx = (context || "").slice(0, MAX_CONTEXT_CHARS);
  if (!ctx) return rules;
  return `${rules}\n\n──────────\nCONTEÚDO DOS PROTOCOLOS (fonte oficial do app):\n${ctx}`;
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Restrição de origem opcional (best-effort contra abuso casual)
  const allowed = process.env.AI_ALLOWED_ORIGIN;
  if (allowed) {
    const origin = req.headers.get("origin") || "";
    if (origin && origin !== allowed) return json({ error: "Origem não autorizada" }, 403);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(
      { error: "IA não configurada", detail: "Defina OPENAI_API_KEY nas variáveis de ambiente da Vercel." },
      503
    );
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const mode = body.mode === "narrate" ? "narrate" : "chat";
  let messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return json({ error: "messages vazio" }, 400);

  // Sanitização: papéis válidos, tamanho e quantidade
  messages = messages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MSG) }));
  if (!messages.length) return json({ error: "Nenhuma mensagem válida" }, 400);

  const payload = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    messages: [{ role: "system", content: systemPrompt(mode, body.context) }, ...messages],
    temperature: mode === "narrate" ? 0.2 : 0.3,
    max_tokens: mode === "narrate" ? 900 : 1100,
    stream: true,
  };

  let upstream;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return json({ error: "Falha ao contatar a OpenAI", detail: String(e) }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return json({ error: "Erro da OpenAI", status: upstream.status, detail: detail.slice(0, 500) }, 502);
  }

  // Repassa o stream SSE da OpenAI direto ao cliente (parsing feito no front).
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
