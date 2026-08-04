-- ============================================================
-- CORTEX GESTAO - PROMOVER O DIRETOR
-- Rodar DEPOIS de criar seu usuario em Authentication > Users
-- (email wessilon@gmail.com). Pode rodar mais de uma vez.
-- ============================================================

-- Garante que o profile existe mesmo se o usuario foi criado
-- pelo painel antes do trigger (cobre qualquer ordem de passos).
insert into public.profiles (id, email, nome)
select u.id, u.email, 'Wessilon Marques'
from auth.users u
where lower(u.email) = 'wessilon@gmail.com'
on conflict (id) do nothing;

-- Promove ao perfil Direcao (acesso total).
update public.profiles
set
  perfil_id = (select id from public.perfis where nome = 'Direcao'),
  nome = 'Wessilon Marques',
  ativo = true
where lower(email) = 'wessilon@gmail.com';

-- Verificacao: deve retornar 1 linha com perfil Direcao e acesso_total = true.
select
  pr.nome,
  pr.email,
  p.nome as perfil,
  p.acesso_total,
  pr.ativo
from public.profiles pr
left join public.perfis p on p.id = pr.perfil_id
where lower(pr.email) = 'wessilon@gmail.com';
