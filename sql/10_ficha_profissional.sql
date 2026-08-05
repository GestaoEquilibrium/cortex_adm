-- ============================================================
-- CORTEX GESTAO - 10: FICHA PROFISSIONAL E FOTOS
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 08 e do 09.
-- Idempotente: pode rodar mais de uma vez sem quebrar.
--
-- O que faz:
--   1. Campos novos na ficha do colaborador: foto, formacao e
--      registro profissional (CRP/CRM/CREFITO...).
--   2. Bucket 'fotos' no Storage: leitura publica (para as fotos
--      aparecerem no organograma) e escrita so para logados.
--
-- A edicao da ficha usa as permissoes que ja existem na tabela
-- colaboradores, e cada mudanca cai na auditoria normalmente.
-- ============================================================

alter table public.colaboradores add column if not exists foto_url text;
alter table public.colaboradores add column if not exists formacao text;
alter table public.colaboradores add column if not exists registro_profissional text;

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do nothing;

drop policy if exists storage_fotos_select on storage.objects;
create policy storage_fotos_select on storage.objects
  for select using (bucket_id = 'fotos');

drop policy if exists storage_fotos_insert on storage.objects;
create policy storage_fotos_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

drop policy if exists storage_fotos_update on storage.objects;
create policy storage_fotos_update on storage.objects
  for update to authenticated using (bucket_id = 'fotos');

drop policy if exists storage_fotos_delete on storage.objects;
create policy storage_fotos_delete on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');

-- Conferencia
select count(*) as colaboradores, count(foto_url) as com_foto
  from public.colaboradores;

-- ============================================================
-- FIM DO 10 - fichas nas Configuracoes e fotos no organograma
-- ============================================================
