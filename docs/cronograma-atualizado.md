# Confluência — Cronograma Atualizado

**Gerado em:** 07/10/2026 · **Apresentação:** 05/11/2026 (quinta-feira) · **Dias disponíveis:** 29

## Atualização de 08/10 — Semana 1 adiantada e já mesclada na main

Boa parte da Semana 1 (e um adiantamento da Semana 2) já foi implementada, revisada e está **mesclada na branch `main`** (era o [PR #1](https://github.com/joaobatis1a/confluencia/pull/1), já fechado) e **no ar** em [confluencia-liart.vercel.app](https://confluencia-liart.vercel.app): mapa Leaflet, captura de coordenadas, Feed completo (mock), módulo Projetos completo (mock), autenticação via Supabase (código pronto), as 4 migrations SQL do banco (`posts`, `profiles`, `projetos`, `votos`, com RLS), animações de interface, README, LICENSE (MIT, nos três nomes) e deploy conectado ao GitHub. Cada guia individual em PDF tem uma seção "Status atual" explicando o que já está pronto e o próximo passo de cada um.

**Bloqueio real agora:** ainda não existe um projeto Supabase de verdade — isso é 100% do Guilherme. Até ele criar o projeto e aplicar as migrations (`supabase/README.md`), João e Ana seguem trabalhando com dados mock, o que já é suficiente para avançar o resto da Semana 2.

**Importante para todos:** as branches iniciais (`joao/feed-geolocalizacao`, `ana/projetos-frontend`, `guilherme/backend-core`) ficaram desatualizadas depois do merge. Antes da próxima tarefa, rode `git checkout main && git pull origin main` e crie sua branch a partir daí.

## Por que o cronograma mudou

O plano original previa 6 semanas de trabalho com 2 semanas de margem (8 semanas reais). Até hoje (07/10), o repositório ainda estava vazio — nenhum código commitado — então, na prática, o time está no dia zero da implementação, mesmo com os documentos de planejamento prontos desde o início de setembro.

Com a apresentação marcada para **05/11**, restam 29 dias corridos. Este cronograma comprime as 6 semanas originais em **4 semanas de desenvolvimento**, mantendo o mesmo escopo do MVP (nada foi cortado do que está no Escopo Geral), e reserva **3 dias de buffer fixo** antes da apresentação para polimento, ensaio e imprevistos — em vez de só descobrir um atraso no último dia.

Isso só é viável porque o design system (etapa que consumia os primeiros dias do plano original) **já está pronto** (`confluencia-design.pdf` v2.1), e porque o scaffold técnico do projeto (Vite + React + TypeScript + Tailwind v4 com os tokens do design system já aplicados, Supabase e Leaflet instalados) foi preparado hoje, eliminando a tarefa de setup inicial que cada pessoa teria que fazer sozinha.

**Se o time perceber atraso em qualquer semana**, a ordem de corte recomendada (do menos ao mais crítico para a apresentação) é: clusters de mapa (5.2 do João) → camada de simulação visual (5.1 do João, pode virar 2 imagens estáticas lado a lado em vez de slider) → painel de gestor com detalhes extras (manter só o essencial: listar projetos + status). Nunca corte: autenticação, publicar/listar post, votação com hash, deploy final.

## Visão geral

| Semana | Datas | Foco |
|---|---|---|
| 1 | 07/10 (qua) – 12/10 (seg) | Fundação: wireframes, Supabase, auth básica, contrato de dados |
| 2 | 13/10 (ter) – 19/10 (seg) | Feed completo + estruturas base de Projetos |
| 3 | 20/10 (ter) – 26/10 (seg) | Projetos completo: votação, hash, verificação institucional |
| 4 | 27/10 (ter) – 01/11 (dom) | Integração Feed↔Projetos, simulação visual, polimento, deploy |
| Buffer | 02/11 (seg) – 04/11 (qua) | Correção de bugs, documentação, ensaio da apresentação |
| — | **05/11 (qui)** | **APRESENTAÇÃO** |

## Checagem de meio de semana

Mantida do Guia do Líder original: toda **quarta-feira**, pergunta objetiva ao grupo — "está tudo dentro do previsto, ou tem algo travado?". Nas semanas comprimidas isso importa mais do que no plano original, porque não sobra tempo de reorganizar tarefas na semana seguinte sem comer o buffer.

## Detalhamento por semana

### Semana 1 — Fundação (07/10 a 12/10)

- **João:** wireframes das telas do Feed; protótipo Figma (se ainda não feito); teste isolado do mapa Leaflet.
- **Ana:** wireframes das telas de Projetos e perfil; apoio à modelagem das tabelas `projetos` e `votos` (no papel, com Guilherme).
- **Guilherme:** criação do projeto Supabase + tabela `posts`; regras de acesso gerais (rascunho); ativar autenticação por e-mail/senha.
- **Todos:** clonar o repositório (scaffold já pronto), confirmar `npm install && npm run dev` rodando localmente.
- **Entrega:** wireframes aprovados + Supabase com tabela de posts + auth básica funcionando + contrato de dados (campos de post) alinhado entre João e Guilherme.

### Semana 2 — Feed completo + base de Projetos (13/10 a 19/10)

- **João:** telas estáticas do Feed → conectar ao Supabase (publicar/listar posts reais) → exibir posts no mapa → filtros por categoria/bairro.
- **Ana:** telas estáticas de Projetos e painel de gestor; criação real das tabelas `projetos`/`votos` no Supabase (com Guilherme); formulário de criar projeto (pode salvar mock ainda).
- **Guilherme:** contrato de dados documentado e compartilhado; regras de categorização de posts; lógica inicial de repercussão (recorrência + engajamento).
- **Entrega:** Feed 100% funcional (publicar, listar, mapa, filtros) + estruturas de Projetos prontas para receber dados reais.

### Semana 3 — Projetos completo (20/10 a 26/10)

- **João:** apoio nas telas de votação (barra votar sim/não + comprovante); validação de coordenadas antes de salvar post.
- **Ana:** tela de projeto completa (timeline + status + área de votação); painel de gestor com projetos rejeitados; queries de votação.
- **Guilherme:** regras de votação (RLS, hash de comprovante, bloqueio de voto duplicado) — tarefa mais sensível do cronograma; fluxo de verificação de conta institucional; dados mock de projetos de exemplo.
- **Entrega:** módulo Projetos funcional — órgão publica projeto, população vota de forma secreta e auditável, resultado agregado aparece, painel de gestor mostra tudo (inclusive rejeitados).

### Semana 4 — Integração, polimento e deploy (27/10 a 01/11)

- **João:** camada de simulação visual (antes/depois ilustrativo) no Feed; clusters de posts no mapa + performance; ajustes finais de UI/responsividade do Feed.
- **Ana:** conectar Feed → Projetos (campo "origem"); ajustes finos do módulo Projetos; ajustes finais de UI/responsividade de Projetos.
- **Guilherme:** testes de integração ponta a ponta; correção de bugs cruzados; revisão de segurança (RLS); backup do banco; **deploy em produção (Vercel + Supabase)**; documentação básica de uso.
- **Entrega:** sistema completo, integrado, responsivo, testado e **no ar**.

### Buffer — 02/11 a 04/11

- Correção de bugs encontrados em testes finais com "olhos de fora" (cada um testa o módulo dos outros).
- Revisão de que nada promete mais do que o sistema entrega (ex: deixar claro que a simulação é ilustrativa, não preditiva; que a votação ainda não usa CPF/gov.br).
- Preparar a apresentação: roteiro, quem fala o quê, testar o link de produção numa rede diferente da de casa (evita susto de dia).
- Atualizar o README e a documentação de uso com o que ficou fora do MVP (próxima fase).

## O que continua fora do escopo do MVP (sem mudança)

Confirmado no Escopo Geral — não há tempo nem necessidade de reavaliar isso com o prazo comprimido:
- Integração de identidade oficial (CPF / gov.br) na votação
- Modelo preditivo real de simulação de impacto urbano
- Moderação de conteúdo automatizada

## Dependências críticas (quem trava quem, resumo)

1. **Guilherme → autenticação (Semana 1):** se atrasar, trava telas de João e Ana que dependem de usuário logado. É o item de maior risco do cronograma inteiro — priorizar sobre qualquer refinamento visual.
2. **Guilherme → regras de votação (Semana 3):** tarefa mais complexa do cronograma (8-10h estimadas no plano original, agora sem semana extra de colchão). Se apertar, simplifique a verificação institucional antes de simplificar o hash do voto (segurança do voto é o diferencial do produto).
3. **João → Feed salvando posts reais (fim da Semana 2):** trava a lógica de repercussão do Guilherme e o campo "origem" de Ana na Semana 4.
