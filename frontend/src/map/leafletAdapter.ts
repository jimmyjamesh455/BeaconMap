import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CoordinationPoint, Disaster, EmergencyService, Hazard, LatLng, Route } from '../api/types'
import type { MapAdapter } from './MapAdapter'
import { formatRouteSummary } from '../format'
import { disasterInfo, hazardInfo, pointInfo, serviceInfo } from '../icons'

const HAZARD_COLOURS: Record<string, string> = {
  BlockedRoad: '#b45309',
  UnsafeRoute: '#b45309',
  Fire: '#dc2626',
  DamagedBuilding: '#7c3aed',
  Other: '#475569',
}

// Emoji in a fixed-size circular chip. Being an HTML overlay, it stays the same on-screen size
// at every zoom level (it is not scaled with the map like geographic shapes).
function emojiIcon(emoji: string, typeClass: string): L.DivIcon {
  return L.divIcon({
    className: `map-pin-icon ${typeClass}`,
    html: `<div class="map-pin">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    tooltipAnchor: [0, -18],
  })
}

export function createLeafletAdapter(element: HTMLElement): MapAdapter {
  // Constrain to a single world: don't let tiles repeat horizontally, keep panning within the
  // world bounds, and stop zooming out past one Earth.
  const worldBounds = L.latLngBounds([-85, -180], [85, 180])
  const map = L.map(element, {
    minZoom: 2,
    maxBounds: worldBounds,
    maxBoundsViscosity: 1,
  }).setView([20, 0], 2)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    noWrap: true,
  }).addTo(map)

  const disasterLayer = L.layerGroup().addTo(map)
  const draftLayer = L.layerGroup().addTo(map)
  const hazardLayer = L.layerGroup().addTo(map)
  const pointLayer = L.layerGroup().addTo(map)
  const serviceLayer = L.layerGroup().addTo(map)
  const routeLayer = L.layerGroup().addTo(map)

  let markerClickHandler: ((point: LatLng) => void) | null = null

  // The map is created inside a flex container that may not have its final size yet; recompute
  // Leaflet's dimensions once laid out and on resize, else tiles/overlays render blank.
  const resizeObserver = new ResizeObserver(() => map.invalidateSize())
  resizeObserver.observe(element)
  requestAnimationFrame(() => map.invalidateSize())

  function pointMarker(lat: number, lng: number, icon: L.DivIcon, label: string): L.Marker {
    // Name shows on hover (tooltip), leaving the click free to snap a route to this marker.
    return L.marker([lat, lng], { icon })
      .bindTooltip(label, { direction: 'top' })
      .on('click', () => markerClickHandler?.({ lat, lng }))
  }

  return {
    onClick(handler) {
      map.on('click', (e: L.LeafletMouseEvent) =>
        handler({ lat: e.latlng.lat, lng: e.latlng.lng, x: e.containerPoint.x, y: e.containerPoint.y }))
    },
    onMarkerClick(handler) {
      markerClickHandler = handler
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
        const meta = disasterInfo(d.type)
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

        polygon.bindTooltip(`${meta.emoji} ${d.name} — ${meta.label}`, {
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
        const meta = hazardInfo(h.type)
        L.marker([h.lat, h.lng], { icon: emojiIcon(meta.emoji, 'hazard-div-icon') })
          .bindPopup(`<b>${meta.label}</b><br>${h.description ?? ''}`)
          .addTo(hazardLayer)
      }
    },
    drawCoordinationPoints(points: CoordinationPoint[]) {
      pointLayer.clearLayers()
      for (const p of points) {
        const meta = pointInfo(p.type)
        pointMarker(p.lat, p.lng, emojiIcon(meta.emoji, 'point-div-icon'),
          `${p.name} — ${meta.label}`).addTo(pointLayer)
      }
    },
    drawEmergencyServices(services: EmergencyService[]) {
      serviceLayer.clearLayers()
      for (const s of services) {
        const meta = serviceInfo(s.kind)
        pointMarker(s.lat, s.lng, emojiIcon(meta.emoji, 'service-div-icon'),
          `${s.name} — ${meta.label}`).addTo(serviceLayer)
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
