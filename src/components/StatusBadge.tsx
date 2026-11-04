import type { ProjetoStatus } from '../types/database'
import { STATUS_LABELS } from '../types/database'

// Cores de status do design system v2.1 — "amarelo nunca é status de pendência".
const STATUS_STYLES: Record<ProjetoStatus, string> = {
  proposto: 'bg-status-terracota-50 text-status-terracota-700',
  em_consulta: 'bg-status-azul-50 text-status-azul-700',
  aprovado: 'bg-status-verde-50 text-status-verde-700',
  rejeitado: 'bg-status-vermelho-50 text-status-vermelho-700',
  em_execucao: 'bg-status-azul-50 text-status-azul-700',
  concluido: 'bg-status-verde-50 text-status-verde-700',
}

export default function StatusBadge({ status }: { status: ProjetoStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  )
}
