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
- **📱 PWA instalável** — "Instalar app" no Android/Chrome (ícones PNG 192/512 + maskable), botão e banner de instalação in-app, instrução guiada no iOS, funciona offline e avisa quando há nova versão
- **🌙 Modo escuro** — alterna claro/escuro (persistido) para plantões noturnos
- **🔍 Busca tolerante** — ignora acentos e entende sinônimos (ex: epinefrina = adrenalina)
- **🇧🇷 Entrada pt-BR** — calculadoras aceitam vírgula decimal (ex: creatinina `1,4`)
- **🔆 Wake Lock** — a tela não apaga durante o Modo Código (RCP)
- **🛰️ Conteúdo vivo** — protocolos atualizáveis via backend (Supabase) sem republicar o app, com validação, cache offline e fallback embutido

## 🧪 Qualidade e testes

```bash
npm run validate   # valida integridade dos dados clínicos (schema)
npm test           # testes unitários das fórmulas de dose e escores (node:test)
npm run check      # validação + testes (use no CI / pré-commit)
```

As fórmulas de dose e os escores são funções puras com cobertura de testes —
qualquer regressão em um cálculo de medicamento é detectada antes do deploy.

### 🧰 Ferramentas & Calculadoras (Hub dedicado)

- **Bomba de Infusão** — conversão bidirecional dose ↔ mL/h para vasoativos, sedação e insulina, com diluições usuais editáveis
- **Copiloto de RCP (ACLS)** — guia passo a passo por ritmo, ciclos de 2 min, metrônomo de compressões (110 bpm), timer de adrenalina e **log de eventos exportável**
- **17 escores e fórmulas clínicas** — qSOFA, SOFA, GRACE, CHA₂DS₂-VASc, HAS-BLED, HEART, NIHSS, GCS, Wells (TEP), QTc, ClCr (Cockcroft-Gault), Osmolaridade, Na⁺/Ca²⁺ corrigidos, Ânion Gap, déficit de água livre e de potássio

## 🏗️ Arquitetura

```
api/
└── ai.js          # Função serverless (Vercel Edge) — proxy seguro p/ OpenAI
src/
├── data/          # Conteúdo clínico (separado da UI, revisável sem mexer em componentes)
│   ├── protocols.js   # Protocolos, cascatas, fármacos e antídotos
│   ├── scores.js      # Definição declarativa dos escores/calculadoras
│   ├── formulas.js    # Fórmulas de dose por peso
│   └── tools.js       # Catálogo do Hub de Ferramentas
│   └── remoteContent.js # Busca/valida/mescla protocolos do backend (Supabase)
├── lib/           # aiClient (streaming SSE) · clinicalContext (base + logs p/ IA)
├── components/    # ScoreWidget, DoseCalc, InfusionCalc, CodeTimer, AIAssistant,
│                  #   SymptomTriage, DrugAlerts
├── hooks/         # usePersistentState, useInstallPrompt, useProtocols
├── config.js      # URL + chave pública do Supabase (com fallback embutido)
└── App.jsx        # Navegação, índice, detalhe de protocolo e Hub de ferramentas
```

## 🛰️ Conteúdo vivo (backend Supabase)

Os protocolos podem ser atualizados **sem republicar o app**. O conteúdo clínico
(etapas, fármacos, doses, indicações) é servido pela tabela `public.protocols` no
Supabase; a **lógica de escores e fórmulas permanece no código** (não é seguro
executar código vindo de fora).

Estratégia em camadas (à prova de falhas para a sala de emergência):

1. **Embutido** no build — instantâneo e sempre disponível (funciona offline).
2. **Cache** do último conteúdo remoto válido (offline-first).
3. **Busca remota** em segundo plano → **valida** cada protocolo → mescla (remoto
   tem prioridade por `id`) → atualiza a tela e o cache. Conteúdo malformado é
   descartado, mantendo o embutido.

Editar um protocolo = editar uma linha em **Table editor → protocols** no painel
do Supabase. A mudança aparece para os usuários na próxima abertura (online), com
um aviso "Conteúdo atualizado".

**Seed inicial** (popular a tabela com os 14 protocolos atuais), uma única vez:

```bash
npm run content:seed-sql        # gera supabase/seed.sql
# Cole o conteúdo de supabase/seed.sql no SQL Editor do Supabase e execute.
```

Configuração via `.env` (opcional — há fallback embutido): veja `.env.example`.
Para desligar o backend e usar só o conteúdo embutido: `VITE_REMOTE_CONTENT=off`.

## 👶 Modo Pediátrico (PALS)

Seletor **Adulto ⇄ Pediátrico** na tela inicial que troca todo o conjunto clínico:

- **7 protocolos PALS** — PCR pediátrica, bradicardia, taquicardia (TSV/TV), choque séptico, anafilaxia, estado de mal epiléptico e CAD pediátrica.
- **Doses por peso (mg/kg) com tetos** — a calculadora de dose calcula automaticamente o valor para o peso da criança, aplicando os máximos do PALS (ex.: adrenalina limitada a 1 mg, amiodarona a 300 mg).
- **Copiloto de PCR no modo PALS** — o mesmo copiloto, agora com energia de desfibrilação por kg (2 → 4 J/kg), adrenalina 0,01 mg/kg, amiodarona 5 mg/kg, relação 15:2 e causas 6H/6T (inclui hipoglicemia). Exige o peso para calcular doses/energia.
- **Estimador de peso por idade** — fórmulas APLS, para quando o peso real é desconhecido; pode ser aplicado como peso global do app.

A lógica determinística (medicação por kg, energia, peso por idade) e as fórmulas pediátricas são **funções puras cobertas por testes** (`test/pals.test.mjs`).

## 🤖 Inteligência (IA)

Recursos de IA ancorados no **conteúdo dos próprios protocolos** do app (padrão
RAG), todos servidos pela mesma função serverless segura (`api/ai.js`), cada um
com um *system prompt* clínico próprio (modos `chat`, `narrate`, `debriefing`,
`prioritize`, `triage`, `alerts`):

- **Copiloto Clínico** — chat de dúvidas de conduta, modo ensino e cálculo de doses conversando, com **voz** (falar a pergunta e ouvir a resposta).
- **Modo explicativo por protocolo** — dentro de qualquer protocolo, o botão "Tirar dúvidas com a IA" abre o copiloto já **focado** naquele tema, com sugestões específicas.
- **Triagem por sintomas** — na home, descreva o caso (texto ou voz) e a IA sugere os protocolos certos, com atalho para abri-los.
- **Comandos de voz no RCP** — durante a parada, diga "choquei", "adrenalina", "amiodarona", "reavaliar", "rce" ou "metrônomo" para operar sem tocar a tela.
- **Priorizador de 5H/5T** — informe K⁺, temperatura e contexto e a IA ranqueia as causas reversíveis mais prováveis.
- **Relatório de parada** — gera o registro cronológico da RCP a partir do log, pronto para prontuário.
- **Debriefing pós-código** — após o RCE, analisa o log frente às diretrizes ACLS (timing de adrenalina/amiodarona, ciclos) para fins educacionais.
- **Alertas de interação** — na aba de medicamentos, verifica interações e riscos de segurança das drogas do protocolo.

> Todo recurso de IA é **apoio à decisão** — a responsabilidade clínica é do médico assistente.

**Segurança da chave:** a chave da OpenAI vive **somente** na função serverless
`api/ai.js` (Vercel Edge), lida de `OPENAI_API_KEY`. O navegador chama `/api/ai`
na mesma origem — a chave **nunca** entra no bundle do front-end.

Configuração na Vercel (**Project → Settings → Environment Variables**):

| Variável | Obrigatória | Padrão | Função |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ | — | Chave secreta `sk-...` |
| `OPENAI_MODEL` | — | `gpt-4o-mini` | Modelo de chat |
| `AI_ALLOWED_ORIGIN` | — | (livre) | Restringe a origem que pode chamar a IA |

> ⚠️ **Não** use o prefixo `VITE_` nessas variáveis — isso as exporia no app.
> Após adicioná-las, faça um novo deploy. Sem a chave, o app funciona normalmente
> e o Copiloto exibe um aviso de "não configurado".

## 📝 Anamnese com IA (área protegida)

Ferramenta exclusiva, **protegida por senha**, para transcrever o atendimento e
gerar um documento clínico estruturado:

1. **Gravação ou upload de áudio** (no aparelho) → **transcrição** via OpenAI
   Whisper (`api/transcribe.js`).
2. **Transcrição editável** + campos de contexto (idade, sexo, observações).
3. **Análise clínica estruturada** (modo `anamnese` de `api/ai.js`): identificação
   e queixa, HMA, antecedentes, revisão de sistemas, **red flags**, **hipóteses
   diagnósticas**, **CID-10 sugeridos**, exames complementares, conduta e
   pendências — com cópia e export `.md`.

**Segurança:** o gate é **server-side** — a senha (`ANAMNESE_PASSWORD`) e a chave
da OpenAI ficam só no servidor, e cada chamada paga (transcrição/análise)
revalida a senha. O front-end apenas destrava a UI. Variáveis na Vercel:

| Variável | Obrigatória | Padrão | Função |
|---|---|---|---|
| `ANAMNESE_PASSWORD` | ✅ | — | Senha da área de anamnese |
| `OPENAI_TRANSCRIBE_MODEL` | — | `whisper-1` | Modelo de transcrição |

> ⚕️ **LGPD:** áudio e texto são enviados à OpenAI. Evitar identificadores diretos
> do paciente, obter consentimento e seguir a política da instituição. Os CID-10 e
> hipóteses são sugestões — conferir antes do prontuário.

## 🧊 Procedimentos 3D

Ferramenta de procedimentos com modelo 3D animado passo a passo, renderizado no
aparelho (three.js / react-three-fiber) — **sem servidor, funciona offline**:

- **4 procedimentos:** acesso intraósseo, intubação orotraqueal, drenagem torácica e RCP/desfibrilação, cada um com indicações, contraindicações, materiais, passos e complicações.
- **Render realista:** iluminação de estúdio procedural (offline), sombras de contato, PBR e tone mapping ACES.
- **Modelo humano realista:** a intubação usa um **scan de cabeça humana** (CC-BY) embutido; os demais combinam anatomia esquemática clara com instrumentos precisos.
- **Lazy-load:** o visualizador 3D (three.js, ~275 KB gzip) é um chunk separado, carregado **só** ao abrir um procedimento — não pesa o load inicial do app.

### Adicionar modelos de anatomia realista

Modelos ficam em `public/models/` (cacheados pelo service worker → offline). Para
incluir um novo (ex.: caixa torácica, crânio):

1. Baixe um `.glb` com licença adequada (preferir **CC0**/**CC-BY**).
2. Coloque em `public/models/` e registre em `src/data/models.js`.
3. Aponte a cena via o componente `GLBModel` (auto-centra e escala qualquer GLB).
4. Mantenha o crédito/licença em `public/models/CREDITS.md`.

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
