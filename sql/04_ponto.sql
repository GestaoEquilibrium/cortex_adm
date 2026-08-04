-- ============================================================
-- CORTEX GESTAO - 04: MODULO PONTO
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 03.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- Permissao: aba 'ponto' do modulo rh (cai na regra do modulo
-- se a aba nao tiver regra propria).
-- O relogio (ponto.html) usa RPCs publicas validadas por PIN:
-- quem bate ponto nao enxerga nada alem do proprio dia.
-- ============================================================

-- ============================================================
-- 1. COLUNAS NOVAS EM COLABORADORES (PIN do relogio + origem)
-- ============================================================

alter table public.colaboradores add column if not exists pin text;
alter table public.colaboradores add column if not exists origem_ponto_id text;

create unique index if not exists colaboradores_origem_ponto_unico
  on public.colaboradores (origem_ponto_id) where origem_ponto_id is not null;

-- ============================================================
-- 2. TABELAS
-- ============================================================

create table if not exists public.ponto_registros (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  batida timestamptz not null,
  origem text not null default 'relogio' check (origem in ('relogio','manual','importado')),
  obs text,
  editado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ponto_reg_colab_idx on public.ponto_registros (colaborador_id, batida desc);
create index if not exists ponto_reg_batida_idx on public.ponto_registros (batida desc);
create unique index if not exists ponto_reg_unico
  on public.ponto_registros (colaborador_id, batida, tipo);

create table if not exists public.ponto_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references public.colaboradores(id) on delete cascade,
  data date,
  tipo text,
  descricao text,
  dados jsonb,
  origem_id text,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists ponto_oco_origem_unico
  on public.ponto_ocorrencias (origem_id) where origem_id is not null;

-- ============================================================
-- 3. TRIGGERS DE AUDITORIA
-- ============================================================

drop trigger if exists aud_ponto_registros on public.ponto_registros;
create trigger aud_ponto_registros after insert or update or delete on public.ponto_registros
  for each row execute function public.fn_auditar('rh');

drop trigger if exists aud_ponto_ocorrencias on public.ponto_ocorrencias;
create trigger aud_ponto_ocorrencias after insert or update or delete on public.ponto_ocorrencias
  for each row execute function public.fn_auditar('rh');

-- ============================================================
-- 4. RLS (aba 'ponto' do modulo rh)
-- ============================================================

alter table public.ponto_registros enable row level security;
alter table public.ponto_ocorrencias enable row level security;

drop policy if exists ponto_reg_select on public.ponto_registros;
create policy ponto_reg_select on public.ponto_registros
  for select to authenticated
  using (public.meu_nivel('rh','ponto') in ('ver','editar'));

drop policy if exists ponto_reg_write on public.ponto_registros;
create policy ponto_reg_write on public.ponto_registros
  for all to authenticated
  using (public.meu_nivel('rh','ponto') = 'editar')
  with check (public.meu_nivel('rh','ponto') = 'editar');

drop policy if exists ponto_oco_select on public.ponto_ocorrencias;
create policy ponto_oco_select on public.ponto_ocorrencias
  for select to authenticated
  using (public.meu_nivel('rh','ponto') in ('ver','editar'));

drop policy if exists ponto_oco_write on public.ponto_ocorrencias;
create policy ponto_oco_write on public.ponto_ocorrencias
  for all to authenticated
  using (public.meu_nivel('rh','ponto') = 'editar')
  with check (public.meu_nivel('rh','ponto') = 'editar');

-- ============================================================
-- 5. RPCS DO RELOGIO (publicas, validadas por PIN)
-- ============================================================

-- Lista para o dropdown do relogio: so id e nome dos ativos com PIN.
create or replace function public.relogio_colaboradores()
returns table (id uuid, nome text)
language sql security definer stable
set search_path = public
as $$
  select c.id, c.nome
  from public.colaboradores c
  where c.status = 'ativo' and c.pin is not null and c.pin <> ''
  order by c.nome
$$;

-- Bate o ponto: valida PIN, protege contra clique duplo.
create or replace function public.relogio_bater(p_colaborador uuid, p_pin text, p_tipo text)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
  v_ultima timestamptz;
begin
  if p_tipo not in ('entrada','saida') then
    return json_build_object('ok', false, 'erro', 'Tipo invalido.');
  end if;
  select nome into v_nome from public.colaboradores
  where id = p_colaborador and status = 'ativo' and pin = p_pin;
  if v_nome is null then
    return json_build_object('ok', false, 'erro', 'PIN incorreto.');
  end if;
  select max(batida) into v_ultima from public.ponto_registros
  where colaborador_id = p_colaborador;
  if v_ultima is not null and now() - v_ultima < interval '60 seconds' then
    return json_build_object('ok', false, 'erro', 'Calma: registro duplicado em menos de 1 minuto.');
  end if;
  insert into public.ponto_registros (colaborador_id, tipo, batida, origem)
  values (p_colaborador, p_tipo, now(), 'relogio');
  return json_build_object('ok', true, 'nome', v_nome, 'tipo', p_tipo, 'hora', to_char(now() at time zone 'America/Sao_Paulo', 'HH24:MI'));
end
$$;

-- Batidas do proprio dia (para o resumo apos bater), validado por PIN.
create or replace function public.relogio_meu_dia(p_colaborador uuid, p_pin text)
returns json
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_ok int;
  v json;
begin
  select 1 into v_ok from public.colaboradores
  where id = p_colaborador and pin = p_pin;
  if v_ok is null then
    return json_build_object('ok', false, 'erro', 'PIN incorreto.');
  end if;
  select coalesce(json_agg(json_build_object(
           'tipo', r.tipo,
           'hora', to_char(r.batida at time zone 'America/Sao_Paulo', 'HH24:MI'))
           order by r.batida), '[]'::json)
  into v
  from public.ponto_registros r
  where r.colaborador_id = p_colaborador
    and (r.batida at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  return json_build_object('ok', true, 'batidas', v);
end
$$;

grant execute on function public.relogio_colaboradores() to anon;
grant execute on function public.relogio_bater(uuid, text, text) to anon;
grant execute on function public.relogio_meu_dia(uuid, text) to anon;

-- ============================================================
-- FIM DO 04 - PONTO PRONTO; rode o 05 para trazer o historico
-- ============================================================
