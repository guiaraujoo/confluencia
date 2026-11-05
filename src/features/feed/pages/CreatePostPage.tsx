import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { dentroDoRecife } from '../../../lib/recife'
import { CATEGORIAS, type Categoria, type PostRepercussao } from '../../../types/database'
import { CATEGORIA_RGB, rgb } from '../cores'
import IconeCategoria from '../components/IconeCategoria'
import RelatoItem from '../components/RelatoItem'
import { useDesktop } from '../useDesktop'

// O mapa 3D só é baixado quando esta página abre.
const MapaEscolha = lazy(() => import('../components/MapaEscolha'))

const LIMITE = 600
const PASSOS = ['O quê', 'Onde', 'Conte', 'Revisar'] as const

const DICAS: Record<Categoria, string> = {
  mobilidade: 'Ex: buraco grande na faixa da direita, em frente ao nº 120. Carros desviam para a contramão.',
  iluminacao: 'Ex: três postes apagados há duas semanas; à noite a calçada fica totalmente escura.',
  seguranca: 'Ex: assaltos frequentes no ponto de ônibus entre 18h e 20h. Seu relato será anônimo.',
  saneamento: 'Ex: esgoto a céu aberto na esquina, mau cheiro forte e água parada.',
  pracas_lazer: 'Ex: brinquedos quebrados no parquinho e mato alto na praça.',
  saude: 'Ex: posto de saúde sem médico há um mês; fila desde as 5h.',
  educacao: 'Ex: telhado da escola com infiltração; salas interditadas na chuva.',
  outros: 'Conte o que está acontecendo, desde quando e como afeta quem passa por ali.',
}

// Bairro a partir do ponto marcado (OpenStreetMap / Nominatim). A pessoa pode corrigir.
async function bairroDoPonto([lat, lng]: [number, number]): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=pt-BR`,
    )
    if (!r.ok) return null
    const j = await r.json()
    const a = j.address ?? {}
    return a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? null
  } catch {
    return null
  }
}

// "Relatar problema" em 4 passos — Tarefas 2.1/2.2/3.2 do João (formulário,
// coordenadas e validação), repaginado.
export default function CreatePostPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const desktop = useDesktop()
  const [passo, setPasso] = useState(0)
  const [direcao, setDirecao] = useState(1)
  const [categoria, setCategoria] = useState<Categoria | null>(null)
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [bairro, setBairro] = useState('')
  const [buscandoBairro, setBuscandoBairro] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [anonimo, setAnonimo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [publicando, setPublicando] = useState(false)
  const [publicado, setPublicado] = useState(false)
  const bairroEditado = useRef(false)

  const anonimoForcado = categoria === 'seguranca'
  const anonimoEfetivo = anonimo || anonimoForcado
  const cor = categoria ? rgb(CATEGORIA_RGB[categoria]) : 'var(--color-amarelo-500)'
  const foraDoRecife = coords !== null && !dentroDoRecife(coords)

  // Preenche o bairro sozinho a partir do ponto (se a pessoa não digitou um).
  useEffect(() => {
    if (!coords || bairroEditado.current) return
    let cancelado = false
    const t = setTimeout(async () => {
      setBuscandoBairro(true)
      const nome = await bairroDoPonto(coords)
      if (cancelado) return
      setBuscandoBairro(false)
      if (nome && !bairroEditado.current) setBairro(nome)
    }, 400)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [coords])

  const podeAvancar = [
    categoria !== null,
    coords !== null && !foraDoRecife && bairro.trim().length > 1,
    descricao.trim().length >= 10,
    true,
  ][passo]

  function irPara(n: number) {
    setErro(null)
    setDirecao(n > passo ? 1 : -1)
    setPasso(n)
  }

  function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
      setErro('Este navegador não informa a localização. Toque no mapa para marcar.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const aqui: [number, number] = [p.coords.latitude, p.coords.longitude]
        // No computador a posição vem estimada pela internet e pode errar por
        // milhares de quilômetros: fora da cidade, o mapa não sai do lugar.
        if (dentroDoRecife(aqui)) {
          setErro(null)
          setCoords(aqui)
        } else setErro('Sua localização aparece fora da cidade do Recife. Toque no mapa, dentro da linha amarela.')
      },
      () => setErro('Não foi possível obter sua localização. Toque no mapa para marcar.'),
    )
  }

  async function publicar() {
    if (!user || !categoria || !coords) return
    setPublicando(true)
    setErro(null)
    const relato = {
      user_id: user.id,
      categoria,
      bairro: bairro.trim(),
      descricao: descricao.trim(),
      latitude: coords[0],
      longitude: coords[1],
    }
    let { data, error } = await supabase.from('posts').insert({ ...relato, anonimo: anonimoEfetivo }).select('id').single()
    // Banco ainda sem a 0008 (sem a coluna `anonimo`): publica sem o campo.
    if (error?.message.includes('anonimo')) {
      ;({ data, error } = await supabase.from('posts').insert(relato).select('id').single())
    }
    setPublicando(false)
    if (error || !data) {
      setErro(`Não foi possível publicar: ${error?.message ?? 'tente de novo.'}`)
      return
    }
    setPublicado(true)
    setTimeout(() => navigate(`/feed/${data.id}`), 1600)
  }

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <img src="/logo.png" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-6 font-heading text-4xl font-extrabold text-grafite-900">Entre para relatar</h1>
        <p className="mt-2 text-grafite-700">
          Relatos ficam ligados a uma conta para evitar spam — mas você pode publicar anônimo.
        </p>
        <Link to="/entrar" className="mt-6 inline-flex rounded-full bg-amarelo-500 px-6 py-3 font-bold text-grafite-900">
          Entrar
        </Link>
      </div>
    )
  }

  const previa: PostRepercussao = {
    id: 'previa',
    user_id: anonimoEfetivo ? null : (user?.id ?? null),
    anonimo: anonimoEfetivo,
    categoria: categoria ?? 'outros',
    bairro: bairro || 'Seu bairro',
    descricao: descricao || 'Sua descrição aparece aqui.',
    foto_url: null,
    latitude: coords?.[0] ?? 0,
    longitude: coords?.[1] ?? 0,
    created_at: new Date().toISOString(),
    recorrencia: 0,
    interacoes: 0,
    repercussao: 0,
    comentarios: 0,
  }

  const mapa = (
    <div className="relative h-full overflow-hidden rounded-[28px] border border-grafite-200 bg-grafite-200">
      <Suspense fallback={<div className="h-full w-full animate-pulse bg-grafite-200" />}>
        <MapaEscolha
          valor={coords}
          onEscolher={(c) => {
            setErro(null)
            setCoords(c)
          }}
          onFora={() => setErro('Esse ponto fica fora da cidade do Recife. O Confluência funciona só dentro da linha amarela.')}
          cor={cor}
        />
      </Suspense>
      <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between gap-2">
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-grafite-900 shadow backdrop-blur">
          {coords ? 'Arraste o pino para ajustar' : 'Toque no mapa onde fica o problema'}
        </span>
        <button
          type="button"
          onClick={usarMinhaLocalizacao}
          className="pointer-events-auto rounded-full bg-amarelo-500 px-3 py-1.5 text-xs font-bold text-grafite-900 shadow"
        >
          ◎ Minha localização
        </button>
      </div>
    </div>
  )

  const variantes = {
    entra: (d: number) => ({ x: d * 40, opacity: 0 }),
    centro: { x: 0, opacity: 1 },
    sai: (d: number) => ({ x: d * -40, opacity: 0 }),
  }

  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-amarelo-700">Novo relato</p>
          <h1 className="mt-2 font-heading text-4xl font-extrabold leading-none text-grafite-900 sm:text-5xl">
            Relatar um problema
          </h1>

          {/* Progresso */}
          <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Etapas">
            {PASSOS.map((nome, i) => (
              <li key={nome}>
                <button
                  type="button"
                  onClick={() => i < passo && irPara(i)}
                  disabled={i > passo}
                  aria-current={i === passo ? 'step' : undefined}
                  className="w-full text-left disabled:cursor-default"
                >
                  <span className="block h-1.5 overflow-hidden rounded-full bg-grafite-200">
                    <motion.span
                      className="block h-full rounded-full bg-amarelo-500"
                      initial={false}
                      animate={{ width: i <= passo ? '100%' : '0%' }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                  <span className={`mt-2 block text-xs font-bold ${i <= passo ? 'text-grafite-900' : 'text-grafite-500'}`}>
                    {i + 1}. {nome}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="relative mt-8 min-h-[22rem]">
            <AnimatePresence mode="wait" custom={direcao}>
              <motion.div
                key={passo}
                custom={direcao}
                variants={variantes}
                initial="entra"
                animate="centro"
                exit="sai"
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {passo === 0 && (
                  <div>
                    <h2 className="font-heading text-2xl font-extrabold text-grafite-900">Que tipo de problema é?</h2>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Categoria">
                      {CATEGORIAS.map((c, i) => {
                        const ativa = categoria === c.value
                        const [r, g, b] = CATEGORIA_RGB[c.value]
                        return (
                          <motion.button
                            key={c.value}
                            type="button"
                            role="radio"
                            aria-checked={ativa}
                            onClick={() => {
                              setCategoria(c.value)
                              if (c.value === 'seguranca') setAnonimo(true)
                            }}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.96 }}
                            className={`flex flex-col items-start gap-3 rounded-[22px] border-2 p-4 text-left transition-colors ${
                              ativa ? 'text-white' : 'border-grafite-200 bg-white text-grafite-900 hover:border-grafite-300'
                            }`}
                            style={ativa ? { background: `rgb(${r},${g},${b})`, borderColor: `rgb(${r},${g},${b})` } : undefined}
                          >
                            <span
                              className="flex h-11 w-11 items-center justify-center rounded-[14px]"
                              style={{ background: ativa ? 'rgba(255,255,255,.22)' : `rgba(${r},${g},${b},.12)`, color: ativa ? '#fff' : `rgb(${r},${g},${b})` }}
                            >
                              <IconeCategoria categoria={c.value} size={22} />
                            </span>
                            <span className="text-sm font-bold">{c.label}</span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {passo === 1 && (
                  <div>
                    <h2 className="font-heading text-2xl font-extrabold text-grafite-900">Onde fica?</h2>
                    <p className="mt-1 text-sm text-grafite-700">
                      Marque o ponto exato no mapa — o problema pode não ser onde você está agora.
                    </p>
                    {!desktop && <div className="mt-4 h-72">{mapa}</div>}
                    <label htmlFor="bairro" className="mt-5 block text-sm font-semibold text-grafite-900">
                      Bairro {buscandoBairro && <span className="font-normal text-grafite-500">· descobrindo pelo mapa…</span>}
                    </label>
                    <input
                      id="bairro"
                      value={bairro}
                      onChange={(e) => {
                        bairroEditado.current = true
                        setBairro(e.target.value)
                      }}
                      placeholder="Preenchido sozinho quando você marca o ponto"
                      className="mt-1.5 w-full rounded-2xl border border-grafite-300 bg-white px-4 py-3 text-sm text-grafite-900 focus:border-amarelo-500 focus:outline-none focus:ring-4 focus:ring-amarelo-500/20"
                    />
                    {foraDoRecife && (
                      <p className="mt-2 text-sm text-status-vermelho-700">
                        Esse ponto está fora da cidade do Recife. Ajuste no mapa.
                      </p>
                    )}
                  </div>
                )}

                {passo === 2 && (
                  <div>
                    <h2 className="font-heading text-2xl font-extrabold text-grafite-900">Conte o que está acontecendo</h2>
                    <div className="mt-4 rounded-[24px] border border-grafite-300 bg-white p-2 focus-within:border-amarelo-500 focus-within:shadow-[0_0_0_4px_rgba(245,184,0,0.18)]">
                      <textarea
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        maxLength={LIMITE}
                        rows={6}
                        autoFocus
                        aria-label="Descrição do problema"
                        placeholder={categoria ? DICAS[categoria] : DICAS.outros}
                        className="w-full resize-none bg-transparent px-3 py-2 text-[15px] text-grafite-900 placeholder:text-grafite-500 focus:outline-none"
                      />
                      <div className="flex items-center justify-between px-3 pb-1 text-xs">
                        <span className="text-grafite-500">
                          {descricao.trim().length < 10 ? 'Pelo menos 10 caracteres' : 'Ótimo, bem descrito ajuda o órgão a agir'}
                        </span>
                        <span className={descricao.length > LIMITE * 0.9 ? 'text-status-terracota-700' : 'text-grafite-500'}>
                          {descricao.length}/{LIMITE}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`mt-5 flex items-start gap-4 rounded-[24px] border p-4 transition-colors ${
                        anonimoEfetivo ? 'border-grafite-900 bg-grafite-100' : 'border-grafite-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        role="switch"
                        aria-checked={anonimoEfetivo}
                        aria-label="Publicar sem mostrar quem relatou"
                        disabled={anonimoForcado}
                        onClick={() => setAnonimo((v) => !v)}
                        className={`relative mt-0.5 h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
                          anonimoEfetivo ? 'bg-grafite-900' : 'bg-grafite-300'
                        }`}
                      >
                        <motion.span
                          className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow"
                          animate={{ x: anonimoEfetivo ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
                        />
                      </button>
                      <span>
                        <span className="block text-sm font-semibold text-grafite-900">Publicar anônimo</span>
                        <span className="block text-xs text-grafite-700">
                          {anonimoForcado
                            ? 'Relatos de segurança são sempre anônimos, para proteger quem denuncia.'
                            : anonimoEfetivo
                              ? 'Ninguém verá quem relatou. O relato continua aparecendo só para você no seu perfil.'
                              : 'Seu apelido aparece no relato e ele entra no seu perfil público.'}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {passo === 3 && (
                  <div>
                    <h2 className="font-heading text-2xl font-extrabold text-grafite-900">Confira antes de publicar</h2>
                    <p className="mt-1 text-sm text-grafite-700">É assim que seu relato vai aparecer no Feed.</p>
                    <ul className="pointer-events-none mt-5" aria-hidden>
                      <RelatoItem
                        post={previa}
                        ativo={false}
                        onHover={() => {}}
                        onVerNoMapa={() => {}}
                        perfil={
                          user && profile
                            ? {
                                id: user.id,
                                nome: profile.nome,
                                apelido: profile.apelido ?? null,
                                bairro: profile.bairro ?? null,
                                bio: profile.bio ?? null,
                                institucional_verificado: profile.institucional_verificado,
                                orgao_nome: profile.orgao_nome,
                              }
                            : undefined
                        }
                      />
                    </ul>
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-grafite-100 px-4 py-3">
                        <dt className="text-xs text-grafite-500">Ponto</dt>
                        <dd className="font-semibold text-grafite-900">
                          {coords ? `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}` : '—'}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-grafite-100 px-4 py-3">
                        <dt className="text-xs text-grafite-500">Autoria</dt>
                        <dd className="font-semibold text-grafite-900">{anonimoEfetivo ? 'Anônimo' : 'Com seu apelido'}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {erro && <p className="mt-4 rounded-2xl bg-status-vermelho-50 px-4 py-3 text-sm text-status-vermelho-700">{erro}</p>}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => (passo === 0 ? navigate('/feed') : irPara(passo - 1))}
              className="rounded-full border-2 border-grafite-200 px-5 py-3 text-sm font-bold text-grafite-900 hover:border-grafite-300"
            >
              {passo === 0 ? 'Cancelar' : '← Voltar'}
            </button>
            {passo < 3 ? (
              <motion.button
                type="button"
                onClick={() => irPara(passo + 1)}
                disabled={!podeAvancar}
                whileTap={{ scale: 0.96 }}
                className="rounded-full bg-amarelo-500 px-6 py-3 text-sm font-bold text-grafite-900 disabled:bg-grafite-200 disabled:text-grafite-500"
              >
                Continuar →
              </motion.button>
            ) : (
              <motion.button
                type="button"
                onClick={publicar}
                disabled={publicando || publicado}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                className="rounded-full bg-amarelo-500 px-7 py-3 text-sm font-bold text-grafite-900 shadow-[0_14px_30px_-12px_rgba(245,184,0,0.9)] disabled:opacity-60"
              >
                {publicando ? 'Publicando…' : 'Publicar relato'}
              </motion.button>
            )}
          </div>
        </section>

        {desktop && <aside className="sticky top-24 h-[calc(100vh-8rem)] self-start">{mapa}</aside>}
      </div>

      {/* Sucesso: o pino cai na cidade e a pessoa vai para o relato. */}
      <AnimatePresence>
        {publicado && (
          <motion.div
            className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-amarelo-500"
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            role="status"
          >
            <motion.svg
              viewBox="0 0 32 42"
              width={90}
              height={116}
              initial={{ y: -300, rotate: -20 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 400, damping: 14 }}
              aria-hidden
            >
              <path d="M16 41S3 25.5 3 15.5a13 13 0 0 1 26 0C29 25.5 16 41 16 41Z" fill="#1b1813" />
              <circle cx="16" cy="15.5" r="5" fill="#f5b800" />
            </motion.svg>
            <motion.p
              className="mt-6 font-heading text-4xl font-extrabold text-grafite-900 sm:text-5xl"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              Relato publicado!
            </motion.p>
            <motion.p
              className="mt-2 text-amarelo-900"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Agora a cidade inteira vê o que está acontecendo em {bairro}.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
