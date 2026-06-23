import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { CoordinationPoint, Disaster, Hazard, Route } from '../api/types'
import type { MapAdapter } from './MapAdapter'
import { formatRouteSummary } from '../format'

// Leaflet's default marker icon URLs don't survive bundling; point them at the bundled assets.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const HAZARD_COLOURS: Record<string, string> = {
  BlockedRoad: '#b45309',
  UnsafeRoute: '#b45309',
  Fire: '#dc2626',
  DamagedBuilding: '#7c3aed',
  Other: '#475569',
}

const HAZARD_EMOJI: Record<string, string> = {
  BlockedRoad: '🚧',
  UnsafeRoute: '⚠️',
  Fire: '🔥',
  DamagedBuilding: '🏚️',
  Other: '❗',
}

function hazardIcon(type: string): L.DivIcon {
  const emoji = HAZARD_EMOJI[type] ?? HAZARD_EMOJI.Other
  return L.divIcon({
    className: 'hazard-div-icon',
    html: `<span style="font-size:20px;line-height:26px;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff)">${emoji}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

export function createLeafletAdapter(element: HTMLElement): MapAdapter {
  const map = L.map(element).setView([20, 0], 2)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  const disasterLayer = L.layerGroup().addTo(map)
  const draftLayer = L.layerGroup().addTo(map)
  const hazardLayer = L.layerGroup().addTo(map)
  const pointLayer = L.layerGroup().addTo(map)
  const routeLayer = L.layerGroup().addTo(map)

  // The map is created inside a flex container that may not have its final size yet; recompute
  // Leaflet's dimensions once laid out and on resize, else tiles/overlays render blank.
  const resizeObserver = new ResizeObserver(() => map.invalidateSize())
  resizeObserver.observe(element)
  requestAnimationFrame(() => map.invalidateSize())

  return {
    onClick(handler) {
      map.on('click', (e: L.LeafletMouseEvent) =>
        handler({ lat: e.latlng.lat, lng: e.latlng.lng, x: e.containerPoint.x, y: e.containerPoint.y }))
    },
    fitTo(points) {
      if (points.length === 0) return
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [30, 30] })
    },
    drawDisasters(disasters: Disaster[], selectedId: string | null) {
      disasterLayer.clearLayers()
      for (const d of disasters) {
        if (d.area.length === 0) continue
        const selected = d.id === selectedId
        // Outlines are non-interactive so map clicks (to add hazards/points) pass through.
        const polygon = L.polygon(
          d.area.map((p) => [p.lat, p.lng] as [number, number]),
          {
            color: selected ? '#2563eb' : '#64748b',
            weight: selected ? 4 : 3,
            opacity: selected ? 0.95 : 0.8,
            fillOpacity: selected ? 0.15 : 0.07,
            dashArray: selected ? undefined : '6 6',
            interactive: false,
          },
        ).addTo(disasterLayer)

        polygon.bindTooltip(`${d.name} — ${d.type}`, {
          permanent: true,
          direction: 'center',
          className: 'disaster-label',
        })
      }
    },
    drawDraftArea(ring) {
      draftLayer.clearLayers()
      if (ring.length === 0) return
      const latlngs = ring.map((p) => [p.lat, p.lng] as [number, number])
      if (ring.length >= 3) {
        L.polygon(latlngs, { color: '#f59e0b', weight: 3, dashArray: '4 4', fillOpacity: 0.08, interactive: false })
          .addTo(draftLayer)
      }
      for (const p of latlngs) {
        L.circleMarker(p, { radius: 4, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 1, interactive: false })
          .addTo(draftLayer)
      }
    },
    drawHazards(hazards: Hazard[]) {
      hazardLayer.clearLayers()
      for (const h of hazards) {
        const colour = HAZARD_COLOURS[h.type] ?? HAZARD_COLOURS.Other
        L.circle([h.lat, h.lng], {
          radius: h.radiusMeters,
          color: colour,
          weight: 3,
          fillOpacity: 0.35,
        }).addTo(hazardLayer)
        L.marker([h.lat, h.lng], { icon: hazardIcon(h.type) })
          .bindPopup(`<b>${h.type}</b><br>${h.description ?? ''}`)
          .addTo(hazardLayer)
      }
    },
    drawCoordinationPoints(points: CoordinationPoint[]) {
      pointLayer.clearLayers()
      for (const p of points) {
        L.marker([p.lat, p.lng])
          .bindPopup(`<b>${p.name}</b><br>${p.type}`)
          .addTo(pointLayer)
      }
    },
    drawRoute(route: Route | null) {
      routeLayer.clearLayers()
      if (!route || route.coordinates.length === 0) return
      L.polyline(route.coordinates.map((p) => [p.lat, p.lng] as [number, number]), {
        color: '#059669',
        weight: 6,
        opacity: 0.9,
        className: 'route-line',
      })
        // Sticky tooltip follows the cursor while hovering the route line.
        .bindTooltip(formatRouteSummary(route.distanceMeters, route.durationSeconds), {
          sticky: true,
          className: 'route-tooltip',
        })
        .addTo(routeLayer)
    },
    destroy() {
      resizeObserver.disconnect()
      map.remove()
    },
  }
}
