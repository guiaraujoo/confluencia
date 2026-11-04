import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { MOCK_PROJETOS } from '../mock'
import { avisarRelatoQueVirouProjeto, listarRelatosParaOrigem, type RelatoResumo } from '../origem'
import SeletorRelato from '../components/SeletorRelato'
import { Button, Card, FormError, Label, Select, TextArea, TextField } from '../../../components/ui'
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

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-grafite-900 mb-1">Novo projeto</h1>
      <p className="text-sm text-grafite-500 mb-6">
        Publique um projeto do seu órgão. Ele aparece para a população assim que for salvo.
      </p>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Nome do projeto</Label>
            <TextField
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Requalificação da Av. Norte"
            />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Status inicial</Label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as ProjetoStatus)}>
                {STATUS_INICIAIS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {status === 'em_consulta' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Label>Fim da consulta pública</Label>
                <TextField
                  type="date"
                  value={consultaFim}
                  min={hoje}
                  onChange={(e) => setConsultaFim(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <Label>Relato de origem (opcional)</Label>
            <p className="-mt-1 mb-2 text-xs text-grafite-500">
              Liga o projeto a um problema relatado no Feed. O relato passa a mostrar o projeto, e quem relatou é avisado.
            </p>
            <SeletorRelato
              relatos={relatos}
              valor={origemPostId}
              onMudar={setOrigemPostId}
              categoria={categoria}
              erroCarga={erroRelatos}
            />
          </div>

          <div>
            <Label>Marcos da linha do tempo</Label>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {marcos.map((marco, i) => (
                  <motion.div
                    key={marco.key}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex gap-2"
                  >
                    <TextField
                      value={marco.nome}
                      onChange={(e) => updateMarco(i, { nome: e.target.value })}
                      placeholder="Ex: Licitação"
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
                        className="px-2 text-grafite-500 hover:text-status-vermelho-500"
                        aria-label={`Remover marco ${i + 1}`}
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={() => setMarcos((prev) => [...prev, novoMarco()])}
              className="mt-2 text-sm font-semibold text-amarelo-700 hover:underline"
            >
              + Adicionar marco
            </button>
          </div>

          {error && <FormError>{error}</FormError>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Publicando...' : 'Publicar projeto'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
