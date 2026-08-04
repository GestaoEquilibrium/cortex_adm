-- ============================================================
-- CORTEX GESTAO - 03: MODULO RH E EQUIPE
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 01 e do 02.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- Permissoes por aba do modulo rh:
--   colaboradores -> aba 'colaboradores'
--   faltas e atestados -> aba 'faltas'
--   alertas e pendencias -> aba 'alertas'
-- Se a aba nao tiver regra propria, vale a regra do modulo 'rh'.
-- ============================================================

-- ============================================================
-- 1. TABELAS
-- ============================================================

create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  cargo text,
  setor text,
  regime text,
  unidade text,
  email text,
  telefone text,
  admissao date,
  nascimento date,
  desligamento date,
  salario numeric(12,2),
  status text not null default 'ativo' check (status in ('ativo','ferias','afastado','desligado')),
  observacoes text,
  atualizado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists colaboradores_cpf_unico
  on public.colaboradores (cpf) where cpf is not null and cpf <> '';

create table if not exists public.faltas (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  data date not null,
  tipo text not null default 'falta' check (tipo in ('falta','atraso','saida_antecipada')),
  justificada boolean not null default false,
  motivo text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists faltas_colab_idx on public.faltas (colaborador_id);
create index if not exists faltas_data_idx on public.faltas (data desc);

create table if not exists public.atestados (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  inicio date not null,
  fim date not null,
  dias int,
  cid text,
  observacao text,
  registrado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists atestados_colab_idx on public.atestados (colaborador_id);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade,
  titulo text not null,
  descricao text,
  criticidade text not null default 'atencao' check (criticidade in ('critico','atencao','info')),
  prazo date,
  resolvido boolean not null default false,
  resolvido_em timestamptz,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists alertas_aberto_idx on public.alertas (resolvido, prazo);

create table if not exists public.pendencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade,
  titulo text not null,
  descricao text,
  prazo date,
  concluida boolean not null default false,
  concluida_em timestamptz,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pendencias_aberta_idx on public.pendencias (concluida, prazo);

-- ============================================================
-- 2. TRIGGERS (toque de atualizado_em + auditoria)
-- ============================================================

drop trigger if exists touch_colaboradores on public.colaboradores;
create trigger touch_colaboradores before update on public.colaboradores
  for each row execute function public.fn_touch();

drop trigger if exists aud_colaboradores on public.colaboradores;
create trigger aud_colaboradores after insert or update or delete on public.colaboradores
  for each row execute function public.fn_auditar('rh');

drop trigger if exists aud_faltas on public.faltas;
create trigger aud_faltas after insert or update or delete on public.faltas
  for each row execute function public.fn_auditar('rh');

drop trigger if exists aud_atestados on public.atestados;
create trigger aud_atestados after insert or update or delete on public.atestados
  for each row execute function public.fn_auditar('rh');

drop trigger if exists aud_alertas on public.alertas;
create trigger aud_alertas after insert or update or delete on public.alertas
  for each row execute function public.fn_auditar('rh');

drop trigger if exists aud_pendencias on public.pendencias;
create trigger aud_pendencias after insert or update or delete on public.pendencias
  for each row execute function public.fn_auditar('rh');

-- ============================================================
-- 3. RLS - PERMISSAO POR ABA DO MODULO RH
-- ============================================================

alter table public.colaboradores enable row level security;
alter table public.faltas enable row level security;
alter table public.atestados enable row level security;
alter table public.alertas enable row level security;
alter table public.pendencias enable row level security;

-- COLABORADORES (aba 'colaboradores')
drop policy if exists colaboradores_select on public.colaboradores;
create policy colaboradores_select on public.colaboradores
  for select to authenticated
  using (public.meu_nivel('rh','colaboradores') in ('ver','editar'));

drop policy if exists colaboradores_write on public.colaboradores;
create policy colaboradores_write on public.colaboradores
  for all to authenticated
  using (public.meu_nivel('rh','colaboradores') = 'editar')
  with check (public.meu_nivel('rh','colaboradores') = 'editar');

-- FALTAS (aba 'faltas')
drop policy if exists faltas_select on public.faltas;
create policy faltas_select on public.faltas
  for select to authenticated
  using (public.meu_nivel('rh','faltas') in ('ver','editar'));

drop policy if exists faltas_write on public.faltas;
create policy faltas_write on public.faltas
  for all to authenticated
  using (public.meu_nivel('rh','faltas') = 'editar')
  with check (public.meu_nivel('rh','faltas') = 'editar');

-- ATESTADOS (aba 'faltas')
drop policy if exists atestados_select on public.atestados;
create policy atestados_select on public.atestados
  for select to authenticated
  using (public.meu_nivel('rh','faltas') in ('ver','editar'));

drop policy if exists atestados_write on public.atestados;
create policy atestados_write on public.atestados
  for all to authenticated
  using (public.meu_nivel('rh','faltas') = 'editar')
  with check (public.meu_nivel('rh','faltas') = 'editar');

-- ALERTAS (aba 'alertas')
drop policy if exists alertas_select on public.alertas;
create policy alertas_select on public.alertas
  for select to authenticated
  using (public.meu_nivel('rh','alertas') in ('ver','editar'));

drop policy if exists alertas_write on public.alertas;
create policy alertas_write on public.alertas
  for all to authenticated
  using (public.meu_nivel('rh','alertas') = 'editar')
  with check (public.meu_nivel('rh','alertas') = 'editar');

-- PENDENCIAS (aba 'alertas')
drop policy if exists pendencias_select on public.pendencias;
create policy pendencias_select on public.pendencias
  for select to authenticated
  using (public.meu_nivel('rh','alertas') in ('ver','editar'));

drop policy if exists pendencias_write on public.pendencias;
create policy pendencias_write on public.pendencias
  for all to authenticated
  using (public.meu_nivel('rh','alertas') = 'editar')
  with check (public.meu_nivel('rh','alertas') = 'editar');

-- ============================================================
-- FIM DO 03 - MODULO RH PRONTO PARA RECEBER A EQUIPE
-- ============================================================
