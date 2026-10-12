import { motion } from 'framer-motion'
import type { Projeto, ProjetoStatus } from '../../../types/database'
import StatusBadge from '../../../components/StatusBadge'

// Tarefa 1.1 da Ana (passo 4 do wireframe): espaço de destaque para o status
// do projeto, primeiro bloco do detalhe. Só cores de status do design system —
// amarelo nunca indica status.
const ETAPAS: { status: ProjetoStatus; label: string }[] = [
  { status: 'proposto', label: 'Proposto' },
  { status: 'em_consulta', label: 'Consulta' },
  { status: 'aprovado', label: 'Aprovado' },
  { status: 'em_execucao', label: 'Execução' },
  { status: 'concluido', label: 'Concluído' },
]

// Rejeitado não tem etapa própria no trilho: para na consulta, em vermelho.
function etapaAtual(status: ProjetoStatus) {
  return status === 'rejeitado' ? 1 : ETAPAS.findIndex((e) => e.status === status)
}

function contexto(projeto: Projeto): string {
  const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
  switch (projeto.status) {
    case 'proposto':
      return 'Aguardando abertura da consulta pública.'
    case 'em_consulta':
      return projeto.consulta_fim ? `Consulta aberta até ${data(projeto.consulta_fim)}.` : 'Consulta aberta.'
    case 'aprovado':
      return 'Aprovado na consulta pública, aguardando início da execução.'
    case 'rejeitado':
      return 'Rejeitado na consulta pública.'
    case 'em_execucao': {
      const proximo = projeto.timeline.find((m) => !m.data_real)
      return proximo
        ? `Próxima etapa: ${proximo.nome} (previsto ${data(proximo.data_prevista)}).`
        : 'Obra em andamento.'
    }
    case 'concluido':
      return 'Obra entregue.'
  }
}

export default function StatusDestaque({ projeto }: { projeto: Projeto }) {
  const atual = etapaAtual(projeto.status)
  const rejeitado = projeto.status === 'rejeitado'
  const cor = rejeitado ? 'bg-status-vermelho-500' : 'bg-status-verde-500'

  return (
    <div
      className={`rounded-[var(--radius-card)] border-2 p-5 ${
        rejeitado ? 'border-status-vermelho-500 bg-status-vermelho-50' : 'border-grafite-200 bg-white'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-grafite-500 mb-2">Status do projeto</p>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <StatusBadge status={projeto.status} />
        <p className="text-sm text-grafite-700">{contexto(projeto)}</p>
      </div>

      <ol className="flex items-start">
        {ETAPAS.map((etapa, i) => {
          const feita = i <= atual
          return (
            <li key={etapa.status} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <span className="absolute top-[5px] right-1/2 w-full h-0.5 bg-grafite-200">
                  {feita && (
                    <motion.span
                      className={`block h-full ${cor}`}
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: i * 0.1, duration: 0.25 }}
                    />
                  )}
                </span>
              )}
              <motion.span
                className={`relative h-3 w-3 rounded-full ${feita ? cor : 'bg-grafite-300'} ${
                  i === atual ? 'ring-4 ring-white' : ''
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 400 }}
              />
              <span
                className={`mt-2 text-[11px] text-center ${
                  i === atual ? 'font-semibold text-grafite-900' : 'text-grafite-500'
                }`}
              >
                {rejeitado && i === atual ? 'Rejeitado' : etapa.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
