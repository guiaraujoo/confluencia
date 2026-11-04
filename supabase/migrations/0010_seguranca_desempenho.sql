-- Confluência — 0010 (Guilherme, Tarefas 4.2 e 4.3): revisão de segurança e índices.
-- Rode DEPOIS da 0009. Idempotente: pode rodar de novo sem quebrar.
--
-- Resumo do que muda:
--  1. Uma única porta de entrada para o voto: some a registrar_voto (0006); fica a
--     votar (0007), que é a que o app chama. Decidido com a Ana na 4.3.
--  2. comprovantes_publicos deixa de listar hashes de projetos rejeitados (que a
--     0007 tornou privados) e sai em ordem de hash, não de inserção.
--  3. Resposta oficial só pode apontar para projeto do próprio órgão.
--  4. handle_new_user (security definer) ganha search_path fixo.
--  5. Índices para a view posts_repercussao e para o painel do gestor e o perfil.

-- 1. Uma função de voto só -----------------------------------------------------
drop function if exists public.registrar_voto(uuid, text);

-- 2. Auditoria pública sem projetos rejeitados ---------------------------------
-- Mesma regra da votos_resultado (0007). A view roda com os direitos do dono
-- (votos não tem policy de select), então o filtro precisa estar aqui dentro.
-- A ordem por hash evita que a posição na lista revele a ordem dos votos.
create or replace view public.comprovantes_publicos as
select v.projeto_id, v.hash_comprovante
from votos v
join projetos p on p.id = v.projeto_id
where p.status <> 'rejeitado' or p.orgao_id = auth.uid()
order by v.projeto_id, v.hash_comprovante;

grant select on public.comprovantes_publicos to anon, authenticated;

-- 3. Resposta oficial ligada só a projeto do próprio órgão -----------------------
-- Sem isso um órgão verificado poderia marcar "virou projeto" apontando para o
-- projeto de outro órgão. O app hoje não envia projeto_id, então nada muda na tela.
drop policy if exists "respostas: so orgao verificado responde" on respostas_oficiais;
create policy "respostas: so orgao verificado responde" on respostas_oficiais for insert
  with check (
    auth.uid() = orgao_id
    and exists (select 1 from profiles where id = auth.uid() and institucional_verificado = true)
    and (projeto_id is null or exists (select 1 from projetos where id = projeto_id and orgao_id = auth.uid()))
  );

-- 4. search_path fixo na função do cadastro --------------------------------------
-- Função security definer sem search_path pode ser enganada por um objeto com o
-- mesmo nome em outro schema (aviso do Security Advisor do Supabase).
alter function public.handle_new_user() set search_path = public;

-- 5. Índices -----------------------------------------------------------------------
-- posts_repercussao conta, para CADA relato, os relatos da mesma categoria e bairro
-- nos últimos 30 dias. O Feed e a landing leem a view inteira, então essa
-- subconsulta roda uma vez por relato: o índice composto vira uma busca por faixa.
-- Ele cobre também as buscas só por bairro, então o índice simples da 0001 sai.
create index if not exists posts_bairro_categoria_data_idx on posts (bairro, categoria, created_at);
drop index if exists posts_bairro_idx;

-- votos(projeto_id): não precisa de índice novo. A UNIQUE (projeto_id, user_id)
-- da 0003 já cria um índice que começa por projeto_id, e é ele que a
-- votos_resultado e a comprovantes_publicos usam.

-- Painel do gestor (listarProjetosDoOrgao) filtra por orgao_id.
create index if not exists projetos_orgao_idx on projetos (orgao_id, created_at desc);

-- Aba "Respostas" do perfil de um órgão filtra por orgao_id.
create index if not exists respostas_orgao_idx on respostas_oficiais (orgao_id, created_at desc);
