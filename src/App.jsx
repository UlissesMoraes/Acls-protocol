import { useState } from "react";

// ─── DADOS DOS PROTOCOLOS (resumidos para garantir render) ────────────────────
const P = [
  {
    id:"taquiarritmias", label:"Taquiarritmias", icon:"⚡", cat:"Cardiovascular",
    color:"#C0392B", light:"#FDEDEC", border:"#E74C3C",
    sub:"Manejo da taquicardia na sala de emergência — ACLS 2025",
    cascade:[
      { step:1, phase:"AVALIAÇÃO INICIAL", alert:false,
        items:["Monitorização contínua: ECG, PA, SatO₂, FR","ECG 12 derivações em até 10 min","Acesso venoso periférico bilateral","O₂ somente se SatO₂ < 94%"],
        decision:{ q:"Paciente hemodinamicamente estável?", yes:"→ Avaliação do QRS (Passo 2)", no:"→ Cardioversão elétrica IMEDIATA (Passo 3)" }},
      { step:2, phase:"ANÁLISE DO RITMO — Estável", alert:false,
        items:["QRS estreito (< 120ms): TSV, FA, Flutter","QRS largo (≥ 120ms): presumir TV monomórfica","Irregularidade → FA ou Flutter com condução variável","Avaliar morfologia: BCRE, BCRD, WPW"],
        decision:{ q:"QRS estreito ou largo?", yes:"QRS Estreito → Adenosina (Passo 4)", no:"QRS Largo → Amiodarona IV (Passo 5)" }},
      { step:3, phase:"CARDIOVERSÃO ELÉTRICA SINCRONIZADA", alert:true,
        items:["Sedação: Midazolam 2–5 mg IV + Fentanil 1–2 mcg/kg","Verificar modo SINCRONIZADO antes do choque","SVT/FA/Flutter (QRS estreito): 50–100 J bifásico","TV monomórfica com pulso: 100 J bifásico","Se persistir: aumentar energia progressivamente"],
        decision:null },
      { step:4, phase:"TAQUICARDIA QRS ESTREITO — Tratamento", alert:false,
        items:["1ª linha: Manobras vagais — Valsalva modificado 15s","2ª linha: Adenosina 6 mg IV bolus rápido → 12 mg → 12 mg","FA com RVR: Metoprolol 5 mg IV (até 15 mg) ou Diltiazem 0,25 mg/kg IV","Flutter: preferir Diltiazem ou betabloqueador","Amiodarona 150 mg IV em 10 min se comprometimento hemodinâmico"],
        decision:null },
      { step:5, phase:"TAQUICARDIA QRS LARGO — Tratamento", alert:false,
        items:["1ª linha: Amiodarona 150 mg IV em 10 min → 1 mg/min 6h → 0,5 mg/min 18h","Alternativa: Procainamida 20–50 mg/min IV (máx 17 mg/kg) — CI em QT longo","TV polimórfica / TdP: MgSO₄ 2 g IV em 15 min","TdP: suspender drogas prologadoras, corrigir K⁺ e Mg²⁺","Dúvida TV vs TSV: Adenosina apenas se estável"],
        decision:null },
      { step:6, phase:"FA — Decisão Ritmo vs Frequência", alert:false,
        items:["< 48h ou anticoagulado ≥ 3 sem: considerar cardioversão","≥ 48h sem anticoagulação: ETE ou aguardar 3 semanas","Controle FC: Metoprolol, Diltiazem, Verapamil, Digoxina","Cardioversão química: Propafenona 600 mg VO (coração saudável)","CHA₂DS₂-VASc ≥ 1 (homens) / ≥ 2 (mulheres) → DOAC"],
        decision:null },
    ],
    drugs:[
      { name:"Adenosina", cat:"Antiarrítmico", dose:"6 mg → 12 mg → 12 mg IV bolus rápido", via:"IV bolus + flush 20 mL SF", ind:"TSV com QRS estreito", ci:"BAV 2º/3º grau, WPW pré-excitado, asma grave", obs:null },
      { name:"Amiodarona", cat:"Antiarrítmico", dose:"150 mg em 10 min → 1 mg/min 6h → 0,5 mg/min 18h", via:"IV em bomba", ind:"TV monomórfica estável, FA com disfunção VE", ci:"Bloqueio sinoatrial, tireotoxicose grave", obs:"Hipotensão na infusão rápida. Flebite em VP." },
      { name:"Metoprolol", cat:"Betabloqueador", dose:"5 mg IV a cada 5 min — máx 15 mg", via:"IV lento (1 mg/min)", ind:"Controle de FC na FA/Flutter, TSV", ci:"Broncoespasmo, BAV 2º/3º, IC descompensada", obs:"Monitorar PA e FC." },
      { name:"Diltiazem", cat:"Bloqueador Ca²⁺", dose:"0,25 mg/kg IV → 0,35 mg/kg se necessário → 5–15 mg/h", via:"IV lento em 2 min", ind:"Controle FC na FA/Flutter QRS estreito", ci:"IC com FE reduzida, WPW, hipotensão", obs:null },
      { name:"MgSO₄", cat:"Eletrólito/Antiarrítmico", dose:"2 g IV em 15 min (TdP)", via:"IV diluído em 50 mL SF", ind:"Torsades de Pointes, TV polimórfica QT longo", ci:"BAV, IRC grave", obs:"Hipotensão e depressão respiratória em infusão rápida." },
    ],
    antidotes:[],
    scores:["chadsvasc"],
  },
  {
    id:"bradiarritmias", label:"Bradiarritmias", icon:"🫀", cat:"Cardiovascular",
    color:"#1A5276", light:"#EBF5FB", border:"#2980B9",
    sub:"Avaliação e tratamento da bradicardia sintomática — ACLS 2025",
    cascade:[
      { step:1, phase:"IDENTIFICAÇÃO E AVALIAÇÃO", alert:false,
        items:["FC < 50 bpm com sintomas: síncope, dispneia, hipotensão, dor torácica","ECG 12 derivações: classificar ritmo e localizar BAV","Monitorização, acesso venoso, oximetria","Pesquisar causas: medicamentos, eletrólitos, IAM inferior, hipotireoidismo"],
        decision:{ q:"Bradicardia causa sintomas ou instabilidade?", yes:"→ Tratamento imediato (Passo 2)", no:"→ Investigar e monitorar" }},
      { step:2, phase:"TRATAMENTO DE PRIMEIRA LINHA", alert:false,
        items:["Atropina 1 mg IV → repetir cada 3–5 min → máx 3 mg","INEFICAZ em BAV infrahissiano — não retardar MCP","Dopamina 2–10 mcg/kg/min ou Adrenalina 2–10 mcg/min como ponte","Corrigir causas reversíveis simultaneamente"],
        decision:{ q:"Resposta adequada à Atropina?", yes:"→ Monitorar e investigar causa definitiva", no:"→ Marcapasso transcutâneo IMEDIATO (Passo 3)" }},
      { step:3, phase:"MARCAPASSO TRANSCUTÂNEO (MCP)", alert:true,
        items:["Sedação/analgesia: Midazolam 2–4 mg IV + Fentanil 1–2 mcg/kg","Frequência inicial: 60–80 bpm","Corrente: iniciar 70 mA → aumentar até captura elétrica e mecânica","Confirmar captura: espícula + QRS largo + pulso palpável","Preparar para Marcapasso Transvenoso definitivo"],
        decision:null },
      { step:4, phase:"BAV MOBITZ II E BAV TOTAL — Conduta", alert:true,
        items:["Risco de assistolia súbita — marcapasso OBRIGATÓRIO","Atropina frequentemente INEFICAZ — não retardar MCP","Chamar cardiologista para MTV de urgência","IAM inferior: pode ser transitório (7–14 dias)","IAM anterior: necessita MP definitivo — pior prognóstico"],
        decision:null },
      { step:5, phase:"CAUSAS REVERSÍVEIS — 6H6T", alert:false,
        items:["6H: Hipóxia, Hipovolemia, Hidrogênio (acidose), Hipo/Hipercalemia, Hipotermia, Hipoglicemia","6T: Tensão (pneumotórax), Tamponamento, Tóxicos, Trombose coronariana, TEP, Trauma","Suspender drogas bradicardizantes: betabloq, BCC, digoxina","Laboratorial: K⁺, Mg²⁺, TSH, glicemia, gasometria, troponina"],
        decision:null },
    ],
    drugs:[
      { name:"Atropina", cat:"Anticolinérgico", dose:"1 mg IV — repetir cada 3–5 min — máx 3 mg", via:"IV bolus direto", ind:"Bradicardia sinusal sintomática, BAV nodal (1º e Mobitz I)", ci:"Glaucoma ângulo fechado (relativo). Ineficaz em BAV infrahissiano.", obs:"Doses < 0,5 mg podem paradoxalmente PIORAR a bradicardia." },
      { name:"Dopamina", cat:"Vasopressor/Cronotrópico", dose:"2–10 mcg/kg/min IV (titular)", via:"IV em bomba contínua", ind:"Bradicardia refratária à Atropina como ponte ao MCP", ci:"Fibrilação ventricular, feocromocitoma", obs:"Extravasamento causa necrose — usar veia calibrosa ou central." },
      { name:"Adrenalina (Epinefrina)", cat:"Catecolamina", dose:"2–10 mcg/min IV em bomba", via:"IV em bomba contínua", ind:"Bradicardia grave refratária, instabilidade hemodinâmica", ci:"Taquiarritmias (relativo)", obs:"Alto risco de taquiarritmia. Monitorar continuamente." },
      { name:"Glucagon", cat:"Antídoto/Hormônio", dose:"3–10 mg IV bolus → infusão 3–5 mg/h", via:"IV bolus lento (1 min) + manutenção", ind:"Bradicardia por betabloqueador ou BCC", ci:"Feocromocitoma, insulinoma", obs:"Antídoto específico para betabloqueadores. Náusea frequente." },
    ],
    antidotes:[
      { agent:"Betabloqueadores", antidote:"Glucagon", dose:"3–10 mg IV bolus + 3–5 mg/h", notes:"Antídoto de 1ª linha. HIE nos casos graves." },
      { agent:"Bloqueadores de Ca²⁺", antidote:"Gluconato Ca²⁺ + HIE", dose:"CaGluconato 3 g IV + Insulina 1 UI/kg bolus → 0,5–1 UI/kg/h", notes:"HIE = High-dose Insulin Euglycemia. Monitorar glicemia." },
      { agent:"Digoxina", antidote:"Anticorpo antidigoxina (Digifab)", dose:"10–20 frascos IV (empírico)", notes:"Indicado se K⁺ > 5,5, BAV grave ou nível > 10 ng/mL." },
    ],
    scores:[],
  },
  {
    id:"pcr", label:"Parada Cardiorrespiratória", icon:"💓", cat:"Emergência",
    color:"#7B241C", light:"#FDEDEC", border:"#C0392B",
    sub:"Suporte avançado de vida — ACLS 2025",
    cascade:[
      { step:1, phase:"RECONHECIMENTO E ATIVAÇÃO", alert:true,
        items:["Confirmar inconsciência e ausência de respiração normal (< 10s)","Ativar código azul / SAMU — solicitar desfibrilador imediatamente","Posicionar em superfície rígida, decúbito dorsal","Iniciar RCP de alta qualidade SEM DEMORA"],
        decision:null },
      { step:2, phase:"RCP DE ALTA QUALIDADE", alert:false,
        items:["Frequência: 100–120 compressões/min","Profundidade: 5–6 cm (adulto) — retorno completo do tórax","Relação: 30:2 (sem VAI) / Contínua + 1 vent/6s (com VAI)","Rodízio do compressor a cada 2 min","Pausa máxima de 10s para análise e choque"],
        decision:null },
      { step:3, phase:"ANÁLISE DE RITMO (a cada 2 min)", alert:false, items:[],
        decision:{ q:"Ritmo chocável? (FV / TV sem pulso)", yes:"→ Desfibrilação imediata (Passo 4)", no:"→ AESP / Assistolia (Passo 5)" }},
      { step:4, phase:"RITMO CHOCÁVEL — FV / TV sem pulso", alert:true,
        items:["Choque: bifásico 200 J (ou carga máxima)","Retomar RCP IMEDIATAMENTE após choque (não checar pulso antes)","Adrenalina 1 mg IV/IO a cada 3–5 min (após 2º choque sem resposta)","Amiodarona 300 mg IV após 3º choque → 150 mg após 5º choque","Lidocaína 1–1,5 mg/kg se Amiodarona indisponível"],
        decision:null },
      { step:5, phase:"RITMO NÃO CHOCÁVEL — AESP / Assistolia", alert:false,
        items:["Adrenalina 1 mg IV/IO a cada 3–5 min — o mais precocemente possível","Buscar e tratar causas reversíveis (6H6T) a cada ciclo","Via aérea avançada: IOT precoce sem interromper RCP","ETCO₂ > 20 mmHg = RCP eficaz; > 40 mmHg sugere RCE","Assistolia: confirmar em 2 derivações"],
        decision:null },
      { step:6, phase:"RETORNO DA CIRCULAÇÃO ESPONTÂNEA (RCE)", alert:false,
        items:["Sinais de RCE: pulso, aumento súbito do ETCO₂, movimentos","SpO₂ alvo: 92–98% (evitar hiperóxia)","PA alvo: PAS ≥ 90 mmHg → Noradrenalina se hipotensão","Controle temperatura alvo: 32–36°C por 24h em coma pós-PCR","ECG 12 derivações imediato → coronariografia se suspeita de IAM"],
        decision:null },
    ],
    drugs:[
      { name:"Adrenalina (Epinefrina)", cat:"Catecolamina vasopressora", dose:"1 mg IV/IO a cada 3–5 min", via:"IV ou Intraósseo (IO)", ind:"Toda PCR (FV, TVsp, AESP, Assistolia)", ci:"Sem contraindicação absoluta em PCR", obs:"Bolus rápido + flush 20 mL. Na FV/TVsp: iniciar após 2º choque." },
      { name:"Amiodarona", cat:"Antiarrítmico", dose:"300 mg IV após 3º choque → 150 mg após 5º", via:"IV bolus rápido diluído em 20 mL SG5%", ind:"FV e TV sem pulso refratárias a choque", ci:"Sem contraindicação absoluta em PCR", obs:"Pós-PCR: manutenção 1 mg/min por 6h." },
      { name:"Lidocaína", cat:"Antiarrítmico Classe IB", dose:"1–1,5 mg/kg IV bolus → 0,5–0,75 mg/kg cada 5–10 min (máx 3 mg/kg)", via:"IV bolus", ind:"Alternativa à Amiodarona em FV/TV refratária", ci:"BAV avançado sem MCP", obs:"Opção quando Amiodarona indisponível." },
      { name:"Bicarbonato de Sódio 8,4%", cat:"Tampão", dose:"1 mEq/kg IV bolus — doses seguintes por gasometria", via:"IV bolus", ind:"Acidose grave pré-existente, hipercalemia, intoxicação por ADT", ci:"Uso rotineiro NÃO recomendado (AHA 2025)", obs:"Pode piorar acidose intracelular. Usar apenas em indicações precisas." },
    ],
    antidotes:[],
    scores:[],
  },
  {
    id:"iamcssst", label:"IAM com Supra de ST", icon:"❤️‍🔥", cat:"Cardiovascular",
    color:"#922B21", light:"#FDEDEC", border:"#C0392B",
    sub:"Infarto agudo do miocárdio com supradesnivelamento do ST — ACLS 2025",
    cascade:[
      { step:1, phase:"DIAGNÓSTICO — JANELA DE 10 MINUTOS", alert:true,
        items:["ECG 12 derivações em até 10 min da chegada","SupraSTEM ≥ 1 mm em ≥ 2 derivações contíguas","BRE novo ou presumidamente novo = equivalente IAMCSSST","IAM posterior: infraST V1–V3 + R proeminente → V7–V9","Troponina: coleta imediata — NÃO retarda reperfusão","Acionar Hemodinâmica / equipe de ICP imediatamente"],
        decision:null },
      { step:2, phase:"TRATAMENTO FARMACOLÓGICO INICIAL", alert:false,
        items:["AAS 300 mg VO mastigável — IMEDIATO","Ticagrelor 180 mg VO (preferencial) OU Clopidogrel 600 mg","HNF: 60–70 UI/kg IV bolus (máx 5.000 UI) + 12 UI/kg/h","Nitrato SL se PA > 90 mmHg — CI em uso de PDE5i < 48h","Morfina 2–4 mg IV se dor intensa refratária (usar com cautela)","O₂ APENAS se SpO₂ < 90%"],
        decision:null },
      { step:3, phase:"ESTRATÉGIA DE REPERFUSÃO", alert:false, items:[],
        decision:{ q:"ICP primária disponível em < 120 min do 1º contato médico?", yes:"→ ICP Primária — alvo door-to-balloon < 90 min (Passo 4)", no:"→ Fibrinólise imediata < 30 min da chegada (Passo 5)" }},
      { step:4, phase:"ICP PRIMÁRIA — PADRÃO-OURO", alert:false,
        items:["Alvo: door-to-balloon < 90 min (contato médico-to-balloon < 120 min)","Acesso arterial: radial preferencial (menor sangramento)","Anticoagulação periprocedimento: HNF ou Bivalirudina","GP IIb/IIIa (Abciximabe, Tirofiban): uso seletivo","Transferência inter-hospitalar não deve exceder 120 min"],
        decision:null },
      { step:5, phase:"FIBRINÓLISE — Se ICP Indisponível em Tempo", alert:true,
        items:["Iniciar em < 30 min da chegada (door-to-needle < 30 min)","Tenecteplase (TNKase): dose única IV bolus conforme peso","Verificar contraindicações absolutas antes de administrar","Após fibrinólise: transferir para ICP de resgate em 3–24h","Fibrinólise sem sucesso (< 50% resolução ST em 60–90 min): ICP de resgate imediata"],
        decision:null },
      { step:6, phase:"COMPLICAÇÕES E MANEJO", alert:false,
        items:["Choque cardiogênico: Noradrenalina + Dobutamina; BAIA; ICP urgente","EAP: Furosemida 40–80 mg IV + VNI (CPAP); Nitrato IV","BAV total em IAM inferior: Atropina → MCP se refratário","FV: desfibrilação imediata — Amiodarona pós-RCE","Tamponamento / ruptura: pericardiocentese + cirurgia"],
        decision:null },
    ],
    drugs:[
      { name:"AAS", cat:"Antiplaquetário", dose:"300 mg VO mastigável (ataque) → 100 mg/dia", via:"Via oral", ind:"Todos os casos de IAM/SCA — iniciar imediatamente", ci:"Alergia documentada", obs:"Mastigar o comprimido para absorção mais rápida." },
      { name:"Ticagrelor", cat:"Inibidor P2Y12", dose:"180 mg VO (ataque) → 90 mg 2x/dia (12 meses)", via:"Via oral", ind:"SCA — preferencial ao Clopidogrel", ci:"AVC hemorrágico prévio, sangramento ativo", obs:"Não usar se fibrinólise realizada. Dispneia transitória é efeito comum." },
      { name:"Tenecteplase (TNKase)", cat:"Fibrinolítico", dose:"≤60 kg: 30 mg / 60–70 kg: 35 mg / 70–80 kg: 40 mg / 80–90 kg: 45 mg / >90 kg: 50 mg", via:"IV bolus único em 5–10 segundos", ind:"Fibrinólise no IAMCSSST quando ICP indisponível em tempo", ci:"AVC hemorrágico prévio; AVC isquêmico < 3 meses; sangramento ativo; TCE grave < 3 meses; PA > 185/110 não controlada", obs:"Suspender HNF durante a administração. Reiniciar 3h após." },
      { name:"Heparina Não Fracionada (HNF)", cat:"Anticoagulante", dose:"60–70 UI/kg IV bolus (máx 5.000 UI) → 12 UI/kg/h (máx 1.000 UI/h)", via:"IV bolus + infusão contínua", ind:"Anticoagulação no IAM pré e periprocedimento", ci:"Sangramento ativo, HIT", obs:"Monitorar TTPA a cada 6h. Alvo 50–70s." },
      { name:"Noradrenalina", cat:"Vasopressor", dose:"0,01–3 mcg/kg/min IV (titular pela PAM)", via:"IV em bomba (preferencialmente acesso central)", ind:"Choque cardiogênico — vasopressor de 1ª linha", ci:"Hipovolemia não corrigida", obs:"Alvo PAM ≥ 65 mmHg. Associar Dobutamina se baixo débito." },
    ],
    antidotes:[],
    scores:[],
  },
  {
    id:"iamssst", label:"SCA sem Supra de ST", icon:"🫀", cat:"Cardiovascular",
    color:"#784212", light:"#FEF9E7", border:"#D4AC0D",
    sub:"Síndrome coronariana aguda sem supradesnivelamento do ST — ACLS 2025",
    cascade:[
      { step:1, phase:"DIAGNÓSTICO E ESTRATIFICAÇÃO", alert:false,
        items:["ECG: infraST ≥ 0,5 mm, inversão de onda T, ou sem alterações","Troponina ultrassensível: protocolo 0h/1h (preferencial) ou 0h/3h","Escore GRACE: estratifica risco e define tempo para invasão","Alto risco GRACE > 140: coronariografia ≤ 24h","Risco intermediário: coronariografia ≤ 72h","Baixo risco (GRACE < 109 + Troponina negativa): investigação não invasiva"],
        decision:null },
      { step:2, phase:"TRATAMENTO FARMACOLÓGICO INICIAL", alert:false,
        items:["AAS 300 mg VO + Ticagrelor 180 mg VO (preferencial)","Enoxaparina 1 mg/kg SC 12/12h (ajustar em DRC)","HNF se ICP planejada em < 6h: 60–70 UI/kg IV","Betabloqueador VO nas primeiras 24h (sem CI)","Estatina alta intensidade: Atorvastatina 40–80 mg VO","IECA/BRA após estabilização"],
        decision:null },
      { step:3, phase:"CRITÉRIOS DE MUITO ALTO RISCO — ICP < 2h", alert:true,
        items:["Instabilidade hemodinâmica ou choque cardiogênico","Dor torácica persistente refratária ao tratamento","Arritmias graves ou PCR ressuscitada","Complicações mecânicas: CIV, IM aguda, ruptura","InfraST dinâmico ≥ 1 mm em ≥ 6 derivações + SupraST em aVR/V1"],
        decision:null },
      { step:4, phase:"ANGINA INSTÁVEL — Troponina Negativa", alert:false,
        items:["Mesmo protocolo antiplaquetário e anticoagulante da SCA","ECG seriado: cada 30 min nas primeiras 2h","Troponina em série: 0h, 1h e 3h","Baixo risco GRACE < 109: teste funcional antes da alta","Alta: antiagregação dupla + estatina + betabloqueador + IECA"],
        decision:null },
    ],
    drugs:[
      { name:"Enoxaparina", cat:"HBPM", dose:"1 mg/kg SC 12/12h (ClCr < 30: 1 mg/kg/dia)", via:"Subcutânea", ind:"Anticoagulação na SCA — preferencial à HNF no manejo clínico", ci:"HIT, ClCr < 15, sangramento ativo", obs:"Não fazer anti-Xa de rotina. Não associar à HNF." },
      { name:"Ticagrelor", cat:"Inibidor P2Y12", dose:"180 mg VO (ataque) → 90 mg 2x/dia por 12 meses", via:"Via oral", ind:"SCA — inibidor P2Y12 de 1ª escolha", ci:"AVC hemorrágico prévio, sangramento ativo", obs:"Dispneia transitória é efeito frequente. Evitar AAS > 100 mg/dia." },
      { name:"Atorvastatina", cat:"Hipolipemiante", dose:"40–80 mg VO/dia (alta intensidade)", via:"Via oral", ind:"Toda SCA — iniciar imediatamente independente do LDL basal", ci:"Hepatopatia ativa, miopatia grave", obs:"Alvo LDL < 50 mg/dL em 4–6 semanas." },
      { name:"Fondaparinux", cat:"Inibidor Fator Xa", dose:"2,5 mg SC 1x/dia", via:"Subcutânea", ind:"SCA sem ST — menor risco de sangramento que Enoxaparina", ci:"ClCr < 20, procedimento invasivo imediato", obs:"Se ICP necessária: adicionar HNF 5.000 UI IV no procedimento." },
    ],
    antidotes:[],
    scores:["grace"],
  },
  {
    id:"intoxicacoes", label:"Intoxicações Agudas", icon:"☠️", cat:"Toxicologia",
    color:"#145A32", light:"#E9F7EF", border:"#27AE60",
    sub:"Condutas e antídotos nas intoxicações exógenas agudas",
    cascade:[
      { step:1, phase:"ABORDAGEM GERAL E DESCONTAMINAÇÃO", alert:false,
        items:["IOT precoce se Glasgow ≤ 8, risco de aspiração ou instabilidade respiratória","Carvão ativado 1 g/kg VO/SNG: eficaz se < 1–2h (CI: cáusticos, hidrocarbonetos)","Lavagem gástrica: casos selecionados, VAI protegida, < 1h","Descontaminação cutânea: remover roupas, SF abundante ≥ 15 min","CIT — Centro de Informações Toxicológicas: 0800-722-6001 (24h)"],
        decision:null },
      { step:2, phase:"OPIOIDES — Reconhecimento e Antídoto", alert:false,
        items:["Tríade: miose, depressão respiratória (FR < 12), rebaixamento de consciência","Naloxona 0,4–2 mg IV/IM/IN → repetir cada 2–3 min até FR > 12 irpm","Meia-vida curta da Naloxona: infusão de manutenção ou observação prolongada","Infusão: 2/3 da dose de reversão por hora em SF 0,9%","Fentanil e análogos sintéticos: podem precisar doses maiores"],
        decision:null },
      { step:3, phase:"ORGANOFOSFORADOS / CARBAMATOS", alert:true,
        items:["SLUDGE+B: Salivação, Lacrimação, Urina, Defecação, GI, Emese + Bradicardia, Broncoespasmo, Miose","Atropina 2–4 mg IV — DOBRAR a cada 5 min até secar secreções brônquicas (endpoint: secreções, NÃO FC)","Dose total pode atingir centenas de mg em casos graves","Pralidoxima 1–2 g IV em 15–30 min → 200–400 mg/h — eficaz se < 24–48h","IOT precoce se broncoespasmo grave — CI succinilcolina"],
        decision:null },
      { step:4, phase:"ANTIDEPRESSIVOS TRICÍCLICOS (ADT)", alert:false,
        items:["Quadro: taquicardia, QRS > 100 ms, hipotensão, convulsões, coma","Bicarbonato 8,4%: 1–2 mEq/kg IV — alvo QRS < 100 ms e pH 7,45–7,55","Manutenção: 150 mEq NaHCO₃ em 1.000 mL SG5% + KCl","Noradrenalina para hipotensão — EVITAR adrenalina isolada","BZD para convulsões — CONTRAINDICADO Flumazenil","EVITAR: Quinidina, Flecainida, Amiodarona, betabloqueadores"],
        decision:null },
      { step:5, phase:"PARACETAMOL — N-Acetilcisteína", alert:false,
        items:["Nomograma de Rumack-Matthew: nível sérico às 4h define indicação de NAC","NAC IV 21h: 150 mg/kg em 1h → 50 mg/kg em 4h → 100 mg/kg em 16h","Iniciar até 8h da ingestão para máxima eficácia","Monitorar: transaminases, TP/INR, creatinina, gasometria","Critérios de King's College para transplante hepático em falência fulminante"],
        decision:null },
    ],
    drugs:[
      { name:"Naloxona", cat:"Antagonista opioide", dose:"0,4–2 mg IV/IM/IN — repetir cada 2–3 min. Infusão: 2/3 da dose/h.", via:"IV, IM ou Intranasal", ind:"Intoxicação por opioides", ci:"Sem contraindicações absolutas em emergência", obs:"Meia-vida curta — monitorar 4–12h. Pode precipitar abstinência grave." },
      { name:"Atropina (colinérgica)", cat:"Anticolinérgico", dose:"2–4 mg IV cada 5 min — dobrar até secar secreções. Sem dose máxima.", via:"IV bolus", ind:"Intoxicação por organofosforados e carbamatos", ci:"Sem CI em toxicidade colinérgica grave", obs:"ENDPOINT: secreções brônquicas (não FC). Centenas de mg podem ser necessárias." },
      { name:"N-Acetilcisteína (NAC)", cat:"Antídoto/Hepatoprotetor", dose:"150 mg/kg em 1h → 50 mg/kg em 4h → 100 mg/kg em 16h", via:"IV em bomba", ind:"Intoxicação por paracetamol", ci:"Alergia (pré-medicar se histórico de reação)", obs:"Reações anafilactóides na 1ª hora em ~15%. Reduzir velocidade de infusão." },
      { name:"Flumazenil", cat:"Antagonista BZD", dose:"0,2 mg IV em 30s → 0,3 mg → 0,5 mg cada 1 min — máx 3 mg", via:"IV lento", ind:"Sedação por BZD (diagnóstico-terapêutico restrito)", ci:"Epilépticos em uso de BZD, intoxicação mista com ADT", obs:"Risco de convulsões. Ressedação possível (meia-vida curta)." },
    ],
    antidotes:[
      { agent:"Opioides", antidote:"Naloxona", dose:"0,4–2 mg IV/IM/IN — repetir cada 2–3 min", notes:"Infusão se necessário. Monitorar por 4–12h." },
      { agent:"Benzodiazepínicos", antidote:"Flumazenil", dose:"0,2–1 mg IV fracionado — máx 3 mg", notes:"CI em epilépticos e intoxicação mista com ADT." },
      { agent:"Organofosforados", antidote:"Atropina + Pralidoxima", dose:"Atropina: 2–4 mg IV (sem limite) | 2-PAM: 1–2 g IV", notes:"Endpoint: secreções brônquicas. Pralidoxima até 48h." },
      { agent:"Paracetamol", antidote:"N-Acetilcisteína (NAC)", dose:"150 mg/kg em 1h → 50 mg/kg 4h → 100 mg/kg 16h", notes:"Iniciar até 8h. Monitorar transaminases e INR." },
      { agent:"Antidepressivos Tricíclicos", antidote:"Bicarbonato de Sódio 8,4%", dose:"1–2 mEq/kg IV — alvo pH 7,45–7,55", notes:"Alvo QRS < 100 ms. CI Flumazenil." },
      { agent:"Betabloqueadores", antidote:"Glucagon + HIE", dose:"Glucagon 3–10 mg IV + Insulina 1 UI/kg → 0,5–1 UI/kg/h", notes:"HIE = High-dose Insulin Euglycemia. Monitorar glicemia." },
      { agent:"Bloqueadores Ca²⁺", antidote:"Gluconato Ca²⁺ + HIE + Lipid Rescue", dose:"CaGluconato 3 g IV + HIE + Lipid 20%: 1,5 mL/kg bolus", notes:"Emulsão lipídica 20% como resgate em toxicidade grave." },
      { agent:"Digoxina", antidote:"Anticorpo antidigoxina (Digifab)", dose:"10–20 frascos IV (empírico)", notes:"Indicado: K⁺ > 5,5, arritmia grave ou nível > 10 ng/mL." },
      { agent:"Cianeto", antidote:"Hidroxocobalamina", dose:"5 g IV em 15 min (máx 15 g)", notes:"Pode colorir urina/pele de vermelho." },
      { agent:"Monóxido de Carbono", antidote:"O₂ 100% (FiO₂ 1,0)", dose:"O₂ 100% por máscara com reservatório 4–6h. Câmara hiperbárica.", notes:"HBO se: gravidez, perda de consciência, COHb > 25%." },
      { agent:"Heparina", antidote:"Sulfato de Protamina", dose:"1 mg por 100 UI de HNF administrada (máx 50 mg IV lento)", notes:"< 5 mg/min. Risco de hipotensão." },
      { agent:"Varfarina", antidote:"Vitamina K + CCP", dose:"Vitamina K 10 mg IV lento + CCP 4 fatores 25–50 UI/kg", notes:"CCP para reversão urgente. Vitamina K demora 6–12h." },
      { agent:"Methemoglobinemia", antidote:"Azul de Metileno", dose:"1–2 mg/kg IV em 5–10 min", notes:"CI em deficiência de G6PD. Indicado MetHb > 20–25%." },
      { agent:"Ferro", antidote:"Deferoxamina", dose:"15 mg/kg/h IV (máx 6 g/dia)", notes:"Urina cor vinho = ferro livre. Continuar até urina clara." },
    ],
    scores:[],
  },
  {
    id:"sepse", label:"Sepse e Choque Séptico", icon:"🦠", cat:"Infectologia / UTI",
    color:"#1E8449", light:"#E9F7EF", border:"#27AE60",
    sub:"Bundle de tratamento — Surviving Sepsis Campaign 2021",
    cascade:[
      { step:1, phase:"RECONHECIMENTO — Critérios Sepsis-3", alert:false,
        items:["Sepse: infecção suspeita + disfunção orgânica (SOFA ≥ 2 pontos)","qSOFA (triagem): FR ≥ 22 + alteração consciência + PAS ≤ 100 mmHg","Choque séptico: sepse + vasopressor para PAM ≥ 65 + Lactato > 2 mmol/L pós-reposição","Mortalidade choque séptico > 40% — cada hora sem ATB aumenta mortalidade ~7%"],
        decision:null },
      { step:2, phase:"BUNDLE 1 HORA — Surviving Sepsis 2021", alert:true,
        items:["1. Lactato arterial — repetir se > 2 mmol/L (alvo: normalizar em 2–4h)","2. Hemoculturas (2 pares) ANTES do antibiótico — coleta < 45 min","3. Antibiótico empírico em < 1h do reconhecimento","4. Cristaloide 30 mL/kg se hipotensão OU Lactato ≥ 4 mmol/L","5. Vasopressor se PAM < 65 mmHg durante ou após reposição"],
        decision:null },
      { step:3, phase:"ANTIBIOTICOTERAPIA EMPÍRICA", alert:false,
        items:["Foco desconhecido: Piperacilina-Tazobactam 4,5 g IV 6/6h","Suspeita P. aeruginosa: Meropenem 1 g IV 8/8h","Suspeita MRSA: Vancomicina 15–20 mg/kg IV 8/8h","Sepse abdominal: Metronidazol + Cefalosporina 3ª ou Meropenem","Reavaliação 48–72h: desescalonamento baseado em cultura","Candidemia: Micafungina ou Fluconazol"],
        decision:null },
      { step:4, phase:"REPOSIÇÃO VOLÊMICA E VASOPRESSORES", alert:false,
        items:["Cristaloide balanceado (Ringer Lactato) preferencial ao SF 0,9%","Responsividade volêmica: PLR por 1 min — aumento DC > 10% = responsivo","Noradrenalina: vasopressor 1ª linha — 0,01–3 mcg/kg/min — alvo PAM ≥ 65","Vasopressina 0,03–0,04 UI/min: adicionar se NE > 0,25 mcg/kg/min","Adrenalina: 3ª linha ou choque refratário","Dobutamina: adicionar se disfunção miocárdica + PAM adequada"],
        decision:null },
      { step:5, phase:"CORTICOIDES E ADJUVANTES", alert:false,
        items:["Hidrocortisona 200 mg/dia IV: indicar se NE ≥ 0,25 mcg/kg/min","Controle glicêmico: alvo 140–180 mg/dL com insulina IV","VM protetora em SARA: VC 6 mL/kg ideal, PEEP ≥ 5, Pplatô < 30","Decúbito ventral ≥ 16h se PaO₂/FiO₂ < 150","Transfusão: Hb < 7 g/dL (< 9 se isquemia miocárdica ativa)"],
        decision:null },
    ],
    drugs:[
      { name:"Noradrenalina", cat:"Vasopressor", dose:"0,01–3 mcg/kg/min IV (titular pela PAM ≥ 65 mmHg)", via:"IV em bomba contínua (acesso central preferencial)", ind:"Choque séptico — vasopressor de 1ª linha", ci:"Hipovolemia não corrigida", obs:"Extravasamento causa necrose. Monitorar PAM invasiva." },
      { name:"Hidrocortisona", cat:"Corticoide", dose:"200 mg/dia IV — 50 mg 6/6h ou infusão contínua", via:"IV bolus ou infusão", ind:"Choque séptico refratário: NE ≥ 0,25 mcg/kg/min", ci:"Sem CI absolutas em choque refratário", obs:"Associar Fludrocortisona 50 mcg/dia VO. Retirada gradual." },
      { name:"Piperacilina-Tazobactam", cat:"Antibiótico beta-lactâmico", dose:"4,5 g IV cada 6h (infusão prolongada 4h — melhor PK/PD)", via:"IV em 30 min a 4h", ind:"Sepse foco desconhecido, intra-abdominal, respiratório", ci:"Alergia a penicilinas", obs:"Infusão prolongada de 4h aumenta tempo acima da CIM." },
      { name:"Vancomicina", cat:"Glicopeptídeo", dose:"15–20 mg/kg IV 8/8h (ataque 25–30 mg/kg se choque; máx 3 g/dose)", via:"IV lento 60–120 min", ind:"Cobertura de MRSA, enterococo, Streptococcus resistente", ci:"Alergia documentada (substituir por Linezolida)", obs:"Monitorar AUC₀₋₂₄/CIM (alvo 400–600). Nefrotóxica." },
      { name:"Dobutamina", cat:"Inotrópico", dose:"2–20 mcg/kg/min IV (iniciar 5 mcg/kg/min)", via:"IV em bomba contínua", ind:"Disfunção miocárdica séptica (baixo DC + PAM adequada)", ci:"Taquicardia grave, hipovolemia", obs:"Pode precipitar taquiarritmias. Não usar para elevar PAM." },
    ],
    antidotes:[],
    scores:["qsofa"],
  },
  {
    id:"cad", label:"Cetoacidose Diabética", icon:"🩸", cat:"Endocrinologia",
    color:"#7D6608", light:"#FEF9E7", border:"#D4AC0D",
    sub:"Emergência metabólica por deficiência absoluta ou relativa de insulina",
    cascade:[
      { step:1, phase:"CRITÉRIOS DIAGNÓSTICOS E CLASSIFICAÇÃO", alert:false,
        items:["Glicemia > 250 mg/dL (pode ser < 250 na CAD euglicêmica — SGLT2i, gravidez)","pH arterial < 7,30 e/ou Bicarbonato < 15 mEq/L","Cetonemia ≥ 3 mmol/L ou cetonúria 2+ ou superior","Ânion Gap elevado: AG = Na⁺ − (Cl⁻ + HCO₃⁻) > 12 mEq/L","Leve: pH 7,25–7,30 | Moderada: pH 7,00–7,24 | Grave: pH < 7,00"],
        decision:null },
      { step:2, phase:"REPOSIÇÃO VOLÊMICA — 1ª HORA CRÍTICA", alert:true,
        items:["SF 0,9%: 1 litro na 1ª hora (ou 10–20 mL/kg em hipovolemia grave)","Avaliar resposta: PA, FC, diurese, turgor, mucosas","Após 1ª hora: SF 0,9% ou 0,45% — 250–500 mL/h","Na⁺ corrigido = Na⁺ medido + 1,6 × [(glicemia − 100) / 100]","Quando glicemia ≤ 250: mudar para SG5% + SF 0,45% — manter insulina","Diurese alvo: 0,5–1,0 mL/kg/h"],
        decision:null },
      { step:3, phase:"INSULINOTERAPIA — REGRAS CRÍTICAS", alert:true,
        items:["NUNCA iniciar insulina com K⁺ < 3,5 mEq/L — risco de hipocalemia fatal","Insulina Regular IV: 0,1 UI/kg/h em infusão contínua — SEM bolus de ataque","Alvo: redução glicêmica 50–75 mg/dL/hora","Quando glicemia ≤ 250: reduzir para 0,02–0,05 UI/kg/h + iniciar SG5%","Manter insulina IV até: AG normalizado + pH > 7,30 + HCO₃ > 15","Transição SC: sobreposição 1–2h antes de desligar bomba IV"],
        decision:null },
      { step:4, phase:"REPOSIÇÃO DE POTÁSSIO — PROTOCOLO", alert:false,
        items:["K⁺ < 3,5: 40 mEq/h IV — INICIAR ANTES DA INSULINA","K⁺ 3,5–5,5: 20–40 mEq/h IV concomitante à insulina","K⁺ > 5,5: não repor — monitorar a cada 2h","Fosfato: repor se < 1,0 mg/dL ou sintomático","Magnésio: repor se < 1,5 mg/dL"],
        decision:null },
      { step:5, phase:"BICARBONATO E CRITÉRIOS DE RESOLUÇÃO", alert:false,
        items:["Bicarbonato: APENAS se pH < 6,9 — 100 mEq em 200 mL H₂O + KCl 10 mEq em 2h","NÃO usar de rotina — não melhora desfechos","Critérios de resolução: glicemia < 250 + AG normalizado + pH > 7,30 + HCO₃ > 15","Monitorização: gasometria 2/2h → 4/4h; eletrólitos 2–4h; glicemia capilar 1/1h","Investigar precipitante: infecção (50%), abandono de insulina, IAM, SGLT2i"],
        decision:null },
    ],
    drugs:[
      { name:"Insulina Regular", cat:"Hormônio/Hipoglicemiante", dose:"0,1 UI/kg/h IV contínuo — alvo ↓ 50–75 mg/dL/h", via:"IV em bomba (diluição 1 UI/mL em SF 0,9%)", ind:"Cetoacidose diabética — ação curta exclusivamente para IV", ci:"K⁺ < 3,5 mEq/L — corrigir primeiro", obs:"Trocar equipo após 30 mL de descarte (insulina adere ao plástico)." },
      { name:"Soro Fisiológico 0,9%", cat:"Cristaloide", dose:"1.000 mL na 1ª hora → 250–500 mL/h conforme resposta", via:"IV em bomba ou gravitacional", ind:"Reposição volêmica inicial na CAD — 1ª hora é crítica", ci:"ICC descompensada, EAP (relativo)", obs:"Após estabilização: usar SF 0,45% se Na⁺ normal ou elevado." },
      { name:"Cloreto de Potássio (KCl)", cat:"Eletrólito", dose:"20–40 mEq/h IV (K⁺ 3,5–5,5) | 40 mEq/h se K⁺ < 3,5", via:"IV diluído (NUNCA em bolus)", ind:"Reposição de potássio na CAD", ci:"K⁺ > 5,5, oligúria/anúria grave sem diálise", obs:"NUNCA KCl não diluído — parada cardíaca. ECG contínuo se K⁺ < 3,0." },
    ],
    antidotes:[],
    scores:[],
  },
  {
    id:"hhns", label:"Estado Hiperosmolar (EHH)", icon:"💧", cat:"Endocrinologia",
    color:"#154360", light:"#EBF5FB", border:"#2980B9",
    sub:"Emergência hiperglicêmica com hiperosmolaridade grave",
    cascade:[
      { step:1, phase:"CRITÉRIOS DIAGNÓSTICOS", alert:false,
        items:["Glicemia > 600 mg/dL (frequentemente > 900–1.000 mg/dL)","Osmolaridade sérica efetiva > 320 mOsm/kg: Osm = 2 × Na⁺ + (glicemia/18)","pH > 7,30 e HCO₃ > 15 mEq/L — diferencia do EHH da CAD grave","Cetonemia leve (< 3 mmol/L) ou ausente","Alteração do estado mental proporcional à osmolaridade","Mortalidade: 10–20% (maior que CAD) — principalmente pelas causas precipitantes"],
        decision:null },
      { step:2, phase:"REPOSIÇÃO VOLÊMICA — ABORDAGEM PRIORITÁRIA", alert:true,
        items:["Déficit de água livre: [(Na⁺ atual / 140) − 1] × (0,6 × peso kg)","SF 0,9%: 1.000 mL na 1ª hora (ou 15–20 mL/kg em hipovolemia grave)","Após: SF 0,45% 250–500 mL/h — CORREÇÃO LENTA (risco de edema cerebral)","Alvo: redução osmolaridade ≤ 3–8 mOsm/kg/h","Quando glicemia ≤ 300: SG5% + SF 0,45% para prevenir hipoglicemia","Diurese alvo: 0,5–1,0 mL/kg/h"],
        decision:null },
      { step:3, phase:"INSULINOTERAPIA — MAIS CONSERVADORA QUE CAD", alert:false,
        items:["Iniciar insulina SOMENTE após reposição volêmica adequada (≥ 1–2h)","Insulina Regular IV: 0,05–0,1 UI/kg/h (dose MENOR que na CAD)","Alvo: redução 50–75 mg/dL/h — quedas bruscas causam edema cerebral","K⁺ > 3,5 antes de iniciar insulina","Manter até osmolaridade < 315 e paciente responsivo"],
        decision:null },
      { step:4, phase:"COMPLICAÇÕES E PREVENÇÃO", alert:false,
        items:["TVP: Enoxaparina 40 mg SC/dia OBRIGATÓRIA — risco muito elevado","Rabdomiólise: hidratação agressiva, monitorar CK e creatinina 6/12h","Edema cerebral: evitar correção rápida de Na⁺ e glicemia (máx 10 mOsm/kg/h)","Convulsões: BZD; Fenitoína pouco eficaz em contexto metabólico","Precipitante: infecção (50%), AVC, IAM, diuréticos, corticoides, antipsicóticos"],
        decision:null },
    ],
    drugs:[
      { name:"Insulina Regular IV", cat:"Hormônio/Hipoglicemiante", dose:"0,05–0,1 UI/kg/h IV — dose menor que na CAD", via:"IV em bomba contínua", ind:"EHH — iniciar somente após reposição volêmica adequada", ci:"K⁺ < 3,5 mEq/L", obs:"Quedas rápidas de glicemia causam edema cerebral." },
      { name:"Enoxaparina (profilática)", cat:"Anticoagulante profilático", dose:"40 mg SC 1x/dia (ClCr < 30: 20 mg SC/dia)", via:"Subcutânea", ind:"Profilaxia de TVP/TEP no EHH — alto risco trombótico", ci:"Sangramento ativo, plaquetas < 50.000", obs:"Risco de trombose no EHH é EXTREMAMENTE alto — profilaxia OBRIGATÓRIA." },
    ],
    antidotes:[],
    scores:["osm"],
  },
  {
    id:"avc", label:"AVC / Síndromes Neurológicas", icon:"🧠", cat:"Neurologia",
    color:"#4A235A", light:"#F5EEF8", border:"#8E44AD",
    sub:"Acidente vascular cerebral isquêmico e hemorrágico — protocolo tempo-dependente",
    cascade:[
      { step:1, phase:"TRIAGEM RÁPIDA — BEFAST", alert:false,
        items:["BEFAST: Balance, Eyes, Face, Arms, Speech, Time — chamar Time de AVC imediatamente","NIHSS: avaliação neurológica quantitativa da gravidade","TC de crânio SEM contraste: imediato — descarta hemorragia","'Tempo é cérebro': cada minuto = ~1,9 milhão de neurônios perdidos","Glicemia capilar: corrigir hipoglicemia antes de qualquer diagnóstico"],
        decision:null },
      { step:2, phase:"AVC ISQUÊMICO — CRITÉRIOS PARA TROMBÓLISE IV", alert:false,
        items:["Janela: ≤ 4,5h do início dos sintomas (ou do 'last seen well')","TC sem contraste sem hemorragia ou lesão > 1/3 do território da ACM","Alteplase 0,9 mg/kg IV (máx 90 mg): 10% bolus em 1 min → 90% em 60 min","Tenecteplase 0,25 mg/kg IV bolus único (máx 25 mg) — aprovado 2022","PA PRÉ-trombólise: PAS < 185 / PAD < 110 mmHg (Labetalol ou Nicardipina IV)","Monitorar PA a cada 15 min durante trombólise"],
        decision:null },
      { step:3, phase:"CONTRAINDICAÇÕES ABSOLUTAS À TROMBÓLISE", alert:true,
        items:["AVC hemorrágico ou HSA prévios","AVC isquêmico nos últimos 3 meses","Cirurgia intracraniana, TCE grave ou AVC nos últimos 3 meses","Sangramento interno ativo (exceto menstrual)","Neoplasia intracraniana, MAV ou aneurisma","PA > 185/110 mmHg sem controle farmacológico","Plaquetas < 100.000/mm³, INR > 1,7, anticoagulante terapêutico"],
        decision:null },
      { step:4, phase:"TROMBECTOMIA MECÂNICA — Oclusão de Grande Vaso", alert:false,
        items:["Indicação: oclusão de ACM (M1/M2), ACI intracraniana, artéria basilar","Janela estendida até 24h com seleção por imagem (DAWN/DEFUSE-3)","NIHSS ≥ 6 como referência — avaliar caso a caso","NÃO retardar trombólise IV aguardando trombectomia","AngioTC de crânio e pescoço para identificar trombo","Transferência imediata se sem neurointervencionista"],
        decision:null },
      { step:5, phase:"AVC HEMORRÁGICO — Hemorragia Intracerebral", alert:true,
        items:["Reverter anticoagulação IMEDIATAMENTE (ver tabela de antídotos)","Controle pressórico: PAS alvo 130–140 mmHg — Labetalol ou Nicardipina IV","Monitorar PIC se Glasgow ≤ 8 ou hidrocefalia (DVE)","Neurocirurgia: hematoma cerebelar > 3 cm, hidrocefalia, deterioração","Posição: cabeceira 30°, normotermia, normoglicemia, normovolemia"],
        decision:null },
      { step:6, phase:"HEMORRAGIA SUBARACNOIDEA (HSA)", alert:false,
        items:["Cefaleia 'thunderclap' + TC: sangue nas cisternas basais = diagnóstico","TC negativa com alta suspeita: PL (xantocromia após 12h do início)","Angiografia cerebral para identificação do aneurisma roto","Nimodipino 60 mg VO 4/4h por 21 dias — prevenção de vasoespasmo","PAS < 160 mmHg antes de clipagem/coiling","Embolização (coiling) ou clipagem: o mais precoce possível (< 24–72h)"],
        decision:null },
    ],
    drugs:[
      { name:"Alteplase (rt-PA)", cat:"Fibrinolítico", dose:"0,9 mg/kg IV (máx 90 mg): 10% bolus em 1 min → 90% em 60 min", via:"IV em bomba de infusão", ind:"AVC isquêmico agudo ≤ 4,5h", ci:"Ver lista de contraindicações absolutas (Passo 3)", obs:"Risco de transformação hemorrágica — monitorar PA e status neurológico." },
      { name:"Tenecteplase", cat:"Fibrinolítico", dose:"0,25 mg/kg IV bolus único (máx 25 mg)", via:"IV bolus em 5–10 segundos", ind:"AVC isquêmico agudo ≤ 4,5h — alternativa ao Alteplase (aprovado 2022)", ci:"Mesmas do Alteplase", obs:"Perfil de segurança similar ao Alteplase no AVC." },
      { name:"Nimodipino", cat:"Bloqueador Ca²⁺ (neuroprotetor)", dose:"60 mg VO ou SNG 4/4h por 21 dias", via:"Via oral ou sonda nasogástrica", ind:"HSA — prevenção de vasoespasmo cerebral", ci:"Hipotensão grave (PAS < 90 mmHg)", obs:"Monitorar PA após cada dose. Comprimido pode ser triturado para SNG." },
      { name:"Labetalol", cat:"Anti-hipertensivo IV", dose:"10–20 mg IV em 1–2 min → repetir cada 10 min (máx 300 mg)", via:"IV bolus ou infusão", ind:"Controle pressórico pré-trombólise (PA > 185/110 mmHg)", ci:"Asma, DPOC grave, BAV 2º/3º, IC descompensada", obs:"Início em 5 min. Alvo PAS < 185 / PAD < 110 pré-trombólise." },
    ],
    antidotes:[
      { agent:"Varfarina", antidote:"CCP 4 fatores + Vitamina K", dose:"CCP 25–50 UI/kg IV + Vitamina K 10 mg IV lento", notes:"CCP reverte em minutos. Vitamina K demora 6–12h." },
      { agent:"Dabigatrana", antidote:"Idarucizumabe (Praxbind)", dose:"5 g IV (2 frascos de 2,5 g) — bolus único", notes:"Antídoto específico. Reversão em minutos." },
      { agent:"Rivaroxabana / Apixabana", antidote:"Andexanet Alfa", dose:"400–800 mg IV bolus + infusão", notes:"Alternativa: CCP 4 fatores 50 UI/kg se Andexanet indisponível." },
    ],
    scores:["nihss"],
  },
  {
    id:"convulsoes", label:"Síndrome Convulsiva", icon:"⚡", cat:"Neurologia",
    color:"#145A32", light:"#E9F7EF", border:"#27AE60",
    sub:"Crise epiléptica aguda e status epilepticus — protocolo tempo-dependente",
    cascade:[
      { step:1, phase:"ABORDAGEM INICIAL E CLASSIFICAÇÃO", alert:false,
        items:["Segurança: decúbito lateral, afastar objetos — NÃO colocar nada na boca","Registrar INÍCIO da crise (define urgência da intervenção)","Glicemia capilar: Tiamina 100 mg IV ANTES da glicose (desnutridos/alcoolistas)","Status Epilepticus (SE): crise ≥ 5 min OU 2 crises sem recuperação","ABC: monitorização, oximetria, acesso venoso, O₂ se SatO₂ < 94%"],
        decision:null },
      { step:2, phase:"FASE 1 — 0 a 5 min: BENZODIAZEPÍNICOS", alert:false,
        items:["Com acesso venoso: Diazepam 10 mg IV lento OU Lorazepam 4 mg IV (preferencial)","Sem acesso venoso: Midazolam 10 mg IM (vasto lateral) — RAMPART: não inferior ao Lorazepam IV","Alternativa IM/IN: Midazolam 0,1–0,2 mg/kg","Clonazepam 1–2 mg IV: alternativa válida","Repetir BZD UMA VEZ se sem resposta em 5 min"],
        decision:null },
      { step:3, phase:"FASE 2 — 5 a 20 min: ANTIEPILÉPTICOS 2ª LINHA", alert:true,
        items:["Valproato de Sódio: 40 mg/kg IV em 10 min (máx 3.000 mg) — 1ª opção","Levetiracetam: 60 mg/kg IV em 10 min (máx 4.500 mg) — boa segurança","Fosfenitoína: 20 mg PE/kg IV ou IM (máx 150 mg PE/min) — monitorar ECG","Fenitoína: 20 mg/kg IV (máx 50 mg/min) — em SF, não SG","Fenobarbital: 20 mg/kg IV (30 mg/min) — alternativa eficaz"],
        decision:null },
      { step:4, phase:"FASE 3 — SE REFRATÁRIO > 20–30 min: ANESTESIA GERAL", alert:true,
        items:["IOT OBRIGATÓRIA — via aérea definitiva antes da anestesia","Midazolam IV: 0,2 mg/kg bolus → 0,05–2 mg/kg/h (titular pelo EEG)","Propofol: 1–2 mg/kg bolus → 1–15 mg/kg/h — ATENÇÃO Síndrome do Propofol se > 48h","Tiopental: 3–5 mg/kg bolus → 3–5 mg/kg/h (supressão de surto no EEG)","Cetamina: 1,5–4,5 mg/kg bolus → 1,2–7,5 mg/kg/h","EEG CONTÍNUO OBRIGATÓRIO — alvo: supressão de surto"],
        decision:null },
      { step:5, phase:"CAUSAS ESPECÍFICAS — TRATAMENTO DIRIGIDO", alert:false,
        items:["Meningite/Encefalite: Ceftriaxona 2 g IV + Aciclovir 10 mg/kg IV — NÃO aguardar TC/PL","Dexametasona 0,15 mg/kg IV antes/junto ao ATB (meningite bacteriana)","Eclampsia: MgSO₄ 4–6 g IV bolus em 15 min → 1–2 g/h","SAA (abstinência alcoólica): BZD agressivo + Tiamina; NUNCA Haloperidol","Hiponatremia grave (Na⁺ < 120): NaCl 3% 100–150 mL IV em 10–15 min","Isoniazida (INH): Piridoxina (B6) dose equivalente em mg à dose ingerida"],
        decision:null },
    ],
    drugs:[
      { name:"Midazolam IM", cat:"Benzodiazepínico", dose:"10 mg IM (> 40 kg) / 5 mg IM (13–40 kg) — vasto lateral", via:"Intramuscular", ind:"SE sem acesso venoso — 1ª linha pré-hospitalar", ci:"Sem CI absolutas em SE", obs:"RAMPART Trial: não inferior ao Lorazepam IV. Início 3–5 min." },
      { name:"Lorazepam", cat:"Benzodiazepínico", dose:"4 mg IV — repetir 2–4 mg se sem resposta em 5 min (máx 8 mg)", via:"IV lento (2 mg/min)", ind:"SE com acesso venoso — meia-vida mais longa que Diazepam", ci:"Depressão resp grave sem suporte (relativo)", obs:"Preparar material de IOT junto. Efeito mais duradouro que Diazepam." },
      { name:"Valproato de Sódio", cat:"Antiepiléptico", dose:"40 mg/kg IV em 10 min (máx 3.000 mg) → manutenção 1–2 mg/kg/h", via:"IV em bomba", ind:"SE fase 2 — amplo espectro", ci:"Hepatopatia grave, gravidez (teratogênico)", obs:"Monitorar transaminases. Pode elevar amônia." },
      { name:"Levetiracetam", cat:"Antiepiléptico", dose:"60 mg/kg IV em 10 min (máx 4.500 mg)", via:"IV em bomba", ind:"SE fase 2 — boa segurança, sem interações", ci:"Sem CI absolutas. Ajustar em DRC.", obs:"Sem monitorar ECG. Seguro na gravidez. Pode causar agitação." },
      { name:"Propofol", cat:"Anestésico IV", dose:"1–2 mg/kg IV bolus → 1–15 mg/kg/h (SE refratário)", via:"IV em bomba (exige IOT prévia)", ind:"SE refratário — anestesia geral", ci:"Sem IOT, alergia ao ovo/soja", obs:"Síndrome do Propofol: acidose + rabdomiólise se > 48h em dose alta." },
      { name:"MgSO₄ (eclampsia)", cat:"Anticonvulsivante obstétrico", dose:"4–6 g IV em 15 min → 1–2 g/h por 24–48h pós-parto", via:"IV em bomba", ind:"Convulsões na eclampsia/pré-eclampsia", ci:"BAV, miastenia gravis", obs:"Reflexo patelar desaparece com Mg > 7 mEq/L. Antídoto: CaGluconato 1 g IV." },
    ],
    antidotes:[
      { agent:"Benzodiazepínicos (overdose)", antidote:"Flumazenil", dose:"0,2 mg IV → 0,3 mg → 0,5 mg (máx 3 mg)", notes:"CI em epilépticos e intoxicação mista com ADT." },
      { agent:"Isoniazida (INH)", antidote:"Piridoxina (Vitamina B6)", dose:"Dose equivalente em mg à INH ingerida. Empírico: 5 g IV", notes:"Crises refratárias = principal manifestação." },
      { agent:"Hiponatremia grave", antidote:"NaCl 3% hipertônico", dose:"100–150 mL IV em 10–15 min", notes:"Alvo: ↑ Na⁺ 1–2 mEq/L/h até cessação das crises." },
      { agent:"Hipoglicemia (causa de crise)", antidote:"Tiamina + Dextrose 50%", dose:"Tiamina 100 mg IV PRIMEIRO → Dextrose 50% 50 mL IV", notes:"Tiamina ANTES da glicose em desnutridos/alcoolistas." },
    ],
    scores:["chadsvasc"],
  },
  {
    id:"amax4", label:"Anafilaxia / Asma Grave — AMAX4", icon:"🚨", cat:"Emergência",
    color:"#6B21A8", light:"#F5F3FF", border:"#7C3AED",
    sub:"Algoritmo AMAX4 — Anafilaxia e Asma crítica com risco de lesão cerebral hipóxica · Dr. Ben McKenzie",
    cascade:[
      { step:1, phase:"RECONHECIMENTO IMEDIATO — JANELA DE 4 MINUTOS", alert:true,
        items:[
          "O cérebro tolera NO MÁXIMO 4 minutos de hipóxia antes de lesão cerebral irreversível",
          "CPR NÃO estende essa janela em parada hipóxica — a oxigenação é a única prioridade",
          "Anafilaxia: início agudo com comprometimento respiratório (broncoespasmo/estridor) ± hipotensão ± urticária",
          "A maioria dos jovens com anafilaxia fatal morre por BRONCOESPASMO — não por hipotensão",
          "Gatilho mais comum em jovens: alergia alimentar. Também venom, medicamentos",
          "Paciente pode estar alerta e com SatO₂ 100% e deteriorar abruptamente em segundos",
          "Ativar equipe de ressuscitação IMEDIATAMENTE ao primeiro sinal de gravidade",
        ],
        decision:{ q:"Paciente consciente com via aérea pérvia?", yes:"→ Adrenalina IM IMEDIATA + O₂ + monitorização (Passo 2)", no:"→ Inconsciente / assistindo ventilação → IOT EMERGENCIAL (Passo 3)" }},
      { step:2, phase:"ANAFILAXIA GRAVE — PACIENTE AINDA CONSCIENTE", alert:true,
        items:[
          "Adrenalina IM: 0,5 mg IM (adulto) / 0,3 mg IM (criança > 25 kg) / 0,15 mg IM (criança < 25 kg) — face anterolateral da coxa",
          "O₂ de alto fluxo: máscara com reservatório 15 L/min — alvo SatO₂ > 95%",
          "Posição: deitado com MMII elevados (se hipotensão) OU sentado (se broncoespasmo/dispneia)",
          "Acesso venoso imediato — duas vias calibrosas",
          "Broncoespasmo: Salbutamol 5 mg nebulizado contínuo OU 4–8 puffs inalatório",
          "Adrenalina IV em bomba: iniciar se sem resposta à IM — 1–10 mcg/min (0,05–0,3 mcg/kg/min)",
          "SF 0,9% 500–1.000 mL IV rápido se hipotensão",
          "Monitorização contínua: FC, PA, SatO₂, capnografia se disponível",
          "Repetir Adrenalina IM a cada 5 min se sem resposta ou deterioração",
        ],
        decision:{ q:"Deterioração apesar do tratamento? (rebaixamento, apneia, SatO₂ caindo)", yes:"→ INTUBAÇÃO OROTRAQUEAL IMEDIATA (Passo 3) — NÃO AGUARDAR", no:"→ Manter tratamento, observação rigorosa, preparar IOT à beira do leito" }},
      { step:3, phase:"INCONSCIÊNCIA / PARADA RESPIRATÓRIA — IOT EMERGENCIAL", alert:true,
        items:[
          "PRESSÕES DE VIA AÉREA SÃO EXTREMAMENTE ALTAS (50–100 cmH₂O) — BVM e LMA SÃO INADEQUADOS",
          "Apenas o TUBO OROTRAQUEAL (TOT) suporta as pressões necessárias para ventilar",
          "BVM pode oxigenar por tempo DESCONHECIDO — não confiar; intubar o mais rápido possível",
          "PRIMEIRA tentativa de IOT deve ser a MELHOR tentativa — use bloqueador neuromuscular + videolaringoscópio + melhor intubador disponível",
          "Succinilcolina 1,5 mg/kg IV ou Rocurônio 1,2 mg/kg IV — indução de sequência rápida",
          "Cetamina 1–2 mg/kg IV: anestésico de escolha (broncodilatador, hemodinâmica preservada)",
          "Se FALHA na IOT (CICO — Não Consigo Intubar, Não Consigo Oxigenar): VIA AÉREA CIRÚRGICA IMEDIATA",
          "Cricotireoidotomia de emergência — sem hesitação, sem nova tentativa de laringoscopia",
          "Confirmar posição do tubo: capnografia ETCO₂ OBRIGATÓRIA — mesmo em situação de urgência máxima",
        ],
        decision:null },
      { step:4, phase:"PÓS-INTUBAÇÃO — VENTILAÇÃO EXTREMA (Xtreme Ventilation)", alert:true,
        items:[
          "USAR BOLSA-VALVA-MÁSCARA (ambu) manualmente — NÃO conectar ao ventilador imediatamente",
          "Frequência respiratória BAIXA: 6–8 respirações/min para evitar auto-PEEP e hiperinsuflação",
          "Tempo expiratório LONGO: relação I:E = 1:4 ou 1:5 (deixar o ar sair completamente)",
          "Volume corrente: 6–8 mL/kg — aceitar hipercapnia permissiva (CO₂ até 80–100 mmHg)",
          "Pneumotórax: RISCO ALTO em parada hipóxica com RCP — suspeitar se resistência súbita ou queda de SatO₂",
          "Descompressão com agulha imediata se suspeita de pneumotórax hipertensivo (2º EIC linha médio-clavicular)",
          "Se dificuldade extrema de ventilar: desconectar o circuito por 30–60s para permitir expiração completa (auto-PEEP)",
          "Após estabilização ventilatória: conectar ao ventilador com modo controlado, FR 8–10, PEEP mínimo",
        ],
        decision:null },
      { step:5, phase:"TERAPIA FARMACOLÓGICA MÁXIMA (Xtra Medical Therapy)", alert:false,
        items:[
          "Adrenalina IV contínua: 0,1–1 mcg/kg/min em bomba — titular pela resposta hemodinâmica e broncoespasmo",
          "Push dose de Adrenalina: 1 mcg/kg IV bolus a cada 30s se deterioração — até dose de PCR se necessário",
          "Salbutamol IV: 250 mcg bolus lento → infusão 5–20 mcg/min (broncoespasmo refratário)",
          "Sulfato de Magnésio: 2 g IV em 20 min (broncodilatação adicional — asma grave)",
          "Hidrocortisona: 200 mg IV bolus (efeito em 4–6h — não imediato, mas essencial)",
          "Anti-histamínico: Difenidramina 50 mg IV ou Prometazina 25–50 mg IV (adjuvante — não substitui Adrenalina)",
          "Noradrenalina: adicionar se hipotensão refratária à Adrenalina (0,1–1 mcg/kg/min)",
          "Glucagon: 1–2 mg IV bolus se paciente em uso de betabloqueador (reverte broncoespasmo e hipotensão refratários)",
          "Metilprednisolona: 1–2 mg/kg IV como alternativa à Hidrocortisona",
        ],
        decision:null },
      { step:6, phase:"PREPARO DA ADRENALINA PUSH DOSE — Como Diluir", alert:false,
        items:[
          "Solução 100 mcg/mL (adultos): ampola 1:10.000 (1 mg/10 mL) → cada 1 mL = 100 mcg",
          "Alternativa: ampola 1:1.000 (1 mg/1 mL) + 9 mL de SF 0,9% → 10 mL com 100 mcg/mL",
          "Solução 10 mcg/mL (crianças): 1 mL da solução 100 mcg/mL + 9 mL SF → 10 mL com 10 mcg/mL",
          "Push dose adulto: 1 mcg/kg IV → para 70 kg = 0,7 mL da solução 100 mcg/mL",
          "Push dose criança 20 kg: 1 mcg/kg = 20 mcg → 2 mL da solução 10 mcg/mL",
          "ROTULAR A SERINGA CLARAMENTE antes de administrar — erros de concentração são fatais",
          "Dose de PCR (adulto): 1 mg IV = 10 mL da solução 100 mcg/mL",
        ],
        decision:null },
      { step:7, phase:"PARADA CARDÍACA HIPÓXICA — SE OCORREU", alert:true,
        items:[
          "Parada em anafilaxia/asma = CAUSA HIPÓXICA — a conduta difere da PCR convencional",
          "CONTINUAR ventilação de alta qualidade pelo tubo orotraqueal durante as compressões",
          "Adrenalina 1 mg IV/IO a cada 3–5 min (protocolo ACLS padrão para PCR)",
          "Tratar broncoespasmo agressivamente durante a ressuscitação — sem broncodilatação o coração não volta",
          "Descompressão bilateral de tórax: pneumotórax é causa comum de PCR refratária nesse contexto",
          "Se retorno da circulação: rever ventilação, manter Adrenalina IV em bomba, UTI imediata",
          "Prognóstico neurológico depende DIRETAMENTE do tempo até oxigenação efetiva — cada segundo importa",
        ],
        decision:null },
    ],
    drugs:[
      { name:"Adrenalina IM", cat:"Vasopressor / Broncodilatador", dose:"Adulto: 0,5 mg IM | Criança > 25 kg: 0,3 mg IM | Criança < 25 kg: 0,15 mg IM", via:"IM na face anterolateral da coxa (músculo vasto lateral)", ind:"Anafilaxia grave — 1ª linha absoluta. Repetir a cada 5 min se necessário.", ci:"Sem contraindicação absoluta em anafilaxia grave", obs:"A VIA IM NA COXA é superior ao deltóide (maior absorção). Nunca retardar por aguardar acesso venoso." },
      { name:"Adrenalina IV Push Dose", cat:"Vasopressor / Broncodilatador", dose:"1 mcg/kg IV bolus a cada 30s (solução 100 mcg/mL = 0,01 mL/kg por dose)", via:"IV bolus direto + flush 10 mL SF", ind:"Anafilaxia com rebaixamento de consciência, parada iminente ou refratária à IM", ci:"Sem contraindicação em emergência hipóxica", obs:"DILUIR corretamente: 1 amp 1:10.000 = 1 mg/10 mL = 100 mcg/mL. Rotular a seringa." },
      { name:"Adrenalina IV Contínua", cat:"Vasopressor / Broncodilatador", dose:"0,1–1 mcg/kg/min IV em bomba (iniciar 0,1 mcg/kg/min e titular)", via:"IV em bomba de infusão contínua", ind:"Anafilaxia grave pós-intubação ou refratária ao tratamento IM/bolus", ci:"Sem contraindicação em emergência hipóxica", obs:"Monitorização contínua de PA e ECG. Preparar noradrenalina se hipotensão persistir." },
      { name:"Cetamina", cat:"Anestésico dissociativo", dose:"1–2 mg/kg IV (indução para IOT) | 0,5 mg/kg IV (sedação)", via:"IV bolus lento em 1 min", ind:"Indução para IOT em anafilaxia/asma — broncodilatador, mantém drive respiratório e PA", ci:"Hipertensão grave não controlada (relativo)", obs:"Anestésico de ESCOLHA nesse cenário. Broncodilatador direto. Preserva hemodinâmica." },
      { name:"Succinilcolina", cat:"Bloqueador neuromuscular despolarizante", dose:"1,5 mg/kg IV (ISR)", via:"IV bolus rápido", ind:"Bloqueio neuromuscular para IOT em sequência rápida", ci:"Hipercalemia grave, queimaduras extensas > 24h, miopatias", obs:"Início em 45–60s, duração 8–10 min. Alternativa: Rocurônio 1,2 mg/kg IV." },
      { name:"Rocurônio", cat:"Bloqueador neuromuscular adespolarizante", dose:"1,2 mg/kg IV (ISR de alta dose)", via:"IV bolus rápido", ind:"ISR quando Succinilcolina contraindicada", ci:"Sem CI absolutas em emergência hipóxica", obs:"Onset 60–90s em dose alta. Reverter com Sugammadex 16 mg/kg se necessário." },
      { name:"Salbutamol (Albuterol)", cat:"Beta-2 agonista", dose:"Nebulização: 5 mg contínua | IV: 250 mcg bolus → 5–20 mcg/min infusão", via:"Nebulização contínua ou IV em bomba", ind:"Broncoespasmo em anafilaxia e asma grave — adjuvante à Adrenalina", ci:"Sem CI em broncoespasmo grave", obs:"Adjuvante — NÃO substitui Adrenalina. IV se sem resposta ao nebulizado pós-IOT." },
      { name:"Sulfato de Magnésio", cat:"Broncodilatador adjuvante", dose:"2 g IV em 20 min", via:"IV diluído em 100 mL SF", ind:"Asma grave / broncoespasmo refratário pós-IOT", ci:"BAV, IRC grave", obs:"Broncodilatação por bloqueio de cálcio no músculo liso brônquico." },
      { name:"Hidrocortisona", cat:"Corticoide", dose:"200 mg IV bolus (adulto) | 4 mg/kg IV (criança, máx 200 mg)", via:"IV bolus", ind:"Anafilaxia — previne reação bifásica (efeito em 4–6h)", ci:"Sem CI em emergência", obs:"NÃO é tratamento de emergência imediata — efeito tardio. Não substituir Adrenalina." },
      { name:"Glucagon", cat:"Antídoto hormonal", dose:"1–2 mg IV bolus → infusão 1–5 mg/h", via:"IV bolus lento + manutenção", ind:"Anafilaxia refratária em paciente em uso de betabloqueador", ci:"Feocromocitoma, insulinoma", obs:"Reverte o bloqueio do receptor beta pela Adrenalina. Usar precocemente se suspeita de betabloqueador." },
    ],
    antidotes:[
      { agent:"Anafilaxia por betabloqueador", antidote:"Glucagon", dose:"1–2 mg IV bolus → 1–5 mg/h infusão", notes:"Reverte bloqueio beta — essencial quando Adrenalina não responde adequadamente." },
      { agent:"Bloqueio neuromuscular por Rocurônio", antidote:"Sugammadex", dose:"16 mg/kg IV (reversão emergencial) | 4 mg/kg (reversão de rotina)", notes:"Reversão imediata do Rocurônio — disponibilizar sempre que usar Rocurônio para IOT." },
      { agent:"Depressão respiratória pós-sedação", antidote:"Flumazenil (BZD) / Naloxona (opioide)", dose:"Flumazenil 0,2 mg IV fracionado | Naloxona 0,4–2 mg IV", notes:"Usar apenas se sedação causou rebaixamento — NÃO usar em epilépticos (Flumazenil)." },
    ],
    scores:[],
  },
];

// ─── DRUG DOSE FORMULAS ────────────────────────────────────────────────────────
const FORMULAS = {
  "Diltiazem|taquiarritmias": w => ({ result:`${(w*0.25).toFixed(1)} mg IV bolus`, details:[`2ª dose: ${(w*0.35).toFixed(1)} mg (0,35 mg/kg)`, "Infundir em 2 min. Manutenção: 5–15 mg/h"] }),
  "Dopamina|bradiarritmias": w => ({ result:`${(w*2).toFixed(0)}–${(w*10).toFixed(0)} mcg/min`, details:[`Início: ${(w*2).toFixed(0)} mcg/min (2 mcg/kg/min)`, `Máx: ${(w*10).toFixed(0)} mcg/min (10 mcg/kg/min)`] }),
  "Tenecteplase (TNKase)|iamcssst": w => { const d=w<=60?30:w<=70?35:w<=80?40:w<=90?45:50; return { result:`${d} mg IV bolus único`, details:[`Peso ${w} kg → faixa: ${d} mg`, "≤60:30mg | 60–70:35mg | 70–80:40mg | 80–90:45mg | >90:50mg", "Administrar em 5–10 segundos"] }; },
  "Heparina Não Fracionada (HNF)|iamcssst": w => { const b=Math.min(Math.round(w*65),5000),i=Math.min(Math.round(w*12),1000); return { result:`Bolus ${b} UI IV + Infusão ${i} UI/h`, details:[`Bolus: ${w}×65= ${b} UI (máx 5.000)`, `Infusão: ${w}×12= ${i} UI/h (máx 1.000)`, "TTPA alvo 50–70s — dosar a cada 6h"] }; },
  "Noradrenalina|sepse": w => ({ result:`${(w*0.01).toFixed(2)}–${(w*0.5).toFixed(2)} mcg/min`, details:[`Início: ${(w*0.01).toFixed(2)} mcg/min (0,01 mcg/kg/min)`, `Habitual: até ${(w*0.25).toFixed(2)} mcg/min`, "Alvo PAM ≥ 65 mmHg"] }),
  "Dobutamina|sepse": w => ({ result:`${(w*2).toFixed(0)}–${(w*20).toFixed(0)} mcg/min`, details:[`Início: ${(w*5).toFixed(0)} mcg/min (5 mcg/kg/min)`, `Máx: ${(w*20).toFixed(0)} mcg/min (20 mcg/kg/min)`] }),
  "Insulina Regular|cad": w => ({ result:`${(w*0.1).toFixed(1)} UI/h IV contínuo`, details:[`${w} kg × 0,1 UI/kg/h = ${(w*0.1).toFixed(1)} UI/h`, `Quando gli ≤ 250: reduzir para ${(w*0.05).toFixed(1)} UI/h`] }),
  "Insulina Regular IV|hhns": w => ({ result:`${(w*0.05).toFixed(1)}–${(w*0.1).toFixed(1)} UI/h IV`, details:[`Início conservador: ${(w*0.05).toFixed(1)} UI/h (0,05 UI/kg/h)`, `Máx inicial: ${(w*0.1).toFixed(1)} UI/h`] }),
  "Alteplase (rt-PA)|avc": w => { const t=Math.min(w*0.9,90); return { result:`${t.toFixed(1)} mg IV total`, details:[`${w} kg × 0,9 mg/kg = ${t.toFixed(1)} mg (máx 90 mg)`, `Bolus: ${(t*0.1).toFixed(1)} mg em 1 min`, `Infusão: ${(t*0.9).toFixed(1)} mg em 60 min`] }; },
  "Tenecteplase|avc": w => { const d=Math.min(+(w*0.25).toFixed(1),25); return { result:`${d} mg IV bolus único`, details:[`${w} kg × 0,25 mg/kg = ${d} mg (máx 25 mg)`, "Administrar em 5–10 segundos"] }; },
  "Midazolam IM|convulsoes": w => ({ result:`${w>40?10:5} mg IM`, details:[w>40?"Peso > 40 kg: 10 mg IM":"Peso 13–40 kg: 5 mg IM", "Músculo vasto lateral"] }),
  "Valproato de Sódio|convulsoes": w => { const d=Math.min(w*40,3000); return { result:`${d.toFixed(0)} mg IV em 10 min`, details:[`${w} kg × 40 mg/kg = ${d.toFixed(0)} mg (máx 3.000 mg)`, `Velocidade: ${(d/10).toFixed(0)} mg/min`] }; },
  "Levetiracetam|convulsoes": w => { const d=Math.min(w*60,4500); return { result:`${d.toFixed(0)} mg IV em 10 min`, details:[`${w} kg × 60 mg/kg = ${d.toFixed(0)} mg (máx 4.500 mg)`] }; },
  "Adrenalina IM|amax4": w => { const d=w>=25?0.5:w>=10?0.3:0.15; return { result:`${d} mg IM (${w} kg)`, details:[w>=25?`Adulto / criança > 25 kg: 0,5 mg IM`:w>=10?`Criança 10–25 kg: 0,3 mg IM`:`Criança < 10 kg: 0,15 mg IM`, "Face anterolateral da coxa — músculo vasto lateral", "Repetir a cada 5 min se sem resposta"] }; },
  "Adrenalina IV Push Dose|amax4": w => ({ result:`${(w*0.001).toFixed(3)} mg = ${(w*0.01).toFixed(1)} mL (sol. 100mcg/mL)`, details:[`1 mcg/kg × ${w} kg = ${w} mcg por bolus`, `Solução 100 mcg/mL: ${(w*0.01).toFixed(1)} mL por dose`, "Repetir a cada 30s se deterioração", `Dose de PCR: 1 mg = 10 mL da solução 100 mcg/mL`] }),
  "Adrenalina IV Contínua|amax4": w => ({ result:`${(w*0.1).toFixed(1)}–${(w*1).toFixed(0)} mcg/min IV`, details:[`Início: ${(w*0.1).toFixed(1)} mcg/min (0,1 mcg/kg/min)`, `Máximo habitual: ${(w*0.5).toFixed(1)} mcg/min (0,5 mcg/kg/min)`] }),
  "Cetamina|amax4": w => ({ result:`${(w*1.5).toFixed(0)}–${(w*2).toFixed(0)} mg IV (indução IOT)`, details:[`Indução ISR: ${w} kg × 1,5–2 mg/kg = ${(w*1.5).toFixed(0)}–${(w*2).toFixed(0)} mg IV`, `Sedação leve: ${(w*0.5).toFixed(0)} mg IV (0,5 mg/kg)`] }),
  "Succinilcolina|amax4": w => ({ result:`${(w*1.5).toFixed(0)} mg IV (ISR)`, details:[`${w} kg × 1,5 mg/kg = ${(w*1.5).toFixed(0)} mg IV bolus rápido`, "Onset: 45–60s | Duração: 8–10 min"] }),
  "Rocurônio|amax4": w => ({ result:`${(w*1.2).toFixed(0)} mg IV (ISR alta dose)`, details:[`${w} kg × 1,2 mg/kg = ${(w*1.2).toFixed(0)} mg IV bolus rápido`, "Onset: 60–90s | Reverter com Sugammadex 16 mg/kg"] }),
  "Hidrocortisona|amax4": w => ({ result:`200 mg IV bolus (adulto)`, details:["Dose fixa no adulto: 200 mg IV", `Criança: ${Math.min(w*4,200).toFixed(0)} mg IV (4 mg/kg, máx 200 mg)`, "Efeito em 4–6h — não é tratamento imediato"] }),
};

// ─── SCORES ────────────────────────────────────────────────────────────────────
const SCORES_DEF = {

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
};

const CATS = ["Todos","Cardiovascular","Emergência","Toxicologia","Infectologia / UTI","Endocrinologia","Neurologia"];

// ─── SCORE WIDGET ──────────────────────────────────────────────────────────────
function ScoreWidget({ scoreKey, color, light, border }) {
  const sc = SCORES_DEF[scoreKey];
  const [checks, setChecks] = useState({});
  const [nums, setNums]     = useState({});
  const [selects, setSelects] = useState({});
  const [bools, setBools]   = useState({});
  const [nihssVals, setNihssVals] = useState({});
  if (!sc) return null;

  const sans = "sans-serif";
  const BD = "#E2E8F0";

  // ── Calcular total por tipo ──
  let total = 0;
  if (sc.type === "check") {
    total = (sc.fields||[]).reduce((a,f) => a + (checks[f.k] ? f.pts : 0), 0);
  } else if (sc.type === "calc") {
    total = sc.formula(nums);
  } else if (sc.type === "grace_calc") {
    total = sc.calcPoints({...nums, ...selects, ...bools});
  } else if (sc.type === "nihss_scale") {
    total = (sc.items||[]).reduce((a,it) => a + (parseInt(nihssVals[it.k])||0), 0);
  }

  const interp = sc.interp(total);

  return (
    <div style={{ background:"#fff", border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden", marginBottom:16, boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
      {/* Header */}
      <div style={{ background:light, borderBottom:`1px solid ${border}33`, padding:"12px 16px" }}>
        <div style={{ fontFamily:"Georgia,serif", fontSize:15, fontWeight:700, color:"#1A202C" }}>{sc.label}</div>
        <div style={{ fontSize:11, color:"#718096", fontFamily:sans, marginTop:2 }}>{sc.sub}</div>
        {sc.ref && <div style={{ fontSize:10, color:"#A0AEC0", fontFamily:sans, marginTop:4, fontStyle:"italic" }}>Ref: {sc.ref}</div>}
      </div>

      <div style={{ padding:"14px 16px" }}>
        {/* Nota clínica */}
        {sc.note && (
          <div style={{ background:"#EBF8FF", border:"1px solid #BEE3F8", borderRadius:6, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#2C5282", fontFamily:sans, lineHeight:1.5 }}>
            ℹ️ {sc.note}
          </div>
        )}

        {/* ── TIPO: check (qSOFA, CHA₂DS₂-VASc) ── */}
        {sc.type === "check" && (sc.fields||[]).map(f => (
          <div key={f.k}>
            <label style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"8px 0", borderBottom:`1px solid #F0F4F8`, cursor:"pointer" }}>
              <input type="checkbox" checked={!!checks[f.k]} onChange={() => setChecks(p=>({...p,[f.k]:!p[f.k]}))}
                style={{ width:16, height:16, accentColor:color, cursor:"pointer", flexShrink:0, marginTop:2 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:"#2D3748", fontFamily:sans, fontWeight:600 }}>{f.label}</div>
                {f.detail && <div style={{ fontSize:11, color:"#718096", fontFamily:sans, marginTop:2, lineHeight:1.4 }}>{f.detail}</div>}
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:"#718096", fontFamily:sans, background:"#EDF2F7", padding:"2px 8px", borderRadius:12, flexShrink:0 }}>+{f.pts}</span>
            </label>
          </div>
        ))}

        {/* ── TIPO: calc (Osmolaridade) ── */}
        {sc.type === "calc" && (sc.inputs||[]).map(inp => (
          <div key={inp.k} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:"#718096", fontFamily:sans, fontWeight:700, display:"block", marginBottom:4 }}>{inp.label}</label>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="number" placeholder={inp.ph} value={nums[inp.k]||""}
                onChange={e => setNums(p=>({...p,[inp.k]:e.target.value}))}
                style={{ width:140, border:`1px solid ${BD}`, borderRadius:6, padding:"8px 10px", fontSize:14, fontFamily:sans, outline:"none" }} />
              <span style={{ fontSize:12, color:"#718096", fontFamily:sans }}>{inp.unit}</span>
            </div>
          </div>
        ))}

        {/* ── TIPO: grace_calc (GRACE 2.0) ── */}
        {sc.type === "grace_calc" && (sc.fields||[]).map(f => (
          <div key={f.k} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:"#718096", fontFamily:sans, fontWeight:700, display:"block", marginBottom:4 }}>{f.label}</label>
            {f.type === "number" && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="number" placeholder={f.ph} value={nums[f.k]||""}
                  onChange={e => setNums(p=>({...p,[f.k]:e.target.value}))}
                  style={{ width:130, border:`1px solid ${BD}`, borderRadius:6, padding:"7px 10px", fontSize:14, fontFamily:sans, outline:"none" }} />
                <span style={{ fontSize:12, color:"#718096", fontFamily:sans }}>{f.unit}</span>
              </div>
            )}
            {f.type === "select" && (
              <select value={selects[f.k]||"1"}
                onChange={e => setSelects(p=>({...p,[f.k]:e.target.value}))}
                style={{ width:"100%", border:`1px solid ${BD}`, borderRadius:6, padding:"7px 10px", fontSize:13, fontFamily:sans, outline:"none", background:"#fff" }}>
                {f.options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            )}
            {f.type === "bool" && (
              <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                <input type="checkbox" checked={bools[f.k]===true}
                  onChange={() => setBools(p=>({...p,[f.k]:!p[f.k]}))}
                  style={{ width:16, height:16, accentColor:color, cursor:"pointer", flexShrink:0 }} />
                <span style={{ fontSize:13, color:"#2D3748", fontFamily:sans }}>Presente</span>
                <span style={{ fontSize:11, fontWeight:700, color:"#718096", fontFamily:sans, background:"#EDF2F7", padding:"1px 8px", borderRadius:12, marginLeft:"auto" }}>+{f.pts} pts</span>
              </label>
            )}
          </div>
        ))}

        {/* ── TIPO: nihss_scale (NIHSS completo) ── */}
        {sc.type === "nihss_scale" && (sc.items||[]).map(it => (
          <div key={it.k} style={{ marginBottom:12, borderBottom:`1px solid #F0F4F8`, paddingBottom:12 }}>
            <div style={{ fontSize:13, color:"#1A202C", fontFamily:sans, fontWeight:700, marginBottom:2 }}>{it.label}</div>
            {it.detail && <div style={{ fontSize:11, color:"#718096", fontFamily:sans, marginBottom:6, lineHeight:1.4 }}>{it.detail}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {it.options.map(o => (
                <label key={o.v} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"4px 8px", borderRadius:6,
                  background: parseInt(nihssVals[it.k])===o.v ? light : "transparent",
                  border: parseInt(nihssVals[it.k])===o.v ? `1px solid ${border}55` : "1px solid transparent" }}>
                  <input type="radio" name={`nihss_${it.k}`} value={o.v}
                    checked={parseInt(nihssVals[it.k])===o.v}
                    onChange={() => setNihssVals(p=>({...p,[it.k]:o.v}))}
                    style={{ accentColor:color, cursor:"pointer", flexShrink:0 }} />
                  <span style={{ fontSize:12, color:"#2D3748", fontFamily:sans, flex:1 }}>{o.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color: parseInt(nihssVals[it.k])===o.v ? color : "#A0AEC0", fontFamily:sans, background:"#EDF2F7", padding:"1px 7px", borderRadius:12 }}>{o.v}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {/* ── RESULTADO ── */}
        <div style={{ marginTop:14, padding:"12px 14px", background:interp.bg, borderRadius:8, border:`1px solid ${interp.color}44` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:700, color:interp.color, fontFamily:sans, flex:1, marginRight:8 }}>{interp.label}</span>
            <span style={{ fontSize:24, fontWeight:900, color:interp.color, fontFamily:sans, flexShrink:0 }}>
              {sc.type==="calc" ? total.toFixed(1) : total} {sc.unit||"pts"}
            </span>
          </div>
          <div style={{ fontSize:12, color:interp.color, fontFamily:sans, lineHeight:1.6 }}>{interp.text}</div>
        </div>
      </div>
    </div>
  );
}

// ─── DOSE CALCULATOR ──────────────────────────────────────────────────────────
function DoseCalc({ drugName, protocolId, color, light, border }) {
  const [w, setW] = useState("");
  const key = `${drugName}|${protocolId}`;
  const fn = FORMULAS[key];
  const calc = fn && w && parseFloat(w) > 0 ? fn(parseFloat(w)) : null;
  return (
    <div style={{ marginTop:12, background:light, border:`1px solid ${border}55`, borderRadius:8, padding:"10px 14px" }}>
      <div style={{ fontSize:11, color:color, fontFamily:"sans-serif", fontWeight:700, marginBottom:8 }}>⚖️ Calculadora de Dose por Peso</div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <input type="number" placeholder="Peso (kg)" min={1} max={300} value={w} onChange={e=>setW(e.target.value)}
          style={{ width:110, border:"1px solid #CBD5E0", borderRadius:6, padding:"6px 10px", fontSize:13, fontFamily:"sans-serif", outline:"none", background:"#fff" }} />
        <span style={{ fontSize:12, color:"#718096", fontFamily:"sans-serif" }}>kg</span>
        {!fn && w && <span style={{ fontSize:12, color:"#A0AEC0", fontFamily:"sans-serif", fontStyle:"italic" }}>Dose fixa — ver campo Dose acima</span>}
      </div>
      {calc && (
        <div style={{ marginTop:10, background:"#fff", border:`1px solid ${border}44`, borderRadius:6, padding:"10px 12px" }}>
          <div style={{ fontSize:15, fontWeight:700, color:color, fontFamily:"sans-serif", marginBottom:6 }}>{calc.result}</div>
          {calc.details.map((d,i) => (
            <div key={i} style={{ fontSize:12, color:"#4A5568", fontFamily:"sans-serif", lineHeight:1.5, display:"flex", gap:6 }}>
              <span style={{ color:border, flexShrink:0 }}>·</span>{d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [proto, setProto] = useState(null);
  const [tab, setTab] = useState("cascade");
  const [open, setOpen] = useState(null);
  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");
  const [checks, setChecks] = useState({});
  const [clMode, setClMode] = useState(false);

  const cur = P.find(p => p.id === proto);

  const filtered = P.filter(p => {
    if (cat !== "Todos" && p.cat !== cat) return false;
    if (!q.trim()) return true;
    const ql = q.toLowerCase();
    return p.label.toLowerCase().includes(ql)
      || p.sub.toLowerCase().includes(ql)
      || p.drugs.some(d => d.name.toLowerCase().includes(ql) || d.ind.toLowerCase().includes(ql) || d.cat.toLowerCase().includes(ql))
      || p.antidotes.some(a => a.agent.toLowerCase().includes(ql) || a.antidote.toLowerCase().includes(ql))
      || p.cascade.some(s => s.phase.toLowerCase().includes(ql) || s.items.some(it => it.toLowerCase().includes(ql)));
  });

  const openProto = id => { setProto(id); setTab("cascade"); setOpen(null); setChecks({}); setClMode(false); };
  const toggleCheck = i => setChecks(p => ({...p,[i]:!p[i]}));
  const done = cur ? cur.cascade.filter((_,i)=>checks[i]).length : 0;

  const F = "#F7F9FC", W = "#FFFFFF", BD = "#E2E8F0", T = "#2D3748", S = "#718096";
  const serif = "'Georgia','Times New Roman',serif";
  const sans = "sans-serif";

  const Label = ({txt}) => (
    <div style={{ fontSize:10, color:S, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{txt}</div>
  );

  return (
    <div style={{ minHeight:"100vh", background:F, fontFamily:serif, color:"#1A202C", overflowX:"hidden" }}>

      {/* HEADER */}
      <div style={{ background:W, borderBottom:`1px solid ${BD}`, position:"sticky", top:0, zIndex:200, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 16px" }}>
          <div className="hdr-inner" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {proto && (
                <button onClick={()=>setProto(null)} style={{ background:"none", border:"none", cursor:"pointer", color:S, fontSize:13, fontFamily:sans, padding:"4px 8px", borderRadius:6 }}>
                  ← Voltar
                </button>
              )}
              <div>
                <div style={{ fontFamily:serif, fontSize:17, fontWeight:700, color:"#1A202C" }}>Protocolos de Emergência</div>
                <div style={{ fontSize:11, color:S, fontFamily:sans }}>ACLS 2025 · Sala de Emergência · CFM/CRM</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#48BB78" }} />
              <span style={{ fontSize:11, color:S, fontFamily:sans }}>Atualizado 2025</span>
            </div>
          </div>
        </div>
      </div>

      <div className="page-pad" style={{ maxWidth:1100, margin:"0 auto" }}>

        {/* ── INDEX ── */}
        {!proto && (
          <>
            <div style={{ paddingTop:24, paddingBottom:16 }}>
              <input value={q} onChange={e=>setQ(e.target.value)}
                placeholder="🔍 Pesquisar protocolo, medicamento, sigla ou condição..."
                style={{ width:"100%", boxSizing:"border-box", background:W, border:`1px solid #CBD5E0`, borderRadius:8, padding:"10px 16px", fontSize:14, fontFamily:sans, color:T, outline:"none", boxShadow:"0 1px 3px rgba(0,0,0,.04)", marginBottom:12 }} />
              <div className="cat-row">
                {CATS.map(c => (
                  <button key={c} onClick={()=>setCat(c)} style={{
                    padding:"5px 13px", borderRadius:20, border:"1px solid",
                    borderColor: cat===c ? "#2B6CB0" : "#CBD5E0",
                    background: cat===c ? "#EBF8FF" : W,
                    color: cat===c ? "#2B6CB0" : "#4A5568",
                    fontSize:12, fontFamily:sans, fontWeight: cat===c ? 700 : 400, cursor:"pointer",
                  }}>{c}</button>
                ))}
              </div>
              {q.trim() && (
                <div style={{ marginTop:8, fontSize:12, color:S, fontFamily:sans }}>
                  {filtered.length===0 ? `Sem resultados para "${q}"` : `${filtered.length} protocolo(s) encontrado(s) para "${q}"`}
                </div>
              )}
            </div>

            <div className="proto-grid">
              {filtered.map(p => (
                <button key={p.id} onClick={()=>openProto(p.id)} className="proto-card"
                  style={{ background:W, border:`1px solid ${BD}`, borderLeft:`4px solid ${p.border}`, borderRadius:10, cursor:"pointer", textAlign:"left", fontFamily:serif, boxShadow:"0 1px 4px rgba(0,0,0,.04)", width:"100%", transition:"all .18s" }}
                  onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-2px)"}}
                  onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)";e.currentTarget.style.transform="translateY(0)"}}>
                  <div className="proto-card-inner" style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <div style={{ fontSize:28, lineHeight:1 }}>{p.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                        <div style={{ fontFamily:serif, fontSize:15, fontWeight:700, color:"#1A202C", lineHeight:1.3 }}>{p.label}</div>
                        <span style={{ fontSize:10, background:p.light, color:p.color, border:`1px solid ${p.border}44`, padding:"2px 8px", borderRadius:20, fontFamily:sans, fontWeight:600, whiteSpace:"nowrap", marginLeft:8, flexShrink:0 }}>{p.cat}</span>
                      </div>
                      <div style={{ fontSize:12, color:S, fontFamily:sans, lineHeight:1.5, marginBottom:10 }}>{p.sub}</div>
                      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                        <span style={{ fontSize:11, color:"#4A5568", fontFamily:sans }}>📋 {p.cascade.length} etapas</span>
                        <span style={{ fontSize:11, color:"#4A5568", fontFamily:sans }}>💊 {p.drugs.length} fármacos</span>
                        {p.antidotes.length>0 && <span style={{ fontSize:11, color:"#4A5568", fontFamily:sans }}>🧪 {p.antidotes.length} antídotos</span>}
                        {p.scores.length>0 && <span style={{ fontSize:11, color:"#4A5568", fontFamily:sans }}>📊 {p.scores.length} escore(s)</span>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ background:"#FFFBEB", border:"1px solid #F6E05E", borderRadius:8, padding:"12px 16px", marginBottom:32, fontFamily:sans, fontSize:12, color:"#744210", lineHeight:1.6 }}>
              <strong>⚕️ Nota de uso clínico:</strong> Sistema baseado nas diretrizes <strong>AHA/ACLS 2020–2025</strong>, Surviving Sepsis Campaign 2021 e SBC. As decisões terapêuticas são de responsabilidade exclusiva do médico assistente.
            </div>
          </>
        )}

        {/* ── PROTOCOL DETAIL ── */}
        {proto && cur && (
          <div style={{ paddingTop:20, paddingBottom:60 }}>

            {/* Protocol header */}
            <div className="proto-hdr" style={{ background:W, border:`1px solid ${BD}`, borderLeft:`5px solid ${cur.border}`, borderRadius:10, marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ fontSize:38 }}>{cur.icon}</div>
                <div>
                  <div style={{ fontSize:10, color:cur.color, fontFamily:sans, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:2 }}>{cur.cat}</div>
                  <div style={{ fontFamily:serif, fontSize:21, fontWeight:700, color:"#1A202C", marginBottom:3 }}>{cur.label}</div>
                  <div style={{ fontSize:13, color:S, fontFamily:sans }}>{cur.sub}</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs-row">
              {[
                { k:"cascade", lbl:`📋 Cascata (${cur.cascade.length})` },
                { k:"drugs", lbl:`💊 Medicamentos (${cur.drugs.length})` },
                ...(cur.antidotes.length>0 ? [{ k:"antidotes", lbl:`🧪 Antídotos (${cur.antidotes.length})` }] : []),
                ...(cur.scores.length>0 ? [{ k:"scores", lbl:`📊 Escores (${cur.scores.length})` }] : []),
              ].map(t => (
                <button key={t.k} onClick={()=>setTab(t.k)} className="tab-btn" style={{
                  background: tab===t.k ? cur.light : "transparent",
                  color: tab===t.k ? cur.color : S,
                  fontWeight: tab===t.k ? 700 : 400,
                  borderLeft: tab===t.k ? `2px solid ${cur.border}` : "2px solid transparent",
                }}>{t.lbl}</button>
              ))}
            </div>

            {/* ── CASCADE TAB ── */}
            {tab === "cascade" && (
              <div>
                {/* Checklist bar */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, padding:"10px 14px", background:W, border:`1px solid ${BD}`, borderRadius:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                    <span style={{ fontSize:13, fontFamily:sans, color:"#4A5568" }}>
                      {clMode ? `✅ Checklist — ${done}/${cur.cascade.length} etapas` : "Modo leitura"}
                    </span>
                    {clMode && done>0 && (
                      <div style={{ background:"#E2E8F0", borderRadius:20, height:6, width:70, overflow:"hidden", flexShrink:0 }}>
                        <div style={{ height:6, background:cur.border, width:`${(done/cur.cascade.length)*100}%`, transition:"width .3s" }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                    {clMode && done>0 && (
                      <button onClick={()=>setChecks({})} style={{ padding:"4px 10px", border:`1px solid ${BD}`, borderRadius:6, background:W, color:S, fontSize:11, fontFamily:sans, cursor:"pointer" }}>Limpar</button>
                    )}
                    <button onClick={()=>{setClMode(m=>!m);setChecks({});}} style={{
                      padding:"5px 12px", border:`1px solid ${clMode?cur.border:"#CBD5E0"}`,
                      borderRadius:6, background:clMode?cur.light:W, color:clMode?cur.color:"#4A5568",
                      fontSize:12, fontFamily:sans, fontWeight:600, cursor:"pointer",
                    }}>{clMode?"✓ Checklist ON":"☐ Ativar Checklist"}</button>
                  </div>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {cur.cascade.map((step, idx) => {
                    const isOpen = open===idx;
                    const isDone = !!checks[idx];
                    return (
                      <div key={idx} style={{ background:W, border:`1px solid ${isDone&&clMode?cur.border:BD}`, borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)", opacity:isDone&&clMode?.75:1, transition:"all .2s" }}>
                        <button onClick={()=>setOpen(isOpen?null:idx)} className="step-hdr" style={{
                          width:"100%", border:"none", cursor:"pointer", textAlign:"left",
                          display:"flex", alignItems:"center", gap:12, fontFamily:serif,
                          background: isOpen?(step.alert?"#FFF5F5":"#F7FAFC"):(isDone&&clMode?cur.light:W),
                          borderBottom: isOpen?`1px solid ${BD}`:"none", transition:"background .15s",
                        }}>
                          {clMode && (
                            <div onClick={e=>{e.stopPropagation();toggleCheck(idx);}} style={{
                              width:22, height:22, borderRadius:6, flexShrink:0,
                              border:`2px solid ${isDone?cur.border:"#CBD5E0"}`,
                              background: isDone?cur.light:W,
                              display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                            }}>
                              {isDone && <span style={{ color:cur.color, fontSize:13, fontWeight:900 }}>✓</span>}
                            </div>
                          )}
                          <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, fontFamily:sans,
                            background:step.alert?"#FED7D7":cur.light, border:`2px solid ${step.alert?"#FC8181":cur.border}`,
                            color:step.alert?"#C53030":cur.color }}>
                            {step.step}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              {step.alert && <span style={{ fontSize:10, background:"#FED7D7", color:"#C53030", border:"1px solid #FC8181", padding:"1px 8px", borderRadius:20, fontFamily:sans, fontWeight:700 }}>ATENÇÃO</span>}
                              {isDone&&clMode && <span style={{ fontSize:10, background:cur.light, color:cur.color, border:`1px solid ${cur.border}55`, padding:"1px 8px", borderRadius:20, fontFamily:sans, fontWeight:700 }}>CONCLUÍDO</span>}
                              <span style={{ fontSize:10, color:step.alert?"#9B2C2C":"#2C3E50", fontFamily:sans, fontWeight:700, letterSpacing:"0.05em", lineHeight:1.4 }}>{step.phase}</span>
                            </div>
                          </div>
                          <span style={{ color:"#A0AEC0", fontSize:12, transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s", flexShrink:0 }}>▼</span>
                        </button>

                        {isOpen && (
                          <div className="step-body">
                            {step.items.length>0 && (
                              <div style={{ marginBottom:step.decision?16:0 }}>
                                {step.items.map((it,i) => (
                                  <div key={i} style={{ display:"flex", gap:12, paddingTop:9, paddingBottom:9, borderBottom:i<step.items.length-1?`1px solid #F0F4F8`:"none" }}>
                                    <div style={{ width:6, height:6, borderRadius:"50%", background:cur.border, marginTop:7, flexShrink:0 }} />
                                    <span style={{ fontSize:14, lineHeight:1.65, color:T, fontFamily:sans }}>{it}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {step.decision && (
                              <div style={{ background:"#F7FAFC", border:`1px solid ${BD}`, borderRadius:8, padding:"14px 16px", marginTop:step.items.length>0?12:0 }}>
                                <div style={{ fontSize:13, fontWeight:700, color:T, fontFamily:sans, marginBottom:8 }}>🔀 Ponto de Decisão</div>
                                <div style={{ fontSize:13, color:"#4A5568", fontFamily:sans, marginBottom:10, fontStyle:"italic" }}>{step.decision.q}</div>
                                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                                    <span style={{ fontSize:11, background:"#C6F6D5", color:"#276749", border:"1px solid #9AE6B4", padding:"2px 10px", borderRadius:20, fontFamily:sans, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>SIM</span>
                                    <span style={{ fontSize:13, color:T, fontFamily:sans }}>{step.decision.yes}</span>
                                  </div>
                                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                                    <span style={{ fontSize:11, background:"#FED7D7", color:"#9B2C2C", border:"1px solid #FC8181", padding:"2px 10px", borderRadius:20, fontFamily:sans, fontWeight:700, whiteSpace:"nowrap", flexShrink:0 }}>NÃO</span>
                                    <span style={{ fontSize:13, color:T, fontFamily:sans }}>{step.decision.no}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DRUGS TAB ── */}
            {tab==="drugs" && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {cur.drugs.map((d,i) => (
                  <div key={i} style={{ background:W, border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
                    <div style={{ background:cur.light, borderBottom:`1px solid ${cur.border}33`, padding:"12px 18px" }}>
                      <div style={{ fontFamily:serif, fontSize:16, fontWeight:700, color:"#1A202C" }}>{d.name}</div>
                      <div style={{ fontSize:11, color:cur.color, fontFamily:sans, fontWeight:600 }}>{d.cat}</div>
                    </div>
                    <div className="drug-body">
                      <div className="drug-grid">
                        <div><Label txt="Dose" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.dose}</div></div>
                        <div><Label txt="Via de Administração" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.via}</div></div>
                      </div>
                      <div style={{ marginBottom:10 }}><Label txt="Indicação" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.ind}</div></div>
                      <div style={{ marginBottom:d.obs?10:0 }}><Label txt="Contraindicações" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{d.ci}</div></div>
                      {d.obs && (
                        <div style={{ background:"#FFFBEB", border:"1px solid #F6E05E", borderRadius:6, padding:"10px 12px", marginBottom:10 }}>
                          <div style={{ fontSize:11, color:"#744210", fontFamily:sans, fontWeight:700, marginBottom:3 }}>⚠️ Observação Clínica</div>
                          <div style={{ fontSize:13, color:"#744210", fontFamily:sans, lineHeight:1.5 }}>{d.obs}</div>
                        </div>
                      )}
                      <DoseCalc drugName={d.name} protocolId={cur.id} color={cur.color} light={cur.light} border={cur.border} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── ANTIDOTES TAB ── */}
            {tab==="antidotes" && cur.antidotes.length>0 && (
              <div>
                {/* Desktop table */}
                <div className="ant-table-wrap" style={{ background:W, border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:cur.light, borderBottom:`2px solid ${cur.border}44` }}>
                        {["Agente / Tóxico","Antídoto","Dose / Regime","Observações Clínicas"].map(h => (
                          <th key={h} style={{ padding:"11px 14px", textAlign:"left", fontSize:11, color:cur.color, fontFamily:sans, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cur.antidotes.map((r,i) => (
                        <tr key={i} style={{ borderBottom:i<cur.antidotes.length-1?`1px solid #F0F4F8`:"none", background:i%2===0?W:"#FAFBFC" }}>
                          <td style={{ padding:"11px 14px", fontSize:13, fontFamily:sans, fontWeight:600, color:T, verticalAlign:"top" }}>{r.agent}</td>
                          <td style={{ padding:"11px 14px", verticalAlign:"top" }}>
                            <span style={{ fontSize:13, fontFamily:sans, fontWeight:700, color:cur.color, background:cur.light, padding:"2px 10px", borderRadius:20, display:"inline-block" }}>{r.antidote}</span>
                          </td>
                          <td style={{ padding:"11px 14px", fontSize:13, fontFamily:sans, color:T, lineHeight:1.5, verticalAlign:"top" }}>{r.dose}</td>
                          <td style={{ padding:"11px 14px", fontSize:12, fontFamily:sans, color:S, lineHeight:1.6, verticalAlign:"top" }}>{r.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="ant-cards-wrap" style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {cur.antidotes.map((r,i) => (
                    <div key={i} style={{ background:W, border:`1px solid ${BD}`, borderRadius:10, overflow:"hidden" }}>
                      <div style={{ background:cur.light, borderBottom:`1px solid ${cur.border}33`, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:14, fontWeight:700, color:"#1A202C", fontFamily:sans }}>{r.agent}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:cur.color, background:W, border:`1px solid ${cur.border}55`, padding:"2px 10px", borderRadius:20, fontFamily:sans }}>{r.antidote}</span>
                      </div>
                      <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
                        <div><Label txt="Dose / Regime" /><div style={{ fontSize:13, color:T, fontFamily:sans, lineHeight:1.5 }}>{r.dose}</div></div>
                        <div><Label txt="Observações" /><div style={{ fontSize:13, color:S, fontFamily:sans, lineHeight:1.5 }}>{r.notes}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SCORES TAB ── */}
            {tab==="scores" && cur.scores.length>0 && (
              <div>
                <div style={{ background:"#EBF8FF", border:"1px solid #BEE3F8", borderRadius:8, padding:"10px 14px", marginBottom:16, fontFamily:sans, fontSize:12, color:"#2C5282" }}>
                  ℹ️ Escores clínicos validados para este protocolo. Marque os critérios presentes e veja a interpretação clínica automática.
                </div>
                {cur.scores.map(sk => (
                  <ScoreWidget key={sk} scoreKey={sk} color={cur.color} light={cur.light} border={cur.border} />
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        button:focus { outline: 2px solid #4299E1; outline-offset: 2px; }

        .hdr-inner { padding-top:14px; padding-bottom:14px; }
        .page-pad { padding: 0 20px; }
        .proto-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:14px; padding-bottom:32px; }
        .proto-card-inner { padding: 18px 20px; }
        .proto-hdr { padding: 20px 24px; }
        .cat-row { display:flex; gap:8px; flex-wrap:wrap; }
        .tabs-row { display:flex; background:#fff; border:1px solid #E2E8F0; border-radius:8px; padding:4px; max-width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom:20px; }
        .tab-btn { padding:8px 16px; border-radius:6px; border:none; font-size:13px; font-family:sans-serif; cursor:pointer; transition:all .15s; white-space:nowrap; flex-shrink:0; }
        .step-hdr { padding: 14px 18px; }
        .step-body { padding: 16px 18px 18px; }
        .drug-body { padding: 14px 18px; }
        .drug-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
        .ant-table-wrap { display:block; }
        .ant-cards-wrap { display:none; }

        @media (max-width: 640px) {
          .hdr-inner { padding-top:12px; padding-bottom:12px; }
          .page-pad { padding: 0 12px; }
          .proto-grid { grid-template-columns:1fr; gap:10px; }
          .proto-card-inner { padding: 14px 14px; }
          .proto-hdr { padding: 14px 14px; }
          .tab-btn { padding:7px 10px; font-size:11px; flex:1; text-align:center; }
          .step-hdr { padding: 12px 12px; }
          .step-body { padding: 12px 12px 14px; }
          .drug-body { padding: 12px 12px; }
          .drug-grid { grid-template-columns:1fr; gap:10px; }
          .ant-table-wrap { display:none; }
          .ant-cards-wrap { display:flex; flex-direction:column; gap:12px; }
        }
      `}</style>
    </div>
  );
}
