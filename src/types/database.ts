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

export interface Post {
  id: string
  user_id: string
  categoria: Categoria
  bairro: string
  descricao: string
  foto_url: string | null
  latitude: number
  longitude: number
  repercussao: number
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
}
