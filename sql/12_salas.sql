-- ============================================================
-- CORTEX GESTAO - 12: SALAS (GUIA DE SALAS)
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 01/03.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- O que faz:
--   1. Tabela 'salas': numero, unidade (EQ1/EQ2), andar,
--      especialidade, cor do cartao, ativa, observacoes.
--   2. Tabela 'salas_ocupacoes': quem ocupa cada sala em cada
--      dia (Seg-Sab) e periodo (P1=7h, P2=12h, P3=16h), com
--      horario detalhado opcional (ex.: "7h-13h").
--   3. Permissoes por aba: 'cadastro' (salas) e 'grade'
--      (ocupacoes), nos niveis ver/editar como o resto.
--   4. Auditoria em tudo, trava contra a mesma pessoa duas
--      vezes na mesma celula, e a visao 'colaboradores_basico'
--      (so id, nome, foto e cargo) para a grade mostrar a
--      equipe sem expor salario/CPF a quem nao e do RH.
-- ============================================================

create table if not exists public.salas (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  unidade text not null default 'EQ1' check (unidade in ('EQ1', 'EQ2')),
  andar text,
  especialidade text,
  cor text,
  ativa boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.salas_ocupacoes (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references public.salas(id) on delete cascade,
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  rotulo text,
  dia_semana int not null check (dia_semana between 1 and 6),
  periodo int not null check (periodo in (1, 2, 3)),
  horario text,
  observacao text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists salas_oc_idx
  on public.salas_ocupacoes (sala_id, dia_semana, periodo);

create unique index if not exists salas_oc_sem_repeticao
  on public.salas_ocupacoes (sala_id, dia_semana, periodo, colaborador_id)
  where colaborador_id is not null;

alter table public.salas enable row level security;
alter table public.salas_ocupacoes enable row level security;

drop policy if exists salas_select on public.salas;
create policy salas_select on public.salas
  for select to authenticated
  using (public.meu_nivel('salas', 'cadastro') in ('ver', 'editar'));

drop policy if exists salas_write on public.salas;
create policy salas_write on public.salas
  for all to authenticated
  using (public.meu_nivel('salas', 'cadastro') = 'editar')
  with check (public.meu_nivel('salas', 'cadastro') = 'editar');

drop policy if exists salas_oc_select on public.salas_ocupacoes;
create policy salas_oc_select on public.salas_ocupacoes
  for select to authenticated
  using (public.meu_nivel('salas', 'grade') in ('ver', 'editar'));

drop policy if exists salas_oc_write on public.salas_ocupacoes;
create policy salas_oc_write on public.salas_ocupacoes
  for all to authenticated
  using (public.meu_nivel('salas', 'grade') = 'editar')
  with check (public.meu_nivel('salas', 'grade') = 'editar');

drop trigger if exists tg_auditar_salas on public.salas;
create trigger tg_auditar_salas
  after insert or update or delete on public.salas
  for each row execute function public.fn_auditar('salas');

drop trigger if exists tg_auditar_salas_oc on public.salas_ocupacoes;
create trigger tg_auditar_salas_oc
  after insert or update or delete on public.salas_ocupacoes
  for each row execute function public.fn_auditar('salas');

-- Visao enxuta da equipe: so o necessario para a grade e o seletor.
create or replace view public.colaboradores_basico as
  select id, nome, foto_url, cargo
    from public.colaboradores
   where status <> 'desligado';

grant select on public.colaboradores_basico to authenticated;

-- Conferencia
select (select count(*) from public.salas) as salas,
       (select count(*) from public.salas_ocupacoes) as ocupacoes;

-- ============================================================
-- FIM DO 12 - o modulo Salas ja pode usar
-- ============================================================
