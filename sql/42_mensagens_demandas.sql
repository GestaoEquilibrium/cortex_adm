-- ============================================================
-- CORTEX Gestão · SQL 42 — Mensagens + Demandas com "visto"
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 41.
-- Idempotente: pode rodar mais de uma vez sem quebrar e nunca
-- apaga mensagem nem demanda existente.
--
-- O que faz:
--  1. DEMANDAS
--     - visto_em: o sistema marca a data e hora em que a pessoa
--       designada abriu a aba Demandas pela primeira vez depois
--       de receber a demanda. Trocou o responsável? Volta a ser
--       "nova" para quem recebeu.
--     - Concluir: SOMENTE a pessoa designada (concluida_por fica
--       gravado). Reabrir: a pessoa designada ou quem edita o
--       módulo. A trava está no banco (trigger), não só na tela.
--     - A pessoa designada sempre enxerga as próprias demandas,
--       mesmo sem permissão no módulo.
--  2. MENSAGENS (módulo novo, aberto a todo login ativo)
--     - Conversas diretas (1 a 1), grupos e a conversa de cada
--       demanda (aberta direto do card da demanda).
--     - Só quem participa da conversa lê as mensagens — nem a
--       Direção lê conversa da qual não faz parte.
--     - Mensagem não se edita nem se apaga: o histórico é o
--       próprio registro.
--     - Contadores para as bolinhas vermelhas da sidebar:
--       meus_avisos() = mensagens não lidas + demandas novas.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Quem sou eu no cadastro (login -> prestador, sprint 19)
-- ------------------------------------------------------------
create or replace function public.msg_meu_colab()
returns uuid
language sql security definer stable
set search_path = public
as $$
  select colaborador_id from public.profiles where id = auth.uid() and ativo = true
$$;

create or replace function public.msg_exigir_login()
returns void
language plpgsql security definer stable
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and ativo = true) then
    raise exception 'Faça login novamente.' using errcode = '42501';
  end if;
end
$$;

-- ============================================================
-- 1. DEMANDAS: visto, conclusão pela pessoa designada
-- ============================================================

alter table public.demandas add column if not exists visto_em timestamptz;
alter table public.demandas add column if not exists concluida_por uuid references public.profiles(id) on delete set null;

-- Guarda: status, conclusão e visto só mudam pelas funções
-- oficiais (que acendem a chave cg.demanda_rpc na transação).
create or replace function public.fn_demandas_guarda()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_rpc boolean := coalesce(current_setting('cg.demanda_rpc', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if not v_rpc then
      new.status := 'aberta';
      new.concluida_em := null;
      new.concluida_por := null;
      new.visto_em := null;
    end if;
    return new;
  end if;

  if not v_rpc then
    if new.status is distinct from old.status or new.concluida_em is distinct from old.concluida_em then
      raise exception 'Só a pessoa designada conclui a demanda.' using errcode = '42501';
    end if;
    new.concluida_por := old.concluida_por;
    new.visto_em := old.visto_em;
  end if;

  -- Trocou o responsável: para quem recebeu, a demanda é nova.
  if new.colaborador_id is distinct from old.colaborador_id then
    new.visto_em := null;
  end if;
  return new;
end
$$;

drop trigger if exists demandas_guarda on public.demandas;
create trigger demandas_guarda before insert or update on public.demandas
  for each row execute function public.fn_demandas_guarda();

-- Quem pode enxergar uma demanda (mesma regra da lista)
create or replace function public.msg_pode_ver_demanda(p_demanda uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
      from public.demandas d
      join public.colaboradores c on c.id = d.colaborador_id
     where d.id = p_demanda
       and (
         public.meu_nivel('demandas') = 'editar'
         or d.colaborador_id = public.msg_meu_colab()
         or d.criado_por = auth.uid()
         or (
           public.meu_nivel('demandas') = 'ver'
           and exists (
             select 1
               from public.profiles pr
               join public.colaboradores meu on meu.id = pr.colaborador_id
              where pr.id = auth.uid()
                and meu.setor is not null
                and meu.setor = c.setor
           )
         )
       )
  )
$$;

-- A pessoa abriu a aba Demandas: marca como vistas as dela.
create or replace function public.demandas_marcar_vistas()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_c uuid := public.msg_meu_colab();
  v_n int;
begin
  if v_c is null then
    return 0;
  end if;
  perform set_config('cg.demanda_rpc', 'on', true);
  update public.demandas
     set visto_em = now()
   where colaborador_id = v_c
     and visto_em is null;
  get diagnostics v_n = row_count;
  perform set_config('cg.demanda_rpc', '', true);
  return v_n;
end
$$;

-- Concluir (só a pessoa designada) / reabrir (ela ou quem edita)
create or replace function public.demanda_concluir(p_id uuid, p_concluir boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_c uuid := public.msg_meu_colab();
  v_d public.demandas%rowtype;
  v_nome text;
begin
  perform public.msg_exigir_login();
  select * into v_d from public.demandas where id = p_id;
  if not found then
    raise exception 'Demanda não encontrada.';
  end if;
  select nome into v_nome from public.colaboradores where id = v_d.colaborador_id;

  if p_concluir then
    if v_c is null or v_d.colaborador_id <> v_c then
      raise exception 'Só % pode concluir esta demanda.', coalesce(v_nome, 'a pessoa designada') using errcode = '42501';
    end if;
  else
    if not ((v_c is not null and v_d.colaborador_id = v_c) or public.meu_nivel('demandas') = 'editar') then
      raise exception 'Só % ou quem edita Demandas pode reabrir.', coalesce(v_nome, 'a pessoa designada') using errcode = '42501';
    end if;
  end if;

  perform set_config('cg.demanda_rpc', 'on', true);
  update public.demandas set
    status        = case when p_concluir then 'concluida' else 'aberta' end,
    concluida_em  = case when p_concluir then now() else null end,
    concluida_por = case when p_concluir then auth.uid() else null end,
    visto_em      = case when p_concluir then coalesce(visto_em, now()) else visto_em end,
    atualizado_em = now()
  where id = p_id;
  perform set_config('cg.demanda_rpc', '', true);
end
$$;

-- ============================================================
-- 2. MENSAGENS
-- ============================================================

create table if not exists public.conversas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('direta', 'grupo', 'demanda')),
  titulo text,
  chave_direta text unique,
  demanda_id uuid unique references public.demandas(id) on delete set null,
  criado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  ultima_em timestamptz not null default now()
);

comment on table public.conversas is 'Mensagens internas: conversas diretas, grupos e conversa de cada demanda.';

create table if not exists public.conversa_membros (
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lida_em timestamptz not null default now(),
  entrou_em timestamptz not null default now(),
  primary key (conversa_id, profile_id)
);

create index if not exists conversa_membros_profile_idx on public.conversa_membros (profile_id);

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.conversas(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  texto text not null,
  sistema boolean not null default false,
  created_at timestamptz not null default now(),
  constraint mensagens_texto_ck check (char_length(btrim(texto)) between 1 and 4000)
);

create index if not exists mensagens_conversa_idx on public.mensagens (conversa_id, created_at desc);

create or replace function public.msg_sou_membro(p_conversa uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.conversa_membros
     where conversa_id = p_conversa and profile_id = auth.uid()
  )
$$;

-- RLS: leitura só para quem participa. Escrita só pelas funções.
alter table public.conversas enable row level security;
alter table public.conversa_membros enable row level security;
alter table public.mensagens enable row level security;

drop policy if exists conversas_sel on public.conversas;
create policy conversas_sel on public.conversas for select to authenticated
  using (public.msg_sou_membro(id));

drop policy if exists conversa_membros_sel on public.conversa_membros;
create policy conversa_membros_sel on public.conversa_membros for select to authenticated
  using (public.msg_sou_membro(conversa_id));

drop policy if exists mensagens_sel on public.mensagens;
create policy mensagens_sel on public.mensagens for select to authenticated
  using (public.msg_sou_membro(conversa_id));

grant select on public.conversas, public.conversa_membros, public.mensagens to authenticated;
revoke insert, update, delete on public.conversas, public.conversa_membros, public.mensagens from authenticated, anon;

-- Garante na conversa da demanda: responsável atual e quem criou
create or replace function public.msg_membros_demanda(p_conversa uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_dem uuid;
begin
  select demanda_id into v_dem from public.conversas where id = p_conversa and tipo = 'demanda';
  if v_dem is null then
    return;
  end if;
  insert into public.conversa_membros (conversa_id, profile_id)
  select p_conversa, p.id
    from public.demandas d
    join public.profiles p on p.ativo = true and (p.colaborador_id = d.colaborador_id or p.id = d.criado_por)
   where d.id = v_dem
  on conflict do nothing;
end
$$;

-- Lista de pessoas para iniciar conversa
create or replace function public.mensagens_contatos()
returns table (id uuid, nome text, foto_url text, cargo text, setor text)
language plpgsql security definer stable
set search_path = public
as $$
begin
  perform public.msg_exigir_login();
  return query
    select p.id, coalesce(c.nome, p.nome, p.email), c.foto_url, c.cargo, c.setor
      from public.profiles p
      left join public.colaboradores c on c.id = p.colaborador_id
     where p.ativo = true and p.id <> auth.uid()
     order by 2;
end
$$;

-- Conversa direta: acha ou cria (uma por par de pessoas)
create or replace function public.conversa_direta(p_outro uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_eu uuid := auth.uid();
  v_chave text;
  v_id uuid;
begin
  perform public.msg_exigir_login();
  if p_outro is null or p_outro = v_eu then
    raise exception 'Escolha outra pessoa.';
  end if;
  if not exists (select 1 from public.profiles where id = p_outro and ativo = true) then
    raise exception 'Essa pessoa não tem login ativo.';
  end if;
  v_chave := least(v_eu::text, p_outro::text) || ':' || greatest(v_eu::text, p_outro::text);
  insert into public.conversas (tipo, chave_direta, criado_por)
  values ('direta', v_chave, v_eu)
  on conflict (chave_direta) do nothing;
  select id into v_id from public.conversas where chave_direta = v_chave;
  insert into public.conversa_membros (conversa_id, profile_id)
  values (v_id, v_eu), (v_id, p_outro)
  on conflict do nothing;
  return v_id;
end
$$;

-- Grupo: cria com nome e participantes (quem cria entra junto)
create or replace function public.conversa_grupo_criar(p_titulo text, p_membros uuid[])
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_eu uuid := auth.uid();
  v_tit text := btrim(coalesce(p_titulo, ''));
  v_id uuid;
  v_n int;
  v_nome text;
begin
  perform public.msg_exigir_login();
  if char_length(v_tit) < 2 or char_length(v_tit) > 80 then
    raise exception 'Dê um nome ao grupo (2 a 80 letras).';
  end if;
  insert into public.conversas (tipo, titulo, criado_por) values ('grupo', v_tit, v_eu) returning id into v_id;
  insert into public.conversa_membros (conversa_id, profile_id) values (v_id, v_eu);
  insert into public.conversa_membros (conversa_id, profile_id)
  select v_id, p.id from public.profiles p
   where p.ativo = true and p.id = any (coalesce(p_membros, '{}')) and p.id <> v_eu
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Escolha pelo menos uma pessoa para o grupo.';
  end if;
  select nome into v_nome from public.profiles where id = v_eu;
  insert into public.mensagens (conversa_id, autor_id, texto, sistema)
  values (v_id, null, coalesce(v_nome, 'Alguém') || ' criou o grupo "' || v_tit || '".', true);
  return v_id;
end
$$;

-- Grupo: adicionar pessoas (qualquer participante)
create or replace function public.conversa_grupo_adicionar(p_conversa uuid, p_membros uuid[])
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_n int;
  v_nome text;
  v_novos text;
begin
  perform public.msg_exigir_login();
  if not public.msg_sou_membro(p_conversa)
     or not exists (select 1 from public.conversas where id = p_conversa and tipo = 'grupo') then
    raise exception 'Só quem participa do grupo pode adicionar pessoas.' using errcode = '42501';
  end if;
  select string_agg(coalesce(p.nome, p.email), ', ' order by p.nome) into v_novos
    from public.profiles p
   where p.ativo = true and p.id = any (coalesce(p_membros, '{}'))
     and not exists (select 1 from public.conversa_membros m where m.conversa_id = p_conversa and m.profile_id = p.id);
  insert into public.conversa_membros (conversa_id, profile_id)
  select p_conversa, p.id from public.profiles p
   where p.ativo = true and p.id = any (coalesce(p_membros, '{}'))
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    select nome into v_nome from public.profiles where id = auth.uid();
    insert into public.mensagens (conversa_id, autor_id, texto, sistema)
    values (p_conversa, null, coalesce(v_nome, 'Alguém') || ' adicionou ' || v_novos || '.', true);
    update public.conversas set ultima_em = now() where id = p_conversa;
  end if;
  return v_n;
end
$$;

-- Conversa da demanda: acha ou cria (uma por demanda)
create or replace function public.conversa_demanda(p_demanda uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_tit text;
  v_nome text;
begin
  perform public.msg_exigir_login();
  if not public.msg_pode_ver_demanda(p_demanda) then
    raise exception 'Você não tem acesso a esta demanda.' using errcode = '42501';
  end if;
  select id into v_id from public.conversas where demanda_id = p_demanda;
  if v_id is null then
    select titulo into v_tit from public.demandas where id = p_demanda;
    insert into public.conversas (tipo, titulo, demanda_id, criado_por)
    values ('demanda', v_tit, p_demanda, auth.uid())
    on conflict (demanda_id) do nothing
    returning id into v_id;
    if v_id is null then
      select id into v_id from public.conversas where demanda_id = p_demanda;
    else
      select nome into v_nome from public.profiles where id = auth.uid();
      insert into public.mensagens (conversa_id, autor_id, texto, sistema)
      values (v_id, null, coalesce(v_nome, 'Alguém') || ' abriu a conversa da demanda "' || coalesce(v_tit, '') || '".', true);
    end if;
  end if;
  insert into public.conversa_membros (conversa_id, profile_id) values (v_id, auth.uid())
  on conflict do nothing;
  perform public.msg_membros_demanda(v_id);
  return v_id;
end
$$;

-- Lista de conversas de quem está logado
create or replace function public.conversas_listar()
returns table (
  id uuid, tipo text, titulo text, subtitulo text, foto_url text, outro_id uuid,
  demanda_id uuid, demanda_status text, demanda_prioridade text,
  ultima_texto text, ultima_autor text, ultima_sistema boolean, ultima_em timestamptz,
  nao_lidas integer, membros integer
)
language plpgsql security definer stable
set search_path = public
as $$
begin
  perform public.msg_exigir_login();
  return query
  with minhas as (
    select m.conversa_id, m.lida_em from public.conversa_membros m where m.profile_id = auth.uid()
  )
  select
    cv.id,
    cv.tipo,
    case cv.tipo
      when 'direta' then coalesce(oc.nome, op.nome, op.email, 'Conversa')
      when 'demanda' then coalesce(d.titulo, cv.titulo, 'Demanda')
      else coalesce(cv.titulo, 'Grupo')
    end,
    case cv.tipo
      when 'direta' then nullif(concat_ws(' · ', oc.cargo, oc.setor), '')
      when 'demanda' then 'Demanda' || coalesce(' · ' || dc.nome, '')
      else (select count(*) from public.conversa_membros x where x.conversa_id = cv.id)::text || ' participantes'
    end,
    case when cv.tipo = 'direta' then oc.foto_url end,
    op.id,
    cv.demanda_id,
    d.status,
    d.prioridade,
    ult.texto,
    ult.autor,
    ult.sistema,
    coalesce(ult.created_at, cv.ultima_em),
    (select count(*)::int from public.mensagens mm
      where mm.conversa_id = cv.id and mm.created_at > mi.lida_em
        and mm.sistema = false and mm.autor_id is distinct from auth.uid()),
    (select count(*)::int from public.conversa_membros x where x.conversa_id = cv.id)
  from minhas mi
  join public.conversas cv on cv.id = mi.conversa_id
  left join lateral (
    select p.id, p.nome, p.email, p.colaborador_id
      from public.conversa_membros x join public.profiles p on p.id = x.profile_id
     where cv.tipo = 'direta' and x.conversa_id = cv.id and x.profile_id <> auth.uid()
     limit 1
  ) op on true
  left join public.colaboradores oc on oc.id = op.colaborador_id
  left join public.demandas d on d.id = cv.demanda_id
  left join public.colaboradores dc on dc.id = d.colaborador_id
  left join lateral (
    select mm.texto, mm.sistema, mm.created_at, pa.nome as autor
      from public.mensagens mm left join public.profiles pa on pa.id = mm.autor_id
     where mm.conversa_id = cv.id
     order by mm.created_at desc
     limit 1
  ) ult on true
  order by coalesce(ult.created_at, cv.ultima_em) desc;
end
$$;

-- Cabeçalho da conversa: participantes, demanda e até onde os
-- outros já leram (para o ✓✓ das mensagens)
create or replace function public.conversa_detalhe(p_conversa uuid)
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
declare
  v jsonb;
begin
  perform public.msg_exigir_login();
  if not public.msg_sou_membro(p_conversa) then
    raise exception 'Você não participa desta conversa.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id', cv.id,
    'tipo', cv.tipo,
    'titulo', cv.titulo,
    'lidos_ate', (select min(x.lida_em) from public.conversa_membros x
                   where x.conversa_id = cv.id and x.profile_id <> auth.uid()),
    'membros', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'nome', coalesce(c.nome, p.nome, p.email),
               'foto_url', c.foto_url, 'cargo', c.cargo, 'setor', c.setor)
             order by coalesce(c.nome, p.nome))
        from public.conversa_membros x
        join public.profiles p on p.id = x.profile_id
        left join public.colaboradores c on c.id = p.colaborador_id
       where x.conversa_id = cv.id), '[]'::jsonb),
    'demanda', (
      select jsonb_build_object(
               'id', d.id, 'titulo', d.titulo, 'descricao', d.descricao,
               'prazo', d.prazo, 'status', d.status, 'prioridade', d.prioridade,
               'responsavel', dc.nome, 'visto_em', d.visto_em, 'concluida_em', d.concluida_em)
        from public.demandas d join public.colaboradores dc on dc.id = d.colaborador_id
       where d.id = cv.demanda_id)
  ) into v
  from public.conversas cv where cv.id = p_conversa;
  return v;
end
$$;

-- Mensagens de uma conversa (as últimas, ou só as novas)
create or replace function public.mensagens_listar(p_conversa uuid, p_depois timestamptz default null, p_limite integer default 300)
returns table (id uuid, autor_id uuid, autor_nome text, autor_foto text, texto text,
               sistema boolean, created_at timestamptz, minha boolean)
language plpgsql security definer stable
set search_path = public
as $$
begin
  perform public.msg_exigir_login();
  if not public.msg_sou_membro(p_conversa) then
    raise exception 'Você não participa desta conversa.' using errcode = '42501';
  end if;
  return query
    select q.* from (
      select m.id, m.autor_id, coalesce(c.nome, p.nome, p.email), c.foto_url, m.texto,
             m.sistema, m.created_at, (m.autor_id = auth.uid())
        from public.mensagens m
        left join public.profiles p on p.id = m.autor_id
        left join public.colaboradores c on c.id = p.colaborador_id
       where m.conversa_id = p_conversa
         and (p_depois is null or m.created_at > p_depois)
       order by m.created_at desc
       limit greatest(1, least(coalesce(p_limite, 300), 1000))
    ) q
    order by q.created_at;
end
$$;

-- Enviar
create or replace function public.mensagem_enviar(p_conversa uuid, p_texto text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_txt text := btrim(coalesce(p_texto, ''));
  v_id uuid;
begin
  perform public.msg_exigir_login();
  if not public.msg_sou_membro(p_conversa) then
    raise exception 'Você não participa desta conversa.' using errcode = '42501';
  end if;
  if char_length(v_txt) = 0 then
    raise exception 'Mensagem vazia.';
  end if;
  if char_length(v_txt) > 4000 then
    raise exception 'Mensagem longa demais (máximo 4.000 caracteres).';
  end if;
  perform public.msg_membros_demanda(p_conversa);
  insert into public.mensagens (conversa_id, autor_id, texto) values (p_conversa, auth.uid(), v_txt)
  returning id into v_id;
  update public.conversas set ultima_em = now() where id = p_conversa;
  update public.conversa_membros set lida_em = now() where conversa_id = p_conversa and profile_id = auth.uid();
  return v_id;
end
$$;

-- Marcar como lida
create or replace function public.conversa_marcar_lida(p_conversa uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  update public.conversa_membros set lida_em = greatest(lida_em, now())
   where conversa_id = p_conversa and profile_id = auth.uid();
end
$$;

-- ============================================================
-- 3. LISTA DE DEMANDAS (formato novo) + CONTADORES
-- ============================================================

drop function if exists public.demandas_listar();

create function public.demandas_listar()
returns table (
  id uuid, titulo text, descricao text, colaborador_id uuid,
  nome text, cargo text, setor text, prazo date, status text,
  prioridade text, concluida_em timestamptz, created_at timestamptz,
  visto_em timestamptz, concluida_por_nome text, criado_por_nome text,
  minha boolean, conversa_id uuid, msgs_total integer, msgs_nao_lidas integer
)
language sql security definer stable
set search_path = public
as $$
  select d.id, d.titulo, d.descricao, d.colaborador_id,
         c.nome, c.cargo, c.setor, d.prazo, d.status,
         d.prioridade, d.concluida_em, d.created_at,
         d.visto_em, pc.nome, pr.nome,
         (d.colaborador_id = public.msg_meu_colab()),
         cv.id,
         (select count(*)::int from public.mensagens m where m.conversa_id = cv.id and m.sistema = false),
         coalesce((
           select count(*)::int from public.mensagens m
             join public.conversa_membros cm on cm.conversa_id = m.conversa_id and cm.profile_id = auth.uid()
            where m.conversa_id = cv.id and m.created_at > cm.lida_em
              and m.sistema = false and m.autor_id is distinct from auth.uid()), 0)
  from public.demandas d
  join public.colaboradores c on c.id = d.colaborador_id
  left join public.profiles pc on pc.id = d.concluida_por
  left join public.profiles pr on pr.id = d.criado_por
  left join public.conversas cv on cv.demanda_id = d.id
  where
    public.meu_nivel('demandas') = 'editar'
    or d.colaborador_id = public.msg_meu_colab()
    or d.criado_por = auth.uid()
    or (
      public.meu_nivel('demandas') = 'ver'
      and exists (
        select 1
        from public.profiles p2
        join public.colaboradores meu on meu.id = p2.colaborador_id
        where p2.id = auth.uid()
          and meu.setor is not null
          and meu.setor = c.setor
      )
    )
  order by d.status,
           case d.prioridade
             when 'urgente' then 0 when 'alta' then 1
             when 'normal' then 2 else 3 end,
           d.prazo nulls last, d.created_at
$$;

-- Bolinhas vermelhas da sidebar
create or replace function public.meus_avisos()
returns table (mensagens integer, demandas_novas integer, demandas_minhas integer)
language sql security definer stable
set search_path = public
as $$
  select
    coalesce((
      select count(*)::int
        from public.conversa_membros cm
        join public.mensagens m on m.conversa_id = cm.conversa_id
       where cm.profile_id = auth.uid()
         and m.created_at > cm.lida_em
         and m.sistema = false
         and m.autor_id is distinct from auth.uid()), 0),
    coalesce((
      select count(*)::int from public.demandas d
       where d.colaborador_id = public.msg_meu_colab()
         and d.visto_em is null and d.status = 'aberta'), 0),
    coalesce((
      select count(*)::int from public.demandas d
       where d.colaborador_id = public.msg_meu_colab()), 0)
$$;

-- ------------------------------------------------------------
-- Permissões de execução (só login; anon fora)
-- ------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'msg_meu_colab()', 'msg_exigir_login()', 'msg_pode_ver_demanda(uuid)',
    'demandas_marcar_vistas()', 'demanda_concluir(uuid, boolean)',
    'msg_sou_membro(uuid)', 'msg_membros_demanda(uuid)', 'mensagens_contatos()',
    'conversa_direta(uuid)', 'conversa_grupo_criar(text, uuid[])',
    'conversa_grupo_adicionar(uuid, uuid[])', 'conversa_demanda(uuid)',
    'conversas_listar()', 'conversa_detalhe(uuid)',
    'mensagens_listar(uuid, timestamptz, integer)', 'mensagem_enviar(uuid, text)',
    'conversa_marcar_lida(uuid)', 'demandas_listar()', 'meus_avisos()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$$;

-- Demandas que já existiam: quem já concluiu é considerado como
-- tendo visto; as abertas ficam "novas" até a pessoa abrir a aba.
do $$
begin
  perform set_config('cg.demanda_rpc', 'on', true);
  update public.demandas set visto_em = coalesce(concluida_em, now())
   where status = 'concluida' and visto_em is null;
  perform set_config('cg.demanda_rpc', '', true);
end
$$;

select 'mensagens + demandas prontas' as status,
  (select count(*) from public.conversas) as conversas,
  (select count(*) from public.mensagens) as mensagens,
  (select count(*) from public.demandas where visto_em is null and status = 'aberta') as demandas_ainda_nao_vistas;
