import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CATEGORIAS, type Projeto, type VotosResultado } from '../../../types/database'
import IconeCategoria from '../../feed/components/IconeCategoria'
import { diasRestantes } from '../etapas'
import { FOTOS_PROJETO } from '../fotos'
import BotaoSalvar from './BotaoSalvar'

interface ConsultaDestaqueProps {
  projeto: Projeto
  resultado?: VotosResultado
  agora: number
  indice: number
}

// Projeto em consulta pública: é onde o voto de quem mora aqui conta agora.
// Card amarelo com a contagem regressiva do prazo em destaque.
export default function ConsultaDestaque({ projeto, resultado, agora, indice }: ConsultaDestaqueProps) {
  const dias = diasRestantes(projeto, agora)
  const foto = FOTOS_PROJETO[projeto.id]
  const categoria = CATEGORIAS.find((c) => c.value === projeto.categoria)?.label ?? projeto.categoria
  const total = resultado?.total_votos ?? 0
  const pctFavor = total ? Math.round(((resultado?.votos_favor ?? 0) / total) * 100) : 0

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 + indice * 0.08 }}
      className="group relative overflow-hidden rounded-[32px] bg-amarelo-500 text-grafite-900 shadow-[0_28px_60px_-30px_rgba(184,134,11,0.9)]"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-12 opacity-[0.12]"
        style={{ backgroundImage: 'repeating-linear-gradient(115deg, #1b1813 0 2px, transparent 2px 24px)' }}
        animate={{ x: [0, 48] }}
        transition={{ duration: 4, ease: 'linear', repeat: Infinity }}
      />

      <div className="absolute right-5 top-5 z-10">
        <BotaoSalvar projetoId={projeto.id} />
      </div>
      <div
        className={`relative grid gap-6 p-6 sm:p-8 md:items-end ${
          foto ? 'md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_240px_auto]' : 'md:grid-cols-[minmax(0,1fr)_auto]'
        }`}
      >
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-grafite-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-amarelo-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amarelo-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amarelo-300" />
            </span>
            Consulta aberta
          </span>
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold">
            <IconeCategoria categoria={projeto.categoria} size={18} />
            {categoria}
          </p>
          <h3 className="mt-1 font-heading text-3xl sm:text-4xl font-extrabold leading-[1.02]">{projeto.nome}</h3>
          <p className="mt-3 max-w-xl text-[15px] text-amarelo-900">{projeto.descricao}</p>

          <div className="mt-5 max-w-md">
            <div className="flex justify-between text-xs font-semibold text-amarelo-900">
              <span>{total === 0 ? 'Nenhum voto ainda' : `${pctFavor}% a favor`}</span>
              <span>
                {total.toLocaleString('pt-BR')} {total === 1 ? 'voto' : 'votos'}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-grafite-900/15">
              <motion.div
                className="h-full rounded-full bg-grafite-900"
                initial={{ width: 0 }}
                animate={{ width: `${pctFavor}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
              />
            </div>
          </div>
        </div>

        {foto && (
          <motion.figure
            className="hidden lg:block self-center"
            initial={{ opacity: 0, rotate: 6, y: 20 }}
            animate={{ opacity: 1, rotate: -4, y: 0 }}
            whileHover={{ rotate: 0, scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.25 }}
          >
            <div className="overflow-hidden rounded-xl bg-white p-2 shadow-[0_20px_40px_-18px_rgba(27,24,19,0.6)]">
              <img src={foto.url} alt={`Foto do local: ${foto.local}`} className="h-44 w-full rounded-lg object-cover" />
            </div>
            <figcaption className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amarelo-900">
              {foto.local}
              <span className="block font-medium normal-case tracking-normal opacity-70">
                Foto: {foto.autor} · {foto.licenca}
              </span>
            </figcaption>
          </motion.figure>
        )}

        <div className="flex items-end gap-5 md:flex-col md:items-end">
          {dias !== null && (
            <div className="text-left md:text-right">
              <motion.span
                className="block font-heading text-7xl font-extrabold leading-[0.85]"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.3 }}
              >
                {dias}
              </motion.span>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-amarelo-900">
                {dias === 0 ? 'termina hoje' : dias === 1 ? 'dia para votar' : 'dias para votar'}
              </span>
            </div>
          )}
          <Link
            to={`/projetos/${projeto.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-grafite-900 px-5 py-3 text-sm font-bold text-amarelo-300 transition-transform group-hover:-translate-y-0.5"
          >
            Ver e votar
            <motion.span aria-hidden animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
              →
            </motion.span>
          </Link>
        </div>
      </div>
    </motion.article>
  )
}
