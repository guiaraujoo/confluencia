import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import Marquee from '../../../components/Marquee'
import Contador from '../../../components/Contador'
import IconeCategoria from '../components/IconeCategoria'
import AnelRepercussao from '../components/AnelRepercussao'
import ComparadorSimulacao from '../components/ComparadorSimulacao'
import RespostasOficiais from '../components/RespostasOficiais'
import Comentarios from '../components/Comentarios'
import ProjetosDoRelato from '../../projetos/components/ProjetosDoRelato'
import { Avatar, SeloOrgao } from '../components/Autor'
import { nomePublico, usePerfis } from '../perfis'
import { CATEGORIA_RGB, rgb } from '../cores'
import { formatRelativo, nivelRepercussao, REPERCUSSAO_STYLES } from '../../../lib/repercussao'
import { CATEGORIAS, type PerfilPublico, type PostRepercussao } from '../../../types/database'

gsap.registerPlugin(useGSAP, SplitText)

// O mapa 3D só é baixado quando a página abre.
const MapaOrbita = lazy(() => import('../components/MapaOrbita'))

const protocolo = (id: string) => `OC-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
const dataLonga = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

// Detalhe do relato — Tarefas 2.5/4.1 do João. Lê da view `posts_repercussao`
// (repercussão real) e usa `post_apoios` para apoiar (Guilherme, Tarefa 2.3).
export default function PostDetailPage() {
  const { id } = useParams()
  const [post, setPost] = useState<PostRepercussao | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelado = false
    supabase
      .from('posts_repercussao')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) {
          setPost(data)
          setLoading(false)
        }
      })
    return () => {
      cancelado = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-amarelo-300 border-t-amarelo-700" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p className="font-heading text-3xl font-extrabold text-grafite-900">Relato não encontrado</p>
        <p className="mt-2 text-grafite-500">Ele pode ter sido removido por quem publicou.</p>
        <Link to="/feed" className="mt-6 inline-flex rounded-full bg-amarelo-500 px-5 py-2.5 text-sm font-bold text-grafite-900">
          Voltar ao Feed
        </Link>
      </div>
    )
  }

  return <RelatoDetalhe post={post} onAtualizar={setPost} />
}

function RelatoDetalhe({ post, onAtualizar }: { post: PostRepercussao; onAtualizar: (p: PostRepercussao) => void }) {
  const raiz = useRef<HTMLDivElement>(null)
  const perfis = usePerfis([post.user_id])
  const cor = rgb(CATEGORIA_RGB[post.categoria])
  const categoria = CATEGORIAS.find((c) => c.value === post.categoria)?.label ?? post.categoria
  const nivel = REPERCUSSAO_STYLES[nivelRepercussao(post.repercussao)]

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const titulo = SplitText.create('[data-titulo-relato]', { type: 'chars', mask: 'chars' })
      gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .from(titulo.chars, { yPercent: 110, duration: 0.9, stagger: 0.035, delay: 0.2 })
        .from('[data-hero-chip]', { y: 14, opacity: 0, stagger: 0.07, duration: 0.5 }, '-=0.6')
      return () => titulo.revert()
    },
    { scope: raiz },
  )

  return (
    <div ref={raiz}>
      {/* HERO: o local, em 3D, com a câmera girando ----------------------- */}
      <section className="relative h-[72vh] min-h-[480px] overflow-hidden bg-grafite-200">
        <Suspense fallback={<div className="h-full w-full animate-pulse bg-grafite-200" />}>
          <MapaOrbita latitude={post.latitude} longitude={post.longitude} cor={cor} />
        </Suspense>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-grafite-50 via-grafite-50/60 to-transparent" />

        <div className="pointer-events-none absolute inset-0 mx-auto flex max-w-7xl flex-col justify-between px-5 sm:px-8 pt-6 pb-10">
          <div className="flex items-center justify-between">
            <Link
              to="/feed"
              data-hero-chip
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-grafite-900 shadow-sm backdrop-blur hover:bg-white"
            >
              ← Feed
            </Link>
            <span data-hero-chip className="hidden sm:inline rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-grafite-700 backdrop-blur">
              Arraste o mapa para explorar o local
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-hero-chip
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-white"
                style={{ background: cor }}
              >
                <IconeCategoria categoria={post.categoria} size={14} />
                {categoria}
              </span>
              <span data-hero-chip className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-grafite-900 shadow-sm">
                {protocolo(post.id)}
              </span>
              <span data-hero-chip className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-grafite-700 shadow-sm">
                Relatado {formatRelativo(post.created_at)}
              </span>
            </div>
            <h1
              data-titulo-relato
              className="mt-4 font-heading text-6xl sm:text-8xl font-extrabold leading-[0.9] tracking-tight text-grafite-900"
            >
              {post.bairro}
            </h1>
          </div>
        </div>
      </section>

      <Marquee
        itens={[protocolo(post.id), post.bairro, categoria, `Repercussão ${nivel.label}`, `${post.interacoes} ${post.interacoes === 1 ? 'apoio' : 'apoios'}`]}
        duracao={24}
        className="bg-amarelo-500 py-4 font-heading text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-grafite-900"
      />

      <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 py-16 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <Citacao
            texto={post.descricao}
            bairro={post.bairro}
            data={post.created_at}
            autorId={post.anonimo ? null : post.user_id}
            perfil={post.user_id ? perfis.get(post.user_id) : undefined}
            anonimo={post.anonimo}
          />

          <RespostasOficiais postId={post.id} />

          {/* Tarefa 4.1 da Ana: se este relato já virou projeto, mostra qual. */}
          <ProjetosDoRelato postId={post.id} />

          <section className="mt-20">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">Repercussão</p>
            <div className="mt-6 flex flex-wrap items-center gap-10">
              <AnelRepercussao valor={post.repercussao} size={150} />
              <div>
                <p className={`font-heading text-4xl font-extrabold ${nivel.text}`}>Repercussão {nivel.label}</p>
                <dl className="mt-4 flex gap-10">
                  <div>
                    <dd className="font-heading text-4xl font-extrabold text-grafite-900">
                      <Contador valor={post.recorrencia} />
                    </dd>
                    <dt className="text-sm text-grafite-500">relatos parecidos na área (30 dias)</dt>
                  </div>
                  <div>
                    <dd className="font-heading text-4xl font-extrabold text-grafite-900">
                      <Contador valor={post.interacoes} />
                    </dd>
                    <dt className="text-sm text-grafite-500">{post.interacoes === 1 ? 'apoio' : 'apoios'}</dt>
                  </div>
                </dl>
              </div>
            </div>
            <p className="mt-6 max-w-xl text-sm text-grafite-700">
              A repercussão soma os relatos da mesma categoria no mesmo bairro nos últimos 30 dias com os apoios
              deste relato. Quanto maior, mais a cidade está pedindo atenção para este ponto.
            </p>
          </section>

          <section className="mt-20">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">Se for resolvido</p>
            <div className="mt-6">
              <ComparadorSimulacao categoria={post.categoria} />
            </div>
          </section>

          <Comentarios postId={post.id} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CartaoApoio post={post} onAtualizar={onAtualizar} />
        </aside>
      </div>
    </div>
  )
}

// O relato como citação, com uma "assinatura" que se desenha ao aparecer na tela.
interface CitacaoProps {
  texto: string
  bairro: string
  data: string
  autorId: string | null
  perfil?: PerfilPublico
  anonimo?: boolean
}

function Citacao({ texto, bairro, data, autorId, perfil, anonimo }: CitacaoProps) {
  const ref = useRef<HTMLDivElement>(null)
  const visivel = useInView(ref, { once: true, margin: '-15% 0px' })

  return (
    <div ref={ref}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">O relato</p>
      <blockquote className="relative mt-6 pt-14">
        <span aria-hidden className="absolute -left-1 -top-4 font-heading text-[9rem] leading-none text-amarelo-500">
          “
        </span>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={visivel ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative font-heading text-3xl sm:text-4xl font-bold leading-[1.2] text-grafite-900"
        >
          {texto}
        </motion.p>
      </blockquote>
      <div className="mt-8 flex items-center gap-4">
        <svg viewBox="0 0 160 40" className="h-10 w-40 text-amarelo-500" aria-hidden>
          <motion.path
            d="M4 30 C 20 6, 34 6, 38 24 S 56 38, 66 18 S 88 4, 96 26 S 120 34, 156 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={visivel ? { pathLength: 1 } : {}}
            transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.4 }}
          />
        </svg>
        {autorId && perfil ? (
          <Link to={`/u/${autorId}`} className="group flex items-center gap-3 rounded-full pr-4 hover:bg-grafite-100">
            <Avatar perfil={perfil} size={40} />
            <span className="text-sm text-grafite-700">
              <b className="flex items-center gap-1.5 text-grafite-900 group-hover:underline">
                {nomePublico(perfil)} {perfil.institucional_verificado && <SeloOrgao />}
              </b>
              {perfil.bairro ? `${perfil.bairro} · ` : ''}
              {dataLonga(data)}
            </span>
          </Link>
        ) : (
          <p className="text-sm text-grafite-700">
            <b className="text-grafite-900">Morador(a) de {bairro}</b>
            {anonimo && <span className="ml-2 rounded-full bg-grafite-200 px-2 py-0.5 text-[11px] font-semibold">relato anônimo</span>}
            <br />
            {dataLonga(data)}
          </p>
        )}
      </div>
    </div>
  )
}

const CORACOES = Array.from({ length: 10 }, (_, i) => i)

function CartaoApoio({ post, onAtualizar }: { post: PostRepercussao; onAtualizar: (p: PostRepercussao) => void }) {
  const { user } = useAuth()
  const [apoiado, setApoiado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [estouro, setEstouro] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const meu = user?.id === post.user_id

  useEffect(() => {
    if (!user) return
    let cancelado = false
    supabase
      .from('post_apoios')
      .select('post_id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado) setApoiado(Boolean(data))
      })
    return () => {
      cancelado = true
    }
  }, [post.id, user])

  async function alternar() {
    if (!user) return
    setSalvando(true)
    setErro(null)
    const { error } = apoiado
      ? await supabase.from('post_apoios').delete().eq('post_id', post.id).eq('user_id', user.id)
      : await supabase.from('post_apoios').insert({ post_id: post.id, user_id: user.id })
    setSalvando(false)
    if (error) {
      setErro(`Não foi possível ${apoiado ? 'remover o apoio' : 'apoiar'}: ${error.message}`)
      return
    }
    const delta = apoiado ? -1 : 1
    if (!apoiado) setEstouro((n) => n + 1)
    setApoiado(!apoiado)
    onAtualizar({ ...post, interacoes: post.interacoes + delta, repercussao: post.repercussao + delta })
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-grafite-200 bg-white shadow-[0_30px_60px_-30px_rgba(27,24,19,0.35)]">
      <div className="bg-amarelo-500 px-6 py-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amarelo-900">Apoie este relato</p>
        <p className="mt-1 font-heading text-2xl font-extrabold leading-tight text-grafite-900">
          Isso também te afeta?
        </p>
        <p className="mt-1 text-sm text-amarelo-900">Cada apoio aumenta a repercussão e ajuda a priorizar o local.</p>
      </div>

      <div className="p-6">
        <p className="font-heading text-5xl font-extrabold text-grafite-900">
          {post.interacoes}
          <span className="ml-2 text-base font-semibold text-grafite-500">{post.interacoes === 1 ? 'apoio' : 'apoios'}</span>
        </p>

        <div className="relative mt-5">
          {/* Corações que explodem ao apoiar */}
          <AnimatePresence>
            {estouro > 0 &&
              CORACOES.map((i) => {
                const angulo = (i / CORACOES.length) * Math.PI * 2
                return (
                  <motion.span
                    key={`${estouro}-${i}`}
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 z-10 text-lg text-status-vermelho-500"
                    initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
                    animate={{ x: Math.cos(angulo) * 110, y: Math.sin(angulo) * 70, scale: 1.1, opacity: 0 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  >
                    ♥
                  </motion.span>
                )
              })}
          </AnimatePresence>

          {!user ? (
            <Link
              to="/entrar"
              className="flex w-full items-center justify-center rounded-2xl bg-amarelo-500 px-4 py-3.5 text-sm font-bold text-grafite-900 transition-transform hover:-translate-y-0.5"
            >
              Entre para apoiar
            </Link>
          ) : meu ? (
            <p className="rounded-2xl bg-grafite-100 p-4 text-sm text-grafite-700">
              Este relato é seu. Compartilhe para que mais vizinhos apoiem.
            </p>
          ) : (
            <motion.button
              type="button"
              onClick={alternar}
              disabled={salvando}
              aria-pressed={apoiado}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-bold transition-colors disabled:opacity-60 ${
                apoiado
                  ? 'bg-status-vermelho-50 text-status-vermelho-700 ring-2 ring-status-vermelho-500'
                  : 'bg-amarelo-500 text-grafite-900 shadow-[0_12px_24px_-12px_rgba(245,184,0,0.9)] hover:bg-amarelo-300'
              }`}
            >
              <motion.span
                key={apoiado ? 'sim' : 'nao'}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 12 }}
              >
                {apoiado ? '♥' : '♡'}
              </motion.span>
              {apoiado ? 'Você apoia este relato' : 'Apoiar este relato'}
            </motion.button>
          )}
        </div>
        {erro && <p className="mt-3 text-xs text-status-vermelho-700">{erro}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={copiarLink}
            className="rounded-2xl border border-grafite-200 px-3 py-3 text-sm font-semibold text-grafite-900 transition-colors hover:border-amarelo-500 hover:bg-amarelo-50"
          >
            {copiado ? 'Link copiado ✓' : 'Copiar link'}
          </button>
          <Link
            to="/feed/novo"
            className="rounded-2xl border border-grafite-200 px-3 py-3 text-center text-sm font-semibold text-grafite-900 transition-colors hover:border-amarelo-500 hover:bg-amarelo-50"
          >
            Relatar parecido
          </Link>
        </div>
      </div>
    </div>
  )
}
