-- ============================================================
-- CORTEX Gestão · SQL 38 — Módulo Reuniões
-- Ata viva das reuniões semanais: cabeçalho por área/setor e
-- itens polimórficos (tópicos, decisões, ações com responsável,
-- ideias e pendências). RLS pelo módulo 'reunioes'. Idempotente.
-- ============================================================

create table if not exists public.reunioes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data date not null,
  area text not null default 'Geral / Direção',
  participantes text,
  resumo text,
  criado_em timestamptz not null default now(),
  criado_por text,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

create table if not exists public.reunioes_itens (
  id uuid primary key default gen_random_uuid(),
  reuniao_id uuid not null references public.reunioes(id) on delete cascade,
  tipo text not null check (tipo in ('topico','decisao','acao','ideia','pendencia')),
  rotulo text,
  texto text not null,
  ordem int not null default 0
);

comment on table public.reunioes is 'Cabeçalho das reuniões: título, data, área/setor, participantes e resumo.';
comment on column public.reunioes_itens.rotulo is 'Nas ações, guarda o responsável. Nos demais tipos fica nulo.';

create index if not exists reunioes_data_idx on public.reunioes (data desc, area);
create index if not exists reunioes_itens_idx on public.reunioes_itens (reuniao_id, tipo, ordem);

alter table public.reunioes enable row level security;
alter table public.reunioes_itens enable row level security;

drop policy if exists reu_sel on public.reunioes;
create policy reu_sel on public.reunioes for select to authenticated
  using (public.meu_nivel('reunioes') in ('ver','editar'));
drop policy if exists reu_ins on public.reunioes;
create policy reu_ins on public.reunioes for insert to authenticated
  with check (public.meu_nivel('reunioes') = 'editar');
drop policy if exists reu_upd on public.reunioes;
create policy reu_upd on public.reunioes for update to authenticated
  using (public.meu_nivel('reunioes') = 'editar');
drop policy if exists reu_del on public.reunioes;
create policy reu_del on public.reunioes for delete to authenticated
  using (public.meu_nivel('reunioes') = 'editar');

drop policy if exists reui_sel on public.reunioes_itens;
create policy reui_sel on public.reunioes_itens for select to authenticated
  using (public.meu_nivel('reunioes') in ('ver','editar'));
drop policy if exists reui_ins on public.reunioes_itens;
create policy reui_ins on public.reunioes_itens for insert to authenticated
  with check (public.meu_nivel('reunioes') = 'editar');
drop policy if exists reui_upd on public.reunioes_itens;
create policy reui_upd on public.reunioes_itens for update to authenticated
  using (public.meu_nivel('reunioes') = 'editar');
drop policy if exists reui_del on public.reunioes_itens;
create policy reui_del on public.reunioes_itens for delete to authenticated
  using (public.meu_nivel('reunioes') = 'editar');

grant select, insert, update, delete on public.reunioes to authenticated;
grant select, insert, update, delete on public.reunioes_itens to authenticated;

-- fim do SQL 38
