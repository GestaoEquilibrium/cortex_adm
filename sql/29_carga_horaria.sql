-- ============================================================
-- CORTEX Gestão · SQL 29 — Motor de carga horária
-- Jornada na ficha, feriados, autorizações de horas extras,
-- cálculo de previsto/realizado no banco e alerta de excesso.
-- Idempotente: pode rodar mais de uma vez sem estrago.
-- ============================================================

-- 1) Jornada na ficha ----------------------------------------
alter table public.colaboradores add column if not exists carga_semanal_horas numeric(5,2);
alter table public.colaboradores add column if not exists trabalha_sabado boolean not null default false;

comment on column public.colaboradores.carga_semanal_horas is 'Carga contratada por semana, em horas (ex.: 30, 44).';
comment on column public.colaboradores.trabalha_sabado is 'Se marcado, o sábado prevê 4h e os dias úteis dividem o restante.';

-- 2) Feriados -------------------------------------------------
create table if not exists public.feriados (
  data date primary key,
  nome text not null,
  criado_em timestamptz not null default now()
);
alter table public.feriados enable row level security;
drop policy if exists feriados_sel on public.feriados;
create policy feriados_sel on public.feriados for select to authenticated, anon using (true);
drop policy if exists feriados_ins on public.feriados;
create policy feriados_ins on public.feriados for insert to authenticated with check (public.meu_nivel('rh') = 'editar');
drop policy if exists feriados_del on public.feriados;
create policy feriados_del on public.feriados for delete to authenticated using (public.meu_nivel('rh') = 'editar');
grant select on public.feriados to anon, authenticated;
grant insert, delete on public.feriados to authenticated;

insert into public.feriados (data, nome) values
  ('2026-01-01','Confraternização Universal'),
  ('2026-02-17','Carnaval'),
  ('2026-04-03','Sexta-feira Santa'),
  ('2026-04-21','Tiradentes'),
  ('2026-05-01','Dia do Trabalho'),
  ('2026-06-04','Corpus Christi'),
  ('2026-08-15','Nossa Senhora da Abadia (padroeira)'),
  ('2026-08-31','Aniversário de Uberlândia'),
  ('2026-09-07','Independência do Brasil'),
  ('2026-10-12','Nossa Senhora Aparecida'),
  ('2026-11-02','Finados'),
  ('2026-11-15','Proclamação da República'),
  ('2026-11-20','Consciência Negra'),
  ('2026-12-25','Natal'),
  ('2027-01-01','Confraternização Universal'),
  ('2027-02-09','Carnaval'),
  ('2027-03-26','Sexta-feira Santa'),
  ('2027-04-21','Tiradentes'),
  ('2027-05-01','Dia do Trabalho'),
  ('2027-05-27','Corpus Christi'),
  ('2027-08-15','Nossa Senhora da Abadia (padroeira)'),
  ('2027-08-31','Aniversário de Uberlândia'),
  ('2027-09-07','Independência do Brasil'),
  ('2027-10-12','Nossa Senhora Aparecida'),
  ('2027-11-02','Finados'),
  ('2027-11-15','Proclamação da República'),
  ('2027-11-20','Consciência Negra'),
  ('2027-12-25','Natal')
on conflict (data) do nothing;

-- 3) Autorizações de horas extras -----------------------------
create table if not exists public.horas_extras_autorizacoes (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  data date not null,
  minutos int not null check (minutos > 0 and minutos <= 720),
  autorizado_por text not null default '',
  obs text,
  criado_em timestamptz not null default now(),
  unique (colaborador_id, data)
);
alter table public.horas_extras_autorizacoes enable row level security;
drop policy if exists hea_sel on public.horas_extras_autorizacoes;
create policy hea_sel on public.horas_extras_autorizacoes for select to authenticated using (true);
drop policy if exists hea_ins on public.horas_extras_autorizacoes;
create policy hea_ins on public.horas_extras_autorizacoes for insert to authenticated with check (public.meu_nivel('rh') = 'editar');
drop policy if exists hea_upd on public.horas_extras_autorizacoes;
create policy hea_upd on public.horas_extras_autorizacoes for update to authenticated using (public.meu_nivel('rh') = 'editar');
drop policy if exists hea_del on public.horas_extras_autorizacoes;
create policy hea_del on public.horas_extras_autorizacoes for delete to authenticated using (public.meu_nivel('rh') = 'editar');
grant select, insert, update, delete on public.horas_extras_autorizacoes to authenticated;

-- 4) Alertas de excesso ---------------------------------------
create table if not exists public.ponto_alertas_excesso (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  data date not null,
  minutos_realizados int not null,
  minutos_limite int not null,
  minutos_excedidos int not null,
  vistos jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  unique (colaborador_id, data)
);
alter table public.ponto_alertas_excesso enable row level security;
-- o relógio (anônimo) só enxerga o alerta do dia corrente, para o pop-up da saída
drop policy if exists pae_sel_anon on public.ponto_alertas_excesso;
create policy pae_sel_anon on public.ponto_alertas_excesso for select to anon
  using (data = (now() at time zone 'America/Sao_Paulo')::date);
-- logados: direção/administração (nível editar no RH)
drop policy if exists pae_sel_auth on public.ponto_alertas_excesso;
create policy pae_sel_auth on public.ponto_alertas_excesso for select to authenticated
  using (public.meu_nivel('rh') = 'editar');
grant select on public.ponto_alertas_excesso to anon, authenticated;

-- 5) Cálculo: previsto, realizado, limite ---------------------
-- Dia local da clínica
create or replace function public.ponto_dia_local(p_ts timestamptz)
returns date language sql immutable as
$$ select (p_ts at time zone 'America/Sao_Paulo')::date $$;

-- Previsto do dia, em minutos.
-- Regra: domingo e feriado preveem 0. Sábado prevê 240 (4h) quando o
-- colaborador trabalha sábados E bateu ponto naquele sábado. Dia útil
-- prevê carga/5; nas semanas em que o sábado foi trabalhado, prevê
-- (carga − 4h)/5 — a carga semanal se redistribui, nunca cresce.
create or replace function public.ponto_previsto_minutos(p_colab uuid, p_data date)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  v_carga numeric; v_flag_sab boolean; v_dow int; v_seg date; v_sab date; v_sab_trab boolean;
begin
  select carga_semanal_horas, coalesce(trabalha_sabado,false)
    into v_carga, v_flag_sab from colaboradores where id = p_colab;
  if v_carga is null or v_carga <= 0 then return 0; end if;
  v_dow := extract(isodow from p_data)::int; -- 1=seg ... 6=sáb, 7=dom
  if v_dow = 7 then return 0; end if;
  if exists (select 1 from feriados f where f.data = p_data) then return 0; end if;
  v_seg := p_data - (v_dow - 1);
  v_sab := v_seg + 5;
  v_sab_trab := v_flag_sab
    and not exists (select 1 from feriados f where f.data = v_sab)
    and exists (select 1 from ponto_registros r
                 where r.colaborador_id = p_colab
                   and public.ponto_dia_local(r.batida) = v_sab);
  if v_dow = 6 then
    return case when v_sab_trab then 240 else 0 end;
  end if;
  if v_sab_trab then
    return greatest(round(((v_carga - 4) * 60) / 5.0)::int, 0);
  end if;
  return greatest(round((v_carga * 60) / 5.0)::int, 0);
end $$;

-- Realizado do dia, em minutos: batidas ordenadas, somadas em pares.
create or replace function public.ponto_realizado_minutos(p_colab uuid, p_data date)
returns int language sql stable security definer set search_path = public as $$
  with regs as (
    select batida, row_number() over (order by batida) as rn
    from ponto_registros
    where colaborador_id = p_colab and public.ponto_dia_local(batida) = p_data
  )
  select coalesce(round(sum(extract(epoch from (s.batida - e.batida)) / 60.0))::int, 0)
  from regs e join regs s on s.rn = e.rn + 1
  where e.rn % 2 = 1
$$;

-- Limite do dia = previsto + horas extras autorizadas + tolerância de 10 min.
create or replace function public.ponto_limite_minutos(p_colab uuid, p_data date)
returns int language sql stable security definer set search_path = public as $$
  select public.ponto_previsto_minutos(p_colab, p_data)
       + coalesce((select minutos from horas_extras_autorizacoes
                    where colaborador_id = p_colab and data = p_data), 0)
       + 10
$$;

-- 6) Gatilho: toda SAÍDA verifica excesso ---------------------
create or replace function public.trg_ponto_excesso()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_dia date; v_real int; v_lim int;
begin
  if new.tipo <> 'saida' then return new; end if;
  v_dia := public.ponto_dia_local(new.batida);
  v_real := public.ponto_realizado_minutos(new.colaborador_id, v_dia);
  v_lim := public.ponto_limite_minutos(new.colaborador_id, v_dia);
  if v_real > v_lim then
    insert into ponto_alertas_excesso (colaborador_id, data, minutos_realizados, minutos_limite, minutos_excedidos)
    values (new.colaborador_id, v_dia, v_real, v_lim, v_real - v_lim)
    on conflict (colaborador_id, data) do update
      set minutos_realizados = excluded.minutos_realizados,
          minutos_limite     = excluded.minutos_limite,
          minutos_excedidos  = excluded.minutos_excedidos,
          criado_em          = now(),
          vistos             = '[]'::jsonb;
  end if;
  return new;
end $$;

drop trigger if exists ponto_excesso on public.ponto_registros;
create trigger ponto_excesso after insert on public.ponto_registros
for each row execute function public.trg_ponto_excesso();

-- 7) Ciente da direção ---------------------------------------
create or replace function public.alerta_excesso_ciente(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_quem text;
begin
  v_quem := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', 'desconhecido');
  update ponto_alertas_excesso
     set vistos = case when vistos ? v_quem then vistos else vistos || to_jsonb(v_quem) end
   where id = p_id;
end $$;
grant execute on function public.alerta_excesso_ciente(uuid) to authenticated;
grant execute on function public.ponto_previsto_minutos(uuid, date) to authenticated;
grant execute on function public.ponto_realizado_minutos(uuid, date) to authenticated;
grant execute on function public.ponto_limite_minutos(uuid, date) to authenticated;

-- fim do SQL 29
