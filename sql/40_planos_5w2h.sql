-- ============================================================
-- CORTEX Gestão · SQL 40 — Módulo Planos 5W2H
-- Planos de ação no formato clássico: cada plano tem um
-- objetivo e suas ações respondem O quê, Por quê, Onde,
-- Quando (data — atraso automático), Quem, Como e Quanto
-- (numérico — o custo do plano é somado). RLS pelo módulo
-- 'planos'. Idempotente.
-- ============================================================

create table if not exists public.planos_5w2h (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  area text not null default 'Geral / Direção',
  origem text,
  objetivo text,
  situacao text not null default 'ativo' check (situacao in ('ativo','pausado','concluido')),
  criado_em timestamptz not null default now(),
  criado_por text,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

create table if not exists public.planos_5w2h_acoes (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.planos_5w2h(id) on delete cascade,
  o_que text not null,
  por_que text,
  onde text,
  quando date,
  quem text,
  como text,
  quanto numeric(12,2),
  status text not null default 'pendente' check (status in ('pendente','andamento','concluida','cancelada')),
  concluida_em timestamptz,
  ordem int not null default 0
);

create index if not exists planos_5w2h_idx on public.planos_5w2h (situacao, area, atualizado_em desc);
create index if not exists planos_5w2h_acoes_idx on public.planos_5w2h_acoes (plano_id, ordem);
create index if not exists planos_5w2h_acoes_quando_idx on public.planos_5w2h_acoes (quando);

alter table public.planos_5w2h enable row level security;
alter table public.planos_5w2h_acoes enable row level security;

drop policy if exists p5_sel on public.planos_5w2h;
create policy p5_sel on public.planos_5w2h for select to authenticated
  using (public.meu_nivel('planos') in ('ver','editar'));
drop policy if exists p5_ins on public.planos_5w2h;
create policy p5_ins on public.planos_5w2h for insert to authenticated
  with check (public.meu_nivel('planos') = 'editar');
drop policy if exists p5_upd on public.planos_5w2h;
create policy p5_upd on public.planos_5w2h for update to authenticated
  using (public.meu_nivel('planos') = 'editar');
drop policy if exists p5_del on public.planos_5w2h;
create policy p5_del on public.planos_5w2h for delete to authenticated
  using (public.meu_nivel('planos') = 'editar');

drop policy if exists p5a_sel on public.planos_5w2h_acoes;
create policy p5a_sel on public.planos_5w2h_acoes for select to authenticated
  using (public.meu_nivel('planos') in ('ver','editar'));
drop policy if exists p5a_ins on public.planos_5w2h_acoes;
create policy p5a_ins on public.planos_5w2h_acoes for insert to authenticated
  with check (public.meu_nivel('planos') = 'editar');
drop policy if exists p5a_upd on public.planos_5w2h_acoes;
create policy p5a_upd on public.planos_5w2h_acoes for update to authenticated
  using (public.meu_nivel('planos') = 'editar');
drop policy if exists p5a_del on public.planos_5w2h_acoes;
create policy p5a_del on public.planos_5w2h_acoes for delete to authenticated
  using (public.meu_nivel('planos') = 'editar');

grant select, insert, update, delete on public.planos_5w2h to authenticated;
grant select, insert, update, delete on public.planos_5w2h_acoes to authenticated;

-- fim do SQL 40
