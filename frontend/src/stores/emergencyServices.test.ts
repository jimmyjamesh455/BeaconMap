import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../api/overpass', () => ({ fetchEmergencyServices: vi.fn() }))
import { fetchEmergencyServices } from '../api/overpass'
import { useEmergencyServicesStore } from './emergencyServices'

const bounds = { south: 0, west: 0, north: 1, east: 1 }
const mockFetch = fetchEmergencyServices as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('emergency services store', () => {
  it('loads and shows on first toggle, hides on the next', async () => {
    mockFetch.mockResolvedValue([{ id: 'node/1', kind: 'police', name: 'P', lat: 0, lng: 0 }])
    const store = useEmergencyServicesStore()

    await store.toggle(bounds)
    expect(store.visible).toBe(true)
    expect(store.services).toHaveLength(1)

    await store.toggle(bounds)
    expect(store.visible).toBe(false)
  })

  it('propagates fetch errors so the caller can notify', async () => {
    mockFetch.mockRejectedValue(new Error('overpass down'))
    const store = useEmergencyServicesStore()

    await expect(store.toggle(bounds)).rejects.toThrow()
    expect(store.visible).toBe(false)
    expect(store.loading).toBe(false)
  })
})
