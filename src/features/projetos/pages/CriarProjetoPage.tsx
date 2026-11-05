import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { MOCK_PROJETOS } from '../mock'
import { avisarRelatoQueVirouProjeto, listarRelatosParaOrigem, type RelatoResumo } from '../origem'
import SeletorRelato from '../components/SeletorRelato'
import { FormError, Label, TextArea, TextField } from '../../../components/ui'
import StatusBadge from '../../../components/StatusBadge'
import IconeCategoria from '../../feed/components/IconeCategoria'
import { CATEGORIA_RGB } from '../../feed/cores'
import {
  CATEGORIAS,
  STATUS_LABELS,
  type Categoria,
  type MarcoTimeline,
  type ProjetoStatus,
} from '../../../types/database'

// Tarefa 1.1 (wireframe) → 2.x da Ana: formulário de criar projeto.
// Cada campo corresponde a uma coluna de `projetos` (ver docs/wireframes-projetos-perfil.md
// e docs/contrato-de-dados.md). Protegido por RequireInstitutional em App.tsx; o RLS
// "projetos: so institucional verificado cria" é quem garante isso de verdade.
// Tarefa 4.1: o "Relato de origem" é escolhido por busca (SeletorRelato), lendo os
// relatos por ../origem.ts (reais com Supabase, MOCK_POSTS sem). Também chega
// pronto pela URL: o botão "Criar projeto a partir deste relato", no detalhe do
// relato, abre /projetos/novo?origem=<id do post>.

// Na criação, só faz sentido nascer proposto ou já em consulta; os outros
// status mudam depois, pelo painel de gestor.
const STATUS_INICIAIS: ProjetoStatus[] = ['proposto', 'em_consulta']

// `key` é só da tela (animação ao remover marco do meio), não vai pro banco.
type MarcoForm = Pick<MarcoTimeline, 'nome' | 'data_prevista'> & { key: string }

const novoMarco = (): MarcoForm => ({ key: crypto.randomUUID(), nome: '', data_prevista: '' })

export default function CriarProjetoPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<Categoria>('mobilidade')
  const [status, setStatus] = useState<ProjetoStatus>('proposto')
  const [consultaFim, setConsultaFim] = useState('')
  const [origemPostId, setOrigemPostId] = useState(() => params.get('origem') ?? '')
  const [marcos, setMarcos] = useState<MarcoForm[]>(() => [novoMarco()])
  const [relatos, setRelatos] = useState<RelatoResumo[] | null>(null)
  const [erroRelatos, setErroRelatos] = useState<string | null>(null)
  // data mínima da consulta, calculada uma vez (não a cada render)
  const [hoje] = useState(() => new Date().toISOString().slice(0, 10))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    listarRelatosParaOrigem()
      .then((lista) => {
        if (cancelled) return
        setRelatos(lista)
        // Veio pela URL com a categoria do relato: o projeto já nasce na mesma categoria.
        const daUrl = lista.find((r) => r.id === params.get('origem'))
        if (daUrl) setCategoria(daUrl.categoria)
      })
      .catch((err) => {
        if (!cancelled) setErroRelatos(err instanceof Error ? err.message : 'erro desconhecido')
      })
    return () => {
      cancelled = true
    }
  }, [params])

  function updateMarco(index: number, patch: Partial<MarcoForm>) {
    setMarcos((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nome.trim() || !descricao.trim()) {
      setError('Preencha o nome e a descrição do projeto.')
      return
    }
    if (status === 'em_consulta' && !consultaFim) {
      setError('Informe até quando a consulta pública fica aberta.')
      return
    }
    // Marco totalmente vazio é ignorado; marco pela metade é erro.
    const preenchidos = marcos.filter((m) => m.nome.trim() || m.data_prevista)
    if (preenchidos.some((m) => !m.nome.trim() || !m.data_prevista)) {
      setError('Cada marco da linha do tempo precisa de nome e data prevista.')
      return
    }
    const timeline = preenchidos.map((m) => ({
      nome: m.nome.trim(),
      data_prevista: m.data_prevista,
      data_real: null,
    }))
    // fim do dia escolhido, no fuso de quem preencheu
    const consultaFimIso = status === 'em_consulta' ? new Date(`${consultaFim}T23:59:59`).toISOString() : null

    // Modo demonstração (Tarefa 2.3: "Publicar pode só simular sucesso"): sem Supabase
    // configurado, o projeto entra na lista mock e some ao recarregar a página.
    if (!isSupabaseConfigured) {
      MOCK_PROJETOS.unshift({
        id: crypto.randomUUID(),
        orgao_id: 'mock-orgao-1',
        nome: nome.trim(),
        descricao: descricao.trim(),
        categoria,
        status,
        origem_post_id: origemPostId || null,
        timeline,
        consulta_fim: consultaFimIso,
        created_at: new Date().toISOString(),
      })
      navigate('/painel')
      return
    }

    if (!user) {
      setError('Você precisa estar logado para publicar um projeto.')
      return
    }

    setLoading(true)
    const { data: criado, error: insertError } = await supabase.from('projetos').insert({
      orgao_id: user.id,
      nome: nome.trim(),
      descricao: descricao.trim(),
      categoria,
      status,
      origem_post_id: origemPostId || null,
      timeline,
      consulta_fim: consultaFimIso,
    }).select('id').single()

    if (insertError || !criado) {
      setLoading(false)
      setError(`Não foi possível salvar: ${insertError?.message ?? 'resposta vazia do servidor'}`)
      return
    }

    // Caminho de volta (Tarefa 4.1): o relato recebe a resposta "Virou projeto",
    // e o autor é notificado pelo gatilho da 0008.
    let avisoRelato = true
    if (origemPostId) {
      avisoRelato = await avisarRelatoQueVirouProjeto({
        postId: origemPostId,
        projetoId: criado.id,
        orgaoId: user.id,
        nomeProjeto: nome.trim(),
      })
    }
    setLoading(false)

    navigate('/painel', {
      state: avisoRelato
        ? null
        : { aviso: 'Projeto publicado. Não foi possível marcar o relato de origem como "Virou projeto"; responda no relato pelo Feed.' },
    })
  }

  const [cr, cg, cb] = CATEGORIA_RGB[categoria]
  const categoriaRotulo = CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria
  const marcosPreenchidos = marcos.filter((m) => m.nome.trim())
  const relatoEscolhido = relatos?.find((r) => r.id === origemPostId)

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <Link to="/painel" className="text-sm font-semibold text-grafite-500 hover:text-grafite-900">
        ← Painel do órgão
      </Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-status-azul-700">Novo projeto</p>
      <h1 className="mt-2 font-heading text-4xl font-extrabold leading-none text-grafite-900 sm:text-5xl">
        O que a cidade vai ganhar?
      </h1>
      <p className="mt-3 max-w-xl text-[15px] text-grafite-700">
        O projeto aparece para a população assim que for publicado. Ao lado, você vê como ele vai ficar.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={handleSubmit} className="min-w-0 space-y-10">
          <Secao numero={1} titulo="O projeto">
            <div className="space-y-5">
              <div>
                <Label>Nome do projeto</Label>
                <TextField value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Requalificação da Av. Norte" maxLength={120} />
              </div>
              <div>
                <Label>Descrição</Label>
                <TextArea
                  rows={4}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="O que será feito, onde e qual o benefício esperado."
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <div role="radiogroup" aria-label="Categoria" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {CATEGORIAS.map((c) => {
                    const ativa = categoria === c.value
                    const [r, g, b] = CATEGORIA_RGB[c.value]
                    return (
                      <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={ativa}
                        onClick={() => setCategoria(c.value)}
                        className={`flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                          ativa ? 'border-grafite-900 bg-white text-grafite-900' : 'border-grafite-200 bg-white text-grafite-700 hover:border-grafite-300'
                        }`}
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white" style={{ background: `rgb(${r} ${g} ${b})` }}>
                          <IconeCategoria categoria={c.value} size={16} />
                        </span>
                        <span className="leading-tight">{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </Secao>

          <Secao numero={2} titulo="Como ele começa">
            <div role="radiogroup" aria-label="Status inicial" className="grid gap-3 sm:grid-cols-2">
              {STATUS_INICIAIS.map((s) => {
                const ativo = status === s
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setStatus(s)}
                    className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                      ativo ? 'border-amarelo-500 bg-amarelo-100/60' : 'border-grafite-200 bg-white hover:border-grafite-300'
                    }`}
                  >
                    <span className="block font-heading text-base font-extrabold text-grafite-900">{STATUS_LABELS[s]}</span>
                    <span className="mt-1 block text-sm text-grafite-500">
                      {s === 'proposto'
                        ? 'A população acompanha, mas ainda não vota.'
                        : 'Abre a votação pública até a data que você escolher.'}
                    </span>
                  </button>
                )
              })}
            </div>
            <AnimatePresence initial={false}>
              {status === 'em_consulta' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <Label>Fim da consulta pública</Label>
                    <TextField type="date" value={consultaFim} min={hoje} onChange={(e) => setConsultaFim(e.target.value)} className="max-w-[220px]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Secao>

          <Secao numero={3} titulo="Nasceu de um relato?" opcional>
            <p className="-mt-1 mb-3 text-sm text-grafite-500">
              Liga o projeto a um problema relatado no Feed. O relato passa a mostrar o projeto, e quem relatou é avisado.
            </p>
            <SeletorRelato relatos={relatos} valor={origemPostId} onMudar={setOrigemPostId} categoria={categoria} erroCarga={erroRelatos} />
          </Secao>

          <Secao numero={4} titulo="Linha do tempo">
            <ol className="relative space-y-3 border-l-2 border-dashed border-grafite-200 pl-5">
              <AnimatePresence initial={false}>
                {marcos.map((marco, i) => (
                  <motion.li
                    key={marco.key}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="relative flex gap-2"
                  >
                    <span aria-hidden className="absolute -left-[27px] top-3.5 h-3 w-3 rounded-full border-2 border-white bg-amarelo-500 ring-2 ring-amarelo-500/30" />
                    <TextField
                      value={marco.nome}
                      onChange={(e) => updateMarco(i, { nome: e.target.value })}
                      placeholder={i === 0 ? 'Ex: Projeto técnico' : 'Ex: Licitação'}
                      aria-label={`Nome do marco ${i + 1}`}
                    />
                    <TextField
                      type="date"
                      value={marco.data_prevista}
                      onChange={(e) => updateMarco(i, { data_prevista: e.target.value })}
                      className="max-w-[170px]"
                      aria-label={`Data prevista do marco ${i + 1}`}
                    />
                    {marcos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setMarcos((prev) => prev.filter((_, j) => j !== i))}
                        className="px-2 text-xl text-grafite-500 hover:text-status-vermelho-500"
                        aria-label={`Remover marco ${i + 1}`}
                      >
                        ×
                      </button>
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
            <button
              type="button"
              onClick={() => setMarcos((prev) => [...prev, novoMarco()])}
              className="mt-3 rounded-full px-4 py-2 text-sm font-bold text-amarelo-700 ring-1 ring-amarelo-500/50 hover:bg-amarelo-100/60"
            >
              + Adicionar marco
            </button>
          </Secao>

          {error && <FormError>{error}</FormError>}
          <div className="flex flex-wrap items-center gap-4 border-t border-grafite-200 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-grafite-900 px-7 py-3.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {loading ? 'Publicando…' : 'Publicar projeto'}
            </button>
            <Link to="/painel" className="text-sm font-semibold text-grafite-500 hover:text-grafite-900">
              Cancelar
            </Link>
          </div>
        </form>

        {/* Prévia: o card como a população vai ver */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Prévia do projeto">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-grafite-500">Prévia para a população</p>
          <div className="overflow-hidden rounded-[28px] border border-grafite-200 bg-white shadow-[0_28px_50px_-30px_rgba(27,24,19,0.45)]">
            <motion.div
              className="relative grid h-36 place-items-center text-white"
              animate={{ backgroundColor: `rgb(${cr}, ${cg}, ${cb})` }}
              transition={{ duration: 0.4 }}
            >
              <span className="absolute inset-0 opacity-25 [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:18px_18px]" />
              <IconeCategoria categoria={categoria} size={44} />
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-grafite-900">{categoriaRotulo}</span>
            </motion.div>
            <div className="p-5">
              <StatusBadge status={status} />
              <p className={`mt-3 font-heading text-xl font-extrabold leading-tight ${nome.trim() ? 'text-grafite-900' : 'text-grafite-300'}`}>
                {nome.trim() || 'Nome do projeto'}
              </p>
              <p className={`mt-2 line-clamp-3 text-sm ${descricao.trim() ? 'text-grafite-700' : 'text-grafite-300'}`}>
                {descricao.trim() || 'A descrição aparece aqui.'}
              </p>
              {status === 'em_consulta' && (
                <p className="mt-4 rounded-2xl bg-status-azul-50 px-3 py-2 text-xs font-bold text-status-azul-700">
                  {consultaFim
                    ? `Votação aberta até ${new Date(`${consultaFim}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`
                    : 'Escolha até quando a votação fica aberta'}
                </p>
              )}
              {relatoEscolhido && (
                <p className="mt-3 text-xs text-grafite-500">
                  Nasceu de um relato em <b className="text-grafite-900">{relatoEscolhido.bairro}</b>
                </p>
              )}
              {marcosPreenchidos.length > 0 && (
                <ol className="mt-4 space-y-1.5 border-t border-grafite-200 pt-4 text-xs">
                  {marcosPreenchidos.map((m) => (
                    <li key={m.key} className="flex justify-between gap-3">
                      <span className="text-grafite-900">{m.nome}</span>
                      <span className="text-grafite-500">
                        {m.data_prevista
                          ? new Date(`${m.data_prevista}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                          : 'sem data'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Secao({ numero, titulo, opcional, children }: { numero: number; titulo: string; opcional?: boolean; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-baseline gap-3 font-heading text-xl font-extrabold text-grafite-900">
        <span className="font-serif text-2xl font-normal italic text-amarelo-700">{numero}.</span>
        {titulo}
        {opcional && <span className="text-xs font-semibold text-grafite-500">opcional</span>}
      </h2>
      {children}
    </section>
  )
}
