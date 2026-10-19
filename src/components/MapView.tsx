import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { ensureLeafletIcons } from './leafletIcons'

// Centro padrão: Recife (Tarefa 1.2 do João — "teste isolado do mapa Leaflet").
export const RECIFE_CENTER: [number, number] = [-8.05, -34.9]

export interface MapMarkerData {
  id: string
  position: [number, number]
  popupContent?: React.ReactNode
}

interface MapViewProps {
  markers?: MapMarkerData[]
  center?: [number, number]
  zoom?: number
  height?: number | string
  /** Se definido, clicar no mapa chama essa função com [lat, lng] — usado pelo LocationPicker. */
  onMapClick?: (position: [number, number]) => void
  className?: string
}

function ClickHandler({ onMapClick }: { onMapClick?: (position: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

interface Cluster {
  id: string
  position: [number, number]
  items: MapMarkerData[]
}

// Agrupa marcadores que ficam a menos de `raioPx` pixels de distância na tela,
// usando a projeção atual do mapa (Tarefa 5.2 do João: "clusters de mapa +
// performance") — reagrupa sozinho ao dar zoom ou arrastar o mapa, e reduz o
// número de <Marker> renderizados quando muitos posts caem na mesma área.
// Greedy O(n²): suficiente para o volume de posts do MVP, sem depender de
// uma lib extra (leaflet.markercluster) só pra isso.
function agruparMarcadores(map: L.Map, markers: MapMarkerData[], raioPx = 44): Cluster[] {
  const pontos = markers.map((m) => ({ marker: m, ponto: map.latLngToContainerPoint(m.position) }))
  const usados = new Set<string>()
  const clusters: Cluster[] = []

  for (const atual of pontos) {
    if (usados.has(atual.marker.id)) continue
    const grupo = [atual]
    usados.add(atual.marker.id)
    for (const outro of pontos) {
      if (usados.has(outro.marker.id)) continue
      if (atual.ponto.distanceTo(outro.ponto) <= raioPx) {
        grupo.push(outro)
        usados.add(outro.marker.id)
      }
    }
    const lat = grupo.reduce((soma, g) => soma + g.marker.position[0], 0) / grupo.length
    const lng = grupo.reduce((soma, g) => soma + g.marker.position[1], 0) / grupo.length
    clusters.push({
      id: grupo.map((g) => g.marker.id).join('+'),
      position: [lat, lng],
      items: grupo.map((g) => g.marker),
    })
  }

  return clusters
}

function clusterIcon(count: number) {
  const tamanho = count < 10 ? 32 : 40
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${tamanho}px;height:${tamanho}px;border-radius:9999px;background:var(--color-amarelo-500);color:var(--color-grafite-900);font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${count}</div>`,
    className: '',
    iconSize: [tamanho, tamanho],
  })
}

function ClusterMarkers({ markers }: { markers: MapMarkerData[] }) {
  const map = useMap()
  const [clusters, setClusters] = useState<Cluster[]>([])

  // Chave estável (id + posição) — evita recalcular e re-anexar os listeners
  // a cada render do componente pai só porque o array `markers` é uma
  // referência nova (ex: popupContent recriado em JSX).
  const assinatura = useMemo(
    () => markers.map((m) => `${m.id}:${m.position[0]},${m.position[1]}`).join('|'),
    [markers],
  )

  useEffect(() => {
    function recomputar() {
      setClusters(agruparMarcadores(map, markers))
    }
    recomputar()
    map.on('zoomend', recomputar)
    map.on('moveend', recomputar)
    return () => {
      map.off('zoomend', recomputar)
      map.off('moveend', recomputar)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, assinatura])

  return (
    <>
      {clusters.map((cluster) =>
        cluster.items.length === 1 ? (
          <Marker key={cluster.id} position={cluster.items[0].position}>
            {cluster.items[0].popupContent && <Popup>{cluster.items[0].popupContent}</Popup>}
          </Marker>
        ) : (
          <Marker
            key={cluster.id}
            position={cluster.position}
            icon={clusterIcon(cluster.items.length)}
            eventHandlers={{
              click: () => map.setView(cluster.position, Math.min(map.getZoom() + 2, 18)),
            }}
          />
        ),
      )}
    </>
  )
}

/**
 * Mapa base do Confluência. Usado isolado (Tarefa 1.2 do João) e reaproveitado
 * em LocationPicker (criar post) e nas telas de detalhe de post/projeto.
 */
export default function MapView({
  markers = [],
  center = RECIFE_CENTER,
  zoom = 13,
  height = 320,
  onMapClick,
  className = '',
}: MapViewProps) {
  useEffect(() => {
    ensureLeafletIcons()
  }, [])

  return (
    <div
      className={`rounded-[var(--radius-card)] overflow-hidden border border-grafite-200 ${className}`}
      style={{ height }}
    >
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onMapClick && <ClickHandler onMapClick={onMapClick} />}
        <ClusterMarkers markers={markers} />
      </MapContainer>
    </div>
  )
}
