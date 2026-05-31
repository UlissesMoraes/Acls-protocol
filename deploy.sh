#!/bin/bash
# ─────────────────────────────────────────────────────────────
# deploy.sh — Setup Git + push para GitHub + deploy na Vercel
# Uso: bash deploy.sh
# ─────────────────────────────────────────────────────────────

set -e

echo ""
echo "═══════════════════════════════════════════════"
echo "  ACLS 2025 — Deploy Setup"
echo "═══════════════════════════════════════════════"
echo ""

# ── 1. Configurar Git ─────────────────────────────
echo "▶ Inicializando repositório Git..."
git init
git add .
git commit -m "feat: Protocolos ACLS 2025 — versão inicial

- 11 protocolos clínicos (PCR, Taquiarritmias, Bradiarritmias, IAM,
  SCA, Intoxicações, Sepse, CAD, EHH, AVC, Convulsões)
- Cascata clínica com checklist operacional
- Calculadora de dose por peso em tempo real
- Escores interativos: qSOFA, GRACE, CHA2DS2-VASc, NIHSS, Osmolaridade
- Busca global por medicamento, sigla ou condição
- Tabela de antídotos por protocolo
- Layout responsivo mobile-first
- Deploy: React + Vite + Vercel"

echo "✅ Git inicializado e commit criado"
echo ""

# ── 2. Instruções para GitHub ─────────────────────
echo "═══════════════════════════════════════════════"
echo "  PRÓXIMO PASSO — Criar repositório no GitHub"
echo "═══════════════════════════════════════════════"
echo ""
echo "  1. Acesse: https://github.com/new"
echo "  2. Nome sugerido: acls2025-protocolos"
echo "  3. Visibilidade: Public ou Private"
echo "  4. NÃO marque 'Initialize with README'"
echo "  5. Clique em 'Create repository'"
echo ""
echo "  Depois, execute os comandos abaixo substituindo SEU_USUARIO:"
echo ""
echo "  git remote add origin https://github.com/SEU_USUARIO/acls2025-protocolos.git"
echo "  git branch -M main"
echo "  git push -u origin main"
echo ""

# ── 3. Instruções para Vercel ─────────────────────
echo "═══════════════════════════════════════════════"
echo "  DEPLOY NA VERCEL"
echo "═══════════════════════════════════════════════"
echo ""
echo "  OPÇÃO A — Interface Web (recomendado):"
echo "  1. Acesse https://vercel.com e faça login"
echo "  2. Clique em 'Add New Project'"
echo "  3. Importe o repositório do GitHub"
echo "  4. Framework: Vite (detectado automaticamente)"
echo "  5. Build Command: npm run build"
echo "  6. Output Directory: dist"
echo "  7. Clique em 'Deploy'"
echo ""
echo "  OPÇÃO B — Vercel CLI:"
echo "  npm install -g vercel"
echo "  vercel login"
echo "  vercel --prod"
echo ""
echo "═══════════════════════════════════════════════"
echo "✅ Script concluído. Siga os passos acima."
echo "═══════════════════════════════════════════════"
