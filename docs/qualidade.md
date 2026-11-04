# Qualidade e testes

## Verificações automáticas

| Verificação | Comando | Resultado em 29/10/2026 |
|---|---|---|
| Tipagem | `npx tsc -b` | Sem erros |
| Lint | `npm run lint` (oxlint) | 0 erros, 2 avisos de estilo, ambos no `AuthContext` (anterior à repaginada) |
| Build | `npm run build` | Passa; usado pela Vercel em cada PR |
| Preview por PR | Vercel | Cada PR ganha um link; o PR #10 passou no preview antes do merge |

**Não há testes automatizados (unitários ou de ponta a ponta).** A lógica pura mais sensível foi isolada para facilitar testar depois: `features/projetos/timeline.ts` (atraso de marcos) e `lib/repercussao.ts` (níveis). As regras que mais importam (voto único, voto secreto, quem cria projeto) estão no banco e foram testadas à mão, com as contas de demonstração e direto no SQL Editor (ver [Revisão da 0003](revisao-0003-projetos-votos.md)).

## Testes manuais

### Navegação completa (28/10, Brave, ambiente local com o banco real)

Landing → Entrar como Marina → Feed → Projetos → projeto p5 → "De onde veio" (abre o relato de origem) → menu da conta → Acompanhando → sair → `/entrar`. Sem erros no console.

### Produção (29/10, Edge, sem login)

Capturas das 10 telas usadas no [Guia de uso](guia-de-uso.md), em 1440×900 e 390×844, com o site publicado pelo PR #10.

| Tela | Conferido | Situação |
|---|---|---|
| Landing | Título, janela do mapa 3D, mapa aberto com 14 relatos e 6 bairros ao vivo | OK |
| Entrar | Formulário, contas demo, "Criar conta" desativado | OK |
| Feed (computador e celular) | Mapa 3D com colunas, legenda, painel, Em alta, gaveta no celular | OK |
| Projetos | Trilho por etapa, consulta em destaque, cartões | OK |
| Projeto (p1, p2) | Proposta, cédula, verificar comprovante, linha do tempo com atrasos em dias, "De onde veio" | OK |

### Banco real (29/10, consultas com a chave pública)

Ver [o que está aplicado em produção](banco-de-dados.md#o-que-está-aplicado-em-produção): 0001 a 0010 aplicadas em 30/10.

### Tentativas de burla (30/10, Guilherme 4.3)

`npm run test:rls` entra pela API com a chave pública, como Marina e como Secretaria, e tenta: votar duas vezes, inserir e ler `votos`, votar pela `registrar_voto`, criar projeto, mudar `orgao_id`, editar projeto alheio, ler e filtrar `posts.user_id`, ver autor de relato anônimo pela view, relatar e comentar como outra pessoa, se autopromover a institucional, editar perfil alheio, publicar resposta oficial, criar e ler notificação alheia, achar hash de projeto rejeitado, votar e seguir bairro sem login, e (como gestor) transferir o próprio projeto.

| Onde | Bloqueados | Furos | Não testados |
|---|---|---|---|
| Produção, 30/10 (0001 a 0006) | 12 | 4: `posts.user_id` legível e filtrável (Marina e gestor), cadastro aberto no Auth | 9, tabelas e funções da 0007/0008 ainda não existem |
| Ensaio local (PGlite) de 0001 a 0010 + seeds, partindo do estado de produção | Todos | 0 | |
| Produção, 30/10, depois de aplicar 0007 a 0010, os seeds e fechar o cadastro | 24 | 0 | 1: voto duplicado, para não gastar o voto da Marina (coberto no ensaio local) |

O ensaio local também confirmou que a 0010 e os seeds podem rodar duas vezes, que o voto duplicado volta `23505`, que `comprovantes_publicos` esconde o hash de projeto rejeitado da Marina e mostra ao órgão dono, e que o gestor ainda consegue atualizar o status do próprio projeto.

## Desempenho medido

Tempo por quadro medido no navegador com um laço de `requestAnimationFrame` durante rolagem programada (alvo: 16 ms, ou 60 quadros por segundo).

| Trecho | Antes da otimização | Depois |
|---|---|---|
| Topo da landing parado | ~120 ms (mapa 3D girando) | ~16 ms |
| Rolando o topo da landing | ~20 ms | ~16 a 18 ms |
| Resto da landing | | ~10 ms |

JavaScript gasto por segundo com a página parada (Edge sem janela, servidor local, 29/10):

| Tela | Antes do PR #12 | Depois |
|---|---|---|
| Feed | ~560 ms/s | ~25 ms/s |
| Detalhe do relato | ~570 ms/s | ~50 ms/s |
| Projetos (lista e detalhe) | | 9 a 15 ms/s |
| Landing, depois da abertura | | ~3 ms/s |

Tamanho do build (`npm run build`, 29/10):

| Arquivo | Tamanho | gzip | Quando carrega |
|---|---|---|---|
| `index` (núcleo do app) | 618 kB | 184 kB | Sempre |
| `MapaVivo` (MapLibre + deck.gl) | 682 kB | 189 kB | Só no Feed |
| `maplibre-gl-worker` | 519 kB | | Só com mapa |
| `CreatePostPage` | 163 kB | 49 kB | Só ao relatar |
| `LandingPage` | 39 kB | 12 kB | Só na landing |

Antes de dividir por rota (`React.lazy`), o pacote único tinha 2,2 MB.

## Problemas encontrados e situação

| Problema | Gravidade | Situação |
|---|---|---|
| Votar em projeto do banco dá erro (função `votar` não existe em produção) | Trava o uso | Resolvido: 0007 aplicada em 30/10 |
| Comentários, respostas oficiais, notificações e anonimato sem efeito no banco real | Trava o uso dessas funções | Resolvido: 0008 e seed aplicados em 30/10 |
| Dados de teste com `[SEED]` aparecem para o público (relato "Em alta" no Feed, 3 projetos) | Visual, mas aparece na apresentação | Apagar ou renomear antes da apresentação (Guilherme 4.2) |
| Autor de qualquer relato legível em `posts.user_id` pela API | Segurança, alta | Resolvido: 0009 aplicada em 30/10 |
| Cadastro aberto pela API (`disable_signup: false`), embora o botão esteja desativado; dá para criar contas e votar várias vezes | Segurança, alta | Resolvido: cadastro fechado no Auth em 30/10 |
| Nenhum projeto do banco em consulta, e o prazo da Av. Boa Viagem (14/11) acabaria antes da apresentação | Trava a demonstração do voto | `seed_projetos.sql` refeito: passa os `[SEED]` para o gestor demo e reabre a consulta até 20/12. Aplicado em 30/10 |
| Duas funções de voto no banco | Segurança | Resolvido: `0010` removeu `registrar_voto` |
| `comprovantes_publicos` mostra hashes de projetos rejeitados | Segurança, baixa | Resolvido na `0010` |
| Órgão podia ligar resposta oficial a projeto de outro órgão | Segurança, baixa | Policy corrigida na `0010` |
| Clusters do PR #8 ficaram no mapa Leaflet antigo; o Feed novo não agrupava pontos | Desempenho com muitos relatos | Resolvido no PR #12 (agrupamento no MapaVivo; Leaflet removido) |
| Feed e detalhe do relato gastavam ~560 e ~570 ms de JavaScript por segundo parados | Desempenho | Resolvido no PR #12 (~25 e ~50 ms/s) |
| Feed fica vazio sem `.env.local` (não há modo demonstração no Feed) | Só desenvolvimento | Registrado |
| Painel do gestor e Criar projeto ainda no visual antigo | Visual | João 4.3, depois do commit da Ana na 4.1 |

## Como testar você mesmo

```bash
npm install
npm run build        # tipagem + build, igual à Vercel
npm run lint
npm run dev          # http://localhost:5173
```

Roteiro rápido: entre como **Secretaria de Mobilidade**, crie um projeto em consulta e publique uma atualização no painel; saia, entre como **Marina**, vote, recarregue (o comprovante continua lá) e cole o código em "Verificar um comprovante"; tente votar de novo (o banco recusa).
