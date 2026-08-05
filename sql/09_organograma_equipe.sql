-- ============================================================
-- CORTEX GESTAO - 09: EQUIPE DO ORGANOGRAMA
-- Rodar no SQL Editor do projeto CORTEX-GESTAO
-- (vznjdgofvjbyivqkygvx) - DEPOIS do 08_organograma.sql.
-- Pode rodar mais de uma vez: nao duplica ninguem.
--
-- O que faz:
--   1. Casa os nomes da estrutura (conversa do organograma) com
--      os colaboradores importados do ponto - ignorando acentos,
--      maiusculas e nome incompleto (ex.: 'Karol' casa 'Karolina').
--   2. Preenche cargo e setor oficiais de quem casou.
--   3. Cria quem nao bate ponto (Diretoria e gerencias) - sem
--      PIN, entao NAO aparecem no relogio.
--   4. Monta os vinculos de chefia (responde_para).
--   5. Mostra no final o relatorio: casado, criado ou nao
--      encontrado (estes voce ajusta pelo lapis da aba).
-- ============================================================

drop table if exists resultado_organograma;
create temp table resultado_organograma (
  ordem int, nome_mapa text, situacao text, nome_no_banco text, colaborador_id uuid
);

create or replace function pg_temp.norm(t text) returns text
language sql immutable as $$
  select trim(regexp_replace(
    translate(lower(coalesce(t, '')),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'),
    '\s+', ' ', 'g'))
$$;

do $$
declare
  m record;
  v_id uuid;
  v_nome text;
  v_qtd int;
  v_chefe uuid;
  n_ordem int := 0;
begin
  -- ----------------------------------------------------------
  -- MAPA DA EQUIPE
  -- (nome, cargo, setor, chefe, pode_criar, casa_por_prefixo)
  -- pode_criar: cria no banco se nao achar (diretoria/gerencias)
  -- casa_por_prefixo: aceita casar por comeco do nome, se for
  --                   um unico candidato
  -- ----------------------------------------------------------
  for m in
    select * from (values
      ('Wessilon Marques de Sousa',          'Diretor Clínico e Administrativo', 'Diretoria',   null,                        true,  true),
      ('Michele C. dos Reis Faria Marques',  'Co-diretora',                      'Diretoria',   null,                        true,  false),
      ('Niela Paixão',                       'Coordenadora Clínica',             'Clínico',     'Wessilon Marques de Sousa', true,  true),
      ('Guilherme Marques',                  'Gerente de Atendimento',           'Atendimento', 'Wessilon Marques de Sousa', true,  true),
      ('Raphael Marques',                    'Gerente Financeiro',               'Financeiro',  'Wessilon Marques de Sousa', true,  true),
      ('Christiane Reti',                    'Gerente Terapêutica',              'Terapêutico', 'Wessilon Marques de Sousa', true,  true),
      ('Luan',                               'Psiquiatra (consultor)',           'Clínico',     'Wessilon Marques de Sousa', true,  true),
      ('Pamella',                            'Neuropsicóloga aplicadora',        'Clínico',     'Niela Paixão',              false, true),
      ('Emilly',                             'Neuropsicóloga aplicadora',        'Clínico',     'Niela Paixão',              false, true),
      ('Karol',                              'Neuropsicóloga aplicadora',        'Clínico',     'Niela Paixão',              false, true),
      ('Mariana',                            'Estagiária',                       'Clínico',     'Niela Paixão',              false, true),
      ('Maria Eduarda',                      'Estagiária',                       'Clínico',     'Niela Paixão',              false, true),
      ('Anna Luiza',                         'Estagiária',                       'Clínico',     'Niela Paixão',              false, true),
      ('Natália',                            'Estagiária',                       'Clínico',     'Niela Paixão',              false, true),
      ('Caroline',                           'Recepção',                         'Atendimento', 'Guilherme Marques',         false, true),
      ('Mikaelly',                           'Assistente Administrativa',        'Atendimento', 'Guilherme Marques',         false, true),
      ('Cristiane',                          'Auxiliar Clínica',                 'Clínico',     'Niela Paixão',              false, true)
    ) as v(nome, cargo, setor, chefe, pode_criar, casa_prefixo)
  loop
    n_ordem := n_ordem + 1;
    v_id := null; v_nome := null;

    -- 1) casamento exato (sem acento/caixa/espacos)
    select id, nome into v_id, v_nome
      from public.colaboradores
     where pg_temp.norm(nome) = pg_temp.norm(m.nome)
     limit 1;

    -- 2) casamento por prefixo, so se der um unico candidato
    if v_id is null and m.casa_prefixo then
      select count(*) into v_qtd
        from public.colaboradores
       where pg_temp.norm(nome) like pg_temp.norm(m.nome) || '%';
      if v_qtd = 1 then
        select id, nome into v_id, v_nome
          from public.colaboradores
         where pg_temp.norm(nome) like pg_temp.norm(m.nome) || '%';
      end if;
    end if;

    if v_id is not null then
      update public.colaboradores
         set cargo = m.cargo, setor = m.setor
       where id = v_id;
      insert into resultado_organograma values (n_ordem, m.nome, 'casado', v_nome, v_id);
    elsif m.pode_criar then
      insert into public.colaboradores (nome, cargo, setor, status)
      values (m.nome, m.cargo, m.setor, 'ativo')
      returning id, nome into v_id, v_nome;
      insert into resultado_organograma values (n_ordem, m.nome, 'CRIADO (sem PIN, fora do relógio)', v_nome, v_id);
    else
      insert into resultado_organograma values (n_ordem, m.nome, 'NÃO ENCONTRADO - ajuste pelo lápis', null, null);
    end if;
  end loop;

  -- ----------------------------------------------------------
  -- Vinculos de chefia (segunda passada, com todos ja no lugar)
  -- ----------------------------------------------------------
  for m in
    select * from (values
      ('Niela Paixão',      'Wessilon Marques de Sousa'),
      ('Guilherme Marques', 'Wessilon Marques de Sousa'),
      ('Raphael Marques',   'Wessilon Marques de Sousa'),
      ('Christiane Reti',   'Wessilon Marques de Sousa'),
      ('Luan',              'Wessilon Marques de Sousa'),
      ('Pamella',           'Niela Paixão'),
      ('Emilly',            'Niela Paixão'),
      ('Karol',             'Niela Paixão'),
      ('Mariana',           'Niela Paixão'),
      ('Maria Eduarda',     'Niela Paixão'),
      ('Anna Luiza',        'Niela Paixão'),
      ('Natália',           'Niela Paixão'),
      ('Caroline',          'Guilherme Marques'),
      ('Mikaelly',          'Guilherme Marques'),
      ('Cristiane',         'Niela Paixão')
    ) as v(quem, chefe)
  loop
    select colaborador_id into v_id    from resultado_organograma where nome_mapa = m.quem  and colaborador_id is not null;
    select colaborador_id into v_chefe from resultado_organograma where nome_mapa = m.chefe and colaborador_id is not null;
    if v_id is not null and v_chefe is not null then
      update public.colaboradores set responde_para = v_chefe where id = v_id;
    end if;
  end loop;
end
$$;

-- ============================================================
-- RELATORIO: confira quem casou, quem foi criado e quem faltou
-- ============================================================
select ordem, nome_mapa as nome_na_estrutura, situacao, nome_no_banco
  from resultado_organograma
 order by ordem;

select count(*) filter (where situacao = 'casado')                as casados,
       count(*) filter (where situacao like 'CRIADO%')            as criados,
       count(*) filter (where situacao like 'NÃO ENCONTRADO%')    as nao_encontrados
  from resultado_organograma;

-- ============================================================
-- FIM DO 09 - abra a aba Organograma do RH e veja a arvore
-- ============================================================
