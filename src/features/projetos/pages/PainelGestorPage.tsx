import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MOCK_PROJETOS } from '../mock'
import { Card } from '../../../components/ui'
import StatusBadge from '../../../components/StatusBadge'
import type { ProjetoStatus } from '../../../types/database'

// Contadores do topo (wireframe, seção 4): o que o gestor precisa olhar primeiro.
const RESUMO: { status: ProjetoStatus; label: string; cor: string }[] = [
  { status: 'em_consulta', label: 'Em consulta', cor: 'text-status-azul-700' },
  { status: 'em_execucao', label: 'Em execução', cor: 'text-status-azul-700' },
  { status: 'rejeitado', label: 'Rejeitados', cor: 'text-status-vermelho-700' },
]

// Tarefa 4.2 da Ana (esqueleto na Semana 2, completo na Semana 3): painel de
// gestor — só visível para contas institucionais verificadas (Guilherme,
// Tarefa 3.2). Mostra todos os projetos do órgão, inclusive rejeitados.
export default function PainelGestorPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-grafite-900">Painel de gestor</h1>
          <p className="text-sm text-grafite-500">
            Projetos do seu órgão — inclusive os rejeitados, que não aparecem na visão pública.
          </p>
        </div>
        <Link
          to="/projetos/novo"
          className="rounded-[var(--radius-field)] bg-amarelo-500 px-5 py-2.5 text-sm font-semibold text-grafite-900 hover:bg-amarelo-300 transition-colors"
        >
          + Novo projeto
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {RESUMO.map((r) => (
          <Card key={r.status}>
            <p className={`font-heading text-2xl font-bold ${r.cor}`}>
              {MOCK_PROJETOS.filter((p) => p.status === r.status).length}
            </p>
            <p className="text-xs text-grafite-500">{r.label}</p>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        {MOCK_PROJETOS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={`/projetos/${p.id}`}>
              <Card className="flex items-center justify-between gap-3 hover:border-amarelo-500 transition-colors">
                <div>
                  <p className="font-medium text-sm text-grafite-900">{p.nome}</p>
                  {p.status === 'rejeitado' && (
                    <p className="text-xs text-status-vermelho-500 mt-0.5">
                      Rejeitado na consulta pública — não visível ao público
                    </p>
                  )}
                </div>
                <StatusBadge status={p.status} />
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
