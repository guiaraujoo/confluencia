-- Confluência — 0013 (Semana 5): conta de órgão público não vota nas consultas.
-- Rode DEPOIS da 0012. Idempotente.
--
-- A consulta é da população: um órgão verificado (inclusive o dono do projeto)
-- acompanha o resultado ao vivo, mas não vota. Mesma função `votar` da 0007,
-- com uma verificação a mais logo depois do login.

create or replace function public.votar(p_projeto_id uuid, p_opcao text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_projeto projetos%rowtype;
  v_hash text;
begin
  if v_user is null then
    raise exception 'Entre com sua conta para votar.' using errcode = '28000';
  end if;

  -- Novo na 0013: conta de órgão público acompanha o resultado, mas não vota.
  if exists (select 1 from profiles where id = v_user and institucional_verificado) then
    raise exception 'Contas de órgão público acompanham o resultado, mas não votam.' using errcode = 'CF003';
  end if;

  if p_opcao is null or p_opcao not in ('favor', 'contra') then
    raise exception 'Opção de voto inválida.' using errcode = '22023';
  end if;

  select * into v_projeto from projetos where id = p_projeto_id;

  if not found or v_projeto.status <> 'em_consulta' then
    raise exception 'Este projeto não está em consulta pública.' using errcode = 'CF001';
  end if;

  if v_projeto.consulta_fim is not null and v_projeto.consulta_fim < now() then
    raise exception 'A consulta pública deste projeto já foi encerrada.' using errcode = 'CF002';
  end if;

  -- Hash gerado aqui, no banco: aleatório + dados do voto, sem guardar nada que
  -- permita ligar o comprovante à opção escolhida.
  v_hash := encode(
    digest(
      gen_random_uuid()::text || p_projeto_id::text || v_user::text || clock_timestamp()::text,
      'sha256'
    ),
    'hex'
  );

  -- Voto duplicado: a UNIQUE (projeto_id, user_id) da 0003 faz este insert falhar
  -- com 23505 (unique_violation). O app trata esse código como "você já votou".
  insert into votos (projeto_id, user_id, opcao, hash_comprovante)
  values (p_projeto_id, v_user, p_opcao, v_hash);

  return v_hash;
end;
$$;

revoke all on function public.votar(uuid, text) from public, anon;
grant execute on function public.votar(uuid, text) to authenticated;
