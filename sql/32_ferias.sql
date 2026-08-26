-- ============================================================
-- CORTEX Gestão · SQL 32 — Férias
-- Períodos de férias por colaborador, lançados no RH ›
-- Faltas e atestados. No espelho mensal, dias de férias
-- zeram o previsto e saem marcados como FÉRIAS.
-- Idempotente.
-- ============================================================

create table if not exists public.ferias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  inicio date not null,
  fim date not null,
  observacao text,
  registrado_por uuid,
  criado_em timestamptz not null default now(),
  constraint ferias_periodo_ok check (fim >= inicio)
);

create index if not exists ferias_colab_ini_idx on public.ferias (colaborador_id, inicio desc);

alter table public.ferias enable row level security;

drop policy if exists fer_sel on public.ferias;
create policy fer_sel on public.ferias for select to authenticated
  using (public.meu_nivel('rh') in ('ver', 'editar'));

drop policy if exists fer_ins on public.ferias;
create policy fer_ins on public.ferias for insert to authenticated
  with check (public.meu_nivel('rh') = 'editar');

drop policy if exists fer_upd on public.ferias;
create policy fer_upd on public.ferias for update to authenticated
  using (public.meu_nivel('rh') = 'editar');

drop policy if exists fer_del on public.ferias;
create policy fer_del on public.ferias for delete to authenticated
  using (public.meu_nivel('rh') = 'editar');

grant select, insert, update, delete on public.ferias to authenticated;

-- fim do SQL 32
