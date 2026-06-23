import type { CoordinationPoint, Hazard, LatLng } from '../api/types'

/**
 * A thin abstraction over the map library so component logic (store -> map sync, click
 * handling) can be unit-tested with a fake, without exercising Leaflet in jsdom.
 */
export interface MapAdapter {
  onClick(handler: (point: LatLng) => void): void
  fitTo(points: LatLng[]): void
  drawArea(ring: LatLng[]): void
  drawHazards(hazards: Hazard[]): void
  drawCoordinationPoints(points: CoordinationPoint[]): void
  drawRoute(points: LatLng[]): void
  clearRoute(): void
  destroy(): void
}

export type MapAdapterFactory = (element: HTMLElement) => MapAdapter
