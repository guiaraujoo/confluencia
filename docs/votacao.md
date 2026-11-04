# Votação — versão simplificada (protótipo)

## Como funciona
- O voto é feito pela função `votar(projeto, opcao)` (0007), que valida: login,
  opção (`favor`/`contra`), projeto existente, status `em_consulta` e prazo (`consulta_fim`).
  É a única porta de entrada: a `registrar_voto` da 0006 foi removida na 0010 (decidido com a
  Ana na Tarefa 4.3), e o insert direto em `votos` está fechado.
- Um voto por usuário por projeto (`unique (projeto_id, user_id)` no banco).
- Ninguém lê a tabela `votos`, nem o próprio voto. O resultado é só agregado (`votos_resultado`).
- Comprovante: hash SHA-256 gerado no servidor (valor aleatório + projeto + usuário + instante).
  O usuário recupera o próprio com `meu_comprovante(projeto)`.
- Auditoria pública: `verificar_comprovante(hash)` confirma que um comprovante existe (devolve
  projeto e data). A view `comprovantes_publicos` lista os hashes por projeto, em ordem de hash,
  sem usuário, sem opção e sem data; a quantidade deve bater com `total_votos`. Projetos
  rejeitados ficam de fora, menos para o órgão dono (0010), como na `votos_resultado`.
- O insert direto na tabela `votos` está fechado (permission denied).

## Erros da função
`28000` sem login, `22023` opção inválida, `CF001` projeto fora de consulta, `CF002` prazo
encerrado, `23505` já votou. O app traduz todos menos o `22023` (a cédula só manda `favor` ou
`contra`) em `src/features/projetos/api.ts`.

## Como foi testado
`npm run test:rls` entra como Marina e tenta votar duas vezes, inserir direto em `votos`, ler
`votos`, votar pela função antiga e votar sem login (ver `supabase/README.md`).

## Verificação institucional (Tarefa 3.2)
- Campo `profiles.institucional_verificado` (default false).
- Aprovação manual: o administrador marca o campo no painel do Supabase.
- RLS: só contas verificadas criam projetos e publicam resposta oficial. O usuário não consegue
  alterar o próprio campo (UPDATE por coluna restrito a `nome`, `apelido`, `bairro` e `bio`).

## Fora do escopo desta versão
- Autenticação oficial (CPF / gov.br): hoje a identidade é e-mail e senha, então contas falsas
  são possíveis. Fica para a próxima fase (alinhado com o grupo antes da apresentação).
- Comprovante verificável criptograficamente (assinatura / prova de inclusão).
- Anonimato forte: quem tem acesso administrativo ao banco consegue, tecnicamente, cruzar
  `user_id` e `opcao`.
- Quem consultar `comprovantes_publicos` e `votos_resultado` repetidamente durante a consulta
  consegue ligar um hash novo ao placar que mudou junto. Só importa se a pessoa mostrar o próprio
  comprovante; resolver exige publicar os hashes só depois do fim da consulta.