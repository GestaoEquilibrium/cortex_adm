-- ============================================================
-- CORTEX Gestão · SQL 35 — Apuração geral das fichas (02/09)
-- Ajustes cirúrgicos apenas nas fichas com fonte verificável:
--   infinity (repositório relido), cortex-gestao, central,
--   ponto e pee (esteira local). Nada é sobrescrito por inteiro;
--   inserts protegidos por NOT EXISTS — pode rodar mais de uma vez.
-- Fichas sem fonte nova daqui (contigo, callink, cartao, saas,
-- mais-eq, shireq, salas, pdge, cortex-aba) não são tocadas.
-- ============================================================


update public.projetos set fonte = 'Repositório relido em 02/09/2026 — código idêntico à apuração anterior; pendências do Marcos confirmadas literais em folha.jsx.', atualizado_em = now(), atualizado_por = 'apuracao SQL 35' where slug = 'infinity';

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select (select id from public.projetos where slug = 'infinity'), 'marco', 'Releitura 02/09', 'Código conferido arquivo a arquivo: 12.171 linhas batendo, migração 009 segue ausente e as três pendências do Marcos estão anotadas em folha.jsx.', 900
where not exists (select 1 from public.projetos_itens where texto = 'Código conferido arquivo a arquivo: 12.171 linhas batendo, migração 009 segue ausente e as três pendências do Marcos estão anotadas em folha.jsx.' and projeto_id = (select id from public.projetos where slug = 'infinity'));

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select (select id from public.projetos where slug = 'infinity'), 'trava', null, 'Numeração de migração colidida: existem dois arquivos 006 (salas_seed_escalas e categories_table). Renumerar antes da próxima migração para não quebrar a ordem de aplicação.', 901
where not exists (select 1 from public.projetos_itens where texto = 'Numeração de migração colidida: existem dois arquivos 006 (salas_seed_escalas e categories_table). Renumerar antes da próxima migração para não quebrar a ordem de aplicação.' and projeto_id = (select id from public.projetos where slug = 'infinity'));

update public.projetos_itens set texto = 'A folha tem três pendências do Marcos anotadas em folha.jsx: anexo do Simples da Talentos, percentual patronal do Med Center e regra de vale-transporte. O toggle do CPP do Talentos só deve ser ligado se o Marcos confirmar que fica fora do DAS — Talentos é Simples (sem INSS patronal por padrão) e Med Center é Presumido (patronal ajustável).' where tipo = 'trava' and texto = 'A folha tem três pendências do Marcos anotadas no código.' and projeto_id = (select id from public.projetos where slug = 'infinity');

update public.projetos_itens set texto = '01 a 35, com lacunas' where tipo = 'dado' and texto = '01 a 33, com lacunas' and projeto_id = (select id from public.projetos where slug = 'cortex-gestao');

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select (select id from public.projetos where slug = 'cortex-gestao'), 'marco', 'SQL 34–35', 'Ritual de apuração da Central em uso: ficha do CORTEX_APP refeita contra o repositório e apuração geral registrada.', 900
where not exists (select 1 from public.projetos_itens where texto = 'Ritual de apuração da Central em uso: ficha do CORTEX_APP refeita contra o repositório e apuração geral registrada.' and projeto_id = (select id from public.projetos where slug = 'cortex-gestao'));

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select (select id from public.projetos where slug = 'central'), 'marco', 'SQL 34–35', 'Primeiras apurações contra código: CORTEX_APP refeito por inteiro (79 instrumentos, 8 tabelas) e Infinity confirmado linha a linha.', 900
where not exists (select 1 from public.projetos_itens where texto = 'Primeiras apurações contra código: CORTEX_APP refeito por inteiro (79 instrumentos, 8 tabelas) e Infinity confirmado linha a linha.' and projeto_id = (select id from public.projetos where slug = 'central'));

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select (select id from public.projetos where slug = 'central'), 'feito', null, 'Ritual de apuração funcionando: ler o repositório, corrigir a ficha, registrar a fonte.', 901
where not exists (select 1 from public.projetos_itens where texto = 'Ritual de apuração funcionando: ler o repositório, corrigir a ficha, registrar a fonte.' and projeto_id = (select id from public.projetos where slug = 'central'));

update public.projetos_itens set texto = 'Revisar a ficha do CORTEX ABA e as quatro comerciais (Contigo, Callink, Cartão, SaaS) — as fontes delas vivem fora deste Projeto do Claude.' where tipo = 'falta' and texto = 'Revisar as fichas marcadas “a apurar” (CORTEX ABA, partes do CORTEX_APP).' and projeto_id = (select id from public.projetos where slug = 'central');

update public.projetos set como_funciona = 'HTML único com React via CDN. Fala com o Firestore pela API REST, sem SDK, em três coleções: employees, timeRecords e settings. O CORTEX puxa esses dados por HTTP server-side. O relógio do CORTEX (ponto.html) valida por PIN, registra foto da batida e instala como app próprio (Ponto Equilibrium) no tablet ou celular.', atualizado_em = now(), atualizado_por = 'apuracao SQL 35' where slug = 'ponto';

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select (select id from public.projetos where slug = 'ponto'), 'marco', 'Sprints 22 e 62 do CORTEX', 'O relógio ganhou batida com foto e virou app instalável próprio, com manifest e ícone dedicados.', 900
where not exists (select 1 from public.projetos_itens where texto = 'O relógio ganhou batida com foto e virou app instalável próprio, com manifest e ícone dedicados.' and projeto_id = (select id from public.projetos where slug = 'ponto'));

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select (select id from public.projetos where slug = 'pee'), 'falta', null, 'Ingerir o Caderno 2 (Operação) revisado pela Niela quando o documento chegar.', 900
where not exists (select 1 from public.projetos_itens where texto = 'Ingerir o Caderno 2 (Operação) revisado pela Niela quando o documento chegar.' and projeto_id = (select id from public.projetos where slug = 'pee'));


-- fim do SQL 35
