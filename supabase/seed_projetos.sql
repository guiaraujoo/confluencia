-- SEED DE TESTE de projetos (Tarefa 3.3; refeito na 4.1 para as contas demo)
-- Dono: gestor.demo@confluencia.app (rode antes o seed-social-demo.sql, que o
-- torna institucional verificado). Para outro órgão, troque o e-mail nas duas linhas.
-- Idempotente: pode rodar de novo. Limpar: delete from projetos where nome like '[SEED]%';

-- 1. Projetos [SEED] criados antes por outra conta passam para o gestor demo,
--    para aparecerem no painel dele (em vez de duplicar os nomes).
update projetos
set orgao_id = (select id from auth.users where email = 'gestor.demo@confluencia.app')
where nome like '[SEED]%'
  and exists (select 1 from auth.users where email = 'gestor.demo@confluencia.app');

-- 2. Cria só os que ainda não existem.
with u as (select id from auth.users where email = 'gestor.demo@confluencia.app')
insert into projetos (orgao_id, nome, descricao, categoria, status, timeline, consulta_fim)
select u.id, v.nome, v.descricao, v.categoria::categoria_post, v.status::status_projeto,
       v.timeline::jsonb, v.consulta_fim
from u, (values
  ('[SEED] Reforma da iluminação da Av. Boa Viagem',
   'Troca de 120 luminárias por LED em toda a orla.',
   'iluminacao', 'em_consulta',
   '[{"nome":"Consulta pública","data_prevista":"2026-12-20","data_real":null},{"nome":"Licitação","data_prevista":"2027-01-31","data_real":null}]',
   timestamptz '2026-12-20 23:59:00-03'),
  ('[SEED] Ciclovia em Casa Amarela',
   'Nova ciclovia ligando a Estrada do Arraial ao Parque da Jaqueira.',
   'mobilidade', 'proposto',
   '[]',
   null),
  ('[SEED] Revitalização da Praça de Madalena',
   'Reforma de calçadas, bancos e playground.',
   'pracas_lazer', 'em_execucao',
   '[{"nome":"Licitação","data_prevista":"2026-08-10","data_real":"2026-08-12"},{"nome":"Obras","data_prevista":"2026-12-01","data_real":null}]',
   now() - interval '40 days')
) as v(nome, descricao, categoria, status, timeline, consulta_fim)
where not exists (select 1 from projetos p where p.nome = v.nome);

-- 3. A demo precisa de um projeto aberto para votar na apresentação (dezembro).
--    Reabre a Av. Boa Viagem se algum teste já a tiver tirado de consulta.
update projetos
set status = 'em_consulta',
    consulta_fim = timestamptz '2026-12-20 23:59:00-03',
    timeline = '[{"nome":"Consulta pública","data_prevista":"2026-12-20","data_real":null},{"nome":"Licitação","data_prevista":"2027-01-31","data_real":null}]'
where nome = '[SEED] Reforma da iluminação da Av. Boa Viagem';

-- Conferência
select nome, status, consulta_fim, (select email from auth.users where id = orgao_id) as dono
from projetos where nome like '[SEED]%' order by nome;
