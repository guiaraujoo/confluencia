import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { STATUS_RESPOSTA_LABELS, type PerfilPublico, type RespostaOficial, type StatusResposta } from '../../../types/database'
import { formatRelativo } from '../../../lib/repercussao'
import { buscarPerfis, nomePublico } from '../perfis'
import { Avatar, SeloOrgao } from './Autor'

const COR_STATUS: Record<StatusResposta, string> = {
  recebido: 'bg-status-azul-50 text-status-azul-700',
  em_analise: 'bg-status-azul-50 text-status-azul-700',
  virou_projeto: 'bg-status-verde-50 text-status-verde-700',
  resolvido: 'bg-status-verde-50 text-status-verde-700',
  nao_procede: 'bg-grafite-100 text-grafite-700',
}

// Resposta oficial do órgão no relato: a cidade responde em público.
// Só conta institucional verificada publica (RLS da 0008 garante no banco).
export default function RespostasOficiais({ postId }: { postId: string }) {
  const { user, profile } = useAuth()
  const [respostas, setRespostas] = useState<RespostaOficial[] | null>(null)
  const [perfis, setPerfis] = useState<Map<string, PerfilPublico>>(new Map())
  const [indisponivel, setIndisponivel] = useState(false)
  const [status, setStatus] = useState<StatusResposta>('recebido')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const ehOrgao = Boolean(user && profile?.institucional_verificado)

  useEffect(() => {
    let cancelado = false
    supabase
      .from('respostas_oficiais')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(async ({ data, error }) => {
        if (cancelado) return
        if (error) {
          setIndisponivel(true)
          return
        }
        const lista = (data ?? []) as RespostaOficial[]
        setPerfis(await buscarPerfis(lista.map((r) => r.orgao_id)))
        if (!cancelado) setRespostas(lista)
      })
    return () => {
      cancelado = true
    }
  }, [postId])

  async function responder(e: FormEvent) {
    e.preventDefault()
    if (!user || !texto.trim()) return
    setEnviando(true)
    setErro(null)
    const { data, error } = await supabase
      .from('respostas_oficiais')
      .insert({ post_id: postId, orgao_id: user.id, status, texto: texto.trim() })
      .select()
      .single()
    setEnviando(false)
    if (error) {
      setErro(`Não foi possível publicar a resposta: ${error.message}`)
      return
    }
    setPerfis(await buscarPerfis([...perfis.keys(), user.id]))
    setRespostas((r) => [...(r ?? []), data as RespostaOficial])
    setTexto('')
  }

  if (indisponivel) return null
  const ultima = respostas?.[respostas.length - 1]

  return (
    <section className="mt-16">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">Resposta do órgão</p>

      {respostas === null ? (
        <div className="mt-6 h-24 animate-pulse rounded-[28px] bg-grafite-100" />
      ) : respostas.length === 0 ? (
        <div className="mt-6 rounded-[28px] border-2 border-dashed border-grafite-200 p-6">
          <p className="font-heading text-xl font-bold text-grafite-900">Ainda sem resposta oficial</p>
          <p className="mt-1 text-sm text-grafite-500">
            Quando o órgão responsável analisar este relato, a resposta aparece aqui para todo mundo.
          </p>
        </div>
      ) : (
        <ol className="relative mt-6 space-y-4">
          {respostas.map((r, i) => {
            const orgao = perfis.get(r.orgao_id)
            const atual = r.id === ultima?.id
            return (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`relative overflow-hidden rounded-[28px] border p-6 ${
                  atual ? 'border-status-azul-500/40 bg-white shadow-[0_20px_44px_-24px_rgba(46,95,207,0.55)]' : 'border-grafite-200 bg-grafite-50'
                }`}
              >
                {atual && <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-status-azul-500" />}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar perfil={orgao} size={34} />
                    <span>
                      <span className="flex items-center gap-1.5 text-sm font-bold text-grafite-900">
                        {nomePublico(orgao)} <SeloOrgao />
                      </span>
                      <span className="text-xs text-grafite-500">{formatRelativo(r.created_at)}</span>
                    </span>
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${COR_STATUS[r.status]}`}>
                    {STATUS_RESPOSTA_LABELS[r.status]}
                  </span>
                </div>
                <p className="mt-4 text-[15px] leading-relaxed text-grafite-900">{r.texto}</p>
                {r.projeto_id && (
                  <Link
                    to={`/projetos/${r.projeto_id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-status-verde-700 hover:underline"
                  >
                    Ver o projeto →
                  </Link>
                )}
              </motion.li>
            )
          })}
        </ol>
      )}

      {ehOrgao && (
        <form onSubmit={responder} className="mt-6 rounded-[28px] bg-status-azul-50 p-6">
          <p className="text-sm font-bold text-status-azul-700">Responder como {profile?.orgao_nome ?? 'órgão'}</p>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Status da resposta">
            {(Object.keys(STATUS_RESPOSTA_LABELS) as StatusResposta[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={status === s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  status === s ? 'bg-status-azul-700 text-white' : 'bg-white text-grafite-700 hover:bg-white/70'
                }`}
              >
                {STATUS_RESPOSTA_LABELS[s]}
              </button>
            ))}
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="Explique para a população o que vai acontecer com este relato."
            aria-label="Texto da resposta oficial"
            className="mt-3 w-full rounded-2xl border border-status-azul-500/30 bg-white px-4 py-3 text-sm text-grafite-900 focus:border-status-azul-500 focus:outline-none focus:ring-2 focus:ring-status-azul-500/20"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-grafite-500">{texto.length}/600 · a resposta é pública</span>
            <button
              type="submit"
              disabled={enviando || !texto.trim()}
              className="rounded-full bg-status-azul-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? 'Publicando…' : 'Publicar resposta'}
            </button>
          </div>
          <AnimatePresence>
            {erro && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 text-xs text-status-vermelho-700">
                {erro}
              </motion.p>
            )}
          </AnimatePresence>
        </form>
      )}
    </section>
  )
}
