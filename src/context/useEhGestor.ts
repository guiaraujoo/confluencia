import { useAuth } from './AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

/** Conta de órgão público verificado. Sem Supabase (modo demonstração) vale como gestor. */
export function useEhGestor() {
  const { profile } = useAuth()
  return !isSupabaseConfigured || Boolean(profile?.institucional_verificado)
}
