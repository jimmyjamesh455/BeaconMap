import { describe, it, expect, vi } from 'vitest'
import { buildQuery, fetchEmergencyServices } from './overpass'

const bounds = { south: 51.5, west: -0.13, north: 51.52, east: -0.11 }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('overpass', () => {
  it('builds a query with the bbox and all three amenities', () => {
    const query = buildQuery(bounds)
    expect(query).toContain('51.5,-0.13,51.52,-0.11')
    expect(query).toContain('"amenity"="police"')
    expect(query).toContain('"amenity"="hospital"')
    expect(query).toContain('"amenity"="fire_station"')
  })

  it('parses node coordinates and way centres', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      elements: [
        { type: 'node', id: 1, lat: 51.51, lon: -0.12, tags: { amenity: 'hospital', name: 'St Thomas' } },
        { type: 'way', id: 2, center: { lat: 51.515, lon: -0.115 }, tags: { amenity: 'police', name: 'Met Police' } },
      ],
    }))

    const result = await fetchEmergencyServices(bounds, fetchMock)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ kind: 'hospital', name: 'St Thomas', lat: 51.51, lng: -0.12 })
    expect(result[1]).toMatchObject({ kind: 'police', name: 'Met Police', lat: 51.515, lng: -0.115 })
  })

  it('falls back to a default name when none is tagged', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      elements: [{ type: 'node', id: 3, lat: 51.5, lon: -0.12, tags: { amenity: 'fire_station' } }],
    }))

    const result = await fetchEmergencyServices(bounds, fetchMock)

    expect(result[0].name).toBe('Fire station')
  })

  it('throws on a failed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 500))
    await expect(fetchEmergencyServices(bounds, fetchMock)).rejects.toThrow()
  })
})
