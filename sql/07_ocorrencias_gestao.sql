-- ============================================================
-- CORTEX GESTAO - 07: OCORRENCIAS NA GESTAO
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 04/05/06.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- O que faz:
--   1. Cria a coluna 'observacao' em ponto_ocorrencias: a
--      resposta do administrativo, que aparece na tela e no PDF
--      (o antigo botao de balaozinho do Ponto Digital).
--   2. Resgata as observacoes que o administrativo ja tinha
--      feito no sistema antigo (vieram guardadas na importacao)
--      e as coloca na coluna nova, para sairem nos relatorios.
--
-- Permissoes e auditoria: nada a fazer - o 04 ja cobre a tabela
-- (nivel 'editar' mexe, nivel 'ver' so enxerga, tudo auditado).
-- ============================================================

alter table public.ponto_ocorrencias
  add column if not exists observacao text;

update public.ponto_ocorrencias
   set observacao = nullif(trim(dados->>'admin_note'), '')
 where observacao is null
   and nullif(trim(dados->>'admin_note'), '') is not null;

-- Conferencia: quantas ocorrencias tem observacao do administrativo
select count(*) as ocorrencias_total,
       count(observacao) as com_observacao
  from public.ponto_ocorrencias;

-- ============================================================
-- FIM DO 07
-- ============================================================
