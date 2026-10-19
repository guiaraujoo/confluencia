-- Confluência — Tarefa 1.2 (Ana) + 2.2 (Ana) + 3.1 (Guilherme): tabelas de projetos e votos
-- Modelagem combinada entre Ana e Guilherme (Semana 1).

create type status_projeto as enum (
  'proposto',
  'em_consulta',
  'aprovado',
  'rejeitado',
  'em_execucao',
  'concluido'
);

create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references auth.users(id),
  nome text not null,
  descricao text not null,
  categoria categoria_post not null,
  status status_projeto not null default 'proposto',
  origem_post_id uuid references posts(id),
  timeline jsonb not null default '[]',
  consulta_fim timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists projetos_status_idx on projetos (status);

alter table projetos enable row level security;

-- Votos: secreto mas auditável.
-- "opcao" nunca é lida linha a linha por consulta pública — só via função agregada
-- (ver 0004_rls_policies.sql). A UNIQUE(projeto_id, user_id) é o bloqueio de voto
-- duplicado no nível do banco, não só na tela.
create table if not exists votos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references projetos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  opcao text not null check (opcao in ('favor', 'contra')),
  hash_comprovante text not null,
  created_at timestamptz not null default now(),
  unique (projeto_id, user_id)
);

alter table votos enable row level security;

-- Resultado agregado: a única forma pública de ler os votos.
-- Expõe só contagens, nunca a linha individual com a opção de cada pessoa.
create or replace view votos_resultado as
select
  projeto_id,
  count(*) filter (where opcao = 'favor') as votos_favor,
  count(*) filter (where opcao = 'contra') as votos_contra,
  count(*) as total_votos
from votos
group by projeto_id;
