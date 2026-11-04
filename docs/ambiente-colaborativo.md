# Ambiente colaborativo

## Ferramentas

| Ferramenta | Para quê | Onde |
|---|---|---|
| GitHub | Código, PRs e revisão | [joaobatis1a/confluencia](https://github.com/joaobatis1a/confluencia) |
| Vercel | Deploy do front e preview por PR | [confluencia-liart.vercel.app](https://confluencia-liart.vercel.app) |
| Supabase | Banco, login e regras de acesso | Projeto criado e administrado pelo Guilherme |
| Guias individuais (PDF) | Tarefas de cada semana, por pessoa | Documentos de planejamento do time, fora do repositório |
| Design system v2.1 (PDF) | Cores, fontes, componentes | `confluencia-design.pdf`, fora do repositório |
| WhatsApp | Combinados do dia a dia e checagem de quarta-feira | Grupo do time |

## Fluxo de Git

1. **A `main` é protegida no GitHub:** ninguém envia direto, só por Pull Request (vale também para o administrador).
2. Cada tarefa nasce de uma branch a partir da `main` atualizada:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/nome-da-tarefa
   ```
3. Prefixos: `feature/` (funcionalidade), `fix/` (correção), `docs/` (documentação), `chore/` (configuração). No início cada pessoa teve uma branch própria (`joao/feed-geolocalizacao`, `ana/projetos-frontend`, `guilherme/backend-core`); a partir da Semana 2 passou a ser uma branch por tarefa.
4. Commits no formato `tipo(escopo): descrição`, em português. Ex.: `feat(feed): agrupa marcadores próximos no mapa em clusters (Tarefa 5.2)`.
5. PR para a `main`, com o que mudou e como testar. A Vercel comenta o link de preview no PR.
6. O líder (João) revisa e mescla. PRs de tarefa costumam entrar por squash; integrações grandes (PR #10) por merge commit, para que as branches abertas a partir dela continuem alinhadas.

### Branches da Semana 4

Criadas a partir da `main` depois do PR #10:

| Pessoa | Branch |
|---|---|
| Ana | `feature/feed-projetos-origem` |
| Guilherme | `feature/integracao-seguranca-deploy` |
| João | `feature/polimento-feed-mapa` |

## Ambiente local

```bash
git clone https://github.com/joaobatis1a/confluencia.git
cd confluencia
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

`.env.local` nunca vai para o repositório. Sem ele o app abre em modo demonstração (ver [Arquitetura](arquitetura.md#deploy)).

## Banco

- Toda mudança de esquema é uma migration nova e numerada em `supabase/migrations/`, nunca uma edição de migration já aplicada.
- Antes de aplicar no Supabase real, a migration passa por PR e revisão. A ordem completa está em `supabase/README.md`.
- Mudou um campo? Atualize nesta ordem: migration, `src/types/database.ts`, [Contrato de dados](contrato-de-dados.md).

## Ritmo

- **Cronograma:** 4 semanas de desenvolvimento (07/10 a 01/11), folga a partir de 02/11 e apresentação na primeira semana de dezembro. Detalhes em [Cronograma](cronograma-atualizado.md).
- **Checagem de quarta-feira:** "está tudo dentro do previsto ou tem algo travado?" no grupo.
- **Guia da semana:** cada pessoa recebe um PDF com tarefas, dependências, tempo estimado e passo a passo. Quando a base muda (como na repaginada), o guia é refeito apontando para os arquivos novos, sem aumentar o escopo de ninguém.

## Padrões de código

- Nomes de variáveis, funções e comentários em português, como o resto do projeto.
- Telas de Projetos só falam com o banco por `features/projetos/api.ts`.
- Relatos são lidos pela view `posts_repercussao`, nunca pela tabela `posts`.
- Regras visuais e de movimento em [Identidade visual](identidade-visual.md).
- Antes do PR: `npm run build` e `npm run lint` sem erros.
