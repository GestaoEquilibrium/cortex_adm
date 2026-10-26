-- ============================================================
-- CORTEX Gestão · SQL 43 — Demandas só para quem tem login
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 42.
-- Idempotente: pode rodar mais de uma vez sem quebrar e não
-- apaga nem altera nenhuma demanda existente.
--
-- Regra nova: demanda só pode ser atribuída a um prestador que
-- tenha LOGIN ATIVO vinculado (Configurações → Pessoas, vínculo
-- do sprint 19). Sem login a pessoa não vê, não recebe aviso e
-- não consegue concluir — então não faz sentido atribuir.
--  1. demandas_responsaveis(): lista de quem pode receber
--     demanda, para o campo "Atribuir a..." da tela.
--  2. Trava no banco: criar demanda ou trocar o responsável para
--     alguém sem login dá erro, mesmo fora da tela.
--     Demandas antigas de quem não tem login continuam como
--     estão (dá para editar título, prazo etc.); só a troca de
--     responsável passa a exigir login.
--  3. demandas_listar() ganha "tem_login", para a tela marcar
--     as demandas antigas que estão com alguém sem login.
-- ============================================================

-- 1. Quem pode receber demanda
create or replace function public.demandas_responsaveis()
returns table (id uuid, nome text, cargo text, setor text, foto_url text, login_nome text)
language plpgsql security definer stable
set search_path = public
as $$
begin
  if public.meu_nivel('demandas') <> 'editar' then
    raise exception 'Só quem edita Demandas pode atribuir.' using errcode = '42501';
  end if;
  return query
    select c.id, c.nome, c.cargo, c.setor, c.foto_url, coalesce(p.nome, p.email)
      from public.colaboradores c
      join public.profiles p on p.colaborador_id = c.id and p.ativo = true
     where c.status <> 'desligado'
     order by c.nome;
end
$$;

-- 2. Trava: responsável precisa ter login ativo vinculado
create or replace function public.fn_demandas_responsavel_login()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if tg_op = 'UPDATE' and new.colaborador_id is not distinct from old.colaborador_id then
    return new;
  end if;
  if not exists (
    select 1 from public.profiles p
     where p.colaborador_id = new.colaborador_id and p.ativo = true
  ) then
    select nome into v_nome from public.colaboradores where id = new.colaborador_id;
    raise exception '% não tem login no sistema. Só dá para atribuir demanda a quem tem usuário vinculado (Configurações → Pessoas).',
      coalesce(v_nome, 'Essa pessoa') using errcode = '23514';
  end if;
  return new;
end
$$;

drop trigger if exists demandas_responsavel_login on public.demandas;
create trigger demandas_responsavel_login before insert or update of colaborador_id on public.demandas
  for each row execute function public.fn_demandas_responsavel_login();

-- 3. Lista de demandas com "tem_login"
drop function if exists public.demandas_listar();

create function public.demandas_listar()
returns table (
  id uuid, titulo text, descricao text, colaborador_id uuid,
  nome text, cargo text, setor text, prazo date, status text,
  prioridade text, concluida_em timestamptz, created_at timestamptz,
  visto_em timestamptz, concluida_por_nome text, criado_por_nome text,
  minha boolean, conversa_id uuid, msgs_total integer, msgs_nao_lidas integer,
  tem_login boolean
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
              and m.sistema = false and m.autor_id is distinct from auth.uid()), 0),
         exists (select 1 from public.profiles pl where pl.colaborador_id = d.colaborador_id and pl.ativo = true)
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

revoke execute on function public.demandas_responsaveis() from public, anon;
grant execute on function public.demandas_responsaveis() to authenticated;
revoke execute on function public.demandas_listar() from public, anon;
grant execute on function public.demandas_listar() to authenticated;

-- Relatório: quem pode receber demanda e demandas abertas com
-- gente sem login (para reatribuir)
select 'demandas só para usuários - pronto' as status,
  (select count(*) from public.colaboradores c
     join public.profiles p on p.colaborador_id = c.id and p.ativo = true
    where c.status <> 'desligado') as pessoas_que_podem_receber,
  (select count(*) from public.demandas d
    where d.status = 'aberta'
      and not exists (select 1 from public.profiles p where p.colaborador_id = d.colaborador_id and p.ativo = true)
  ) as abertas_com_quem_nao_tem_login;
