# CORTEX Gestão

Sistema administrativo único do Grupo Equilibrium. Identidade branco + laranja.

Frontend em React (Babel no navegador) hospedado no GitHub Pages, com backend Supabase
(banco único, auth própria, storage e RLS). A auditoria registra tudo: criar, editar,
apagar, visualizar, baixar, entrar e sair.

## Estrutura

- `index.html` — página única que carrega o app
- `config.js` — URL e anon key do Supabase (preencher uma vez; os patches preservam)
- `app.jsx` — aplicação (login, shell, sidebar flutuante, módulos)
- `css/estilo.css` — identidade visual e animações
- `sql/` — schema versionado do banco (rodar no SQL Editor do Supabase, em ordem)

## Fluxo de atualização

Cada entrega chega como `sprint_NN.zip` na pasta `PATCHES` e é aplicada com o
`aplicar_patch.ps1`, que extrai, preserva o `config.js` preenchido, faz commit e push.

## Fases

1. Fundação: perfis, permissões por módulo e aba, auditoria imutável, drive de
   arquivos com acesso por pasta, modelos, links dos outros CORTEX, instruções.
2. RH e equipe (SHIREQ + ponto + organograma), salas e PEE, com migração dos dados.
3. Relatórios e ponte de leitura com o Infinity.
