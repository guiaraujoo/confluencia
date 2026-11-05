import { useId, useRef } from 'react'

interface CampoFotoProps {
  previa: string | null
  rotulo: string
  dica?: string
  redondo?: boolean
  carregando?: boolean
  className?: string
  /** null = tirar a foto. */
  onEscolher: (arquivo: File | null) => void
}

// Escolher foto: no celular abre a câmera ou a galeria; no computador, os arquivos.
export default function CampoFoto({ previa, rotulo, dica, redondo, carregando, className = '', onEscolher }: CampoFotoProps) {
  const id = useId()
  const entrada = useRef<HTMLInputElement>(null)
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-grafite-900">
        {rotulo}
      </label>
      <div className="mt-1.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={carregando}
          className={`group relative grid shrink-0 place-items-center overflow-hidden border-2 border-dashed border-grafite-300 bg-grafite-50 text-grafite-500 transition-colors hover:border-amarelo-500 hover:text-grafite-900 disabled:opacity-60 ${
            redondo ? 'h-20 w-20 rounded-full' : 'h-28 min-w-0 flex-1 rounded-2xl'
          }`}
          aria-label={previa ? `Trocar ${rotulo.toLowerCase()}` : `Escolher ${rotulo.toLowerCase()}`}
        >
          {previa ? (
            <img src={previa} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          )}
          {carregando && <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-bold text-grafite-900">Enviando…</span>}
        </button>
        {previa && !redondo && !carregando && (
          <button type="button" onClick={() => onEscolher(null)} className="shrink-0 text-xs font-semibold text-grafite-500 hover:text-status-vermelho-700">
            Tirar
          </button>
        )}
      </div>
      {previa && redondo && !carregando && (
        <button type="button" onClick={() => onEscolher(null)} className="mt-1 text-xs font-semibold text-grafite-500 hover:text-status-vermelho-700">
          Tirar
        </button>
      )}
      {dica && <p className="mt-1 text-xs text-grafite-500">{dica}</p>}
      <input
        ref={entrada}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const arquivo = e.target.files?.[0] ?? null
          e.target.value = ''
          if (arquivo) onEscolher(arquivo)
        }}
      />
    </div>
  )
}
