-- ============================================================
-- CORTEX Gestão · SQL 41 — Módulo Calendário
-- Agenda do ano: eventos, campanhas, semanas temáticas e
-- publicações, com início e fim (eventos de vários dias).
-- Aniversários saem da ficha (colaboradores.nascimento) por
-- uma função dedicada que expõe só o necessário — quem tem
-- Calendário não precisa de acesso ao RH inteiro.
-- RLS pelo módulo 'calendario'. Idempotente.
-- ============================================================

create table if not exists public.eventos_calendario (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'evento' check (tipo in ('evento','campanha','semana','publicacao')),
  area text,
  local text,
  descricao text,
  data_inicio date not null,
  data_fim date not null,
  criado_em timestamptz not null default now(),
  criado_por text,
  atualizado_em timestamptz not null default now(),
  atualizado_por text,
  constraint eventos_cal_periodo check (data_fim >= data_inicio)
);

comment on table public.eventos_calendario is 'Agenda institucional: eventos, campanhas, semanas temáticas e publicações planejadas.';

create index if not exists eventos_cal_idx on public.eventos_calendario (data_inicio, data_fim);

alter table public.eventos_calendario enable row level security;

drop policy if exists evcal_sel on public.eventos_calendario;
create policy evcal_sel on public.eventos_calendario for select to authenticated
  using (public.meu_nivel('calendario') in ('ver','editar'));
drop policy if exists evcal_ins on public.eventos_calendario;
create policy evcal_ins on public.eventos_calendario for insert to authenticated
  with check (public.meu_nivel('calendario') = 'editar');
drop policy if exists evcal_upd on public.eventos_calendario;
create policy evcal_upd on public.eventos_calendario for update to authenticated
  using (public.meu_nivel('calendario') = 'editar');
drop policy if exists evcal_del on public.eventos_calendario;
create policy evcal_del on public.eventos_calendario for delete to authenticated
  using (public.meu_nivel('calendario') = 'editar');

grant select, insert, update, delete on public.eventos_calendario to authenticated;

-- Aniversariantes: função com privilégio do dono, mas que só
-- responde a quem tem o módulo Calendário — e só os campos de
-- festa (nada de salário, CPF ou ficha completa).
create or replace function public.aniversariantes()
returns table (id uuid, nome text, nascimento date, setor text, unidade text, foto_url text, regime text)
language sql
security definer
set search_path = public
stable
as $$
  select c.id, c.nome, c.nascimento, c.setor, c.unidade, c.foto_url, c.regime
  from public.colaboradores c
  where public.meu_nivel('calendario') in ('ver','editar')
    and c.nascimento is not null
    and coalesce(c.status, 'ativo') <> 'desligado'
$$;

revoke all on function public.aniversariantes() from public;
grant execute on function public.aniversariantes() to authenticated;

-- fim do SQL 41
