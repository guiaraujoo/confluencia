with u as (select id from auth.users where email = 'SEU_EMAIL')
insert into posts (user_id, categoria, bairro, descricao, latitude, longitude, created_at)
select u.id, v.categoria::categoria_post, v.bairro, v.descricao, v.lat, v.lng, v.criado
from u, (values
  ('iluminacao',   'Boa Viagem',  '[SEED] 01 poste apagado',        -8.1190, -34.9040, now()),
  ('iluminacao',   'Boa Viagem',  '[SEED] 02 rua escura',           -8.1200, -34.9030, now() - interval '5 days'),
  ('iluminacao',   'Boa Viagem',  '[SEED] 03 lampada queimada',     -8.1185, -34.9050, now() - interval '12 days'),
  ('iluminacao',   'Boa Viagem',  '[SEED] 04 post antigo',          -8.1195, -34.9045, now() - interval '45 days'),
  ('mobilidade',   'Casa Amarela','[SEED] 05 buraco na via',        -8.0252, -34.9185, now()),
  ('mobilidade',   'Casa Amarela','[SEED] 06 ponto sem cobertura',  -8.0260, -34.9190, now() - interval '10 days'),
  ('seguranca',    'Varzea',      '[SEED] 07 assaltos na esquina',  -8.0460, -34.9490, now()),
  ('saneamento',   'Derby',       '[SEED] 08 esgoto aberto',        -8.0560, -34.8995, now() - interval '3 days'),
  ('pracas_lazer', 'Madalena',    '[SEED] 09 praca abandonada',     -8.0535, -34.9030, now() - interval '20 days'),
  ('iluminacao',   'Casa Amarela','[SEED] 10 iluminacao outro bairro', -8.0245, -34.9180, now())
) as v(categoria, bairro, descricao, lat, lng, criado);

-- 1 apoio nos posts 01 e 05 (só há um usuário de teste, e o apoio é único por usuário)
insert into post_apoios (post_id, user_id)
select id, user_id from posts
where descricao in ('[SEED] 01 poste apagado', '[SEED] 05 buraco na via');