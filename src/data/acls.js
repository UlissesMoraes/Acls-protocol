// Regras determinísticas do algoritmo de PCR adulto (ACLS 2020/2025).
// Mantidas separadas da UI e cobertas por testes — é lógica segurança-crítica.

// Medicação devida no ciclo de RCP que SEGUE o choque nº n (ritmo chocável):
//  • 2º choque → Adrenalina 1 mg; depois a cada choque par (~3–5 min)
//  • 3º choque → Amiodarona 300 mg
//  • 5º choque → Amiodarona 150 mg (sem 3ª dose)
export function shockableMed(n) {
  if (n === 3) return { key: "amio300", label: "Amiodarona 300 mg", drug: "Amiodarona" };
  if (n === 5) return { key: "amio150", label: "Amiodarona 150 mg", drug: "Amiodarona" };
  if (n >= 2 && n % 2 === 0) return { key: "epi", label: "Adrenalina 1 mg", drug: "Adrenalina" };
  return null;
}

// Causas reversíveis
export const H5 = [
  "Hipovolemia",
  "Hipóxia",
  "Hidrogênio (acidose)",
  "Hipo/Hipercalemia e distúrbios metabólicos",
  "Hipotermia",
];
export const T5 = [
  "Tamponamento cardíaco",
  "Tensão no tórax (pneumotórax hipertensivo)",
  "Trombose pulmonar (TEP)",
  "Trombose coronária (IAM)",
  "Toxinas",
];

// Orientação ventilatória conforme a via aérea
export function ventilation(airway) {
  return airway === "advanced"
    ? { txt: "Compressões contínuas + 1 ventilação a cada 6 s (10/min)", sub: "Não pausar as compressões para ventilar" }
    : { txt: "30 compressões : 2 ventilações", sub: "Pausar compressões para as ventilações" };
}
