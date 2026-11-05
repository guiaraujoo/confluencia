# Semana 5 — o que falta fazer e quem faz

Branch: `feature/semana5-recife` (PR aberto contra `main`).
Apresentação: primeira semana de dezembro de 2026 (data exata a confirmar).

## O que já está pronto na branch

| # | Ponto de 05/11 | Resultado |
|---|----------------|-----------|
| 1 | Menu da landing | Rola até as seções da própria landing; o sistema só abre pelo "Entrar" |
| 2 | Focar no Recife / mapa no Senegal | Mapa travado na cidade do Recife, fora dela fica bloqueado (estilo GTA); localização fora da cidade é recusada na tela e no banco (migration 0012) |
| 3 | Bugs do checkup | Texto interno removido da tela de acesso restrito; gestor sem botão "Relatar"; indicador de carregamento no mapa |
| 4 | Gestor não vota | Cédula vira resultado ao vivo; banco recusa o voto (migration 0013) |
| 5 | Apagar relato | Autor apaga o próprio relato, com confirmação em duas etapas |
| 6 | Bairros | 94 bairros oficiais do Recife em relato e perfil; nome sempre padronizado (migration 0014) |
| 7 | Limpar banco / conectar ao banco | Script de limpeza; projetos p1–p6 passam a existir no banco com ids fixos; Acompanhando e contador da landing leem o banco |
| 8 | Painel do gestor v1 | Painel do órgão v2 e Novo projeto v2 (prévia ao vivo) |
| 9 | Capa, foto de perfil, foto do bairro | Upload de fotos (migration 0015); card sem foto usa a foto da região (RPA) |

## O que ainda precisa ser feito

| Tarefa | Quem | Como | Pronto quando |
|--------|------|------|---------------|
| Revisar o PR (código e telas) | Guilherme e Ana | Ler o diff, rodar `npm run dev` e abrir Feed, Relatar, Projetos e Painel | Os dois aprovam no GitHub |
| Aplicar as migrations **0011 → 0015** no Supabase de produção | Guilherme | SQL Editor, na ordem. Antes, rodar `npm run test:rls` | Cada migration roda sem erro; rodar de novo também (são idempotentes) |
| Conferir o Storage | Guilherme | Em Storage, ver o bucket `fotos` (público, 5 MB, jpeg/png/webp) criado pela 0015 | Bucket existe com as 3 políticas |
| Rodar `supabase/semana5_limpeza_e_projetos.sql` | Guilherme, com João olhando | **Passo 1** só lista o que sai; João confere a lista; depois o **Passo 2** | Sem relatos/projetos `[SEED]`, sem lixo de teste; 6 projetos do gestor demo no banco |
| Decidir o selo da conta pessoal do Guilherme ("Prefeitura do Recife (teste)") | Guilherme | Manter ou rodar o `update` opcional do final do script | Decisão tomada e anotada |
| Testar em produção, depois do banco | Ana | Entrar como cidadã: relatar com e sem foto, apagar o próprio relato, trocar capa e foto de perfil, votar | Checklist abaixo sem falhas |
| Testar em produção como gestor | Guilherme | Entrar como gestor demo: painel, fila do Feed, novo projeto, tentar votar (deve recusar) | Checklist abaixo sem falhas |
| Atualizar documentação (`banco-de-dados.md`, `votacao.md`, `guia-de-uso.md`, `README`) com 0011–0015, bairros, fotos e Recife | Ana | Seguir o formato dos documentos existentes | Docs batem com o sistema |
| Atualizar `uso-de-ia.md` e `contribuicoes.md` com a semana 5 | João | Manter o texto curto | **Feito** (neste PR) |
| Gravar de novo a demonstração (vídeo) com o sistema novo, se quiserem | João | Reeditar `video3.html` com as telas do painel v2 | Vídeo final de até 2 minutos |
| Confirmar a data da apresentação e trocar "data exata a confirmar" nos documentos | João | Buscar a data com a coordenação | Data escrita nos documentos |
| Mesclar o PR | João | Só depois das duas aprovações e do banco pronto | `main` atualizada |

## Ordem recomendada

1. Guilherme e Ana revisam o PR.
2. Guilherme aplica 0011 → 0015.
3. Guilherme roda o Passo 1 do script e João confere; depois o Passo 2.
4. Ana e Guilherme testam em produção.
5. João mescla o PR.
6. Documentação e vídeo.

## Checklist de teste em produção

**Cidadã**
- [ ] Menu da landing rola para as seções
- [ ] Mapa do Feed mostra o Recife com o resto bloqueado
- [ ] Relatar: clicar fora da linha amarela mostra "Área bloqueada"
- [ ] Relatar: clicar dentro preenche o bairro; só dá para publicar com bairro da lista
- [ ] Relato com foto aparece com a foto; sem foto aparece a foto da região, com crédito
- [ ] Apagar o próprio relato funciona
- [ ] Editar perfil: trocar foto, capa e bairro
- [ ] Votar em um projeto em consulta (Av. Norte)
- [ ] Acompanhando mostra projetos salvos

**Gestor**
- [ ] Não aparece o botão "Relatar"
- [ ] Projeto em consulta mostra o resultado ao vivo, sem botões de voto
- [ ] Painel mostra a fila do Feed, os projetos e os números
- [ ] "Virar projeto" abre o formulário já ligado ao relato
- [ ] Publicar atualização de um projeto funciona

## Riscos

- Sem a 0015, o envio de fotos mostra uma mensagem pedindo a migration; o resto do sistema continua funcionando.
- O script de limpeza apaga dados. Conferir o Passo 1 antes do Passo 2 e, se possível, tirar uma cópia do banco antes.
- As fotos de região vêm da Wikimedia (licenças livres). Os créditos aparecem no card e não devem ser removidos.
