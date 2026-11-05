import { Link } from 'react-router-dom'
import type { PerfilPublico } from '../../../types/database'
import { corAvatar, nomePublico } from '../perfis'

interface AvatarProps {
  perfil?: PerfilPublico
  anonimo?: boolean
  size?: number
}

export function Avatar({ perfil, anonimo, size = 32 }: AvatarProps) {
  if (anonimo || !perfil) {
    return (
      <span
        aria-hidden
        className="flex flex-shrink-0 items-center justify-center rounded-full bg-grafite-200 text-grafite-500"
        style={{ width: size, height: size }}
      >
        {/* máscara: relato anônimo */}
        <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="currentColor">
          <path d="M3 9c0-1.7 1.3-3 3-3h12c1.7 0 3 1.3 3 3 0 4-2.6 7-6 7-1.4 0-2.3-.9-3-2-.7 1.1-1.6 2-3 2-3.4 0-6-3-6-7Zm4.5 1.5a1.5 1.5 0 1 0 0 .01Zm9 0a1.5 1.5 0 1 0 0 .01Z" />
        </svg>
      </span>
    )
  }
  if (perfil.avatar_url) {
    return (
      <img
        src={perfil.avatar_url}
        alt=""
        loading="lazy"
        className={`flex-shrink-0 rounded-full object-cover ${perfil.institucional_verificado ? 'ring-2 ring-status-azul-500 ring-offset-2' : ''}`}
        style={{ width: size, height: size }}
      />
    )
  }
  const inicial = nomePublico(perfil).replace('@', '')[0]?.toUpperCase() ?? '?'
  return (
    <span
      aria-hidden
      className={`flex flex-shrink-0 items-center justify-center rounded-full font-heading font-extrabold text-white ${
        perfil.institucional_verificado ? 'ring-2 ring-status-azul-500 ring-offset-2' : ''
      }`}
      style={{ width: size, height: size, background: corAvatar(perfil.id), fontSize: size * 0.42 }}
    >
      {inicial}
    </span>
  )
}

export function SeloOrgao() {
  return (
    <span
      title="Órgão público verificado"
      className="inline-flex items-center gap-1 rounded-full bg-status-azul-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-status-azul-700"
    >
      <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
        <path d="M5 12.5 10 17l9-10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Órgão
    </span>
  )
}

interface AutorLinhaProps {
  userId: string | null
  perfil?: PerfilPublico
  anonimo?: boolean
  bairroDoRelato: string
  /** Texto à direita (ex: "há 2 dias"). */
  extra?: string
}

// "Avatar · @apelido · Órgão" com link para o perfil público; anônimo não leva a lugar nenhum.
export default function AutorLinha({ userId, perfil, anonimo, bairroDoRelato, extra }: AutorLinhaProps) {
  const oculto = anonimo || !userId
  const conteudo = (
    <>
      <Avatar perfil={perfil} anonimo={oculto} size={26} />
      <span className="min-w-0 truncate text-[13px] font-semibold text-grafite-900">
        {oculto ? `Anônimo · ${bairroDoRelato}` : nomePublico(perfil)}
      </span>
      {!oculto && perfil?.institucional_verificado && <SeloOrgao />}
    </>
  )

  return (
    <span className="flex min-w-0 items-center justify-between gap-2">
      {oculto ? (
        <span className="flex min-w-0 items-center gap-2" title="Relato anônimo: o autor não é exibido">
          {conteudo}
        </span>
      ) : (
        <Link
          to={`/u/${userId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex min-w-0 items-center gap-2 rounded-full pr-2 hover:bg-grafite-100"
        >
          {conteudo}
        </Link>
      )}
      {extra && <span className="flex-shrink-0 text-[11px] text-grafite-500">{extra}</span>}
    </span>
  )
}
