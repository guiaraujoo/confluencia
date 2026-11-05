import { useCallback, useEffect, useRef, useState } from 'react'
import Map, { Marker, NavigationControl, type MapRef, type MapLayerMouseEvent } from 'react-map-gl/maplibre'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { AnimatePresence, motion } from 'framer-motion'
import 'maplibre-gl/dist/maplibre-gl.css'
import { dentroDoRecife } from '../../../lib/recife'
import { aplicarBloqueio } from '../bloqueio'
import AvisoBloqueio from './AvisoBloqueio'

setWorkerUrl(workerUrl)

const ESTILO = 'https://tiles.openfreemap.org/styles/positron'
const RECIFE = { latitude: -8.06, longitude: -34.9 }

interface MapaEscolhaProps {
  valor: [number, number] | null
  onEscolher: (pos: [number, number]) => void
  /** Chamado quando a pessoa toca fora da cidade (área bloqueada). */
  onFora?: () => void
  cor: string
}

// Mapa do "Relatar problema": toque para soltar o pino, arraste para ajustar.
export default function MapaEscolha({ valor, onEscolher, cor, onFora }: MapaEscolhaProps) {
  const mapRef = useRef<MapRef>(null)
  const [carregado, setCarregado] = useState(false)
  // Toque fora da cidade: um cadeado treme no ponto e some sozinho.
  const [recusado, setRecusado] = useState<{ lat: number; lng: number; n: number } | null>(null)

  useEffect(() => {
    if (!recusado) return
    const t = setTimeout(() => setRecusado(null), 2200)
    return () => clearTimeout(t)
  }, [recusado])

  const escolher = (lat: number, lng: number) => {
    if (dentroDoRecife([lat, lng])) {
      setRecusado(null)
      onEscolher([lat, lng])
    } else {
      setRecusado((r) => ({ lat, lng, n: (r?.n ?? 0) + 1 }))
      onFora?.()
    }
  }

  const aoCarregar = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    for (const camada of ['water', 'waterway']) {
      const l = map.getLayer(camada)
      if (l) map.setPaintProperty(camada, l.type === 'line' ? 'line-color' : 'fill-color', '#9fd3d6')
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
    map.once('idle', () => setCarregado(true))
  }, [])

  // Quando o ponto muda por fora (ex: "usar minha localização"), a câmera vai até ele.
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !valor) return
    map.flyTo({ center: [valor[1], valor[0]], zoom: Math.max(map.getZoom(), 16), pitch: 50, duration: 1200 })
  }, [valor])

  return (
    <Map
      ref={mapRef}
      initialViewState={{ ...RECIFE, zoom: 12.3, pitch: 35 }}
      mapStyle={ESTILO}
      onLoad={aoCarregar}
      onClick={(e: MapLayerMouseEvent) => escolher(e.lngLat.lat, e.lngLat.lng)}
      cursor="crosshair"
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
    >
      <NavigationControl position="bottom-right" visualizePitch />
      {valor && (
        <Marker
          latitude={valor[0]}
          longitude={valor[1]}
          anchor="bottom"
          draggable
          onDragEnd={(e) => escolher(e.lngLat.lat, e.lngLat.lng)}
        >
          <motion.span
            key={`${valor[0]},${valor[1]}`}
            className="relative flex cursor-grab flex-col items-center active:cursor-grabbing"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 16 }}
          >
            <svg viewBox="0 0 32 42" width={36} height={46} aria-hidden>
              <path d="M16 41S3 25.5 3 15.5a13 13 0 0 1 26 0C29 25.5 16 41 16 41Z" fill={cor} stroke="#fff" strokeWidth={3} />
              <circle cx="16" cy="15.5" r="5" fill="#fff" />
            </svg>
            <span className="absolute -bottom-1 h-2 w-5 rounded-full bg-black/25 blur-[2px]" />
          </motion.span>
        </Marker>
      )}
      <AnimatePresence>
        {recusado && (
          <Marker key={recusado.n} latitude={recusado.lat} longitude={recusado.lng} anchor="bottom">
            <motion.span
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, x: [0, -9, 8, -6, 4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              <span className="mb-1.5 whitespace-nowrap rounded-full bg-grafite-900 px-3 py-1.5 text-xs font-bold text-grafite-50 shadow-lg">
                Área bloqueada
              </span>
              <svg viewBox="0 0 24 24" width={34} height={34} aria-hidden>
                <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="#1b1813" />
                <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="#1b1813" strokeWidth="2.4" />
                <circle cx="12" cy="15.5" r="1.6" fill="#f5b800" />
              </svg>
            </motion.span>
          </Marker>
        )}
      </AnimatePresence>
      <AvisoBloqueio className="bottom-3 left-3" />
      {!carregado && (
        <div className="absolute inset-0 z-[3] flex items-center justify-center bg-grafite-100">
          <span className="flex items-center gap-2.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-grafite-700 shadow">
            <span className="h-3 w-3 animate-ping rounded-full bg-amarelo-500" />
            Carregando o mapa do Recife…
          </span>
        </div>
      )}
    </Map>
  )
}
