import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { PerfilPublico } from '../../types/database'

const COMPLETO = 'id, nome, apelido, bairro, bio, institucional_verificado, orgao_nome, created_at'
// Com as fotos (0015). Enquanto a migration não roda, cai para o COMPLETO.
const COM_FOTOS = `${COMPLETO}, avatar_url, capa_url`
// Antes da 0008 os campos do perfil público não existem: cai para o básico.
const BASICO = 'id, nome, institucional_verificado, orgao_nome, created_at'

const NIVEIS = [COM_FOTOS, COMPLETO, BASICO]
let nivel = 0

const cache = new Map<string, PerfilPublico>()

export async function buscarPerfis(ids: string[]): Promise<Map<string, PerfilPublico>> {
  const faltando = [...new Set(ids)].filter((id) => !cache.has(id))
  if (faltando.length > 0) {
    let linhas: unknown[] | null = null
    for (const colunas of NIVEIS.slice(nivel)) {
      const r = await supabase.from('profiles').select(colunas).in('id', faltando)
      if (!r.error) {
        linhas = r.data
        break
      }
      nivel++ // lembra: não tenta de novo as colunas que o banco ainda não tem
    }
    for (const p of (linhas ?? []) as Partial<PerfilPublico>[]) {
      cache.set(p.id!, {
        id: p.id!,
        nome: p.nome ?? '',
        apelido: p.apelido ?? null,
        bairro: p.bairro ?? null,
        bio: p.bio ?? null,
        institucional_verificado: Boolean(p.institucional_verificado),
        orgao_nome: p.orgao_nome ?? null,
        created_at: p.created_at,
        avatar_url: p.avatar_url ?? null,
        capa_url: p.capa_url ?? null,
      })
    }
  }
  return new Map(ids.filter((id) => cache.has(id)).map((id) => [id, cache.get(id)!]))
}

/** Esquece o perfil em cache (ex: depois de a pessoa editar o próprio). */
export function invalidarPerfil(id: string) {
  cache.delete(id)
}

/** Como a pessoa aparece no Feed: órgão pelo nome do órgão; cidadão pelo @apelido ou primeiro nome. */
export function nomePublico(p: PerfilPublico | undefined): string {
  if (!p) return 'Vizinho(a)'
  if (p.institucional_verificado && p.orgao_nome) return p.orgao_nome
  if (p.apelido) return `@${p.apelido}`
  return p.nome.split(' ')[0] || 'Vizinho(a)'
}

/** Perfis públicos de uma lista de autores (ignora nulos — relatos anônimos). */
export function usePerfis(ids: (string | null | undefined)[]) {
  const chave = [...new Set(ids.filter(Boolean) as string[])].sort().join(',')
  const [perfis, setPerfis] = useState<Map<string, PerfilPublico>>(new Map())

  useEffect(() => {
    if (!chave) return
    let cancelado = false
    buscarPerfis(chave.split(',')).then((m) => {
      if (!cancelado) setPerfis(m)
    })
    return () => {
      cancelado = true
    }
  }, [chave])

  return perfis
}

// Cor estável do avatar a partir do id (para não depender de foto).
const CORES_AVATAR = ['#f5b800', '#2e5fcf', '#1e8a4c', '#b8326f', '#5f3fc0', '#d18b00', '#1b8a9c', '#c8402a']
export function corAvatar(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return CORES_AVATAR[h % CORES_AVATAR.length]
}
