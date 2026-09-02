-- ============================================================
-- CORTEX Gestão · SQL 34 — Ficha do CORTEX_APP apurada
-- Substitui a ficha do projeto cortex-app na Central pela
-- apuração real do repositório MarquesAnd/cortex_pacientes
-- (02/09/2026). Rodar de novo restaura ESTA versão da ficha —
-- edições manuais feitas depois serão substituídas; edite pela
-- aba Editar após aplicar. Não mexe em nenhum outro projeto.
-- ============================================================

update public.projetos set

  nome = 'CORTEX_APP',
  frente = 'Sistemas clínicos',
  icone = 'ti-brain',
  situacao = 'ativo',
  resumo = 'Acompanhamento de pacientes da neuropsicologia',
  meta = 'MarquesAnd/cortex_pacientes · 3.763 linhas · 8 tabelas',
  fonte = 'Repositório lido em 02/09/2026 — ficha refeita contra o código (código vence conversa).',
  objetivo = 'Acompanhar o ciclo completo do paciente da neuropsicologia — anamnese, hipóteses diagnósticas, bateria de testes, laudo e devolutiva — num prontuário único, isolado por clínica.',
  quem_entra = 'Login por e-mail e senha (Supabase Auth). Cada profissional pertence a uma clínica (profiles.clinica_id) e só enxerga os pacientes dela.',
  como_funciona = 'HTML e React via CDN (CORTEX.html, 993 linhas) com cliente REST próprio, sem SDK. Supabase evxcwjlfpntopddtbjmq com 8 tabelas e 5 migrações versionadas. O index redireciona para a tela de login; tema escuro com densidade configurável.',
  proximo_passo = 'Localizar os módulos de correção do Sprint D3 (PAI, CARS-2, gerador de laudo CFP) e trazê-los para o repositório — hoje o código público cobre o acompanhamento, não a correção.',
  atualizado_em = now()  , atualizado_por = 'apuracao SQL 34'
where slug = 'cortex-app';

delete from public.projetos_itens where projeto_id = (select id from public.projetos where slug = 'cortex-app');

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
values
  ((select id from public.projetos where slug = 'cortex-app'), 'link', 'Abrir o sistema', 'https://marquesand.github.io/cortex_pacientes/', 0),
  ((select id from public.projetos where slug = 'cortex-app'), 'link', 'Repositório', 'https://github.com/MarquesAnd/cortex_pacientes', 1),
  ((select id from public.projetos where slug = 'cortex-app'), 'link', 'Banco (Supabase)', 'https://supabase.com/dashboard/project/evxcwjlfpntopddtbjmq', 2),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Dashboard', 3),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Pacientes', 4),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Prontuário do paciente', 5),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Bateria de testes', 6),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Hipóteses diagnósticas', 7),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Laudo', 8),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Sessões', 9),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Agenda', 10),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Configurações da clínica', 11),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Entrar com e-mail e senha; o sistema carrega os pacientes da sua clínica.', 12),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Cadastrar o paciente e preencher a anamnese.', 13),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Montar a bateria a partir do catálogo de 79 instrumentos, filtrado por população e faixa etária.', 14),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Registrar cada aplicação pela própria bateria; o contador acompanha.', 15),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Vincular evidências dos testes às hipóteses diagnósticas — de “em investigação” a “confirmada”.', 16),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Acompanhar a previsão do laudo no prontuário: atraso aparece em vermelho até a devolutiva.', 17),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Registrar sessões e encerrar o caso na devolutiva.', 18),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Migração 001', 'Schema com as 8 tabelas: profiles, clinicas, pacientes, anamneses, hipoteses, testes_paciente, sessoes e relatorios_escolares.', 19),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Migrações 002–005', 'Configuração da clínica, avatar do perfil, campos de perfil e CPF do paciente.', 20),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Catálogo', '79 instrumentos em 9 domínios, extraídos dos Check Lists oficiais Equilibrium (Adulto, Escolar e Pré-Escolar).', 21),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Fluxo do caso', 'Estágios anamnese → correção → laudo → devolutiva, com previsão de laudo e alerta de atraso.', 22),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Apuração 02/09', 'Repositório lido linha a linha: os motores de correção do Sprint D3 (PAI, CARS-2, gerador CFP) não constam deste código.', 23),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Prontuário completo por paciente: anamnese, hipóteses com status, bateria com contador, laudo e sessões.', 24),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Catálogo de 79 instrumentos em 9 domínios — de Inteligência a Desenvolvimento Infantil — com faixa etária, população e o que cada um avalia.', 25),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Multi-clínica com isolamento por clinica_id no banco.', 26),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Previsão de laudo com alerta visual de atraso.', 27),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Exclusão de paciente com aviso de irreversibilidade (remove anamnese, hipóteses, testes e sessões).', 28),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Cinco migrações versionadas — nenhuma estrutura fantasma.', 29),
  ((select id from public.projetos where slug = 'cortex-app'), 'falta', null, 'Localizar e versionar os módulos de correção do Sprint D3 (PAI, CARS-2, gerador de laudo CFP 06/2019).', 30),
  ((select id from public.projetos where slug = 'cortex-app'), 'falta', null, 'Preencher e verificar as tabelas normativas contra os manuais licenciados.', 31),
  ((select id from public.projetos where slug = 'cortex-app'), 'falta', null, 'Definir o escopo do Sprint D4.', 32),
  ((select id from public.projetos where slug = 'cortex-app'), 'falta', null, 'Definir a política de coexistência com o app legado Equilibrium Neuro.', 33),
  ((select id from public.projetos where slug = 'cortex-app'), 'trava', null, 'Os motores de correção citados nas conversas (Sprint D3) não constam do repositório público — a apurar se vivem em outro repositório, em artefatos locais ou apenas no Projeto do Claude.', 34),
  ((select id from public.projetos where slug = 'cortex-app'), 'trava', null, 'Tabelas normativas dependem de conferência manual contra manual licenciado — trabalho do profissional, não do sistema.', 35),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Repositório', 'MarquesAnd/cortex_pacientes', 36),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Supabase', 'evxcwjlfpntopddtbjmq', 37),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Linhas', '3.763', 38),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Tabelas', 'profiles · clinicas · pacientes · anamneses · hipoteses · testes_paciente · sessoes · relatorios_escolares', 39),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Migrações', '001 a 005', 40),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Catálogo', '79 instrumentos · 9 domínios', 41),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Estágios do caso', 'anamnese → correção → laudo → devolutiva', 42),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'Correção e Laudo são fases separadas. Nunca misturar.', 43),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'Em discrepância de índices no WAIS-III ou WISC-IV, sempre calcular o GAI/ICG com subtestes nucleares e comparar com o QIT.', 44),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'Tabela normativa entra com marca verificado: false até conferência manual.', 45),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'A arquitetura separa motor e normas: o motor não carrega dado proprietário de editora.', 46),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'A chave anon fica no código; a proteção real é a RLS por clínica.', 47),
  ((select id from public.projetos where slug = 'cortex-app'), 'decisao', null, 'Qual o escopo do Sprint D4?', 48),
  ((select id from public.projetos where slug = 'cortex-app'), 'decisao', null, 'Os módulos de correção entram neste repositório ou em repositório próprio?', 49);

-- fim do SQL 34
