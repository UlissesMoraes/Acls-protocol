-- Assinaturas (acesso pago à anamnese). Rode uma vez no SQL Editor do Supabase.
-- O servidor (service_role) escreve; o usuário lê apenas a própria linha (RLS).

create table if not exists public.subscriptions (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  status          text not null default 'inactive',   -- 'active' | 'inactive'
  valid_until     timestamptz,                         -- acesso liberado até esta data
  last_payment_id text,
  updated_at      timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Cada usuário enxerga só a própria assinatura.
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Sem policies de INSERT/UPDATE para usuários: a escrita acontece apenas pelo
-- webhook usando a service_role (que ignora o RLS).
