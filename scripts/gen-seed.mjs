// Gera supabase/seed.sql a partir dos protocolos embutidos (uma linha por protocolo).
// Uso: npm run content:seed-sql  → rode o arquivo no SQL Editor do Supabase (1x).
import { writeFileSync, mkdirSync } from "node:fs";
import { P } from "../src/data/protocols.js";

mkdirSync("supabase", { recursive: true });

const stmts = P.map((p, i) => {
  const json = JSON.stringify(p);
  // dollar-quoting evita escapar aspas; tag improvável de colidir com o conteúdo
  return `insert into public.protocols (id, ord, enabled, data) values ('${p.id}', ${i + 1}, true, $seed$${json}$seed$::jsonb)
on conflict (id) do update set ord = excluded.ord, enabled = excluded.enabled, data = excluded.data;`;
});

const sql = `-- Seed dos protocolos do app ACLS (gerado por scripts/gen-seed.mjs)
-- Rode uma vez no SQL Editor do Supabase para popular a tabela public.protocols.
begin;
${stmts.join("\n\n")}
commit;
`;

writeFileSync("supabase/seed.sql", sql);
console.log(`✔ supabase/seed.sql gerado — ${P.length} protocolos, ${sql.length} bytes.`);
