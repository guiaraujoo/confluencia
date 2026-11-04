# Semana 4 da Ana: integração e polimento de Projetos

**Branch:** `feature/feed-projetos-origem` · **Tarefas:** 4.1, 4.2 e 4.3 do guia individual · **Atualizado em:** 04/11/2026

Resumo: o campo "origem" agora liga os dois módulos nos dois sentidos, o banco ganhou a migration `0011` (corrige um bug real e acelera as consultas de Projetos) e as telas de Projetos não estouram mais a largura no celular.

## Tarefa 4.1: Feed ↔ Projetos pelo campo origem

| Passo do guia | O que foi feito | Onde |
|---|---|---|
| 1. Busca/seleção de post no formulário | O `<select>` com 100 relatos virou uma **busca** por bairro, texto ou protocolo (`OC-…`), com destaque do termo. Relatos da mesma categoria do projeto aparecem primeiro. O relato escolhido aparece como cartão, com aviso se a categoria for diferente da do projeto | `components/SeletorRelato.tsx`, `pages/CriarProjetoPage.tsx` |
| 2. Resumo do post no detalhe do projeto | O link genérico "Veja o problema no Feed" virou o **relato de verdade**: texto, categoria, protocolo, bairro, data e apoios, com link para o relato. Nunca mostra o autor (o relato pode ser anônimo) | `components/RelatoOrigem.tsx`, `pages/ProjetoDetailPage.tsx` |
| 3. Caminho oposto: post → projeto | No detalhe do relato, a seção **"Virou projeto?"** lista os projetos que nasceram dele, com status e link | `components/ProjetosDoRelato.tsx`, `feed/pages/PostDetailPage.tsx` |

Além do guia, para o ciclo relato → projeto ficar completo:

- **Atalho para o órgão:** no detalhe do relato, conta institucional verificada vê "Criar projeto a partir deste relato", que abre `/projetos/novo?origem=<id>` com o relato e a categoria já preenchidos.
- **Quem relatou fica sabendo:** ao publicar um projeto com origem, o órgão responde automaticamente no relato com o status "Virou projeto" e o link do projeto. O gatilho da `0008` gera a notificação para o autor. Se essa resposta falhar, o projeto continua salvo e o painel avisa para responder manualmente.
- A resposta oficial com projeto ganhou o link "Ver o projeto →" (`feed/components/RespostasOficiais.tsx`).
- O painel do gestor mostra "Nasceu de um relato do Feed · ver relato" em cada projeto com origem.

Todas as consultas novas ficam em `src/features/projetos/origem.ts`, no mesmo padrão do `api.ts`: com Supabase, lê o banco; sem Supabase, usa os mocks e a demonstração continua funcionando.

## Tarefa 4.2: ajustes do módulo e revisão do banco

### Migration `0011_origem_e_comprovantes.sql`

Escrita como 0010 ao mesmo tempo que a 0010 do Guilherme. Na integração virou 0011 e deixou com a 0010 dele o que as duas faziam igual: `comprovantes_publicos` sem rejeitados, o índice do painel do gestor e o da recorrência do Feed.

| Problema | Correção |
|---|---|
| **Bug:** a 0003 criou `projetos.origem_post_id` sem regra de exclusão. Se a autora apagasse um relato que virou projeto, o banco recusava com erro de chave estrangeira | `on delete set null`: o relato é apagado, o projeto continua e só perde o link |
| **Vazamento:** `comprovantes_publicos` listava hashes de projetos rejeitados, que a 0007 tornou privados (ponto em aberto de [Banco de dados](banco-de-dados.md)) | A view aplica a mesma regra de `votos_resultado` |
| `verificar_comprovante` buscava com `LIKE 'abc…%'`, que varre a tabela `votos` inteira | Índice nos 16 primeiros caracteres do hash; o `LIKE` continua conferindo o resto |
| Consulta nova "este relato virou projeto?" sem índice | Índice parcial em `origem_post_id` |
| Painel do gestor (`orgao_id` + mais recentes) e listagem pública (mais recentes) sem índice adequado | Índices `(orgao_id, created_at desc)` e `(created_at desc)` |
| A recorrência do Feed (mesma categoria + bairro + 30 dias) é calculada para cada relato, com índices separados | Índice composto `(categoria, bairro, created_at desc)` |

A 0011 pode rodar mais de uma vez sem erro.

**Como foi testado:** `supabase/testes/testar-migrations.mjs` aplica 0001 → 0011 num Postgres real em memória (PGlite) e simula as três contas (órgão, cidadã, visitante):

| Cenário | Só até a 0009 | Com a 0010 e a 0011 |
|---|---|---|
| Órgão responde "Virou projeto" e a autora é notificada | ✓ | ✓ |
| Cidadã não consegue publicar resposta oficial | ✓ | ✓ |
| Visitante acha o projeto pelo relato e lê o resumo | ✓ | ✓ |
| Comprovante confere com 16 caracteres (maiúsculos, como a tela mostra) e com o hash inteiro; fim errado ou `%` não confere | ✓ | ✓ |
| `comprovantes_publicos` esconde projeto rejeitado de terceiros | ✗ (aparecia) | ✓ |
| Autora apaga relato que virou projeto | ✗ (erro de chave estrangeira) | ✓ |
| Consultas de origem, painel e comprovante usam índice (`EXPLAIN`) | n/a | ✓ |

### Correções no front

- Placar sem separador de milhar ("1240 votos" → "1.240 votos") na cédula e no destaque da consulta.
- O formulário de criar projeto agora recebe o `id` do projeto criado (`insert … select('id')`), o que o caminho de volta para o relato precisa.
- O projeto de exemplo `p5` aponta para um relato do banco. Sem banco, o cartão de origem explica isso em vez de dizer que o relato foi apagado.
- A cédula diz que a votação ainda não verifica identidade por CPF ou gov.br (item do Buffer: a interface não promete mais do que entrega).

## Tarefa 4.3: responsividade

Auditoria automática com Playwright: cada tela de Projetos em 320, 360, 390, 768 e 1280 px, medindo se algo passa da largura da tela.

| Tela | Antes | Depois |
|---|---|---|
| Detalhe do projeto (p1, p2, p5, p6) em 320–390 px | Estourava 9 a 34 px para o lado: trilho "Onde está" com 5 colunas e números "100%" grandes demais | Sem estouro |
| Título do projeto no celular | "Requalificação" cortado no meio | Fonte menor até 400 px e quebra de palavra |
| "Onde está" no celular | Rótulos cortados ("PROPOS", "EXECUÇ") | Lista vertical com "etapa atual"; 5 colunas a partir de 640 px |
| Cédula no celular | Ficava no fim da página, depois de todo o conteúdo | Barra fixa "Consulta pública aberta · Votar ↓" que leva à cédula e some quando ela aparece. Não cobre o botão de relatar |
| Selo de status ("Em consulta pública") | Quebrava em duas linhas no painel | Uma linha só |
| Cabeçalho do painel e botão "← Projetos" | Botões espremidos | Empilham no celular |
| Listagem, formulário e painel | Sem estouro | Sem estouro |

Falta o passo 3 do guia: **pedir para o João e o Guilherme testarem** no celular deles.

## Roteiro de teste (Buffer: como gestor e como cidadão)

Com a 0011 aplicada e as contas de demonstração:

1. **Cidadã:** publique um relato no Feed. Anote o protocolo (`OC-…`).
2. **Órgão:** abra o relato → "Criar projeto a partir deste relato". Confira que relato e categoria vieram preenchidos. Publique em consulta.
3. **Cidadã:** o sino mostra "… respondeu seu relato". No relato, a resposta "Virou projeto" tem link, e a seção "Virou projeto?" mostra o projeto.
4. **Cidadã:** abra o projeto → "De onde veio" mostra o relato. Vote; recarregue (continua "já votou"); confira o comprovante.
5. **Órgão:** no painel, o projeto aparece com "Nasceu de um relato do Feed".
6. **Cidadã:** apague o relato. O projeto continua no ar e "De onde veio" some.
7. **Celular:** repita 4 com a tela do celular e use a barra "Votar ↓".

## Para o Guilherme

- Aplicar a `0011` no Supabase (a 0010 dele já está aplicada).
- A 0007 não deixa o órgão editar `origem_post_id` depois de criado (de propósito). Se o grupo quiser "ligar a um relato depois", basta incluir a coluna no `grant update` da 0007.
- Continuam abertos para a revisão de segurança dele: `registrar_voto` × `votar` e o anonimato forte do voto.
