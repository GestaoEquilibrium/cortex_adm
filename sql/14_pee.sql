-- ============================================================
-- CORTEX GESTAO - 14: PEE (PADRAO EQUILIBRIUM DE EXCELENCIA)
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 01.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- O que faz:
--   1. pee_pastas: as pastas dentro de cada caderno (0 a 5).
--   2. pee_docs: os documentos do padrao - codigo PEE-N-NNN,
--      titulo, versao, situacao (publicado / em elaboracao /
--      em revisao) e o texto integral.
--   3. pee_vencimentos: licencas e programas obrigatorios com
--      data de vencimento e alerta automatico na tela.
--   4. Permissoes por aba ('cadernos' e 'vencimentos') nos
--      niveis ver/editar, e auditoria em tudo.
-- ============================================================

create table if not exists public.pee_pastas (
  id uuid primary key default gen_random_uuid(),
  caderno int not null check (caderno between 0 and 5),
  nome text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pee_docs (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references public.pee_pastas(id) on delete cascade,
  codigo text,
  titulo text not null,
  versao text not null default '1.0',
  situacao text not null default 'elaboracao'
    check (situacao in ('publicado', 'elaboracao', 'revisao')),
  texto text,
  atualizado_por uuid references public.profiles(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists pee_docs_pasta_idx on public.pee_docs (pasta_id);

create table if not exists public.pee_vencimentos (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  orgao text,
  vencimento date,
  observacao text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pee_pastas enable row level security;
alter table public.pee_docs enable row level security;
alter table public.pee_vencimentos enable row level security;

drop policy if exists pee_pastas_select on public.pee_pastas;
create policy pee_pastas_select on public.pee_pastas
  for select to authenticated
  using (public.meu_nivel('pee', 'cadernos') in ('ver', 'editar'));

drop policy if exists pee_pastas_write on public.pee_pastas;
create policy pee_pastas_write on public.pee_pastas
  for all to authenticated
  using (public.meu_nivel('pee', 'cadernos') = 'editar')
  with check (public.meu_nivel('pee', 'cadernos') = 'editar');

drop policy if exists pee_docs_select on public.pee_docs;
create policy pee_docs_select on public.pee_docs
  for select to authenticated
  using (public.meu_nivel('pee', 'cadernos') in ('ver', 'editar'));

drop policy if exists pee_docs_write on public.pee_docs;
create policy pee_docs_write on public.pee_docs
  for all to authenticated
  using (public.meu_nivel('pee', 'cadernos') = 'editar')
  with check (public.meu_nivel('pee', 'cadernos') = 'editar');

drop policy if exists pee_venc_select on public.pee_vencimentos;
create policy pee_venc_select on public.pee_vencimentos
  for select to authenticated
  using (public.meu_nivel('pee', 'vencimentos') in ('ver', 'editar'));

drop policy if exists pee_venc_write on public.pee_vencimentos;
create policy pee_venc_write on public.pee_vencimentos
  for all to authenticated
  using (public.meu_nivel('pee', 'vencimentos') = 'editar')
  with check (public.meu_nivel('pee', 'vencimentos') = 'editar');

drop trigger if exists tg_auditar_pee_pastas on public.pee_pastas;
create trigger tg_auditar_pee_pastas
  after insert or update or delete on public.pee_pastas
  for each row execute function public.fn_auditar('pee');

drop trigger if exists tg_auditar_pee_docs on public.pee_docs;
create trigger tg_auditar_pee_docs
  after insert or update or delete on public.pee_docs
  for each row execute function public.fn_auditar('pee');

drop trigger if exists tg_auditar_pee_venc on public.pee_vencimentos;
create trigger tg_auditar_pee_venc
  after insert or update or delete on public.pee_vencimentos
  for each row execute function public.fn_auditar('pee');

-- Conferencia
select (select count(*) from public.pee_pastas) as pastas,
       (select count(*) from public.pee_docs) as documentos,
       (select count(*) from public.pee_vencimentos) as vencimentos;

-- ============================================================
-- FIM DO 14 - o modulo PEE ja pode usar
-- ============================================================
