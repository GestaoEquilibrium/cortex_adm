-- ============================================================
-- CORTEX GESTAO - 11: TOPO LIVRE DO ORGANOGRAMA
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 08.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- O que faz:
--   1. Cria a marca 'no_topo': quem a tiver aparece fixo na
--      primeira linha do organograma, mesmo sem subordinados -
--      feito para fundadores e diretores lado a lado.
--   2. Ja fixa no topo os dois fundadores (Wessilon e Michele
--      co-diretora), sem tocar em mais ninguem.
-- ============================================================

alter table public.colaboradores
  add column if not exists no_topo boolean not null default false;

update public.colaboradores
   set no_topo = true
 where no_topo = false
   and (lower(nome) like 'wessilon%'
     or lower(nome) like 'michele c. dos reis%');

-- Conferencia: quem esta fixado no topo
select nome, cargo, setor
  from public.colaboradores
 where no_topo
 order by nome;

-- ============================================================
-- FIM DO 11
-- ============================================================
