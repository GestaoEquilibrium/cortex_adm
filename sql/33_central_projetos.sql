-- ============================================================
-- CORTEX Gestão · SQL 33 — Central de Projetos
-- Prontuário vivo dos projetos do grupo: situação, uso,
-- construção, técnico. Estrutura + seed idempotente (itens só
-- entram na primeira criação de cada projeto — edições ficam).
-- ============================================================

create table if not exists public.projetos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  frente text not null default 'Sistemas de gestão',
  icone text not null default 'ti-folder',
  situacao text not null default 'planejado'
    check (situacao in ('ativo','critico','pausado','planejado','concluido')),
  resumo text, meta text, fonte text, objetivo text,
  quem_entra text, como_funciona text,
  proximo_passo text,
  ordem int not null default 100,
  atualizado_em timestamptz not null default now(),
  atualizado_por text
);

create table if not exists public.projetos_itens (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.projetos(id) on delete cascade,
  tipo text not null check (tipo in
    ('feito','andamento','falta','trava','regra','decisao','modulo','uso','link','marco','dado')),
  rotulo text,
  texto text not null,
  ordem int not null default 0
);

create index if not exists projetos_ordem_idx on public.projetos (ordem, nome);
create index if not exists projetos_itens_idx on public.projetos_itens (projeto_id, tipo, ordem);

alter table public.projetos enable row level security;
alter table public.projetos_itens enable row level security;

drop policy if exists prj_sel on public.projetos;
create policy prj_sel on public.projetos for select to authenticated
  using (public.meu_nivel('projetos') in ('ver','editar'));
drop policy if exists prj_ins on public.projetos;
create policy prj_ins on public.projetos for insert to authenticated
  with check (public.meu_nivel('projetos') = 'editar');
drop policy if exists prj_upd on public.projetos;
create policy prj_upd on public.projetos for update to authenticated
  using (public.meu_nivel('projetos') = 'editar');
drop policy if exists prj_del on public.projetos;
create policy prj_del on public.projetos for delete to authenticated
  using (public.meu_nivel('projetos') = 'editar');

drop policy if exists prji_sel on public.projetos_itens;
create policy prji_sel on public.projetos_itens for select to authenticated
  using (public.meu_nivel('projetos') in ('ver','editar'));
drop policy if exists prji_ins on public.projetos_itens;
create policy prji_ins on public.projetos_itens for insert to authenticated
  with check (public.meu_nivel('projetos') = 'editar');
drop policy if exists prji_upd on public.projetos_itens;
create policy prji_upd on public.projetos_itens for update to authenticated
  using (public.meu_nivel('projetos') = 'editar');
drop policy if exists prji_del on public.projetos_itens;
create policy prji_del on public.projetos_itens for delete to authenticated
  using (public.meu_nivel('projetos') = 'editar');

grant select, insert, update, delete on public.projetos to authenticated;
grant select, insert, update, delete on public.projetos_itens to authenticated;

-- ---------- SEED (itens apenas quando o projeto é criado agora) ----------

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('cortex-gestao', 'CORTEX Gestão (ADM)', 'Sistemas de gestão', 'ti-layout-dashboard', 'ativo', 'Plataforma administrativa unificada', 'v64 · 16 módulos · 31 tabelas', 'Repositório e código como fonte primária; ficha mantida pela própria esteira de sprints.', 'Substituir os documentos espalhados por cinco contas do Google Drive, as planilhas soltas e os aplicativos desconectados por uma plataforma única, auditável e com permissão controlada no banco — não apenas escondida na interface.', 'Qualquer colaborador com perfil criado em Configurações. O acesso é por e-mail e senha do Supabase Auth; o que cada um vê depende do perfil, aplicado por RLS no banco.', 'React e Babel compilando JSX direto no navegador, sem etapa de build. O front-end é um único app.jsx servido pelo GitHub Pages; o banco é um projeto Supabase próprio. Instalável como PWA no celular, com service worker, ícones e splash próprios.', 'Entregar o SQL 20 — sincronização incremental do Ponto Digital legado para ponto_registros.', 10, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'link', 'Abrir o sistema', 'https://gestaoequilibrium.github.io/cortex_adm/', 0),
  ((select id from ins), 'link', 'Relógio de ponto (tela cheia)', 'https://gestaoequilibrium.github.io/cortex_adm/ponto.html', 1),
  ((select id from ins), 'link', 'Repositório', 'https://github.com/gestaoequilibrium/cortex_adm', 2),
  ((select id from ins), 'link', 'Banco (Supabase)', 'https://supabase.com/dashboard/project/vznjdgofvjbyivqkygvx', 3),
  ((select id from ins), 'modulo', null, 'Painel', 4),
  ((select id from ins), 'modulo', null, 'Arquivos', 5),
  ((select id from ins), 'modulo', null, 'Modelos', 6),
  ((select id from ins), 'modulo', null, 'RH e equipe', 7),
  ((select id from ins), 'modulo', null, 'Salas', 8),
  ((select id from ins), 'modulo', null, 'PEE', 9),
  ((select id from ins), 'modulo', null, 'Projetos', 10),
  ((select id from ins), 'modulo', null, 'Relatórios', 11),
  ((select id from ins), 'modulo', null, 'Infinity', 12),
  ((select id from ins), 'modulo', null, 'Demandas', 13),
  ((select id from ins), 'modulo', null, 'Call Center', 14),
  ((select id from ins), 'modulo', null, 'Auditoria', 15),
  ((select id from ins), 'modulo', null, 'Outros CORTEX', 16),
  ((select id from ins), 'modulo', null, 'Instruções', 17),
  ((select id from ins), 'modulo', null, 'Minha conta', 18),
  ((select id from ins), 'modulo', null, 'Configurações', 19),
  ((select id from ins), 'uso', null, 'Abrir o endereço do sistema e entrar com e-mail e senha.', 20),
  ((select id from ins), 'uso', null, 'No primeiro acesso, ir em Minha conta para completar foto, telefone, formação e registro profissional.', 21),
  ((select id from ins), 'uso', null, 'A sidebar tem três estados: completa, só ícones e oculta. O quadradinho no canto superior esquerdo alterna.', 22),
  ((select id from ins), 'uso', null, 'Para dar acesso a alguém: Configurações › Pessoas, criar o perfil, marcar módulo por módulo entre oculto, ver e editar, e vincular o login à pessoa.', 23),
  ((select id from ins), 'uso', null, 'Arquivos e Modelos registram cada download na Auditoria com autor, data e item.', 24),
  ((select id from ins), 'uso', null, 'O relógio de ponto roda em página separada (ponto.html), pensada para a máquina fixa, com validação por PIN.', 25),
  ((select id from ins), 'marco', 'Sprints 1–3', 'Fundação SQL e casca React com a sidebar flutuante de três estados.', 26),
  ((select id from ins), 'marco', 'Sprint 4', 'Configurações: matriz de perfis e permissões, gestão de pessoas e editor de links entre os CORTEX.', 27),
  ((select id from ins), 'marco', 'Sprint 6', 'Identidade trocada para o azul Equilibrium #1068B0, extraído pixel a pixel do logo.', 28),
  ((select id from ins), 'marco', 'Sprints 7–8', 'Módulos Arquivos e Modelos, com auditoria em cada download.', 29),
  ((select id from ins), 'marco', 'Sprints 9–10', 'Módulo RH com importação CSV em massa e módulo Ponto puxando o Ponto Digital, mais o relógio com PIN.', 30),
  ((select id from ins), 'marco', 'Sprint 24 + SQL 15/16', 'Módulo PEE com os seis cadernos, 81 documentos e os nove textos do PDGE.', 31),
  ((select id from ins), 'marco', 'SQL 17–19', 'RH do SHIREQ importado e vínculo login–colaborador com as RPCs meu_card.', 32),
  ((select id from ins), 'marco', 'Sprints 25–29', 'Minha conta com recorte de foto, vínculo corrigido e organograma interativo com zoom e arrasto.', 33),
  ((select id from ins), 'marco', 'Sprints 49–54', 'Motor de carga horária: previsto por dia derivado da ficha, alertas no relógio e para a direção, e espelho mensal paisagem no padrão oficial (SQL 29).', 34),
  ((select id from ins), 'marco', 'Sprints 55–57', 'Prévia universal: espelho e documentos abrem em janela suspensa antes de qualquer download.', 35),
  ((select id from ins), 'marco', 'Sprint 58', 'Módulo Call Center com o mural de Informativos (SQL 30).', 36),
  ((select id from ins), 'marco', 'Sprints 59–60', 'Contrato de estágio de ponta a ponta: atividades por área, arquivamento em CONTRATOS ESTAGIÁRIOS, vínculo com trava (SQL 31) e termo revisado com Anexo I e Declaração de Responsabilidade.', 37),
  ((select id from ins), 'marco', 'Sprints 61–63', 'Férias na aba Faltas e atestados e no espelho (SQL 32), PWA com ícones, splash e safe-areas, e correção do espelho.', 38),
  ((select id from ins), 'marco', 'Sprint 64', 'Central de Projetos vira módulo do CORTEX, com edição gravada no banco (SQL 33).', 39),
  ((select id from ins), 'feito', null, 'Dezesseis módulos ativos, confirmados no código.', 40),
  ((select id from ins), 'feito', null, 'Trinta e uma tabelas no banco, incluindo férias, carga horária, call center e a própria Central.', 41),
  ((select id from ins), 'feito', null, 'Auditoria imutável de criar, editar, excluir, ver, baixar, entrar e sair.', 42),
  ((select id from ins), 'feito', null, 'Permissão por RLS no banco, com matriz de perfis por módulo e subaba.', 43),
  ((select id from ins), 'feito', null, 'PWA instalável com service worker, ícones, splash iOS e o relógio como app próprio.', 44),
  ((select id from ins), 'feito', null, 'Gerador de documentos de estágio com prévia, arquivamento automático e vínculo contrato–colaborador.', 45),
  ((select id from ins), 'feito', null, 'Espelho mensal de ponto no padrão oficial, com férias, faltas, atestados e extras autorizadas.', 46),
  ((select id from ins), 'feito', null, 'Manual de Uso com 13 páginas (referente à v48; atualização pendente).', 47),
  ((select id from ins), 'andamento', null, 'Central de Projetos recém-transplantada — fichas em revisão pela direção.', 48),
  ((select id from ins), 'falta', null, 'SQL 20 — sincronização incremental do Ponto Digital legado para ponto_registros.', 49),
  ((select id from ins), 'falta', null, 'Padronizar os contratos de prestador: duas famílias com erros de copia-e-cola, razão social desatualizada e o nome grafado "Welisson".', 50),
  ((select id from ins), 'falta', null, 'Ponte ponte_rh no sentido CORTEX para Infinity (o Infinity já puxa o ponto por CPF; falta o ciclo de volta).', 51),
  ((select id from ins), 'falta', null, 'Atualizar o Manual de Uso da v48 para a versão corrente.', 52),
  ((select id from ins), 'falta', null, 'Definir a política de encerramento dos sistemas que o CORTEX absorveu.', 53),
  ((select id from ins), 'trava', null, 'A padronização de contratos de prestador aguarda a decisão de base: pasta "CONTRATO NOVO 16_07" ou modelos clássicos.', 54),
  ((select id from ins), 'dado', 'Supabase', 'vznjdgofvjbyivqkygvx', 55),
  ((select id from ins), 'dado', 'Repositório', 'gestaoequilibrium/cortex_adm', 56),
  ((select id from ins), 'dado', 'Publicado em', 'gestaoequilibrium.github.io/cortex_adm', 57),
  ((select id from ins), 'dado', 'Pasta de patches', 'D:\NOVO CORTEX ADM\PATCHES', 58),
  ((select id from ins), 'dado', 'Versão', 'v64', 59),
  ((select id from ins), 'dado', 'Arquivos SQL', '01 a 33, com lacunas', 60),
  ((select id from ins), 'dado', 'Fontes', 'Outfit · JetBrains Mono', 61),
  ((select id from ins), 'regra', null, 'Toda entrega vai na mesma mensagem com sprint_NN_nome.zip, aplicar_patch.ps1 e APLICAR_PATCH.bat. SQL novo vai separado.', 62),
  ((select id from ins), 'regra', null, 'Os zips são cumulativos e vão para a pasta PATCHES.', 63),
  ((select id from ins), 'regra', null, 'Cada sprint incrementa o carimbo de versão no rodapé da sidebar e o cache-buster do index.html.', 64),
  ((select id from ins), 'regra', null, 'Patches em app.jsx usam âncora única com assert, validados com Babel e node --check.', 65),
  ((select id from ins), 'regra', null, 'Todo SQL é testado duas vezes no PostgreSQL local antes da entrega.', 66),
  ((select id from ins), 'regra', null, 'PowerShell é colado no console: sem $PSScriptRoot, sem $MyInvocation, sem try/catch/finally.', 67),
  ((select id from ins), 'regra', null, 'Permissão vive no banco por RLS, nunca só escondida na interface.', 68),
  ((select id from ins), 'regra', null, 'A chave anon pode ficar no código. A service_role nunca.', 69),
  ((select id from ins), 'decisao', null, 'Contratos de prestador: pasta "CONTRATO NOVO 16_07" ou modelos clássicos?', 70),
  ((select id from ins), 'decisao', null, 'Qual o escopo do próximo sprint?', 71)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('central', 'Central de Projetos', 'Sistemas de gestão', 'ti-layout-grid', 'ativo', 'Este módulo — prontuário vivo dos projetos', '15 fichas · edição no banco', 'Nasceu do protótipo HTML de 02/09/2026 (três versões na conversa da Central) e foi transplantado como módulo no sprint 64.', 'Manter num só lugar, dentro do CORTEX, a situação, as instruções de uso, o histórico de construção e os dados técnicos de cada projeto do grupo — legível por toda a equipe e atualizável pela direção, sem depender de arquivo solto.', 'Perfis com o módulo Projetos liberado na matriz de Configurações: nível ver para ler, nível editar para atualizar as fichas e criar projetos.', 'Módulo do CORTEX apoiado nas tabelas projetos e projetos_itens, com RLS por perfil e auditoria. Cada ficha abre em cinco abas: Situação, Como usar, Construção, Técnico e Editar. Salvar grava direto no banco.', 'Revisar as quinze fichas — em especial as marcadas "a apurar" — e completar o que só a direção sabe.', 15, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'uso', null, 'Abrir o módulo Projetos na sidebar.', 0),
  ((select id from ins), 'uso', null, 'Filtrar por situação nos chips ou buscar pelo nome.', 1),
  ((select id from ins), 'uso', null, 'Clicar num card abre o prontuário; as abas separam situação, uso, construção e técnico.', 2),
  ((select id from ins), 'uso', null, 'Quem tem nível editar altera qualquer campo na aba Editar — salvar grava no banco na hora.', 3),
  ((select id from ins), 'uso', null, 'O botão Atualizar com o Claude copia o retrato atual de todos os projetos para colar numa conversa e pedir a apuração contra os repositórios.', 4),
  ((select id from ins), 'marco', '02/09 · v1', 'Protótipo rail + prontuário, na linguagem de fichas da clínica.', 5),
  ((select id from ins), 'marco', '02/09 · v2', 'Refeito em cards e pop-up com os tokens reais do CORTEX, lidos do repositório; cinco abas e apuração contra o código (v63, folha.jsx, migração 009 ausente).', 6),
  ((select id from ins), 'marco', '02/09 · v3', 'Editor completo dos 23 campos, criar e excluir projeto, aviso de alterações não salvas.', 7),
  ((select id from ins), 'marco', 'Sprint 64', 'Transplante para dentro do CORTEX: tabelas com RLS, seed das quinze fichas e edição gravando no banco.', 8),
  ((select id from ins), 'feito', null, 'Estrutura de dados definida (projetos e itens polimórficos).', 9),
  ((select id from ins), 'feito', null, 'Quinze fichas semeadas com a apuração de 02/09 e as correções da esteira local.', 10),
  ((select id from ins), 'falta', null, 'Revisar as fichas marcadas "a apurar" (CORTEX ABA, partes do CORTEX_APP).', 11),
  ((select id from ins), 'falta', null, 'Definir quem além da direção ganha nível ver.', 12),
  ((select id from ins), 'dado', 'Tabelas', 'projetos · projetos_itens', 13),
  ((select id from ins), 'dado', 'Nascimento', '02/09/2026, conversa "Central de controle de projetos"', 14),
  ((select id from ins), 'regra', null, 'Código vence conversa: apuração de ficha técnica parte do repositório, não da memória.', 15),
  ((select id from ins), 'regra', null, 'Onde não houver informação apurada, a ficha diz "a apurar" — nunca inventa.', 16)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('infinity', 'Infinity', 'Sistemas de gestão', 'ti-cash-banknote', 'ativo', 'Sistema financeiro', '12.171 linhas · 16 módulos', 'Repositório lido em 02/09/2026. Contagem de linhas e lista de arquivos vêm do código.', 'Ser a camada financeira e operacional do grupo — contas a pagar, DRE, fluxo de caixa, repasse, folha, conciliação, RH e escalas de sala — com isolamento multi-empresa e trilha de auditoria.', 'Três papéis: admin, editor e viewer. O convite de membro passa pela função invite_member. O isolamento entre empresas é por company_id via a função security definer get_my_company_id().', 'React e Babel via CDN, sem build. A ordem de carregamento dos arquivos é crítica: supabase, data, ui, charts, widgets, pages, auth, salas, rh, repasse, repasse2, folha, conciliacao, ajuda, tutorial, app. Cliente REST puro, sem SDK. Design em tokens OKLCH com estética de vidro.', 'Escrever a migração 009_producao_e_contas.sql — as três estruturas fantasma seguem sem versionamento.', 20, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'link', 'Abrir o sistema', 'https://gestaoequilibrium.github.io/infinity_app/', 0),
  ((select id from ins), 'link', 'Repositório', 'https://github.com/gestaoequilibrium/infinity_app', 1),
  ((select id from ins), 'modulo', null, 'Painel', 2),
  ((select id from ins), 'modulo', null, 'Transações', 3),
  ((select id from ins), 'modulo', null, 'Contas a pagar', 4),
  ((select id from ins), 'modulo', null, 'DRE', 5),
  ((select id from ins), 'modulo', null, 'Fluxo de caixa', 6),
  ((select id from ins), 'modulo', null, 'Projeção', 7),
  ((select id from ins), 'modulo', null, 'Conciliação', 8),
  ((select id from ins), 'modulo', null, 'Repasse', 9),
  ((select id from ins), 'modulo', null, 'Folha', 10),
  ((select id from ins), 'modulo', null, 'RH', 11),
  ((select id from ins), 'modulo', null, 'Salas e escalas', 12),
  ((select id from ins), 'modulo', null, 'Categorias', 13),
  ((select id from ins), 'modulo', null, 'Ajuda', 14),
  ((select id from ins), 'modulo', null, 'Tutorial', 15),
  ((select id from ins), 'uso', null, 'Entrar com o login vinculado à empresa; o que aparece depende do papel.', 16),
  ((select id from ins), 'uso', null, 'A Folha do mês puxa os colaboradores CLT e estágio das duas empresas e casa com o ponto do CORTEX por CPF — dias, faltas e atestados caem sozinhos.', 17),
  ((select id from ins), 'uso', null, 'Quando não há ponto para a pessoa, os campos ficam manuais e a tela não trava.', 18),
  ((select id from ins), 'uso', null, 'A folha calcula pelas tabelas oficiais de 2026 (INSS pela Portaria MPS/MF e IRRF pela Lei 15.270/25), em duas trilhas: CLT e estágio.', 19),
  ((select id from ins), 'uso', null, 'Tudo é editável antes de fechar, e o fechamento exporta Excel.', 20),
  ((select id from ins), 'uso', null, 'No repasse, a regra de 13,33% de imposto e as divisões 63/37 e 65/35 já estão embutidas.', 21),
  ((select id from ins), 'marco', 'Migrações 000–008', 'Reset, schema, RBAC e RH, correções de perfis, convite de membro, módulo Salas e seeds de escala.', 22),
  ((select id from ins), 'marco', 'Importação SHIREQ', 'Script idempotente com bloco DO resolvendo company_id e user_id por nome e e-mail.', 23),
  ((select id from ins), 'marco', 'Ponte de leitura', 'Endpoint ponte_resumo entregando o resumo financeiro ao painel do CORTEX.', 24),
  ((select id from ins), 'marco', 'folha.jsx', 'Fechamento de folha com integração ao ponto do CORTEX por CPF — descoberto na apuração de 02/09.', 25),
  ((select id from ins), 'marco', 'conciliacao.jsx', 'Módulo de conciliação, 293 linhas — também descoberto na apuração.', 26),
  ((select id from ins), 'marco', 'Auditoria técnica', 'Destrinchamento arquivo por arquivo, que revelou as três estruturas fantasma.', 27),
  ((select id from ins), 'feito', null, 'Cerca de 12.171 linhas em 16 arquivos, com ordem de carregamento definida.', 28),
  ((select id from ins), 'feito', null, 'Cliente REST puro para o Supabase, com RBAC em admin, editor e viewer.', 29),
  ((select id from ins), 'feito', null, 'Motor financeiro com exclusão de transferências internas e defasagem de convênio: Unimed no fim do mês seguinte, NDI no dia 15 do mês subsequente.', 30),
  ((select id from ins), 'feito', null, 'Motor de repasse com imposto de 13,33%, divisões 63/37 e 65/35 e deduções da holding.', 31),
  ((select id from ins), 'feito', null, 'Módulo de folha com tabelas oficiais 2026 e integração ao ponto do CORTEX por CPF.', 32),
  ((select id from ins), 'feito', null, 'Módulo de conciliação.', 33),
  ((select id from ins), 'feito', null, 'Módulo de RH completo e módulo de salas e escalas.', 34),
  ((select id from ins), 'feito', null, '18 tabelas com RLS ativo e isolamento por company_id.', 35),
  ((select id from ins), 'andamento', null, 'Folha em uso com três pendências marcadas no próprio código, endereçadas ao Marcos.', 36),
  ((select id from ins), 'falta', null, 'Migração 009_producao_e_contas.sql — confirmado em 02/09 que continua ausente.', 37),
  ((select id from ins), 'falta', null, 'Anexo do Simples da Talentos.', 38),
  ((select id from ins), 'falta', null, 'Percentual patronal do Med Center.', 39),
  ((select id from ins), 'falta', null, 'Regra de vale-transporte.', 40),
  ((select id from ins), 'falta', null, 'Fechar o ciclo de volta: o pago retornar ao CORTEX como registro permanente.', 41),
  ((select id from ins), 'trava', null, 'producao_mensal, contas_bancarias e a coluna conta em transactions não existem em nenhuma migração. Num banco novo, a Projeção e os saldos quebram em silêncio.', 42),
  ((select id from ins), 'trava', null, 'A folha tem três pendências do Marcos anotadas no código.', 43),
  ((select id from ins), 'dado', 'Repositório', 'gestaoequilibrium/infinity_app', 44),
  ((select id from ins), 'dado', 'Linhas totais', '12.171', 45),
  ((select id from ins), 'dado', 'Maior arquivo', 'pages.jsx · 2.395 linhas', 46),
  ((select id from ins), 'dado', 'Folha', 'folha.jsx · 488 linhas', 47),
  ((select id from ins), 'dado', 'Conciliação', 'conciliacao.jsx · 293 linhas', 48),
  ((select id from ins), 'dado', 'Med Center (company_id)', '7663eaab-3fa3-4067-91f6-71f8c77f8b55', 49),
  ((select id from ins), 'dado', 'Talentos (company_id)', '17749e39-3e73-41ab-b731-9463d760887b', 50),
  ((select id from ins), 'regra', null, 'A chave anon pode ficar no código do cliente. A service_role nunca.', 51),
  ((select id from ins), 'regra', null, 'Estrutura criada à mão no painel é dívida técnica: sempre versionar em migração.', 52),
  ((select id from ins), 'regra', null, 'O Infinity fica em projeto Supabase próprio. O CORTEX só lê dele, por ponte.', 53),
  ((select id from ins), 'regra', null, 'A ordem de carregamento dos arquivos é crítica e não muda sem revisão.', 54),
  ((select id from ins), 'decisao', null, 'Folha: escopo gerencial ou fiscal?', 55),
  ((select id from ins), 'decisao', null, 'Como definir a jornada mensal por colaborador?', 56),
  ((select id from ins), 'decisao', null, 'Saldo positivo e negativo de banco de horas: como tratar?', 57),
  ((select id from ins), 'decisao', null, 'Qual a fórmula do valor da hora?', 58)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('ponto', 'Ponto Digital', 'Sistemas de gestão', 'ti-clock-hour-4', 'ativo', 'Registro de ponto, legado em operação', 'Firebase + Supabase legado', 'Conversas do Projeto. Não verificado contra código na apuração de 02/09.', 'Registrar entrada e saída numa máquina dedicada no escritório, com painel administrativo separado para gestão e relatórios.', 'O colaborador seleciona o nome na lista e valida por senha ou PIN. O painel administrativo tem senha própria, guardada na coleção settings.', 'HTML único com React via CDN. Fala com o Firestore pela API REST, sem SDK, em três coleções: employees, timeRecords e settings. O CORTEX puxa esses dados por HTTP server-side.', 'Entregar o SQL 20 — a mesma ação que destrava o módulo Ponto do CORTEX.', 30, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'link', 'Relógio dentro do CORTEX', 'https://gestaoequilibrium.github.io/cortex_adm/ponto.html', 0),
  ((select id from ins), 'modulo', null, 'Página do colaborador', 1),
  ((select id from ins), 'modulo', null, 'Dashboard', 2),
  ((select id from ins), 'modulo', null, 'Colaboradores', 3),
  ((select id from ins), 'modulo', null, 'Relatórios', 4),
  ((select id from ins), 'modulo', null, 'Configurações', 5),
  ((select id from ins), 'uso', null, 'O colaborador escolhe o nome, digita a senha e bate entrada ou saída.', 6),
  ((select id from ins), 'uso', null, 'Após bater, aparece o resumo do dia. Batida duplicada é bloqueada.', 7),
  ((select id from ins), 'uso', null, 'No painel, Relatórios gera o banco de horas mensal e exporta CSV ou PDF, individual ou de todos.', 8),
  ((select id from ins), 'uso', null, 'Para corrigir um registro: painel, localizar a batida, e usar editar, apagar ou lançar registro faltante pelo modal.', 9),
  ((select id from ins), 'marco', 'v1', 'Protótipo em localStorage.', 10),
  ((select id from ins), 'marco', 'v2', 'Migração para Firestore por API REST, sem SDK.', 11),
  ((select id from ins), 'marco', 'v3.0', 'Correção de registros: editar horário, apagar e lançar registro faltante por modal.', 12),
  ((select id from ins), 'marco', 'Sprint 10 do CORTEX', 'Dados integrados ao CORTEX por pull HTTP server-side.', 13),
  ((select id from ins), 'feito', null, 'Página do colaborador com relógio ao vivo e proteção contra batida duplicada.', 14),
  ((select id from ins), 'feito', null, 'Painel com Dashboard, Colaboradores, Relatórios e Configurações.', 15),
  ((select id from ins), 'feito', null, 'Banco de horas mensal, exportação CSV e PDF.', 16),
  ((select id from ins), 'feito', null, 'Correção de registros por modal.', 17),
  ((select id from ins), 'feito', null, 'Regras do Firestore liberando apenas as três coleções em uso.', 18),
  ((select id from ins), 'feito', null, 'Dados integrados ao CORTEX.', 19),
  ((select id from ins), 'andamento', null, 'Convivência entre o legado e o módulo Ponto do CORTEX.', 20),
  ((select id from ins), 'falta', null, 'SQL 20 — sincronizar incrementalmente os registros novos para ponto_registros.', 21),
  ((select id from ins), 'falta', null, 'Definir data de desligamento do sistema legado.', 22),
  ((select id from ins), 'falta', null, 'Decidir sobre a notificação de batidas por Telegram, proposta e nunca resolvida.', 23),
  ((select id from ins), 'dado', 'Firebase', 'ponto-digital-equilibrium', 24),
  ((select id from ins), 'dado', 'Supabase legado', 'qybtqjyujgaigwytypha', 25),
  ((select id from ins), 'dado', 'Coleções', 'employees · timeRecords · settings', 26),
  ((select id from ins), 'regra', null, 'O Firestore foi criado em modo produção. Coleção nova exige regra nova, senão a escrita é negada em silêncio.', 27),
  ((select id from ins), 'decisao', null, 'Quando desligar o Ponto Digital legado?', 28)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('shireq', 'SHIREQ', 'Sistemas de gestão', 'ti-users-group', 'pausado', 'Sistema humano de informação e recursos', '19 colaboradores · 5 alertas', 'Conversas do Projeto. Dados já replicados no CORTEX.', 'Centralizar o quadro de pessoal — CLT, PJ, estagiários e prestadores — com alertas legais, assistente de rescisão e controle de documentação.', 'RBAC herdado do Infinity, onde o módulo nasceu.', 'Nasceu como módulo do Infinity (rh.jsx, 2.003 linhas). Os registros foram importados para o CORTEX pelos SQL 17 e 18, criando duplicidade de fonte.', 'Decidir: o SHIREQ vira parte do CORTEX ou segue como sistema próprio? Os dados já estão nos dois lugares.', 40, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'modulo', null, 'Quadro de pessoal', 0),
  ((select id from ins), 'modulo', null, 'Alertas legais', 1),
  ((select id from ins), 'modulo', null, 'Assistente de rescisão', 2),
  ((select id from ins), 'modulo', null, 'Documentação', 3),
  ((select id from ins), 'uso', null, 'Hoje o caminho prático é o módulo RH do CORTEX Gestão, que tem os mesmos registros.', 4),
  ((select id from ins), 'marco', 'Migração 002', 'RBAC corrigido e estrutura de RH criada no Infinity.', 5),
  ((select id from ins), 'marco', 'Importação', '19 colaboradores importados como ativos.', 6),
  ((select id from ins), 'marco', 'Reescrita', 'Script refeito com bloco DO que resolve company_id e user_id por consulta.', 7),
  ((select id from ins), 'marco', 'SQL 17–18 do CORTEX', 'Registros migrados para o CORTEX, criando a duplicidade que segue aberta.', 8),
  ((select id from ins), 'feito', null, 'Script de importação idempotente commitado no repositório do Infinity.', 9),
  ((select id from ins), 'feito', null, '19 colaboradores importados entre setores administrativo e clínico.', 10),
  ((select id from ins), 'feito', null, 'Cinco alertas legais, três críticos.', 11),
  ((select id from ins), 'feito', null, 'Três painéis salvos, o último com RBAC completo e assistente de rescisão.', 12),
  ((select id from ins), 'falta', null, 'Decidir se o SHIREQ continua existindo ou se está absorvido pelo módulo RH do CORTEX.', 13),
  ((select id from ins), 'falta', null, 'Processar as rescisões pendentes.', 14),
  ((select id from ins), 'falta', null, 'Fechar as três tarefas de RH em aberto.', 15),
  ((select id from ins), 'trava', null, 'Duplicidade de fonte de verdade: os mesmos colaboradores vivem no SHIREQ e no CORTEX.', 16),
  ((select id from ins), 'dado', 'Colaboradores', '19', 17),
  ((select id from ins), 'dado', 'Alertas legais', '5 · 3 críticos', 18),
  ((select id from ins), 'dado', 'Arquivo no Infinity', 'rh.jsx · 2.003 linhas', 19),
  ((select id from ins), 'regra', null, 'Colunas UUID exigem cast ::uuid em literais de texto.', 20),
  ((select id from ins), 'regra', null, 'auth.uid() devolve nulo no editor SQL do painel. Consultar por e-mail.', 21),
  ((select id from ins), 'regra', null, 'O token de push do GitHub precisa pertencer à conta dona do repositório.', 22),
  ((select id from ins), 'decisao', null, 'SHIREQ vira módulo do CORTEX ou continua sistema separado?', 23)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('salas', 'Guia de Salas', 'Sistemas de gestão', 'ti-door', 'concluido', 'Agendamento e croqui de salas', '243 livres · 63,8% ocupação', 'Conversas do Projeto.', 'Dar às duas unidades um mapa vivo de ocupação de salas, com pôster de elevador impresso e app sincronizado em tempo real.', 'Sem tela de login. Credenciais fixas no arquivo, com fallback em localStorage para modo offline.', 'HTML único com Supabase e sincronização em tempo real por canal. O CORTEX Gestão também tem um módulo Salas.', 'Decidir se o Guia de Salas continua autônomo ou se o módulo Salas do CORTEX assume.', 50, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'modulo', null, 'Croqui por andar', 0),
  ((select id from ins), 'modulo', null, 'Grade P1/P2/P3', 1),
  ((select id from ins), 'modulo', null, 'Calculadora de ocupação', 2),
  ((select id from ins), 'modulo', null, 'Exportação', 3),
  ((select id from ins), 'uso', null, 'Clicar numa sala abre o modal de edição de nome, especialidade e cor.', 4),
  ((select id from ins), 'uso', null, 'A grade usa P1 às 7h, P2 às 12h e P3 às 16h.', 5),
  ((select id from ins), 'uso', null, 'O botão de impressão gera o cartão em paisagem para o pôster do elevador.', 6),
  ((select id from ins), 'uso', null, 'Exportar puxa os dados ao vivo do banco em CSV ou JSON.', 7),
  ((select id from ins), 'marco', 'Geradores Python', 'Croqui por andar em HTML e PDF para EQ1 e EQ2.', 8),
  ((select id from ins), 'marco', 'Padronização', 'Rótulos M/T/N trocados por P1/P2/P3 em todos os geradores.', 9),
  ((select id from ins), 'marco', 'App web', 'Supabase com tempo real, modal por sala e exportação.', 10),
  ((select id from ins), 'marco', 'Correção', 'schema.sql idempotente com bloco DO, contornando o erro 42710 do realtime.', 11),
  ((select id from ins), 'feito', null, 'Croqui por andar das duas unidades.', 12),
  ((select id from ins), 'feito', null, 'Períodos padronizados em P1, P2 e P3.', 13),
  ((select id from ins), 'feito', null, 'Planilha com fórmulas ao vivo: 243 horários livres, 63,8% de ocupação.', 14),
  ((select id from ins), 'feito', null, 'App web com tempo real e exportação CSV e JSON.', 15),
  ((select id from ins), 'falta', null, 'Absorver ou aposentar: o CORTEX Gestão já tem módulo Salas.', 16),
  ((select id from ins), 'dado', 'Supabase', 'cvzljysxvdhfngxnedhi', 17),
  ((select id from ins), 'dado', 'Numeração EQ1', 'centesimal, 101 a 307', 18),
  ((select id from ins), 'dado', 'Salas EQ2', '14', 19),
  ((select id from ins), 'regra', null, 'A URL do Supabase não pode levar o sufixo /rest/v1/. Quando leva, o supabase-js cai em modo local sem dar erro.', 20),
  ((select id from ins), 'decisao', null, 'Manter autônomo ou consolidar no CORTEX?', 21)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('pee', 'PEE', 'Sistemas de gestão', 'ti-book-2', 'ativo', 'Padrão Equilibrium de Excelência', '6 cadernos · 81 documentos', 'Conversas do Projeto. Tabelas pee_pastas, pee_docs e pee_vencimentos confirmadas no código.', 'Capturar a vida operacional do Equilibrium num sistema vivo e auditável, de propriedade institucional. Não é ferramenta de compliance.', 'Cinco perfis previstos: Direção, Coordenação, Gestor de setor, Colaborador e Comitê. Até 20 usuários.', 'Módulo dentro do CORTEX, apoiado em pee_pastas, pee_docs e pee_vencimentos. Cada documento recebe código automático PEE-N-NNN.', 'Definir a cadência de revisão e o aprovador de cada caderno — sem isso o acervo envelhece sozinho.', 60, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'link', 'Módulo PEE no CORTEX', 'https://gestaoequilibrium.github.io/cortex_adm/', 0),
  ((select id from ins), 'modulo', null, 'Caderno 0 · Marca e Promessa', 1),
  ((select id from ins), 'modulo', null, 'Caderno 1 · Implantação', 2),
  ((select id from ins), 'modulo', null, 'Caderno 2 · Operação', 3),
  ((select id from ins), 'modulo', null, 'Caderno 3 · Gestão', 4),
  ((select id from ins), 'modulo', null, 'Caderno 4 · Controle', 5),
  ((select id from ins), 'modulo', null, 'Caderno 5 · Formação', 6),
  ((select id from ins), 'uso', null, 'Abrir o CORTEX e ir na aba PEE.', 7),
  ((select id from ins), 'uso', null, 'Navegar por caderno e pasta, ou usar a busca na visão em lista.', 8),
  ((select id from ins), 'uso', null, 'Clicar num documento abre o leitor de texto integral.', 9),
  ((select id from ins), 'uso', null, 'Documentos com vencimento aparecem com alerta automático.', 10),
  ((select id from ins), 'marco', 'Decisão inicial', 'Plataformas de terceiros recusadas: o sistema seria próprio, para manter propriedade e auditabilidade.', 11),
  ((select id from ins), 'marco', 'Ingestão', 'Manual operacional fatiado em documentos e pastas; PDGE populando o Caderno 3.', 12),
  ((select id from ins), 'marco', 'Fundamento', 'Pasta no Caderno 0 com os quatro pilares da mordomia cristã: Tempo, Talentos, Tesouros e Criação.', 13),
  ((select id from ins), 'marco', 'Sprint 24 + SQL 15/16', 'Módulo ativado com 81 documentos em 18 pastas e os nove textos do PDGE.', 14),
  ((select id from ins), 'feito', null, 'Seis cadernos estruturados e 81 documentos em 18 pastas.', 15),
  ((select id from ins), 'feito', null, 'Nove textos oficiais do PDGE com garantia de nunca sobrescrever.', 16),
  ((select id from ins), 'feito', null, 'Os quatro pilares da mordomia cristã como fundamento do Caderno 0.', 17),
  ((select id from ins), 'feito', null, 'Cinco perfis de acesso definidos e alertas de vencimento automáticos.', 18),
  ((select id from ins), 'andamento', null, 'Ciclo de revisão sob responsabilidade da coordenação.', 19),
  ((select id from ins), 'falta', null, 'Definir a cadência formal de revisão e quem aprova cada caderno.', 20),
  ((select id from ins), 'falta', null, 'Colocar os até 20 usuários previstos em uso real.', 21),
  ((select id from ins), 'falta', null, 'Fechar os cadernos ainda incompletos.', 22),
  ((select id from ins), 'dado', 'Documentos', '81 em 18 pastas', 23),
  ((select id from ins), 'dado', 'Cadernos', '0 a 5', 24),
  ((select id from ins), 'dado', 'Tabelas', 'pee_pastas · pee_docs · pee_vencimentos', 25),
  ((select id from ins), 'regra', null, 'Migração para plataforma de terceiros está descartada.', 26),
  ((select id from ins), 'regra', null, 'Canal de denúncias foi recusado: o PEE não é infraestrutura de compliance.', 27),
  ((select id from ins), 'regra', null, 'Nomes de terceiros e autoria não aparecem na interface.', 28),
  ((select id from ins), 'regra', null, 'Os textos do PDGE nunca são sobrescritos por importação.', 29)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('mais-eq', 'Mais Equilibrium', 'Sistemas de gestão', 'ti-calendar-event', 'ativo', 'Sistema de terceiros', 'Agenda, faturamento e chamados', 'Conversas do Projeto. Sistema de terceiros, sem acesso ao código.', 'Operar agenda, faturamento, guias, contratos e o módulo de chamados internos.', 'Login fornecido pelo próprio fornecedor.', 'Software de terceiros. Sem integração planejada com o Infinity ou o CORTEX.', 'Puxar o retrato atual dos chamados e verificar se o gargalo de atribuição persiste.', 70, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'modulo', null, 'Agenda', 0),
  ((select id from ins), 'modulo', null, 'Faturamento', 1),
  ((select id from ins), 'modulo', null, 'Guias', 2),
  ((select id from ins), 'modulo', null, 'Contratos', 3),
  ((select id from ins), 'modulo', null, 'Chamados', 4),
  ((select id from ins), 'uso', null, 'Chamado é aberto com responsável, solicitante, vencimento, prioridade e situação.', 5),
  ((select id from ins), 'marco', 'Em uso', 'Adotado antes dos sistemas próprios. Segue operando em paralelo.', 6),
  ((select id from ins), 'marco', 'Retrato', 'Levantamento apontou 21 de 25 chamados fora do prazo, muitos com responsável "Pendente".', 7),
  ((select id from ins), 'feito', null, 'Em uso corrente pela operação.', 8),
  ((select id from ins), 'feito', null, 'Módulo de chamados usado para gestão de demandas.', 9),
  ((select id from ins), 'falta', null, 'Resolver o gargalo de atribuição dos chamados.', 10),
  ((select id from ins), 'falta', null, 'Definir se o módulo Demandas do CORTEX substitui os chamados daqui ou se convivem.', 11),
  ((select id from ins), 'regra', null, 'Sem integração planejada. É sistema de terceiros e assim permanece.', 12),
  ((select id from ins), 'decisao', null, 'Demandas do CORTEX substitui os chamados do Mais Equilibrium?', 13)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('cortex-app', 'CORTEX_APP', 'Sistemas clínicos', 'ti-brain', 'ativo', 'Correção de instrumentos e laudos', '11 instrumentos · Sprint D3', 'Conversas fora deste Projeto. Não verificado contra código na apuração de 02/09.', 'Corrigir instrumentos neuropsicológicos e montar laudos no padrão CFP 06/2019, sem reproduzir material proprietário de editora.', 'A definir nesta ficha.', 'Supabase e GitHub Pages. A arquitetura separa motor e normas: o motor carrega a lógica e as tabelas normativas ficam em arquivo preenchido manualmente pelo profissional.', 'Ler o repositório e atualizar esta ficha contra o código — como foi feito com o CORTEX Gestão e o Infinity.', 80, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'link', 'Repositório', 'https://github.com/MarquesAnd/cortex_pacientes', 0),
  ((select id from ins), 'modulo', null, 'Correção de instrumentos', 1),
  ((select id from ins), 'modulo', null, 'Laudos', 2),
  ((select id from ins), 'modulo', null, 'Anamnese', 3),
  ((select id from ins), 'modulo', null, 'Módulo PAI', 4),
  ((select id from ins), 'modulo', null, 'Módulo CARS-2', 5),
  ((select id from ins), 'uso', null, 'O profissional corrige o instrumento na plataforma licenciada e insere o escore T já corrigido.', 6),
  ((select id from ins), 'uso', null, 'O motor aplica os portões de validade antes de qualquer escala clínica.', 7),
  ((select id from ins), 'uso', null, 'Se o perfil for inválido, as escalas clínicas ficam bloqueadas — mas o risco continua sinalizado.', 8),
  ((select id from ins), 'uso', null, 'O gerador produz o esqueleto do laudo CFP 06/2019 com as ressalvas técnicas inseridas.', 9),
  ((select id from ins), 'uso', null, 'A análise interpretativa e a conclusão diagnóstica são ato do profissional, não do sistema.', 10),
  ((select id from ins), 'marco', 'Sprint D3 · 30/04/2026', 'Onze instrumentos em produção e padrão visual unificado de laudo.', 11),
  ((select id from ins), 'marco', 'Módulo PAI', 'Schema com camada LGPD, cortes T centralizados, motor com portões de validade e gerador de laudo.', 12),
  ((select id from ins), 'marco', 'Módulo CARS-2', '15 categorias das versões ST e HF, motor de pontuação e classificação por faixa etária.', 13),
  ((select id from ins), 'feito', null, 'Onze instrumentos em produção.', 14),
  ((select id from ins), 'feito', null, 'Módulo PAI completo, com camada LGPD e portões de validade.', 15),
  ((select id from ins), 'feito', null, 'Gerador de esqueleto de laudo CFP 06/2019.', 16),
  ((select id from ins), 'feito', null, 'Módulo CARS-2 e anamnese por faixa etária.', 17),
  ((select id from ins), 'andamento', null, 'Preenchimento manual das tabelas normativas, marcadas verificado: false até conferência.', 18),
  ((select id from ins), 'falta', null, 'Ler o repositório e atualizar esta ficha contra o código.', 19),
  ((select id from ins), 'falta', null, 'Preencher e verificar os cortes do PAI contra o manual da Hogrefe.', 20),
  ((select id from ins), 'falta', null, 'Preencher os descritores âncora e a tabela de T-score da CARS-2.', 21),
  ((select id from ins), 'falta', null, 'Verificar os critérios de SPI e VPI, que chegaram corrompidos.', 22),
  ((select id from ins), 'falta', null, 'Definir o escopo do Sprint D4.', 23),
  ((select id from ins), 'falta', null, 'Definir a política de coexistência com o app legado Equilibrium Neuro.', 24),
  ((select id from ins), 'trava', null, 'Vários módulos ficam inertes até as tabelas normativas serem preenchidas — trabalho do profissional, não do sistema.', 25),
  ((select id from ins), 'dado', 'Repositório', 'MarquesAnd/cortex_pacientes', 26),
  ((select id from ins), 'dado', 'Instrumentos', '11', 27),
  ((select id from ins), 'dado', 'Último sprint', 'D3 · 30/04/2026', 28),
  ((select id from ins), 'regra', null, 'Correção e Laudo são fases separadas. Nunca misturar.', 29),
  ((select id from ins), 'regra', null, 'Em discrepância de índices no WAIS-III ou WISC-IV, sempre calcular o GAI/ICG com subtestes nucleares e comparar com o QIT.', 30),
  ((select id from ins), 'regra', null, 'Tabela normativa entra com marca verificado: false até conferência manual.', 31),
  ((select id from ins), 'regra', null, 'A arquitetura separa motor e normas: o motor não carrega dado proprietário.', 32),
  ((select id from ins), 'decisao', null, 'Qual o escopo do Sprint D4?', 33)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('cortex-aba', 'CORTEX ABA', 'Sistemas clínicos', 'ti-puzzle', 'pausado', 'Ficha em branco', 'Sem informação apurada', 'Nenhuma. Não localizado em nenhuma conversa acessível.', 'A apurar.', 'A apurar.', 'A apurar.', 'Abrir o Projeto CORTEX ABA no Claude, rodar o prompt coletor e preencher esta ficha pela aba Editar.', 90, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'falta', null, 'Preencher esta ficha inteira.', 0),
  ((select id from ins), 'trava', null, 'Sem informação. O projeto está num Projeto do Claude que não é alcançável a partir daqui.', 1)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('contigo', 'Contigo', 'Produtos e comercial', 'ti-heart-handshake', 'ativo', 'Aplicativo B2B de saúde mental', 'Identidade coral', 'Conversas fora deste Projeto, até 02/09/2026.', 'Oferecer cuidado em saúde mental a colaboradores de empresas contratantes, com painel agregado para a empresa e privacidade individual preservada.', 'A definir: colaborador da empresa contratante, e gestor com visão apenas agregada.', 'Em desenvolvimento. A camada de monitoramento de estresse agrega dado já processado do Apple HealthKit e do Google Health Connect, ou direto das APIs da Garmin e da Fitbit.', 'Escolher entre desenhar a arquitetura da integração ou fechar primeiro o enquadramento de produto.', 100, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'modulo', null, 'Check-in do colaborador', 0),
  ((select id from ins), 'modulo', null, 'Autorregistro', 1),
  ((select id from ins), 'modulo', null, 'Painel agregado da empresa', 2),
  ((select id from ins), 'modulo', null, 'Monitoramento de estresse', 3),
  ((select id from ins), 'marco', 'Identidade', 'Definida em coral, única exceção à paleta azul institucional.', 4),
  ((select id from ins), 'marco', '02/09/2026', 'Direção técnica do monitoramento decidida: agregar dado processado de wearables, nunca calcular pontuação própria a partir do sinal bruto de PPG.', 5),
  ((select id from ins), 'feito', null, 'Identidade visual em coral.', 6),
  ((select id from ins), 'feito', null, 'Direção técnica do monitoramento de estresse decidida.', 7),
  ((select id from ins), 'andamento', null, 'Avaliação da camada de monitoramento por wearables.', 8),
  ((select id from ins), 'falta', null, 'Definir o que o colaborador vê e o que entra no painel agregado.', 9),
  ((select id from ins), 'falta', null, 'Redigir o consentimento específico e destacado para dado de saúde.', 10),
  ((select id from ins), 'falta', null, 'Cruzar a tendência de VFC com os autorregistros do app.', 11),
  ((select id from ins), 'trava', null, 'VFC e estresse são dado pessoal sensível pelo artigo 11 da LGPD. O empregador só pode ver agregado e anonimizado.', 12),
  ((select id from ins), 'trava', null, 'O enquadramento tem que ser de indicador de tendência, nunca diagnóstico ou triagem.', 13),
  ((select id from ins), 'regra', null, 'Identidade coral, exceção à paleta institucional.', 14),
  ((select id from ins), 'regra', null, 'Empregador vê apenas dado agregado e anonimizado.', 15),
  ((select id from ins), 'decisao', null, 'Arquitetura técnica primeiro ou enquadramento de produto primeiro?', 16)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('callink', 'Callink · NR-1', 'Produtos e comercial', 'ti-headset', 'ativo', 'Proposta comercial', 'Executora: Equilibrium Talentos', 'Conversas fora deste Projeto. O módulo Call Center do CORTEX é operação interna da clínica (informativos aos atendentes) — frente distinta desta proposta comercial.', 'Fechar contrato de saúde mental ocupacional sob a NR-1, aproveitando que a empresa é credenciada GNDI e o cuidado sai custo-neutro para o empregador.', 'A definir na estruturação da operação.', 'Execução pela Equilibrium Talentos RH Neurodivergentes Ltda.', 'Incluir o CNAE 8650-0/03 na Talentos — sem isso a entidade não pode executar o contrato.', 110, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'marco', '26/05/2026', 'NR-1 entra em vigor, criando a obrigação que sustenta a proposta.', 0),
  ((select id from ins), 'marco', 'Estruturação', 'Talentos definida como executora e argumento de custo-neutro montado sobre o credenciamento GNDI.', 1),
  ((select id from ins), 'feito', null, 'Marco regulatório mapeado.', 2),
  ((select id from ins), 'feito', null, 'Entidade executora definida.', 3),
  ((select id from ins), 'feito', null, 'Argumento comercial montado.', 4),
  ((select id from ins), 'falta', null, 'Incluir o CNAE 8650-0/03 na Talentos.', 5),
  ((select id from ins), 'falta', null, 'Fechar e apresentar a proposta.', 6),
  ((select id from ins), 'falta', null, 'Definir a operação: quem atende, em que volume, com que SLA.', 7),
  ((select id from ins), 'trava', null, 'O CNAE 8650-0/03 ainda não está na Talentos. É pré-requisito para assinar.', 8),
  ((select id from ins), 'dado', 'Executora', 'Equilibrium Talentos RH Neurodivergentes Ltda', 9),
  ((select id from ins), 'dado', 'CNPJ', '58.424.494/0001-11', 10),
  ((select id from ins), 'dado', 'CNAE necessário', '8650-0/03', 11)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('cartao', 'Cartão Mais Saúde', 'Produtos e comercial', 'ti-credit-card', 'planejado', 'Programa de desconto', 'Rota A · rede própria', 'Conversas fora deste Projeto.', 'Oferecer desconto em serviços da própria rede. Não é plano de saúde, e essa distinção mantém o produto fora da regulação da ANS.', 'A definir.', 'A definir.', 'Definir a tabela de preços e as faixas de desconto.', 120, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'marco', 'Estruturação', 'Modelo definido sob a Rota A: rede de desconto em serviços próprios.', 0),
  ((select id from ins), 'feito', null, 'Estrutura definida sob a Rota A.', 1),
  ((select id from ins), 'falta', null, 'Definir tabela de preços e faixas de desconto.', 2),
  ((select id from ins), 'falta', null, 'Definir o meio de adesão e a cobrança.', 3),
  ((select id from ins), 'falta', null, 'Redigir o contrato de adesão com a distinção explícita de que não é plano de saúde.', 4),
  ((select id from ins), 'falta', null, 'Definir suporte operacional: quem vende e quem valida na recepção.', 5),
  ((select id from ins), 'trava', null, 'Se o produto derrapar para promessa de cobertura, vira plano de saúde e cai sob a ANS.', 6),
  ((select id from ins), 'regra', null, 'Não é plano de saúde. É programa de desconto em serviços próprios.', 7)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('saas', 'CORTEX SaaS · Franquia', 'Produtos e comercial', 'ti-building-store', 'planejado', 'Licenciamento do ecossistema', 'CORTEX + Infinity + SHIREQ', 'Conversas fora deste Projeto.', 'Transformar os sistemas internos em produto licenciável para outras clínicas, como SaaS ou como franquia.', 'A definir.', 'Camada licenciável construída sobre CORTEX, Infinity e SHIREQ.', 'Decidir o modelo: SaaS, franquia, ou os dois.', 130, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'marco', 'Conceito', 'Ecossistema identificado como produto potencial.', 0),
  ((select id from ins), 'marco', 'Base regulatória', 'CFP Resolução 31/2022 e SATEPSI mapeados. Catálogo classificado em zonas verde, amarela e vermelha.', 1),
  ((select id from ins), 'feito', null, 'Conceito definido.', 2),
  ((select id from ins), 'feito', null, 'Base regulatória mapeada.', 3),
  ((select id from ins), 'feito', null, 'Catálogo classificado por zona.', 4),
  ((select id from ins), 'falta', null, 'Resolver o licenciamento dos instrumentos de zona vermelha.', 5),
  ((select id from ins), 'falta', null, 'Modelar preço e estrutura societária.', 6),
  ((select id from ins), 'falta', null, 'Separar o que é código genérico do que é dado institucional.', 7),
  ((select id from ins), 'falta', null, 'Levantar a exigência regulatória de operar software clínico para terceiros.', 8),
  ((select id from ins), 'trava', null, 'Os instrumentos de zona vermelha dependem de plataforma de editora e não podem ser redistribuídos.', 9),
  ((select id from ins), 'trava', null, 'Os sistemas carregam dado institucional misturado ao código. Não dá para licenciar sem separar.', 10),
  ((select id from ins), 'regra', null, 'Para uso interno, avaliar primeiro se o instrumento serve. Restrições de nível SaaS entram depois.', 11),
  ((select id from ins), 'decisao', null, 'SaaS, franquia, ou os dois?', 12)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

with ins as (
  insert into public.projetos (slug, nome, frente, icone, situacao, resumo, meta, fonte, objetivo, quem_entra, como_funciona, proximo_passo, ordem, atualizado_por)
  values ('pdge', 'PDGE 2026/2030', 'Estratégico', 'ti-map-2', 'ativo', 'Plano Diretor de Gestão Equilibrium', '9 textos oficiais no PEE', 'Conversas do Projeto. Importação confirmada pelo SQL 16 do CORTEX.', 'Ser a referência estratégica que orienta as decisões do grupo no quinquênio, com metas, OKRs e rituais de governança.', 'Todos os perfis do PEE têm leitura. A edição é restrita à Direção.', 'Documento estratégico cujos nove textos vivem no Caderno 3 do PEE, com garantia de nunca serem sobrescritos.', 'Definir a cadência de revisão do plano e quem conduz cada ritual de governança.', 140, 'seed sprint 64')
  on conflict (slug) do nothing
  returning id
)
insert into public.projetos_itens (projeto_id, tipo, rotulo, texto, ordem)
select * from (values
  ((select id from ins), 'link', 'Ler no módulo PEE', 'https://gestaoequilibrium.github.io/cortex_adm/', 0),
  ((select id from ins), 'modulo', null, 'Missão e Visão', 1),
  ((select id from ins), 'modulo', null, 'Valores', 2),
  ((select id from ins), 'modulo', null, 'Promessa e arquitetura de marca', 3),
  ((select id from ins), 'modulo', null, 'Pilares estratégicos', 4),
  ((select id from ins), 'modulo', null, 'Metas e OKRs', 5),
  ((select id from ins), 'modulo', null, 'Roteiro do triênio', 6),
  ((select id from ins), 'modulo', null, 'Rituais de governança', 7),
  ((select id from ins), 'uso', null, 'Abrir o CORTEX, aba PEE, Caderno 3.', 8),
  ((select id from ins), 'uso', null, 'Ao avaliar uma proposta nova, checar contra os pilares e os vetores do plano.', 9),
  ((select id from ins), 'uso', null, 'Os textos são fonte: o que estiver em conflito com eles em outro documento está errado.', 10),
  ((select id from ins), 'marco', 'Redação', 'Missão, Visão 2028 e os cinco valores: rigor técnico, cuidado humano, integridade, integração e evolução.', 11),
  ((select id from ins), 'marco', 'SQL 16', 'Nove textos importados para o PEE com garantia de nunca sobrescrever.', 12),
  ((select id from ins), 'feito', null, 'Missão, Visão 2028 e os cinco valores definidos.', 13),
  ((select id from ins), 'feito', null, 'Metas, OKRs, roteiro do triênio e rituais de governança definidos.', 14),
  ((select id from ins), 'feito', null, 'Nove textos oficiais importados para o PEE.', 15),
  ((select id from ins), 'andamento', null, 'Uso do PDGE como filtro de decisão.', 16),
  ((select id from ins), 'falta', null, 'Definir a cadência de revisão do plano.', 17),
  ((select id from ins), 'falta', null, 'Ligar os OKRs a indicadores que o Infinity e o CORTEX já calculam.', 18),
  ((select id from ins), 'falta', null, 'Fechar o ciclo de prestação de contas dos rituais.', 19),
  ((select id from ins), 'dado', 'Textos no PEE', '9', 20),
  ((select id from ins), 'dado', 'Horizonte', '2026 a 2030', 21),
  ((select id from ins), 'regra', null, 'Missão, visão e valores vêm do PDGE, não do manual operacional.', 22)
) as v(projeto_id, tipo, rotulo, texto, ordem)
where exists (select 1 from ins);

-- fim do SQL 33
