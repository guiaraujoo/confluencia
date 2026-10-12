import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { MOCK_POSTS } from '../../features/feed/mock'
import { Card } from '../../components/ui'
import CategoryBadge from '../../components/CategoryBadge'
import { formatRelativo } from '../../lib/repercussao'


export default function PerfilPage() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="max-w-md mx-auto px-4 py-16 text-sm text-grafite-500">Carregando...</div>
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card>
          <p className="text-sm text-grafite-900 font-medium mb-1">Entre para ver seu perfil</p>
          <p className="text-sm text-grafite-500 mb-3">
            Seu perfil reúne os problemas que você relatou no Feed.
          </p>
          <Link to="/entrar" className="text-amarelo-700 font-semibold text-sm hover:underline">
            Entrar
          </Link>
        </Card>
      </div>
    )
  }

  const nome = profile?.nome || user.email?.split('@')[0] || 'Você'
  const institucional = profile?.institucional_verificado ?? false
  const meusPosts = MOCK_POSTS.filter((p) => p.user_id === user.id)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <Card className="flex items-center gap-4">
        <div className="h-14 w-14 flex-shrink-0 rounded-full bg-amarelo-100 flex items-center justify-center">
          <span className="font-heading text-xl font-bold text-amarelo-900">{nome[0].toUpperCase()}</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-bold text-grafite-900 truncate">{nome}</h1>
          <p className="text-sm text-grafite-500 truncate">{user.email}</p>
          <span
            className={`inline-flex mt-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
              institucional ? 'bg-status-azul-50 text-status-azul-700' : 'bg-grafite-200 text-grafite-700'
            }`}
          >
            {institucional
              ? `Conta institucional${profile?.orgao_nome ? ` · ${profile.orgao_nome}` : ''}`
              : 'Cidadão'}
          </span>
        </div>
      </Card>

      {institucional && (
        <Card>
          <h2 className="font-heading text-sm font-bold text-grafite-900 mb-3">Atalhos do órgão</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/painel"
              className="rounded-[var(--radius-field)] border border-grafite-300 px-4 py-2 text-sm font-semibold text-grafite-900 hover:bg-grafite-100 transition-colors"
            >
              Painel de gestor
            </Link>
            <Link
              to="/projetos/novo"
              className="rounded-[var(--radius-field)] bg-amarelo-500 px-4 py-2 text-sm font-semibold text-grafite-900 hover:bg-amarelo-300 transition-colors"
            >
              + Novo projeto
            </Link>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-heading text-sm font-bold text-grafite-900 mb-3">
          Meus relatos {meusPosts.length > 0 && <span className="text-grafite-500">({meusPosts.length})</span>}
        </h2>
        {meusPosts.length === 0 ? (
          <div className="text-sm text-grafite-500">
            Você ainda não relatou nenhum problema.{' '}
            <Link to="/feed/novo" className="text-amarelo-700 font-semibold hover:underline">
              Relatar agora
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-grafite-200">
            {meusPosts.map((post, i) => (
              <motion.li
                key={post.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/feed/${post.id}`}
                  className="flex items-center gap-3 py-2.5 text-sm hover:bg-grafite-100 -mx-2 px-2 rounded-[var(--radius-field)]"
                >
                  <CategoryBadge categoria={post.categoria} />
                  <span className="flex-1 truncate text-grafite-900">{post.bairro}</span>
                  <span className="text-xs text-grafite-500">{formatRelativo(post.created_at)}</span>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-grafite-500 px-1">
        Seus votos não aparecem aqui: o voto é secreto, nem você consegue consultá-lo depois. O
        comprovante é mostrado uma única vez, logo após votar.
      </p>
    </div>
  )
}
