-- Confluência — Semana 5: limpar o banco e colocar os 6 projetos da vitrine nele.
-- Rode no SQL Editor do Supabase DEPOIS das migrations 0011 → 0014.
--
-- Passo 1 só mostra o que vai sair (não apaga nada). Confira e rode o Passo 2.
-- Os projetos usam ids fixos (os mesmos de src/features/projetos/mock.ts), então
-- as fotos, a proposta e a galeria de cada um continuam aparecendo no site.
-- Dono dos projetos: gestor.demo@confluencia.app (criada pelo seed-social-demo.sql).

-- ─── Passo 1: conferência ────────────────────────────────────────────────────
select 'relato' as o_que, id::text, left(descricao, 60) as texto, bairro
from posts
where descricao like '[SEED]%'
   or descricao in ('jijkjasihasijcsaicjijasisais', 'f0wofjewfef')
   or descricao ilike 'teste de qa%'
union all
select 'projeto', id::text, nome, null from projetos where nome like '[SEED]%'
union all
select 'conta de teste', id::text, nome, null from profiles where nome ilike 'teste qa%'
union all
select 'bairro sem acento', id::text, bairro || ' → ' || public.bairro_oficial(bairro), null
from posts where public.bairro_oficial(bairro) is distinct from bairro and public.bairro_oficial(bairro) is not null;

-- ─── Passo 2: limpeza + projetos ─────────────────────────────────────────────
begin;

-- 2.1 Projetos de teste (os votos e as respostas que apontam para eles saem junto).
delete from projetos where nome like '[SEED]%';

-- 2.2 Relatos de teste e lixo digitado em testes. Projetos que nasceram deles
--     perdem só a ligação com o relato.
with lixo as (
  select id from posts
  where descricao like '[SEED]%'
     or descricao in ('jijkjasihasijcsaicjijasisais', 'f0wofjewfef')
     or descricao ilike 'teste de qa%'
)
update projetos set origem_post_id = null where origem_post_id in (select id from lixo);

delete from posts
where descricao like '[SEED]%'
   or descricao in ('jijkjasihasijcsaicjijasisais', 'f0wofjewfef')
   or descricao ilike 'teste de qa%';

-- 2.3 Conta de QA (perfil, apoios, comentários e notificações saem em cascata).
delete from auth.users where id in (select id from profiles where nome ilike 'teste qa%');

-- 2.4 Bairros com o nome oficial ("Varzea" → "Várzea").
update posts set bairro = public.bairro_oficial(bairro)
where public.bairro_oficial(bairro) is not null and public.bairro_oficial(bairro) <> bairro;
update profiles set bairro = public.bairro_oficial(bairro)
where public.bairro_oficial(bairro) is not null and public.bairro_oficial(bairro) <> bairro;

-- 2.5 Os 6 projetos da vitrine. Pode rodar de novo: atualiza em vez de duplicar.
--     A consulta da Av. Norte fica aberta até 20/12, depois da apresentação.
with gestor as (select id from auth.users where email = 'gestor.demo@confluencia.app')
insert into projetos (id, orgao_id, nome, descricao, categoria, status, origem_post_id, timeline, consulta_fim, created_at)
select v.id::uuid, gestor.id, v.nome, v.descricao, v.categoria::categoria_post, v.status::status_projeto,
       (select p.id from posts p where p.id = v.origem::uuid), v.timeline::jsonb, v.consulta_fim::timestamptz, v.criado::timestamptz
from gestor, (values
  ('5ec1fe00-0000-4000-8000-000000000001', 'Requalificação da Av. Norte',
   'Nova ciclovia, iluminação de LED e recapeamento em 3km de extensão.',
   'mobilidade', 'em_consulta', null,
   '[{"nome":"Projeto técnico","data_prevista":"2026-09-01","data_real":"2026-09-03"},{"nome":"Consulta pública","data_prevista":"2026-12-20","data_real":null},{"nome":"Licitação","data_prevista":"2027-02-01","data_real":null},{"nome":"Início da obra","data_prevista":"2027-04-15","data_real":null}]',
   '2026-12-20T23:59:59-03:00', '2026-08-20T10:00:00Z'),
  ('5ec1fe00-0000-4000-8000-000000000002', 'Revitalização da Praça do Derby',
   'Novos brinquedos, poda de árvores e academia ao ar livre.',
   'pracas_lazer', 'em_execucao', null,
   '[{"nome":"Projeto técnico","data_prevista":"2026-06-01","data_real":"2026-06-05"},{"nome":"Licitação","data_prevista":"2026-07-01","data_real":"2026-07-10"},{"nome":"Início da obra","data_prevista":"2026-08-01","data_real":"2026-08-02"},{"nome":"Entrega","data_prevista":"2026-12-10","data_real":null}]',
   null, '2026-05-10T10:00:00Z'),
  ('5ec1fe00-0000-4000-8000-000000000003', 'Nova UPA em Várzea',
   'Unidade de pronto atendimento com 24h de funcionamento.',
   'saude', 'rejeitado', null,
   '[{"nome":"Projeto técnico","data_prevista":"2026-04-01","data_real":"2026-04-01"}]',
   '2026-05-01T23:59:59Z', '2026-03-01T10:00:00Z'),
  ('5ec1fe00-0000-4000-8000-000000000004', 'Drenagem da Rua das Flores',
   'Obra de drenagem para resolver alagamentos recorrentes.',
   'saneamento', 'concluido', null,
   '[{"nome":"Projeto técnico","data_prevista":"2026-01-01","data_real":"2026-01-01"},{"nome":"Obra","data_prevista":"2026-03-01","data_real":"2026-03-20"}]',
   null, '2025-12-01T10:00:00Z'),
  ('5ec1fe00-0000-4000-8000-000000000005', 'Iluminação em LED na Rua da Aurora',
   'Troca de 42 luminárias por LED e reforço da iluminação junto à Ponte Duarte Coelho.',
   'iluminacao', 'aprovado', 'f18d0028-15e5-49f4-9502-aae82917731d',
   '[{"nome":"Projeto técnico","data_prevista":"2026-09-15","data_real":"2026-09-12"},{"nome":"Consulta pública","data_prevista":"2026-10-05","data_real":"2026-10-05"},{"nome":"Licitação","data_prevista":"2026-11-20","data_real":null},{"nome":"Instalação","data_prevista":"2027-01-30","data_real":null}]',
   '2026-10-05T23:59:59Z', '2026-09-01T10:00:00Z'),
  ('5ec1fe00-0000-4000-8000-000000000006', 'Requalificação da Rua do Bom Jesus',
   'Restauro das fachadas, calçamento em pedra e rua aberta a pedestres no Recife Antigo.',
   'pracas_lazer', 'concluido', null,
   '[{"nome":"Projeto técnico","data_prevista":"2025-03-01","data_real":"2025-03-10"},{"nome":"Consulta pública","data_prevista":"2025-05-01","data_real":"2025-05-01"},{"nome":"Obra","data_prevista":"2025-12-15","data_real":"2026-02-02"},{"nome":"Entrega","data_prevista":"2026-02-20","data_real":"2026-02-28"}]',
   '2025-05-01T23:59:59Z', '2025-02-01T10:00:00Z')
) as v(id, nome, descricao, categoria, status, origem, timeline, consulta_fim, criado)
on conflict (id) do update set
  orgao_id = excluded.orgao_id, nome = excluded.nome, descricao = excluded.descricao,
  categoria = excluded.categoria, status = excluded.status, origem_post_id = excluded.origem_post_id,
  timeline = excluded.timeline, consulta_fim = excluded.consulta_fim;

commit;

-- ─── Opcional: conta pessoal do Guilherme ────────────────────────────────────
-- Ela foi verificada como "Prefeitura do Recife (teste)". Para a apresentação,
-- o gestor é a conta gestor.demo. Se o Guilherme não precisar mais testar com a
-- dele, tire o selo (troque o e-mail):
-- update profiles set institucional_verificado = false, orgao_nome = null
-- where id = (select id from auth.users where email = 'EMAIL_DO_GUILHERME');

-- Conferência final
select nome, status, consulta_fim, (select email from auth.users where id = orgao_id) as dono
from projetos order by created_at;
