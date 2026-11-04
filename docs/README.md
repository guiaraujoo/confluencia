# Documentação do Confluência

**Atualizado em:** 29/10/2026 · Índice de toda a documentação do projeto, por assunto. O resumo do projeto está no [README principal](../README.md).

**No ar:** https://confluencia-liart.vercel.app

## Por onde começar

| Se você quer... | Leia |
|---|---|
| Entender o projeto em 5 minutos | [README principal](../README.md) |
| Usar o sistema | [Guia de uso](guia-de-uso.md) |
| Avaliar o código | [Arquitetura](arquitetura.md) → [Banco de dados](banco-de-dados.md) → [Votação](votacao.md) |
| Conferir se funciona | [Qualidade e testes](qualidade.md) |
| Saber o que falta | [Limitações e próximos passos](limitacoes-e-proximos-passos.md) |

## 1. Produto

| Documento | Conteúdo |
|---|---|
| [Visão do produto](visao-produto.md) | Problema, para quem, o ciclo relato → projeto → obra, princípios e escopo do MVP |
| [Guia de uso](guia-de-uso.md) | Cada tela, com capturas da produção, e as contas de demonstração |
| [Identidade visual](identidade-visual.md) | Logo, cores, tipografia, movimento e as regras que o time combinou |
| [Limitações e próximos passos](limitacoes-e-proximos-passos.md) | O que o MVP não faz e o plano depois da apresentação |

## 2. Técnica

| Documento | Conteúdo |
|---|---|
| [Arquitetura](arquitetura.md) | Módulos, rotas, fluxo de dados, mapas, desempenho e deploy |
| [Banco de dados](banco-de-dados.md) | As 10 migrations, tabelas, views, funções, RLS e o que já está aplicado |
| [Contrato de dados](contrato-de-dados.md) | Campo a campo de cada tabela, como o front deve ler e escrever |
| [Votação](votacao.md) | Voto secreto e auditável: função, comprovante e erros (Guilherme) |
| [Revisão da 0003](revisao-0003-projetos-votos.md) | Revisão de segurança das tabelas de projetos e votos |
| [Wireframes de Projetos e Perfil](wireframes-projetos-perfil.md) | Esqueleto das telas da Ana na Semana 1 |
| [Semana 4 da Ana](semana-4-ana.md) | Feed ↔ Projetos pelo campo origem, revisão do banco (0011) e responsividade de Projetos |

## 3. Qualidade

| Documento | Conteúdo |
|---|---|
| [Qualidade e testes](qualidade.md) | Verificações automáticas, testes manuais, desempenho medido e problemas achados |

## 4. Processo

| Documento | Conteúdo |
|---|---|
| [Cronograma](cronograma-atualizado.md) | As 4 semanas de desenvolvimento (a apresentação foi adiada para dezembro) |
| [Ambiente colaborativo](ambiente-colaborativo.md) | Repositório, branches, PRs, deploy e Supabase |
| [Contribuições por integrante](contribuicoes.md) | Escopo de cada pessoa e quem entregou cada parte, com evidência |
| [Uso de IA generativa](uso-de-ia.md) | Onde a IA entrou no desenvolvimento e o que o time corrigiu ou rejeitou |

## 5. Linha do tempo

| Data | Marco | Onde |
|---|---|---|
| 07/10 | Scaffold do projeto e adiantamento das Semanas 1 e 2 | [PR #1](https://github.com/joaobatis1a/confluencia/pull/1) |
| 12/10 | Projetos e perfil (Ana); Feed ligado ao Supabase real | [PR #3](https://github.com/joaobatis1a/confluencia/pull/3) · [PR #4](https://github.com/joaobatis1a/confluencia/pull/4) |
| 19/10 | Repercussão (Guilherme), votação real, modo demonstração e clusters | [PR #5 a #8](https://github.com/joaobatis1a/confluencia/pulls?q=is%3Apr+is%3Aclosed) |
| 25 e 26/10 | Semana 3: votação com hash no servidor (Guilherme) e módulo Projetos completo (Ana) | `0006_votacao.sql` · [PR #9](https://github.com/joaobatis1a/confluencia/pull/9) |
| 28/10 | Integração da Semana 3 com a repaginada (visual novo, landing, camada social) | [PR #10](https://github.com/joaobatis1a/confluencia/pull/10) |
| 29/10 | Documentação completa; clusters no mapa novo | [PR #11](https://github.com/joaobatis1a/confluencia/pull/11) · [PR #12](https://github.com/joaobatis1a/confluencia/pull/12) |
| 1ª semana de dezembro | Apresentação (data exata a confirmar) | |

Os guias individuais de cada semana (PDF) ficam fora do repositório, nos documentos de planejamento do time.
