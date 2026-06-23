import { describe, it, expect, vi } from 'vitest'
import { createApiClient } from './client'
import type { Disaster, Route } from './types'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const baseUrl = 'http://api.test'

describe('api client', () => {
  it('createDisaster POSTs to /api/disasters with a JSON body and returns the created disaster', async () => {
    const created: Disaster = {
      id: 'd1', name: 'Quake', type: 'Earthquake', area: [], description: null, createdAtUtc: '',
    }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(created))
    const client = createApiClient(baseUrl, fetchMock)

    const result = await client.createDisaster({
      name: 'Quake', type: 'Earthquake', area: [{ lat: 1, lng: 2 }], description: null,
    })

    expect(result).toEqual(created)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/api/disasters')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).name).toBe('Quake')
  })

  it('listDisasters GETs /api/disasters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]))
    const client = createApiClient(baseUrl, fetchMock)

    await client.listDisasters()

    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/disasters')
  })

  it('createHazard POSTs to the disaster-scoped hazards URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}))
    const client = createApiClient(baseUrl, fetchMock)

    await client.createHazard('d1', {
      type: 'Fire', lat: 1, lng: 2, radiusMeters: null, description: null,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/api/disasters/d1/hazards')
    expect(init.method).toBe('POST')
  })

  it('deleteHazard issues DELETE to the scoped hazard URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const client = createApiClient(baseUrl, fetchMock)

    await client.deleteHazard('d1', 'h9')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://api.test/api/disasters/d1/hazards/h9')
    expect(init.method).toBe('DELETE')
  })

  it('requestRoute POSTs to the scoped routes URL and returns the route', async () => {
    const route: Route = { coordinates: [{ lat: 1, lng: 2 }], distanceMeters: 10, durationSeconds: 5 }
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(route))
    const client = createApiClient(baseUrl, fetchMock)

    const result = await client.requestRoute('d1', {
      start: { lat: 1, lng: 2 }, end: { lat: 3, lng: 4 }, profile: null,
    })

    expect(result).toEqual(route)
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/disasters/d1/routes')
  })

  it('throws when the response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: 'bad' }, 400))
    const client = createApiClient(baseUrl, fetchMock)

    await expect(client.listDisasters()).rejects.toThrow()
  })
})
