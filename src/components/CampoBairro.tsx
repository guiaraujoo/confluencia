import { RPAS } from '../lib/bairros'

interface CampoBairroProps {
  id: string
  value: string
  onChange: (bairro: string) => void
  vazio?: string
  className?: string
}

// Escolha de bairro só entre os 94 oficiais do Recife, agrupados por região.
// Lista nativa de propósito: no celular abre o seletor do próprio sistema.
export default function CampoBairro({ id, value, onChange, vazio = 'Escolha o bairro', className = '' }: CampoBairroProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full appearance-none rounded-2xl border border-grafite-300 bg-white bg-[length:16px] bg-[right_16px_center] bg-no-repeat px-4 py-3 pr-11 text-sm text-grafite-900 focus:border-amarelo-500 focus:outline-none focus:ring-4 focus:ring-amarelo-500/20 ${value ? '' : 'text-grafite-500'} ${className}`}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237c776c' stroke-width='2.2'%3E%3Cpath d='m6 9 6 6 6-6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")" }}
    >
      <option value="">{vazio}</option>
      {RPAS.map((r) => (
        <optgroup key={r.rpa} label={`RPA ${r.rpa} · ${r.nome}`}>
          {r.bairros.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
