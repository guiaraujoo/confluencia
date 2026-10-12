import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  /** Linha da tabela `profiles` do usuário logado — usada para checar institucional_verificado (ex: guardar /painel). null enquanto carrega ou se deslogado. */
  profile: Profile | null
  loading: boolean
  /** `confirmed` indica se já voltou logado (confirmação de e-mail desativada no projeto)
   *  ou se precisa confirmar o e-mail antes de entrar — a tela de cadastro usa isso pra
   *  decidir pra onde mandar a pessoa depois. */
  signUp: (email: string, password: string, nome: string) => Promise<{ error: string | null; confirmed: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/**
 * Autenticação via Supabase (Tarefa 1.4 do Guilherme).
 * Envolve o app inteiro (ver main.tsx) e dá acesso ao usuário logado em
 * qualquer tela via useAuth(). Precisa de VITE_SUPABASE_URL e
 * VITE_SUPABASE_ANON_KEY configurados em .env.local para funcionar de verdade
 * — sem isso, loading nunca resolve um usuário (fica null), o que é o
 * comportamento esperado até existir um projeto Supabase real.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
      })
      .catch(() => {
        // Sem projeto Supabase real configurado ainda (ver src/lib/supabase.ts)
        // — segue sem sessão em vez de deixar a promise rejeitada solta.
      })
      .finally(() => setLoading(false))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Busca o perfil (institucional_verificado etc.) sempre que o usuário muda —
  // é o que RequireInstitutional usa para proteger /painel.
  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setProfile(null)
      return
    }
    let cancelled = false
    async function loadProfile() {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
        if (!cancelled) setProfile(data)
      } catch {
        if (!cancelled) setProfile(null)
      }
    }
    loadProfile()
    return () => {
      cancelled = true
    }
  }, [session?.user.id])

  async function signUp(email: string, password: string, nome: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    })
    // Com a confirmação de e-mail desativada no projeto, o Supabase já retorna
    // uma sessão válida aqui — a pessoa sai cadastrada e logada. onAuthStateChange
    // (acima) atualiza o contexto sozinho; só avisamos a tela se já pode seguir.
    return { error: error?.message ?? null, confirmed: data.session !== null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, profile, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
