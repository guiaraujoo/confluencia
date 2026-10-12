import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import MapView from '../../../components/MapView'
import { Card } from '../../../components/ui'
import CategoryBadge from '../../../components/CategoryBadge'
import RepercussaoBar from '../../../components/RepercussaoBar'
import { formatRelativo } from '../../../lib/repercussao'
import type { Post } from '../../../types/database'

// Tarefa 4.1 do João (Semana 4): camada de simulação visual — versão ilustrativa,
// ainda estática por enquanto (igual combinado no Escopo Geral: não é preditivo).
export default function PostDetailPage() {
  const { id } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setPost(data)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-sm text-grafite-500">Carregando...</div>
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-sm text-grafite-500">Post não encontrado.</p>
        <Link to="/feed" className="text-amarelo-700 font-semibold text-sm hover:underline">
          Voltar ao Feed
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/feed" className="text-sm text-grafite-500 hover:underline">
        ← Voltar ao Feed
      </Link>

      <Card className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <CategoryBadge categoria={post.categoria} />
          <span className="text-xs text-grafite-500">{formatRelativo(post.created_at)}</span>
        </div>
        <h1 className="font-heading text-xl font-bold text-grafite-900 mb-3">{post.bairro}</h1>
        <p className="text-sm text-grafite-900 mb-4">{post.descricao}</p>
        <MapView
          markers={[{ id: post.id, position: [post.latitude, post.longitude] }]}
          center={[post.latitude, post.longitude]}
          zoom={15}
          height={240}
        />
      </Card>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <RepercussaoBar valor={post.repercussao} variant="full" className="mt-4" />
      </motion.div>

      <Card className="mt-4">
        <h2 className="font-heading text-sm font-bold text-grafite-900 mb-2">
          Simulação de impacto (ilustrativa)
        </h2>
        <p className="text-xs text-grafite-500 mb-3">
          Representação visual do que a resolução deste problema pode significar para a região — não é
          um cálculo preditivo real (fora do escopo do MVP, ver Escopo Geral).
        </p>
        <div className="grid grid-cols-2 gap-3 text-center text-xs font-semibold text-grafite-700">
          <motion.div
            className="rounded-[var(--radius-field)] bg-grafite-200 h-24 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Situação atual
          </motion.div>
          <motion.div
            className="rounded-[var(--radius-field)] bg-status-verde-50 h-24 flex items-center justify-center text-status-verde-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Situação prevista
          </motion.div>
        </div>
      </Card>
    </div>
  )
}
