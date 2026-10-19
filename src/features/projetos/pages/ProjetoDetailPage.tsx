import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MOCK_PROJETOS } from '../mock'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { gerarHashComprovante } from '../../../lib/votoHash'
import { Button, Card } from '../../../components/ui'
import CategoryBadge from '../../../components/CategoryBadge'
import StatusDestaque from '../components/StatusDestaque'
import VotoBar from '../components/VotoBar'
import type { VotosResultado } from '../../../types/database'

// Tarefa 3.1 da Ana (Semana 3): tela completa com timeline.
// Tarefa 3.1 do João ("apoio nas telas de votação"): registro real do voto —
// insere em `votos` com hash gerado no cliente (ver src/lib/votoHash.ts) e lê
// o resultado agregado de `votos_resultado`. O bloqueio de voto duplicado é
// garantido pelo UNIQUE(projeto_id, user_id) do banco (0003_projetos_votos.sql):
// uma segunda tentativa retorna violação de unicidade, tratada abaixo como
// "você já votou". O projeto em si (`MOCK_PROJETOS`) ainda é mock — conectar
// `projetos` ao Supabase real é a Tarefa 3.1 da Ana (branch
// feature/projetos-dados-reais); a votação já funciona de verdade com
// qualquer projeto que exista na tabela.
export default function ProjetoDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const projeto = MOCK_PROJETOS.find((p) => p.id === id)
  const [voto, setVoto] = useState<'favor' | 'contra' | null>(null)
  const [comprovante, setComprovante] = useState<string | null>(null)
  const [jaVotou, setJaVotou] = useState(false)
  const [votando, setVotando] = useState(false)
  const [erroVoto, setErroVoto] = useState<string | null>(null)
  const [resultado, setResultado] = useState<VotosResultado | null>(null)

  const projetoId = projeto?.id

  useEffect(() => {
    if (!projetoId) return
    let cancelled = false
    supabase
      .from('votos_resultado')
      .select('*')
      .eq('projeto_id', projetoId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setResultado(data ?? { projeto_id: projetoId, votos_favor: 0, votos_contra: 0, total_votos: 0 })
        }
      })
    return () => {
      cancelled = true
    }
  }, [projetoId])

  if (!projeto || !projetoId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-grafite-500">Projeto não encontrado.</p>
        <Link to="/projetos" className="text-amarelo-700 font-semibold text-sm hover:underline">
          Voltar aos Projetos
        </Link>
      </div>
    )
  }

  async function votar(opcao: 'favor' | 'contra') {
    if (!user) {
      setErroVoto('Entre com sua conta para votar.')
      return
    }
    setVotando(true)
    setErroVoto(null)
    const hash = await gerarHashComprovante(projetoId!, user.id)
    const { error } = await supabase.from('votos').insert({
      projeto_id: projetoId,
      user_id: user.id,
      opcao,
      hash_comprovante: hash,
    })
    setVotando(false)

    if (error) {
      // 23505 = unique_violation (UNIQUE(projeto_id, user_id) da 0003_projetos_votos.sql)
      if (error.code === '23505') {
        setJaVotou(true)
      } else {
        setErroVoto(`Não foi possível registrar o voto: ${error.message}`)
      }
      return
    }

    setVoto(opcao)
    setComprovante(hash.slice(0, 16))
    setResultado((prev) => ({
      projeto_id: projetoId!,
      votos_favor: (prev?.votos_favor ?? 0) + (opcao === 'favor' ? 1 : 0),
      votos_contra: (prev?.votos_contra ?? 0) + (opcao === 'contra' ? 1 : 0),
      total_votos: (prev?.total_votos ?? 0) + 1,
    }))
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

          {resultado && <VotoBar favor={resultado.votos_favor} contra={resultado.votos_contra} className="mb-4" />}

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
            ) : jaVotou ? (
              <motion.div
                key="ja-votou"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[var(--radius-field)] bg-grafite-100 p-3 text-sm text-grafite-700"
              >
                Você já registrou seu voto neste projeto anteriormente. Como o voto é secreto, não é
                possível mostrar de novo qual opção você escolheu.
              </motion.div>
            ) : (
              <motion.div key="botoes" exit={{ opacity: 0, scale: 0.96 }}>
                <div className="flex gap-3">
                  <Button onClick={() => votar('favor')} disabled={votando} className="flex-1">
                    {votando ? 'Registrando...' : 'Votar a favor'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => votar('contra')}
                    disabled={votando}
                    className="flex-1"
                  >
                    {votando ? 'Registrando...' : 'Votar contra'}
                  </Button>
                </div>
                {erroVoto && <p className="text-xs text-status-vermelho-500 mt-2">{erroVoto}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}
    </div>
  )
}
