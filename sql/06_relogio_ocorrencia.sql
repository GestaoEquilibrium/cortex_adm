-- ============================================================
-- CORTEX GESTAO - 06: RELOGIO - OCORRENCIAS E CARGO
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 04 (e do 05, se importar).
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- O que faz:
--   1. relogio_colaboradores passa a devolver tambem o cargo
--      (para a saudacao da tela, como no Ponto Digital antigo).
--   2. Nova funcao publica relogio_ocorrencia: o funcionario
--      registra ocorrencia pelo relogio, validada por PIN.
--      Cai em ponto_ocorrencias com tipo 'funcionario' e passa
--      pela auditoria normal.
-- ============================================================

-- 1) Lista do relogio agora com cargo (recriar muda o retorno).
drop function if exists public.relogio_colaboradores();

create function public.relogio_colaboradores()
returns table (id uuid, nome text, cargo text)
language sql security definer stable
set search_path = public
as $$
  select c.id, c.nome, c.cargo
  from public.colaboradores c
  where c.status = 'ativo' and c.pin is not null and c.pin <> ''
  order by c.nome
$$;

grant execute on function public.relogio_colaboradores() to anon;

-- 2) Ocorrencia registrada pelo proprio funcionario, com PIN.
create or replace function public.relogio_ocorrencia(
  p_colaborador uuid, p_pin text, p_data date, p_descricao text)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if p_descricao is null or length(trim(p_descricao)) < 3 then
    return json_build_object('ok', false, 'erro', 'Descreva o motivo.');
  end if;
  select nome into v_nome from public.colaboradores
  where id = p_colaborador and status = 'ativo' and pin = p_pin;
  if v_nome is null then
    return json_build_object('ok', false, 'erro', 'PIN incorreto.');
  end if;
  insert into public.ponto_ocorrencias (colaborador_id, data, tipo, descricao)
  values (
    p_colaborador,
    coalesce(p_data, (now() at time zone 'America/Sao_Paulo')::date),
    'funcionario',
    left(trim(p_descricao), 2000)
  );
  return json_build_object('ok', true, 'nome', v_nome);
end
$$;

grant execute on function public.relogio_ocorrencia(uuid, text, date, text) to anon;

-- ============================================================
-- FIM DO 06 - o relogio (ponto.html) ja pode usar as duas
-- ============================================================
