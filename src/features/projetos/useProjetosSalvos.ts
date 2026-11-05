import { useCallback, useSyncExternalStore } from 'react'
import { useAuth } from '../../context/AuthContext'
import { EXEMPLO_ID, apelidoExemplo } from './mock'

// Projetos que a pessoa salvou para acompanhar. Provisório: fica no
// navegador (por conta), até existir uma tabela de "projetos seguidos" no
// banco — aí só esta função muda, o resto da tela continua igual.
const EVENTO = 'confluencia:projetos-salvos'

const chave = (userId: string | undefined) => `confluencia:salvos:${userId ?? 'visitante'}`

function ler(k: string): string[] {
  try {
    const bruto = localStorage.getItem(k)
    const lista = bruto ? (JSON.parse(bruto) as string[]) : []
    // Salvos de antes da Semana 5 guardavam "p1"; hoje o exemplo tem id fixo.
    return lista.map((id) => (id in EXEMPLO_ID ? EXEMPLO_ID[apelidoExemplo(id)!] : id))
  } catch {
    return []
  }
}

// Cache por chave para o useSyncExternalStore receber sempre a mesma referência.
const cache = new Map<string, { bruto: string | null; lista: string[] }>()
function snapshot(k: string): string[] {
  let bruto: string | null = null
  try {
    bruto = localStorage.getItem(k)
  } catch {
    bruto = null
  }
  const atual = cache.get(k)
  if (atual && atual.bruto === bruto) return atual.lista
  const lista = ler(k)
  cache.set(k, { bruto, lista })
  return lista
}

function assinar(callback: () => void) {
  window.addEventListener(EVENTO, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENTO, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useProjetosSalvos() {
  const { user } = useAuth()
  const k = chave(user?.id)
  const salvos = useSyncExternalStore(assinar, () => snapshot(k))

  const alternar = useCallback(
    (id: string) => {
      const atual = ler(k)
      const nova = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
      try {
        localStorage.setItem(k, JSON.stringify(nova))
      } catch {
        return
      }
      window.dispatchEvent(new Event(EVENTO))
    },
    [k],
  )

  return { salvos, estaSalvo: (id: string) => salvos.includes(id), alternar }
}
