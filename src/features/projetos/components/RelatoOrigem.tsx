import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { isSupabaseConfigured } from '../../../lib/supabase'
import IconeCategoria from '../../feed/components/IconeCategoria'
import { CATEGORIA_RGB, rgb } from '../../feed/cores'
import { buscarRelatoOrigem, protocoloRelato, relatoTemPagina, type RelatoResumo } from '../origem'
import { CATEGORIAS } from '../../../types/database'

const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

// Tarefa 4.1 da Ana: no detalhe do projeto, o relato que deu origem a ele —
// o texto da população, bairro, data e apoios — com link para o relato no Feed.
// Nunca mostra o autor: o relato pode ser anônimo.
export default function RelatoOrigem({ postId }: { postId: string }) {
  // undefined = carregando · null = o relato foi apagado (o projeto continua).
  const [carga, setCarga] = useState<{ id: string; relato: RelatoResumo | null } | null>(null)
  const relato = carga && carga.id === postId ? carga.relato : undefined

  useEffect(() => {
    let cancelado = false
    buscarRelatoOrigem(postId)
      .then((r) => !cancelado && setCarga({ id: postId, relato: r }))
      .catch(() => !cancelado && setCarga({ id: postId, relato: null }))
    return () => {
      cancelado = true
    }
  }, [postId])

  return (
    <section className="mt-16">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">De onde veio</p>
      <h2 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold text-grafite-900">
        Este projeto nasceu de um relato da população
      </h2>

      {relato === undefined ? (
        <div className="mt-6 h-40 animate-pulse rounded-[28px] bg-grafite-100" aria-label="Carregando relato de origem" />
      ) : relato === null ? (
        <p className="mt-6 rounded-[28px] border-2 border-dashed border-grafite-200 p-6 text-sm text-grafite-500">
          {isSupabaseConfigured
            ? 'O relato que deu origem a este projeto não está mais disponível no Feed.'
            : 'O relato original fica no Feed, que precisa do banco conectado. Na demonstração sem banco ele não aparece.'}
        </p>
      ) : (
        <CartaoRelato relato={relato} />
      )}
    </section>
  )
}

function CartaoRelato({ relato }: { relato: RelatoResumo }) {
  const cor = rgb(CATEGORIA_RGB[relato.categoria])
  const categoria = CATEGORIAS.find((c) => c.value === relato.categoria)?.label ?? relato.categoria
  const comPagina = relatoTemPagina(relato.id)

  const conteudo = (
    <>
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: cor }} />
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white"
          style={{ background: cor }}
        >
          <IconeCategoria categoria={relato.categoria} size={12} />
          {categoria}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-grafite-900">
          {protocoloRelato(relato.id)}
        </span>
      </div>
      <blockquote className="mt-4 font-heading text-xl sm:text-2xl font-bold leading-snug text-grafite-900">
        “{relato.descricao}”
      </blockquote>
      <p className="mt-3 text-sm text-grafite-700">
        Morador(a) de <b className="text-grafite-900">{relato.bairro}</b> · {dataLonga(relato.created_at)}
        {typeof relato.interacoes === 'number' &&
          ` · ${relato.interacoes} ${relato.interacoes === 1 ? 'apoio' : 'apoios'}`}
      </p>
      {comPagina ? (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-grafite-900">
          Ver o relato no Feed
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amarelo-500 transition-transform group-hover:translate-x-1 group-hover:-rotate-12">
            →
          </span>
        </span>
      ) : (
        <p className="mt-4 text-xs text-grafite-500">Relato de exemplo da demonstração (não está publicado no Feed).</p>
      )}
    </>
  )

  const classe = 'group relative mt-6 block overflow-hidden rounded-[28px] bg-grafite-100 p-6 pl-8'

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      {comPagina ? (
        <Link to={`/feed/${relato.id}`} className={`${classe} transition-colors hover:bg-amarelo-50`}>
          {conteudo}
        </Link>
      ) : (
        <div className={classe}>{conteudo}</div>
      )}
    </motion.div>
  )
}
