import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { NavigationControl, useControl, type MapRef } from 'react-map-gl/maplibre'
import { MapboxOverlay, type MapboxOverlayProps } from '@deck.gl/mapbox'
import { HexagonLayer } from '@deck.gl/aggregation-layers'
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CATEGORIAS, type PostRepercussao } from '../../../types/database'
import { CATEGORIA_RGB, RAMPA_REPERCUSSAO } from '../cores'
import { agrupar } from '../agrupar'
import { aplicarBloqueio } from '../bloqueio'
import AvisoBloqueio from './AvisoBloqueio'

// O MapLibre 6 acha o próprio worker relativo ao módulo; o pré-empacotamento
// do Vite muda esse caminho, então apontamos o arquivo explicitamente.
setWorkerUrl(workerUrl)

const ESTILO = 'https://tiles.openfreemap.org/styles/positron'
const RECIFE = { longitude: -34.915, latitude: -8.07 }
const DIA_MS = 86_400_000
// Pinos a menos disso (em pixels) viram um grupo; a partir deste zoom, nunca agrupa.
const RAIO_GRUPO = 30
const ZOOM_SEM_GRUPO = 16
const reduzirMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// O tooltip do deck.gl recebe HTML cru — texto de usuário precisa ser escapado.
const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function DeckOverlay({ aoCriar, ...props }: MapboxOverlayProps & { aoCriar: (overlay: MapboxOverlay) => void }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props))
  overlay.setProps(props)
  useEffect(() => aoCriar(overlay), [overlay, aoCriar])
  return null
}

/** Vários relatos no mesmo lugar da tela. */
interface Aglomerado {
  id: string
  posicao: [number, number]
  quantidade: number
  posts: PostRepercussao[]
}

// Pulso dos relatos da última semana: um anel que cresce e some (fase de 0 a 1).
function camadaPulso(recentes: PostRepercussao[], fase: number) {
  return new ScatterplotLayer<PostRepercussao>({
    id: 'pulso-recentes',
    data: recentes,
    getPosition: (p) => [p.longitude, p.latitude],
    radiusUnits: 'pixels',
    getRadius: 7 + fase * 24,
    getFillColor: (p) => [...CATEGORIA_RGB[p.categoria], Math.round(150 * (1 - fase))],
    updateTriggers: { getRadius: fase, getFillColor: fase },
    parameters: { depthCompare: 'always' },
  })
}

interface MapaVivoProps {
  posts: PostRepercussao[]
  ativoId: string | null
  /** Relato para onde a câmera voa (clique em "ver no mapa"); `seq` permite voar de novo ao mesmo. */
  foco: { id: string; seq: number } | null
  modo3d: boolean
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
}

// Mapa vivo do Feed: base vetorial com prédios em 3D, colunas que sobem do
// chão onde há mais repercussão (soma de recorrência + apoios por área) e
// pinos por categoria — os relatos da última semana pulsam.
export default function MapaVivo({ posts, ativoId, foco, modo3d, onHover, onSelect }: MapaVivoProps) {
  const mapRef = useRef<MapRef>(null)
  const overlayRef = useRef<MapboxOverlay | null>(null)
  const guardarOverlay = useCallback((o: MapboxOverlay) => {
    overlayRef.current = o
  }, [])
  const [colunasDePe, setColunasDePe] = useState(false)
  // Muda a cada fim de movimento da câmera: é o que refaz os grupos.
  const [camera, setCamera] = useState(0)

  // Personaliza a base depois que o estilo carrega: rios em destaque e
  // prédios em 3D num tom quente, para casar com o creme da interface.
  const aoCarregar = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    for (const camada of ['water', 'waterway']) {
      if (map.getLayer(camada)) {
        const tipo = map.getLayer(camada)!.type
        map.setPaintProperty(camada, tipo === 'line' ? 'line-color' : 'fill-color', '#9fd3d6')
      }
    }
    if (!map.getLayer('predios-3d')) {
      map.addLayer({
        id: 'predios-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': '#ece4d0',
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.85,
        },
      })
    }
    aplicarBloqueio(map)
    // No desktop o painel cobre ~440px à esquerda: a câmera compensa para a cidade ficar à vista.
    // No celular é a gaveta que cobre a metade de baixo.
    if (window.matchMedia('(min-width: 1024px)').matches) map.setPadding({ left: 500, top: 0, right: 0, bottom: 0 })
    else map.setPadding({ left: 0, top: 0, right: 0, bottom: Math.round(map.getContainer().clientHeight * 0.5) })
    const voo = reduzirMovimento() ? 0 : 2600
    map.flyTo({ center: [RECIFE.longitude, RECIFE.latitude], zoom: 12.6, pitch: 55, bearing: -18, duration: voo })
    setTimeout(() => setColunasDePe(true), voo * 0.35)
  }, [])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    map.easeTo({ pitch: modo3d ? 55 : 0, bearing: modo3d ? -18 : 0, duration: reduzirMovimento() ? 0 : 900 })
  }, [modo3d])

  useEffect(() => {
    const post = posts.find((p) => p.id === foco?.id)
    const map = mapRef.current?.getMap()
    if (!post || !map) return
    map.flyTo({
      center: [post.longitude, post.latitude],
      zoom: 15.6,
      pitch: modo3d ? 60 : 0,
      duration: reduzirMovimento() ? 0 : 1700,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foco])

  const recentes = useMemo(
    () => posts.filter((p) => Date.now() - new Date(p.created_at).getTime() < 7 * DIA_MS),
    [posts],
  )

  // Agrupa os pinos na posição atual da câmera. O de maior repercussão vira o
  // centro do grupo; o relato em destaque fica sempre solto.
  const { soltos, aglomerados, zoom } = useMemo(() => {
    const map = mapRef.current?.getMap()
    const zoom = map?.getZoom() ?? 11
    if (!map || zoom >= ZOOM_SEM_GRUPO) return { soltos: posts, aglomerados: [] as Aglomerado[], zoom }
    const porId = new globalThis.Map(posts.map((p) => [p.id, p]))
    const ordem = [...posts].sort((a, b) => b.repercussao - a.repercussao)
    const pontos = ordem.map((p) => {
      const { x, y } = map.project([p.longitude, p.latitude])
      return { id: p.id, x, y }
    })
    const grupos = agrupar(pontos, RAIO_GRUPO, new Set(ativoId ? [ativoId] : []))
    const soltos: PostRepercussao[] = []
    const aglomerados: Aglomerado[] = []
    for (const g of grupos) {
      const membros = g.ids.map((id) => porId.get(id)!)
      if (membros.length === 1) {
        soltos.push(membros[0])
        continue
      }
      const lng = membros.reduce((s, p) => s + p.longitude, 0) / membros.length
      const lat = membros.reduce((s, p) => s + p.latitude, 0) / membros.length
      aglomerados.push({ id: g.ids.join('|'), posicao: [lng, lat], quantidade: membros.length, posts: membros })
    }
    return { soltos, aglomerados, zoom }
    // `camera` entra de propósito: a projeção muda quando a câmera para.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, ativoId, camera])

  // Clique num grupo: aproxima até os relatos dele caberem separados na tela.
  const abrirGrupo = useCallback((g: Aglomerado) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const lngs = g.posts.map((p) => p.longitude)
    const lats = g.posts.map((p) => p.latitude)
    const duracao = reduzirMovimento() ? 0 : 1100
    const mesmoPonto = Math.max(...lngs) - Math.min(...lngs) < 1e-4 && Math.max(...lats) - Math.min(...lats) < 1e-4
    if (mesmoPonto) map.flyTo({ center: g.posicao, zoom: ZOOM_SEM_GRUPO, duration: duracao })
    else
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 90, maxZoom: ZOOM_SEM_GRUPO, duration: duracao },
      )
  }, [])

  const camadas = useMemo(() => [
    new HexagonLayer<PostRepercussao>({
      id: 'colunas-repercussao',
      data: posts,
      getPosition: (p) => [p.longitude, p.latitude],
      getElevationWeight: (p) => p.repercussao + 1,
      elevationAggregation: 'SUM',
      getColorWeight: (p) => p.repercussao + 1,
      colorAggregation: 'SUM',
      colorRange: RAMPA_REPERCUSSAO,
      radius: 380,
      coverage: 0.82,
      extruded: true,
      elevationRange: [0, 900],
      elevationScale: colunasDePe && modo3d ? 1 : 0,
      // De perto, a área de repercussão cobriria as ruas: some aos poucos a partir do zoom 13,5.
      opacity: 0.78 * Math.min(1, Math.max(0, (15 - zoom) / 1.5)),
      transitions: { elevationScale: { duration: 1600 } },
    }),
    new ScatterplotLayer<PostRepercussao>({
      id: 'pinos',
      data: soltos,
      pickable: true,
      getPosition: (p) => [p.longitude, p.latitude],
      radiusUnits: 'pixels',
      getRadius: (p) => (p.id === ativoId ? 12 : 7),
      getFillColor: (p) => CATEGORIA_RGB[p.categoria],
      stroked: true,
      getLineColor: (p) => (p.id === ativoId ? [245, 184, 0] : [255, 255, 255]),
      lineWidthUnits: 'pixels',
      getLineWidth: (p) => (p.id === ativoId ? 4 : 2),
      updateTriggers: { getRadius: ativoId, getLineColor: ativoId, getLineWidth: ativoId },
      transitions: { getRadius: 180 },
      parameters: { depthCompare: 'always' },
      onHover: (info) => onHover((info.object as PostRepercussao | undefined)?.id ?? null),
      onClick: (info) => {
        const post = info.object as PostRepercussao | undefined
        if (post) onSelect(post.id)
      },
    }),
    new ScatterplotLayer<Aglomerado>({
      id: 'grupos',
      data: aglomerados,
      pickable: true,
      getPosition: (g) => g.posicao,
      radiusUnits: 'pixels',
      getRadius: (g) => Math.min(26, 13 + Math.sqrt(g.quantidade) * 3),
      getFillColor: [245, 184, 0],
      stroked: true,
      getLineColor: [255, 253, 246],
      lineWidthUnits: 'pixels',
      getLineWidth: 3,
      parameters: { depthCompare: 'always' },
      onClick: (info) => {
        const g = info.object as Aglomerado | undefined
        if (g) abrirGrupo(g)
      },
    }),
    new TextLayer<Aglomerado>({
      id: 'grupos-numero',
      data: aglomerados,
      getPosition: (g) => g.posicao,
      getText: (g) => String(g.quantidade),
      getSize: 13,
      getColor: [27, 24, 19],
      fontFamily: 'Bricolage Grotesque, system-ui, sans-serif',
      fontWeight: 800,
      characterSet: '0123456789',
      parameters: { depthCompare: 'always' },
    }),
  ], [posts, soltos, aglomerados, zoom, ativoId, colunasDePe, modo3d, onHover, onSelect, abrirGrupo])

  // O pulso roda fora do React: a cada quadro só a camada dele é trocada no
  // overlay, sem redesenhar a tela inteira. Sem relato recente, nada roda.
  useEffect(() => {
    if (reduzirMovimento() || recentes.length === 0) return
    let frame = 0
    let ultimo = 0
    const inicio = performance.now()
    const tick = (agora: number) => {
      frame = requestAnimationFrame(tick)
      if (agora - ultimo < 33) return // ~30 quadros por segundo bastam para um pulso
      ultimo = agora
      overlayRef.current?.setProps({ layers: [...camadas, camadaPulso(recentes, ((agora - inicio) % 1800) / 1800)] })
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [camadas, recentes])

  return (
    <Map
      ref={mapRef}
      initialViewState={{ ...RECIFE, zoom: 11.2, pitch: 0, bearing: 0 }}
      mapStyle={ESTILO}
      onLoad={aoCarregar}
      onMoveEnd={() => setCamera((c) => c + 1)}
      cursor={ativoId ? 'pointer' : 'grab'}
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
    >
      <NavigationControl position="bottom-right" visualizePitch style={{ marginBottom: 84, marginRight: 14 }} />
      <AvisoBloqueio className="right-16 bottom-[52px] hidden lg:inline-flex" />
      <DeckOverlay
        aoCriar={guardarOverlay}
        layers={recentes.length ? [...camadas, camadaPulso(recentes, 0)] : camadas}
        getTooltip={({ object }) => {
          const g = object as Aglomerado | undefined
          if (g?.quantidade) {
            return {
              html: `<div style="font:600 12px/1.35 var(--font-body)">${g.quantidade} relatos aqui<br><span style="font-weight:500;color:#7c776c">Clique para aproximar</span></div>`,
              style: { background: '#fffdf6', color: '#1b1813', borderRadius: '12px', padding: '8px 11px', border: '1px solid #f5b800' },
            }
          }
          const p = object as PostRepercussao | undefined
          if (!p?.descricao) return null
          const cat = CATEGORIAS.find((c) => c.value === p.categoria)?.label ?? p.categoria
          const texto = p.descricao.length > 90 ? `${p.descricao.slice(0, 90)}…` : p.descricao
          return {
            html: `<div style="font:600 11px var(--font-body);letter-spacing:.06em;text-transform:uppercase;color:#6b4e00">${escapar(cat)} · ${escapar(p.bairro)}</div><div style="margin-top:4px;font:500 13px/1.35 var(--font-body)">${escapar(texto)}</div>`,
            style: {
              background: '#fffdf6',
              color: '#1b1813',
              borderRadius: '14px',
              padding: '10px 12px',
              maxWidth: '260px',
              boxShadow: '0 12px 30px rgba(27,24,19,.18)',
              border: '1px solid #f5b800',
            },
          }
        }}
      />
    </Map>
  )
}
