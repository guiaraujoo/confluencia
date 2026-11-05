import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import Topografia from '../../../components/Topografia'
import Contador from '../../../components/Contador'
import {
  CATEGORIAS,
  STATUS_LABELS,
  STATUS_RESPOSTA_LABELS,
  type PerfilPublico,
  type PostRepercussao,
  type RespostaOficial,
} from '../../../types/database'
import { formatRelativo } from '../../../lib/repercussao'
import { buscarPerfis, corAvatar, invalidarPerfil, nomePublico } from '../perfis'
import { useBairrosSeguidos } from '../useBairrosSeguidos'
import { Avatar, SeloOrgao } from '../components/Autor'
import IconeCategoria from '../components/IconeCategoria'
import { CATEGORIA_RGB, rgb } from '../cores'
import { useProjetosSalvos } from '../../projetos/useProjetosSalvos'
import { useProjetosPublicos } from '../../projetos/vitrine'
import { fotoDoProjeto } from '../../projetos/fotos'
import CampoBairro from '../../../components/CampoBairro'
import { bairroOficial } from '../../../lib/bairros'
import CampoFoto from '../../../components/CampoFoto'
import { enviarFoto } from '../../../lib/fotos'
import { ETAPAS_PUBLICAS, indiceEtapa, proximoMarco } from '../../projetos/etapas'

const APELIDO_VALIDO = /^[a-z0-9_.]{3,20}$/

type Aba = 'relatos' | 'respostas' | 'acompanhando' | 'bairros' | 'conta'

const PERMISSOES: { acao: string; cidadao: boolean; gestor: boolean }[] = [
  { acao: 'Relatar problemas (com seu apelido ou anônimo)', cidadao: true, gestor: true },
  { acao: 'Apoiar e comentar relatos de vizinhos', cidadao: true, gestor: true },
  { acao: 'Votar em consultas públicas (voto secreto)', cidadao: true, gestor: true },
  { acao: 'Responder relatos oficialmente', cidadao: false, gestor: true },
  { acao: 'Publicar projetos e ver o painel do órgão', cidadao: false, gestor: true },
]

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

// Perfil — uma página só. Para quem visita: quem é a pessoa no Feed (por
// apelido, nunca o nome completo em destaque) e o que ela já relatou. Para o
// dono: a mesma vitrine e, nas abas, o que só ele vê (projetos acompanhados,
// bairros seguidos, a conta).
export default function PerfilPublicoPage() {
  const { id } = useParams()
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const [perfil, setPerfil] = useState<PerfilPublico | null | undefined>(undefined)
  const [relatos, setRelatos] = useState<PostRepercussao[]>([])
  const [respostas, setRespostas] = useState<RespostaOficial[]>([])
  const [editando, setEditando] = useState(false)
  const [versao, setVersao] = useState(0)
  const [ola] = useState(saudacao)
  const { salvos } = useProjetosSalvos()
  const todosProjetos = useProjetosPublicos()
  const meu = Boolean(user && user.id === id)

  useEffect(() => {
    if (!id) return
    let cancelado = false
    ;(async () => {
      const mapa = await buscarPerfis([id])
      // O próprio perfil ainda sem linha em `profiles` cai nos dados da sessão.
      const p =
        mapa.get(id) ??
        (user?.id === id
          ? {
              id,
              nome: profile?.nome ?? '',
              apelido: profile?.apelido ?? null,
              bairro: profile?.bairro ?? null,
              bio: profile?.bio ?? null,
              institucional_verificado: Boolean(profile?.institucional_verificado),
              orgao_nome: profile?.orgao_nome ?? null,
              avatar_url: profile?.avatar_url ?? null,
              capa_url: profile?.capa_url ?? null,
            }
          : null)
      const [{ data: posts }, { data: resps }] = await Promise.all([
        supabase.from('posts_repercussao').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        p?.institucional_verificado
          ? supabase.from('respostas_oficiais').select('*').eq('orgao_id', id).order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] }),
      ])
      if (cancelado) return
      setPerfil(p)
      setRelatos((posts ?? []) as PostRepercussao[])
      setRespostas((resps ?? []) as RespostaOficial[])
    })()
    return () => {
      cancelado = true
    }
  }, [id, versao, user?.id, profile])

  if (perfil === undefined) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-amarelo-300 border-t-amarelo-700" />
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p className="font-heading text-3xl font-extrabold text-grafite-900">Perfil não encontrado</p>
        <Link to="/feed" className="mt-6 inline-flex rounded-full bg-amarelo-500 px-5 py-2.5 text-sm font-bold text-grafite-900">
          Voltar ao Feed
        </Link>
      </div>
    )
  }

  const orgao = perfil.institucional_verificado
  const apoios = relatos.reduce((s, r) => s + r.interacoes, 0)
  const comentarios = relatos.reduce((s, r) => s + (r.comentarios ?? 0), 0)
  const mudaram = relatos.filter((r) => r.status_oficial === 'virou_projeto' || r.status_oficial === 'resolvido').length
  const acompanhados = todosProjetos.filter((p) => salvos.includes(p.id))
  const selos = [
    orgao && { texto: 'Órgão verificado', cor: 'bg-status-azul-50 text-status-azul-700' },
    relatos.length >= 3 && { texto: 'Vizinho ativo', cor: 'bg-amarelo-100 text-amarelo-900' },
    mudaram > 0 && { texto: 'Relato que mudou a cidade', cor: 'bg-status-verde-50 text-status-verde-700' },
    apoios >= 5 && { texto: 'Voz apoiada', cor: 'bg-categoria-rosa-50 text-categoria-rosa-700' },
  ].filter(Boolean) as { texto: string; cor: string }[]

  const numeros = orgao
    ? [
        { valor: respostas.length, rotulo: 'respostas a relatos' },
        { valor: respostas.filter((r) => r.status === 'virou_projeto').length, rotulo: 'viraram projeto' },
        { valor: respostas.filter((r) => r.status === 'resolvido').length, rotulo: 'resolvidos' },
      ]
    : [
        { valor: relatos.length, rotulo: relatos.length === 1 ? 'relato' : 'relatos' },
        { valor: apoios, rotulo: 'apoios recebidos' },
        { valor: comentarios, rotulo: 'comentários' },
      ]
  if (meu) numeros.push({ valor: acompanhados.length, rotulo: 'projetos acompanhando' })

  const abas: { id: Aba; rotulo: string; qtd?: number }[] = [
    ...(orgao ? [{ id: 'respostas' as Aba, rotulo: 'Respostas', qtd: respostas.length }] : []),
    ...(!orgao || (meu && relatos.length > 0) ? [{ id: 'relatos' as Aba, rotulo: 'Relatos', qtd: relatos.length }] : []),
    ...(meu
      ? [
          { id: 'acompanhando' as Aba, rotulo: 'Acompanhando', qtd: acompanhados.length },
          { id: 'bairros' as Aba, rotulo: 'Bairros' },
          { id: 'conta' as Aba, rotulo: 'Conta' },
        ]
      : []),
  ]
  const pedida = parametros.get('aba') as Aba | null
  const aba = abas.some((a) => a.id === pedida) ? (pedida as Aba) : abas[0].id
  const trocarAba = (nova: Aba) => setParametros(nova === abas[0].id ? {} : { aba: nova }, { replace: true })

  async function sair() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="pb-24">
      {/* Capa ------------------------------------------------------------- */}
      <section className="relative h-48 overflow-hidden sm:h-60" style={{ background: corAvatar(perfil.id) }}>
        {perfil.capa_url ? (
          <img src={perfil.capa_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Topografia semente={perfil.id.charCodeAt(0) / 7} className="absolute inset-0 h-full w-full text-white/25" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        {meu && (
          <p className="absolute left-0 right-0 top-6 mx-auto max-w-5xl px-5 font-serif text-2xl italic text-white/90 sm:px-8 sm:text-3xl">
            {ola}.
          </p>
        )}
      </section>

      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="relative z-10 -mt-16 flex flex-wrap items-end justify-between gap-4">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className="rounded-full bg-grafite-50 p-1.5"
          >
            <Avatar perfil={perfil} size={120} />
          </motion.div>
          {meu && (
            <div className="mb-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEditando(true)}
                className="rounded-full bg-amarelo-500 px-5 py-2.5 text-sm font-bold text-grafite-900 shadow-[0_10px_22px_-12px_rgba(245,184,0,0.9)] transition-transform hover:-translate-y-0.5"
              >
                Editar perfil
              </button>
              <button
                type="button"
                onClick={sair}
                className="rounded-full border-2 border-grafite-200 bg-white px-5 py-2.5 text-sm font-bold text-grafite-900 transition-colors hover:border-status-vermelho-500 hover:text-status-vermelho-700"
              >
                Sair
              </button>
            </div>
          )}
        </div>

        <h1 className="mt-4 flex flex-wrap items-center gap-3 font-heading text-4xl font-extrabold text-grafite-900 sm:text-5xl">
          {nomePublico(perfil)}
          {orgao && <SeloOrgao />}
        </h1>
        <p className="mt-1 text-sm text-grafite-500">
          {perfil.bairro ? `${perfil.bairro} · ` : ''}
          {perfil.created_at
            ? `no Confluência desde ${new Date(perfil.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
            : ''}
          {meu && user?.email ? `${perfil.bairro || perfil.created_at ? ' · ' : ''}${user.email} (só você vê)` : ''}
        </p>
        {perfil.bio && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-grafite-800">{perfil.bio}</p>}
        {meu && !perfil.apelido && (
          <p className="mt-4 max-w-xl rounded-2xl bg-amarelo-50 px-4 py-3 text-sm text-amarelo-900">
            Você ainda não escolheu um apelido — no Feed aparece só seu primeiro nome. Toque em "Editar perfil".
          </p>
        )}

        {selos.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {selos.map((s, i) => (
              <motion.span
                key={s.texto}
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 400, damping: 18 }}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${s.cor}`}
              >
                ★ {s.texto}
              </motion.span>
            ))}
          </div>
        )}

        <dl className={`mt-8 grid grid-cols-2 gap-x-6 gap-y-6 ${numeros.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {numeros.map((n) => (
            <div key={n.rotulo} className="border-t-2 border-grafite-900 pt-3">
              <dd className="font-heading text-5xl font-extrabold leading-none text-grafite-900">
                <Contador valor={n.valor} />
              </dd>
              <dt className="mt-1 text-sm text-grafite-500">{n.rotulo}</dt>
            </div>
          ))}
        </dl>
      </div>

      {/* Abas --------------------------------------------------------------- */}
      <AbasEditoriais abas={abas} ativa={aba} onTrocar={trocarAba} />

      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.section
            key={aba}
            role="tabpanel"
            id={`painel-${aba}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="mt-8"
          >
            {aba === 'relatos' && <ListaRelatos relatos={relatos} meu={meu} />}
            {aba === 'respostas' && <ListaRespostas respostas={respostas} />}
            {aba === 'acompanhando' && <ListaAcompanhando />}
            {aba === 'bairros' && <PainelBairros />}
            {aba === 'conta' && <PainelConta gestor={orgao} />}
          </motion.section>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {editando && meu && (
          <EditarPerfil
            perfil={perfil}
            onFechar={() => setEditando(false)}
            onSalvo={() => {
              invalidarPerfil(perfil.id)
              setEditando(false)
              setVersao((v) => v + 1)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Abas grandes, como títulos de seção de revista: a ativa ganha um traço de
// marca-texto amarelo que desliza entre elas; a contagem vem em serifa itálica.
// Ficam presas logo abaixo da barra do topo enquanto a lista rola.
function AbasEditoriais({
  abas,
  ativa,
  onTrocar,
}: {
  abas: { id: Aba; rotulo: string; qtd?: number }[]
  ativa: Aba
  onTrocar: (a: Aba) => void
}) {
  return (
    <div className="sticky top-[57px] z-30 mt-12 border-y border-grafite-200 bg-grafite-50">
      <div
        role="tablist"
        aria-label="Seções do perfil"
        className="mx-auto flex max-w-5xl gap-7 overflow-x-auto px-5 [scrollbar-width:none] sm:gap-10 sm:px-8"
      >
        {abas.map((a) => {
          const sel = a.id === ativa
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={sel}
              aria-controls={`painel-${a.id}`}
              onClick={() => onTrocar(a.id)}
              className={`group relative flex-shrink-0 py-4 font-heading text-2xl font-extrabold tracking-tight transition-colors sm:text-3xl ${
                sel ? 'text-grafite-900' : 'text-grafite-300 hover:text-grafite-500'
              }`}
            >
              {sel && (
                <motion.span
                  layoutId="aba-perfil-marca"
                  aria-hidden
                  className="absolute inset-x-[-6px] bottom-[18px] h-[0.45em] -skew-x-6 rounded-sm bg-amarelo-500 sm:bottom-[20px]"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">
                {a.rotulo}
                {a.qtd !== undefined && (
                  <sup
                    className={`ml-1 font-serif text-base font-normal italic sm:text-lg ${sel ? 'text-amarelo-700' : 'text-grafite-300'}`}
                  >
                    {a.qtd}
                  </sup>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Vazio({ titulo, texto, acao }: { titulo: string; texto: string; acao?: { to: string; rotulo: string } }) {
  return (
    <div className="relative overflow-hidden rounded-[32px] bg-white px-6 py-14 text-center">
      <Topografia semente={5.1} className="absolute inset-0 h-full w-full text-amarelo-500/15" />
      <div className="relative">
        <p className="font-heading text-3xl font-extrabold text-grafite-900">{titulo}</p>
        <p className="mx-auto mt-2 max-w-sm text-grafite-500">{texto}</p>
        {acao && (
          <Link to={acao.to} className="mt-6 inline-flex rounded-full bg-amarelo-500 px-6 py-3 text-sm font-bold text-grafite-900">
            {acao.rotulo}
          </Link>
        )}
      </div>
    </div>
  )
}

// Relatos agrupados por mês, como um diário da rua: o mês em serifa grande à
// esquerda, os relatos daquele mês à direita.
function ListaRelatos({ relatos, meu }: { relatos: PostRepercussao[]; meu: boolean }) {
  if (relatos.length === 0) {
    return meu ? (
      <Vazio
        titulo="Sua rua ainda não tem voz aqui"
        texto="Viu algo errado no caminho? Relatar leva menos de um minuto."
        acao={{ to: '/feed/novo', rotulo: '+ Relatar problema' }}
      />
    ) : (
      <Vazio titulo="Nenhum relato público ainda" texto="Quando esta pessoa relatar algo, aparece aqui." />
    )
  }

  const grupos = new Map<string, PostRepercussao[]>()
  for (const r of relatos) {
    const mes = new Date(r.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    grupos.set(mes, [...(grupos.get(mes) ?? []), r])
  }

  return (
    <div className="space-y-12">
      {meu && relatos.some((r) => r.anonimo) && (
        <p className="text-sm text-grafite-500">Os marcados como anônimos só aparecem aqui para você.</p>
      )}
      {[...grupos].map(([mes, lista]) => (
        <div key={mes} className="grid gap-5 lg:grid-cols-[180px_1fr]">
          <h3 className="font-serif text-3xl italic leading-none text-grafite-900 lg:sticky lg:top-[150px] lg:self-start">
            {mes.split(' de ')[0]}
            <span className="mt-1 block font-sans text-xs font-bold not-italic uppercase tracking-[0.16em] text-grafite-500">
              {mes.split(' de ')[1]} · {lista.length} {lista.length === 1 ? 'relato' : 'relatos'}
            </span>
          </h3>
          <ul className="grid gap-4 sm:grid-cols-2">
            {lista.map((r, i) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 6) * 0.05 }}
              >
                <CartaoRelato relato={r} />
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function CartaoRelato({ relato }: { relato: PostRepercussao }) {
  const categoria = CATEGORIAS.find((c) => c.value === relato.categoria)?.label ?? relato.categoria
  const cor = rgb(CATEGORIA_RGB[relato.categoria])
  return (
    <Link
      to={`/feed/${relato.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[24px] bg-white p-5 pl-6 shadow-[0_1px_0_rgba(27,24,19,0.06)] ring-1 ring-grafite-200 transition-[box-shadow,transform] hover:-translate-y-1 hover:shadow-[0_22px_40px_-24px_rgba(27,24,19,0.5)]"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 transition-[width] duration-300 group-hover:w-2.5" style={{ background: cor }} />
      <span className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white" style={{ background: cor }}>
          <IconeCategoria categoria={relato.categoria} />
        </span>
        <span className="min-w-0 text-[11px] font-bold uppercase leading-tight tracking-[0.08em]" style={{ color: cor }}>
          {categoria}
          <span className="block truncate font-semibold normal-case tracking-normal text-grafite-500">{relato.bairro}</span>
        </span>
        {relato.anonimo && (
          <span className="ml-auto rounded-full bg-grafite-100 px-2 py-0.5 text-[11px] font-semibold text-grafite-700">anônimo</span>
        )}
      </span>
      <span className="mt-3 block flex-1 text-[15px] leading-snug text-grafite-900 line-clamp-3">{relato.descricao}</span>
      <span className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-grafite-500">
        <span>{formatRelativo(relato.created_at)}</span>
        <span className="font-semibold text-categoria-rosa-700">♥ {relato.interacoes}</span>
        <span>💬 {relato.comentarios ?? 0}</span>
        <span
          className={`ml-auto rounded-full px-2.5 py-1 font-bold ${
            relato.status_oficial ? 'bg-status-verde-50 text-status-verde-700' : 'bg-grafite-100 text-grafite-500'
          }`}
        >
          {relato.status_oficial ? STATUS_RESPOSTA_LABELS[relato.status_oficial] : 'Aguardando órgão'}
        </span>
      </span>
    </Link>
  )
}

function ListaRespostas({ respostas }: { respostas: RespostaOficial[] }) {
  if (respostas.length === 0) {
    return <Vazio titulo="Nenhuma resposta ainda" texto="Quando este órgão responder um relato, a resposta aparece aqui." />
  }
  return (
    <ul className="space-y-3">
      {respostas.map((r) => (
        <li key={r.id}>
          <Link
            to={`/feed/${r.post_id}`}
            className="group block rounded-[24px] bg-white p-5 ring-1 ring-grafite-200 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-24px_rgba(27,24,19,0.5)]"
          >
            <span className="flex items-center justify-between gap-2 text-xs">
              <b className="rounded-full bg-status-azul-50 px-2.5 py-1 text-status-azul-700">{STATUS_RESPOSTA_LABELS[r.status]}</b>
              <span className="text-grafite-500">{formatRelativo(r.created_at)}</span>
            </span>
            <span className="mt-3 block font-serif text-xl italic leading-snug text-grafite-900 line-clamp-2">“{r.texto}”</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

// Projetos salvos: foto do lugar, etapa atual no trilho e o próximo marco.
function ListaAcompanhando() {
  const { salvos, alternar } = useProjetosSalvos()
  const projetos = useProjetosPublicos().filter((p) => salvos.includes(p.id))
  if (projetos.length === 0) {
    return (
      <Vazio
        titulo="Nada no seu radar ainda"
        texto="Toque no marcador de um projeto para acompanhar cada etapa até a entrega."
        acao={{ to: '/projetos', rotulo: 'Ver projetos' }}
      />
    )
  }
  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      <AnimatePresence mode="popLayout">
        {projetos.map((p) => {
          const foto = fotoDoProjeto(p.id)
          const etapa = indiceEtapa(p.status)
          const marco = proximoMarco(p)
          return (
            <motion.li key={p.id} layout exit={{ opacity: 0, scale: 0.9 }} className="relative">
              <Link
                to={`/projetos/${p.id}`}
                className="group block overflow-hidden rounded-[28px] bg-white ring-1 ring-grafite-200 transition-shadow hover:shadow-[0_24px_44px_-24px_rgba(27,24,19,0.5)]"
              >
                <span className="relative block h-44 overflow-hidden bg-grafite-200">
                  {foto && (
                    <img
                      src={foto.url}
                      alt={foto.local}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-grafite-900 backdrop-blur">
                    {STATUS_LABELS[p.status]}
                  </span>
                </span>
                <span className="block p-5">
                  <span className="block font-heading text-xl font-extrabold leading-tight text-grafite-900">{p.nome}</span>
                  <span className="mt-4 flex gap-1.5" aria-label={`Etapa ${etapa + 1} de ${ETAPAS_PUBLICAS.length}`}>
                    {ETAPAS_PUBLICAS.map((e, i) => (
                      <span
                        key={e.status}
                        className={`h-1.5 flex-1 rounded-full ${i < etapa ? 'bg-status-verde-500' : i === etapa ? 'bg-amarelo-500' : 'bg-grafite-200'}`}
                      />
                    ))}
                  </span>
                  <span className="mt-2 block text-xs text-grafite-500">
                    {marco ? `Próximo: ${marco.nome}` : 'Todas as etapas cumpridas'}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => alternar(p.id)}
                className="absolute right-4 top-4 rounded-full bg-grafite-900/70 px-3 py-1 text-[11px] font-bold text-white backdrop-blur transition-colors hover:bg-status-vermelho-700"
              >
                Deixar de acompanhar
              </button>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

function PainelBairros() {
  const { bairros, disponivel, alternar } = useBairrosSeguidos()
  if (!disponivel) {
    return <Vazio titulo="Em breve" texto="Seguir bairros fica disponível quando a camada social estiver ativa no banco." />
  }
  if (bairros.length === 0) {
    return (
      <Vazio
        titulo="Nenhum bairro seguido"
        texto='No Feed, escolha um bairro e toque em "+ Seguir" para ser avisado de relatos novos lá.'
        acao={{ to: '/feed', rotulo: 'Abrir o mapa' }}
      />
    )
  }
  return (
    <div>
      <p className="text-grafite-700">Você recebe uma notificação quando alguém relata algo nestes bairros.</p>
      <ul className="mt-6 flex flex-wrap gap-3">
        <AnimatePresence mode="popLayout">
          {bairros.map((b) => (
            <motion.li key={b} layout exit={{ opacity: 0, scale: 0.8 }}>
              <button
                type="button"
                onClick={() => alternar(b)}
                title="Deixar de seguir"
                className="group flex items-center gap-3 rounded-full bg-amarelo-500 py-3 pl-6 pr-3 font-heading text-2xl font-extrabold text-grafite-900 transition-colors hover:bg-amarelo-300"
              >
                {b}
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-grafite-900/10 text-base transition-colors group-hover:bg-grafite-900 group-hover:text-amarelo-300">
                  ×
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

function Bloco({ titulo, children, className = '' }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[28px] p-6 ${className}`}>
      <h3 className="font-heading text-xl font-extrabold text-grafite-900">{titulo}</h3>
      {children}
    </div>
  )
}

function PainelConta({ gestor }: { gestor: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <Bloco titulo="O que sua conta pode fazer" className="bg-white ring-1 ring-grafite-200">
        <ul className="mt-4 space-y-2.5">
          {PERMISSOES.map((p) => {
            const pode = gestor ? p.gestor : p.cidadao
            return (
              <li key={p.acao} className={`flex items-start gap-3 text-sm ${pode ? 'text-grafite-900' : 'text-grafite-500'}`}>
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    pode ? 'bg-status-verde-500 text-white' : 'bg-grafite-200 text-grafite-500'
                  }`}
                  aria-label={pode ? 'pode' : 'não pode'}
                >
                  {pode ? '✓' : '–'}
                </span>
                {p.acao}
              </li>
            )
          })}
        </ul>
        {!gestor && (
          <p className="mt-4 text-xs text-grafite-500">
            Representa um órgão público? A verificação de contas institucionais é feita pela equipe.
          </p>
        )}
      </Bloco>
      <Bloco titulo="Seu voto é secreto" className="bg-amarelo-100">
        <p className="mt-2 text-sm text-grafite-700">
          Seus votos não aparecem em lugar nenhum — nem para você. O comprovante é mostrado uma única vez, logo após
          votar.
        </p>
      </Bloco>
    </div>
  )
}

function EditarPerfil({ perfil, onFechar, onSalvo }: { perfil: PerfilPublico; onFechar: () => void; onSalvo: () => void }) {
  const [apelido, setApelido] = useState(perfil.apelido ?? '')
  const [bairro, setBairro] = useState(bairroOficial(perfil.bairro) ?? '')
  const [bio, setBio] = useState(perfil.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(perfil.avatar_url ?? null)
  const [capaUrl, setCapaUrl] = useState(perfil.capa_url ?? null)
  const [enviando, setEnviando] = useState<'avatar' | 'capa' | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const apelidoNormal = apelido.trim().toLowerCase()
  const apelidoOk = !apelidoNormal || APELIDO_VALIDO.test(apelidoNormal)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  async function trocarFoto(arquivo: File | null, tipo: 'avatar' | 'capa') {
    const definir = tipo === 'avatar' ? setAvatarUrl : setCapaUrl
    if (!arquivo) return definir(null)
    setEnviando(tipo)
    setErro(null)
    try {
      definir(await enviarFoto(arquivo, tipo, perfil.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a foto.')
    } finally {
      setEnviando(null)
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!apelidoOk || enviando) return
    setSalvando(true)
    setErro(null)
    const campos = { apelido: apelidoNormal || null, bairro: bairro.trim() || null, bio: bio.trim() || null }
    const fotosMudaram = avatarUrl !== (perfil.avatar_url ?? null) || capaUrl !== (perfil.capa_url ?? null)
    const { error } = await supabase
      .from('profiles')
      .update(fotosMudaram ? { ...campos, avatar_url: avatarUrl, capa_url: capaUrl } : campos)
      .eq('id', perfil.id)
    setSalvando(false)
    if (error) {
      setErro(
        error.code === '23505'
          ? 'Esse apelido já está em uso. Tente outro.'
          : /avatar_url|capa_url/.test(error.message)
            ? 'As fotos de perfil ainda não estão ativas no banco (falta aplicar a migration 0015).'
            : error.message.includes('apelido')
            ? 'O perfil público ainda não está ativo no banco (falta aplicar a migration 0008).'
            : `Não foi possível salvar: ${error.message}`,
      )
      return
    }
    onSalvo()
  }

  return (
    <motion.div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-grafite-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-label="Editar perfil"
    >
      <motion.form
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        className="w-full max-w-md rounded-t-[32px] bg-white p-6 sm:rounded-[32px]"
      >
        <p className="font-heading text-2xl font-extrabold text-grafite-900">Editar perfil</p>
        <p className="mt-1 text-sm text-grafite-500">É assim que você aparece no Feed. Seu nome completo não é mostrado.</p>

        <div className="mt-5 grid grid-cols-[96px_1fr] gap-3">
          <CampoFoto
            redondo
            previa={avatarUrl}
            rotulo="Foto"
            carregando={enviando === 'avatar'}
            onEscolher={(a) => trocarFoto(a, 'avatar')}
          />
          <CampoFoto
            previa={capaUrl}
            rotulo="Capa"
            carregando={enviando === 'capa'}
            onEscolher={(a) => trocarFoto(a, 'capa')}
          />
        </div>

        <label className="mt-5 block text-sm font-semibold text-grafite-900" htmlFor="apelido">
          Apelido
        </label>
        <div className={`mt-1.5 flex items-center rounded-2xl border px-3 ${apelidoOk ? 'border-grafite-300' : 'border-status-vermelho-500'}`}>
          <span className="text-grafite-500">@</span>
          <input
            id="apelido"
            value={apelido}
            onChange={(e) => setApelido(e.target.value)}
            placeholder="ex: marina.boavista"
            maxLength={20}
            className="w-full bg-transparent px-1 py-3 text-sm text-grafite-900 focus:outline-none"
          />
        </div>
        <p className={`mt-1 text-xs ${apelidoOk ? 'text-grafite-500' : 'text-status-vermelho-700'}`}>
          3 a 20 caracteres: letras minúsculas, números, ponto ou _.
        </p>

        <label className="mt-4 block text-sm font-semibold text-grafite-900" htmlFor="bairro-perfil">
          Seu bairro
        </label>
        <CampoBairro id="bairro-perfil" value={bairro} onChange={setBairro} vazio="Prefiro não dizer" className="mt-1.5" />

        <label className="mt-4 block text-sm font-semibold text-grafite-900" htmlFor="bio">
          Sobre você
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
          placeholder="Uma frase sobre você e o seu bairro."
          className="mt-1.5 w-full resize-none rounded-2xl border border-grafite-300 px-4 py-3 text-sm text-grafite-900 focus:border-amarelo-500 focus:outline-none"
        />
        <p className="text-right text-xs text-grafite-500">{bio.length}/160</p>

        {erro && <p className="mt-2 rounded-2xl bg-status-vermelho-50 px-3 py-2 text-sm text-status-vermelho-700">{erro}</p>}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onFechar} className="flex-1 rounded-full border-2 border-grafite-200 py-3 text-sm font-bold text-grafite-900">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando || !apelidoOk}
            className="flex-1 rounded-full bg-amarelo-500 py-3 text-sm font-bold text-grafite-900 disabled:opacity-50"
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  )
}
