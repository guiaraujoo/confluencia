import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { buscarResultados, listarProjetosDoOrgao } from '../api'
import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { MOCK_ORGAO_ID } from '../mock'
import { MOCK_POSTS } from '../../feed/mock'
import { relatoTemPagina } from '../origem'
import { hojeIso, situacaoDoMarco } from '../timeline'
import { ETAPAS_PUBLICAS, dataLocal, indiceEtapa, proximoMarco } from '../etapas'
import { fotoDoProjeto } from '../fotos'
import { CATEGORIA_RGB } from '../../feed/cores'
import IconeCategoria from '../../feed/components/IconeCategoria'
import StatusBadge from '../../../components/StatusBadge'
import VotoBar from '../components/VotoBar'
import AtualizacaoForm from '../components/AtualizacaoForm'
import { CATEGORIAS, STATUS_LABELS, type Categoria, type Projeto, type ProjetoStatus, type VotosResultado } from '../../../types/database'

gsap.registerPlugin(useGSAP)

// Painel do órgão (v2, Semana 5). O gestor não é um morador com mais botões:
// aqui ele vê o que pede ação — a fila de relatos do Feed sem resposta, as
// consultas abertas, os marcos atrasados — e publica atualizações dos projetos
// do próprio órgão (inclusive os rejeitados, que a população não vê).
// Protegido por RequireInstitutional em App.tsx + RLS no banco.

interface RelatoNaFila {
  id: string
  categoria: Categoria
  bairro: string
  descricao: string
  repercussao: number
  created_at: string
}

async function carregarFila(): Promise<RelatoNaFila[]> {
  if (!isSupabaseConfigured) {
    return MOCK_POSTS.slice(0, 5).map((p) => ({ ...p, repercussao: p.repercussao ?? 0 }))
  }
  const { data, error } = await supabase
    .from('posts_repercussao')
    .select('id, categoria, bairro, descricao, repercussao, created_at')
    .is('status_oficial', null)
    .order('repercussao', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(6)
  if (error) throw new Error(error.message)
  return data ?? []
}

const FILTROS: { valor: ProjetoStatus | 'todos' | 'atencao'; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'atencao', rotulo: 'Pedem atenção' },
  ...ETAPAS_PUBLICAS.map((e) => ({ valor: e.status, rotulo: STATUS_LABELS[e.status] })),
  { valor: 'rejeitado', rotulo: 'Rejeitados' },
]

const quando = (iso: string) => {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`
}

export default function PainelGestorPage() {
  const { user, profile } = useAuth()
  const orgaoId = isSupabaseConfigured ? user?.id : MOCK_ORGAO_ID
  const orgaoNome = profile?.orgao_nome ?? (isSupabaseConfigured ? 'Seu órgão' : 'Prefeitura do Recife (demonstração)')
  const [hoje] = useState(hojeIso)
  const raiz = useRef<HTMLDivElement>(null)

  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [resultados, setResultados] = useState<Record<string, VotosResultado>>({})
  const [fila, setFila] = useState<RelatoNaFila[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['valor']>('todos')
  // Aviso que pode chegar do formulário de criar projeto (ex.: relato de origem não marcado).
  const location = useLocation()
  const [aviso, setAviso] = useState<string | null>(() => (location.state as { aviso?: string } | null)?.aviso ?? null)

  useEffect(() => {
    if (!orgaoId) return
    let cancelado = false
    async function carregar(id: string) {
      try {
        const lista = await listarProjetosDoOrgao(id)
        const res = await buscarResultados(lista.map((p) => p.id))
        if (cancelado) return
        setProjetos(lista)
        setResultados(res)
      } catch (err) {
        if (!cancelado) setErro(err instanceof Error ? err.message : 'erro desconhecido')
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }
    carregar(orgaoId)
    carregarFila()
      .then((f) => !cancelado && setFila(f))
      .catch(() => !cancelado && setFila([]))
    return () => {
      cancelado = true
    }
  }, [orgaoId])

  const atrasadosDe = (p: Projeto) => p.timeline.filter((m) => situacaoDoMarco(m, hoje).situacao === 'atrasado').length
  const pedeAtencao = (p: Projeto) => atrasadosDe(p) > 0 || p.status === 'em_consulta'

  const totalVotos = Object.values(resultados).reduce((s, r) => s + r.total_votos, 0)
  const numeros = [
    { valor: projetos.filter((p) => p.status === 'em_consulta').length, rotulo: 'em consulta', frase: 'a população está votando' },
    { valor: totalVotos, rotulo: totalVotos === 1 ? 'voto' : 'votos', frase: totalVotos === 1 ? 'recebido nas consultas' : 'recebidos nas consultas' },
    { valor: projetos.reduce((s, p) => s + atrasadosDe(p), 0), rotulo: 'marcos atrasados', frase: 'precisam de data nova', alerta: true },
    { valor: fila?.length ?? 0, rotulo: 'relatos', frase: 'esperando resposta no Feed', mais: (fila?.length ?? 0) >= 6 },
  ]

  const visiveis = projetos.filter((p) =>
    filtro === 'todos' ? true : filtro === 'atencao' ? pedeAtencao(p) : p.status === filtro,
  )

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.from('[data-anim]', { y: 18, opacity: 0, stagger: 0.07, duration: 0.7, ease: 'power3.out' })
    },
    { scope: raiz },
  )

  function aoPublicar(atualizado: Projeto) {
    setProjetos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)))
    setEditando(null)
    setAviso(`Atualização publicada em "${atualizado.nome}".`)
  }

  return (
    <div ref={raiz} className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      {/* Cabeçalho: quem está no comando */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p data-anim className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-status-azul-700">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" strokeLinejoin="round" />
              <path d="m8.5 12 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Órgão verificado · {orgaoNome}
          </p>
          <h1 data-anim className="mt-2 font-heading text-5xl font-extrabold leading-none text-grafite-900 sm:text-6xl">
            Painel do órgão
          </h1>
          <p data-anim className="mt-3 max-w-xl text-[15px] text-grafite-700">
            O que a cidade está pedindo e como andam os projetos de vocês. Atualizar aqui avisa quem acompanha.
          </p>
        </div>
        <Link
          data-anim
          to="/projetos/novo"
          className="inline-flex items-center gap-2 rounded-full bg-grafite-900 px-6 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          <span className="text-lg leading-none text-amarelo-500">+</span> Novo projeto
        </Link>
      </header>

      {erro ? (
        <div className="mt-10 rounded-[28px] bg-status-vermelho-50 p-6 text-sm text-status-vermelho-700">
          Não foi possível carregar seus projetos: {erro}
        </div>
      ) : (
        <>
          {/* Números do órgão */}
          <dl data-anim className="mt-10 grid grid-cols-2 border-t-2 border-grafite-900 lg:grid-cols-4">
            {numeros.map((n) => (
              <div key={n.rotulo} className="border-b border-grafite-200 py-5 pr-4 odd:border-r odd:pr-4 even:pl-4 lg:border-b-0 lg:border-r lg:py-6 lg:pr-6 lg:last:border-r-0 lg:[&:not(:first-child)]:pl-6">
                <dt className="sr-only">{n.rotulo}</dt>
                <dd>
                  <span
                    className={`font-heading text-5xl font-extrabold sm:text-6xl leading-none tracking-[-0.03em] ${
                      n.alerta && n.valor > 0 ? 'text-status-vermelho-700' : 'text-grafite-900'
                    }`}
                  >
                    {carregando ? '–' : n.valor.toLocaleString('pt-BR')}
                    {n.mais && <span className="text-3xl">+</span>}
                  </span>
                  <span className="mt-2 block text-xs font-bold uppercase tracking-[0.12em] text-grafite-900">{n.rotulo}</span>
                  <span className="font-serif text-[15px] italic text-grafite-500">{n.frase}</span>
                </dd>
              </div>
            ))}
          </dl>

          {aviso && (
            <motion.p
              role="status"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 rounded-2xl bg-status-verde-50 p-4 text-sm font-semibold text-status-verde-700"
            >
              {aviso}
            </motion.p>
          )}

          <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Projetos do órgão */}
            <section aria-labelledby="titulo-projetos" className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="titulo-projetos" className="font-heading text-2xl font-extrabold text-grafite-900">
                  Projetos de vocês
                </h2>
                <span className="text-sm text-grafite-500">
                  {projetos.length} {projetos.length === 1 ? 'projeto' : 'projetos'}
                </span>
              </div>
              <div role="radiogroup" aria-label="Filtrar projetos" className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                {FILTROS.map((f) => {
                  const ativo = filtro === f.valor
                  const qtd =
                    f.valor === 'todos' ? projetos.length : f.valor === 'atencao' ? projetos.filter(pedeAtencao).length : projetos.filter((p) => p.status === f.valor).length
                  return (
                    <button
                      key={f.valor}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => setFiltro(f.valor)}
                      className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                        ativo ? 'text-grafite-900' : 'text-grafite-500 hover:text-grafite-900'
                      }`}
                    >
                      {ativo && (
                        <motion.span layoutId="filtro-painel" className="absolute inset-0 rounded-full bg-amarelo-500" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                      )}
                      <span className="relative">
                        {f.rotulo} <span className="opacity-60">{qtd}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {carregando ? (
                <ul className="mt-6 space-y-4" aria-busy>
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="h-36 animate-pulse rounded-[28px] bg-grafite-100" />
                  ))}
                </ul>
              ) : projetos.length === 0 ? (
                <div className="mt-6 rounded-[28px] border-2 border-dashed border-grafite-200 px-6 py-14 text-center">
                  <p className="font-heading text-xl font-bold text-grafite-900">Nenhum projeto publicado ainda</p>
                  <p className="mt-1 text-sm text-grafite-500">Comece por um relato da fila ao lado, ou crie do zero.</p>
                  <Link to="/projetos/novo" className="mt-5 inline-flex rounded-full bg-amarelo-500 px-5 py-2.5 text-sm font-bold text-grafite-900">
                    Publicar o primeiro
                  </Link>
                </div>
              ) : visiveis.length === 0 ? (
                <p className="mt-6 rounded-[28px] bg-grafite-50 px-6 py-10 text-center text-sm text-grafite-500">Nenhum projeto neste filtro.</p>
              ) : (
                <ul className="mt-6 space-y-4">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {visiveis.map((p) => (
                      <LinhaProjeto
                        key={p.id}
                        projeto={p}
                        resultado={resultados[p.id]}
                        atrasados={atrasadosDe(p)}
                        aberto={editando === p.id}
                        onAlternar={() => {
                          setAviso(null)
                          setEditando(editando === p.id ? null : p.id)
                        }}
                        onPublicada={aoPublicar}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </section>

            {/* Fila do Feed */}
            <aside aria-labelledby="titulo-fila" className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-[28px] bg-grafite-900 p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-500">Fila do Feed</p>
                <h2 id="titulo-fila" className="mt-1 font-heading text-2xl font-extrabold">Esperando resposta</h2>
                <p className="mt-1 text-sm text-white/60">Os relatos com mais apoio e recorrência, ainda sem resposta oficial.</p>
                {fila === null ? (
                  <ul className="mt-5 space-y-3" aria-busy>
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="h-20 animate-pulse rounded-2xl bg-white/10" />
                    ))}
                  </ul>
                ) : fila.length === 0 ? (
                  <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm">Nenhum relato sem resposta. A fila está em dia.</p>
                ) : (
                  <ol className="mt-5 space-y-3">
                    {fila.map((r, i) => {
                      const [cr, cg, cb] = CATEGORIA_RGB[r.categoria]
                      return (
                        <motion.li
                          key={r.id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + i * 0.06 }}
                          className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10"
                        >
                          <div className="flex items-start gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `rgb(${cr} ${cg} ${cb})` }}>
                              <IconeCategoria categoria={r.categoria} size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs text-white/60">
                                {r.bairro} · {quando(r.created_at)}
                                {r.repercussao > 0 && <> · <b className="text-amarelo-500">{r.repercussao} de repercussão</b></>}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-sm">{r.descricao}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2 pl-12">
                            {relatoTemPagina(r.id) || !isSupabaseConfigured ? (
                              <Link to={`/feed/${r.id}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-grafite-900">
                                Responder
                              </Link>
                            ) : null}
                            <Link to={`/projetos/novo?origem=${r.id}`} className="rounded-full px-3 py-1.5 text-xs font-bold text-amarelo-500 ring-1 ring-amarelo-500/50">
                              Virar projeto
                            </Link>
                          </div>
                        </motion.li>
                      )
                    })}
                  </ol>
                )}
                <Link to="/feed" className="mt-5 inline-block text-sm font-semibold text-white/70 hover:text-white">
                  Ver o Feed inteiro →
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

// Um projeto do órgão: capa, onde está no trilho, votos, próximo marco e a ação.
function LinhaProjeto({
  projeto: p,
  resultado,
  atrasados,
  aberto,
  onAlternar,
  onPublicada,
}: {
  projeto: Projeto
  resultado?: VotosResultado
  atrasados: number
  aberto: boolean
  onAlternar: () => void
  onPublicada: (p: Projeto) => void
}) {
  const rejeitado = p.status === 'rejeitado'
  const [r, g, b] = CATEGORIA_RGB[p.categoria]
  const foto = fotoDoProjeto(p.id)
  const etapa = indiceEtapa(p.status)
  const marco = proximoMarco(p)
  const categoria = CATEGORIAS.find((c) => c.value === p.categoria)?.label ?? p.categoria

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={`overflow-hidden rounded-[28px] border bg-white ${rejeitado ? 'border-status-vermelho-500/50' : 'border-grafite-200'}`}
    >
      <div className="flex flex-col sm:flex-row">
        <Link
          to={`/projetos/${p.id}`}
          className="relative block h-32 shrink-0 overflow-hidden sm:h-auto sm:w-44"
          style={{ background: `rgb(${r} ${g} ${b})` }}
          aria-label={`Abrir ${p.nome}`}
        >
          {foto ? (
            <img src={foto.url} alt="" loading="lazy" className={`h-full w-full object-cover ${rejeitado ? 'grayscale' : ''}`} />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-white/90">
              <span className="absolute inset-0 opacity-25 [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:18px_18px]" />
              <IconeCategoria categoria={p.categoria} size={40} />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-grafite-500">{categoria}</p>
              <Link to={`/projetos/${p.id}`} className="font-heading text-lg font-extrabold leading-tight text-grafite-900 hover:underline">
                {p.nome}
              </Link>
            </div>
            <StatusBadge status={p.status} />
          </div>

          {rejeitado ? (
            <p className="mt-3 text-sm font-semibold text-status-vermelho-700">Rejeitado. Só o órgão vê este projeto.</p>
          ) : (
            <ol className="mt-4 flex gap-1" aria-label={`Etapa: ${STATUS_LABELS[p.status]}`}>
              {ETAPAS_PUBLICAS.map((e, i) => (
                <li key={e.status} className="flex-1">
                  <span className={`block h-1.5 rounded-full ${i <= etapa ? 'bg-amarelo-500' : 'bg-grafite-200'}`} />
                  <span className={`mt-1 hidden text-[11px] sm:block ${i === etapa ? 'font-bold text-grafite-900' : 'text-grafite-500'}`}>{e.label}</span>
                </li>
              ))}
            </ol>
          )}

          {(p.status === 'em_consulta' || (resultado && resultado.total_votos > 0)) && (
            <VotoBar className="mt-4" favor={resultado?.votos_favor ?? 0} contra={resultado?.votos_contra ?? 0} />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-grafite-500">
            {atrasados > 0 && (
              <span className="rounded-full bg-status-vermelho-50 px-2.5 py-1 font-bold text-status-vermelho-700">
                {atrasados} {atrasados === 1 ? 'marco atrasado' : 'marcos atrasados'}
              </span>
            )}
            {marco && (
              <span>
                Próximo: <b className="text-grafite-900">{marco.nome}</b>,{' '}
                {dataLocal(marco.data_prevista).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            {p.origem_post_id && relatoTemPagina(p.origem_post_id) && (
              <Link to={`/feed/${p.origem_post_id}`} className="font-semibold text-amarelo-700 hover:underline">
                Nasceu de um relato
              </Link>
            )}
            <button
              type="button"
              onClick={onAlternar}
              aria-expanded={aberto}
              className={`ml-auto rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                aberto ? 'bg-grafite-100 text-grafite-900' : 'bg-amarelo-500 text-grafite-900 hover:bg-amarelo-300'
              }`}
            >
              {aberto ? 'Fechar' : 'Publicar atualização'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {aberto && (
          <div className="border-t border-grafite-200 px-5 pb-5">
            <AtualizacaoForm key={p.id} projeto={p} onPublicada={onPublicada} onCancelar={onAlternar} />
          </div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}
