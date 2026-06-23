import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/instance'
import type { CreateHazard, Hazard } from '../api/types'

export const useHazardsStore = defineStore('hazards', () => {
  const hazards = ref<Hazard[]>([])

  function upsert(hazard: Hazard): void {
    const index = hazards.value.findIndex((h) => h.id === hazard.id)
    if (index >= 0) {
      hazards.value[index] = hazard
    } else {
      hazards.value.push(hazard)
    }
  }

  function removeLocal(id: string): void {
    hazards.value = hazards.value.filter((h) => h.id !== id)
  }

  async function load(disasterId: string): Promise<void> {
    hazards.value = await api().listHazards(disasterId)
  }

  async function create(disasterId: string, input: CreateHazard): Promise<Hazard> {
    const hazard = await api().createHazard(disasterId, input)
    upsert(hazard)
    return hazard
  }

  async function remove(disasterId: string, id: string): Promise<void> {
    await api().deleteHazard(disasterId, id)
    removeLocal(id)
  }

  function clear(): void {
    hazards.value = []
  }

  // Live SignalR handlers.
  const onCreated = upsert
  const onUpdated = upsert
  const onDeleted = removeLocal

  return { hazards, load, create, remove, clear, upsert, onCreated, onUpdated, onDeleted }
})
