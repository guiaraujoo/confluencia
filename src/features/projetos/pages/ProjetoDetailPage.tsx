import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { carregarProjeto } from '../vitrine'
import Marquee from '../../../components/Marquee'
import Topografia from '../../../components/Topografia'
import TextoRevelado from '../../../components/TextoRevelado'
import Contador from '../../../components/Contador'
import IconeCategoria from '../../feed/components/IconeCategoria'
import { CATEGORIA_RGB } from '../../feed/cores'
import Cedula from '../components/Cedula'
import VerificarComprovante from '../components/VerificarComprovante'
import LinhaDoTempo from '../components/LinhaDoTempo'
import BotaoSalvar from '../components/BotaoSalvar'
import { useAuth } from '../../../context/AuthContext'
import RelatoOrigem from '../components/RelatoOrigem'
import {
  CartaoEstimativa,
  ComparadorFotos,
  GaleriaObra,
  SecaoProposta,
  VideosAntesDepois,
} from '../components/SecoesProjeto'
import { CONTEUDO_PROJETO } from '../conteudo'
import { FOTOS_PROJETO } from '../fotos'
import { ETAPAS_PUBLICAS, dataLocal, diasRestantes, indiceEtapa, marcosCumpridos, proximoMarco } from '../etapas'
import { CATEGORIAS, STATUS_LABELS, type Projeto } from '../../../types/database'

gsap.registerPlugin(useGSAP, SplitText)

const DIA_MS = 86_400_000

// Tarefa 3.1 da Ana: tela completa do projeto (timeline + status + votação).
// O projeto vem de ../api.ts (ou dos exemplos da vitrine, ver ../vitrine.ts).
export default function ProjetoDetailPage() {
  const { id } = useParams()
  // Guarda de qual id é o resultado: se não bate com o da URL, ainda está carregando.
  // projeto null = não existe (ou é rejeitado de outro órgão).
  const [carga, setCarga] = useState<{ id: string; projeto: Projeto | null } | null>(null)
  const projeto = carga && carga.id === id ? carga.projeto : undefined

  useEffect(() => {
    if (!id) return
    let cancelado = false
    carregarProjeto(id)
      .then((p) => {
        if (!cancelado) setCarga({ id, projeto: p })
      })
      .catch(() => {
        if (!cancelado) setCarga({ id, projeto: null })
      })
    return () => {
      cancelado = true
    }
  }, [id])

  if (projeto === undefined) {
    return <div className="min-h-[78vh] animate-pulse bg-grafite-100" aria-label="Carregando projeto" />
  }

  if (!projeto) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center">
        <p className="font-heading text-3xl font-extrabold text-grafite-900">Projeto não encontrado</p>
        <p className="mt-2 text-grafite-500">Ele pode ter sido removido ou ainda não estar visível ao público.</p>
        <Link
          to="/projetos"
          className="mt-6 inline-flex rounded-full bg-amarelo-500 px-5 py-2.5 text-sm font-bold text-grafite-900"
        >
          Ver todos os projetos
        </Link>
      </div>
    )
  }

  return <ProjetoDetalhe projeto={projeto} />
}

function ProjetoDetalhe({ projeto }: { projeto: Projeto }) {
  const [agora] = useState(() => Date.now())
  const foto = FOTOS_PROJETO[projeto.id]
  const [r, g, b] = CATEGORIA_RGB[projeto.categoria]
  const categoria = CATEGORIAS.find((c) => c.value === projeto.categoria)?.label ?? projeto.categoria
  const etapa = indiceEtapa(projeto.status)
  const dias = diasRestantes(projeto, agora)
  const proximo = proximoMarco(projeto)
  const diasProximo = proximo
    ? Math.max(0, Math.ceil((dataLocal(proximo.data_prevista).getTime() - agora) / DIA_MS))
    : null
  const emConsulta = projeto.status === 'em_consulta'
  const conteudo = CONTEUDO_PROJETO[projeto.id]

  // --- Hero com profundidade: a foto desce mais devagar que a página.
  const hero = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start start', 'end start'] })
  const fotoY = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const fotoEscala = useTransform(scrollYProgress, [0, 1], [1.12, 1])
  const tituloY = useTransform(scrollYProgress, [0, 1], [0, -90])
  const escurecer = useTransform(scrollYProgress, [0, 1], [0.25, 0.7])

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const titulo = SplitText.create('[data-titulo-projeto]', { type: 'lines', mask: 'lines' })
      gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .from(titulo.lines, { yPercent: 105, duration: 1, stagger: 0.12, delay: 0.15 })
        .from('[data-hero-chip]', { y: 16, opacity: 0, stagger: 0.08, duration: 0.6 }, '-=0.7')
      return () => titulo.revert()
    },
    { scope: hero },
  )

  const faixa = emConsulta
    ? [
        'Consulta pública aberta',
        dias === 0 ? 'Último dia para votar' : `Faltam ${dias} dias`,
        'Seu voto conta',
        'Voto secreto e auditável',
      ]
    : [
        STATUS_LABELS[projeto.status],
        proximo ? `Próxima etapa: ${proximo.nome}` : 'Obra entregue',
        `${marcosCumpridos(projeto)} de ${projeto.timeline.length} marcos concluídos`,
        categoria,
      ]

  return (
    <div>
      {/* HERO ------------------------------------------------------------ */}
      <section ref={hero} className="relative h-[78vh] min-h-[520px] overflow-hidden text-white">
        <motion.div className="absolute inset-0" style={{ y: fotoY, scale: fotoEscala }}>
          {foto ? (
            <img src={foto.url} alt={`Foto do local: ${foto.local}`} className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: `linear-gradient(135deg, rgb(${r},${g},${b}), rgba(${r},${g},${b},0.7))` }}
            />
          )}
        </motion.div>
        <motion.div className="absolute inset-0 bg-grafite-900" style={{ opacity: escurecer }} />
        <div className="absolute inset-0 bg-gradient-to-t from-grafite-900/90 via-grafite-900/20 to-transparent" />
        <Topografia semente={projeto.id.length * 3.1} className="absolute inset-0 h-full w-full text-white/15" />

        <motion.div
          style={{ y: tituloY }}
          className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-5 sm:px-8 pb-12"
        >
          <div className="mb-auto mt-8 flex items-center justify-between gap-3">
            <Link
              to="/projetos"
              data-hero-chip
              className="inline-flex w-fit flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/25"
            >
              ← Projetos
            </Link>
            <span data-hero-chip>
              <BotaoSalvar projetoId={projeto.id} variante="completo" />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              data-hero-chip
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em]"
              style={{ background: `rgb(${r},${g},${b})` }}
            >
              <IconeCategoria categoria={projeto.categoria} size={14} />
              {categoria}
            </span>
            <span
              data-hero-chip
              className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] ${
                emConsulta ? 'bg-amarelo-500 text-grafite-900' : projeto.status === 'rejeitado' ? 'bg-status-vermelho-500' : 'bg-white text-grafite-900'
              }`}
            >
              {STATUS_LABELS[projeto.status]}
            </span>
          </div>

          <h1
            data-titulo-projeto
            lang="pt-BR"
            className="mt-5 max-w-5xl font-heading text-[2.5rem] min-[400px]:text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[0.95] tracking-tight [overflow-wrap:anywhere] [hyphens:auto]"
          >
            {projeto.nome}
          </h1>

          {foto && (
            <p data-hero-chip className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              {foto.local} ·{' '}
              <a href={foto.fonte} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                Foto: {foto.autor}, {foto.licenca}
              </a>
            </p>
          )}
        </motion.div>
      </section>

      {/* FAIXA ----------------------------------------------------------- */}
      <Marquee
        itens={faixa}
        className={`py-4 font-heading text-xl sm:text-2xl font-extrabold uppercase tracking-tight ${
          emConsulta ? 'bg-amarelo-500 text-grafite-900' : 'bg-amarelo-100 text-amarelo-900'
        }`}
      />

      {/* CONTEÚDO -------------------------------------------------------- */}
      <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 py-16 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">O projeto</p>
          <TextoRevelado className="mt-4 font-heading text-3xl sm:text-4xl font-bold leading-[1.15] text-grafite-900">
            {projeto.descricao}
          </TextoRevelado>

          <dl className="mt-14 grid grid-cols-3 gap-3 sm:gap-4 border-y border-grafite-200 py-8">
            <div>
              <dd className="font-heading text-[2rem] min-[400px]:text-4xl sm:text-5xl font-extrabold text-grafite-900">
                <Contador valor={marcosCumpridos(projeto)} />
                <span className="text-grafite-300">/{projeto.timeline.length}</span>
              </dd>
              <dt className="mt-1 text-xs sm:text-sm text-grafite-500">marcos da obra concluídos</dt>
            </div>
            <div>
              <dd className="font-heading text-[2rem] min-[400px]:text-4xl sm:text-5xl font-extrabold text-grafite-900">
                <Contador valor={etapa + 1} />
                <span className="text-grafite-300">/{ETAPAS_PUBLICAS.length}</span>
              </dd>
              <dt className="mt-1 text-xs sm:text-sm text-grafite-500">etapa do projeto</dt>
            </div>
            <div>
              <dd className="font-heading text-[2rem] min-[400px]:text-4xl sm:text-5xl font-extrabold text-amarelo-700">
                <Contador valor={emConsulta ? (dias ?? 0) : proximo ? (diasProximo ?? 0) : 100} />
                {!emConsulta && !proximo && <span>%</span>}
              </dd>
              <dt className="mt-1 text-xs sm:text-sm text-grafite-500">
                {emConsulta ? 'dias para votar' : proximo ? 'dias até a próxima etapa' : 'da obra entregue'}
              </dt>
            </div>
          </dl>

          {conteudo && <SecaoProposta conteudo={conteudo} />}
          {conteudo?.estimativa && <CartaoEstimativa estimativa={conteudo.estimativa} projeto={projeto} />}
          {conteudo?.antesDepois && <ComparadorFotos antes={conteudo.antesDepois.antes} depois={conteudo.antesDepois.depois} />}
          {conteudo?.videos && <VideosAntesDepois videos={conteudo.videos} />}
          {conteudo?.galeria && conteudo.galeria.length > 0 && <GaleriaObra fotos={conteudo.galeria} />}

          <section className="mt-16">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">Onde está</p>
            <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-5">
              {ETAPAS_PUBLICAS.map((e, i) => {
                const feita = i < etapa || projeto.status === 'concluido'
                const atual = i === etapa && projeto.status !== 'concluido'
                return (
                  <motion.li
                    key={e.status}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    aria-current={atual ? 'step' : undefined}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 sm:block sm:px-3 sm:py-4 sm:text-center ${
                      atual
                        ? 'bg-amarelo-500 text-grafite-900 shadow-[0_12px_24px_-12px_rgba(245,184,0,0.9)]'
                        : feita
                          ? 'bg-status-verde-50 text-status-verde-700'
                          : 'bg-grafite-100 text-grafite-500'
                    }`}
                  >
                    <span className="block font-heading text-2xl font-extrabold">{i + 1}</span>
                    <span className="text-xs sm:text-[11px] font-bold uppercase tracking-[0.08em]">{e.label}</span>
                    {atual && <span className="ml-auto text-xs font-semibold sm:hidden">etapa atual</span>}
                  </motion.li>
                )
              })}
            </ol>
            {projeto.status === 'rejeitado' && (
              <p className="mt-3 rounded-2xl bg-status-vermelho-50 px-4 py-3 text-sm font-semibold text-status-vermelho-700">
                Este projeto foi rejeitado na consulta pública e não aparece para a população.
              </p>
            )}
          </section>

          <section className="mt-16">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">Linha do tempo da obra</p>
            <div className="mt-8">
              <LinhaDoTempo marcos={projeto.timeline} />
            </div>
          </section>

          {projeto.origem_post_id && <RelatoOrigem postId={projeto.origem_post_id} />}
        </div>

        <aside id="votar" className="scroll-mt-20 lg:sticky lg:top-24 lg:self-start">
          {emConsulta ? (
            <>
              <Cedula projeto={projeto} agora={agora} />
              <div className="mt-4 rounded-[24px] border border-grafite-200 bg-white px-5 pb-4">
                <VerificarComprovante projetoId={projeto.id} />
              </div>
            </>
          ) : (
            <div className="overflow-hidden rounded-[32px] border border-grafite-200 bg-white">
              <div className="bg-amarelo-100 px-6 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amarelo-900">Consulta pública</p>
                <p className="mt-1 font-heading text-2xl font-extrabold text-grafite-900">
                  {projeto.status === 'proposto' ? 'Ainda não abriu' : 'Encerrada'}
                </p>
              </div>
              <p className="p-6 text-sm text-grafite-700">
                {projeto.status === 'proposto'
                  ? 'Quando o órgão abrir a consulta, a votação aparece aqui.'
                  : projeto.status === 'rejeitado'
                    ? 'A população rejeitou o projeto na consulta.'
                    : 'A população já votou neste projeto. Acompanhe a obra pela linha do tempo.'}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* No celular a cédula fica no fim da página, depois de todo o conteúdo:
          um atalho fixo leva direto a ela enquanto a consulta está aberta. */}
      {emConsulta && <AtalhoVotar />}
    </div>
  )
}

function AtalhoVotar() {
  const [visivel, setVisivel] = useState(true)
  // Logado, o botão flutuante de relatar ocupa o canto direito: a barra para antes dele.
  const { user } = useAuth()

  useEffect(() => {
    const cedula = document.getElementById('votar')
    if (!cedula || !('IntersectionObserver' in window)) return
    // Some quando a própria cédula já está na tela.
    const obs = new IntersectionObserver(([e]) => setVisivel(!e.isIntersecting), { threshold: 0.15 })
    obs.observe(cedula)
    return () => obs.disconnect()
  }, [])

  return (
    <motion.a
      href="#votar"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('votar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
      initial={false}
      animate={visivel ? { y: 0, opacity: 1 } : { y: 90, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      aria-hidden={!visivel}
      tabIndex={visivel ? 0 : -1}
      className={`fixed bottom-5 left-4 z-40 flex ${user ? 'right-[5.75rem]' : 'right-4'} items-center justify-between gap-3 rounded-full bg-grafite-900 py-2 pl-5 pr-2 text-sm font-bold text-white shadow-[0_18px_40px_-14px_rgba(27,24,19,0.7)] lg:hidden`}
    >
      <span className="truncate">Consulta pública aberta</span>
      <span className="flex-shrink-0 rounded-full bg-amarelo-500 px-4 py-2 text-grafite-900">Votar ↓</span>
    </motion.a>
  )
}
