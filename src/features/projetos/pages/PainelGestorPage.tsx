import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { buscarResultados, listarProjetosDoOrgao } from '../api'
import { isSupabaseConfigured } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { MOCK_ORGAO_ID } from '../mock'
import { relatoTemPagina } from '../origem'
import { hojeIso, situacaoDoMarco } from '../timeline'
import { Button, Card } from '../../../components/ui'
import StatusBadge from '../../../components/StatusBadge'
import AtualizacaoForm from '../components/AtualizacaoForm'
import type { Projeto, ProjetoStatus, VotosResultado } from '../../../types/database'

// Contadores do topo (wireframe, seção 4): o que o gestor precisa olhar primeiro.
const RESUMO: { status: ProjetoStatus; label: string; cor: string }[] = [
  { status: 'em_consulta', label: 'Em consulta', cor: 'text-status-azul-700' },
  { status: 'em_execucao', label: 'Em execução', cor: 'text-status-azul-700' },
  { status: 'rejeitado', label: 'Rejeitados', cor: 'text-status-vermelho-700' },
]

// Tarefa 3.2 da Ana: painel de gestor — só visível para contas institucionais
// verificadas (RequireInstitutional em App.tsx + RLS no banco). Lista só os
// projetos DO PRÓPRIO órgão, inclusive os rejeitados, e permite publicar
// atualização (concluir marco / mudar status).
export default function PainelGestorPage() {
  const { user } = useAuth()
  const orgaoId = isSupabaseConfigured ? user?.id : MOCK_ORGAO_ID
  const [hoje] = useState(hojeIso)

  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [resultados, setResultados] = useState<Record<string, VotosResultado>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  // Aviso que pode chegar do formulário de criar projeto (ex.: relato de origem não marcado).
  const location = useLocation()
  const [aviso, setAviso] = useState<string | null>(
    () => (location.state as { aviso?: string } | null)?.aviso ?? null,
  )

  useEffect(() => {
    if (!orgaoId) return
    let cancelled = false
    async function carregar(id: string) {
      try {
        const lista = await listarProjetosDoOrgao(id)
        const res = await buscarResultados(lista.map((p) => p.id))
        if (cancelled) return
        setProjetos(lista)
        setResultados(res)
      } catch (err) {
        if (!cancelled) setErro(err instanceof Error ? err.message : 'erro desconhecido')
      } finally {
        if (!cancelled) setCarregando(false)
      }
    }
    carregar(orgaoId)
    return () => {
      cancelled = true
    }
  }, [orgaoId])

  function aoPublicar(atualizado: Projeto) {
    setProjetos((prev) => prev.map((p) => (p.id === atualizado.id ? atualizado : p)))
    setEditando(null)
    setAviso(`Atualização publicada em "${atualizado.nome}".`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-grafite-900">Painel de gestor</h1>
          <p className="text-sm text-grafite-500">
            Projetos do seu órgão — inclusive os rejeitados, que não aparecem na visão pública.
          </p>
        </div>
        <Link
          to="/projetos/novo"
          className="self-start whitespace-nowrap rounded-[var(--radius-field)] bg-amarelo-500 px-5 py-2.5 text-sm font-semibold text-grafite-900 hover:bg-amarelo-300 transition-colors"
        >
          + Novo projeto
        </Link>
      </div>

      {erro ? (
        <div className="rounded-[var(--radius-field)] bg-status-vermelho-50 text-status-vermelho-700 text-sm p-4">
          Não foi possível carregar seus projetos: {erro}
        </div>
      ) : carregando ? (
        <p className="text-sm text-grafite-500">Carregando projetos...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {RESUMO.map((r) => (
              <Card key={r.status}>
                <p className={`font-heading text-2xl font-bold ${r.cor}`}>
                  {projetos.filter((p) => p.status === r.status).length}
                </p>
                <p className="text-xs text-grafite-500">{r.label}</p>
              </Card>
            ))}
          </div>

          {aviso && (
            <p
              role="status"
              className="rounded-[var(--radius-field)] bg-status-verde-50 text-status-verde-700 text-sm p-3 mb-4"
            >
              {aviso}
            </p>
          )}

          {projetos.length === 0 ? (
            <p className="text-sm text-grafite-500">
              Seu órgão ainda não publicou projetos.{' '}
              <Link to="/projetos/novo" className="font-semibold text-amarelo-700 hover:underline">
                Publicar o primeiro
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {projetos.map((p, i) => {
                const rejeitado = p.status === 'rejeitado'
                const res = resultados[p.id]
                const atrasados = p.timeline.filter((m) => situacaoDoMarco(m, hoje).situacao === 'atrasado').length
                const aberto = editando === p.id
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className={
                        rejeitado ? 'border-2 !border-status-vermelho-500 !bg-status-vermelho-50' : undefined
                      }
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/projetos/${p.id}`}
                            className="font-medium text-sm text-grafite-900 hover:underline"
                          >
                            {p.nome}
                          </Link>
                          {rejeitado && (
                            <p className="text-xs font-semibold text-status-vermelho-700 mt-1">
                              Rejeitado, não visível ao público
                            </p>
                          )}
                          <p className="text-xs text-grafite-500 mt-1">
                            {res && res.total_votos > 0
                              ? `${Math.round((res.votos_favor / res.total_votos) * 100)}% a favor · ${res.total_votos.toLocaleString('pt-BR')} ${
                                  res.total_votos === 1 ? 'voto' : 'votos'
                                }`
                              : 'Nenhum voto registrado'}
                            {atrasados > 0 &&
                              ` · ${atrasados} ${atrasados === 1 ? 'marco atrasado' : 'marcos atrasados'}`}
                          </p>
                          {p.origem_post_id && (
                            <p className="mt-1 text-xs text-grafite-500">
                              Nasceu de um relato do Feed
                              {relatoTemPagina(p.origem_post_id) && (
                                <>
                                  {' · '}
                                  <Link
                                    to={`/feed/${p.origem_post_id}`}
                                    className="font-semibold text-amarelo-700 hover:underline"
                                  >
                                    ver relato
                                  </Link>
                                </>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <StatusBadge status={p.status} />
                          <Button
                            variant="secondary"
                            className="!px-3 !py-1.5 !text-xs"
                            onClick={() => {
                              setAviso(null)
                              setEditando(aberto ? null : p.id)
                            }}
                          >
                            {aberto ? 'Fechar' : 'Publicar atualização'}
                          </Button>
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {aberto && (
                          <AtualizacaoForm
                            key={p.id}
                            projeto={p}
                            onPublicada={aoPublicar}
                            onCancelar={() => setEditando(null)}
                          />
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
