import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { animate, motion, useMotionValue } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { CONTAS_DEMO, SENHA_DEMO } from '../../lib/contasDemo'

interface Cracha {
  chave: string
  papel: string
  nome: string
  inicial: string
  pode: string[]
  rotulo: string
  alca: number
  cor: { topo: string; tinta: string; avatar: string; alca: string }
  email?: string
}

const CRACHAS: Cracha[] = [
  {
    chave: 'visitante',
    papel: 'Visitante',
    nome: 'Sem conta',
    inicial: '?',
    pode: ['Ver o mapa vivo', 'Ler relatos e respostas', 'Conhecer os projetos'],
    rotulo: 'Explorar sem conta',
    alca: 90,
    cor: { topo: 'bg-white', tinta: 'text-grafite-900', avatar: 'bg-grafite-100 text-grafite-500', alca: 'bg-grafite-300' },
  },
  {
    chave: 'cidada',
    papel: CONTAS_DEMO.cidada.papel,
    nome: CONTAS_DEMO.cidada.nome,
    inicial: CONTAS_DEMO.cidada.nome[0],
    pode: ['Relatar e apoiar', 'Comentar e votar', 'Acompanhar obras'],
    rotulo: 'Entrar como cidadã',
    alca: 150,
    cor: { topo: 'bg-amarelo-500', tinta: 'text-grafite-900', avatar: 'bg-white text-grafite-900', alca: 'bg-amarelo-500' },
    email: CONTAS_DEMO.cidada.email,
  },
  {
    chave: 'gestor',
    papel: CONTAS_DEMO.gestor.papel,
    nome: CONTAS_DEMO.gestor.nome,
    inicial: 'S',
    pode: ['Responder relatos', 'Publicar projetos', 'Ver o painel do órgão'],
    rotulo: 'Entrar como gestor',
    alca: 115,
    cor: { topo: 'bg-status-azul-700', tinta: 'text-white', avatar: 'bg-white text-status-azul-700', alca: 'bg-status-azul-700' },
    email: CONTAS_DEMO.gestor.email,
  },
]

// Código de barras decorativo, sempre igual para o mesmo crachá.
function Barras({ semente }: { semente: string }) {
  const larguras = Array.from({ length: 34 }, (_, i) => ((semente.charCodeAt(i % semente.length) * (i + 3)) % 4) + 1)
  let x = 0
  return (
    <svg viewBox="0 0 160 28" className="h-7 w-40" aria-hidden>
      {larguras.map((l, i) => {
        const r = i % 2 === 0 ? <rect key={i} x={x} y={0} width={l} height={28} fill="currentColor" /> : null
        x += l + 1
        return r
      })}
    </svg>
  )
}

// Um crachá pendurado no trilho. Balança sozinho, dá um tranco quando o mouse
// chega e pode ser puxado para o lado como um pêndulo.
function CrachaPendurado({ c, indice, onEntrar, entrando }: { c: Cracha; indice: number; onEntrar: () => void; entrando: boolean }) {
  const rot = useMotionValue(0)

  function balancar() {
    animate(rot, [rot.get(), 6, -4, 2.2, -1, 0], { duration: 1.8, ease: 'easeOut' })
  }

  return (
    <div
      className="anima-continua origin-top"
      style={{ animation: `balancar ${5 + indice}s ease-in-out ${indice * -1.3}s infinite` }}
    >
      <motion.div
        style={{ rotate: rot, touchAction: 'pan-y' }}
        className="flex origin-top flex-col items-center"
        onHoverStart={balancar}
        onPan={(e, info) => {
          if ((e as PointerEvent).pointerType !== 'mouse') return
          rot.set(Math.max(-25, Math.min(25, -info.offset.x / 8)))
        }}
        onPanEnd={() => animate(rot, 0, { type: 'spring', stiffness: 60, damping: 4 })}
      >
        {/* alça */}
        <span className={`relative w-7 ${c.cor.alca}`} style={{ height: c.alca }}>
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-black/20" />
        </span>
        {/* presilha */}
        <span className="-mt-1 h-6 w-10 rounded-md bg-gradient-to-b from-grafite-200 to-grafite-300 shadow-inner ring-1 ring-black/10" />

        <div className="-mt-2 w-[290px] select-none overflow-hidden rounded-[26px] bg-white shadow-[0_40px_70px_-35px_rgba(27,24,19,0.6)] ring-1 ring-grafite-900/10">
          <div className={`relative px-5 pb-12 pt-5 ${c.cor.topo} ${c.cor.tinta}`}>
            <span className="absolute left-1/2 top-3 h-2.5 w-14 -translate-x-1/2 rounded-full bg-black/15" />
            <span className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.18em] opacity-80">
              <span className="flex items-center gap-1.5">
                <img src="/logo.png" alt="" className="h-5 w-5" /> Confluência
              </span>
              <span>Recife</span>
            </span>
          </div>
          <div className="relative px-5 pb-5">
            <span
              className={`-mt-10 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white font-heading text-3xl font-extrabold shadow-md ${c.cor.avatar}`}
            >
              {c.inicial}
            </span>
            <p className="mt-3 font-heading text-2xl font-extrabold leading-tight text-grafite-900">{c.nome}</p>
            <p className="font-serif text-lg italic text-grafite-500">{c.papel}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-grafite-700">
              {c.pode.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-status-verde-500 text-[9px] font-bold text-white">✓</span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-end justify-between text-grafite-900">
              <Barras semente={c.chave} />
              <span className="font-mono text-[10px] text-grafite-500">Nº 00{indice + 1}</span>
            </div>
            <button
              type="button"
              onClick={onEntrar}
              disabled={entrando}
              className="group mt-4 flex w-full items-center justify-between rounded-full bg-grafite-100 py-2 pl-5 pr-2 text-sm font-bold text-grafite-900 transition-colors hover:bg-amarelo-500 disabled:opacity-60"
            >
              {entrando ? 'Entrando…' : c.rotulo}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white transition-transform duration-300 group-hover:rotate-[-45deg]">
                →
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Três formas de conhecer o sistema: sem conta, como cidadã ou como gestor —
// três crachás pendurados num trilho.
export default function Crachas() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [entrando, setEntrando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function entrar(c: Cracha) {
    if (!c.email) {
      navigate('/feed')
      return
    }
    setEntrando(c.chave)
    setErro(null)
    const { error } = await signIn(c.email, SENHA_DEMO)
    setEntrando(null)
    if (error) {
      setErro('Não foi possível entrar com a conta de demonstração agora. Tente pela tela de login.')
      return
    }
    navigate('/feed')
  }

  return (
    <section id="experimente" className="relative overflow-hidden bg-amarelo-100 pb-24 pt-[14vh]">
      <div className="px-[4vw]">
        <h2 className="max-w-4xl font-heading text-[clamp(2.6rem,6vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.03em] text-grafite-900">
          Pegue um crachá e <span className="font-serif font-normal italic text-amarelo-700">entre.</span>
        </h2>
        <p className="mt-4 max-w-md text-lg text-grafite-700">
          Três jeitos de conhecer o Confluência: sem conta, como moradora ou como o órgão que responde.
        </p>
      </div>

      {/* trilho */}
      <div className="relative mt-16">
        <div className="mx-[4vw] h-4 rounded-full bg-grafite-900 shadow-[0_8px_16px_-8px_rgba(27,24,19,0.6)]" />
        <div className="-mt-2 flex flex-col items-center gap-12 px-[4vw] md:flex-row md:items-start md:justify-center md:gap-[4vw]">
          {CRACHAS.map((c, i) => (
            <CrachaPendurado key={c.chave} c={c} indice={i} entrando={entrando === c.chave} onEntrar={() => entrar(c)} />
          ))}
        </div>
      </div>
      {erro && <p className="mt-6 text-center text-sm text-status-vermelho-700">{erro}</p>}
    </section>
  )
}
