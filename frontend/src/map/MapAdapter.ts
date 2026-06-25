import type { CoordinationPoint, Disaster, EmergencyService, Hazard, LatLng, Route } from '../api/types'
import type { Bounds } from '../api/overpass'
import type { City } from '../data/cities'

/** A map click: geographic position plus container pixel coords (to position UI over the map). */
export interface MapClick {
  lat: number
  lng: number
  x: number
  y: number
}

/** A click on a placed marker (hazard / coordination point / emergency service). */
export interface MapMarkerClick {
  kind: 'hazard' | 'point' | 'service'
  id: string
  name: string
  lat: number
  lng: number
  x: number
  y: number
}

export interface MapViewport {
  bounds: Bounds
  zoom: number
}

/**
 * A thin abstraction over the map library so component logic (store -> map sync, click
 * handling) can be unit-tested with a fake, without exercising Leaflet in jsdom.
 */
export interface MapAdapter {
  onClick(handler: (click: MapClick) => void): void
  onMarkerClick(handler: (marker: MapMarkerClick) => void): void
  /** Fires when a non-selected disaster outline is clicked (to select it). */
  onDisasterClick(handler: (disasterId: string) => void): void
  fitTo(points: LatLng[]): void
  getViewport(): MapViewport
  /** Draw every disaster's outline + label; the selected one is highlighted and click-through. */
  drawDisasters(disasters: Disaster[], selectedId: string | null): void
  /** Draw the in-progress polygon while a new disaster is being outlined. */
  drawDraftArea(ring: LatLng[]): void
  drawHazards(hazards: Hazard[]): void
  drawCoordinationPoints(points: CoordinationPoint[]): void
  drawEmergencyServices(services: EmergencyService[]): void
  /** Draw curated city labels (shown only at low zoom for orientation). */
  drawCities(cities: City[]): void
  drawRoute(route: Route | null): void
  destroy(): void
}

export type MapAdapterFactory = (element: HTMLElement) => MapAdapter
