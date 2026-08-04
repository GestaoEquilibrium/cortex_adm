-- ============================================================
-- CORTEX GESTAO - 05: IMPORTAR O PONTO DIGITAL
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - depois do 04.
--
-- O que faz: o proprio banco busca os dados no Supabase do
-- Ponto Digital (qybtqjyujgaigwytypha) pela internet e importa:
--   employees     -> colaboradores (com PIN)
--   time_records  -> ponto_registros
--   occurrences   -> ponto_ocorrencias
--
-- Idempotente: rodar de novo nao duplica nada.
-- Pode demorar 1-2 minutos por causa das 3.674 batidas.
-- ============================================================

create extension if not exists http with schema extensions;

-- Funcao temporaria de sessao: busca uma pagina da API do ponto.
create or replace function pg_temp.buscar_ponto(p_tabela text, p_offset int, p_base text, p_key text)
returns jsonb
language plpgsql
as $f$
declare
  r extensions.http_response;
begin
  r := extensions.http((
    'GET',
    p_base || p_tabela || '?select=*&order=id&limit=1000&offset=' || p_offset,
    array[
      extensions.http_header('apikey', p_key),
      extensions.http_header('Authorization', 'Bearer ' || p_key)
    ],
    null, null
  )::extensions.http_request);
  if r.status <> 200 then
    raise exception 'Falha ao buscar % (status %): %', p_tabela, r.status, left(coalesce(r.content, ''), 200);
  end if;
  return r.content::jsonb;
end;
$f$;

do $$
declare
  v_base text := 'https://qybtqjyujgaigwytypha.supabase.co/rest/v1/';
  v_key  text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5YnRxanl1amdhaWd3eXR5cGhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjcxMzcsImV4cCI6MjEwMDg0MzEzN30.Vu-MppfIuEOVUd1rBsKnEehujAuq301KnwBAQ1WlFAs';
  v_json jsonb;
  v_item jsonb;
  v_off int;
  v_lote int;
  v_colab uuid;
  v_status text;
  n_colab_novos int := 0;
  n_colab_atualizados int := 0;
  n_batidas int := 0;
  n_ocorrencias int := 0;


begin
  -- ---------- 1) EMPLOYEES -> COLABORADORES ----------
  v_off := 0;
  loop
    v_json := pg_temp.buscar_ponto('employees', v_off, v_base, v_key);
    v_lote := coalesce(jsonb_array_length(v_json), 0);
    exit when v_lote = 0;

    for v_item in select * from jsonb_array_elements(v_json) loop
      v_status := case when coalesce((v_item->>'active')::boolean, true) then 'ativo' else 'desligado' end;

      -- ja importado antes? atualiza pin e status
      select id into v_colab from public.colaboradores
      where origem_ponto_id = v_item->>'id';

      if v_colab is not null then
        update public.colaboradores
        set pin = coalesce(nullif(v_item->>'password',''), pin),
            status = v_status
        where id = v_colab;
        n_colab_atualizados := n_colab_atualizados + 1;
      else
        -- existe alguem com o mesmo nome cadastrado a mao? completa em vez de duplicar
        select id into v_colab from public.colaboradores
        where origem_ponto_id is null
          and lower(trim(nome)) = lower(trim(v_item->>'name'))
        limit 1;

        if v_colab is not null then
          update public.colaboradores
          set origem_ponto_id = v_item->>'id',
              pin = coalesce(nullif(v_item->>'password',''), pin),
              cargo = coalesce(cargo, nullif(v_item->>'cargo','')),
              status = v_status
          where id = v_colab;
          n_colab_atualizados := n_colab_atualizados + 1;
        else
          insert into public.colaboradores (nome, cargo, pin, status, origem_ponto_id)
          values (
            coalesce(nullif(v_item->>'name',''), 'Sem nome'),
            nullif(v_item->>'cargo',''),
            nullif(v_item->>'password',''),
            v_status,
            v_item->>'id'
          );
          n_colab_novos := n_colab_novos + 1;
        end if;
      end if;
    end loop;

    exit when v_lote < 1000;
    v_off := v_off + 1000;
  end loop;

  -- ---------- 2) TIME_RECORDS -> PONTO_REGISTROS ----------
  v_off := 0;
  loop
    v_json := pg_temp.buscar_ponto('time_records', v_off, v_base, v_key);
    v_lote := coalesce(jsonb_array_length(v_json), 0);
    exit when v_lote = 0;

    insert into public.ponto_registros (colaborador_id, tipo, batida, origem)
    select c.id,
           case when lower(coalesce(t.item->>'type','')) = 'entrada' then 'entrada' else 'saida' end,
           (t.item->>'timestamp')::timestamptz,
           'importado'
    from jsonb_array_elements(v_json) as t(item)
    join public.colaboradores c on c.origem_ponto_id = t.item->>'employee_id'
    where t.item->>'timestamp' is not null
      and lower(coalesce(t.item->>'type','')) in ('entrada','saida')
    on conflict (colaborador_id, batida, tipo) do nothing;

    get diagnostics v_lote = row_count;
    n_batidas := n_batidas + v_lote;

    v_lote := coalesce(jsonb_array_length(v_json), 0);
    exit when v_lote < 1000;
    v_off := v_off + 1000;
  end loop;

  -- ---------- 3) OCCURRENCES -> PONTO_OCORRENCIAS ----------
  v_off := 0;
  loop
    v_json := pg_temp.buscar_ponto('occurrences', v_off, v_base, v_key);
    v_lote := coalesce(jsonb_array_length(v_json), 0);
    exit when v_lote = 0;

    insert into public.ponto_ocorrencias (colaborador_id, data, tipo, descricao, dados, origem_id)
    select c.id,
           coalesce(
             nullif(t.item->>'date','')::date,
             (nullif(t.item->>'timestamp',''))::timestamptz::date,
             (nullif(t.item->>'created_at',''))::timestamptz::date
           ),
           coalesce(nullif(t.item->>'type',''), nullif(t.item->>'tipo','')),
           coalesce(nullif(t.item->>'description',''), nullif(t.item->>'descricao',''), nullif(t.item->>'note','')),
           t.item,
           t.item->>'id'
    from jsonb_array_elements(v_json) as t(item)
    left join public.colaboradores c on c.origem_ponto_id = t.item->>'employee_id'
    on conflict (origem_id) where origem_id is not null do nothing;

    get diagnostics v_lote = row_count;
    n_ocorrencias := n_ocorrencias + v_lote;

    v_lote := coalesce(jsonb_array_length(v_json), 0);
    exit when v_lote < 1000;
    v_off := v_off + 1000;
  end loop;

  raise notice 'IMPORTACAO CONCLUIDA: % colaboradores novos, % atualizados, % batidas, % ocorrencias',
    n_colab_novos, n_colab_atualizados, n_batidas, n_ocorrencias;
end
$$;

-- Conferencia final: contagens no banco unico.
select
  (select count(*) from public.colaboradores where origem_ponto_id is not null) as colaboradores_do_ponto,
  (select count(*) from public.colaboradores) as colaboradores_total,
  (select count(*) from public.ponto_registros) as batidas,
  (select count(*) from public.ponto_ocorrencias) as ocorrencias;
