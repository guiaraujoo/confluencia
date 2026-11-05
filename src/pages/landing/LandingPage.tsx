import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { supabase } from '../../lib/supabase'
import Contador from '../../components/Contador'
import { MOCK_PROJETOS } from '../../features/projetos/mock'
import { FOTOS_PROJETO } from '../../features/projetos/fotos'
import { CONTEUDO_PROJETO } from '../../features/projetos/conteudo'
import type { Categoria } from '../../types/database'
import Preloader from './Preloader'
import HeroPortal, { type RelatoVitrine } from './HeroPortal'
import Manifesto from './Manifesto'
import ComoFunciona from './ComoFunciona'
import AntesDepois from './AntesDepois'
import Magnetico from './Magnetico'
import Crachas from './Crachas'

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

const CHAVE_ABERTURA = 'confluencia:abertura-vista'

function jaViuAbertura() {
  try {
    return sessionStorage.getItem(CHAVE_ABERTURA) === '1'
  } catch {
    return true
  }
}

// Landing do Confluência: apresenta o sistema e leva para dentro dele (/feed).
// Referência de linguagem: landonorris.com — abertura com contador, letra
// enorme, serifa itálica, rolagem que conta uma história.
export default function LandingPage() {
  const [abertura, setAbertura] = useState(() => !jaViuAbertura())
  const [relatos, setRelatos] = useState<RelatoVitrine[]>([])
  const [carregou, setCarregou] = useState(false)

  useEffect(() => {
    let cancelado = false
    supabase
      .from('posts_repercussao')
      .select('id, categoria, bairro, descricao, interacoes, latitude, longitude')
      .order('interacoes', { ascending: false })
      .then(({ data }) => {
        if (cancelado) return
        setRelatos(
          (data ?? []).map((r) => ({
            id: r.id as string,
            categoria: r.categoria as Categoria,
            bairro: r.bairro as string,
            descricao: r.descricao as string,
            interacoes: (r.interacoes as number) ?? 0,
            latitude: r.latitude as number,
            longitude: r.longitude as number,
          })),
        )
        setCarregou(true)
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Imagens e fontes mudam a altura da página: recalcula as seções presas.
  useEffect(() => {
    const recalcular = () => ScrollTrigger.refresh()
    window.addEventListener('load', recalcular)
    document.fonts?.ready.then(recalcular)
    return () => window.removeEventListener('load', recalcular)
  }, [])

  function fimAbertura() {
    try {
      sessionStorage.setItem(CHAVE_ABERTURA, '1')
    } catch {
      // sem sessionStorage: a abertura só não é lembrada
    }
    setAbertura(false)
  }

  const totais = {
    relatos: relatos.length,
    apoios: relatos.reduce((s, r) => s + r.interacoes, 0),
    bairros: new Set(relatos.map((r) => r.bairro)).size,
  }


  return (
    <div className="overflow-x-clip bg-grafite-50">
      <AnimatePresence>{abertura && <Preloader onFim={fimAbertura} />}</AnimatePresence>
      <NavLanding />

      <HeroPortal pontos={relatos} carregou={carregou} totais={totais} pronto={!abertura} />

      <Manifesto />

      <ComoFunciona />

      <AntesDepois />

      <Numeros totais={totais} carregou={carregou} />

      <Colagem />

      <Crachas />

      <Final />
    </div>
  )
}

// Barra da landing: some ao descer, volta ao subir.
function NavLanding() {
  const { scrollY } = useScroll()
  const [escondida, setEscondida] = useState(false)
  const [solida, setSolida] = useState(false)
  // Só muda o estado quando muda de verdade (o evento dispara a cada quadro).
  useMotionValueEvent(scrollY, 'change', (v) => {
    const anterior = scrollY.getPrevious() ?? 0
    const esconder = v > anterior && v > 200
    setEscondida((e) => (e === esconder ? e : esconder))
    setSolida((s) => (s === v > 40 ? s : v > 40))
  })

  return (
    <motion.header
      animate={{ y: escondida ? -90 : 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 34 }}
      className="fixed inset-x-0 top-0 z-[1000] px-3 pt-3"
    >
      <div
        className={`mx-auto flex h-14 max-w-7xl items-center justify-between rounded-full pl-3 pr-2 transition-[background-color,box-shadow] duration-300 ${
          solida ? 'bg-white shadow-[0_10px_30px_-18px_rgba(27,24,19,0.5)]' : ''
        }`}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <motion.img src="/logo.png" alt="" className="h-9 w-9" whileHover={{ rotate: -14 }} />
          <span className="font-heading text-lg font-extrabold text-grafite-900">Confluência</span>
        </Link>
        {/* Só navega dentro da landing: a porta para o sistema é o "Entrar". */}
        <nav className="hidden items-center gap-1 text-sm font-semibold text-grafite-900 md:flex">
          {SECOES.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(l.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="rounded-full px-4 py-2 transition-colors hover:bg-amarelo-100"
            >
              {l.rotulo}
            </a>
          ))}
        </nav>
        <Link
          to="/entrar"
          className="rounded-full bg-amarelo-500 px-5 py-2.5 text-sm font-bold text-grafite-900 transition-transform hover:-translate-y-0.5"
        >
          Entrar
        </Link>
      </div>
    </motion.header>
  )
}

const SECOES = [
  { id: 'como-funciona', rotulo: 'Como funciona' },
  { id: 'cidade', rotulo: 'A cidade' },
  { id: 'numeros', rotulo: 'Em números' },
  { id: 'experimente', rotulo: 'Experimente' },
]

// Números ao vivo, enormes, cada um com sua frase em serifa.
function Numeros({ totais, carregou }: { totais: { relatos: number; apoios: number; bairros: number }; carregou: boolean }) {
  const projetos = MOCK_PROJETOS.filter((p) => p.status !== 'rejeitado').length
  const itens = [
    { valor: totais.relatos, rotulo: 'relatos', frase: 'apontados no mapa' },
    { valor: totais.apoios, rotulo: 'apoios', frase: 'de vizinhos que concordam' },
    { valor: totais.bairros, rotulo: 'bairros', frase: 'com alguém de olho' },
    { valor: projetos, rotulo: 'projetos', frase: 'para acompanhar até a entrega' },
  ]
  return (
    <section id="numeros" className="bg-grafite-50 px-[4vw] py-[16vh]">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-heading text-[clamp(2.6rem,6vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-grafite-900">
          Agora, <span className="font-serif font-normal italic text-amarelo-700">no Recife</span>
        </h2>
        <p className="flex items-center gap-2 text-sm text-grafite-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-status-verde-500" />
          {carregou ? 'lido do banco agora mesmo' : 'lendo o banco…'}
        </p>
      </div>
      <dl className="mt-14 grid border-t-2 border-grafite-900 sm:grid-cols-2 lg:grid-cols-4">
        {itens.map((n, i) => (
          <motion.div
            key={n.rotulo}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ delay: i * 0.08, duration: 0.6 }}
            className="group relative overflow-hidden border-b border-grafite-200 py-8 sm:pr-6 lg:border-b-0 lg:border-r lg:last:border-r-0 lg:[&:not(:first-child)]:pl-6"
          >
            <span className="absolute inset-x-0 bottom-0 h-0 bg-amarelo-500 transition-[height] duration-500 ease-out group-hover:h-full" />
            <div className="relative">
              <dt className="text-xs font-bold uppercase tracking-[0.2em] text-grafite-500">{n.rotulo}</dt>
              <dd className="mt-3 font-heading text-[clamp(5rem,9vw,9rem)] font-extrabold leading-[0.85] tracking-[-0.04em] text-grafite-900">
                <Contador valor={n.valor} />
              </dd>
              <dd className="mt-3 font-serif text-xl italic text-grafite-700">{n.frase}</dd>
            </div>
          </motion.div>
        ))}
      </dl>
    </section>
  )
}

// Final: a frase, o botão e o nome enorme ocupando a largura da tela.
function Final() {
  const caixa = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const nome = SplitText.create('[data-nome]', { type: 'chars', mask: 'chars' })
      gsap.from(nome.chars, {
        yPercent: 110,
        stagger: 0.04,
        duration: 1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '[data-nome]', start: 'top 95%' },
      })
      return () => nome.revert()
    },
    { scope: caixa },
  )

  return (
    <section ref={caixa} className="relative overflow-hidden bg-amarelo-500 pt-[14vh]">
      <div className="px-[4vw]">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <h2 className="max-w-4xl font-heading text-[clamp(2.6rem,6.5vw,6.5rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-grafite-900">
            A cidade é <span className="font-serif font-normal italic">de quem mora nela.</span>
          </h2>
          <Magnetico>
            <Link
              to="/feed"
              className="group flex h-40 w-40 flex-col items-center justify-center rounded-full bg-white text-center font-bold text-grafite-900 shadow-[0_24px_50px_-20px_rgba(27,24,19,0.5)] transition-transform duration-300 hover:scale-105 sm:h-48 sm:w-48"
            >
              <span className="text-3xl transition-transform duration-300 group-hover:rotate-[-45deg]">→</span>
              <span className="mt-1 text-sm">
                Entrar no
                <br />
                Confluência
              </span>
            </Link>
          </Magnetico>
        </div>
        <div className="mt-[10vh] flex flex-wrap items-center justify-between gap-3 border-t-2 border-grafite-900 pt-5 text-sm text-grafite-900">
          <span>Projeto acadêmico · Recife, 2026 · Licença MIT</span>
          <span>João Batista · Ana Beatriz · Guilherme Araújo</span>
        </div>
      </div>
      <p
        data-nome
        aria-hidden
        className="mt-4 select-none whitespace-nowrap text-center font-heading text-[18.6vw] font-extrabold leading-[0.78] tracking-[-0.06em] text-grafite-900"
      >
        Confluência
      </p>
    </section>
  )
}

// A cidade, de perto: duas fileiras de fotos correndo em sentidos opostos,
// sem fim. A animação é CSS (compositor); passar o mouse numa fileira a faz
// parar, e a foto sob o mouse se endireita e chega mais perto.
interface FotoCidade {
  url: string
  local: string
  autor: string
  licenca: string
  fonte: string
}

const CAPIBARIBE_NOITE: FotoCidade = {
  url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6b/Rio_Capibaribe_%C3%A0_noite%2C_Recife_%28PE%29.jpg/1280px-Rio_Capibaribe_%C3%A0_noite%2C_Recife_%28PE%29.jpg',
  local: 'Capibaribe à noite',
  autor: 'Marcos Elias de Oliveira Júnior',
  licenca: 'CC0',
  fonte: 'https://commons.wikimedia.org/wiki/File:Rio_Capibaribe_%C3%A0_noite,_Recife_(PE).jpg',
}

const RUA_DOS_JUDEUS: FotoCidade = {
  url: CONTEUDO_PROJETO.p6.antesDepois!.antes.url,
  local: 'Rua dos Judeus · 1855',
  autor: 'Augusto Stahl',
  licenca: 'Domínio público',
  fonte: CONTEUDO_PROJETO.p6.antesDepois!.antes.fonte,
}

const FILEIRA_1: FotoCidade[] = [FOTOS_PROJETO.p6, FOTOS_PROJETO.p2, CAPIBARIBE_NOITE, FOTOS_PROJETO.p1]
const FILEIRA_2: FotoCidade[] = [FOTOS_PROJETO.p5, RUA_DOS_JUDEUS, FOTOS_PROJETO.p4, FOTOS_PROJETO.p2]

function CartaoFoto({ f, i, grande }: { f: FotoCidade; i: number; grande: boolean }) {
  const inclinacao = ['rotate-[-2deg]', 'rotate-[1.5deg]', 'rotate-[-1deg]', 'rotate-[2deg]'][i % 4]
  return (
    <figure
      className={`group/foto relative mx-3 flex-shrink-0 overflow-hidden rounded-[28px] bg-grafite-200 shadow-[0_30px_50px_-30px_rgba(27,24,19,0.55)] transition-transform duration-500 ease-out hover:z-10 hover:-translate-y-2 hover:rotate-0 hover:scale-[1.04] ${inclinacao} ${
        grande ? (i % 2 ? 'h-[22rem] w-[19rem]' : 'h-[22rem] w-[28rem]') : i % 2 ? 'h-64 w-[24rem]' : 'h-64 w-[17rem]'
      } max-w-[80vw]`}
    >
      <img
        src={f.url}
        alt={f.local}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/foto:scale-110"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      <figcaption className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-amarelo-500 px-3 py-1.5 text-xs font-bold text-grafite-900">
          <svg viewBox="0 0 24 24" width={13} height={13} fill="currentColor" aria-hidden>
            <path d="M12 22s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          </svg>
          {f.local}
        </span>
        <a
          href={f.fonte}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-right text-[10px] leading-tight text-white/75 opacity-0 transition-opacity group-hover/foto:opacity-100 hover:underline"
        >
          {f.autor}
          <br />
          {f.licenca}
        </a>
      </figcaption>
    </figure>
  )
}

function Fileira({ fotos, grande, duracao, reverso }: { fotos: FotoCidade[]; grande: boolean; duracao: number; reverso?: boolean }) {
  const volta = fotos.map((f, i) => <CartaoFoto key={i} f={f} i={i} grande={grande} />)
  return (
    <div className="group/fileira flex overflow-hidden py-4">
      <div
        className="anima-continua flex w-max will-change-transform group-hover/fileira:[animation-play-state:paused]"
        style={{ animation: `${reverso ? 'marquee-reverso' : 'marquee'} ${duracao}s linear infinite` }}
      >
        {/* duas voltas idênticas para o laço não ter emenda */}
        <div className="flex">{volta}</div>
        <div className="flex" aria-hidden>
          {volta}
        </div>
      </div>
    </div>
  )
}

function Colagem() {
  return (
    <section id="cidade" className="overflow-hidden bg-grafite-50 py-28">
      <div className="flex flex-wrap items-end justify-between gap-6 px-[4vw]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amarelo-700">A cidade, de perto</p>
          <h2 className="mt-4 max-w-3xl font-heading text-[clamp(2.6rem,6vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-grafite-900">
            Cada relato tem <span className="font-serif font-normal italic text-amarelo-700">um endereço</span>
          </h2>
        </div>
        <p className="max-w-xs text-grafite-700">
          Ruas, pontes e praças do Recife, os lugares onde os relatos acontecem. Passe o mouse para parar.
        </p>
      </div>
      <div className="mt-14 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
        <Fileira fotos={FILEIRA_1} grande duracao={55} />
        <Fileira fotos={FILEIRA_2} grande={false} duracao={70} reverso />
      </div>
    </section>
  )
}
