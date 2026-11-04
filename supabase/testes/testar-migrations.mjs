// Testa as migrations 0001 → 0011 num Postgres de verdade, em memória (PGlite),
// sem tocar no Supabase. Tarefa 4.2 da Ana (revisão do banco com o Guilherme).
//
// Como rodar (fora do projeto, para não adicionar dependência ao app):
//   mkdir /tmp/pgtest && cd /tmp/pgtest && npm init -y && npm i @electric-sql/pglite@0.4.0
//   cp <repo>/supabase/testes/testar-migrations.mjs . 
//   node testar-migrations.mjs <repo>/supabase/migrations 11   # com a 0010 e a 0011
//   node testar-migrations.mjs <repo>/supabase/migrations 9    # sem a 0010 e a 0011 (mostra os 2 bugs)
//
// Simula o mínimo do Supabase: schema auth, auth.uid() lendo o usuário da sessão,
// papéis anon/authenticated com as permissões padrão. Cada ✓/✗ é um cenário.
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'node:fs'
const dir = process.argv[2]
const ate = Number(process.argv[3] ?? 11)
const db = new PGlite({ extensions: { pgcrypto } })
const shim = `
create role anon nologin; create role authenticated nologin;
create schema auth; create schema extensions;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth, extensions to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
`
await db.exec(shim)
const migs = fs.readdirSync(dir).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort().filter(f => Number(f.slice(0,4)) <= ate)
for (const f of migs) {
  try { await db.exec(fs.readFileSync(`${dir}/${f}`, 'utf8')); console.log('aplicada', f) }
  catch (e) { console.log('FALHOU', f, e.message); process.exit(1) }
}
for (const f of migs.filter((f) => Number(f.slice(0, 4)) >= 10)) { await db.exec(fs.readFileSync(`${dir}/${f}`, 'utf8')); console.log(f, 'reaplicada (idempotente) ok') }

const ORG='11111111-1111-1111-1111-111111111111', CID='22222222-2222-2222-2222-222222222222', OUT='33333333-3333-3333-3333-333333333333'
await db.exec(`
insert into auth.users (id,email) values ('${ORG}','org@x'),('${CID}','cid@x'),('${OUT}','out@x');
update profiles set institucional_verificado = true, orgao_nome = 'Prefeitura' where id = '${ORG}';
`)
const como = async (uid, sql, params) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`)
  try { return await db.query(sql, params) } finally { await db.exec(`reset role;`) }
}
const ok = (c, m) => console.log(c ? '  ✓' : '  ✗ FALHA:', m)

// relato da cidadã + projeto do órgão com origem
const post = (await como(CID, `insert into posts (user_id,categoria,bairro,descricao,latitude,longitude) values ($1,'iluminacao','Boa Vista','Poste apagado',-8,-34) returning id`, [CID])).rows[0].id
const proj = (await como(ORG, `insert into projetos (orgao_id,nome,descricao,categoria,status,origem_post_id,consulta_fim) values ($1,'LED','Troca','iluminacao','em_consulta',$2, now()+interval '5 days') returning id`, [ORG, post])).rows[0].id
console.log('cenário: relato', post.slice(0,8), 'projeto', proj.slice(0,8))

// 4.1: resposta "virou_projeto" pelo órgão (o que o formulário faz) + notificação
if (ate >= 8) {
  await como(ORG, `insert into respostas_oficiais (post_id, orgao_id, status, projeto_id, texto) values ($1,$2,'virou_projeto',$3,'Virou projeto')`, [post, ORG, proj])
  const n = await como(CID, `select titulo, link from notificacoes`)
  ok(n.rows.length === 1, `autora notificada: ${JSON.stringify(n.rows[0])}`)
  const r = await como(CID, `insert into respostas_oficiais (post_id, orgao_id, status, texto) values ($1,$2,'virou_projeto','x')`, [post, CID]).then(()=>'passou', ()=>'bloqueado')
  ok(r === 'bloqueado', 'cidadã não consegue publicar "virou projeto"')
}
// caminho oposto: público (anon) acha o projeto pelo relato
await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`)
const doRelato = await db.query(`select id, nome, status from projetos where origem_post_id = $1 and status <> 'rejeitado'`, [post])
ok(doRelato.rows.length === 1, 'visitante vê o projeto que nasceu do relato')
const lista = await db.query(`select id, categoria, bairro, descricao, created_at from posts order by created_at desc limit 300`).then(()=>'ok', e=>e.message)
ok(lista === 'ok', `visitante lê as colunas que o seletor usa (${lista})`)
const resumo = await db.query(`select id, categoria, bairro, descricao, created_at, interacoes, status_oficial from posts_repercussao where id = $1`, [post]).then(r=>r.rows[0], e=>e.message)
ok(resumo && resumo.status_oficial === (ate>=8?'virou_projeto':undefined), `resumo do relato pela view: ${JSON.stringify(resumo)}`)
await db.exec('reset role')

// votos e comprovante
const hash = (await como(CID, `select votar($1,'favor') as h`, [proj])).rows[0].h
const v16 = await db.query(`select * from verificar_comprovante($1)`, [hash.slice(0,16).toUpperCase()])
ok(v16.rows.length === 1, 'verificar com 16 caracteres (maiúsculas, como a tela mostra)')
const v64 = await db.query(`select * from verificar_comprovante($1)`, [hash])
ok(v64.rows.length === 1, 'verificar com o hash completo')
const vErr = await db.query(`select * from verificar_comprovante($1)`, [hash.slice(0,16) + 'ff'])
ok(vErr.rows.length === 0, 'hash com fim errado não confirma')
const vPct = await db.query(`select * from verificar_comprovante('%%%%%%%%%%%%%%%%')`)
ok(vPct.rows.length === 0, 'curinga % não confirma')

// comprovantes públicos de projeto rejeitado
await como(ORG, `update projetos set status = 'rejeitado' where id = $1`, [proj])
const pub = await como(OUT, `select count(*)::int n from comprovantes_publicos where projeto_id = $1`, [proj])
ok(pub.rows[0].n === 0, `comprovantes_publicos esconde projeto rejeitado de terceiros (viu ${pub.rows[0].n})`)
const dono = await como(ORG, `select count(*)::int n from comprovantes_publicos where projeto_id = $1`, [proj])
ok(dono.rows[0].n === 1, 'órgão dono ainda vê')
await como(ORG, `update projetos set status = 'em_consulta' where id = $1`, [proj]).catch(()=>{})

// 4.2: a autora apaga o relato que virou projeto
const del = await como(CID, `delete from posts where id = $1`, [post]).then(()=> 'apagou', e => 'ERRO: ' + e.message)
ok(del === 'apagou', `autora apaga o relato (${del})`)
const sobra = await db.query(`select origem_post_id from projetos where id = $1`, [proj])
ok(sobra.rows.length === 1 && sobra.rows[0].origem_post_id === null, `projeto continua, origem vira null (${JSON.stringify(sobra.rows[0])})`)

// índices
if (ate >= 10) {
  await db.exec(`set enable_seqscan = off`)
  const plano = async (sql, p) => (await db.query('explain ' + sql, p)).rows.map(r => r['QUERY PLAN']).join(' | ')
  console.log('  plano origem:', await plano(`select id from projetos where origem_post_id = '${post}'`))
  console.log('  plano painel:', await plano(`select * from projetos where orgao_id = '${ORG}' order by created_at desc`))
  console.log('  plano comprovante:', await plano(`select * from votos v where left(v.hash_comprovante,16) = 'abcdefabcdefabcd' and v.hash_comprovante like 'abcdefabcdefabcd%'`))
}
