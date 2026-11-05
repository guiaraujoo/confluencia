import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { CATEGORIAS, STATUS_RESPOSTA_LABELS, type PerfilPublico, type PostRepercussao } from '../../../types/database'
import { formatRelativo, REPERCUSSAO_STYLES, nivelRepercussao } from '../../../lib/repercussao'
import { CATEGORIA_RGB } from '../cores'
import IconeCategoria from './IconeCategoria'
import AnelRepercussao from './AnelRepercussao'
import { realcar } from '../busca'
import AutorLinha from './Autor'
import CapaRelato from './CapaRelato'

interface RelatoItemProps {
  post: PostRepercussao
  ativo: boolean
  onHover: (id: string | null) => void
  onVerNoMapa: (id: string) => void
  /** Termo da busca, para marcar os trechos encontrados. */
  busca?: string
  /** Perfil público do autor (undefined em relato anônimo ou enquanto carrega). */
  perfil?: PerfilPublico
}

const INCLINACAO = 7

// Card da lista do Feed: inclina seguindo o mouse e acende um brilho na cor da
// categoria onde está o cursor. Passar o mouse acende o pino no mapa; o alvo
// à direita faz a câmera voar até o relato.
export default function RelatoItem({ post, ativo, onHover, onVerNoMapa, busca = '', perfil }: RelatoItemProps) {
  const reduzir = useReducedMotion()
  const [r, g, b] = CATEGORIA_RGB[post.categoria]
  const categoria = CATEGORIAS.find((c) => c.value === post.categoria)?.label ?? post.categoria
  const nivel = REPERCUSSAO_STYLES[nivelRepercussao(post.repercussao)]

  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(my, [0, 1], [INCLINACAO, -INCLINACAO]), { stiffness: 260, damping: 22 })
  const rotateY = useSpring(useTransform(mx, [0, 1], [-INCLINACAO, INCLINACAO]), { stiffness: 260, damping: 22 })
  const brilho = useTransform(
    [mx, my],
    ([x, y]: number[]) =>
      `radial-gradient(260px circle at ${x * 100}% ${y * 100}%, rgba(${r},${g},${b},0.16), transparent 65%)`,
  )

  function mover(e: MouseEvent<HTMLDivElement>) {
    const caixa = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - caixa.left) / caixa.width)
    my.set((e.clientY - caixa.top) / caixa.height)
  }

  function sair() {
    mx.set(0.5)
    my.set(0.5)
    onHover(null)
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      style={{ perspective: 800 }}
    >
      <motion.div
        onMouseMove={reduzir ? undefined : mover}
        onMouseEnter={() => onHover(post.id)}
        onMouseLeave={sair}
        style={reduzir ? undefined : { rotateX, rotateY }}
        animate={{ y: ativo ? -2 : 0 }}
        className={`group relative overflow-hidden rounded-[20px] border bg-white transition-[border-color,box-shadow] duration-300 ${
          ativo
            ? 'border-transparent shadow-[0_16px_34px_-14px_rgba(27,24,19,0.35)]'
            : 'border-grafite-200/70 shadow-[0_2px_6px_-3px_rgba(27,24,19,0.12)] hover:shadow-[0_16px_34px_-14px_rgba(27,24,19,0.35)]'
        }`}
      >
        <motion.span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: brilho }} />
        {ativo && (
          <motion.span
            layoutId="relato-ativo-contorno"
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[20px] ring-2"
            style={{ ['--tw-ring-color' as string]: `rgb(${r},${g},${b})` }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
          />
        )}

        <Link to={`/feed/${post.id}`} tabIndex={-1} aria-hidden className="relative block">
          <CapaRelato fotoUrl={post.foto_url} bairro={post.bairro} className="h-24" />
        </Link>

        <div className="relative border-b border-grafite-100 px-4 pb-2 pt-3 pr-4">
          <AutorLinha
            userId={post.user_id}
            perfil={post.user_id ? perfil : undefined}
            anonimo={post.anonimo}
            bairroDoRelato={post.bairro}
          />
        </div>

        <Link to={`/feed/${post.id}`} className="relative flex gap-3.5 p-4 pr-14" onFocus={() => onHover(post.id)}>
          <motion.span
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] text-white shadow-sm"
            style={{ background: `linear-gradient(140deg, rgb(${r},${g},${b}), rgba(${r},${g},${b},0.72))` }}
            animate={ativo ? { rotate: -8, scale: 1.08 } : { rotate: 0, scale: 1 }}
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <IconeCategoria categoria={post.categoria} />
          </motion.span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold uppercase tracking-[0.06em]" style={{ color: `rgb(${r},${g},${b})` }}>
                {categoria}
              </span>
              <span className="whitespace-nowrap text-grafite-500">{formatRelativo(post.created_at)}</span>
            </span>
            <span className="mt-1 block text-[14px] font-medium leading-snug text-grafite-900 line-clamp-2">
              {realcar(post.descricao, busca)}
            </span>
            <span className="mt-3 flex items-center gap-2.5">
              <AnelRepercussao valor={post.repercussao} />
              <span className="min-w-0 leading-tight">
                <span className={`block text-xs font-semibold ${nivel.text}`}>Repercussão {nivel.label}</span>
                <span className="block truncate text-[11px] text-grafite-500">
                  {realcar(post.bairro, busca)} · {post.interacoes} {post.interacoes === 1 ? 'apoio' : 'apoios'}
                  {typeof post.comentarios === 'number' &&
                    ` · ${post.comentarios} ${post.comentarios === 1 ? 'comentário' : 'comentários'}`}
                </span>
              </span>
            </span>
            {post.status_oficial && (
              <span
                className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  post.status_oficial === 'virou_projeto' || post.status_oficial === 'resolvido'
                    ? 'bg-status-verde-50 text-status-verde-700'
                    : post.status_oficial === 'nao_procede'
                      ? 'bg-grafite-100 text-grafite-700'
                      : 'bg-status-azul-50 text-status-azul-700'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Órgão: {STATUS_RESPOSTA_LABELS[post.status_oficial]}
              </span>
            )}
          </span>
        </Link>

        <motion.button
          type="button"
          onClick={() => onVerNoMapa(post.id)}
          aria-label={`Ver no mapa: ${post.bairro}`}
          title="Ver no mapa"
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-grafite-50 text-grafite-700 ring-1 ring-grafite-200 transition-colors hover:bg-amarelo-500 hover:text-grafite-900 hover:ring-amarelo-500"
        >
          <span className="absolute inset-0 rounded-full ring-2 ring-amarelo-500 opacity-0 group-hover:animate-ping group-hover:opacity-40" />
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <circle cx="12" cy="12" r="7" />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          </svg>
        </motion.button>
      </motion.div>
    </motion.li>
  )
}
