-- Confluência — Semana 5: os 94 bairros oficiais do Recife
-- Mesma lista de src/lib/bairros.ts. O banco guarda o nome sempre igual
-- ("varzea", "VÁRZEA" e "Várzea" viram "Várzea") e recusa bairro que não é
-- da cidade, para o filtro do Feed e a foto do bairro funcionarem.
-- Idempotente.

create table if not exists public.bairros_recife (
  nome text primary key,
  rpa smallint not null check (rpa between 1 and 6)
);

alter table public.bairros_recife enable row level security;
drop policy if exists "bairros: leitura publica" on public.bairros_recife;
create policy "bairros: leitura publica" on public.bairros_recife for select using (true);

insert into public.bairros_recife (nome, rpa) values
  ('Boa Vista', 1),
  ('Cabanga', 1),
  ('Coelhos', 1),
  ('Ilha do Leite', 1),
  ('Ilha Joana Bezerra', 1),
  ('Paissandu', 1),
  ('Recife', 1),
  ('Santo Amaro', 1),
  ('Santo Antônio', 1),
  ('São José', 1),
  ('Soledade', 1),
  ('Água Fria', 2),
  ('Alto Santa Terezinha', 2),
  ('Arruda', 2),
  ('Beberibe', 2),
  ('Bomba do Hemetério', 2),
  ('Cajueiro', 2),
  ('Campina do Barreto', 2),
  ('Campo Grande', 2),
  ('Dois Unidos', 2),
  ('Encruzilhada', 2),
  ('Fundão', 2),
  ('Hipódromo', 2),
  ('Linha do Tiro', 2),
  ('Peixinhos', 2),
  ('Ponto de Parada', 2),
  ('Porto da Madeira', 2),
  ('Rosarinho', 2),
  ('Torreão', 2),
  ('Aflitos', 3),
  ('Alto do Mandu', 3),
  ('Alto José Bonifácio', 3),
  ('Alto José do Pinho', 3),
  ('Apipucos', 3),
  ('Brejo da Guabiraba', 3),
  ('Brejo de Beberibe', 3),
  ('Casa Amarela', 3),
  ('Casa Forte', 3),
  ('Córrego do Jenipapo', 3),
  ('Derby', 3),
  ('Dois Irmãos', 3),
  ('Espinheiro', 3),
  ('Graças', 3),
  ('Guabiraba', 3),
  ('Jaqueira', 3),
  ('Macaxeira', 3),
  ('Mangabeira', 3),
  ('Monteiro', 3),
  ('Morro da Conceição', 3),
  ('Nova Descoberta', 3),
  ('Parnamirim', 3),
  ('Passarinho', 3),
  ('Pau-Ferro', 3),
  ('Poço da Panela', 3),
  ('Santana', 3),
  ('Sítio dos Pintos', 3),
  ('Tamarineira', 3),
  ('Vasco da Gama', 3),
  ('Caxangá', 4),
  ('Cidade Universitária', 4),
  ('Cordeiro', 4),
  ('Engenho do Meio', 4),
  ('Ilha do Retiro', 4),
  ('Iputinga', 4),
  ('Madalena', 4),
  ('Prado', 4),
  ('Torre', 4),
  ('Torrões', 4),
  ('Várzea', 4),
  ('Zumbi', 4),
  ('Afogados', 5),
  ('Areias', 5),
  ('Barro', 5),
  ('Bongi', 5),
  ('Caçote', 5),
  ('Coqueiral', 5),
  ('Curado', 5),
  ('Estância', 5),
  ('Jardim São Paulo', 5),
  ('Jiquiá', 5),
  ('Mangueira', 5),
  ('Mustardinha', 5),
  ('San Martin', 5),
  ('Sancho', 5),
  ('Tejipió', 5),
  ('Totó', 5),
  ('Boa Viagem', 6),
  ('Brasília Teimosa', 6),
  ('Cohab', 6),
  ('Ibura', 6),
  ('Imbiribeira', 6),
  ('Ipsep', 6),
  ('Jordão', 6),
  ('Pina', 6)
on conflict (nome) do update set rpa = excluded.rpa;

-- Chave sem acento, sem caixa e sem pontuação ("Pau-Ferro" = "pau ferro").
create or replace function public.chave_bairro(texto text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(lower(translate(texto,
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')), '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace function public.bairro_oficial(texto text)
returns text
language sql
stable
set search_path = ''
as $$
  select b.nome from public.bairros_recife b
  where public.chave_bairro(b.nome) = public.chave_bairro(texto)
  limit 1
$$;

-- Relato: bairro obrigatório e da lista.
create or replace function public.posts_bairro_oficial()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  oficial text := public.bairro_oficial(new.bairro);
begin
  if oficial is null then
    raise exception 'Escolha um dos bairros da cidade do Recife.' using errcode = 'CF011';
  end if;
  new.bairro := oficial;
  return new;
end;
$$;

drop trigger if exists posts_bairro_oficial on public.posts;
create trigger posts_bairro_oficial
  before insert or update of bairro on public.posts
  for each row execute function public.posts_bairro_oficial();

-- Perfil: bairro é opcional; se vier, tem de ser da lista.
create or replace function public.profiles_bairro_oficial()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.bairro is null or trim(new.bairro) = '' then
    new.bairro := null;
    return new;
  end if;
  new.bairro := public.bairro_oficial(new.bairro);
  if new.bairro is null then
    raise exception 'Escolha um dos bairros da cidade do Recife.' using errcode = 'CF011';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_bairro_oficial on public.profiles;
create trigger profiles_bairro_oficial
  before insert or update of bairro on public.profiles
  for each row execute function public.profiles_bairro_oficial();
