# Revisão da `0003_projetos_votos.sql` (Tarefas 1.2 / 2.2)

Roteiro para a conversa Ana + Guilherme antes de aplicar as migrations no Supabase real. Nada aqui foi testado num Supabase de verdade (ainda não existe) — são pontos para vocês decidirem.

## 1. Conferência campo a campo (SQL × contrato × TypeScript)

| Campo | SQL (`0003`) | `contrato-de-dados.md` | `types/database.ts` | OK? |
|---|---|---|---|---|
| `projetos.id/orgao_id/nome/descricao` | sim | sim | sim | ✅ |
| `projetos.categoria` | enum `categoria_post` (criado na `0001`) | mesma lista de posts | `Categoria` | ✅ |
| `projetos.status` | enum `status_projeto` | 6 valores | `ProjetoStatus` | ✅ |
| `projetos.origem_post_id` | `uuid references posts(id)` | opcional | `string \| null` | ⚠️ ver item A |
| `projetos.timeline` | `jsonb default '[]'` | `{nome, data_prevista, data_real}` | `MarcoTimeline[]` | ✅ |
| `projetos.consulta_fim` | `timestamptz` | opcional | `string \| null` | ✅ |
| `votos.*` | todos os campos do contrato | sim | `Voto` | ✅ |

**A. `origem_post_id` é `uuid`, mas os posts/projetos mock usam ids como `'4'` e `'p1'`.** Isso só vira problema ao trocar mock por Supabase: o `<select>` de origem do formulário precisa passar a listar posts reais (ids uuid), senão o insert falha com "invalid input syntax for type uuid".

## 2. Pontos de atenção na política de acesso (`0004_rls_policies.sql`)

1. **Projeto rejeitado é público.** `projetos: leitura publica` usa `using (true)`, mas a tela do painel diz "Rejeitado… não visível ao público". Hoje qualquer pessoa conseguiria ler projetos rejeitados direto pela API. Sugestão:
   ```sql
   drop policy "projetos: leitura publica" on projetos;
   create policy "projetos: leitura publica, rejeitados so para o orgao"
     on projetos for select
     using (status <> 'rejeitado' or auth.uid() = orgao_id);
   ```
2. **O dono do projeto pode mudar qualquer coluna.** `projetos: so o orgao dono edita` só tem `using`. Para o MVP é aceitável; se quiserem fechar, adicionar `with check (auth.uid() = orgao_id)` (impede transferir o projeto para outro órgão).
3. **Voto sem checagem de status.** A policy de insert em `votos` só confere `auth.uid() = user_id`. Dá para votar em projeto que não está `em_consulta` ou cuja `consulta_fim` já passou. Isso é da Tarefa 3.1/3.3 do Guilherme (ideal: função `votar(projeto_id, opcao)` que valida o prazo).
4. **O `hash_comprovante` vem do cliente.** Como a coluna é preenchida pelo próprio insert, o usuário pode mandar qualquer texto. Melhor gerar no banco (trigger/função com `gen_random_uuid()` + `digest(...)`, a extensão `pgcrypto` já está habilitada na `0001`). Decidir isso antes da Semana 3.
5. **O app não consegue saber "já votei".** Sem policy de `select` em `votos`, a tela não lê nem o voto do próprio usuário. Opções: (a) tratar o erro `23505` (unique violation) ao tentar votar de novo; (b) uma função `ja_votei(projeto_id)` retornando boolean. A Tarefa 3.1 (passo 3, "estado já votou") depende dessa decisão.
6. **`votos_resultado` não tem linha para projeto sem votos.** O frontend deve tratar "sem linha" como 0 votos (e não como erro).

> **Status (João, PR da votação):** o item 5 já está resolvido no app — o voto tenta inserir direto e trata o erro `23505` como "já votou" (ver `src/features/projetos/pages/ProjetoDetailPage.tsx`), e o item 6 também já é tratado (ausência de linha vira `0/0/0`). Os itens 3 e 4 continuam em aberto — são a parte pendente do Guilherme (RLS de prazo da consulta + hash gerado no banco).

## 3. Ordem para aplicar e testar (Tarefa 2.2)

1. Guilherme cria o projeto no Supabase e roda as migrations `0001` → `0005` no SQL Editor (`supabase/README.md`).
2. Decidir os itens 2.1, 2.4 e 2.5 acima; se mudarem SQL, ajustar também `contrato-de-dados.md` e `types/database.ts` (nessa ordem).
3. Rodar `supabase/seed-teste-2.2.sql` no SQL Editor para inserir 1 projeto e 1 voto fake (passo 3 da Tarefa 2.2) e conferir em **Table Editor**.
4. Copiar URL e anon key para `.env.local` e trocar `MOCK_PROJETOS` pela query real em `ProjetosPage.tsx` (comentário no arquivo).
5. Marcar uma conta como institucional para testar o formulário: no Table Editor → `profiles` → `institucional_verificado = true`.
