// ─── MODELOS DE ANAMNESE POR CONTEXTO ─────────────────────────────────────────
// O médico escolhe o tipo; a `guidance` é injetada no pedido à IA para adaptar o
// foco e acrescentar seções específicas — mantendo SEMPRE as seções de raciocínio
// (Sinais de Alarme, Hipóteses, CID-10, Exames, Conduta, Pendências), para que os
// cards de apontamentos e o SOAP continuem funcionando.

export const ANAMNESE_TEMPLATES = [
  {
    id: "geral", emoji: "🩺", label: "Geral / Clínica",
    desc: "Anamnese clínica padrão.",
    guidance: "",
  },
  {
    id: "narrativo", emoji: "📝", label: "Narrativo (só transcrição)",
    desc: "Texto corrido do áudio — sem identificação, fatores de risco, hipóteses ou seções.",
    guidance: "", narrative: true,
  },
  {
    id: "politrauma", emoji: "🚑", label: "Politrauma (ATLS)",
    desc: "Vítima de trauma — ABCDE, cinemática e AMPLA.",
    guidance: "MODELO POLITRAUMA (ATLS). Vítima de trauma. Estruture com foco em: mecanismo e cinemática do trauma (tipo, energia, cinto/capacete, ejeção, óbito no local); Avaliação Primária ABCDE — A (via aérea + proteção da coluna cervical), B (ventilação/oxigenação), C (circulação + controle de hemorragia), D (neurológico — Glasgow, pupilas), E (exposição + hipotermia); história AMPLA (Alergias, Medicações, Passado, Líquidos/última ingesta, Ambiente/evento); avaliação secundária e busca de lesões ocultas. Acrescente uma seção \"## 🚑 Avaliação Primária (ABCDE)\" antes das hipóteses.",
  },
  {
    id: "emergencia", emoji: "🚨", label: "Sala de Emergência",
    desc: "Paciente grave/instável — estabilização.",
    guidance: "MODELO SALA DE EMERGÊNCIA. Paciente potencialmente grave/instável. Foque em: sinais de instabilidade (hemodinâmica, respiratória, neurológica), gravidade e tempo de evolução, medidas imediatas (MOVE: monitorização, O₂, acesso venoso, exames) e conduta de estabilização. Destaque o que é tempo-dependente.",
  },
  {
    id: "ps", emoji: "🏥", label: "Pronto-Socorro",
    desc: "Atendimento objetivo + destino do paciente.",
    guidance: "MODELO PRONTO-SOCORRO. Atendimento objetivo de PS. Foque em: queixa principal bem caracterizada, sinais de alarme, hipótese mais provável, conduta inicial e DECISÃO de destino (alta com orientações vs observação vs internação). Seja prático e direto.",
  },
  {
    id: "torax", emoji: "❤️", label: "Dor Torácica",
    desc: "Diferenciais graves do tórax.",
    guidance: "MODELO DOR TORÁCICA. Caracterize a dor (típica/atípica, início, irradiação, fatores de melhora/piora) e os fatores de risco cardiovascular. PRIORIZE os diferenciais graves: síndrome coronariana aguda, dissecção de aorta, tromboembolismo pulmonar, pneumotórax e pericardite. Destaque ECG e troponina nas condutas/exames.",
  },
  {
    id: "abdome", emoji: "🔥", label: "Abdome Agudo",
    desc: "Dor abdominal — causas cirúrgicas.",
    guidance: "MODELO ABDOME AGUDO. Caracterize a dor abdominal (localização, irradiação, tipo, sinais peritoneais) e sintomas associados (vômito, parada de eliminação de fezes/flatos, febre). Priorize diferenciais cirúrgicos (apendicite, colecistite, obstrução, perfuração, isquemia mesentérica, aneurisma roto) e ginecológicos quando aplicável.",
  },
  {
    id: "neuro", emoji: "🧠", label: "Neurológica",
    desc: "Cefaleia, déficit, rebaixamento.",
    guidance: "MODELO NEUROLÓGICO. Foque em: tempo de instalação (súbito vs progressivo), déficit focal, nível de consciência (Glasgow) e sinais de alarme (cefaleia thunderclap, rigidez de nuca, déficit motor). Priorize AVC (registre o último horário visto bem - last known well), hemorragia subaracnóidea, meningite e crise convulsiva. Destaque a janela terapêutica.",
  },
  {
    id: "pediatrica", emoji: "👶", label: "Pediátrica",
    desc: "Criança — peso, hidratação, gravidade.",
    guidance: "MODELO PEDIÁTRICO. Considere idade e peso, história perinatal e vacinal quando relevante, estado geral, hidratação e aceitação alimentar. Use parâmetros pediátricos e destaque sinais de gravidade na criança (triângulo de avaliação pediátrica: aparência, respiração, circulação).",
  },
  {
    id: "obstetrica", emoji: "🤰", label: "Gineco-obstétrica",
    desc: "DUM, IG e emergências da gestação.",
    guidance: "MODELO GINECO-OBSTÉTRICO. Registre DUM, gestações/paridade e idade gestacional. Priorize as emergências: gravidez ectópica, pré-eclâmpsia/eclâmpsia, sangramento, descolamento e trabalho de parto. Atenção a fármacos contraindicados na gestação.",
  },
  {
    id: "psiquiatrica", emoji: "🧩", label: "Psiquiátrica",
    desc: "Estado mental e avaliação de risco.",
    guidance: "MODELO PSIQUIÁTRICO. Foque em: queixa, exame do estado mental e AVALIAÇÃO DE RISCO (ideação/auto e heteroagressividade, plano suicida), uso de substâncias. Destaque o risco e a necessidade de medidas de segurança.",
  },
];

export const templateById = id => ANAMNESE_TEMPLATES.find(t => t.id === id) || ANAMNESE_TEMPLATES[0];
