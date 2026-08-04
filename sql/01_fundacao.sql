-- ============================================================
-- CORTEX GESTAO - FASE 1: FUNDACAO
-- Banco unico administrativo do Grupo Equilibrium
-- Rodar no SQL Editor de um projeto Supabase NOVO e vazio.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- 1. PERFIS E PESSOAS
-- ============================================================

create table if not exists public.perfis (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  acesso_total boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  email text unique,
  perfil_id uuid references public.perfis(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Permissao por modulo e, opcionalmente, por aba.
-- nivel: 'oculto' | 'ver' | 'editar'
create table if not exists public.permissoes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  modulo text not null,
  aba text,
  nivel text not null check (nivel in ('oculto','ver','editar')),
  created_at timestamptz not null default now()
);

create unique index if not exists permissoes_unicas
  on public.permissoes (perfil_id, modulo, coalesce(aba, ''));

-- ============================================================
-- 2. FUNCOES DE SEGURANCA (security definer + search_path fixo)
-- ============================================================

create or replace function public.get_meu_perfil()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select perfil_id from public.profiles where id = auth.uid() and ativo = true
$$;

create or replace function public.sou_direcao()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select coalesce((
    select p.acesso_total
    from public.profiles pr
    join public.perfis p on p.id = pr.perfil_id
    where pr.id = auth.uid() and pr.ativo = true
  ), false)
$$;

create or replace function public.meu_nivel(p_modulo text, p_aba text default null)
returns text
language plpgsql security definer stable
set search_path = public
as $$
declare
  v text;
begin
  if auth.uid() is null then
    return 'oculto';
  end if;
  if public.sou_direcao() then
    return 'editar';
  end if;
  if p_aba is not null then
    select nivel into v
    from public.permissoes
    where perfil_id = public.get_meu_perfil() and modulo = p_modulo and aba = p_aba;
    if v is not null then
      return v;
    end if;
  end if;
  select nivel into v
  from public.permissoes
  where perfil_id = public.get_meu_perfil() and modulo = p_modulo and aba is null;
  return coalesce(v, 'oculto');
end
$$;

-- ============================================================
-- 3. AUDITORIA (imutavel: ninguem edita nem apaga, nem a Direcao)
-- ============================================================

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_nome text,
  acao text not null,
  modulo text,
  entidade text,
  entidade_id text,
  detalhes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists auditoria_data_idx on public.auditoria (created_at desc);
create index if not exists auditoria_user_idx on public.auditoria (user_id);

-- Trigger generico: grava criar/editar/excluir com antes e depois.
create or replace function public.fn_auditar()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
  v_id text;
  v_det jsonb;
begin
  select nome into v_nome from public.profiles where id = auth.uid();
  if tg_op = 'INSERT' then
    v_id := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'chave', '?');
    v_det := jsonb_build_object('novo', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    v_id := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'chave', '?');
    v_det := jsonb_build_object('antes', to_jsonb(old), 'depois', to_jsonb(new));
  else
    v_id := coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'chave', '?');
    v_det := jsonb_build_object('apagado', to_jsonb(old));
  end if;
  insert into public.auditoria (user_id, user_nome, acao, modulo, entidade, entidade_id, detalhes)
  values (auth.uid(), v_nome, lower(tg_op), tg_argv[0], tg_table_name, v_id, v_det);
  return coalesce(new, old);
end
$$;

-- RPC para o app registrar visualizacoes, downloads, logins e exportacoes.
create or replace function public.registrar_evento(
  p_acao text,
  p_modulo text,
  p_entidade text default null,
  p_entidade_id text default null,
  p_detalhes jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if auth.uid() is null then
    raise exception 'nao autenticado';
  end if;
  if p_acao not in ('visualizar','baixar','login','logout','exportar') then
    raise exception 'acao invalida: %', p_acao;
  end if;
  select nome into v_nome from public.profiles where id = auth.uid();
  insert into public.auditoria (user_id, user_nome, acao, modulo, entidade, entidade_id, detalhes)
  values (auth.uid(), v_nome, p_acao, p_modulo, p_entidade, p_entidade_id, coalesce(p_detalhes, '{}'::jsonb));
end
$$;

-- ============================================================
-- 4. ARQUIVOS - O DRIVE PROPRIO
-- ============================================================

create table if not exists public.pastas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pasta_pai_id uuid references public.pastas(id) on delete cascade,
  restrita boolean not null default false,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pastas_pai_idx on public.pastas (pasta_pai_id);

-- Quais perfis acessam uma pasta restrita (e com qual nivel).
create table if not exists public.pasta_acessos (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references public.pastas(id) on delete cascade,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  nivel text not null check (nivel in ('ver','editar')),
  unique (pasta_id, perfil_id)
);

create table if not exists public.arquivos (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references public.pastas(id) on delete cascade,
  nome text not null,
  storage_path text not null unique,
  tamanho bigint,
  tipo text,
  competencia text,
  enviado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists arquivos_pasta_idx on public.arquivos (pasta_id);

-- Nivel efetivo do usuario numa pasta.
-- Regra: sobe a arvore ate a primeira pasta restrita; quem manda e ela.
-- Se nenhuma pasta do caminho e restrita, vale a permissao do modulo 'arquivos'.
create or replace function public.nivel_pasta(p_pasta_id uuid)
returns text
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_id uuid := p_pasta_id;
  v_restrita boolean;
  v_pai uuid;
  v_nivel text;
  i int := 0;
begin
  if auth.uid() is null then
    return 'oculto';
  end if;
  if public.sou_direcao() then
    return 'editar';
  end if;
  while v_id is not null and i < 30 loop
    select restrita, pasta_pai_id into v_restrita, v_pai
    from public.pastas where id = v_id;
    if not found then
      return 'oculto';
    end if;
    if v_restrita then
      select nivel into v_nivel
      from public.pasta_acessos
      where pasta_id = v_id and perfil_id = public.get_meu_perfil();
      return coalesce(v_nivel, 'oculto');
    end if;
    v_id := v_pai;
    i := i + 1;
  end loop;
  return public.meu_nivel('arquivos', null);
end
$$;

-- ============================================================
-- 5. MODELOS, LINKS, INSTRUCOES E CONFIGURACOES
-- ============================================================

create table if not exists public.modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  categoria text,
  storage_path text unique,
  atualizado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.cortex_links (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  url text not null default '',
  cor text not null default '#F97316',
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.instrucoes (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  titulo text not null,
  conteudo text not null default '',
  ordem int not null default 0,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.configuracoes (
  chave text primary key,
  valor jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

-- Toque automatico de atualizado_em.
create or replace function public.fn_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  return new;
end
$$;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Perfil nasce sozinho no signup (sem perfil atribuido = nao ve nada).
create or replace function public.fn_novo_usuario()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_novo_usuario();

-- Auditoria de escrita em todas as tabelas da fundacao.
drop trigger if exists aud_perfis on public.perfis;
create trigger aud_perfis after insert or update or delete on public.perfis
  for each row execute function public.fn_auditar('configuracoes');

drop trigger if exists aud_profiles on public.profiles;
create trigger aud_profiles after update or delete on public.profiles
  for each row execute function public.fn_auditar('configuracoes');

drop trigger if exists aud_permissoes on public.permissoes;
create trigger aud_permissoes after insert or update or delete on public.permissoes
  for each row execute function public.fn_auditar('configuracoes');

drop trigger if exists aud_pastas on public.pastas;
create trigger aud_pastas after insert or update or delete on public.pastas
  for each row execute function public.fn_auditar('arquivos');

drop trigger if exists aud_pasta_acessos on public.pasta_acessos;
create trigger aud_pasta_acessos after insert or update or delete on public.pasta_acessos
  for each row execute function public.fn_auditar('arquivos');

drop trigger if exists aud_arquivos on public.arquivos;
create trigger aud_arquivos after insert or update or delete on public.arquivos
  for each row execute function public.fn_auditar('arquivos');

drop trigger if exists aud_modelos on public.modelos;
create trigger aud_modelos after insert or update or delete on public.modelos
  for each row execute function public.fn_auditar('modelos');

drop trigger if exists aud_cortex_links on public.cortex_links;
create trigger aud_cortex_links after insert or update or delete on public.cortex_links
  for each row execute function public.fn_auditar('outros_cortex');

drop trigger if exists aud_instrucoes on public.instrucoes;
create trigger aud_instrucoes after insert or update or delete on public.instrucoes
  for each row execute function public.fn_auditar('instrucoes');

drop trigger if exists aud_configuracoes on public.configuracoes;
create trigger aud_configuracoes after insert or update or delete on public.configuracoes
  for each row execute function public.fn_auditar('configuracoes');

drop trigger if exists touch_arquivos on public.arquivos;
create trigger touch_arquivos before update on public.arquivos
  for each row execute function public.fn_touch();

drop trigger if exists touch_modelos on public.modelos;
create trigger touch_modelos before update on public.modelos
  for each row execute function public.fn_touch();

drop trigger if exists touch_instrucoes on public.instrucoes;
create trigger touch_instrucoes before update on public.instrucoes
  for each row execute function public.fn_touch();

drop trigger if exists touch_configuracoes on public.configuracoes;
create trigger touch_configuracoes before update on public.configuracoes
  for each row execute function public.fn_touch();

-- ============================================================
-- 7. RLS - AS PERMISSOES VALEM NO BANCO
-- ============================================================

alter table public.perfis enable row level security;
alter table public.profiles enable row level security;
alter table public.permissoes enable row level security;
alter table public.auditoria enable row level security;
alter table public.pastas enable row level security;
alter table public.pasta_acessos enable row level security;
alter table public.arquivos enable row level security;
alter table public.modelos enable row level security;
alter table public.cortex_links enable row level security;
alter table public.instrucoes enable row level security;
alter table public.configuracoes enable row level security;

-- PERFIS: todo autenticado le (a interface precisa dos nomes); so quem gerencia configuracoes escreve.
drop policy if exists perfis_select on public.perfis;
create policy perfis_select on public.perfis
  for select to authenticated using (true);

drop policy if exists perfis_write on public.perfis;
create policy perfis_write on public.perfis
  for all to authenticated
  using (public.sou_direcao() or public.meu_nivel('configuracoes') = 'editar')
  with check (public.sou_direcao() or public.meu_nivel('configuracoes') = 'editar');

-- PROFILES: cada um ve o proprio; gestao de configuracoes ve e edita todos.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.sou_direcao() or public.meu_nivel('configuracoes') in ('ver','editar'));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.sou_direcao() or public.meu_nivel('configuracoes') = 'editar')
  with check (public.sou_direcao() or public.meu_nivel('configuracoes') = 'editar');

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.sou_direcao());

-- PERMISSOES: cada um le as do proprio perfil (para montar o menu); gestao le e escreve todas.
drop policy if exists permissoes_select on public.permissoes;
create policy permissoes_select on public.permissoes
  for select to authenticated
  using (
    perfil_id = public.get_meu_perfil()
    or public.sou_direcao()
    or public.meu_nivel('configuracoes') in ('ver','editar')
  );

drop policy if exists permissoes_write on public.permissoes;
create policy permissoes_write on public.permissoes
  for all to authenticated
  using (public.sou_direcao() or public.meu_nivel('configuracoes') = 'editar')
  with check (public.sou_direcao() or public.meu_nivel('configuracoes') = 'editar');

-- AUDITORIA: quem tem o modulo le; qualquer autenticado insere o proprio evento;
-- ninguem altera nem apaga (nao existem policies de update/delete).
drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria
  for select to authenticated
  using (public.meu_nivel('auditoria') in ('ver','editar'));

drop policy if exists auditoria_insert on public.auditoria;
create policy auditoria_insert on public.auditoria
  for insert to authenticated
  with check (user_id = auth.uid());

-- PASTAS: o nivel efetivo decide; criar exige editar na pasta pai (ou no modulo, na raiz).
drop policy if exists pastas_select on public.pastas;
create policy pastas_select on public.pastas
  for select to authenticated
  using (public.nivel_pasta(id) in ('ver','editar'));

drop policy if exists pastas_insert on public.pastas;
create policy pastas_insert on public.pastas
  for insert to authenticated
  with check (
    (pasta_pai_id is null and (public.sou_direcao() or public.meu_nivel('arquivos') = 'editar'))
    or (pasta_pai_id is not null and public.nivel_pasta(pasta_pai_id) = 'editar')
  );

drop policy if exists pastas_update on public.pastas;
create policy pastas_update on public.pastas
  for update to authenticated
  using (public.nivel_pasta(id) = 'editar')
  with check (public.nivel_pasta(id) = 'editar');

drop policy if exists pastas_delete on public.pastas;
create policy pastas_delete on public.pastas
  for delete to authenticated
  using (public.nivel_pasta(id) = 'editar');

-- PASTA_ACESSOS: quem edita a pasta gerencia o acesso dela.
drop policy if exists pasta_acessos_all on public.pasta_acessos;
create policy pasta_acessos_all on public.pasta_acessos
  for all to authenticated
  using (public.nivel_pasta(pasta_id) = 'editar')
  with check (public.nivel_pasta(pasta_id) = 'editar');

-- ARQUIVOS: herdam o nivel da pasta.
drop policy if exists arquivos_select on public.arquivos;
create policy arquivos_select on public.arquivos
  for select to authenticated
  using (public.nivel_pasta(pasta_id) in ('ver','editar'));

drop policy if exists arquivos_insert on public.arquivos;
create policy arquivos_insert on public.arquivos
  for insert to authenticated
  with check (public.nivel_pasta(pasta_id) = 'editar' and enviado_por = auth.uid());

drop policy if exists arquivos_update on public.arquivos;
create policy arquivos_update on public.arquivos
  for update to authenticated
  using (public.nivel_pasta(pasta_id) = 'editar')
  with check (public.nivel_pasta(pasta_id) = 'editar');

drop policy if exists arquivos_delete on public.arquivos;
create policy arquivos_delete on public.arquivos
  for delete to authenticated
  using (public.nivel_pasta(pasta_id) = 'editar');

-- MODELOS: pelo modulo.
drop policy if exists modelos_select on public.modelos;
create policy modelos_select on public.modelos
  for select to authenticated
  using (public.meu_nivel('modelos') in ('ver','editar'));

drop policy if exists modelos_write on public.modelos;
create policy modelos_write on public.modelos
  for all to authenticated
  using (public.meu_nivel('modelos') = 'editar')
  with check (public.meu_nivel('modelos') = 'editar');

-- OUTROS CORTEX: pelo modulo.
drop policy if exists cortex_links_select on public.cortex_links;
create policy cortex_links_select on public.cortex_links
  for select to authenticated
  using (public.meu_nivel('outros_cortex') in ('ver','editar'));

drop policy if exists cortex_links_write on public.cortex_links;
create policy cortex_links_write on public.cortex_links
  for all to authenticated
  using (public.meu_nivel('outros_cortex') = 'editar')
  with check (public.meu_nivel('outros_cortex') = 'editar');

-- INSTRUCOES: pelo modulo.
drop policy if exists instrucoes_select on public.instrucoes;
create policy instrucoes_select on public.instrucoes
  for select to authenticated
  using (public.meu_nivel('instrucoes') in ('ver','editar'));

drop policy if exists instrucoes_write on public.instrucoes;
create policy instrucoes_write on public.instrucoes
  for all to authenticated
  using (public.meu_nivel('instrucoes') = 'editar')
  with check (public.meu_nivel('instrucoes') = 'editar');

-- CONFIGURACOES: somente Direcao.
drop policy if exists configuracoes_all on public.configuracoes;
create policy configuracoes_all on public.configuracoes
  for all to authenticated
  using (public.sou_direcao())
  with check (public.sou_direcao());

-- ============================================================
-- 8. STORAGE - BUCKETS PRIVADOS
-- Caminho dos arquivos do drive: {pasta_id}/{uuid}_{nome}
-- ============================================================

insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('modelos', 'modelos', false)
on conflict (id) do nothing;

drop policy if exists storage_arquivos_select on storage.objects;
create policy storage_arquivos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'arquivos'
    and case
      when name ~ '^[0-9a-fA-F-]{36}/'
      then public.nivel_pasta(split_part(name, '/', 1)::uuid) in ('ver','editar')
      else public.sou_direcao()
    end
  );

drop policy if exists storage_arquivos_insert on storage.objects;
create policy storage_arquivos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'arquivos'
    and case
      when name ~ '^[0-9a-fA-F-]{36}/'
      then public.nivel_pasta(split_part(name, '/', 1)::uuid) = 'editar'
      else public.sou_direcao()
    end
  );

drop policy if exists storage_arquivos_delete on storage.objects;
create policy storage_arquivos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'arquivos'
    and case
      when name ~ '^[0-9a-fA-F-]{36}/'
      then public.nivel_pasta(split_part(name, '/', 1)::uuid) = 'editar'
      else public.sou_direcao()
    end
  );

drop policy if exists storage_modelos_select on storage.objects;
create policy storage_modelos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'modelos' and public.meu_nivel('modelos') in ('ver','editar'));

drop policy if exists storage_modelos_write on storage.objects;
create policy storage_modelos_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'modelos' and public.meu_nivel('modelos') = 'editar');

drop policy if exists storage_modelos_delete on storage.objects;
create policy storage_modelos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'modelos' and public.meu_nivel('modelos') = 'editar');

-- ============================================================
-- 9. DADOS INICIAIS
-- ============================================================

insert into public.perfis (nome, descricao, acesso_total)
select 'Direcao', 'Acesso total a todos os modulos e configuracoes', true
where not exists (select 1 from public.perfis where nome = 'Direcao');

insert into public.perfis (nome, descricao)
select 'Coordenacao', 'Coordenacao do grupo'
where not exists (select 1 from public.perfis where nome = 'Coordenacao');

insert into public.perfis (nome, descricao)
select 'Financeiro', 'Equipe administrativa e financeira'
where not exists (select 1 from public.perfis where nome = 'Financeiro');

insert into public.perfis (nome, descricao)
select 'Recepcao', 'Equipe de recepcao e atendimento'
where not exists (select 1 from public.perfis where nome = 'Recepcao');

insert into public.perfis (nome, descricao)
select 'Terapeutas', 'Equipe clinica e terapeutica'
where not exists (select 1 from public.perfis where nome = 'Terapeutas');

insert into public.configuracoes (chave, valor)
values ('sistema', jsonb_build_object('nome', 'CORTEX Gestao', 'fase', 1, 'tema', 'branco-laranja'))
on conflict (chave) do nothing;

insert into public.cortex_links (nome, descricao, url, cor, ordem)
select 'CORTEX Clinico', 'Configure a URL nas configuracoes', '', '#2F6FED', 1
where not exists (select 1 from public.cortex_links where nome = 'CORTEX Clinico');

insert into public.cortex_links (nome, descricao, url, cor, ordem)
select 'CORTEX ABA', 'Configure a URL nas configuracoes', '', '#7C4DFF', 2
where not exists (select 1 from public.cortex_links where nome = 'CORTEX ABA');

insert into public.cortex_links (nome, descricao, url, cor, ordem)
select 'Infinity', 'Financeiro do grupo - configure a URL', '', '#1968B3', 3
where not exists (select 1 from public.cortex_links where nome = 'Infinity');

insert into public.instrucoes (modulo, titulo, conteudo, ordem)
select 'painel', 'Bem-vindo ao CORTEX Gestao',
  'Sistema administrativo unico do Grupo Equilibrium. Use a barra lateral para navegar. O que voce ve aqui depende do seu perfil de acesso, definido pela Direcao.', 1
where not exists (select 1 from public.instrucoes where modulo = 'painel' and titulo = 'Bem-vindo ao CORTEX Gestao');

-- ============================================================
-- FIM DA FASE 1
-- Proximo passo: criar seu usuario em Authentication e rodar 02_diretor.sql
-- ============================================================
