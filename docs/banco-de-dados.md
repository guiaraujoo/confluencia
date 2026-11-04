# Banco de dados

Postgres no Supabase. Todo o esquema está em `supabase/migrations/`, em arquivos numerados que devem ser aplicados **em ordem**, pelo SQL Editor do painel (passo a passo em `supabase/README.md`). O contrato campo a campo, do ponto de vista do front, está em [Contrato de dados](contrato-de-dados.md).

## As migrations

| Arquivo | O que faz | Autoria |
|---|---|---|
| `0001_posts.sql` | Enum `categoria_post` (8 categorias) e tabela `posts` | Rascunho João (PR #1); revisão e aplicação Guilherme 1.1 |
| `0002_profiles.sql` | Tabela `profiles` e gatilho que cria o perfil no cadastro | Rascunho João (PR #1); Guilherme 1.4 |
| `0003_projetos_votos.sql` | Enum `status_projeto`, tabelas `projetos` e `votos`, view `votos_resultado` | Rascunho João (PR #1); revisão Ana 2.2 (PR #7) e Guilherme |
| `0004_rls_policies.sql` | Regras de acesso de posts, profiles, projetos e votos | Rascunho João (PR #1); Guilherme 1.3 |
| `0005_repercussao.sql` | Tabela `post_apoios` e view `posts_repercussao` | Guilherme 2.3 |
| `0006_votacao.sql` | Fecha o insert direto em `votos`; funções `registrar_voto` e `meu_comprovante`; view `comprovantes_publicos` | Guilherme 3.1 |
| `0007_votacao_projetos.sql` | Função `votar` (a que o app usa), `verificar_comprovante`, projeto rejeitado privado, update só nas colunas de gestão | Ana 3.3 |
| `0008_rede_social.sql` | Perfil público, relato anônimo, comentários, respostas oficiais, bairros seguidos, notificações; nova `posts_repercussao` | João (repaginada) |
| `0009_fechar_autor.sql` | Fecha a coluna do autor na tabela `posts` (o anonimato passa a valer no banco) | João (repaginada) |
| `0010_seguranca_desempenho.sql` | Remove `registrar_voto`; `comprovantes_publicos` sem rejeitados; resposta oficial só com projeto do próprio órgão; `search_path` em `handle_new_user`; índices | Guilherme 4.2/4.3 |

Dados de exemplo (opcionais, depois das migrations): `seed_repercussao.sql`, `seed_projetos.sql`, `seed-social-demo.sql` e `seed-teste-2.2.sql`. Tudo que é de teste tem o prefixo `[SEED]` no nome ou na descrição.

## O que está aplicado em produção

Conferido em 29/10/2026 consultando a API do Supabase com a chave pública:

| Migration | Situação |
|---|---|
| 0001 a 0010 | Aplicadas em 30/10/2026, na ordem de [`supabase/README.md`](../supabase/README.md#banco-que-já-tem-0001-a-0006-produção-em-2910), com `seed-social-demo.sql` e `seed_projetos.sql` |
| Auth | Cadastro fechado (`disable_signup: true`); as duas contas demo entram |

Conferido depois de aplicar: o Feed lê 14 relatos pela `posts_repercussao` (2 com resposta oficial), o gestor demo é verificado e tem os 3 projetos `[SEED]` no painel, a Av. Boa Viagem está em consulta até 20/12, e o `npm run test:rls` dá 24 bloqueados e 0 furos.

O app foi escrito para não quebrar antes disso: sem a 0008 o formulário publica sem o campo `anonimo` e o perfil cai para o básico.

## Tabelas

| Tabela | Guarda | Chave | Observação |
|---|---|---|---|
| `profiles` | Nome, apelido, bairro, bio, `institucional_verificado`, `orgao_nome` | `id` = `auth.users.id` | Criada sozinha no cadastro (gatilho `on_auth_user_created`) |
| `posts` | Relato: categoria, bairro, descrição, latitude, longitude, `anonimo` | `id` | Coluna `repercussao` é legada (sempre 0); o valor real vem da view |
| `post_apoios` | Um apoio por pessoa por relato | (`post_id`, `user_id`) | |
| `comentarios` | Comentário de 1 a 500 caracteres | `id` | |
| `respostas_oficiais` | Resposta do órgão com status (`recebido`, `em_analise`, `virou_projeto`, `resolvido`, `nao_procede`) e projeto opcional | `id` | |
| `bairros_seguidos` | Bairros que a pessoa segue | (`user_id`, `bairro`) | |
| `notificacoes` | Aviso para a pessoa: `resposta_oficial`, `comentario`, `apoio`, `novo_relato_bairro` | `id` | Criadas por gatilho; o usuário só marca `lida` |
| `projetos` | Nome, descrição, categoria, status, `origem_post_id`, `timeline` (jsonb), `consulta_fim` | `id` | `orgao_id` = conta institucional dona |
| `votos` | Projeto, usuário, opção (`favor`/`contra`), `hash_comprovante` | `id` | `UNIQUE (projeto_id, user_id)`; ninguém lê esta tabela |

## Views

| View | Para quê |
|---|---|
| `posts_repercussao` | Leitura do Feed. Junta o relato com `recorrencia` (relatos da mesma categoria e bairro em 30 dias), `interacoes` (apoios), `repercussao` (soma), `comentarios` e `status_oficial`. Devolve `user_id` nulo em relato anônimo, a não ser para o próprio autor |
| `votos_resultado` | Placar agregado por projeto (`votos_favor`, `votos_contra`, `total_votos`). Depois da 0007, esconde projetos rejeitados de quem não é o órgão dono |
| `comprovantes_publicos` | Lista de hashes por projeto, em ordem de hash, sem usuário, opção ou data, para auditoria pública. Depois da 0010, sem projetos rejeitados (menos para o órgão dono) |

## Funções

| Função | Quem chama | O que faz |
|---|---|---|
| `votar(projeto, opcao)` | App (cédula) | Confere login, opção, status `em_consulta` e prazo; grava o voto; gera e devolve o hash SHA-256 no banco. Erros: `28000` sem login, `CF001` fora de consulta, `CF002` prazo encerrado, `23505` já votou |
| `meu_comprovante(projeto)` | App | Hash do próprio voto, ou nulo. Nunca a opção |
| `verificar_comprovante(hash)` | App (qualquer pessoa) | Aceita 16 a 64 caracteres hexadecimais e devolve projeto e data, se existir |
| `nome_publico(id)` | Gatilhos de notificação | Nome do órgão, apelido ou nome da pessoa |
| `posts_forcar_anonimo()` | Gatilho em `posts` | Em Segurança, `anonimo` vira `true` sempre |

## Regras de acesso (RLS) em resumo

| Quem | Pode | Não pode |
|---|---|---|
| Visitante | Ler relatos, apoios, comentários, respostas, projetos públicos, placar, perfis | Escrever qualquer coisa |
| Cidadão logado | Relatar, apoiar e desapoiar, comentar e apagar o próprio comentário, seguir bairros, votar uma vez por projeto, editar nome, apelido, bairro e bio | Ler votos, se marcar como institucional, criar projeto, responder oficialmente, ver o autor de relato anônimo |
| Órgão verificado | Tudo do cidadão + criar projeto, editar status, linha do tempo e prazo dos próprios projetos, ver os próprios rejeitados, publicar resposta oficial | Trocar o dono de um projeto, editar projeto de outro órgão, ligar resposta oficial a projeto de outro órgão |
| Administrador | Marcar `institucional_verificado` pelo painel do Supabase | |

## Índices

Além das chaves e das `UNIQUE`: `posts (bairro, categoria, created_at)` para a recorrência da `posts_repercussao` (0010; substitui o índice só por bairro), `posts (categoria)`, `posts (created_at desc)`, `projetos (status)`, `projetos (orgao_id, created_at desc)` para o painel do gestor, `respostas_oficiais (post_id, created_at)` e `(orgao_id, created_at desc)`, `comentarios (post_id, created_at)` e `notificacoes (user_id, created_at desc)`. `votos` não precisa de índice por `projeto_id`: a `UNIQUE (projeto_id, user_id)` já começa por ele.

## Pontos em aberto

- Resolvidos na 0010: duas funções de voto (ficou só `votar`) e hashes de projetos rejeitados em `comprovantes_publicos`.
- `profiles` é legível por todos, inclusive o `nome` completo. Num relato anônimo o autor não aparece, mas em relato comum o nome real é público junto com o apelido.
- Quem tem acesso administrativo ao banco consegue cruzar `user_id` e `opcao` em `votos`. Anonimato forte fica para a próxima fase (ver [Votação](votacao.md)).
- A recorrência conta 30 dias a partir de hoje, não da data do relato.

Testes de burla: `npm run test:rls` (ver [`supabase/README.md`](../supabase/README.md#testar-o-rls)).
