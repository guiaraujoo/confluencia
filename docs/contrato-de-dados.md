# Contrato de dados — Confluência

Documento vivo. Se um campo mudar, atualize aqui, em `src/types/database.ts` e nas migrations em `supabase/migrations/`, nessa ordem. Mudou um nome de campo e esqueceu de atualizar os três? É a causa nº 1 de bug bobo entre frontend e backend.

## `posts` (módulo Feed — dono: João / Guilherme)

Para **escrever** posts, use a tabela `posts`. Para **ler** o Feed, use a view `posts_repercussao` (veja mais abaixo).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | uuid | gerado automaticamente | |
| `user_id` | uuid | sim | quem postou, vem do usuário logado |
| `categoria` | enum | sim | mobilidade, iluminacao, seguranca, saneamento, pracas_lazer, saude, educacao, outros (sem acento, `pracas_lazer` com underscore) |
| `bairro` | texto | sim | |
| `descricao` | texto | sim | |
| `foto_url` | texto | não | upload fica para próxima fase |
| `latitude` | número decimal | sim | validado no frontend (sem check no banco por enquanto) |
| `longitude` | número decimal | sim | idem |
| `repercussao` | número inteiro | não usar | coluna legada, sempre 0. O valor real vem da view `posts_repercussao` |
| `created_at` | data/hora | automático | |

## `post_apoios` (módulo Feed — dono: Guilherme / João)

Interações (apoios) em posts. Um apoio por usuário por post.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `post_id` | uuid | sim | chave primária composta com `user_id` |
| `user_id` | uuid | sim | quem apoiou, vem do usuário logado |
| `created_at` | data/hora | automático | |

Para apoiar: `insert` em `post_apoios`. Para remover o apoio: `delete`. O banco bloqueia apoio duplicado (chave primária composta) e só permite apoiar/remover em nome do próprio usuário (RLS).

## View `posts_repercussao` (leitura do Feed)

Fonte de leitura do Feed. Calculada sob demanda, sempre atual. Somente leitura.

| Campo | Tipo | Observação |
|---|---|---|
| `id`, `user_id`, `categoria`, `bairro`, `descricao`, `foto_url`, `latitude`, `longitude`, `created_at` | iguais a `posts` | |
| `recorrencia` | inteiro | outros posts da mesma categoria + mesmo bairro nos últimos 30 dias |
| `interacoes` | inteiro | quantidade de apoios do post em `post_apoios` |
| `repercussao` | inteiro | `recorrencia + interacoes` |

Exemplo de uso: `supabase.from('posts_repercussao').select('*').order('repercussao', { ascending: false })`

Observação: a janela de 30 dias conta a partir de hoje, não da data do próprio post. Um post antigo continua mostrando a recorrência recente da sua área.

## `projetos` (módulo Projetos — dono: Ana / Guilherme)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | uuid | gerado automaticamente | |
| `orgao_id` | uuid | sim | precisa ser o próprio usuário logado e conta institucional verificada |
| `nome` | texto | sim | |
| `descricao` | texto | sim | |
| `categoria` | enum | sim | mesma lista de `posts` |
| `status` | enum | não (default `proposto`) | proposto, em_consulta, aprovado, rejeitado, em_execucao, concluido |
| `origem_post_id` | uuid | não | liga a um post do Feed, se houver |
| `timeline` | jsonb (lista de marcos) | não (default `[]`) | cada marco: `{ nome, data_prevista, data_real }` |
| `consulta_fim` | data/hora | não | prazo da consulta pública |
| `created_at` | data/hora | automático | |

## `votos` (módulo Projetos — dono: Guilherme)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | uuid | gerado automaticamente | |
| `projeto_id` | uuid | sim | |
| `user_id` | uuid | sim | usado só para bloquear voto duplicado — nunca exposto publicamente ligado à opção |
| `opcao` | texto (`favor`/`contra`) | sim | só aceita `favor` ou `contra`; nunca lido linha a linha |
| `hash_comprovante` | texto | sim | mostrado ao usuário como prova de que votou |
| `created_at` | data/hora | automático | |

O banco bloqueia voto duplicado (`unique (projeto_id, user_id)`): o segundo voto do mesmo usuário no mesmo projeto é rejeitado. Ninguém consegue ler a tabela `votos` diretamente, nem o próprio voto.

## View `votos_resultado` (leitura do resultado da votação)

Única forma de ler o resultado. Só números agregados, nunca o voto individual. Nunca consulte `votos` diretamente para mostrar resultado.

| Campo | Tipo | Observação |
|---|---|---|
| `projeto_id` | uuid | |
| `votos_favor` | inteiro | total de votos `favor` |
| `votos_contra` | inteiro | total de votos `contra` |
| `total_votos` | inteiro | `votos_favor + votos_contra` |

Definida em `supabase/migrations/0003_projetos_votos.sql`.

## `profiles` (dono: Guilherme)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| `id` | uuid | = auth.users.id | criado automaticamente no cadastro |
| `nome` | texto | opcional (default vazio) | o usuário pode editar o próprio nome |
| `institucional_verificado` | booleano | sim (default false) | aprovação manual pelo Guilherme no painel do Supabase; o usuário não consegue alterar |
| `orgao_nome` | texto | não | só alterado pelo painel do Supabase |