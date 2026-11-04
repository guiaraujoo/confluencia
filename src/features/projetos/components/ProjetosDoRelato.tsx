import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../../context/AuthContext'
import StatusBadge from '../../../components/StatusBadge'
import IconeCategoria from '../../feed/components/IconeCategoria'
import { listarProjetosDoRelato, type ProjetoDoRelato } from '../origem'

// Tarefa 4.1 da Ana, caminho oposto: no detalhe do RELATO, mostra se ele já
// gerou um projeto (com status e link). Para contas institucionais verificadas,
// oferece o atalho "Criar projeto a partir deste relato", que abre o formulário
// já com a origem preenchida.
export default function ProjetosDoRelato({ postId }: { postId: string }) {
  const { user, profile } = useAuth()
  const ehOrgao = Boolean(user && profile?.institucional_verificado)
  const [carga, setCarga] = useState<{ id: string; projetos: ProjetoDoRelato[] } | null>(null)
  const projetos = carga && carga.id === postId ? carga.projetos : null

  useEffect(() => {
    let cancelado = false
    listarProjetosDoRelato(postId)
      .then((lista) => !cancelado && setCarga({ id: postId, projetos: lista }))
      // Sem a tabela/permissão, a seção só não aparece: o relato continua funcionando.
      .catch(() => !cancelado && setCarga({ id: postId, projetos: [] }))
    return () => {
      cancelado = true
    }
  }, [postId])

  if (projetos === null) return null
  if (projetos.length === 0 && !ehOrgao) return null

  return (
    <section className="mt-16">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">Virou projeto?</p>

      {projetos.length > 0 ? (
        <>
          <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold text-grafite-900">
            {projetos.length === 1 ? 'Este relato virou um projeto' : `Este relato virou ${projetos.length} projetos`}
          </h2>
          <ul className="mt-6 space-y-3">
            {projetos.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to={`/projetos/${p.id}`}
                  className="group flex items-center gap-4 rounded-[28px] border border-status-verde-500/30 bg-status-verde-50 p-5 transition-colors hover:bg-white"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white text-status-verde-700">
                    <IconeCategoria categoria={p.categoria} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-heading text-lg font-extrabold leading-snug text-grafite-900 group-hover:underline">
                      {p.nome}
                    </span>
                    <span className="mt-1.5 block">
                      <StatusBadge status={p.status} />
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amarelo-500 text-lg text-grafite-900 transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
          {projetos.some((p) => p.status === 'em_consulta') && (
            <p className="mt-3 text-sm text-grafite-700">A consulta pública está aberta: abra o projeto para votar.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-grafite-500">Nenhum projeto nasceu deste relato ainda.</p>
      )}

      {ehOrgao && (
        <Link
          to={`/projetos/novo?origem=${encodeURIComponent(postId)}`}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-status-azul-700 px-5 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          + Criar projeto a partir deste relato
        </Link>
      )}
    </section>
  )
}
