-- ============================================================
-- CORTEX GESTAO - 19: USUARIOS <-> PRESTADORES + MINHA CONTA
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx). Pode rodar mais de uma vez.
--
-- O que faz:
--   1. Liga cada login (profiles) a um prestador (colaboradores)
--      pela nova coluna colaborador_id - um prestador por login.
--   2. Auto-vincula quem tiver o MESMO e-mail no login e na ficha
--      (so onde ainda nao ha vinculo e o e-mail bate com uma
--      unica pessoa).
--   3. Cria as funcoes da pagina "Minha conta":
--      - meu_card(): devolve o card do prestador vinculado ao
--        usuario logado (mesmo sem permissao de RH).
--      - meu_card_atualizar(dados): deixa a pessoa editar SO os
--        campos do proprio card (foto, telefone, e-mail,
--        formacao, registro profissional, aniversario). Salario,
--        CPF, cargo, setor e o resto continuam so com o RH.
-- ============================================================

alter table public.profiles
  add column if not exists colaborador_id uuid references public.colaboradores(id) on delete set null;

create unique index if not exists profiles_colaborador_unico
  on public.profiles (colaborador_id) where colaborador_id is not null;

-- Auto-vinculo por e-mail (quando a coluna email existir em profiles)
do $$
declare v_n int;
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
    update public.profiles p set colaborador_id = c.id
      from public.colaboradores c
     where p.colaborador_id is null
       and p.email is not null and c.email is not null
       and lower(p.email) = lower(c.email)
       and not exists (select 1 from public.profiles p2 where p2.colaborador_id = c.id)
       and (select count(*) from public.colaboradores c2 where lower(c2.email) = lower(p.email)) = 1;
    get diagnostics v_n = row_count;
    raise notice 'auto-vinculo por e-mail: % login(s) vinculados agora', v_n;
  end if;
end
$$;

create or replace function public.meu_card()
returns table (colaborador_id uuid, nome text, cargo text, setor text, unidade text,
               foto_url text, telefone text, email text, formacao text,
               registro_profissional text, nascimento date)
language sql security definer stable
set search_path = public
as $$
  select c.id, c.nome, c.cargo, c.setor, c.unidade, c.foto_url, c.telefone, c.email,
         c.formacao, c.registro_profissional, c.nascimento
    from public.colaboradores c
    join public.profiles p on p.colaborador_id = c.id
   where p.id = auth.uid();
$$;
grant execute on function public.meu_card() to authenticated;

create or replace function public.meu_card_atualizar(dados jsonb)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_cid uuid;
begin
  select colaborador_id into v_cid from public.profiles where id = auth.uid();
  if v_cid is null then
    raise exception 'Seu login ainda não está vinculado a um prestador. Peça à Direção em Configurações → Pessoas.';
  end if;

  update public.colaboradores set
    foto_url  = case when dados ? 'foto_url'  then nullif(dados->>'foto_url', '')  else foto_url  end,
    telefone  = case when dados ? 'telefone'  then nullif(dados->>'telefone', '')  else telefone  end,
    email     = case when dados ? 'email'     then nullif(dados->>'email', '')     else email     end,
    formacao  = case when dados ? 'formacao'  then nullif(dados->>'formacao', '')  else formacao  end,
    registro_profissional = case when dados ? 'registro_profissional'
                                 then nullif(dados->>'registro_profissional', '')
                                 else registro_profissional end,
    nascimento = case when dados ? 'nascimento'
                      then nullif(dados->>'nascimento', '')::date
                      else nascimento end
  where id = v_cid;
end;
$$;
grant execute on function public.meu_card_atualizar(jsonb) to authenticated;

-- Conferencia
select count(*) as logins_vinculados from public.profiles where colaborador_id is not null;

-- ============================================================
-- FIM DO 19 - vincule os acessos em Configuracoes -> Pessoas
-- ============================================================
