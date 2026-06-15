// ─── ESCORES E CALCULADORAS CLÍNICAS ───────────────────────────────────────────
export const SCORES_DEF = {

  // ── qSOFA — Completo (Sepsis-3, Singer et al. JAMA 2016) ──────────────────
  qsofa: {
    label:"qSOFA — Triagem de Sepse",
    sub:"Quick SOFA completo · Sepsis-3 · Singer et al., JAMA 2016",
    ref:"Singer M et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801-810.",
    type:"check",
    note:"O qSOFA é uma ferramenta de triagem rápida à beira do leito. Score ≥ 2 identifica pacientes com suspeita de infecção em risco de desfecho desfavorável. Para diagnóstico de sepse, utilizar o escore SOFA completo.",
    fields:[
      { k:"fr",    label:"Frequência respiratória ≥ 22 irpm", pts:1, detail:"Avaliado por contagem direta da FR em 1 minuto" },
      { k:"pas",   label:"Pressão arterial sistólica ≤ 100 mmHg", pts:1, detail:"PAS aferida; qualquer momento da avaliação" },
      { k:"neuro", label:"Alteração do estado mental (Glasgow < 15)", pts:1, detail:"Qualquer alteração de consciência, confusão, agitação ou rebaixamento" },
    ],
    interp: s => s===0
      ? { label:"qSOFA 0 — Baixo risco imediato", color:"#276749", bg:"#C6F6D5",
          text:"Risco baixo de disfunção orgânica por sepse. Reavaliar se piora clínica. Não exclui infecção grave — manter vigilância clínica." }
      : s===1
      ? { label:"qSOFA 1 — Atenção", color:"#744210", bg:"#FEFCBF",
          text:"Vigilância aumentada. Considerar avaliação SOFA completa. Investigar foco infeccioso e realizar lactato. Repetir qSOFA em 1–2h." }
      : { label:"qSOFA ≥ 2 — Possível Sepse", color:"#9B2C2C", bg:"#FED7D7",
          text:"Alta probabilidade de sepse. INICIAR BUNDLE 1h: hemoculturas (2 pares), antibiótico empírico < 1h, lactato arterial, cristaloide 30 mL/kg se hipotensão ou lactato ≥ 4 mmol/L, vasopressor se PAM < 65 mmHg." },
  },

  // ── GRACE 2.0 — Completo com valores numéricos (Fox et al. 2006, revisado 2014) ─
  grace: {
    label:"GRACE 2.0 — Risco na SCA",
    sub:"Global Registry of Acute Coronary Events · Fox et al. · ESC/ACC-AHA Guidelines",
    ref:"Fox KA et al. Should patients with acute coronary disease be stratified for management according to their risk? BMJ 2010;340:b5453. GRACE 2.0: Reclassification of the GRACE risk score, 2014.",
    type:"grace_calc",
    note:"Escore validado em 102.341 pacientes (GRACE registry, 30 países). Recomendado pelas diretrizes ESC 2023 e ACC/AHA 2025 para estratificação de risco na SCA. Score > 140 = indicação de coronariografia em ≤ 24h.",
    fields:[
      { k:"age",       label:"Idade (anos)",                     type:"number", ph:"Ex: 68",  unit:"anos" },
      { k:"hr",        label:"Frequência cardíaca (bpm)",        type:"number", ph:"Ex: 92",  unit:"bpm"  },
      { k:"sbp",       label:"Pressão arterial sistólica (mmHg)",type:"number", ph:"Ex: 115", unit:"mmHg" },
      { k:"cr",        label:"Creatinina (mg/dL)",               type:"number", ph:"Ex: 1.2", unit:"mg/dL"},
      { k:"killip",    label:"Classe Killip",                    type:"select",
        options:[
          { v:"1", label:"Classe I — Sem sinais de IC", pts:0 },
          { v:"2", label:"Classe II — Estertores / TJP / B3", pts:20 },
          { v:"3", label:"Classe III — EAP franco", pts:39 },
          { v:"4", label:"Classe IV — Choque cardiogênico", pts:59 },
        ]},
      { k:"arrest",    label:"Parada cardíaca na admissão",       type:"bool", pts:39 },
      { k:"stdev",     label:"Desvio do segmento ST no ECG",      type:"bool", pts:28 },
      { k:"enzymes",   label:"Enzimas cardíacas elevadas (troponina/CK-MB)", type:"bool", pts:14 },
    ],
    // Pontuação GRACE por faixas (tabela validada do GRACE registry)
    calcPoints: v => {
      let pts = 0;
      // Idade
      const age = parseInt(v.age)||0;
      if(age<30) pts+=0; else if(age<40) pts+=8; else if(age<50) pts+=25;
      else if(age<60) pts+=41; else if(age<70) pts+=58; else if(age<80) pts+=75; else pts+=91;
      // FC
      const hr = parseInt(v.hr)||0;
      if(hr<50) pts+=0; else if(hr<70) pts+=3; else if(hr<90) pts+=9;
      else if(hr<110) pts+=15; else if(hr<150) pts+=24; else if(hr<200) pts+=38; else pts+=46;
      // PAS
      const sbp = parseInt(v.sbp)||0;
      if(sbp<80) pts+=58; else if(sbp<100) pts+=53; else if(sbp<120) pts+=43;
      else if(sbp<140) pts+=34; else if(sbp<160) pts+=24; else if(sbp<200) pts+=10; else pts+=0;
      // Creatinina (mg/dL)
      const cr = parseFloat(v.cr)||0;
      if(cr<0.39) pts+=1; else if(cr<0.79) pts+=4; else if(cr<1.19) pts+=7;
      else if(cr<1.59) pts+=10; else if(cr<1.99) pts+=13; else if(cr<3.99) pts+=21; else pts+=28;
      // Killip
      pts += parseInt(v.killip)||0;
      // Booleanos
      if(v.arrest==="true"||v.arrest===true) pts+=39;
      if(v.stdev==="true"||v.stdev===true)   pts+=28;
      if(v.enzymes==="true"||v.enzymes===true) pts+=14;
      return pts;
    },
    interp: s => s<=108
      ? { label:"Baixo risco (≤ 108)", color:"#276749", bg:"#C6F6D5",
          text:"Mortalidade hospitalar estimada < 1%. Investigação não invasiva. Coronariografia eletiva se indicada. Considerar alta precoce com seguimento ambulatorial." }
      : s<=140
      ? { label:"Risco intermediário (109–140)", color:"#744210", bg:"#FEFCBF",
          text:"Mortalidade hospitalar estimada 1–3%. Coronariografia em ≤ 72h. Manter anticoagulação, monitorização em unidade coronariana." }
      : { label:"Alto risco (> 140)", color:"#9B2C2C", bg:"#FED7D7",
          text:"Mortalidade hospitalar estimada > 3%. Coronariografia em ≤ 24h. ICP precoce. Internação em UTI/UCO. Anticoagulação plena e monitorização intensiva." },
  },

  // ── CHA₂DS₂-VASc — Completo (ESC 2020 + AHA/ACC/HRS 2023) ───────────────
  chadsvasc: {
    label:"CHA₂DS₂-VASc — Risco Tromboembólico na FA",
    sub:"Score completo · ESC Guidelines 2020 · AHA/ACC/HRS 2023",
    ref:"Hindricks G et al. 2020 ESC Guidelines for the diagnosis and management of atrial fibrillation. Eur Heart J. 2021;42(5):373-498. January CT et al. 2023 ACC/AHA/ACCP/HRS Guideline for Diagnosis and Management of Atrial Fibrillation. JACC. 2024.",
    type:"check",
    note:"Score máximo = 9 pontos. As diretrizes ESC 2024 propõem o CHA₂DS₂-VA (sem sexo feminino), mas o CHA₂DS₂-VASc permanece como padrão nas diretrizes AHA/ACC/HRS 2023. Ambas as versões são aceitas.",
    fields:[
      { k:"icc",  label:"C — ICC / Disfunção VE (FE reduzida ou preservada com sintomas)", pts:1,
        detail:"Inclui IC com FE reduzida (HFrEF) e IC com FE preservada (HFpEF) sintomática. Inclui pacientes com BNP/NT-proBNP elevados e evidência de disfunção cardíaca." },
      { k:"has",  label:"H — Hipertensão arterial sistêmica", pts:1,
        detail:"HAS diagnosticada ou em uso de anti-hipertensivo, mesmo que PA controlada no momento." },
      { k:"i75",  label:"A₂ — Idade ≥ 75 anos", pts:2,
        detail:"Score duplo (2 pontos). Fator de risco de maior peso independente." },
      { k:"dm",   label:"D — Diabetes mellitus", pts:1,
        detail:"DM tipo 1 ou 2, em uso de medicação ou com glicemia de jejum ≥ 126 mg/dL." },
      { k:"avc",  label:"S₂ — AVC / AIT / Tromboembolismo prévio", pts:2,
        detail:"Score duplo (2 pontos). AVC isquêmico, AIT ou tromboembolismo sistêmico prévio documentado." },
      { k:"dv",   label:"V — Doença vascular (IAM / DAP / placa aórtica)", pts:1,
        detail:"IAM prévio, doença arterial periférica sintomática ou placa aórtica complexa documentada por imagem." },
      { k:"i65",  label:"A — Idade 65–74 anos", pts:1,
        detail:"Apenas se idade entre 65 e 74 anos. NÃO somar com o critério A₂ (≥ 75 anos)." },
      { k:"sf",   label:"Sc — Sexo feminino", pts:1,
        detail:"Sexo feminino biológico. Nota: as diretrizes ESC 2024 propõem retirar este critério (CHA₂DS₂-VA). O sexo feminino isolado (score = 1) NÃO indica anticoagulação." },
    ],
    interp: s => s===0
      ? { label:"Score 0 — Baixo risco (homem)", color:"#276749", bg:"#C6F6D5",
          text:"Risco de AVC < 1%/ano. Sem indicação de anticoagulação. Reavaliar anualmente. Mulher com score 0 (sem outros fatores): mesma conduta." }
      : s===1
      ? { label:"Score 1 — Risco baixo-moderado", color:"#744210", bg:"#FEFCBF",
          text:"Homem score 1: considerar DOAC (risco ≈ 1%/ano). Mulher score 1 apenas por sexo (Sc): NÃO anticoagular. Mulher com 1 fator clínico real: considerar DOAC. Avaliar HAS-BLED." }
      : { label:`Score ${s} — Alto risco — ANTICOAGULAR`, color:"#9B2C2C", bg:"#FED7D7",
          text:`Score ${s}: indicação formal de anticoagulação oral. DOAC preferencial (Apixabana, Rivaroxabana, Dabigatrana). Warfarina se FA valvar ou prótese mecânica. Avaliar risco hemorrágico com escore HAS-BLED antes de prescrever.` },
  },

  // ── NIHSS — Completo com subitens 1a/1b/1c (Brott et al. 1989, Lyden 2001) ─
  nihss: {
    label:"NIHSS Completo — Gravidade do AVC",
    sub:"National Institutes of Health Stroke Scale · Score máximo: 42 pontos",
    ref:"Brott T et al. Measurements of acute cerebral infarction: a clinical examination scale. Stroke. 1989;20(7):864-870. Lyden P et al. Improved reliability of the NIH Stroke Scale using video training. Stroke. 1994;25(11):2220-2226.",
    type:"nihss_scale",
    note:"O NIHSS é o escore padrão-ouro para avaliação neurológica no AVC agudo. Score máximo = 42 pontos. Pontuações individuais NÃO devem ser estimadas — cada item requer avaliação clínica direta.",
    items:[
      { k:"1a", label:"1a — Nível de consciência (alerta)",
        detail:"Avalie sem estimular. Se intubado, a resposta pode ser deduzida da mímica e movimentos.",
        options:[
          { v:0, label:"0 — Alerta, responsivo" },
          { v:1, label:"1 — Sonolento, desperta ao estímulo mínimo" },
          { v:2, label:"2 — Obnubilado, requer estimulação repetida" },
          { v:3, label:"3 — Coma, responde apenas a reflexos ou sem resposta" },
        ]},
      { k:"1b", label:"1b — Consciência: perguntas (mês atual e idade do paciente)",
        detail:"Pergunte: 'Que mês é hoje?' e 'Qual é a sua idade?' Cada resposta correta = 0; ambas erradas = 2.",
        options:[
          { v:0, label:"0 — Responde ambas corretamente" },
          { v:1, label:"1 — Responde uma corretamente" },
          { v:2, label:"2 — Nenhuma correta (ou afásico/intubado)" },
        ]},
      { k:"1c", label:"1c — Consciência: comandos (abrir/fechar olhos e mão)",
        detail:"Ordene: 'Abra os olhos' e 'Feche a mão'. Se parético, use mão contrária.",
        options:[
          { v:0, label:"0 — Executa ambos corretamente" },
          { v:1, label:"1 — Executa apenas um" },
          { v:2, label:"2 — Nenhum comando executado" },
        ]},
      { k:"2", label:"2 — Melhor olhar conjugado",
        detail:"Avalie o olhar horizontal voluntário. Se paresia do nervo oculomotor isolada, pontue 1.",
        options:[
          { v:0, label:"0 — Normal" },
          { v:1, label:"1 — Paralisia parcial do olhar ou desvio corrigível" },
          { v:2, label:"2 — Desvio forçado ou paresia total não corrigível" },
        ]},
      { k:"3", label:"3 — Campo visual",
        detail:"Avalie por confrontação. Pontue déficits de extinção como 1.",
        options:[
          { v:0, label:"0 — Sem perda visual" },
          { v:1, label:"1 — Hemianopsia parcial (quadrantanopsia)" },
          { v:2, label:"2 — Hemianopsia completa" },
          { v:3, label:"3 — Hemianopsia bilateral / cegueira cortical" },
        ]},
      { k:"4", label:"4 — Paralisia facial",
        detail:"Peça ao paciente mostrar os dentes ou fechar os olhos com força.",
        options:[
          { v:0, label:"0 — Movimentos normais e simétricos" },
          { v:1, label:"1 — Paresia leve (assimetria ao sorrir)" },
          { v:2, label:"2 — Paresia parcial (paralisia inferior da face)" },
          { v:3, label:"3 — Paralisia completa uni ou bilateral" },
        ]},
      { k:"5a", label:"5a — Motor braço esquerdo",
        detail:"Braço a 90° (sentado) ou 45° (deitado) por 10 segundos. Pontue cada membro separadamente.",
        options:[
          { v:0, label:"0 — Sem queda em 10s" },
          { v:1, label:"1 — Queda antes de 10s, sem tocar a cama" },
          { v:2, label:"2 — Esforço contra gravidade, toca a cama" },
          { v:3, label:"3 — Sem esforço contra gravidade" },
          { v:4, label:"4 — Sem movimento" },
        ]},
      { k:"5b", label:"5b — Motor braço direito",
        detail:"Mesma avaliação do 5a para o lado direito.",
        options:[
          { v:0, label:"0 — Sem queda em 10s" },
          { v:1, label:"1 — Queda antes de 10s, sem tocar a cama" },
          { v:2, label:"2 — Esforço contra gravidade, toca a cama" },
          { v:3, label:"3 — Sem esforço contra gravidade" },
          { v:4, label:"4 — Sem movimento" },
        ]},
      { k:"6a", label:"6a — Motor perna esquerda",
        detail:"Perna a 30° (deitado) por 5 segundos.",
        options:[
          { v:0, label:"0 — Sem queda em 5s" },
          { v:1, label:"1 — Queda antes de 5s, sem tocar a cama" },
          { v:2, label:"2 — Esforço contra gravidade, toca a cama" },
          { v:3, label:"3 — Sem esforço contra gravidade" },
          { v:4, label:"4 — Sem movimento" },
        ]},
      { k:"6b", label:"6b — Motor perna direita",
        detail:"Mesma avaliação do 6a para o lado direito.",
        options:[
          { v:0, label:"0 — Sem queda em 5s" },
          { v:1, label:"1 — Queda antes de 5s, sem tocar a cama" },
          { v:2, label:"2 — Esforço contra gravidade, toca a cama" },
          { v:3, label:"3 — Sem esforço contra gravidade" },
          { v:4, label:"4 — Sem movimento" },
        ]},
      { k:"7", label:"7 — Ataxia de membros",
        detail:"Teste index-nariz e calcanhar-joelho. Pontue apenas se desproporcional à fraqueza.",
        options:[
          { v:0, label:"0 — Ausente" },
          { v:1, label:"1 — Em 1 membro" },
          { v:2, label:"2 — Em 2 ou mais membros" },
        ]},
      { k:"8", label:"8 — Sensibilidade",
        detail:"Teste com alfinete. Pontue apenas perda relacionada ao AVC.",
        options:[
          { v:0, label:"0 — Normal" },
          { v:1, label:"1 — Perda leve a moderada (sente, mas menos que o normal)" },
          { v:2, label:"2 — Perda grave ou total (não sente o toque)" },
        ]},
      { k:"9", label:"9 — Melhor linguagem (afasia)",
        detail:"Peça para nomear objetos, ler frases e descrever cenas (use o formulário NIHSS).",
        options:[
          { v:0, label:"0 — Sem afasia" },
          { v:1, label:"1 — Afasia leve a moderada (comunicação possível)" },
          { v:2, label:"2 — Afasia grave (quase sem comunicação)" },
          { v:3, label:"3 — Mudo, afasia global, coma" },
        ]},
      { k:"10", label:"10 — Disartria",
        detail:"Avalie articulação ao ler palavras. Não pontue se afásico.",
        options:[
          { v:0, label:"0 — Normal" },
          { v:1, label:"1 — Leve a moderada (palavras inteligíveis com dificuldade)" },
          { v:2, label:"2 — Grave (fala ininteligível ou mudo)" },
        ]},
      { k:"11", label:"11 — Extinção e negligência (inatenção)",
        detail:"Estimulação simultânea bilateral visual e sensitiva. Avalie também negligência espacial.",
        options:[
          { v:0, label:"0 — Sem anormalidade" },
          { v:1, label:"1 — Inatenção ou extinção a um tipo de estimulação" },
          { v:2, label:"2 — Negligência grave / hemi-inatenção (não reconhece o próprio lado)" },
        ]},
    ],
    interp: s => s===0
      ? { label:"NIHSS 0 — Sem déficit", color:"#276749", bg:"#C6F6D5",
          text:"Sem déficit neurológico detectável. Investigar AVC minor ou AIT — mesmo NIHSS 0 pode ocultar oclusão de grande vaso. TC/RM e avaliação neurológica obrigatórias." }
      : s<=4
      ? { label:`NIHSS ${s} — AVC leve (1–4)`, color:"#276749", bg:"#C6F6D5",
          text:"AVC leve. Trombólise IV indicada se dentro da janela de 4,5h. Considerar angiotomografia para excluir oclusão de grande vaso (trombectomia)." }
      : s<=15
      ? { label:`NIHSS ${s} — AVC moderado (5–15)`, color:"#744210", bg:"#FEFCBF",
          text:"AVC moderado. Trombólise IV e/ou trombectomia mecânica urgente. Alta probabilidade de oclusão de grande vaso. Time de AVC ativado." }
      : s<=20
      ? { label:`NIHSS ${s} — AVC moderado-grave (16–20)`, color:"#C05621", bg:"#FEEBC8",
          text:"AVC moderado-grave. Trombectomia mecânica prioritária. Avaliação urgente por neurointervencionista. Alta probabilidade de oclusão de artéria de grande calibre." }
      : { label:`NIHSS ${s} — AVC grave (21–42)`, color:"#9B2C2C", bg:"#FED7D7",
          text:"AVC grave. Trombectomia urgente se candidato. Avaliar suporte intensivo, prognosticar com família. Monitorização da PIC se deterioração." },
  },

  // ── Osmolaridade Sérica Efetiva ────────────────────────────────────────────
  osm: {
    label:"Osmolaridade Sérica Efetiva",
    sub:"Cálculo validado para EHH / hipernatremia · Fórmula de Worthley",
    ref:"Worthley LI et al. A comparison of hypertonic solutions for the treatment of acute hyponatraemia. Intensive Care Med. 1979. Fórmula padrão adotada pelas diretrizes ADA 2024.",
    type:"calc",
    note:"A osmolaridade sérica efetiva (tonicidade) é calculada excluindo a ureia, pois ela atravessa membranas livremente e não contribui para gradiente osmótico efetivo. Valor > 320 mOsm/kg é critério diagnóstico de EHH.",
    inputs:[
      { k:"na",  label:"Sódio sérico — Na⁺ (mEq/L)",   ph:"Ex: 152", unit:"mEq/L"  },
      { k:"gli", label:"Glicemia plasmática (mg/dL)",   ph:"Ex: 850", unit:"mg/dL"  },
    ],
    formula: v => 2*(parseFloat(v.na)||0) + (parseFloat(v.gli)||0)/18,
    interp: v => v<280
      ? { label:"Hipoosmolar (< 280 mOsm/kg)", color:"#2B6CB0", bg:"#EBF8FF",
          text:"Hipoosmolaridade. Avaliar hiponatremia verdadeira, síndrome de secreção inapropriada de ADH (SIADH) ou hiper-hidratação. Investigar causa antes de corrigir." }
      : v<=295
      ? { label:"Normal (280–295 mOsm/kg)", color:"#276749", bg:"#C6F6D5",
          text:"Osmolaridade dentro da faixa de referência normal." }
      : v<=320
      ? { label:"Hiperosmolar leve (296–320 mOsm/kg)", color:"#744210", bg:"#FEFCBF",
          text:"Hiperosmolaridade leve. Não preenche critério de EHH. Investigar causa, iniciar hidratação oral ou parenteral conforme quadro clínico." }
      : { label:"Hiperosmolar grave > 320 mOsm/kg — Critério de EHH", color:"#9B2C2C", bg:"#FED7D7",
          text:"Osmolaridade > 320 mOsm/kg confirma Estado Hiperosmolar Hiperglicêmico (EHH). CORREÇÃO LENTA obrigatória (máx 3–8 mOsm/kg/h). Redução rápida causa edema cerebral." },
    unit:"mOsm/kg",
  },

  // ── Escala de Coma de Glasgow ──────────────────────────────────────────────
  gcs: {
    label:"Escala de Coma de Glasgow (GCS)",
    sub:"Nível de consciência · Teasdale & Jennett · Score 3–15",
    ref:"Teasdale G, Jennett B. Assessment of coma and impaired consciousness: a practical scale. Lancet. 1974;304(7872):81-84.",
    type:"scale",
    note:"Some o melhor valor de cada domínio. Paciente intubado: registrar componente verbal como 'T' (pontuar 1). GCS ≤ 8 = indicação clássica de via aérea definitiva.",
    items:[
      { k:"ocular", label:"Abertura ocular (1–4)", def:4, options:[
        { v:4, label:"4 — Espontânea" },
        { v:3, label:"3 — Ao chamado verbal" },
        { v:2, label:"2 — À pressão / estímulo doloroso" },
        { v:1, label:"1 — Ausente" },
      ]},
      { k:"verbal", label:"Resposta verbal (1–5)", def:5, options:[
        { v:5, label:"5 — Orientado" },
        { v:4, label:"4 — Confuso" },
        { v:3, label:"3 — Palavras inapropriadas" },
        { v:2, label:"2 — Sons incompreensíveis" },
        { v:1, label:"1 — Ausente (intubado = T)" },
      ]},
      { k:"motora", label:"Resposta motora (1–6)", def:6, options:[
        { v:6, label:"6 — Obedece comandos" },
        { v:5, label:"5 — Localiza a dor" },
        { v:4, label:"4 — Retirada inespecífica (flexão normal)" },
        { v:3, label:"3 — Flexão anormal (decorticação)" },
        { v:2, label:"2 — Extensão anormal (descerebração)" },
        { v:1, label:"1 — Ausente" },
      ]},
    ],
    interp: s => s>=13
      ? { label:`GCS ${s} — Alteração leve (13–15)`, color:"#276749", bg:"#C6F6D5",
          text:"Consciência preservada ou alteração leve. Reavaliar seriadamente — queda ≥ 2 pontos é sinal de deterioração e exige reavaliação imediata." }
      : s>=9
      ? { label:`GCS ${s} — Alteração moderada (9–12)`, color:"#744210", bg:"#FEFCBF",
          text:"Rebaixamento moderado. Monitorização neurológica rigorosa, TC de crânio, reavaliação frequente. Preparar material de via aérea à beira do leito." }
      : { label:`GCS ${s} — Grave (≤ 8) — VIA AÉREA`, color:"#9B2C2C", bg:"#FED7D7",
          text:"GCS ≤ 8 = indicação de via aérea definitiva (IOT) para proteção. Investigar e tratar causa: TCE, intoxicação, hipoglicemia, AVC, status epilepticus não convulsivo." },
  },

  // ── SOFA completo ──────────────────────────────────────────────────────────
  sofa: {
    label:"SOFA — Disfunção Orgânica na Sepse",
    sub:"Sequential Organ Failure Assessment · Sepsis-3 · Score 0–24",
    ref:"Vincent JL et al. The SOFA (Sepsis-related Organ Failure Assessment) score. Intensive Care Med. 1996;22(7):707-710. Singer M et al. Sepsis-3. JAMA. 2016.",
    type:"scale",
    note:"Sepse = infecção suspeita + aumento agudo ≥ 2 pontos no SOFA em relação ao basal (assumir basal 0 se desconhecido). Use o pior valor das últimas 24h.",
    items:[
      { k:"resp", label:"Respiratório — PaO₂/FiO₂", def:0, options:[
        { v:0, label:"0 — ≥ 400" },
        { v:1, label:"1 — < 400" },
        { v:2, label:"2 — < 300" },
        { v:3, label:"3 — < 200 com suporte ventilatório" },
        { v:4, label:"4 — < 100 com suporte ventilatório" },
      ]},
      { k:"coag", label:"Coagulação — Plaquetas (×10³/µL)", def:0, options:[
        { v:0, label:"0 — ≥ 150" },
        { v:1, label:"1 — < 150" },
        { v:2, label:"2 — < 100" },
        { v:3, label:"3 — < 50" },
        { v:4, label:"4 — < 20" },
      ]},
      { k:"fig", label:"Hepático — Bilirrubina (mg/dL)", def:0, options:[
        { v:0, label:"0 — < 1,2" },
        { v:1, label:"1 — 1,2–1,9" },
        { v:2, label:"2 — 2,0–5,9" },
        { v:3, label:"3 — 6,0–11,9" },
        { v:4, label:"4 — ≥ 12,0" },
      ]},
      { k:"cv", label:"Cardiovascular — PAM / vasopressor", def:0, options:[
        { v:0, label:"0 — PAM ≥ 70 mmHg" },
        { v:1, label:"1 — PAM < 70 mmHg" },
        { v:2, label:"2 — Dopamina ≤ 5 ou Dobutamina (qualquer dose)" },
        { v:3, label:"3 — Dopamina > 5 ou Nora/Adrenalina ≤ 0,1 mcg/kg/min" },
        { v:4, label:"4 — Dopamina > 15 ou Nora/Adrenalina > 0,1 mcg/kg/min" },
      ]},
      { k:"snc", label:"Neurológico — Glasgow", def:0, options:[
        { v:0, label:"0 — GCS 15" },
        { v:1, label:"1 — GCS 13–14" },
        { v:2, label:"2 — GCS 10–12" },
        { v:3, label:"3 — GCS 6–9" },
        { v:4, label:"4 — GCS < 6" },
      ]},
      { k:"renal", label:"Renal — Creatinina (mg/dL) ou diurese", def:0, options:[
        { v:0, label:"0 — < 1,2" },
        { v:1, label:"1 — 1,2–1,9" },
        { v:2, label:"2 — 2,0–3,4" },
        { v:3, label:"3 — 3,5–4,9 ou diurese < 500 mL/dia" },
        { v:4, label:"4 — ≥ 5,0 ou diurese < 200 mL/dia" },
      ]},
    ],
    interp: s => s<2
      ? { label:`SOFA ${s} — Sem disfunção significativa`, color:"#276749", bg:"#C6F6D5",
          text:"Aumento < 2 pontos: não preenche critério de sepse (Sepsis-3). Manter vigilância e reavaliar se piora clínica." }
      : s<=7
      ? { label:`SOFA ${s} — Sepse (Δ ≥ 2)`, color:"#744210", bg:"#FEFCBF",
          text:"Aumento ≥ 2 pontos com infecção suspeita = SEPSE. Iniciar bundle de 1h: culturas, antibiótico < 1h, lactato, cristaloide 30 mL/kg se hipotensão. Mortalidade estimada ~10–20%." }
      : s<=11
      ? { label:`SOFA ${s} — Disfunção grave`, color:"#C05621", bg:"#FEEBC8",
          text:"Disfunção multiorgânica significativa. UTI, vasopressor precoce se PAM < 65, reavaliação seriada do lactato. Mortalidade estimada ~40–50%." }
      : { label:`SOFA ${s} — Disfunção muito grave`, color:"#9B2C2C", bg:"#FED7D7",
          text:"Falência multiorgânica. Suporte intensivo pleno, discutir metas de cuidado com equipe e família. Mortalidade estimada > 50–80%." },
  },

  // ── HAS-BLED ───────────────────────────────────────────────────────────────
  hasbled: {
    label:"HAS-BLED — Risco de Sangramento",
    sub:"Risco hemorrágico em anticoagulação na FA · Pisters et al. 2010 · ESC",
    ref:"Pisters R et al. A novel user-friendly score (HAS-BLED) to assess 1-year risk of major bleeding in patients with atrial fibrillation. Chest. 2010;138(5):1093-1100.",
    type:"check",
    note:"Complementa o CHA₂DS₂-VASc. Score ≥ 3 = alto risco hemorrágico — NÃO contraindica anticoagulação: indica corrigir fatores modificáveis e reavaliar com mais frequência.",
    fields:[
      { k:"h",  label:"H — Hipertensão não controlada (PAS > 160 mmHg)", pts:1, detail:"PAS persistentemente > 160 mmHg apesar de tratamento." },
      { k:"a1", label:"A — Função renal anormal", pts:1, detail:"Diálise, transplante renal ou creatinina > 2,26 mg/dL." },
      { k:"a2", label:"A — Função hepática anormal", pts:1, detail:"Cirrose, bilirrubina > 2× LSN ou TGO/TGP > 3× LSN." },
      { k:"s",  label:"S — AVC prévio", pts:1, detail:"História de AVC isquêmico ou hemorrágico." },
      { k:"b",  label:"B — Sangramento prévio ou predisposição", pts:1, detail:"Sangramento maior prévio, anemia ou diátese hemorrágica." },
      { k:"l",  label:"L — INR lábil (se em uso de varfarina)", pts:1, detail:"TTR < 60% — INR instável ou frequentemente fora do alvo." },
      { k:"e",  label:"E — Idade > 65 anos", pts:1, detail:"Idade superior a 65 anos." },
      { k:"d1", label:"D — Drogas que aumentam sangramento", pts:1, detail:"Uso concomitante de AAS, clopidogrel ou AINE." },
      { k:"d2", label:"D — Álcool (≥ 8 doses/semana)", pts:1, detail:"Consumo de álcool ≥ 8 unidades por semana." },
    ],
    interp: s => s<=1
      ? { label:`HAS-BLED ${s} — Baixo risco`, color:"#276749", bg:"#C6F6D5",
          text:"Risco de sangramento maior ~1%/ano. Anticoagular conforme CHA₂DS₂-VASc sem restrições adicionais." }
      : s===2
      ? { label:"HAS-BLED 2 — Risco moderado", color:"#744210", bg:"#FEFCBF",
          text:"Risco de sangramento ~2%/ano. Anticoagular se indicado; corrigir fatores modificáveis (PA, AINE, álcool) e revisar periodicamente." }
      : { label:`HAS-BLED ${s} — Alto risco (≥ 3)`, color:"#9B2C2C", bg:"#FED7D7",
          text:"Risco hemorrágico elevado (> 4%/ano). NÃO é contraindicação à anticoagulação: corrigir fatores modificáveis, preferir DOAC, revisões frequentes e orientar sinais de alarme." },
  },

  // ── Wells — TEP ────────────────────────────────────────────────────────────
  wells: {
    label:"Wells — Probabilidade de TEP",
    sub:"Embolia pulmonar · Wells et al. 2000 · dicotomizado (Christopher Study)",
    ref:"Wells PS et al. Derivation of a simple clinical model to categorize patients probability of pulmonary embolism. Thromb Haemost. 2000;83(3):416-420.",
    type:"check",
    note:"Critério dicotomizado: ≤ 4 = TEP improvável (solicitar D-dímero; se negativo, exclui TEP). > 4 = TEP provável (angioTC de tórax; considerar anticoagulação empírica se sem contraindicação).",
    fields:[
      { k:"tvp",   label:"Sinais clínicos de TVP (edema + dor à palpação)", pts:3,   detail:"Edema assimétrico de membro inferior com dor à palpação do trajeto venoso profundo." },
      { k:"alt",   label:"TEP é o diagnóstico mais provável que alternativas", pts:3, detail:"Julgamento clínico: nenhum diagnóstico alternativo explica melhor o quadro." },
      { k:"fc",    label:"Frequência cardíaca > 100 bpm", pts:1.5, detail:"Taquicardia sustentada na avaliação." },
      { k:"imob",  label:"Imobilização ≥ 3 dias ou cirurgia < 4 semanas", pts:1.5, detail:"Restrição ao leito ≥ 3 dias ou procedimento cirúrgico nas últimas 4 semanas." },
      { k:"prev",  label:"TEP ou TVP prévios", pts:1.5, detail:"Episódio tromboembólico prévio objetivamente confirmado." },
      { k:"hemo",  label:"Hemoptise", pts:1, detail:"Qualquer episódio de hemoptise associado ao quadro." },
      { k:"neo",   label:"Neoplasia ativa", pts:1, detail:"Câncer em tratamento, tratado nos últimos 6 meses ou paliativo." },
    ],
    interp: s => s<=4
      ? { label:`Wells ${s} — TEP improvável (≤ 4)`, color:"#276749", bg:"#C6F6D5",
          text:"Solicitar D-dímero: se NEGATIVO, TEP excluído sem imagem. Se positivo, prosseguir com angioTC de tórax. Considerar critérios PERC em risco muito baixo." }
      : { label:`Wells ${s} — TEP provável (> 4)`, color:"#9B2C2C", bg:"#FED7D7",
          text:"AngioTC de tórax imediata (não usar D-dímero para excluir). Considerar anticoagulação empírica se exame demorar e sem contraindicações. Instabilidade → avaliar trombólise." },
  },

  // ── HEART — Dor torácica ───────────────────────────────────────────────────
  heart: {
    label:"HEART — Dor Torácica na Emergência",
    sub:"Risco de evento cardíaco maior (MACE) em 6 semanas · Six/Backus",
    ref:"Six AJ, Backus BE, Kelder JC. Chest pain in the emergency room: value of the HEART score. Neth Heart J. 2008;16(6):191-196.",
    type:"scale",
    note:"Aplicar em dor torácica indiferenciada na emergência (não usar se IAMCSSST evidente). MACE = morte, IAM ou revascularização em 6 semanas.",
    items:[
      { k:"h", label:"H — História clínica", def:0, options:[
        { v:0, label:"0 — Pouco suspeita" },
        { v:1, label:"1 — Moderadamente suspeita" },
        { v:2, label:"2 — Altamente suspeita (típica)" },
      ]},
      { k:"e", label:"E — ECG", def:0, options:[
        { v:0, label:"0 — Normal" },
        { v:1, label:"1 — Alterações inespecíficas de repolarização" },
        { v:2, label:"2 — Infradesnível de ST significativo" },
      ]},
      { k:"a", label:"A — Idade", def:0, options:[
        { v:0, label:"0 — < 45 anos" },
        { v:1, label:"1 — 45–64 anos" },
        { v:2, label:"2 — ≥ 65 anos" },
      ]},
      { k:"r", label:"R — Fatores de risco (HAS, DM, DLP, tabagismo, obesidade, HF)", def:0, options:[
        { v:0, label:"0 — Nenhum" },
        { v:1, label:"1 — 1 a 2 fatores" },
        { v:2, label:"2 — ≥ 3 fatores ou aterosclerose conhecida" },
      ]},
      { k:"t", label:"T — Troponina", def:0, options:[
        { v:0, label:"0 — ≤ limite normal" },
        { v:1, label:"1 — 1–3× o limite normal" },
        { v:2, label:"2 — > 3× o limite normal" },
      ]},
    ],
    interp: s => s<=3
      ? { label:`HEART ${s} — Baixo risco (0–3)`, color:"#276749", bg:"#C6F6D5",
          text:"MACE ~1,7% em 6 semanas. Candidato a alta com troponina seriada negativa e seguimento ambulatorial precoce." }
      : s<=6
      ? { label:`HEART ${s} — Risco intermediário (4–6)`, color:"#744210", bg:"#FEFCBF",
          text:"MACE ~17%. Observação hospitalar, troponina seriada, considerar teste provocativo ou angioTC de coronárias antes da alta." }
      : { label:`HEART ${s} — Alto risco (7–10)`, color:"#9B2C2C", bg:"#FED7D7",
          text:"MACE ~50%. Manejo como SCA de alto risco: antiagregação, anticoagulação e estratégia invasiva precoce conforme protocolo." },
  },

  // ── Cockcroft-Gault ────────────────────────────────────────────────────────
  clcr: {
    label:"Clearance de Creatinina (Cockcroft-Gault)",
    sub:"Estimativa da função renal para ajuste de dose de fármacos",
    ref:"Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. Nephron. 1976;16(1):31-41.",
    type:"calc",
    note:"Fórmula de referência para ajuste de dose de fármacos (enoxaparina, antibióticos, DOACs). Menos precisa em extremos de peso e em creatinina instável (lesão renal aguda).",
    inputs:[
      { k:"idade", label:"Idade (anos)",             ph:"Ex: 72",  unit:"anos"  },
      { k:"peso",  label:"Peso (kg)",                ph:"Ex: 70",  unit:"kg"    },
      { k:"cr",    label:"Creatinina sérica (mg/dL)", ph:"Ex: 1.4", unit:"mg/dL" },
      { k:"sexo",  label:"Sexo", type:"select", options:[
        { v:"m", label:"Masculino" },
        { v:"f", label:"Feminino (× 0,85)" },
      ]},
    ],
    formula: v => {
      const a=parseFloat(v.idade)||0, p=parseFloat(v.peso)||0, c=parseFloat(v.cr)||0;
      if(!a||!p||!c) return 0;
      const base=((140-a)*p)/(72*c);
      return v.sexo==="f" ? base*0.85 : base;
    },
    interp: v => v<=0
      ? { label:"Preencha idade, peso e creatinina", color:"#718096", bg:"#EDF2F7", text:"Informe os três valores numéricos para calcular o clearance estimado." }
      : v>=90
      ? { label:"ClCr ≥ 90 — Função renal normal", color:"#276749", bg:"#C6F6D5", text:"Sem necessidade de ajuste renal para a maioria dos fármacos." }
      : v>=60
      ? { label:"ClCr 60–89 — Redução leve", color:"#276749", bg:"#C6F6D5", text:"Em geral sem ajuste de dose. Atenção a fármacos de janela estreita." }
      : v>=30
      ? { label:"ClCr 30–59 — Redução moderada", color:"#744210", bg:"#FEFCBF", text:"AJUSTAR DOSES: enoxaparina, DOACs, vancomicina, aciclovir, meropenem, levetiracetam. Conferir protocolos de ajuste renal." }
      : v>=15
      ? { label:"ClCr 15–29 — Redução grave", color:"#C05621", bg:"#FEEBC8", text:"Ajuste obrigatório ou contraindicação de vários fármacos (ex: enoxaparina 1 mg/kg/dia; evitar fondaparinux/dabigatrana). Avaliar nefrologia." }
      : { label:"ClCr < 15 — Falência renal", color:"#9B2C2C", bg:"#FED7D7", text:"Doses de diálise / evitar fármacos de eliminação renal. Acionar nefrologia — considerar terapia substitutiva." },
    unit:"mL/min",
  },

  // ── QTc (Bazett) ───────────────────────────────────────────────────────────
  qtc: {
    label:"QTc — Intervalo QT Corrigido (Bazett)",
    sub:"QTc = QT ÷ √(RR) · risco de Torsades de Pointes",
    ref:"Bazett HC. An analysis of the time-relations of electrocardiograms. Heart. 1920;7:353-370. AHA/ACCF/HRS Recommendations 2009.",
    type:"calc",
    note:"Medir o QT na derivação com maior intervalo (geralmente DII ou V5). Bazett superestima em taquicardia e subestima em bradicardia. Limites: ≥ 450 ms (homens) / ≥ 470 ms (mulheres) = prolongado.",
    inputs:[
      { k:"qt", label:"Intervalo QT medido (ms)",  ph:"Ex: 400", unit:"ms"  },
      { k:"fc", label:"Frequência cardíaca (bpm)", ph:"Ex: 75",  unit:"bpm" },
    ],
    formula: v => {
      const qt=parseFloat(v.qt)||0, fc=parseFloat(v.fc)||0;
      if(!qt||!fc) return 0;
      return qt/Math.sqrt(60/fc);
    },
    interp: v => v<=0
      ? { label:"Preencha QT e FC", color:"#718096", bg:"#EDF2F7", text:"Informe o QT medido (em ms) e a frequência cardíaca para calcular o QTc." }
      : v<440
      ? { label:"QTc normal (< 440 ms)", color:"#276749", bg:"#C6F6D5", text:"Intervalo QT corrigido dentro da normalidade." }
      : v<500
      ? { label:"QTc prolongado (440–499 ms)", color:"#744210", bg:"#FEFCBF", text:"QT prolongado (homens ≥ 450 / mulheres ≥ 470 ms). Revisar fármacos prolongadores de QT (amiodarona, ondansetrona, haloperidol, macrolídeos, quinolonas), corrigir K⁺ ≥ 4,0 e Mg²⁺ ≥ 2,0." }
      : { label:"QTc ≥ 500 ms — ALTO RISCO DE TdP", color:"#9B2C2C", bg:"#FED7D7", text:"Risco elevado de Torsades de Pointes. SUSPENDER fármacos prolongadores de QT, repor Mg²⁺ e K⁺ agressivamente, monitorização contínua. TdP → MgSO₄ 2 g IV." },
    unit:"ms",
  },

  // ── Sódio corrigido pela glicemia ──────────────────────────────────────────
  nacorr: {
    label:"Sódio Corrigido pela Glicemia",
    sub:"Na⁺ corrigido = Na⁺ + 1,6 × [(glicemia − 100) ÷ 100] · CAD e EHH",
    ref:"Katz MA. Hyperglycemia-induced hyponatremia: calculation of expected serum sodium depression. N Engl J Med. 1973;289(16):843-844.",
    type:"calc",
    note:"Na hiperglicemia, a água migra para o extracelular e dilui o sódio (hiponatremia dilucional). Use o valor corrigido para decisões de reposição na CAD e no EHH.",
    inputs:[
      { k:"na",  label:"Sódio medido (mEq/L)", ph:"Ex: 128", unit:"mEq/L" },
      { k:"gli", label:"Glicemia (mg/dL)",      ph:"Ex: 650", unit:"mg/dL" },
    ],
    formula: v => {
      const na=parseFloat(v.na)||0, gli=parseFloat(v.gli)||0;
      if(!na) return 0;
      return na + 1.6*Math.max(0,(gli-100))/100;
    },
    interp: v => v<=0
      ? { label:"Preencha Na⁺ e glicemia", color:"#718096", bg:"#EDF2F7", text:"Informe o sódio medido e a glicemia para obter o sódio corrigido." }
      : v<135
      ? { label:"Na⁺ corrigido < 135 — Hiponatremia verdadeira", color:"#9B2C2C", bg:"#FED7D7", text:"Hiponatremia real mesmo após correção pela glicemia. Avaliar gravidade e sintomas neurológicos — ver protocolo de distúrbios hidroeletrolíticos." }
      : v<=145
      ? { label:"Na⁺ corrigido normal (135–145)", color:"#276749", bg:"#C6F6D5", text:"Sódio efetivamente normal — a hiponatremia aparente é dilucional pela hiperglicemia. Tende a subir com a correção da glicemia." }
      : { label:"Na⁺ corrigido > 145 — Hipernatremia", color:"#744210", bg:"#FEFCBF", text:"Hipernatremia verdadeira com déficit de água livre — comum no EHH. Correção LENTA: máx 10 mEq/L em 24h (risco de edema cerebral)." },
    unit:"mEq/L",
  },

  // ── Cálcio corrigido pela albumina ─────────────────────────────────────────
  cacorr: {
    label:"Cálcio Corrigido pela Albumina",
    sub:"Ca²⁺ corrigido = Ca²⁺ medido + 0,8 × (4 − albumina)",
    ref:"Payne RB et al. Interpretation of serum calcium in patients with abnormal serum proteins. BMJ. 1973;4(5893):643-646.",
    type:"calc",
    note:"~40% do cálcio circula ligado à albumina. Na hipoalbuminemia o cálcio total subestima o cálcio livre. Em paciente crítico, preferir dosagem direta do cálcio iônico.",
    inputs:[
      { k:"ca",  label:"Cálcio total medido (mg/dL)", ph:"Ex: 7.8", unit:"mg/dL" },
      { k:"alb", label:"Albumina sérica (g/dL)",      ph:"Ex: 2.5", unit:"g/dL"  },
    ],
    formula: v => {
      const ca=parseFloat(v.ca)||0, alb=parseFloat(v.alb)||0;
      if(!ca) return 0;
      return ca + 0.8*(4-(alb||4));
    },
    interp: v => v<=0
      ? { label:"Preencha cálcio e albumina", color:"#718096", bg:"#EDF2F7", text:"Informe o cálcio total e a albumina para obter o cálcio corrigido." }
      : v<8.5
      ? { label:"Hipocalcemia (corrigido < 8,5)", color:"#9B2C2C", bg:"#FED7D7", text:"Hipocalcemia verdadeira. Sintomática grave (tetania, QT longo, convulsão): Gluconato de Cálcio 10% 1–2 g IV em 10 min. Repor Mg²⁺ se baixo — causa de refratariedade." }
      : v<=10.5
      ? { label:"Cálcio corrigido normal (8,5–10,5)", color:"#276749", bg:"#C6F6D5", text:"Cálcio efetivamente normal após correção pela albumina." }
      : { label:"Hipercalcemia (corrigido > 10,5)", color:"#744210", bg:"#FEFCBF", text:"Hipercalcemia verdadeira. > 14 mg/dL ou sintomática: SF 0,9% vigoroso + Ácido Zoledrônico 4 mg IV. Ver protocolo de distúrbios hidroeletrolíticos." },
    unit:"mg/dL",
  },

  // ── Ânion Gap ──────────────────────────────────────────────────────────────
  aniongap: {
    label:"Ânion Gap",
    sub:"AG = Na⁺ − (Cl⁻ + HCO₃⁻) · classificação da acidose metabólica",
    ref:"Kraut JA, Madias NE. Serum anion gap: its uses and limitations in clinical medicine. Clin J Am Soc Nephrol. 2007;2(1):162-174.",
    type:"calc",
    note:"Corrigir pela albumina se hipoalbuminemia: somar 2,5 mEq/L ao AG para cada 1 g/dL de albumina abaixo de 4. Hipoalbuminemia mascara AG elevado.",
    inputs:[
      { k:"na",   label:"Sódio (mEq/L)",       ph:"Ex: 138", unit:"mEq/L" },
      { k:"cl",   label:"Cloro (mEq/L)",       ph:"Ex: 100", unit:"mEq/L" },
      { k:"hco3", label:"Bicarbonato (mEq/L)", ph:"Ex: 14",  unit:"mEq/L" },
    ],
    formula: v => {
      const na=parseFloat(v.na)||0, cl=parseFloat(v.cl)||0, hco3=parseFloat(v.hco3)||0;
      if(!na||!cl) return 0;
      return na-(cl+hco3);
    },
    interp: v => v<=0
      ? { label:"Preencha Na⁺, Cl⁻ e HCO₃⁻", color:"#718096", bg:"#EDF2F7", text:"Informe os três eletrólitos para calcular o ânion gap." }
      : v<8
      ? { label:"AG baixo (< 8)", color:"#2B6CB0", bg:"#EBF8FF", text:"AG reduzido: hipoalbuminemia (mais comum), paraproteinemia (mieloma), intoxicação por lítio ou brometo." }
      : v<=12
      ? { label:"AG normal (8–12)", color:"#276749", bg:"#C6F6D5", text:"Se acidose com AG normal (hiperclorêmica): diarreia, acidose tubular renal, fístulas, SF 0,9% em grande volume." }
      : { label:"AG elevado (> 12)", color:"#9B2C2C", bg:"#FED7D7", text:"Acidose com AG elevado — GOLD MARK: Glicóis, Oxoprolina, Lactato, D-lactato, Metanol, Aspirina, insuficiência Renal (uremia), cetoacidose (CAD/alcoólica/jejum)." },
    unit:"mEq/L",
  },

  // ── Déficit de Água Livre ──────────────────────────────────────────────────
  h2odef: {
    label:"Déficit de Água Livre",
    sub:"Hipernatremia / EHH · Déficit = [(Na⁺ ÷ 140) − 1] × (0,6 × peso)",
    ref:"Adrogué HJ, Madias NE. Hypernatremia. N Engl J Med. 2000;342(20):1493-1499.",
    type:"calc",
    note:"Fator 0,6 (homem adulto); usar 0,5 em mulheres e idosos. Corrigir o déficit em 48–72h — redução máxima do Na⁺: 10 mEq/L em 24h (risco de edema cerebral).",
    inputs:[
      { k:"na",   label:"Sódio sérico atual (mEq/L)", ph:"Ex: 158", unit:"mEq/L" },
      { k:"peso", label:"Peso (kg)",                  ph:"Ex: 70",  unit:"kg"    },
    ],
    formula: v => {
      const na=parseFloat(v.na)||0, p=parseFloat(v.peso)||0;
      if(!na||!p) return 0;
      return ((na/140)-1)*(0.6*p);
    },
    interp: v => v<=0
      ? { label:"Sem déficit de água livre", color:"#276749", bg:"#C6F6D5", text:"Na⁺ ≤ 140 mEq/L ou dados incompletos — não há déficit de água livre a repor." }
      : { label:"Déficit de água livre a repor", color:"#744210", bg:"#FEFCBF",
          text:"Repor em 48–72h com água livre VO/SNG (preferencial), SG5% ou SF 0,45% IV. NUNCA reduzir Na⁺ > 10 mEq/L em 24h. Somar perdas insensíveis (~30–40 mL/h) ao plano. Monitorar Na⁺ a cada 4–6h." },
    unit:"L",
  },

  // ── Déficit de Potássio ────────────────────────────────────────────────────
  kdef: {
    label:"Déficit Estimado de Potássio",
    sub:"Déficit (mEq) = (K⁺ alvo − K⁺ atual) × peso × 0,4",
    ref:"Sterns RH et al. Internal potassium balance and the control of the plasma potassium concentration. Medicine. 1981;60(5):339-354.",
    type:"calc",
    note:"Estimativa do déficit corporal total. Regra prática: cada 0,3 mEq/L abaixo de 3,5 ≈ 100 mEq de déficit corporal. Corrigir Mg²⁺ — hipomagnesemia perpetua a hipocalemia.",
    inputs:[
      { k:"katual", label:"K⁺ atual (mEq/L)", ph:"Ex: 2.6", unit:"mEq/L" },
      { k:"kalvo",  label:"K⁺ alvo (mEq/L)",  ph:"Ex: 4.0", unit:"mEq/L" },
      { k:"peso",   label:"Peso (kg)",         ph:"Ex: 70",  unit:"kg"    },
    ],
    formula: v => {
      const ka=parseFloat(v.katual)||0, kv=parseFloat(v.kalvo)||0, p=parseFloat(v.peso)||0;
      if(!ka||!kv||!p) return 0;
      return Math.max(0,(kv-ka)*p*0.4);
    },
    interp: v => v<=0
      ? { label:"Sem déficit a repor", color:"#276749", bg:"#C6F6D5", text:"K⁺ atual ≥ alvo ou dados incompletos." }
      : { label:"Déficit estimado de K⁺ corporal", color:"#744210", bg:"#FEFCBF",
          text:"Reposição IV: veia periférica máx 20 mEq/h (40 mEq/L); veia central até 40 mEq/h (200 mEq/L) com ECG contínuo. NUNCA KCl em bolus. Não diluir em soro glicosado. Repor Mg²⁺ associado." },
    unit:"mEq",
  },
};
