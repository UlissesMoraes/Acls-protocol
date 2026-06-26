# Acls-protocol — Guia do projeto

App clínico de referência rápida (React + Vite, PWA). O conteúdo é usado em
beira-leito e sala de emergência — **erro de conteúdo é erro clínico**.

## ⚠️ Regra clínica obrigatória (prioridade máxima)

**SEMPRE usar a nomenclatura e as diretrizes mais recentes.** Conteúdo clínico
desatualizado é considerado grave neste projeto.

- Antes de adicionar/editar qualquer protocolo, fármaco, dose, escore ou texto
  clínico, ancorar na **diretriz mais atual** da sociedade de referência
  (AHA/ACC, ACLS/PALS, Surviving Sepsis, SBC, ESC, etc.) e citar o ano no `sub`
  do protocolo.
- Usar a **terminologia vigente**. Quando uma diretriz aposenta um termo,
  adotar o novo e manter o antigo apenas entre parênteses ("antiga '…'") para
  preservar a busca. Ex.: AHA/ACC 2025 abandonou "urgência hipertensiva" →
  usar **"hipertensão grave assintomática"**.
- Doses, metas e fluxos devem refletir a recomendação mais recente; se houver
  mudança entre versões da diretriz, prevalece a mais nova.
- Na dúvida sobre a versão vigente de uma diretriz, **pesquisar antes** (não
  responder de memória) e, se ainda restar ambiguidade clínica relevante,
  perguntar ao usuário (médico).

## Validação e testes (sempre rodar antes de commitar conteúdo)

```bash
npm run check   # valida schema dos dados clínicos + testes unitários (node:test)
```

- Protocolos adultos: `src/data/protocols.js` (array `P`, categorias `CATS`)
- Protocolos pediátricos (PALS): `src/data/protocolsPed.js`
- Fórmulas de dose por peso: `src/data/formulas.js` (chave `"Fármaco|idDoProtocolo"`)
- Fórmulas pediátricas (com tetos): `src/data/formulasPed.js`
- Escores: `src/data/scores.js` · validador: `scripts/validate-data.mjs`

## Segurança da chave OpenAI (regra permanente)

A chave da OpenAI vive **somente** na env var `OPENAI_API_KEY` da Vercel, lida
pelas funções serverless `api/ai.js` e `api/transcribe.js`. **Nunca** colocar a
chave no código, no bundle do front-end nem em commits. Não usar prefixo `VITE_`
nessa variável.

A área de **anamnese** é protegida por senha (`ANAMNESE_PASSWORD`, também só no
servidor). O gate real é server-side: `api/transcribe.js` e o modo `anamnese` de
`api/ai.js` revalidam a senha a cada chamada (o front-end apenas destrava a UI).
Dados clínicos vão à OpenAI — manter o aviso de LGPD na ferramenta.

## Autenticação (Supabase Auth)

O app inteiro é protegido por **login com email/senha** (Supabase Auth) — cadastro
gratuito, para controlar quem acessa. Cliente em `src/lib/supabase.js`, hook
`src/hooks/useAuth.js`, telas `AuthScreen.jsx` (login/cadastro/recuperar) e
`AccountMenu.jsx` (alterar senha/sair); o gate fica em `src/main.jsx` (`Root`).
A sessão persiste (uso offline após o 1º login). Não criar tabela própria de
senha — usar sempre o Supabase Auth. Usuários: painel → Authentication → Users.

## Git

Desenvolver na branch `claude/zealous-bohr-91jb9h`. Commitar e dar push apenas
quando solicitado; não abrir PR sem pedido explícito.
