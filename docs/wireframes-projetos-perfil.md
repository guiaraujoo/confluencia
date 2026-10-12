# Wireframes — Projetos e Perfil

**Tarefa 1.1 (Ana), Semana 1.** Esqueleto em blocos simples das telas do módulo Projetos e do Perfil. Usa só o que já existe no design system v2.1 (`src/index.css`, `src/components/ui.tsx`): nenhuma cor, fonte ou componente novo.

**Quem usa este documento:** a Ana, na Semana 2 (telas estáticas), e o Guilherme, para conferir as tabelas `projetos`/`votos`/`profiles` contra os campos do formulário (ver [`contrato-de-dados.md`](contrato-de-dados.md)).

Legenda: `[ Botão ]` · `( pill )` · `|campo|` · `▣` = badge de status · `▤` = badge de categoria

---

## 1. Listagem de projetos — `/projetos`

```
┌───────────────────────────────────────────────────────────────┐
│ NavBar: (C) Feed  Projetos  Painel de gestor        Perfil Sair│
├───────────────────────────────────────────────────────────────┤
│ Projetos                                                      │
│ Acompanhe e vote nos projetos da sua cidade.                  │
│                                                               │
│ (Todos) (Proposto) (Em consulta) (Aprovado) (Rejeitado) ...   │
│ 4 projetos encontrados                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │▤ Mobilidade  │ │▤ Praças      │ │▤ Saneamento  │            │
│ │ Nome         │ │ Nome         │ │ Nome         │            │
│ │ Descrição... │ │ Descrição... │ │ Descrição... │            │
│ │──────────────│ │──────────────│ │──────────────│            │
│ │▣ Status  prazo│ │▣ Status      │ │▣ Status      │            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
└───────────────────────────────────────────────────────────────┘
```

- Card inteiro é clicável → detalhe.
- Rodapé do card: status + prazo da consulta (só quando `em_consulta`).

## 2. Detalhe do projeto — `/projetos/:id`

```
┌───────────────────────────────────────────────────────────────┐
│ ← Voltar aos Projetos                                         │
│ ╔═══════════════════════════════════════════════════════════╗ │
│ ║ STATUS DO PROJETO  (destaque — ver nota abaixo)           ║ │
│ ║ ▣ Em consulta pública          Consulta até 20/11/2026    ║ │
│ ║ ●───────●───────○───────○───────○                         ║ │
│ ║ Proposto Consulta Aprovado Execução Concluído             ║ │
│ ╚═══════════════════════════════════════════════════════════╝ │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ ▤ Categoria                                               │ │
│ │ Nome do projeto                                           │ │
│ │ Descrição                                                 │ │
│ │ Originado de um relato do Feed →   (se origem_post_id)    │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌ Linha do tempo ───────────────────────────────────────────┐ │
│ │ ● Projeto técnico   previsto 01/09 · concluído 03/09      │ │
│ │ ○ Licitação         previsto 01/11                        │ │
│ │ ○ Início da obra    previsto 15/01                        │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌ Consulta pública (só se em_consulta) ─────────────────────┐ │
│ │ Texto: voto secreto e consultivo                          │ │
│ │ [ Votar a favor ]  [ Votar contra ]                       │ │
│ │ → depois de votar: caixa verde com comprovante (hash)     │ │
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

**Espaço de destaque do status (passo 4):** é o primeiro bloco da tela, acima até do nome, porque é a primeira pergunta de quem abre um projeto: "em que pé isso está?". Ele mostra o badge, uma frase de contexto (prazo da consulta, etapa atual) e o trilho das etapas. Se o projeto for `rejeitado`, o trilho para em "Consulta" e o bloco fica com a cor vermelha de status. Usa só as cores de status do design system: amarelo nunca indica status.

## 3. Formulário de criar projeto — `/projetos/novo`

Só para conta institucional verificada (mesma proteção do painel). Cada campo anotado com a coluna que representa em `projetos`:

```
┌───────────────────────────────────────────────────────────────┐
│ Novo projeto                                                  │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Nome do projeto  |__________________|  ← projetos.nome    │ │
│ │ Descrição        |__________________|  ← projetos.descricao│ │
│ │                  |__________________|                     │ │
│ │ Categoria        |Mobilidade      ▾|  ← projetos.categoria│ │
│ │ Status inicial   |Proposto        ▾|  ← projetos.status   │ │
│ │ Fim da consulta  |dd/mm/aaaa       |  ← projetos.consulta_fim│
│ │   (só aparece se status = Em consulta pública)            │ │
│ │ Relato de origem |Nenhum          ▾|  ← projetos.origem_post_id│
│ │ Marcos da linha do tempo           ← projetos.timeline    │ │
│ │   |Nome do marco| |data prevista| [x]   ← { nome,         │ │
│ │   [ + Adicionar marco ]                    data_prevista } │ │
│ │ [ Publicar projeto ]                                      │ │
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

| Campo na tela | Coluna | Observação |
|---|---|---|
| Nome do projeto | `nome` | obrigatório |
| Descrição | `descricao` | obrigatório |
| Categoria | `categoria` | mesma lista dos posts do Feed |
| Status inicial | `status` | só `proposto` ou `em_consulta` na criação; os outros mudam depois, pelo painel |
| Fim da consulta | `consulta_fim` | obrigatório quando o status é `em_consulta` |
| Relato de origem | `origem_post_id` | opcional: liga o projeto a um post do Feed (integração da Semana 4) |
| Marcos | `timeline` | lista de `{ nome, data_prevista, data_real }`; `data_real` nasce `null` |
| (não aparece) | `orgao_id` | vem do usuário logado |
| (não aparece) | `id`, `created_at` | gerados pelo banco |

## 4. Painel de gestor — `/painel`

```
┌───────────────────────────────────────────────────────────────┐
│ Painel de gestor                          [ + Novo projeto ]  │
│ Projetos do seu órgão — inclusive os rejeitados.              │
│ ┌──────┐ ┌──────┐ ┌──────┐                                    │
│ │ 1    │ │ 1    │ │ 1    │  ← contadores: em consulta,        │
│ │consul│ │execu │ │rejei │    em execução, rejeitados         │
│ └──────┘ └──────┘ └──────┘                                    │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Nome do projeto                              ▣ Status   → │ │
│ │ (Rejeitado — não visível ao público)                      │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ...                                                           │
└───────────────────────────────────────────────────────────────┘
```

## 5. Perfil — `/perfil`

```
┌───────────────────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ (N)  Nome da pessoa                                       │ │
│ │      email@exemplo.com                                    │ │
│ │      ▣ Cidadão  |  ▣ Conta institucional · Órgão          │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌ Atalhos do órgão (só institucional) ──────────────────────┐ │
│ │ [ Painel de gestor ]  [ Novo projeto ]                    │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌ Meus relatos ─────────────────────────────────────────────┐ │
│ │ ▤ Categoria · Bairro · há 2 dias                        → │ │
│ │ (vazio: "Você ainda não relatou nada." [ Relatar ])       │ │
│ └───────────────────────────────────────────────────────────┘ │
│ Votos: não aparecem aqui de propósito (voto secreto, ver RLS) │
└───────────────────────────────────────────────────────────────┘
```

- Deslogado: card "Entre para ver seu perfil" com link para `/entrar`.
- Os votos da pessoa **não** são listados: a tabela `votos` não tem policy de leitura (`0004_rls_policies.sql`), nem para o próprio dono. Só o comprovante aparece, uma vez, logo depois de votar.
