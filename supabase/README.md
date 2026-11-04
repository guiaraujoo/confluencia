# Migrations do Supabase

Projeto Supabase de produção: o mesmo das variáveis `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` da Vercel. O que já está aplicado nele está em [docs/banco-de-dados.md](../docs/banco-de-dados.md#o-que-está-aplicado-em-produção).

## Como aplicar

**Opção simples (painel):** copie o conteúdo de cada arquivo, na ordem da lista abaixo, e cole no SQL Editor do painel do Supabase (https://supabase.com/dashboard → seu projeto → SQL Editor → New query → Run). O SQL Editor roda cada colagem numa transação: se der erro, nada daquele arquivo fica aplicado.

**Opção com CLI** (se preferir):
```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

## Ordem e o que cada arquivo faz

| Arquivo | O que cria | Tarefa correspondente |
|---|---|---|
| `0001_posts.sql` | tabela `posts` + enum de categorias | Guilherme 1.1 |
| `0002_profiles.sql` | tabela `profiles` + trigger de criação automática no cadastro | Guilherme 1.4 |
| `0003_projetos_votos.sql` | tabelas `projetos`, `votos` + view agregada `votos_resultado` | Ana 1.2/2.2, Guilherme 3.1 |
| `0004_rls_policies.sql` | regras de acesso (quem pode ler/criar/editar o quê) | Guilherme 1.3 |
| `0005_repercussao.sql` | tabela `post_apoios` + view `posts_repercussao` | Guilherme 2.3 |
| `0006_votacao.sql` | função `registrar_voto()` (hash no servidor), `meu_comprovante()`, view `comprovantes_publicos`; fecha o insert direto em `votos` | Guilherme 3.1 |
| `0007_votacao_projetos.sql` | função `votar()` (valida prazo/status e gera o hash no banco), `meu_comprovante()`, `verificar_comprovante()`, projeto rejeitado privado, update de projeto só nas colunas de gestão | Ana 3.3 + Guilherme 3.1 |
| `0008_rede_social.sql` | camada social do Feed: apelido/bairro/bio no perfil, relato anônimo, `comentarios`, `respostas_oficiais`, `bairros_seguidos`, `notificacoes` | João (repaginada) |
| `0009_fechar_autor.sql` | fecha a leitura do autor em `posts` (o anonimato passa a valer no banco). Rode por último, quando o app já estiver lendo pela view `posts_repercussao` | João (repaginada) |
| `0010_seguranca_desempenho.sql` | remove `registrar_voto` (fica só `votar`), tira projetos rejeitados de `comprovantes_publicos`, resposta oficial só com projeto do próprio órgão, `search_path` fixo em `handle_new_user`, índices da `posts_repercussao`, do painel do gestor e do perfil | Guilherme 4.2/4.3 |

**Dados de exemplo (rode depois das migrations):** `seed-social-demo.sql` (perfis das contas demo, promove o gestor demo a verificado, comentários e respostas oficiais) e depois `seed_projetos.sql` (projetos `[SEED]` do gestor demo, com a Av. Boa Viagem em consulta até 20/12). Os dois são idempotentes.

Depois de aplicar, copie a **Project URL** e a **anon public key** (Project Settings → API) para o seu `.env.local` (veja `.env.example` na raiz do repo).

## Banco que já tem 0001 a 0006 (produção em 29/10)

1. `0007_votacao_projetos.sql`
2. `0008_rede_social.sql`
3. `seed-social-demo.sql`
4. `seed_projetos.sql`
5. `0009_fechar_autor.sql` (o app no ar já lê pela view; confira o Feed carregando)
6. `0010_seguranca_desempenho.sql`
7. Authentication → Sign In / Providers → desligue **Allow new users to sign up**. O botão "Criar conta" do app já está desativado, mas sem isso a API continua aceitando cadastro com a chave pública. As contas demo continuam entrando.

Essa sequência foi ensaiada do zero num Postgres local (PGlite) partindo do estado de produção: tudo aplica, e a 0010 e os seeds podem rodar de novo.

## Testar o RLS

```bash
npm run test:rls              # entra como Marina e como Secretaria e tenta burlar as regras
npm run test:rls -- --votar   # também deixa a Marina votar, para testar o voto duplicado
```

Usa só a chave pública do `.env.local`, como o app. Cada linha sai como ✔ (bloqueado), ✘ (furo) ou – (não testado, em geral porque a migration ainda não foi aplicada). Sem `--votar` a Marina não gasta o voto da apresentação.

## Backup

O plano gratuito do Supabase não deixa baixar os backups automáticos, então o backup é um `pg_dump` feito à mão depois de aplicar tudo:

```bash
brew install libpq                       # só a primeira vez; traz o pg_dump
# Connect → Session pooler → copie a URI e troque [YOUR-PASSWORD] pela senha do banco
export DB_URL='postgresql://postgres.<ref>:<senha>@aws-0-<região>.pooler.supabase.com:5432/postgres'
/opt/homebrew/opt/libpq/bin/pg_dump "$DB_URL" --schema=public --no-owner --no-privileges -f backup-schema-dados.sql
/opt/homebrew/opt/libpq/bin/pg_dump "$DB_URL" --schema=auth --data-only --table=auth.users -f backup-usuarios.sql
```

Guarde os arquivos fora do repositório (têm e-mails e hashes de senha das contas). Para restaurar num projeto novo: crie as contas (ou rode `backup-usuarios.sql`) e depois `psql "$DB_URL_NOVO" -f backup-schema-dados.sql`.
