-- Confluência — Tarefa 2.3 (Guilherme): lógica de repercussão
-- repercussao = posts similares (mesma categoria + bairro, últimos 30 dias) + apoios

create table if not exists post_apoios (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table post_apoios enable row level security;

create policy "apoios: leitura publica"
  on post_apoios for select using (true);

create policy "apoios: apoiar exige login"
  on post_apoios for insert with check (auth.uid() = user_id);

create policy "apoios: remover o proprio"
  on post_apoios for delete using (auth.uid() = user_id);

create or replace view posts_repercussao
with (security_invoker = true) as
select
  p.id, p.user_id, p.categoria, p.bairro, p.descricao, p.foto_url,
  p.latitude, p.longitude, p.created_at,
  r.recorrencia,
  i.interacoes,
  (r.recorrencia + i.interacoes) as repercussao
from posts p
cross join lateral (
  select count(*)::int as recorrencia
  from posts s
  where s.categoria = p.categoria
    and s.bairro = p.bairro
    and s.id <> p.id
    and s.created_at >= now() - interval '30 days'
) r
cross join lateral (
  select count(*)::int as interacoes
  from post_apoios a
  where a.post_id = p.id
) i;

grant select on posts_repercussao to anon, authenticated;