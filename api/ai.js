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
const MAX_MESSAGES = 24;
const MAX_CHARS_PER_MSG = 4000;
const MAX_CONTEXT_CHARS = 24000;

// ── Prompts de sistema por modo ──────────────────────────────────────────────

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

const DEBRIEFING_RULES = `Você analisa o log de um atendimento de PCR (ACLS adulto) e fornece um DEBRIEFING estruturado da qualidade do atendimento.

Compare cada decisão com as diretrizes AHA/ACLS 2020–2025:
- Adrenalina: 1ª dose ASAP em ritmo não chocável, ou após 2º choque em chocável; repetir a cada 3–5 min (idealmente 3 min)
- Amiodarona 300 mg: após o 3º choque (1ª dose); 150 mg após o 5º choque (2ª dose)
- Ciclos de RCP: 2 minutos; desvio > 20 s merece nota
- RCE: identificar e documentar; condutas pós-PCR iniciadas

Formato OBRIGATÓRIO de saída (use exatamente esses cabeçalhos):
**✅ Dentro do protocolo:**
(liste pontos positivos com horário, ex: "Adrenalina em 02:15 — dentro da janela")

**⚠️ Pontos de atenção:**
(desvios encontrados com horário, o que era esperado vs o que ocorreu, e sugestão de melhoria)

**📋 Resumo geral:**
(1–2 frases sobre a qualidade do atendimento)

Seja objetivo, clínico e não punitivo. Lembre que é análise educacional.`;

const PRIORITIZE_RULES = `Você é um especialista em PCR e causas reversíveis (5H e 5T — AHA/ACLS 2020).

Com base nos dados clínicos fornecidos, ranqueie as causas reversíveis mais PROVÁVEIS desta PCR, da mais para a menos provável.

5H: Hipóxia · Hipovolemia · Hidrogênio (acidose) · Hipo/Hipercalemia · Hipotermia
5T: Tensão no tórax (pneumotórax) · Tamponamento cardíaco · Tóxicos · Trombose pulmonar (TEP) · Trombose coronariana (IAM)

Para cada causa do top 3–4:
- Probabilidade estimada (alta / média / baixa)
- Achado clínico ou exame que a confirma/exclui
- Intervenção imediata

Seja MUITO direto e rápido — o médico está em uma emergência ativa.
Finalize com: "⚠️ Investigar e tratar em paralelo com a RCP."`;

const TRIAGE_RULES = `Você analisa a descrição de um quadro clínico e sugere os 2–3 PROTOCOLOS mais relevantes do app "Protocolos de Emergência ACLS 2025".

Protocolos disponíveis (id → nome):
taquiarritmias → Taquiarritmias
bradiarritmias → Bradiarritmias
pcr → Parada Cardiorrespiratória (PCR)
iamcssst → IAM com Supra de ST
iamssst → SCA sem Supra de ST
intoxicacoes → Intoxicações Agudas
sepse → Sepse e Choque Séptico
cad → Cetoacidose Diabética
hhns → Estado Hiperosmolar
avc → AVC / Síndromes Neurológicas
convulsoes → Síndrome Convulsiva
amax4 → Anafilaxia / Asma Grave
hidroeletroliticos → Distúrbios Hidroeletrolíticos
vasoativas → Drogas Vasoativas e Inotrópicos

Responda com os protocolos mais relevantes em ordem de prioridade, uma linha por protocolo: **Nome do protocolo** — justificativa em uma frase.
Se o quadro for urgência extrema (PCR, anafilaxia, IAMCSSST), destaque em negrito.
Se o quadro não se encaixar em nenhum protocolo, diga claramente.
Na ÚLTIMA linha, emita SOMENTE os ids sugeridos (na ordem) neste formato exato, sem mais nada: [[id1, id2, id3]]`;

const ALERTS_RULES = `Você é farmacêutico clínico de emergência. Receberá uma lista de medicações de um protocolo e dados do paciente, e deve sinalizar ALERTAS DE SEGURANÇA acionáveis.

Foque APENAS no que muda conduta:
- Interações relevantes entre as drogas listadas (ex.: duas que prolongam QT, depressão respiratória aditiva, hipotensão somada)
- Drogas que alongam o intervalo QT (sinalizar risco de torsades)
- Ajuste/risco em disfunção renal ou hepática quando aplicável
- Cuidados de diluição/velocidade que evitam eventos graves (ex.: extravasamento de vasopressor, bolus rápido)

Formato OBRIGATÓRIO:
**🚨 Alertas críticos:** (ou "Nenhum alerta crítico entre as drogas listadas")
- itens curtos e diretos

**⚠️ Atenção:**
- itens curtos

Seja conciso (máx ~8 bullets). NÃO repita as doses do protocolo. Não invente interações inexistentes.
Finalize: "Apoio à decisão — confira a bula e o quadro do paciente."`;

const MODE_CONFIGS = {
  chat:       { rules: BASE_RULES,       temp: 0.3, maxTok: 1100, useCtx: true },
  narrate:    { rules: NARRATE_RULES,    temp: 0.2, maxTok: 900,  useCtx: false },
  debriefing: { rules: DEBRIEFING_RULES, temp: 0.2, maxTok: 900,  useCtx: false },
  prioritize: { rules: PRIORITIZE_RULES, temp: 0.2, maxTok: 600,  useCtx: false },
  triage:     { rules: TRIAGE_RULES,     temp: 0.2, maxTok: 500,  useCtx: false },
  alerts:     { rules: ALERTS_RULES,     temp: 0.2, maxTok: 600,  useCtx: false },
};

function systemPrompt(mode, context) {
  const cfg = MODE_CONFIGS[mode] || MODE_CONFIGS.chat;
  const ctx = cfg.useCtx ? (context || "").slice(0, MAX_CONTEXT_CHARS) : "";
  if (!ctx) return cfg.rules;
  return `${cfg.rules}\n\n──────────\nCONTEÚDO DOS PROTOCOLOS (fonte oficial do app):\n${ctx}`;
}

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
    return json(
      { error: "IA não configurada", detail: "Defina OPENAI_API_KEY nas variáveis de ambiente da Vercel." },
      503
    );
  }

  let body;
  try { body = await req.json(); } catch { return json({ error: "JSON inválido" }, 400); }

  const VALID_MODES = Object.keys(MODE_CONFIGS);
  const mode = VALID_MODES.includes(body.mode) ? body.mode : "chat";
  const cfg = MODE_CONFIGS[mode];

  let messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return json({ error: "messages vazio" }, 400);

  messages = messages
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_MESSAGES)
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MSG) }));
  if (!messages.length) return json({ error: "Nenhuma mensagem válida" }, 400);

  const payload = {
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
    messages: [{ role: "system", content: systemPrompt(mode, body.context) }, ...messages],
    temperature: cfg.temp,
    max_tokens: cfg.maxTok,
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

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
