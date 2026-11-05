import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useEhGestor } from '../context/useEhGestor'
import { useProjetosSalvos } from '../features/projetos/useProjetosSalvos'
import Notificacoes from './Notificacoes'

const Icone = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    width={17}
    height={17}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
)

const ICONES = {
  feed: (
    <Icone>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Icone>
  ),
  projetos: (
    <Icone>
      <path d="M4 20h16M6 20V9l6-4 6 4v11M10 20v-5h4v5" />
    </Icone>
  ),
  painel: (
    <Icone>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </Icone>
  ),
  perfil: (
    <Icone>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </Icone>
  ),
  salvo: (
    <Icone>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
    </Icone>
  ),
  sair: (
    <Icone>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10" />
    </Icone>
  ),
}

interface ItemNav {
  to: string
  label: string
  curto: string
  icone: ReactNode
  ativo: (path: string) => boolean
}

// Navegação central em pílula: o item ativo tem um fundo amarelo que desliza
// entre os itens, e um fundo claro acompanha o item sob o mouse.
function NavCentral() {
  const { pathname } = useLocation()
  const ehGestor = useEhGestor()
  const [sobMouse, setSobMouse] = useState<string | null>(null)

  const itens: ItemNav[] = [
    {
      to: '/feed',
      label: 'Feed',
      curto: 'Feed',
      icone: ICONES.feed,
      ativo: (p) => p === '/' || p.startsWith('/feed'),
    },
    {
      to: '/projetos',
      label: 'Projetos',
      curto: 'Projetos',
      icone: ICONES.projetos,
      ativo: (p) => p.startsWith('/projetos'),
    },
  ]
  if (ehGestor) {
    itens.push({ to: '/painel', label: 'Painel de gestor', curto: 'Painel', icone: ICONES.painel, ativo: (p) => p === '/painel' })
  }

  return (
    <nav
      aria-label="Principal"
      onMouseLeave={() => setSobMouse(null)}
      className="flex items-center gap-0.5 rounded-full border border-grafite-200 bg-white/80 p-1 shadow-[0_6px_20px_-12px_rgba(27,24,19,0.35)]"
    >
      {itens.map((item) => {
        const ativo = item.ativo(pathname)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onMouseEnter={() => setSobMouse(item.to)}
            aria-current={ativo ? 'page' : undefined}
            className={`relative flex items-center gap-1.5 rounded-full px-3 sm:px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors ${
              ativo ? 'text-grafite-900' : 'text-grafite-700 hover:text-grafite-900'
            }`}
          >
            {sobMouse === item.to && !ativo && (
              <motion.span
                layoutId="nav-sob-mouse"
                className="absolute inset-0 rounded-full bg-grafite-100"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            {ativo && (
              <motion.span
                layoutId="nav-ativo"
                className="absolute inset-0 rounded-full bg-amarelo-500 shadow-[0_6px_16px_-8px_rgba(245,184,0,0.9)]"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative hidden sm:inline-flex">{item.icone}</span>
            <span className="relative">
              <span className="sm:hidden">{item.curto}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}

// Botão de conta: avatar + nome + papel, abre um menu com o cartão de identidade.
function MenuConta() {
  const { user, profile, signOut } = useAuth()
  const ehGestor = useEhGestor()
  const { salvos } = useProjetosSalvos()
  const navigate = useNavigate()
  const id = useId()
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  if (!user) return null

  const nome = profile?.orgao_nome || profile?.nome || user.email?.split('@')[0] || 'Você'
  const papel = profile?.institucional_verificado ? 'Gestor público' : 'Cidadão'

  async function sair() {
    setAberto(false)
    await signOut()
    navigate('/')
  }

  return (
    <div ref={raiz} className="relative">
      <motion.button
        ref={botao}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={`${id}-menu`}
        onClick={() => setAberto((a) => !a)}
        whileTap={{ scale: 0.96 }}
        className={`flex items-center gap-2.5 rounded-full border py-1 pl-1 pr-1 sm:pr-3 transition-colors ${
          aberto ? 'border-amarelo-500 bg-amarelo-50' : 'border-grafite-200 bg-white hover:border-grafite-300'
        }`}
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-amarelo-500 font-heading text-sm font-extrabold text-grafite-900">
          {nome[0].toUpperCase()}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-status-verde-500" />
        </span>
        <span className="hidden sm:block text-left leading-tight">
          <span className="block max-w-[130px] truncate text-sm font-semibold text-grafite-900">{nome}</span>
          <span className="block text-[11px] text-grafite-500">{papel}</span>
        </span>
        <motion.svg
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          animate={{ rotate: aberto ? 180 : 0 }}
          className="hidden sm:block text-grafite-500"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            id={`${id}-menu`}
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 480, damping: 34 }}
            style={{ transformOrigin: 'top right' }}
            className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-3xl border border-grafite-200 bg-white shadow-[0_24px_50px_-18px_rgba(27,24,19,0.4)]"
          >
            <div className="relative overflow-hidden bg-amarelo-500 px-5 py-4">
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-10 opacity-[0.12]"
                style={{ backgroundImage: 'repeating-linear-gradient(115deg, #1b1813 0 2px, transparent 2px 20px)' }}
                animate={{ x: [0, 40] }}
                transition={{ duration: 3.5, ease: 'linear', repeat: Infinity }}
              />
              <div className="relative flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white font-heading text-xl font-extrabold text-grafite-900 shadow-sm">
                  {nome[0].toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-heading text-base font-bold text-grafite-900">{nome}</span>
                  <span className="block truncate text-xs text-amarelo-900">{user.email}</span>
                </span>
              </div>
              <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-grafite-900/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-amarelo-300">
                {papel}
              </span>
            </div>

            <div className="p-2">
              {([
                { to: `/u/${user.id}`, rotulo: 'Meu perfil', icone: ICONES.perfil, mostrar: true },
                {
                  to: `/u/${user.id}?aba=acompanhando`,
                  rotulo: 'Acompanhando',
                  icone: ICONES.salvo,
                  mostrar: true,
                  contagem: salvos.length,
                },
                { to: '/painel', rotulo: 'Painel de gestor', icone: ICONES.painel, mostrar: ehGestor },
              ] as { to: string; rotulo: string; icone: ReactNode; mostrar: boolean; contagem?: number }[])
                .filter((i) => i.mostrar)
                .map((item, i) => (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                  >
                    <Link
                      to={item.to}
                      role="menuitem"
                      onClick={() => setAberto(false)}
                      className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-grafite-900 hover:bg-amarelo-50"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-grafite-100 text-grafite-700 transition-colors group-hover:bg-amarelo-500 group-hover:text-grafite-900">
                        {item.icone}
                      </span>
                      <span className="flex-1">{item.rotulo}</span>
                      {item.contagem !== undefined && (
                        <span className="rounded-full bg-amarelo-100 px-2 py-0.5 text-xs font-bold text-amarelo-900">
                          {item.contagem}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                ))}
              <div className="my-1.5 h-px bg-grafite-200" />
              <button
                type="button"
                role="menuitem"
                onClick={sair}
                className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-status-vermelho-700 hover:bg-status-vermelho-50"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-status-vermelho-50 transition-colors group-hover:bg-status-vermelho-500 group-hover:text-white">
                  {ICONES.sair}
                </span>
                Sair da conta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Grade de 3 colunas (1fr · auto · 1fr): a navegação fica sempre no centro,
// não importa se à direita aparece "Entrar" ou o avatar — sem pulo de layout.
export default function NavBar() {
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-[1000] h-[57px] border-b border-grafite-200/80 bg-grafite-50">
      <div className="mx-auto grid h-full max-w-7xl grid-cols-[auto_1fr_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-5">
        <Link to="/feed" className="group flex items-center gap-2.5 justify-self-start" aria-label="Confluência — início">
          <motion.img
            src="/logo.png"
            alt=""
            width={34}
            height={34}
            className="h-[34px] w-[34px]"
            whileHover={{ rotate: -12, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
          />
          <span className="hidden md:block font-heading text-lg font-extrabold text-grafite-900">Confluência</span>
        </Link>

        <div className="justify-self-center">
          <NavCentral />
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          {loading ? (
            <span className="h-10 w-10 animate-pulse rounded-full bg-grafite-200" />
          ) : user ? (
            <>
              <Notificacoes />
              <MenuConta />
            </>
          ) : (
            // MVP: sem cadastro aberto — "Entrar" leva às contas de demonstração.
            <Link
              to="/entrar"
              className="rounded-full bg-amarelo-500 px-4 py-2 text-sm font-semibold text-grafite-900 shadow-[0_8px_18px_-10px_rgba(245,184,0,0.9)] transition-transform hover:-translate-y-0.5"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
