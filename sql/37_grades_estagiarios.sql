-- ============================================================
-- CORTEX Gestão · SQL 37 — Grades horárias dos estagiários
-- Carga semanal (30h · 23h20 · 18h45), regime 'Estágio' e
-- sábado desmarcado, casados por tokens do nome (à prova de
-- acento). Idempotente. O relatório no fim mostra quem foi
-- encontrado e a lista de tokens sem correspondência — confira.
-- Cargas em horas decimais: 23.3333 = 23h20 · 18.75 = 18h45
-- (o espelho arredonda por dia: 280 min = 4h40 · 225 min = 3h45).
-- ============================================================

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%motta%' and nome ilike '%campos%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%enzo%' and nome ilike '%lacerda%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%graziel%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%rastelli%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%sposit%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%paulino%' and nome ilike '%andrade%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%mariana%' and nome ilike '%lopes%' and nome ilike '%pereira%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%tiffany%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%menegat%';

update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%nayara%';

-- Maria Eduarda de Leva Araujo (Duda) — variavel por semestre — base 30h; ajustar na ficha quando mudar
update public.colaboradores set carga_semanal_horas = 30.0000, regime = 'Estágio', trabalha_sabado = false where nome ilike '%eduarda%' and nome ilike '%leva%';

update public.colaboradores set carga_semanal_horas = 23.3333, regime = 'Estágio', trabalha_sabado = false where nome ilike '%fernanda%' and nome ilike '%cavalcant%';

update public.colaboradores set carga_semanal_horas = 23.3333, regime = 'Estágio', trabalha_sabado = false where nome ilike '%paulino%' and nome ilike '%moreira%';

update public.colaboradores set carga_semanal_horas = 23.3333, regime = 'Estágio', trabalha_sabado = false where nome ilike '%nickolloy%';

-- Maria Eduarda Goncalves — gon casa Gonçalves/Goncalves; Leva Araujo não tem esse token
update public.colaboradores set carga_semanal_horas = 18.7500, regime = 'Estágio', trabalha_sabado = false where nome ilike '%eduarda%' and nome ilike '%gon%';

-- ---------- Conferência ----------
do $$
declare
  r record;
  achados int;
  faltantes text := '';
begin

  select count(*) into achados from public.colaboradores where nome ilike '%motta%' and nome ilike '%campos%';
  if achados = 0 then faltantes := faltantes || 'Ana Julia Motta Campos; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Ana Julia Motta Campos casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%enzo%' and nome ilike '%lacerda%';
  if achados = 0 then faltantes := faltantes || 'Enzo Tobias Lacerda; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Enzo Tobias Lacerda casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%graziel%';
  if achados = 0 then faltantes := faltantes || 'Graziella Pereira Rezende; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Graziella Pereira Rezende casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%rastelli%';
  if achados = 0 then faltantes := faltantes || 'Maria Laura Rastelli Rangel; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Maria Laura Rastelli Rangel casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%sposit%';
  if achados = 0 then faltantes := faltantes || 'Maria Luiza Spositto Silva; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Maria Luiza Spositto Silva casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%paulino%' and nome ilike '%andrade%';
  if achados = 0 then faltantes := faltantes || 'Natalia Paulino Andrade; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Natalia Paulino Andrade casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%mariana%' and nome ilike '%lopes%' and nome ilike '%pereira%';
  if achados = 0 then faltantes := faltantes || 'Mariana Candida Lopes Pereira; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Mariana Candida Lopes Pereira casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%tiffany%';
  if achados = 0 then faltantes := faltantes || 'Tiffany Roane Cockell Monteiro; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Tiffany Roane Cockell Monteiro casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%menegat%';
  if achados = 0 then faltantes := faltantes || 'Veronica Valeria de Macedo Menegatti; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Veronica Valeria de Macedo Menegatti casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%nayara%';
  if achados = 0 then faltantes := faltantes || 'Nayara de Matos; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Nayara de Matos casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%eduarda%' and nome ilike '%leva%';
  if achados = 0 then faltantes := faltantes || 'Maria Eduarda de Leva Araujo (Duda); '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Maria Eduarda de Leva Araujo (Duda) casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%fernanda%' and nome ilike '%cavalcant%';
  if achados = 0 then faltantes := faltantes || 'Fernanda Aparecida Dias Cavalcante; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Fernanda Aparecida Dias Cavalcante casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%paulino%' and nome ilike '%moreira%';
  if achados = 0 then faltantes := faltantes || 'Leticia Victoria Paulino Moreira; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Leticia Victoria Paulino Moreira casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%nickolloy%';
  if achados = 0 then faltantes := faltantes || 'Nickolloy Emilia Sales Souza; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Nickolloy Emilia Sales Souza casaram % colaboradores — confira.', achados; end if;
  select count(*) into achados from public.colaboradores where nome ilike '%eduarda%' and nome ilike '%gon%';
  if achados = 0 then faltantes := faltantes || 'Maria Eduarda Goncalves; '; end if;
  if achados > 1 then raise notice 'ATENÇÃO: tokens de Maria Eduarda Goncalves casaram % colaboradores — confira.', achados; end if;
  if faltantes <> '' then
    raise notice 'NÃO ENCONTRADOS (cadastrar ou ajustar tokens): %', faltantes;
  else
    raise notice 'Todos os 15 estagiários encontrados e atualizados.';
  end if;
end $$;

select nome, carga_semanal_horas, regime, trabalha_sabado
from public.colaboradores
where regime = 'Estágio' and carga_semanal_horas is not null
order by carga_semanal_horas desc, nome;

-- fim do SQL 37
