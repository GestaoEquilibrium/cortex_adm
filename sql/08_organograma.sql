-- ============================================================
-- CORTEX GESTAO - 08: ORGANOGRAMA
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 03.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- O que faz:
--   1. Cria o vinculo de chefia em colaboradores: a coluna
--      'responde_para' aponta para outro colaborador. E ela que
--      desenha o organograma na aba nova do RH.
--   2. Trava para ninguem ser chefe de si mesmo.
--
-- Permissoes e auditoria: nada a fazer - a tabela colaboradores
-- ja e coberta pelo 03 (aba 'colaboradores' / modulo rh) e cada
-- mudanca de chefia cai na auditoria como qualquer edicao.
-- ============================================================

alter table public.colaboradores
  add column if not exists responde_para uuid
  references public.colaboradores(id) on delete set null;

create index if not exists colaboradores_chefia_idx
  on public.colaboradores (responde_para);

alter table public.colaboradores
  drop constraint if exists colaboradores_nao_chefia_si;
alter table public.colaboradores
  add constraint colaboradores_nao_chefia_si
  check (responde_para is null or responde_para <> id);

-- Conferencia: quantos ja tem chefia definida
select count(*) as colaboradores_total,
       count(responde_para) as com_chefia_definida
  from public.colaboradores;

-- ============================================================
-- FIM DO 08 - a aba Organograma do RH ja pode usar
-- ============================================================
