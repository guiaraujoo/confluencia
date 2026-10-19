import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { Card } from './ui'

/**
 * Protege /painel — só quem tem profiles.institucional_verificado = true
 * pode ver. Isso é a checagem no frontend (UX: mensagem clara em vez de tela
 * vazia); a proteção que realmente importa é o RLS no banco
 * (supabase/migrations/0004_rls_policies.sql), que bloqueia a leitura/escrita
 * mesmo que alguém pule essa tela.
 */
export default function RequireInstitutional({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth()

  // Modo demonstração: sem projeto Supabase configurado não existe conta
  // institucional possível, então liberamos a tela com dados mock para que a
  // demo (e a apresentação) consiga mostrar o painel e o formulário. Com o
  // Supabase configurado esse atalho some e a checagem real vale.
  if (!isSupabaseConfigured) {
    return (
      <>
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <p className="rounded-[var(--radius-field)] bg-amarelo-100 px-3 py-2 text-xs text-grafite-700">
            Modo demonstração: dados fictícios, nada é salvo de verdade.
          </p>
        </div>
        {children}
      </>
    )
  }

  if (loading) {
    return <div className="max-w-md mx-auto px-4 py-16 text-sm text-grafite-500">Carregando...</div>
  }

  if (!user || !profile?.institucional_verificado) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <Card>
          <p className="text-sm text-grafite-900 font-medium mb-1">Acesso restrito</p>
          <p className="text-sm text-grafite-500">
            O painel de gestor é visível só para contas institucionais verificadas. Se você representa
            um órgão público, peça a verificação da sua conta (feita manualmente pelo time, ver Tarefa
            3.2 do Guilherme).
          </p>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
