import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { isSupabaseConfigured } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { buscarMeuComprovante, buscarResultado, votar as registrarVoto } from '../api'
import type { Projeto, VotosResultado } from '../../../types/database'
import { diasRestantes } from '../etapas'
import { ehExemplo } from '../vitrine'

type Opcao = 'favor' | 'contra'

// Cédula da consulta pública. Tudo passa por ../api.ts (Tarefas 3.1/3.3 da Ana):
// o voto é a função `votar` do banco, que valida prazo e status, bloqueia voto
// duplicado e gera o hash do comprovante. "Já votou" vem de `meu_comprovante`,
// então continua valendo depois de recarregar a página.
export default function Cedula({ projeto, agora }: { projeto: Projeto; agora: number }) {
  const { user } = useAuth()
  const [voto, setVoto] = useState<Opcao | null>(null)
  const [escolha, setEscolha] = useState<Opcao | null>(null)
  const [comprovante, setComprovante] = useState<string | null>(null)
  const [jaVotou, setJaVotou] = useState(false)
  const [votando, setVotando] = useState(false)
  const [erroVoto, setErroVoto] = useState<string | null>(null)
  const [resultado, setResultado] = useState<VotosResultado | null>(null)
  const dias = diasRestantes(projeto, agora)
  // Projeto de exemplo com o banco ligado: não existe na tabela, então não dá para votar.
  const soExemplo = isSupabaseConfigured && ehExemplo(projeto.id)
  const userId = user?.id

  useEffect(() => {
    if (soExemplo) return
    let cancelado = false
    buscarResultado(projeto.id)
      .then((r) => {
        if (!cancelado) setResultado(r)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [projeto.id, soExemplo])

  useEffect(() => {
    if (soExemplo || (isSupabaseConfigured && !userId)) return
    let cancelado = false
    buscarMeuComprovante(projeto.id)
      .then((c) => {
        if (!cancelado && c) {
          setComprovante(c.slice(0, 16).toUpperCase())
          setJaVotou(true)
        }
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [projeto.id, userId, soExemplo])

  async function confirmar() {
    if (!escolha) return
    if (soExemplo) {
      setErroVoto(
        'Este é um projeto de exemplo e ainda não está no banco. A votação funciona nos projetos publicados pelos órgãos.',
      )
      setEscolha(null)
      return
    }
    setVotando(true)
    setErroVoto(null)
    const r = await registrarVoto(projeto.id, escolha)
    setVotando(false)

    if (!r.ok) {
      if (r.motivo === 'ja_votou') setJaVotou(true)
      else setErroVoto(r.mensagem)
      setEscolha(null)
      return
    }

    setVoto(escolha)
    setEscolha(null)
    setComprovante(r.comprovante.slice(0, 16).toUpperCase())
    // Recarrega o agregado oficial, que já inclui o voto novo.
    buscarResultado(projeto.id)
      .then(setResultado)
      .catch(() => {})
  }

  const total = resultado?.total_votos ?? 0
  const pctFavor = total ? Math.round(((resultado?.votos_favor ?? 0) / total) * 100) : 0

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-grafite-200 bg-white shadow-[0_30px_60px_-30px_rgba(27,24,19,0.35)]">
      <div className="relative overflow-hidden bg-amarelo-500 px-6 py-5">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-10 opacity-[0.12]"
          style={{ backgroundImage: 'repeating-linear-gradient(115deg, #1b1813 0 2px, transparent 2px 22px)' }}
          animate={{ x: [0, 44] }}
          transition={{ duration: 3.5, ease: 'linear', repeat: Infinity }}
        />
        <p className="relative text-[11px] font-bold uppercase tracking-[0.14em] text-amarelo-900">Cédula · consulta pública</p>
        <p className="relative mt-1 font-heading text-2xl font-extrabold leading-tight text-grafite-900">
          Você aprova este projeto?
        </p>
        {dias !== null && (
          <p className="relative mt-1 text-sm font-semibold text-amarelo-900">
            {dias === 0 ? 'Último dia para votar' : `Faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
          </p>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-end justify-between">
          <span>
            <span className="block font-heading text-4xl font-extrabold leading-none text-status-verde-700">{pctFavor}%</span>
            <span className="text-xs text-grafite-500">a favor</span>
          </span>
          <span className="text-right">
            <span className="block font-heading text-4xl font-extrabold leading-none text-status-vermelho-700">
              {total ? 100 - pctFavor : 0}%
            </span>
            <span className="text-xs text-grafite-500">contra</span>
          </span>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-grafite-200">
          <motion.div
            className="h-full bg-status-verde-500"
            initial={{ width: 0 }}
            animate={{ width: `${pctFavor}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="ml-auto h-full bg-status-vermelho-500"
            initial={{ width: 0 }}
            animate={{ width: `${total ? 100 - pctFavor : 0}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="mt-2 text-xs text-grafite-500">
          {total === 0 ? 'Nenhum voto ainda — seja o primeiro.' : `${total.toLocaleString('pt-BR')} ${total === 1 ? 'voto' : 'votos'} no total`}
        </p>

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {voto ? (
              <motion.div key="recibo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                {/* Carimbo */}
                <motion.div
                  initial={{ scale: 2.4, opacity: 0, rotate: -24 }}
                  animate={{ scale: 1, opacity: 1, rotate: -8 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                  className="absolute -right-2 -top-4 z-10 rounded-xl border-[3px] border-status-verde-700 px-3 py-1.5 text-center font-heading text-sm font-extrabold uppercase leading-tight text-status-verde-700 mix-blend-multiply"
                >
                  Voto
                  <br />
                  registrado
                </motion.div>
                <div className="rounded-2xl border-2 border-dashed border-grafite-300 bg-grafite-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-grafite-500">Comprovante</p>
                  <p className="mt-1 text-sm text-grafite-900">
                    Você votou <b>{voto === 'favor' ? 'a favor' : 'contra'}</b>. Guarde o código: ele não será mostrado
                    de novo.
                  </p>
                  <p className="mt-3 rounded-lg bg-white px-3 py-2 font-mono text-sm font-semibold tracking-[0.15em] text-grafite-900">
                    {comprovante?.split('').map((c, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 + i * 0.045 }}
                      >
                        {c}
                      </motion.span>
                    ))}
                  </p>
                </div>
              </motion.div>
            ) : jaVotou ? (
              <motion.p
                key="ja-votou"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-grafite-100 p-4 text-sm text-grafite-700"
              >
                Você já votou neste projeto. Como o voto é secreto, não dá para mostrar qual opção você escolheu.
                {comprovante && (
                  <span className="mt-2 block font-mono text-xs font-semibold tracking-[0.15em] text-grafite-900">
                    Comprovante: {comprovante}
                  </span>
                )}
              </motion.p>
            ) : !user ? (
              <motion.div key="entrar" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Link
                  to="/entrar"
                  className="flex w-full items-center justify-center rounded-2xl bg-amarelo-500 px-4 py-3.5 text-sm font-bold text-grafite-900 transition-transform hover:-translate-y-0.5"
                >
                  Entre para votar
                </Link>
              </motion.div>
            ) : (
              <motion.div key="botoes" exit={{ opacity: 0, scale: 0.97 }}>
                {escolha ? (
                  <div className="rounded-2xl bg-grafite-100 p-4">
                    <p className="text-sm text-grafite-900">
                      Confirmar voto <b>{escolha === 'favor' ? 'a favor' : 'contra'}</b>? Depois de enviado, não dá para
                      trocar.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEscolha(null)}
                        disabled={votando}
                        className="rounded-2xl border-2 border-grafite-300 px-4 py-3 text-sm font-bold text-grafite-700 hover:bg-white disabled:opacity-60"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={confirmar}
                        disabled={votando}
                        className="rounded-2xl bg-amarelo-500 px-4 py-3 text-sm font-bold text-grafite-900 hover:bg-amarelo-300 disabled:opacity-60"
                      >
                        {votando ? 'Registrando…' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {(['favor', 'contra'] as const).map((opcao) => (
                      <motion.button
                        key={opcao}
                        type="button"
                        onClick={() => {
                          setErroVoto(null)
                          setEscolha(opcao)
                        }}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.96 }}
                        className={`rounded-2xl px-4 py-4 text-sm font-bold transition-colors ${
                          opcao === 'favor'
                            ? 'bg-status-verde-500 text-white hover:bg-status-verde-700'
                            : 'border-2 border-status-vermelho-500 text-status-vermelho-700 hover:bg-status-vermelho-50'
                        }`}
                      >
                        {opcao === 'favor' ? 'Sou a favor' : 'Sou contra'}
                      </motion.button>
                    ))}
                  </div>
                )}
                {erroVoto && <p className="mt-3 text-xs text-status-vermelho-700">{erroVoto}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 border-t border-grafite-200 pt-4 text-xs text-grafite-500">
          Voto secreto e consultivo: ninguém vê sua escolha, nem o órgão. O resultado orienta a decisão, mas não a
          obriga. Nesta versão, cada conta vota uma vez; ainda não há verificação de identidade por CPF ou gov.br.
        </p>
      </div>
    </div>
  )
}
