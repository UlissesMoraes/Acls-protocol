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

## ✨ Funcionalidades

- **📋 Cascata Clínica** — fluxo step-by-step com pontos de decisão SIM/NÃO
- **☐ Checklist Operacional** — marcar etapas durante o atendimento
- **💊 Medicamentos** — dose, via, indicação, contraindicações, observações clínicas
- **⚖️ Calculadora de Dose** — inserir peso e calcular dose em tempo real
- **🧪 Antídotos** — tabela completa por protocolo
- **📊 Escores Interativos** — qSOFA, GRACE, CHA₂DS₂-VASc, NIHSS, Osmolaridade
- **🔍 Busca** — pesquisa em medicamentos, siglas, condições e cascata
- **📱 Responsivo** — mobile-first, adaptado para uso na beira do leito

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
