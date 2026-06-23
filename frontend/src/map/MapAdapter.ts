import type { CoordinationPoint, Disaster, Hazard, LatLng, Route } from '../api/types'

/** A map click: geographic position plus container pixel coords (to position UI over the map). */
export interface MapClick {
  lat: number
  lng: number
  x: number
  y: number
}

/**
 * A thin abstraction over the map library so component logic (store -> map sync, click
 * handling) can be unit-tested with a fake, without exercising Leaflet in jsdom.
 */
export interface MapAdapter {
  onClick(handler: (click: MapClick) => void): void
  fitTo(points: LatLng[]): void
  /** Draw every disaster's outline + label; the selected one is highlighted. */
  drawDisasters(disasters: Disaster[], selectedId: string | null): void
  /** Draw the in-progress polygon while a new disaster is being outlined. */
  drawDraftArea(ring: LatLng[]): void
  drawHazards(hazards: Hazard[]): void
  drawCoordinationPoints(points: CoordinationPoint[]): void
  drawRoute(route: Route | null): void
  destroy(): void
}

export type MapAdapterFactory = (element: HTMLElement) => MapAdapter
