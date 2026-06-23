import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { CoordinationPoint, Hazard, LatLng } from '../api/types'
import type { MapAdapter } from './MapAdapter'

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

export function createLeafletAdapter(element: HTMLElement): MapAdapter {
  const map = L.map(element).setView([20, 0], 2)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  // The map is created inside a flex container that may not have its final size yet;
  // recompute Leaflet's dimensions once laid out and whenever the container resizes,
  // otherwise tiles render blank until the next interaction.
  const resizeObserver = new ResizeObserver(() => map.invalidateSize())
  resizeObserver.observe(element)
  requestAnimationFrame(() => map.invalidateSize())

  const areaLayer = L.layerGroup().addTo(map)
  const hazardLayer = L.layerGroup().addTo(map)
  const pointLayer = L.layerGroup().addTo(map)
  const routeLayer = L.layerGroup().addTo(map)

  return {
    onClick(handler) {
      map.on('click', (e: L.LeafletMouseEvent) => handler({ lat: e.latlng.lat, lng: e.latlng.lng }))
    },
    fitTo(points) {
      if (points.length === 0) return
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [30, 30] })
    },
    drawArea(ring) {
      areaLayer.clearLayers()
      if (ring.length === 0) return
      L.polygon(ring.map((p) => [p.lat, p.lng] as [number, number]), {
        color: '#2563eb',
        weight: 2,
        fillOpacity: 0.05,
      }).addTo(areaLayer)
    },
    drawHazards(hazards: Hazard[]) {
      hazardLayer.clearLayers()
      for (const h of hazards) {
        L.circle([h.lat, h.lng], {
          radius: h.radiusMeters,
          color: HAZARD_COLOURS[h.type] ?? HAZARD_COLOURS.Other,
          fillOpacity: 0.25,
        })
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
    drawRoute(points: LatLng[]) {
      routeLayer.clearLayers()
      if (points.length === 0) return
      L.polyline(points.map((p) => [p.lat, p.lng] as [number, number]), {
        color: '#059669',
        weight: 5,
        opacity: 0.85,
      }).addTo(routeLayer)
    },
    clearRoute() {
      routeLayer.clearLayers()
    },
    destroy() {
      resizeObserver.disconnect()
      map.remove()
    },
  }
}
