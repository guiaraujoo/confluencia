-- Confluência — Tarefa 2.2, passo 3: registro fake em "projetos" e em "votos".
-- Rode no SQL Editor do Supabase DEPOIS das migrations 0001 → 0004.
-- Pré-requisito: existir pelo menos 1 usuário (crie um em Authentication → Users,
-- ou cadastre-se pelo app). O SQL Editor roda como "postgres" e ignora o RLS,
-- então isto testa a ESTRUTURA das tabelas, não as policies.

do $$
declare
  v_user uuid;
  v_projeto uuid;
begin
  select id into v_user from auth.users order by created_at limit 1;
  if v_user is null then
    raise exception 'Crie um usuario antes (Authentication > Users).';
  end if;

  insert into projetos (orgao_id, nome, descricao, categoria, status, timeline, consulta_fim)
  values (
    v_user,
    '[TESTE] Requalificação da Av. Norte',
    'Registro fake para validar a tabela projetos.',
    'mobilidade',
    'em_consulta',
    '[{"nome":"Licitação","data_prevista":"2026-11-01","data_real":null}]',
    now() + interval '30 days'
  )
  returning id into v_projeto;

  insert into votos (projeto_id, user_id, opcao, hash_comprovante)
  values (v_projeto, v_user, 'favor', 'hash-de-teste');

  raise notice 'OK: projeto % criado com 1 voto.', v_projeto;
end $$;

-- Conferência: deve mostrar 1 favor, 0 contra, total 1.
select * from votos_resultado;

-- Teste do bloqueio de voto duplicado: este insert DEVE falhar com
-- "duplicate key value violates unique constraint" (descomente para testar).
-- insert into votos (projeto_id, user_id, opcao, hash_comprovante)
-- select projeto_id, user_id, 'contra', 'hash-2' from votos limit 1;

-- Limpeza (rode quando terminar de testar; o voto some junto, on delete cascade):
-- delete from projetos where nome like '[TESTE]%';
