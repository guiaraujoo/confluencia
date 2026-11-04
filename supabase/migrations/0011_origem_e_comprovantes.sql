-- Confluência — 0011 (Ana, Semana 4): Feed ↔ Projetos pelo campo origem + revisão do banco.
-- Tarefas 4.1 e 4.2 da Ana, revisadas com o Guilherme. Rode DEPOIS da 0001 → 0010.
-- Escrita como 0010 em paralelo com a 0010 do Guilherme; na integração virou 0011 e
-- perdeu o que a 0010 dele já faz (comprovantes_publicos sem rejeitados, índice do
-- painel do gestor e índice da recorrência do Feed).
-- Pode rodar mais de uma vez sem erro (tudo é "if not exists" / "or replace").
--
-- O que muda (detalhes em docs/semana-4-ana.md):
--  1. Apagar um relato que virou projeto deixava de funcionar (a chave estrangeira
--     de projetos.origem_post_id bloqueava). Agora o projeto fica e só perde o link.
--  2. Índice para "este relato virou projeto?" (consulta nova da tela do relato).
--  3. Índice para a listagem pública (mais recentes primeiro).
--  4. verificar_comprovante: a busca pelo começo do hash (LIKE 'abc%') varria a
--     tabela `votos` inteira. Agora usa um índice nos 16 primeiros caracteres.
--  5. Índice para achar as respostas oficiais que apontam para um projeto.

-- 1. Relato apagado não trava mais (on delete set null) ---------------------------
-- A 0003 criou a referência sem regra de exclusão, então o padrão é "restrict":
-- se a autora apagasse um relato que já tinha virado projeto, o delete falhava
-- com erro de chave estrangeira. O projeto é do órgão e deve continuar existindo.
-- Procuramos a constraint pelo nome da coluna (o nome gerado pode variar).
do $$
declare v_nome text;
begin
  select c.conname into v_nome
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.projetos'::regclass
    and c.contype = 'f'
    and a.attname = 'origem_post_id';
  if v_nome is not null then
    execute format('alter table public.projetos drop constraint %I', v_nome);
  end if;
end $$;

alter table public.projetos
  add constraint projetos_origem_post_id_fkey
  foreign key (origem_post_id) references public.posts(id) on delete set null;

-- 2. "Este relato virou projeto?" ----------------------------------------------------
-- Consulta da tela do relato: projetos where origem_post_id = <post>. Parcial: a
-- maioria dos projetos não tem origem, então o índice fica pequeno.
create index if not exists projetos_origem_post_idx
  on public.projetos (origem_post_id)
  where origem_post_id is not null;

-- 3. Listagem pública ---------------------------------------------------------------
-- (O índice do painel do gestor, projetos_orgao_idx, já vem da 0010.)
-- listarProjetosPublicos: where status <> 'rejeitado' order by created_at desc
create index if not exists projetos_created_idx on public.projetos (created_at desc);

-- 4. Verificar comprovante sem varrer a tabela ---------------------------------------
-- A tela mostra os 16 primeiros caracteres do hash e a função aceita 16 a 64.
-- Comparar os 16 primeiros por igualdade usa o índice; o LIKE continua conferindo
-- o resto quando a pessoa cola o hash inteiro.
create index if not exists votos_hash_prefixo_idx on public.votos (left(hash_comprovante, 16));

create or replace function public.verificar_comprovante(p_hash text)
returns table (projeto_id uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select v.projeto_id, v.created_at
  from votos v
  join projetos p on p.id = v.projeto_id
  -- Só aceita hexadecimal: sem isso, um "%" ou "_" no texto viraria curinga
  -- do LIKE e "confirmaria" qualquer comprovante (ajuste da revisão da Semana 3).
  where trim(p_hash) ~* '^[0-9a-f]{16,64}$'
    and left(v.hash_comprovante, 16) = left(lower(trim(p_hash)), 16)
    and v.hash_comprovante like lower(trim(p_hash)) || '%'
    and (p.status <> 'rejeitado' or p.orgao_id = auth.uid())
  limit 1;
$$;

grant execute on function public.verificar_comprovante(text) to anon, authenticated;

-- 5. Respostas oficiais ligadas a projeto -------------------------------------------
-- Respostas oficiais que apontam para um projeto (on delete set null da 0008
-- precisa achar essas linhas quando um projeto é apagado).
create index if not exists respostas_projeto_idx
  on public.respostas_oficiais (projeto_id)
  where projeto_id is not null;
