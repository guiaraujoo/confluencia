// Contrato de dados do Confluência — ver docs/contrato-de-dados.md
// Esses tipos espelham exatamente as colunas das tabelas no Supabase
// (supabase/migrations/*.sql). Se um campo mudar aqui, mude lá também.

export type Categoria =
  | 'mobilidade'
  | 'iluminacao'
  | 'seguranca'
  | 'saneamento'
  | 'pracas_lazer'
  | 'saude'
  | 'educacao'
  | 'outros'

export const CATEGORIAS: { value: Categoria; label: string }[] = [
  { value: 'mobilidade', label: 'Mobilidade' },
  { value: 'iluminacao', label: 'Iluminação' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'saneamento', label: 'Saneamento' },
  { value: 'pracas_lazer', label: 'Praças e lazer' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'outros', label: 'Outros' },
]

// Tabela `posts` (use para ESCREVER posts).
export interface Post {
  id: string
  user_id: string
  categoria: Categoria
  bairro: string
  descricao: string
  foto_url: string | null
  latitude: number
  longitude: number
  /** @deprecated coluna legada, sempre 0. Use PostRepercussao (view posts_repercussao). */
  repercussao: number
  created_at: string
}

// View `posts_repercussao` (use para LER o Feed). Somente leitura.
// repercussao = recorrencia + interacoes, calculado sob demanda.
export interface PostRepercussao extends Omit<Post, 'repercussao' | 'user_id'> {
  /** Autor. `null` quando o relato é anônimo (só o próprio autor recebe o id). Ver 0008. */
  user_id: string | null
  /** Relato publicado sem autor visível (sempre true em "seguranca"). Ver 0008. */
  anonimo?: boolean
  /** outros posts da mesma categoria + bairro nos últimos 30 dias */
  recorrencia: number
  /** quantidade de apoios do post em post_apoios */
  interacoes: number
  /** recorrencia + interacoes */
  repercussao: number
  /** quantidade de comentários (0008) */
  comentarios?: number
  /** status da resposta oficial mais recente do órgão, se houver (0008) */
  status_oficial?: StatusResposta | null
}

// --- Camada social (0008_rede_social.sql) ---------------------------------

export type StatusResposta = 'recebido' | 'em_analise' | 'virou_projeto' | 'resolvido' | 'nao_procede'

export const STATUS_RESPOSTA_LABELS: Record<StatusResposta, string> = {
  recebido: 'Recebido pelo órgão',
  em_analise: 'Em análise',
  virou_projeto: 'Virou projeto',
  resolvido: 'Resolvido',
  nao_procede: 'Não procede',
}

export interface Comentario {
  id: string
  post_id: string
  user_id: string
  texto: string
  created_at: string
}

export interface RespostaOficial {
  id: string
  post_id: string
  orgao_id: string
  status: StatusResposta
  texto: string
  projeto_id: string | null
  created_at: string
}

/** Campos do perfil que aparecem para todo mundo. */
export interface PerfilPublico {
  id: string
  nome: string
  apelido: string | null
  bairro: string | null
  bio: string | null
  institucional_verificado: boolean
  orgao_nome: string | null
  created_at?: string
  /** Fotos de perfil e capa (0015), no bucket "fotos". */
  avatar_url?: string | null
  capa_url?: string | null
}

// Tabela `post_apoios`: um apoio por usuário por post (PK composta).
export interface PostApoio {
  post_id: string
  user_id: string
  created_at: string
}

export type ProjetoStatus =
  | 'proposto'
  | 'em_consulta'
  | 'aprovado'
  | 'rejeitado'
  | 'em_execucao'
  | 'concluido'

export const STATUS_LABELS: Record<ProjetoStatus, string> = {
  proposto: 'Proposto',
  em_consulta: 'Em consulta pública',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  em_execucao: 'Em execução',
  concluido: 'Concluído',
}

export interface MarcoTimeline {
  nome: string
  data_prevista: string
  data_real: string | null
}

// No insert, `status` (default 'proposto') e `timeline` (default []) são opcionais.
export interface Projeto {
  id: string
  orgao_id: string
  nome: string
  descricao: string
  categoria: Categoria
  status: ProjetoStatus
  origem_post_id: string | null
  timeline: MarcoTimeline[]
  consulta_fim: string | null
  created_at: string
}

// Tabela `votos`: ninguém lê linha a linha. Para o resultado, use VotosResultado.
export interface Voto {
  id: string
  projeto_id: string
  user_id: string
  opcao: 'favor' | 'contra'
  hash_comprovante: string
  created_at: string
}

// Espelha a view `votos_resultado` (ver 0003_projetos_votos.sql) — única forma
// pública de ler votos: contagem agregada, nunca a linha individual.
export interface VotosResultado {
  projeto_id: string
  votos_favor: number
  votos_contra: number
  total_votos: number
}

export interface Profile {
  id: string
  nome: string
  institucional_verificado: boolean
  orgao_nome: string | null
  /** Perfil público (0008) — opcionais até a migration ser aplicada. */
  apelido?: string | null
  bairro?: string | null
  bio?: string | null
  avatar_url?: string | null
  capa_url?: string | null
}