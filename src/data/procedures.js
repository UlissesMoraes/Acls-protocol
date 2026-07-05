// ─── PROCEDIMENTOS (com modelo 3D esquemático) ────────────────────────────────
// Conteúdo clínico do lado esquerdo; o `scene` mapeia para uma cena 3D que anima
// passo a passo (renderizada com three.js/react-three-fiber, carregada sob demanda).
// As cenas são ESQUEMÁTICAS (geometria e movimento corretos, não foto-realistas).
// Apoio ao treino/execução — a técnica final é do operador.

export const PROCEDURES = [
  {
    id: "io",
    label: "Acesso Intraósseo (IO)",
    short: "Acesso IO",
    cat: "Acesso vascular",
    color: "#C0392B",
    scene: "io",
    sub: "Via tíbia proximal — acesso vascular emergencial quando a veia falha",
    indications: [
      "Necessidade de acesso vascular emergencial (PCR, choque, sepse grave)",
      "Falha de acesso venoso periférico (2 tentativas ou 90 s)",
    ],
    contra: [
      "Fratura no osso-alvo (ou proximal a ele)",
      "Tentativa de IO prévia no mesmo osso (< 48 h)",
      "Infecção/celulite ou queimadura no local de punção",
      "Osso protético / osteogênese imperfeita",
    ],
    materials: [
      "Dispositivo IO (ex.: EZ-IO) e agulha apropriada ao peso",
      "Clorexidina/álcool · luvas estéreis",
      "Seringa + soro fisiológico para flush · conector (extensor)",
      "Lidocaína (se paciente consciente)",
    ],
    steps: [
      { t: "Identificar o ponto", d: "Tíbia proximal: ~2 cm distal e 1–2 cm medial à tuberosidade tibial, na face plana (platô medial)." },
      { t: "Antissepsia", d: "Clorexidina/álcool no local. Técnica asséptica." },
      { t: "Inserir a agulha a 90°", d: "Perpendicular à pele. Avançar com o motor/pressão até sentir a perda de resistência (“pop”) ao entrar na cavidade medular." },
      { t: "Remover o mandril e confirmar", d: "Retirar o estilete. Confirmar posição: agulha firme, aspirar medula e/ou flush sem extravasamento de partes moles." },
      { t: "Flush e infusão", d: "Flush de 5–10 mL de SF (lidocaína antes, se consciente). Conectar o extensor e infundir — pode usar pressurizador." },
    ],
    complications: [
      "Extravasamento → síndrome compartimental (vigiar a panturrilha)",
      "Fratura, deslocamento da agulha, dor à infusão",
      "Osteomielite (raro) — retirar em até 24 h",
    ],
  },
  {
    id: "intub",
    label: "Intubação Orotraqueal",
    short: "Intubação",
    cat: "Via aérea",
    color: "#1A5276",
    scene: "intub",
    sub: "Sequência rápida — laringoscopia e passagem do tubo pelas cordas vocais",
    indications: [
      "Proteção de via aérea (rebaixamento, Glasgow ≤ 8, risco de aspiração)",
      "Insuficiência respiratória / oxigenação ou ventilação inadequadas",
      "Necessidade prevista de ventilação mecânica",
    ],
    contra: [
      "Trauma maciço de face/via aérea que impeça a visualização (via cirúrgica)",
      "Relativas: instabilidade cervical (estabilizar em linha), via aérea difícil prevista",
    ],
    materials: [
      "Laringoscópio (lâmina) ou videolaringoscópio · tubos (testar cuff)",
      "Bougie/fio-guia · seringa · aspirador pronto",
      "Drogas de ISR (indução + bloqueador) · capnógrafo",
      "Dispositivo bolsa-válvula-máscara + O₂ · plano B (supraglótico)",
    ],
    steps: [
      { t: "Preparo e posicionamento", d: "Material checado (SOAP-ME). Pré-oxigenar. Posição olfativa (“sniffing”): alinhar meato auditivo ao esterno." },
      { t: "Indução e bloqueio", d: "Sequência rápida: indução + bloqueador neuromuscular. Aguardar relaxamento (apneia)." },
      { t: "Laringoscopia", d: "Lâmina pela direita, afastando a língua para a esquerda. Tracionar para cima e à frente (sem alavancar nos dentes) até ver a glote." },
      { t: "Passar o tubo", d: "Sob visão direta, avançar o tubo entre as cordas vocais até a marca apropriada (~21–23 cm no adulto)." },
      { t: "Insuflar o cuff e confirmar", d: "Insuflar o balonete. Confirmar com capnografia (padrão-ouro), ausculta em 5 pontos e expansão simétrica. Fixar." },
    ],
    complications: [
      "Intubação esofágica (capnografia confirma) ou seletiva (brônquio direito)",
      "Hipoxemia/bradicardia por tentativa prolongada — limite ~30 s",
      "Trauma dentário/labial, aspiração, laringoespasmo",
    ],
  },
  {
    id: "thorax",
    label: "Drenagem Torácica / Toracocentese",
    short: "Dreno de tórax",
    cat: "Tórax",
    color: "#0F766E",
    scene: "thorax",
    sub: "Punção/drenagem no triângulo de segurança, sobre a borda superior da costela",
    indications: [
      "Pneumotórax (hipertensivo: descompressão imediata)",
      "Derrame pleural sintomático / hemotórax / empiema",
    ],
    contra: [
      "Coagulopatia grave não corrigida (relativa)",
      "Aderências pleurais extensas · pele infectada no local",
    ],
    materials: [
      "Antisséptico, campos, anestésico local (lidocaína)",
      "Bisturi, pinça (Kelly), dreno tubular do calibre adequado",
      "Sistema de selo d'água · fio de sutura · curativo",
    ],
    steps: [
      { t: "Identificar o triângulo de segurança", d: "Limites: borda lateral do peitoral maior, borda anterior do grande dorsal e linha do mamilo (5º EIC), na linha axilar média/anterior." },
      { t: "Antissepsia e anestesia", d: "Assepsia ampla e anestesia local de pele, subcutâneo e pleura parietal (botão anestésico)." },
      { t: "Incisão sobre a borda SUPERIOR da costela", d: "Incisar a pele e dissecar de forma romba rente à margem SUPERIOR da costela inferior — evita o feixe neurovascular, que corre na borda inferior da costela de cima." },
      { t: "Entrar na pleura", d: "Perfurar a pleura parietal com a pinça (saída de ar/líquido). Explorar com o dedo (afastar aderências/pulmão)." },
      { t: "Inserir o dreno e conectar", d: "Direcionar o dreno (ápice no pneumotórax, base no derrame). Conectar ao selo d'água, suturar/fixar e confirmar com radiografia." },
    ],
    complications: [
      "Lesão de feixe neurovascular (se passar pela borda inferior) — sangramento",
      "Lesão de pulmão, fígado ou baço · posicionamento extrapleural",
      "Edema de reexpansão (drenar grandes derrames lentamente)",
    ],
  },
  {
    id: "rcp",
    label: "RCP: Compressões e Desfibrilação",
    short: "RCP / Desfibrilação",
    cat: "Parada",
    color: "#7B241C",
    scene: "rcp",
    sub: "Compressões de alta qualidade e posicionamento das pás",
    indications: [
      "Parada cardiorrespiratória (inconsciente, sem respiração/pulso)",
      "Desfibrilação: ritmos chocáveis (FV / TV sem pulso)",
    ],
    contra: [
      "Sinais inequívocos de morte / ordem válida de não reanimar",
      "Desfibrilação: NÃO em assistolia/AESP (ritmos não chocáveis)",
    ],
    materials: [
      "Superfície rígida · prancha",
      "Desfibrilador/DEA + pás ou eletrodos adesivos",
      "Bolsa-válvula-máscara + O₂ · metrônomo (100–120/min)",
    ],
    steps: [
      { t: "Posição das mãos", d: "Região hipotenar da mão dominante no centro do tórax (metade inferior do esterno); outra mão por cima, dedos entrelaçados, braços estendidos." },
      { t: "Comprimir com qualidade", d: "Profundidade 5–6 cm, frequência 100–120/min, permitindo o RETORNO TOTAL do tórax. Minimizar interrupções (< 10 s)." },
      { t: "Posicionar as pás", d: "Esterno-ápice: uma pá infraclavicular direita; a outra na linha axilar média esquerda (sobre o ápice). Evitar sobre eletrodos/marca-passo." },
      { t: "Afastar todos e chocar", d: "Carga (bifásico ~200 J). “Afasto eu, afastam vocês, afastado o O₂” — confirmar ninguém em contato e disparar." },
      { t: "Retomar RCP imediatamente", d: "Reiniciar compressões logo após o choque, sem checar pulso. Reavaliar o ritmo a cada 2 min." },
    ],
    complications: [
      "Fraturas de costela/esterno (não interromper por isso)",
      "Compressões superficiais ou sem retorno total reduzem o débito",
      "Queimadura/arco elétrico se houver contato durante o choque",
    ],
  },
];
