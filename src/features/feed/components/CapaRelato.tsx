import { fotoDaRegiao } from '../../../lib/fotos'

interface CapaRelatoProps {
  fotoUrl: string | null
  bairro: string
  className?: string
}

// Faixa de foto no topo do card do relato: a foto que a pessoa mandou ou, se
// não mandou, a foto da região do bairro (com crédito, exigido pela licença).
export default function CapaRelato({ fotoUrl, bairro, className = 'h-28' }: CapaRelatoProps) {
  const regiao = fotoUrl ? null : fotoDaRegiao(bairro)
  const url = fotoUrl ?? regiao?.url
  if (!url) return null
  return (
    <span className={`relative block overflow-hidden bg-grafite-200 ${className}`}>
      <img src={url} alt={fotoUrl ? `Foto do problema em ${bairro}` : ''} loading="lazy" className="h-full w-full object-cover" />
      <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
      <span className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2 text-white">
        <span className="text-[13px] font-bold drop-shadow">{bairro}</span>
        {regiao ? (
          <span className="truncate text-[9px] text-white/80" title={`${regiao.lugar}. Foto: ${regiao.autor}, ${regiao.licenca}, Wikimedia Commons`}>
            Região · {regiao.lugar} · {regiao.autor}, {regiao.licenca}
          </span>
        ) : (
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-grafite-900">Foto do relato</span>
        )}
      </span>
    </span>
  )
}
