-- ============================================================
-- CORTEX GESTAO - 22: RELOGIO COM FOTO NO CRACHA
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 21.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- O que faz: a lista publica do relogio (relogio_colaboradores)
-- passa a devolver tambem a foto_url do colaborador (a mesma
-- foto da "Minha conta" / vinculo do sprint 19). O relogio novo
-- usa a foto no mural de crachas; quem nao tem foto aparece com
-- as iniciais. Recriar e obrigatorio porque o retorno muda.
-- O relogio novo funciona com ou sem este SQL aplicado.
-- ============================================================

drop function if exists public.relogio_colaboradores();

create function public.relogio_colaboradores()
returns table (id uuid, nome text, cargo text, foto_url text)
language sql security definer stable
set search_path = public
as $$
  select c.id, c.nome, c.cargo, c.foto_url
  from public.colaboradores c
  where c.status = 'ativo' and c.pin is not null and c.pin <> ''
  order by c.nome
$$;

grant execute on function public.relogio_colaboradores() to anon;

-- Conferencia: quantos aparecem no relogio e quantos ja tem foto
select count(*) as no_relogio, count(foto_url) as com_foto
from public.colaboradores
where status = 'ativo' and pin is not null and pin <> '';
