import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setApiClient } from '../api/instance'
import type { ApiClient } from '../api/client'
import type { CoordinationPoint, Disaster, Hazard, Route } from '../api/types'
import { useDisastersStore } from './disasters'
import { useHazardsStore } from './hazards'
import { useCoordinationPointsStore } from './coordinationPoints'
import { useRouteStore } from './route'

function hazard(id: string, radius = 100): Hazard {
  return { id, disasterId: 'd1', type: 'Fire', lat: 1, lng: 2, radiusMeters: radius, description: null, createdAtUtc: '' }
}

function point(id: string, name = 'CP'): CoordinationPoint {
  return { id, disasterId: 'd1', name, type: 'CommandPost', lat: 1, lng: 2, description: null, createdAtUtc: '' }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('hazards store live events', () => {
  it('adds a hazard on created event', () => {
    const store = useHazardsStore()
    store.onCreated(hazard('h1'))
    expect(store.hazards.map((h) => h.id)).toEqual(['h1'])
  })

  it('replaces a hazard on updated event', () => {
    const store = useHazardsStore()
    store.onCreated(hazard('h1', 100))
    store.onUpdated(hazard('h1', 500))
    expect(store.hazards).toHaveLength(1)
    expect(store.hazards[0].radiusMeters).toBe(500)
  })

  it('removes a hazard on deleted event', () => {
    const store = useHazardsStore()
    store.onCreated(hazard('h1'))
    store.onCreated(hazard('h2'))
    store.onDeleted('h1')
    expect(store.hazards.map((h) => h.id)).toEqual(['h2'])
  })

  it('does not duplicate when create is followed by its own live event', async () => {
    setApiClient({ createHazard: vi.fn().mockResolvedValue(hazard('h1')) } as unknown as ApiClient)
    const store = useHazardsStore()

    const created = await store.create('d1', { type: 'Fire', lat: 1, lng: 2, radiusMeters: null, description: null })
    store.onCreated(created)

    expect(store.hazards).toHaveLength(1)
  })

  it('load fetches hazards from the client', async () => {
    setApiClient({ listHazards: vi.fn().mockResolvedValue([hazard('h1'), hazard('h2')]) } as unknown as ApiClient)
    const store = useHazardsStore()

    await store.load('d1')

    expect(store.hazards).toHaveLength(2)
  })
})

describe('coordination points store live events', () => {
  it('adds on created and removes on deleted', () => {
    const store = useCoordinationPointsStore()
    store.onCreated(point('c1'))
    store.onCreated(point('c2'))
    store.onDeleted('c1')
    expect(store.points.map((p) => p.id)).toEqual(['c2'])
  })
})

describe('disasters store', () => {
  it('select sets the active disaster', () => {
    const store = useDisastersStore()
    store.disasters = [{ id: 'd1', name: 'A', type: 'Earthquake', area: [], description: null, createdAtUtc: '' } as Disaster]
    store.select('d1')
    expect(store.active?.id).toBe('d1')
  })

  it('create selects the new disaster', async () => {
    const created: Disaster = { id: 'd9', name: 'New', type: 'Flood', area: [], description: null, createdAtUtc: '' }
    setApiClient({ createDisaster: vi.fn().mockResolvedValue(created) } as unknown as ApiClient)
    const store = useDisastersStore()

    await store.create({ name: 'New', type: 'Flood', area: [{ lat: 1, lng: 2 }], description: null })

    expect(store.activeId).toBe('d9')
    expect(store.active?.name).toBe('New')
  })
})

describe('route store', () => {
  it('stores the returned polyline', async () => {
    const route: Route = { coordinates: [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }], distanceMeters: 100, durationSeconds: 60 }
    setApiClient({ requestRoute: vi.fn().mockResolvedValue(route) } as unknown as ApiClient)
    const store = useRouteStore()

    await store.request('d1', { lat: 1, lng: 2 }, { lat: 3, lng: 4 })

    expect(store.route?.coordinates).toHaveLength(2)
    expect(store.error).toBeNull()
  })

  it('sets an error message when routing fails', async () => {
    setApiClient({ requestRoute: vi.fn().mockRejectedValue(new Error('502')) } as unknown as ApiClient)
    const store = useRouteStore()

    await store.request('d1', { lat: 1, lng: 2 }, { lat: 3, lng: 4 })

    expect(store.route).toBeNull()
    expect(store.error).not.toBeNull()
  })
})
