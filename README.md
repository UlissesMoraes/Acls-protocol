# 🏥 Protocolos de Emergência — ACLS 2025

Sistema clínico de referência rápida para sala de emergência, baseado nas diretrizes **AHA/ACLS 2020–2025**, Surviving Sepsis Campaign 2021 e Sociedade Brasileira de Cardiologia (SBC).

## 📋 Protocolos incluídos

| Protocolo | Categoria |
|---|---|
| Taquiarritmias | Cardiovascular |
| Bradiarritmias | Cardiovascular |
| Parada Cardiorrespiratória (PCR) | Emergência |
| IAM com Supra de ST (IAMCSSST) | Cardiovascular |
| SCA sem Supra de ST (IAMSSST) | Cardiovascular |
| Intoxicações Agudas | Toxicologia |
| Sepse e Choque Séptico | Infectologia / UTI |
| Cetoacidose Diabética (CAD) | Endocrinologia |
| Estado Hiperosmolar (EHH) | Endocrinologia |
| AVC / Síndromes Neurológicas | Neurologia |
| Síndrome Convulsiva | Neurologia |
| Anafilaxia / Asma Grave (AMAX4) | Emergência |
| Distúrbios Hidroeletrolíticos | Emergência |
| Drogas Vasoativas e Inotrópicos | Emergência |

## ✨ Funcionalidades

- **📋 Cascata Clínica** — fluxo step-by-step com pontos de decisão SIM/NÃO, múltiplas etapas abertas e "expandir tudo"
- **☐ Checklist Operacional** — marcar etapas durante o atendimento
- **💊 Medicamentos** — dose, via, indicação, contraindicações, observações clínicas
- **⚖️ Peso do paciente** — informado uma vez e propagado a todas as calculadoras de dose
- **🧪 Antídotos** — tabela completa por protocolo
- **🔍 Busca** — protocolos, medicamentos, siglas e condições, com atalho direto para fármacos
- **⭐ Favoritos & 🕐 Recentes** — acesso rápido aos protocolos mais usados (persistidos)
- **📱 PWA / Offline** — instalável na tela inicial e funcional sem internet

### 🧰 Ferramentas & Calculadoras (Hub dedicado)

- **Bomba de Infusão** — conversão bidirecional dose ↔ mL/h para vasoativos, sedação e insulina, com diluições usuais editáveis
- **Modo Código (RCP)** — cronômetro de PCR, ciclos de 2 min, metrônomo de compressões (110 bpm), timer de adrenalina e **log de eventos exportável**
- **17 escores e fórmulas clínicas** — qSOFA, SOFA, GRACE, CHA₂DS₂-VASc, HAS-BLED, HEART, NIHSS, GCS, Wells (TEP), QTc, ClCr (Cockcroft-Gault), Osmolaridade, Na⁺/Ca²⁺ corrigidos, Ânion Gap, déficit de água livre e de potássio

## 🏗️ Arquitetura

```
src/
├── data/          # Conteúdo clínico (separado da UI, revisável sem mexer em componentes)
│   ├── protocols.js   # Protocolos, cascatas, fármacos e antídotos
│   ├── scores.js      # Definição declarativa dos escores/calculadoras
│   ├── formulas.js    # Fórmulas de dose por peso
│   └── tools.js       # Catálogo do Hub de Ferramentas
├── components/    # ScoreWidget, DoseCalc, InfusionCalc, CodeTimer
├── hooks/         # usePersistentState (localStorage)
└── App.jsx        # Navegação, índice, detalhe de protocolo e Hub de ferramentas
```

## 🚀 Instalação e execução local

```bash
# Clonar o repositório
git clone https://github.com/SEU_USUARIO/acls2025-protocolos.git
cd acls2025-protocolos

# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 🌐 Deploy na Vercel

### Opção 1 — Interface web (recomendado)
1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New Project"**
3. Importe o repositório do GitHub
4. Framework: **Vite** (detectado automaticamente)
5. Clique em **Deploy**

### Opção 2 — Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

## ⚕️ Nota de uso clínico

Sistema desenvolvido para apoio educacional e referência rápida. Baseado nas diretrizes **AHA/ACLS 2020–2025**, Surviving Sepsis Campaign 2021 e diretrizes da SBC. As decisões terapêuticas são de responsabilidade exclusiva do médico assistente, considerando a individualidade clínica de cada paciente.

---

Desenvolvido com React + Vite · Deploy via Vercel
