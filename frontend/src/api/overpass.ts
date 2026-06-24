import type { EmergencyService, ServiceKind } from './types'
import { serviceMeta } from '../icons'

export interface Bounds {
  south: number
  west: number
  north: number
  east: number
}

const ENDPOINT = 'https://overpass-api.de/api/interpreter'
const AMENITIES: ServiceKind[] = ['police', 'hospital', 'fire_station']

export function buildQuery(b: Bounds): string {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`
  const parts = AMENITIES.flatMap((a) => [
    `node["amenity"="${a}"](${bbox});`,
    `way["amenity"="${a}"](${bbox});`,
  ]).join('')
  return `[out:json][timeout:25];(${parts});out center;`
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/** Fetches police stations, hospitals and fire stations within the bounds from OpenStreetMap. */
export async function fetchEmergencyServices(
  bounds: Bounds,
  fetchFn: typeof fetch = fetch,
): Promise<EmergencyService[]> {
  const response = await fetchFn(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(buildQuery(bounds))}`,
  })
  if (!response.ok) {
    throw new Error(`Overpass request failed with status ${response.status}`)
  }

  const json = (await response.json()) as { elements?: OverpassElement[] }
  const services: EmergencyService[] = []
  for (const el of json.elements ?? []) {
    const kind = el.tags?.amenity as ServiceKind | undefined
    if (kind !== 'police' && kind !== 'hospital' && kind !== 'fire_station') continue
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (lat === undefined || lng === undefined) continue
    services.push({
      id: `${el.type}/${el.id}`,
      kind,
      name: el.tags?.name ?? serviceMeta[kind].label,
      lat,
      lng,
    })
  }
  return services
}
