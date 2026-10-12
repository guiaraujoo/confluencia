import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import FeedPage from './features/feed/pages/FeedPage'
import CreatePostPage from './features/feed/pages/CreatePostPage'
import PostDetailPage from './features/feed/pages/PostDetailPage'
import ProjetosPage from './features/projetos/pages/ProjetosPage'
import ProjetoDetailPage from './features/projetos/pages/ProjetoDetailPage'
import PainelGestorPage from './features/projetos/pages/PainelGestorPage'
import CriarProjetoPage from './features/projetos/pages/CriarProjetoPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import PerfilPage from './pages/perfil/PerfilPage'
import RequireInstitutional from './components/RequireInstitutional'
import PageTransition from './components/PageTransition'

function NavBar() {
  const { user, signOut } = useAuth()
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative text-sm font-medium px-3 py-2 rounded-[var(--radius-field)] transition-colors ${
      isActive ? 'text-amarelo-700' : 'text-grafite-700 hover:bg-grafite-100'
    }`

  return (
    <header className="border-b border-grafite-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <motion.div
            className="h-7 w-7 rounded-full bg-amarelo-500 flex items-center justify-center mr-2"
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <span className="font-heading text-xs font-bold text-grafite-900">C</span>
          </motion.div>
          <NavLink to="/feed" className={linkClass}>
            {({ isActive }) => (
              <>
                Feed
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute left-3 right-3 -bottom-[1px] h-0.5 bg-amarelo-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </>
            )}
          </NavLink>
          <NavLink to="/projetos" className={linkClass}>
            {({ isActive }) => (
              <>
                Projetos
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute left-3 right-3 -bottom-[1px] h-0.5 bg-amarelo-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </>
            )}
          </NavLink>
          <NavLink to="/painel" className={linkClass}>
            {({ isActive }) => (
              <>
                Painel de gestor
                {isActive && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute left-3 right-3 -bottom-[1px] h-0.5 bg-amarelo-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </>
            )}
          </NavLink>
        </div>
        <div>
          {user ? (
            <div className="flex items-center gap-1">
              <NavLink to="/perfil" className={linkClass}>
                Perfil
              </NavLink>
              <button onClick={() => signOut()} className="text-sm text-grafite-500 hover:underline px-3 py-2">
                Sair
              </button>
            </div>
          ) : (
            <NavLink to="/entrar" className={linkClass}>
              Entrar
            </NavLink>
          )}
        </div>
      </div>
    </header>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><FeedPage /></PageTransition>} />
        <Route path="/feed" element={<PageTransition><FeedPage /></PageTransition>} />
        <Route path="/feed/novo" element={<PageTransition><CreatePostPage /></PageTransition>} />
        <Route path="/feed/:id" element={<PageTransition><PostDetailPage /></PageTransition>} />
        <Route path="/projetos" element={<PageTransition><ProjetosPage /></PageTransition>} />
        <Route
          path="/projetos/novo"
          element={
            <PageTransition>
              <RequireInstitutional>
                <CriarProjetoPage />
              </RequireInstitutional>
            </PageTransition>
          }
        />
        <Route path="/projetos/:id" element={<PageTransition><ProjetoDetailPage /></PageTransition>} />
        <Route
          path="/painel"
          element={
            <PageTransition>
              <RequireInstitutional>
                <PainelGestorPage />
              </RequireInstitutional>
            </PageTransition>
          }
        />
        <Route path="/entrar" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/cadastro" element={<PageTransition><SignupPage /></PageTransition>} />
        <Route path="/perfil" element={<PageTransition><PerfilPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-grafite-50">
      <NavBar />
      <AnimatedRoutes />
    </div>
  )
}

export default App
