import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import { MOCK_POSTS } from '../feed/mock'
import { MOCK_PROJETOS } from './mock'
import type { Categoria, Projeto, StatusResposta } from '../../types/database'

// Tarefa 4.1 da Ana: a ponte entre o Feed e os Projetos pelo campo `origem_post_id`.
// Mesma regra do api.ts: as telas não falam com o Supabase direto, chamam estas
// funções; sem Supabase configurado, as mesmas funções usam os dados mock.
//
// Os dois caminhos:
//  - Projeto → relato: no detalhe do projeto, um resumo do relato que deu origem a ele.
//  - Relato → projeto: no detalhe do relato, os projetos que nasceram dele.

/** O que as telas de Projetos mostram de um relato (nunca o autor: pode ser anônimo). */
export interface RelatoResumo {
  id: string
  categoria: Categoria
  bairro: string
  descricao: string
  created_at: string
  /** Só vem da view posts_repercussao; ausente nos dados mock. */
  interacoes?: number
  status_oficial?: StatusResposta | null
}

/** Projeto como aparece no relato: o mínimo para o cartão e o link. */
export type ProjetoDoRelato = Pick<Projeto, 'id' | 'nome' | 'status' | 'categoria'>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Mesmo protocolo exibido no detalhe do relato ("OC-1A2B3C"). */
export const protocoloRelato = (id: string) => `OC-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`

/**
 * O relato tem página própria no Feed? Só os do banco (uuid). Os relatos mock
 * ("3", "4"), usados pelos projetos de exemplo, não existem em /feed/:id.
 */
export const relatoTemPagina = (id: string) => isSupabaseConfigured && UUID.test(id)

const doMock = (id: string): RelatoResumo | null => {
  const p = MOCK_POSTS.find((m) => m.id === id)
  return p ? { id: p.id, categoria: p.categoria, bairro: p.bairro, descricao: p.descricao, created_at: p.created_at } : null
}

/**
 * Relatos que o órgão pode escolher como origem no formulário de criar projeto.
 * Lê direto da tabela `posts` (só as colunas públicas que a 0009 libera) — é bem
 * mais leve que a view do Feed, que calcula a repercussão de cada linha.
 */
export async function listarRelatosParaOrigem(): Promise<RelatoResumo[]> {
  if (!isSupabaseConfigured) return MOCK_POSTS.map((p) => doMock(p.id)!)
  const { data, error } = await supabase
    .from('posts')
    .select('id, categoria, bairro, descricao, created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Resumo do relato de origem de um projeto, ou null se ele foi apagado. */
export async function buscarRelatoOrigem(id: string): Promise<RelatoResumo | null> {
  // Projetos de exemplo apontam para relatos mock, que não estão no banco.
  if (!isSupabaseConfigured || !UUID.test(id)) return doMock(id)
  const { data, error } = await supabase
    .from('posts_repercussao')
    .select('id, categoria, bairro, descricao, created_at, interacoes, status_oficial')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Caminho oposto: projetos que nasceram deste relato. O RLS da 0007 já esconde
 * rejeitados de quem não é o órgão dono; filtramos aqui também para o relato
 * (que é público) nunca anunciar um projeto rejeitado.
 * Junta os projetos de exemplo da vitrine que apontam para o mesmo relato.
 */
export async function listarProjetosDoRelato(postId: string): Promise<ProjetoDoRelato[]> {
  const exemplos = MOCK_PROJETOS.filter((p) => p.origem_post_id === postId && p.status !== 'rejeitado').map(
    ({ id, nome, status, categoria }) => ({ id, nome, status, categoria }),
  )
  if (!isSupabaseConfigured || !UUID.test(postId)) return exemplos
  const { data, error } = await supabase
    .from('projetos')
    .select('id, nome, status, categoria')
    .eq('origem_post_id', postId)
    .neq('status', 'rejeitado')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const ids = new Set((data ?? []).map((p) => p.id))
  return [...(data ?? []), ...exemplos.filter((p) => !ids.has(p.id))]
}

/**
 * Quando um projeto nasce de um relato, o órgão responde no relato com o status
 * "Virou projeto" e o link para o projeto. O gatilho da 0008 notifica o autor.
 * É um complemento: se falhar (ex.: 0008 ainda não aplicada), o projeto já foi
 * salvo e não desfazemos nada — devolvemos false para a tela avisar.
 */
export async function avisarRelatoQueVirouProjeto(params: {
  postId: string
  projetoId: string
  orgaoId: string
  nomeProjeto: string
}): Promise<boolean> {
  if (!isSupabaseConfigured || !UUID.test(params.postId)) return true
  const { error } = await supabase.from('respostas_oficiais').insert({
    post_id: params.postId,
    orgao_id: params.orgaoId,
    status: 'virou_projeto',
    projeto_id: params.projetoId,
    texto: `Este relato deu origem ao projeto "${params.nomeProjeto}". Acompanhe o andamento e participe da consulta pública na página do projeto.`.slice(0, 600),
  })
  return !error
}
