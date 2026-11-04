// Confluência — Tarefa 4.3 (Guilherme): tenta burlar o RLS pela API, como um usuário real faria.
// Usa só a chave pública (a mesma do app) e as contas demo. Nada aqui usa service role.
//
//   npm run test:rls              (lê VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do .env.local)
//   npm run test:rls -- --votar   (deixa a Marina votar de verdade para testar o voto duplicado)
//
// Sem --votar o teste de voto duplicado só roda se a Marina já tiver votado, para não
// gastar o voto que ela vai dar ao vivo na apresentação.
// Toda tentativa que passar e criar dado leva "[TESTE-RLS]" no texto, para achar e apagar.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.VITE_SUPABASE_ANON_KEY
const SENHA = 'confluencia2026'
const MARINA = 'cidada.demo@confluencia.app'
const GESTOR = 'gestor.demo@confluencia.app'
const VOTAR = process.argv.includes('--votar')

if (!URL || !KEY) {
  console.error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (rode com npm run test:rls).')
  process.exit(2)
}

const cliente = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

async function entrar(email) {
  const sb = cliente()
  const { data, error } = await sb.auth.signInWithPassword({ email, password: SENHA })
  if (error) throw new Error(`Login de ${email} falhou: ${error.message}`)
  return { sb, id: data.user.id }
}

const resultados = []
function registrar(nome, ok, detalhe) {
  resultados.push({ nome, ok })
  const marca = ok === null ? '–' : ok ? '✔' : '✘'
  console.log(`${marca} ${nome}${detalhe ? `  (${detalhe})` : ''}`)
}

// Tabela, função ou coluna que ainda não existe: a migration não foi aplicada, nada a testar.
const NAO_EXISTE = new Set(['PGRST202', 'PGRST205', '42703', '42P01', '42883'])

// Bloqueado = o banco devolveu erro ou não afetou nenhuma linha.
function bloqueou({ error, data }) {
  if (error && NAO_EXISTE.has(error.code)) return [null, `não existe no banco: ${error.message.slice(0, 70)}`]
  if (error) return [true, `${error.code ?? ''} ${error.message}`.trim()]
  if (Array.isArray(data) ? data.length === 0 : data == null) return [true, '0 linhas']
  return [false, `passou: ${JSON.stringify(data).slice(0, 120)}`]
}

async function tentar(nome, promessa) {
  const [ok, detalhe] = bloqueou(await promessa)
  registrar(nome, ok, detalhe)
}

const anon = cliente()
const marina = await entrar(MARINA)
const gestor = await entrar(GESTOR)
const UUID_FALSO = '00000000-0000-0000-0000-000000000000'

const { data: emConsulta } = await marina.sb.from('projetos').select('id, nome').eq('status', 'em_consulta').limit(1)
const projeto = emConsulta?.[0]
const { data: qualquer } = await marina.sb.from('projetos').select('id').limit(1)
const alvoId = projeto?.id ?? qualquer?.[0]?.id ?? UUID_FALSO

console.log(`\nComo Marina (${MARINA})\n`)

// 1. Votar duas vezes
if (!projeto) {
  registrar('Votar duas vezes', null, 'nenhum projeto em consulta; rode o seed_projetos.sql')
} else {
  let { data: comprovante } = await marina.sb.rpc('meu_comprovante', { p_projeto_id: projeto.id })
  if (!comprovante && VOTAR) {
    const r = await marina.sb.rpc('votar', { p_projeto_id: projeto.id, p_opcao: 'favor' })
    comprovante = r.data
    registrar('Primeiro voto aceito', !r.error, r.error?.message)
  }
  if (comprovante) {
    const r = await marina.sb.rpc('votar', { p_projeto_id: projeto.id, p_opcao: 'contra' })
    registrar('Votar duas vezes', r.error?.code === '23505', r.error ? `${r.error.code} ${r.error.message}` : 'passou!')
  } else {
    registrar('Votar duas vezes', null, 'Marina ainda não votou; use --votar para testar')
  }
}

// 2. Insert direto em votos
await tentar(
  'Inserir direto em votos',
  marina.sb.from('votos').insert({ projeto_id: alvoId, user_id: marina.id, opcao: 'favor', hash_comprovante: 'x' }).select(),
)

// 3. Ler votos linha a linha (opção de cada pessoa)
await tentar('Ler a tabela votos', marina.sb.from('votos').select('user_id, opcao').limit(5))

// 4. Votar pela função antiga (deve ter sido removida na 0010)
{
  const r = await marina.sb.rpc('registrar_voto', { p_projeto_id: alvoId, p_opcao: 'favor' })
  registrar('Votar pela registrar_voto (0006)', !!r.error, r.error ? `${r.error.code} ${r.error.message.slice(0, 80)}` : 'função ainda existe!')
}

// 5. Criar projeto sem ser institucional
await tentar(
  'Criar projeto',
  marina.sb
    .from('projetos')
    .insert({ orgao_id: marina.id, nome: '[TESTE-RLS] projeto da Marina', descricao: 'x', categoria: 'outros' })
    .select(),
)

// 6. Mudar orgao_id / status de projeto alheio
await tentar('Mudar orgao_id de um projeto', marina.sb.from('projetos').update({ orgao_id: marina.id }).eq('id', alvoId).select())
// Escreve o mesmo status: mesmo se passasse, não estragaria o projeto da demo.
await tentar(
  'Editar projeto alheio',
  marina.sb.from('projetos').update({ status: projeto ? 'em_consulta' : 'proposto' }).eq('id', alvoId).select(),
)

// 7. Descobrir o autor de um relato anônimo
await tentar('Ler posts.user_id direto', marina.sb.from('posts').select('id, user_id').limit(5))
{
  // Autor de um relato público (a view mostra): filtrar a tabela por ele deve ser negado.
  const { data: publico } = await marina.sb.from('posts_repercussao').select('user_id').not('user_id', 'is', null).limit(1)
  await tentar(
    'Filtrar posts por user_id',
    marina.sb.from('posts').select('id').eq('user_id', publico?.[0]?.user_id ?? gestor.id).limit(1),
  )
}
{
  const { data, error } = await marina.sb.from('posts_repercussao').select('user_id').eq('anonimo', true)
  if (error) registrar('Autor oculto na view posts_repercussao', null, error.message)
  else {
    const vazou = data.filter((p) => p.user_id && p.user_id !== marina.id)
    registrar('Autor oculto na view posts_repercussao', vazou.length === 0, `${data.length} relatos anônimos, ${vazou.length} com autor`)
  }
}

// 8. Publicar relato em nome de outra pessoa
await tentar(
  'Publicar relato como outra pessoa',
  marina.sb
    .from('posts')
    .insert({ user_id: gestor.id, categoria: 'outros', bairro: 'Teste', descricao: '[TESTE-RLS]', latitude: -8.05, longitude: -34.9 })
    .select('id'),
)

// 9. Autopromoção a institucional
await tentar(
  'Se autopromover a institucional',
  marina.sb.from('profiles').update({ institucional_verificado: true }).eq('id', marina.id).select(),
)
await tentar('Se dar nome de órgão', marina.sb.from('profiles').update({ orgao_nome: 'Prefeitura' }).eq('id', marina.id).select())
await tentar('Editar o perfil de outra pessoa', marina.sb.from('profiles').update({ nome: 'hackeado' }).eq('id', gestor.id).select())

// 10. Resposta oficial sem ser órgão
{
  const { data: post } = await marina.sb.from('posts_repercussao').select('id').limit(1)
  await tentar(
    'Publicar resposta oficial',
    marina.sb
      .from('respostas_oficiais')
      .insert({ post_id: post?.[0]?.id ?? UUID_FALSO, orgao_id: marina.id, status: 'resolvido', texto: '[TESTE-RLS]' })
      .select(),
  )
}

// 11. Notificar outra pessoa / ler notificações alheias
await tentar(
  'Criar notificação para outra pessoa',
  marina.sb.from('notificacoes').insert({ user_id: gestor.id, tipo: 'comentario', titulo: '[TESTE-RLS]' }).select(),
)
await tentar('Ler notificações alheias', marina.sb.from('notificacoes').select('id').eq('user_id', gestor.id))

// 12. Comentar como outra pessoa
{
  const { data: post } = await marina.sb.from('posts_repercussao').select('id').limit(1)
  await tentar(
    'Comentar como outra pessoa',
    marina.sb.from('comentarios').insert({ post_id: post?.[0]?.id ?? UUID_FALSO, user_id: gestor.id, texto: '[TESTE-RLS]' }).select(),
  )
}

// 13. comprovantes_publicos não pode citar projeto que a Marina não enxerga (rejeitado)
{
  const [{ data: comp, error }, { data: visiveis }] = await Promise.all([
    marina.sb.from('comprovantes_publicos').select('projeto_id'),
    marina.sb.from('projetos').select('id'),
  ])
  if (error) registrar('Comprovantes sem projetos rejeitados', null, error.message)
  else {
    const ids = new Set(visiveis.map((p) => p.id))
    const vazou = comp.filter((c) => !ids.has(c.projeto_id))
    registrar('Comprovantes sem projetos rejeitados', vazou.length === 0, `${comp.length} hashes, ${vazou.length} de projeto invisível`)
  }
}

console.log('\nSem login\n')
{
  // O botão "Criar conta" está desativado na tela, mas quem fecha de verdade é o Auth.
  // Aberto, qualquer um cria contas pela API e vota uma vez com cada uma.
  const r = await fetch(`${URL}/auth/v1/settings`, { headers: { apikey: KEY } })
  const { disable_signup } = await r.json()
  registrar('Cadastro fechado no Auth', disable_signup === true, disable_signup ? '' : 'Authentication → Sign In / Providers → Allow new users to sign up')
}
{
  const [ok, detalhe] = bloqueou(await anon.rpc('votar', { p_projeto_id: alvoId, p_opcao: 'favor' }))
  registrar('Votar sem login', ok, detalhe)
}
await tentar('Seguir bairro sem login', anon.from('bairros_seguidos').insert({ user_id: marina.id, bairro: 'Teste' }).select())

console.log(`\nComo Secretaria (${GESTOR})\n`)
{
  const { data: meus } = await gestor.sb.from('projetos').select('id').eq('orgao_id', gestor.id).limit(1)
  if (!meus?.length) registrar('Transferir o próprio projeto', null, 'gestor demo sem projetos; rode o seed_projetos.sql')
  else
    await tentar(
      'Transferir o próprio projeto (orgao_id)',
      gestor.sb.from('projetos').update({ orgao_id: marina.id }).eq('id', meus[0].id).select(),
    )
}
await tentar('Ler a tabela votos', gestor.sb.from('votos').select('user_id, opcao').limit(5))
await tentar('Ler posts.user_id direto', gestor.sb.from('posts').select('user_id').limit(1))

const falhas = resultados.filter((r) => r.ok === false)
const pulados = resultados.filter((r) => r.ok === null)
console.log(
  `\n${resultados.length - falhas.length - pulados.length} bloqueados, ${falhas.length} furos, ${pulados.length} não testados`,
)
process.exit(falhas.length ? 1 : 0)
