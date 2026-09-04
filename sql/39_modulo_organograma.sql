-- ============================================================
-- CORTEX Gestão · SQL 39 — Organograma vira módulo próprio
-- Migra as permissões para ninguém perder acesso na virada:
-- o módulo novo 'organograma' herda a regra da antiga aba
-- rh.organograma quando existia, senão o nível do módulo rh.
-- Depois aposenta as regras da aba antiga. Idempotente.
-- ============================================================

insert into public.permissoes (perfil_id, modulo, aba, nivel)
select p.id, 'organograma', null, n.nivel
from public.perfis p
cross join lateral (
  select coalesce(
    (select nivel from public.permissoes where perfil_id = p.id and modulo = 'rh' and aba = 'organograma'),
    (select nivel from public.permissoes where perfil_id = p.id and modulo = 'rh' and aba is null)
  ) as nivel
) n
where coalesce(p.acesso_total, false) = false
  and n.nivel is not null
  and not exists (
    select 1 from public.permissoes
    where perfil_id = p.id and modulo = 'organograma' and aba is null
  );

delete from public.permissoes where modulo = 'rh' and aba = 'organograma';

-- fim do SQL 39
