import { useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import IconeCategoria from '../../feed/components/IconeCategoria'
import { CATEGORIA_RGB, rgb } from '../../feed/cores'
import { normalizar, realcar } from '../../feed/busca'
import { protocoloRelato, type RelatoResumo } from '../origem'
import { CATEGORIAS, type Categoria } from '../../../types/database'

const MAX_RESULTADOS = 5

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

const rotuloCategoria = (c: Categoria) => CATEGORIAS.find((x) => x.value === c)?.label ?? c

interface Props {
  relatos: RelatoResumo[] | null
  /** Id do relato escolhido ('' = nenhum). */
  valor: string
  onMudar: (id: string) => void
  /** Categoria escolhida no formulário: relatos dela aparecem primeiro. */
  categoria: Categoria
  erroCarga?: string | null
}

// Tarefa 4.1 da Ana: no formulário de criar projeto, o órgão BUSCA o relato de
// origem (por bairro, texto ou protocolo) em vez de rolar um <select> com 300
// opções. Relatos da mesma categoria do projeto aparecem primeiro.
export default function SeletorRelato({ relatos, valor, onMudar, categoria, erroCarga }: Props) {
  const [termo, setTermo] = useState('')
  const idBusca = useId()
  const escolhido = relatos?.find((r) => r.id === valor) ?? null

  const resultados = useMemo(() => {
    if (!relatos) return []
    const alvo = normalizar(termo.trim())
    const filtrados = alvo
      ? relatos.filter(
          (r) =>
            normalizar(r.bairro).includes(alvo) ||
            normalizar(r.descricao).includes(alvo) ||
            normalizar(protocoloRelato(r.id)).includes(alvo),
        )
      : relatos
    // Mesma categoria primeiro; dentro de cada grupo, a ordem que veio (mais recentes antes).
    return [...filtrados].sort((a, b) => Number(b.categoria === categoria) - Number(a.categoria === categoria))
  }, [relatos, termo, categoria])

  if (escolhido) {
    const cor = rgb(CATEGORIA_RGB[escolhido.categoria])
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[var(--radius-field)] border-2 border-amarelo-500 bg-amarelo-50 p-4"
      >
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em]">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-white" style={{ background: cor }}>
            <IconeCategoria categoria={escolhido.categoria} size={12} />
            {rotuloCategoria(escolhido.categoria)}
          </span>
          <span className="text-grafite-700">{protocoloRelato(escolhido.id)}</span>
          <span className="font-semibold normal-case tracking-normal text-grafite-500">{dataCurta(escolhido.created_at)}</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-grafite-900">{escolhido.bairro}</p>
        <p className="mt-0.5 line-clamp-3 text-sm text-grafite-700">“{escolhido.descricao}”</p>
        {escolhido.categoria !== categoria && (
          <p className="mt-2 text-xs text-status-terracota-700">
            O relato é de {rotuloCategoria(escolhido.categoria)} e o projeto, de {rotuloCategoria(categoria)}. Confira se é
            o relato certo.
          </p>
        )}
        <button
          type="button"
          onClick={() => onMudar('')}
          className="mt-3 text-sm font-semibold text-amarelo-700 hover:underline"
        >
          Trocar relato
        </button>
      </motion.div>
    )
  }

  return (
    <div>
      <input
        id={idBusca}
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Busque por bairro, texto ou protocolo (OC-…)"
        aria-label="Buscar relato de origem"
        aria-controls={`${idBusca}-lista`}
        className="w-full rounded-[var(--radius-field)] border border-grafite-200 bg-white px-4 py-2.5 text-sm text-grafite-900 placeholder:text-grafite-500 focus:border-amarelo-500 focus:outline-none focus:ring-2 focus:ring-amarelo-500/30"
      />

      {erroCarga ? (
        <p className="mt-2 text-xs text-status-vermelho-700">Não foi possível carregar os relatos: {erroCarga}</p>
      ) : relatos === null ? (
        <div className="mt-2 h-16 animate-pulse rounded-[var(--radius-field)] bg-grafite-100" aria-label="Carregando relatos" />
      ) : resultados.length === 0 ? (
        <p className="mt-2 text-xs text-grafite-500">
          {termo.trim() ? `Nenhum relato encontrado para "${termo.trim()}".` : 'Ainda não há relatos no Feed.'}
        </p>
      ) : (
        <>
          <ul id={`${idBusca}-lista`} className="mt-2 space-y-1.5" aria-label="Relatos encontrados">
            <AnimatePresence initial={false}>
              {resultados.slice(0, MAX_RESULTADOS).map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onMudar(r.id)
                      setTermo('')
                    }}
                    className="flex w-full items-start gap-3 rounded-[var(--radius-field)] border border-grafite-200 bg-white p-3 text-left transition-colors hover:border-amarelo-500 hover:bg-amarelo-50 focus-visible:border-amarelo-500 focus-visible:outline-none"
                  >
                    <span
                      className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white"
                      style={{ background: rgb(CATEGORIA_RGB[r.categoria]) }}
                      aria-hidden
                    >
                      <IconeCategoria categoria={r.categoria} size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-grafite-900">
                        {realcar(r.bairro, termo)}
                        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-grafite-500">
                          {realcar(protocoloRelato(r.id), termo)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-grafite-700">{realcar(r.descricao, termo)}</span>
                    </span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          {resultados.length > MAX_RESULTADOS && (
            <p className="mt-1.5 text-xs text-grafite-500">
              Mostrando {MAX_RESULTADOS} de {resultados.length}. Refine a busca para achar outro.
            </p>
          )}
        </>
      )}
    </div>
  )
}
