import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useEhGestor } from '../context/useEhGestor'

// Onde relatar faz sentido: no mapa, nos projetos e no perfil. Fica fora do
// próprio formulário, do detalhe de um relato, das telas de conta e do painel.
const ROTAS = [/^\/feed\/?$/, /^\/projetos(\/[^/]+)?\/?$/, /^\/u\//]

// Botão flutuante de relatar (como o "postar" das redes): sempre no mesmo
// canto, abre o rótulo ao passar o mouse e tem um pulso amarelo que lembra
// um pino no mapa.
export default function BotaoRelatar() {
  const { user } = useAuth()
  // O órgão responde e cria projetos; relatar é da população.
  const ehGestor = useEhGestor()
  const { pathname } = useLocation()
  const [aberto, setAberto] = useState(false)
  const visivel = Boolean(user) && !ehGestor && pathname !== '/projetos/novo' && ROTAS.some((r) => r.test(pathname))

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          className="fixed bottom-5 right-5 z-[900] sm:bottom-8 sm:right-8"
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 45 }}
          transition={{ type: 'spring', stiffness: 380, damping: 20 }}
        >
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-amarelo-500"
            animate={{ scale: [1, 1.5], opacity: [0.45, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          />
          <Link
            to="/feed/novo"
            aria-label="Relatar problema"
            onMouseEnter={() => setAberto(true)}
            onMouseLeave={() => setAberto(false)}
            onFocus={() => setAberto(true)}
            onBlur={() => setAberto(false)}
            className="relative flex h-16 items-center gap-2 rounded-full bg-amarelo-500 pl-[18px] pr-[18px] font-bold text-grafite-900 shadow-[0_18px_36px_-12px_rgba(245,184,0,0.9),0_6px_14px_-6px_rgba(27,24,19,0.4)] ring-4 ring-grafite-50 active:scale-95"
          >
            <svg viewBox="0 0 24 24" width={28} height={28} aria-hidden>
              <path d="M12 22s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12Z" fill="#1b1813" />
              <path d="M12 6.5v7M8.5 10h7" stroke="#f5b800" strokeWidth={2.4} strokeLinecap="round" />
            </svg>
            <AnimatePresence initial={false}>
              {aberto && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="overflow-hidden whitespace-nowrap pr-1"
                >
                  Relatar problema
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
