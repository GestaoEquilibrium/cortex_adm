-- ============================================================
-- CORTEX Gestão · SQL 31 — Vínculo contrato ↔ colaborador
-- O gerador de documentos arquiva o Termo na pasta
-- "CONTRATOS ESTAGIÁRIOS" e grava aqui o id do arquivo.
-- Quem tem contrato vinculado sai da lista do gerador;
-- excluir o arquivo (lixeira dos Arquivos) zera o vínculo
-- automaticamente (on delete set null) e a pessoa volta.
-- Idempotente.
-- ============================================================

alter table public.colaboradores
  add column if not exists contrato_arquivo_id uuid references public.arquivos(id) on delete set null;

comment on column public.colaboradores.contrato_arquivo_id is
  'Arquivo do contrato/termo gerado pelo CORTEX. Null = sem contrato (aparece no gerador).';

-- fim do SQL 31
