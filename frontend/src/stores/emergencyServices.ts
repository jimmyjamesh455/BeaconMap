import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchEmergencyServices, type Bounds } from '../api/overpass'
import type { EmergencyService } from '../api/types'

export const useEmergencyServicesStore = defineStore('emergencyServices', () => {
  const services = ref<EmergencyService[]>([])
  const visible = ref(false)
  const loading = ref(false)

  async function show(bounds: Bounds): Promise<void> {
    loading.value = true
    try {
      services.value = await fetchEmergencyServices(bounds)
      visible.value = true
    } finally {
      loading.value = false
    }
  }

  function hide(): void {
    visible.value = false
  }

  /** Loads + shows on first call; hides on the next. Errors propagate so the caller can notify. */
  async function toggle(bounds: Bounds): Promise<void> {
    if (visible.value) {
      hide()
    } else {
      await show(bounds)
    }
  }

  function clear(): void {
    services.value = []
    visible.value = false
  }

  return { services, visible, loading, show, hide, toggle, clear }
})
