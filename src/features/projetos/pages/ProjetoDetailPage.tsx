import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MOCK_PROJETOS } from '../mock'
import { Button, Card } from '../../../components/ui'
import CategoryBadge from '../../../components/CategoryBadge'
import StatusDestaque from '../components/StatusDestaque'

// Tarefa 3.1 da Ana (Semana 3): tela completa com timeline + votação.
// A votação aqui é só a interface (UI) — o registro real do voto com hash e
// bloqueio de duplicidade é a Tarefa 3.1 do Guilherme (RLS na tabela `votos`,
// ver supabase/migrations/0004_rls_policies.sql), que ainda não existe num
// projeto Supabase real. Por isso o "comprovante" abaixo é só visual, gerado
// no navegador, não persiste em lugar nenhum ainda.
export default function ProjetoDetailPage() {
  const { id } = useParams()
  const projeto = MOCK_PROJETOS.find((p) => p.id === id)
  const [voto, setVoto] = useState<'favor' | 'contra' | null>(null)
  const [comprovante, setComprovante] = useState<string | null>(null)

  if (!projeto) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-grafite-500">Projeto não encontrado.</p>
        <Link to="/projetos" className="text-amarelo-700 font-semibold text-sm hover:underline">
          Voltar aos Projetos
        </Link>
      </div>
    )
  }

  const projetoId = projeto.id

  function votar(opcao: 'favor' | 'contra') {
    setVoto(opcao)
    // placeholder visual — o hash real é gerado no banco (ver Tarefa 3.1 do Guilherme)
    setComprovante(btoa(`${projetoId}:${Date.now()}`).slice(0, 16))
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/projetos" className="text-sm text-grafite-500 hover:underline">
        ← Voltar aos Projetos
      </Link>

      <div className="mt-4">
        <StatusDestaque projeto={projeto} />
      </div>

      <Card className="mt-4">
        <CategoryBadge categoria={projeto.categoria} />
        <h1 className="font-heading text-xl font-bold text-grafite-900 mt-2 mb-2">{projeto.nome}</h1>
        <p className="text-sm text-grafite-700">{projeto.descricao}</p>
        {projeto.origem_post_id && (
          <Link
            to={`/feed/${projeto.origem_post_id}`}
            className="inline-block mt-3 text-sm font-semibold text-amarelo-700 hover:underline"
          >
            Originado de um relato do Feed →
          </Link>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="font-heading text-sm font-bold text-grafite-900 mb-3">Linha do tempo</h2>
        {projeto.timeline.length === 0 && (
          // timeline pode vir vazia (contrato de dados) — projeto recém-criado sem marcos
          <p className="text-sm text-grafite-500">Nenhum marco cadastrado ainda.</p>
        )}
        <ol className="space-y-3">
          {projeto.timeline.map((marco, i) => (
            <motion.li
              key={i}
              className="flex items-center gap-3 text-sm"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <motion.span
                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  marco.data_real ? 'bg-status-verde-500' : 'bg-grafite-300'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.08 + 0.1, type: 'spring', stiffness: 400 }}
              />
              <div className="flex-1">
                <span className="font-medium text-grafite-900">{marco.nome}</span>
                <span className="text-grafite-500 ml-2">
                  previsto {new Date(marco.data_prevista).toLocaleDateString('pt-BR')}
                  {marco.data_real &&
                    ` · concluído ${new Date(marco.data_real).toLocaleDateString('pt-BR')}`}
                </span>
              </div>
            </motion.li>
          ))}
        </ol>
      </Card>

      {projeto.status === 'em_consulta' && (
        <Card className="mt-4 overflow-hidden">
          <h2 className="font-heading text-sm font-bold text-grafite-900 mb-1">Consulta pública</h2>
          <p className="text-xs text-grafite-500 mb-4">
            Seu voto é secreto (nunca vinculado ao seu nome publicamente) e consultivo — não obriga a
            decisão final do governo, mas gera um registro oficial de opinião.
          </p>
          <AnimatePresence mode="wait">
            {voto ? (
              <motion.div
                key="confirmacao"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="rounded-[var(--radius-field)] bg-status-verde-50 p-3 text-sm text-status-verde-700"
              >
                Voto registrado: <b>{voto === 'favor' ? 'a favor' : 'contra'}</b>.
                <br />
                Comprovante: <code className="text-xs">{comprovante}</code>
              </motion.div>
            ) : (
              <motion.div
                key="botoes"
                exit={{ opacity: 0, scale: 0.96 }}
                className="flex gap-3"
              >
                <Button onClick={() => votar('favor')} className="flex-1">
                  Votar a favor
                </Button>
                <Button variant="secondary" onClick={() => votar('contra')} className="flex-1">
                  Votar contra
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}
    </div>
  )
}
