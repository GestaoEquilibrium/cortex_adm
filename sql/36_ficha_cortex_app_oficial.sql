-- ============================================================
-- CORTEX Gestão · SQL 36 — Ficha oficial do CORTEX_APP
-- Substitui a ficha do projeto cortex-app pela apuração do
-- repositório OFICIAL e privado gestaoequilibrium/cortex_app
-- (02/09/2026), corrigindo o SQL 34, que havia lido por engano
-- o homônimo público. Rodar de novo restaura ESTA versão;
-- edições posteriores devem ir pela aba Editar.
-- ============================================================

update public.projetos set

  nome = 'CORTEX_APP',
  frente = 'Sistemas clínicos',
  icone = 'ti-brain',
  situacao = 'ativo',
  resumo = 'Plataforma clínica de neuropsicologia',
  meta = 'gestaoequilibrium/cortex_app (privado) · ~76 mil linhas · 26 tabelas',
  fonte = 'Repositório privado lido em 02/09/2026 com autorização do Wess. A ficha anterior havia apurado, por engano, o repositório público homônimo (MarquesAnd/cortex_pacientes).',
  objetivo = 'Unificar a gestão clínica da neuropsicologia: cadastro e acompanhamento de pacientes, aplicação e correção de testes psicométricos (22 instrumentos ativos, 60+ no catálogo), geração de laudos conforme a Resolução CFP 06/2019, agenda multiprofissional e auditoria imutável para conformidade LGPD — sucedendo o app.neuroequilibrium.com.br, em produção desde 2024.',
  quem_entra = 'Supabase Auth multi-perfil (e-mail e magic link), com vínculos de supervisão entre profissionais. Pacientes e responsáveis entram pelo Portal próprio, com login e troca de senha separados do sistema clínico.',
  como_funciona = 'Front-end multipágina (um módulo por pasta em frontend/), PWA completo com service worker, splash e ícones. Supabase fducqudteuarrmjndzhm com o banco montado em sprints estruturados: A1 (extensions, enums, 26 tabelas, auditoria com triggers, seeds do catálogo) e A2 (RLS por domínio e handle_new_user). Cada instrumento guarda dados brutos e resultados em tabelas separadas.',
  proximo_passo = 'Atualizar o README e o roadmap ao estado real do código (sprints até 91, engine de testes entregue) e definir a data da virada do app.neuroequilibrium.com.br para o CORTEX_APP.',
  atualizado_em = now(),
  atualizado_por = 'apuracao SQL 36'
where slug = 'cortex-app';

delete from public.projetos_itens where projeto_id = (select id from public.projetos where slug = 'cortex-app');

insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
values
  ((select id from public.projetos where slug = 'cortex-app'), 'link', 'Repositório (privado)', 'https://github.com/gestaoequilibrium/cortex_app', 0),
  ((select id from public.projetos where slug = 'cortex-app'), 'link', 'Sistema antecessor em produção', 'https://app.neuroequilibrium.com.br', 1),
  ((select id from public.projetos where slug = 'cortex-app'), 'link', 'Banco (Supabase)', 'https://supabase.com/dashboard/project/fducqudteuarrmjndzhm', 2),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Dashboard', 3),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Pacientes (pasta do paciente)', 4),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Anamnese (interna e pública)', 5),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Bateria de testes', 6),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Correção — 43 motores por instrumento', 7),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Checklist', 8),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Hipóteses', 9),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Ferramentas de laudo', 10),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Gráficos', 11),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Relatório e solicitação escolar', 12),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Agenda', 13),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Portal do respondente (PWA próprio)', 14),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Pré-cadastro', 15),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Estoque de materiais', 16),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Instrumentos (admin)', 17),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Auditoria', 18),
  ((select id from public.projetos where slug = 'cortex-app'), 'modulo', null, 'Configurações', 19),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'O profissional cadastra o paciente (ou aproveita o pré-cadastro) e conduz a anamnese.', 20),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Monta a bateria e registra as aplicações.', 21),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Lança os dados brutos no módulo de correção do instrumento; o motor calcula, classifica e gera os gráficos.', 22),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Escalas de terceiros vão pelo Portal: o responsável responde em casa, pelo aplicativo próprio.', 23),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Checklist e hipóteses organizam os achados; as ferramentas de laudo montam o documento no padrão CFP 06/2019.', 24),
  ((select id from public.projetos where slug = 'cortex-app'), 'uso', null, 'Sessões, devolutiva e relatório escolar fecham o ciclo — tudo com trilha na auditoria.', 25),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Sprint A1', 'Fundação do banco: extensions, enums, 26 tabelas, auditoria com triggers e seeds do catálogo, em 8 scripts numerados.', 26),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Sprint A2', 'RLS por domínio (catálogo, profissionais, pacientes, dados clínicos, testes e laudos) e trigger handle_new_user.', 27),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Sprints 16–49 · maio', 'Pasta do paciente, portal do respondente completo, capa de laudo, SRS-2 (5 variantes) e BFP.', 28),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Sprints 51–91 · mai–jul', 'Motores em série: CARS-2 ST/HF com normas, ETDAH-AD e Pais, BAI/BDI, ICA, ASSQ, QCP, SCARED, RAVLT (com A7), WAIS-III, WISC-IV, Vineland-3 e outros; estoque, permissões por papéis e fim do auto-logout.', 29),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', '30/07/2026', 'Sprint 91 — último marco datado nos backups do repositório.', 30),
  ((select id from public.projetos where slug = 'cortex-app'), 'marco', 'Apuração 02/09', 'Repositório oficial lido com autorização; desfeita a confusão com o homônimo público, que a ficha anterior havia apurado por engano.', 31),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, '43 motores de correção em frontend/correcao/ — 22 instrumentos ativos e 60+ no catálogo, contando as variantes (SRS-2 tem cinco).', 32),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'WAIS-III e WISC-IV com motores próprios de mais de 1.400 linhas cada, e brutos separados dos resultados no banco.', 33),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Portal do respondente como PWA independente, com login, troca de senha e service worker próprios.', 34),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Banco com 26 tabelas, auditoria imutável de acessos e RLS por domínio desde a fundação.', 35),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'PWA completo no app clínico: manifest, splash, ícones maskable e service workers de assets e push.', 36),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Documentação viva em docs/: especificação funcional, arquitetura técnica, roadmap de execução e guias.', 37),
  ((select id from public.projetos where slug = 'cortex-app'), 'feito', null, 'Trilha de mudança preservada: cerca de 115 backups datados dentro do repositório.', 38),
  ((select id from public.projetos where slug = 'cortex-app'), 'andamento', null, 'Fase E do roadmap — migração contínua dos 50+ instrumentos restantes do catálogo.', 39),
  ((select id from public.projetos where slug = 'cortex-app'), 'falta', null, 'Atualizar o README e o badge de fase: o texto diz Fase A, mas o código já entregou a engine da Fase D.', 40),
  ((select id from public.projetos where slug = 'cortex-app'), 'falta', null, 'Definir e executar a virada do app.neuroequilibrium.com.br para o CORTEX_APP.', 41),
  ((select id from public.projetos where slug = 'cortex-app'), 'falta', null, 'Apurar o PAI: citado nas conversas de projeto, não tem motor no código atual — confirmar se entra no catálogo.', 42),
  ((select id from public.projetos where slug = 'cortex-app'), 'falta', null, 'Arquivar os _backups_ datados fora do branch principal (são ~235 mil linhas de histórico dentro do main).', 43),
  ((select id from public.projetos where slug = 'cortex-app'), 'trava', null, 'Existe um repositório homônimo público (MarquesAnd/cortex_pacientes, 3.763 linhas, acompanhamento de pacientes) — o papel dele precisa ser definido pela direção: protótipo, satélite ou descontinuar.', 44),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Repositório', 'gestaoequilibrium/cortex_app (privado)', 45),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Supabase', 'fducqudteuarrmjndzhm', 46),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Core', '~75.947 linhas (fora backups)', 47),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Tabelas', '26 — inclui *_brutos e *_resultados por instrumento, auditoria_acessos e vínculos de supervisão', 48),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Motores de correção', '43 pastas · 22 instrumentos ativos · 60+ no catálogo', 49),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Maiores módulos', 'pasta.html 3.273 · etdahad 1.937 · instrumentos-admin 1.541 · wisciv 1.442 · waisiii 1.438', 50),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Roadmap', '5 fases: A Fundação → B Workflow → D Engine (22 testes) → C Agenda → E Migração contínua', 51),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Antecessor', 'app.neuroequilibrium.com.br · produção desde 2024', 52),
  ((select id from public.projetos where slug = 'cortex-app'), 'dado', 'Último sprint datado', '91 · 30/07/2026', 53),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'Oito princípios inegociáveis registrados no README — o primeiro: preservação dos modelos de relatório, referência clínica construída ao longo dos anos.', 54),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'A anon key fica no código; a service_role nunca — está literal no próprio config.js do projeto.', 55),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'Dados brutos e resultados vivem em tabelas separadas por instrumento.', 56),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'Auditoria de acessos imutável, exigência de conformidade LGPD.', 57),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'RLS por domínio desde a fundação — permissão no banco, não na interface.', 58),
  ((select id from public.projetos where slug = 'cortex-app'), 'regra', null, 'O motor não carrega dado proprietário de editora; normas entram por arquivo de configuração.', 59),
  ((select id from public.projetos where slug = 'cortex-app'), 'decisao', null, 'Quando acontece a virada do neuroequilibrium para o CORTEX_APP?', 60),
  ((select id from public.projetos where slug = 'cortex-app'), 'decisao', null, 'Qual o destino do repositório público homônimo?', 61),
  ((select id from public.projetos where slug = 'cortex-app'), 'decisao', null, 'O PAI entra no catálogo de motores?', 62);

-- fim do SQL 36
