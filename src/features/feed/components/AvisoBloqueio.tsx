// Legenda do mapa: explica as áreas listradas fora da linha amarela.
export default function AvisoBloqueio({ className = '' }: { className?: string }) {
  return (
    <span
      className={`pointer-events-none absolute z-[2] inline-flex items-center gap-2 rounded-full bg-grafite-900/85 px-3 py-1.5 text-[11px] font-bold text-grafite-50 shadow ${className}`}
    >
      <svg viewBox="0 0 24 24" width={13} height={13} aria-hidden>
        <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="#f5b800" />
        <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="#f5b800" strokeWidth="2.4" />
      </svg>
      Fora do Recife: área bloqueada
    </span>
  )
}
