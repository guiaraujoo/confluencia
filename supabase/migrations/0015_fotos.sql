-- Confluência — Semana 5: fotos (perfil, capa e relato).
-- Um bucket público "fotos" no Supabase Storage. Cada pessoa só grava e apaga
-- dentro da própria pasta ("<id da conta>/arquivo.jpg"); qualquer um vê.
-- O app reduz a imagem para no máximo 1600px em JPEG antes de enviar.
-- Idempotente.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists capa_url text;

-- A pessoa troca as próprias fotos (o RLS de 0004 já limita à própria linha).
grant update (nome, apelido, bairro, bio, avatar_url, capa_url) on public.profiles to authenticated;

-- Só aceita fotos do nosso próprio bucket (nada de link para fora).
create or replace function public.url_de_foto_valida(url text)
returns boolean
language sql
immutable
as $$
  select url is null or url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/fotos/'
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_fotos_do_bucket') then
    alter table public.profiles add constraint profiles_fotos_do_bucket
      check (public.url_de_foto_valida(avatar_url) and public.url_de_foto_valida(capa_url)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'posts_foto_do_bucket') then
    alter table public.posts add constraint posts_foto_do_bucket
      check (public.url_de_foto_valida(foto_url)) not valid;
  end if;
end $$;

-- Storage: só existe no Supabase (o teste local em PGlite pula esta parte).
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'schema storage ausente: bucket não criado (ambiente de teste)';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update
    set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists "fotos: qualquer um ve" on storage.objects';
  execute 'create policy "fotos: qualquer um ve" on storage.objects for select using (bucket_id = ''fotos'')';

  execute 'drop policy if exists "fotos: envia na propria pasta" on storage.objects';
  execute 'create policy "fotos: envia na propria pasta" on storage.objects for insert to authenticated
           with check (bucket_id = ''fotos'' and (storage.foldername(name))[1] = auth.uid()::text)';

  execute 'drop policy if exists "fotos: apaga da propria pasta" on storage.objects';
  execute 'create policy "fotos: apaga da propria pasta" on storage.objects for delete to authenticated
           using (bucket_id = ''fotos'' and (storage.foldername(name))[1] = auth.uid()::text)';
end $$;
