import { useEffect, useState } from 'react'
import { EXEMPLO_ID, MOCK_PROJETOS, apelidoExemplo } from './mock'
import { buscarProjeto, listarProjetosPublicos } from './api'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { Projeto } from '../../types/database'

// Os 6 projetos da vitrine (foto, proposta e galeria) têm ids fixos e, desde a
// Semana 5, estão no banco (supabase/semana5_limpeza_e_projetos.sql): votos,
// salvos e respostas são de verdade. Se o script ainda não rodou, a cópia local
// de ./mock.ts entra no lugar, para a demonstração nunca ficar vazia.

const IDS_EXEMPLO = new Set<string>(Object.values(EXEMPLO_ID))
const noBanco = new Set<string>()

/** Exemplo que só existe no código (o banco ainda não tem): não dá para votar. */
export const ehExemplo = (id: string) => IDS_EXEMPLO.has(id) && !noBanco.has(id)

const SO_EXEMPLOS = MOCK_PROJETOS.filter((p) => p.status !== 'rejeitado')

export async function carregarProjetosPublicos(): Promise<Projeto[]> {
  const doBanco = await listarProjetosPublicos()
  if (!isSupabaseConfigured) return doBanco
  for (const p of doBanco) noBanco.add(p.id)
  return [...doBanco, ...SO_EXEMPLOS.filter((p) => !noBanco.has(p.id))]
}

/** Projeto pelo id (aceita o apelido antigo "p1"). null se não existir ou se for rejeitado de outro órgão. */
export async function carregarProjeto(idOuApelido: string): Promise<Projeto | null> {
  const apelido = apelidoExemplo(idOuApelido)
  const id = apelido ? EXEMPLO_ID[apelido] : idOuApelido
  const doBanco = await buscarProjeto(id).catch(() => null)
  if (doBanco) {
    if (isSupabaseConfigured) noBanco.add(doBanco.id)
    return doBanco
  }
  return MOCK_PROJETOS.find((p) => p.id === id) ?? null
}

/** Lista pública (banco + exemplos que faltarem). Começa com os exemplos, para aparecer na hora. */
export function useProjetosPublicos(): Projeto[] {
  const [projetos, setProjetos] = useState<Projeto[]>(SO_EXEMPLOS)
  useEffect(() => {
    let cancelado = false
    carregarProjetosPublicos()
      .then((lista) => {
        if (!cancelado) setProjetos(lista)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [])
  return projetos
}
