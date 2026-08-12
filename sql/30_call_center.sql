-- ============================================================
-- CORTEX Gestão · SQL 30 — Módulo Call Center · Informativos
-- Mural de informações do call center: área, profissional em
-- destaque, autor e data de publicação. Idempotente.
-- ============================================================

create table if not exists public.cc_informativos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  area text,
  profissional_id uuid references public.colaboradores(id) on delete set null,
  criado_por text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create index if not exists cc_informativos_criado_idx on public.cc_informativos (criado_em desc);

alter table public.cc_informativos enable row level security;

drop policy if exists cci_sel on public.cc_informativos;
create policy cci_sel on public.cc_informativos for select to authenticated
  using (public.meu_nivel('callcenter') in ('ver', 'editar'));

drop policy if exists cci_ins on public.cc_informativos;
create policy cci_ins on public.cc_informativos for insert to authenticated
  with check (public.meu_nivel('callcenter') = 'editar');

drop policy if exists cci_upd on public.cc_informativos;
create policy cci_upd on public.cc_informativos for update to authenticated
  using (public.meu_nivel('callcenter') = 'editar');

drop policy if exists cci_del on public.cc_informativos;
create policy cci_del on public.cc_informativos for delete to authenticated
  using (public.meu_nivel('callcenter') = 'editar');

grant select, insert, update, delete on public.cc_informativos to authenticated;

-- fim do SQL 30
