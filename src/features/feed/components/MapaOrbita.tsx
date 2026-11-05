import { useCallback, useRef } from 'react'
import Map, { Marker, type MapRef } from 'react-map-gl/maplibre'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { aplicarBloqueio } from '../bloqueio'

setWorkerUrl(workerUrl)

const ESTILO = 'https://tiles.openfreemap.org/styles/positron'

interface MapaOrbitaProps {
  latitude: number
  longitude: number
  cor: string
}

// Mapa do detalhe do relato: câmera inclinada que dá meia volta devagar em
// torno do ponto relatado, com prédios em 3D, e para. Girar para sempre
// custava ~570 ms de JavaScript por segundo, mesmo com a página parada.
export default function MapaOrbita({ latitude, longitude, cor }: MapaOrbitaProps) {
  const mapRef = useRef<MapRef>(null)

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
          'fill-extrusion-opacity': 0.9,
        },
      })
    }
    aplicarBloqueio(map)
    // Começa com o crédito do mapa recolhido (só o "i"): aberto, ele cobre o título no celular.
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
    // A animação é do próprio MapLibre: termina sozinha e para se a pessoa arrastar o mapa.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      map.rotateTo(map.getBearing() + 70, { duration: 12000, easing: (x) => 1 - (1 - x) * (1 - x) })
    }
  }, [])

  return (
    <Map
      ref={mapRef}
      initialViewState={{ latitude, longitude, zoom: 16.4, pitch: 62, bearing: -20 }}
      mapStyle={ESTILO}
      onLoad={aoCarregar}
      style={{ width: '100%', height: '100%' }}
      attributionControl={{ compact: true }}
      scrollZoom={false}
    >
      <Marker latitude={latitude} longitude={longitude} anchor="center">
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: cor }} />
          <span className="absolute -inset-3 animate-pulse rounded-full opacity-25" style={{ background: cor }} />
          <span className="relative h-5 w-5 rounded-full border-[3px] border-white shadow-lg" style={{ background: cor }} />
        </span>
      </Marker>
    </Map>
  )
}
