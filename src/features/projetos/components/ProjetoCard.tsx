import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Projeto } from '../../../types/database'
import { Card } from '../../../components/ui'
import StatusBadge from '../../../components/StatusBadge'
import CategoryBadge from '../../../components/CategoryBadge'

// Tarefa 2.1 da Ana: componente reutilizável, usado na listagem de Projetos.
export default function ProjetoCard({ projeto }: { projeto: Projeto }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/projetos/${projeto.id}`}>
        <Card className="hover:border-amarelo-500 hover:shadow-md transition-[border-color,box-shadow] cursor-pointer h-full flex flex-col">
          <div className="mb-2">
            <CategoryBadge categoria={projeto.categoria} />
          </div>
          <h3 className="font-heading font-semibold text-grafite-900 text-sm mb-1">{projeto.nome}</h3>
          <p className="text-sm text-grafite-700 flex-1">{projeto.descricao}</p>
          <div className="mt-3 pt-3 border-t border-grafite-200 flex items-center justify-between gap-2">
            <StatusBadge status={projeto.status} />
            {projeto.status === 'em_consulta' && projeto.consulta_fim && (
              <span className="text-xs text-grafite-500">
                até {new Date(projeto.consulta_fim).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
