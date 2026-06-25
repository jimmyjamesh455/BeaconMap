import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { CoordinationPoint, Disaster, EmergencyService, Hazard, Route } from '../api/types'
import type { MapAdapter, MapMarkerClick, MapViewport } from './MapAdapter'
import type { City } from '../data/cities'
import { formatRouteSummary } from '../format'
import { disasterInfo, hazardInfo, pointInfo, serviceInfo } from '../icons'

// Brand palette (the map legend).
const HAZARD = '#E5484D' // hazards / danger radii
const SAFE = '#16B786'   // safe routes
const COORD = '#1FA9D6'  // coordination / selection
const BEACON = '#F6A623' // signal / draft outline
const STEEL_MUTE = '#6E8799'

const MAX_CITY_ZOOM = 5 // city labels only help when zoomed out; the basemap shows them in close

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

  // OpenStreetMap tiles (reliably reachable), darkened via CSS to the brand Ink canvas in dark
  // mode (.leaflet-tile filter in App.vue). Reliable English-label / dark tile CDNs need a key.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    noWrap: true,
  }).addTo(map)

  const cityLayer = L.layerGroup()
  const disasterLayer = L.layerGroup().addTo(map)
  const draftLayer = L.layerGroup().addTo(map)
  const hazardLayer = L.layerGroup().addTo(map)
  const pointLayer = L.layerGroup().addTo(map)
  const serviceLayer = L.layerGroup().addTo(map)
  const routeLayer = L.layerGroup().addTo(map)

  let markerClickHandler: ((marker: MapMarkerClick) => void) | null = null
  let disasterClickHandler: ((disasterId: string) => void) | null = null
  let zoomHandler: ((zoom: number) => void) | null = null
  map.on('zoomend', () => zoomHandler?.(map.getZoom()))

  // Keep the world filling the container: raise the minimum zoom to the level at which the world
  // covers the viewport, so widening the map (e.g. hiding the side panel) never leaves blank
  // space. Zoom in if we're currently below that.
  function coverViewport() {
    const coverZoom = Math.max(2, map.getBoundsZoom(worldBounds, true))
    if (map.getMinZoom() !== coverZoom) map.setMinZoom(coverZoom)
    if (map.getZoom() < coverZoom) map.setZoom(coverZoom)
  }

  // The map is created inside a flex container that may not have its final size yet; recompute
  // Leaflet's dimensions once laid out and on resize, else tiles/overlays render blank.
  const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize()
    coverViewport()
  })
  resizeObserver.observe(element)
  requestAnimationFrame(() => {
    map.invalidateSize()
    coverViewport()
  })

  function updateCityVisibility() {
    const show = map.getZoom() <= MAX_CITY_ZOOM
    if (show && !map.hasLayer(cityLayer)) {
      cityLayer.addTo(map)
    } else if (!show && map.hasLayer(cityLayer)) {
      map.removeLayer(cityLayer)
    }
  }
  map.on('zoomend', updateCityVisibility)

  function pointMarker(
    kind: MapMarkerClick['kind'], id: string, lat: number, lng: number, icon: L.DivIcon, label: string,
  ): L.Marker {
    // Name shows on hover (tooltip), leaving the click free to snap a route / open the menu.
    return L.marker([lat, lng], { icon })
      .bindTooltip(label, { direction: 'top' })
      .on('click', (e: L.LeafletMouseEvent) =>
        markerClickHandler?.({ kind, id, name: label, lat, lng, x: e.containerPoint.x, y: e.containerPoint.y }))
  }

  return {
    onClick(handler) {
      map.on('click', (e: L.LeafletMouseEvent) =>
        handler({ lat: e.latlng.lat, lng: e.latlng.lng, x: e.containerPoint.x, y: e.containerPoint.y }))
    },
    onMarkerClick(handler) {
      markerClickHandler = handler
    },
    onDisasterClick(handler) {
      disasterClickHandler = handler
    },
    onZoom(handler) {
      zoomHandler = handler
      handler(map.getZoom())
    },
    fitTo(points) {
      if (points.length === 0) return
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]))
      map.fitBounds(bounds, { padding: [30, 30] })
    },
    getViewport(): MapViewport {
      const b = map.getBounds()
      return {
        bounds: { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        zoom: map.getZoom(),
      }
    },
    drawDisasters(disasters: Disaster[], selectedId: string | null) {
      disasterLayer.clearLayers()
      for (const d of disasters) {
        if (d.area.length === 0) continue
        const selected = d.id === selectedId
        const meta = disasterInfo(d.type)
        // The selected outline is click-through (so clicks inside place hazards/points); other
        // outlines are clickable to select that disaster.
        const polygon = L.polygon(
          d.area.map((p) => [p.lat, p.lng] as [number, number]),
          {
            color: selected ? COORD : STEEL_MUTE,
            weight: selected ? 4 : 3,
            opacity: selected ? 0.95 : 0.8,
            fillOpacity: selected ? 0.12 : 0.05,
            dashArray: selected ? undefined : '6 6',
            interactive: !selected,
            className: 'disaster-area',
          },
        ).addTo(disasterLayer)

        if (!selected) {
          polygon.on('click', () => disasterClickHandler?.(d.id))
        }

        // The label is interactive on non-selected disasters so clicking the name also selects
        // them; on the selected disaster it's click-through (so clicks place items / deselect).
        polygon.bindTooltip(`${meta.emoji} ${d.name} — ${meta.label}`, {
          permanent: true,
          direction: 'center',
          className: selected ? 'disaster-label selected' : 'disaster-label',
          interactive: !selected,
        })
      }
    },
    drawDraftArea(ring) {
      draftLayer.clearLayers()
      if (ring.length === 0) return
      const latlngs = ring.map((p) => [p.lat, p.lng] as [number, number])
      if (ring.length >= 3) {
        L.polygon(latlngs, { color: BEACON, weight: 3, dashArray: '4 4', fillOpacity: 0.08, interactive: false })
          .addTo(draftLayer)
      }
      for (const p of latlngs) {
        L.circleMarker(p, { radius: 4, color: BEACON, fillColor: BEACON, fillOpacity: 1, interactive: false })
          .addTo(draftLayer)
      }
    },
    drawHazards(hazards: Hazard[]) {
      hazardLayer.clearLayers()
      for (const h of hazards) {
        // Danger radius is always hazard-red (an avoid-zone); the icon conveys the kind.
        L.circle([h.lat, h.lng], {
          radius: h.radiusMeters,
          color: HAZARD,
          fillColor: HAZARD,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.2,
        }).addTo(hazardLayer)
        const meta = hazardInfo(h.type)
        const label = h.description ? `${meta.label} — ${h.description}` : meta.label
        pointMarker('hazard', h.id, h.lat, h.lng, emojiIcon(meta.emoji, 'hazard-div-icon'), label)
          .addTo(hazardLayer)
      }
    },
    drawCoordinationPoints(points: CoordinationPoint[]) {
      pointLayer.clearLayers()
      for (const p of points) {
        const meta = pointInfo(p.type)
        pointMarker('point', p.id, p.lat, p.lng, emojiIcon(meta.emoji, 'point-div-icon'),
          `${p.name} — ${meta.label}`).addTo(pointLayer)
      }
    },
    drawEmergencyServices(services: EmergencyService[]) {
      serviceLayer.clearLayers()
      for (const s of services) {
        const meta = serviceInfo(s.kind)
        pointMarker('service', s.id, s.lat, s.lng, emojiIcon(meta.emoji, 'service-div-icon'),
          `${s.name} — ${meta.label}`).addTo(serviceLayer)
      }
    },
    drawCities(cities: City[]) {
      cityLayer.clearLayers()
      for (const c of cities) {
        L.circleMarker([c.lat, c.lng], {
          radius: 3, color: '#B9CCDB', fillColor: '#B9CCDB', fillOpacity: 1, weight: 1, interactive: false,
        })
          .bindTooltip(c.name, { permanent: true, direction: 'right', className: 'city-label' })
          .addTo(cityLayer)
      }
      updateCityVisibility()
    },
    drawRoute(route: Route | null) {
      routeLayer.clearLayers()
      if (!route || route.coordinates.length === 0) return
      const latlngs = route.coordinates.map((p) => [p.lat, p.lng] as [number, number])

      // White casing underneath makes the route stand out on any basemap.
      L.polyline(latlngs, { color: '#ffffff', weight: 11, opacity: 0.95, lineCap: 'round', lineJoin: 'round' })
        .addTo(routeLayer)
      L.polyline(latlngs, {
        color: SAFE,
        weight: 6,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'route-line',
      })
        // Sticky tooltip follows the cursor while hovering the route line.
        .bindTooltip(formatRouteSummary(route.distanceMeters, route.durationSeconds), {
          sticky: true,
          className: 'route-tooltip',
        })
        .addTo(routeLayer)

      // Start (filled) and end (ringed) markers anchor the route ends.
      const start = latlngs[0]
      const end = latlngs[latlngs.length - 1]
      L.circleMarker(start, { radius: 7, color: '#ffffff', weight: 3, fillColor: SAFE, fillOpacity: 1 })
        .bindTooltip('Route start', { direction: 'top' })
        .addTo(routeLayer)
      L.circleMarker(end, { radius: 8, color: SAFE, weight: 4, fillColor: '#ffffff', fillOpacity: 1 })
        .bindTooltip('Route end', { direction: 'top' })
        .addTo(routeLayer)
    },
    destroy() {
      resizeObserver.disconnect()
      map.remove()
    },
  }
}
