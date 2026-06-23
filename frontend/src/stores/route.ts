import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/instance'
import type { LatLng, Route } from '../api/types'

export const useRouteStore = defineStore('route', () => {
  const route = ref<Route | null>(null)
  const error = ref<string | null>(null)

  async function request(disasterId: string, start: LatLng, end: LatLng, profile: string | null = null): Promise<void> {
    error.value = null
    try {
      route.value = await api().requestRoute(disasterId, { start, end, profile })
    } catch {
      route.value = null
      error.value = 'Could not compute a route that avoids the recorded hazards.'
    }
  }

  function clear(): void {
    route.value = null
    error.value = null
  }

  return { route, error, request, clear }
})
