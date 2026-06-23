import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from '../api/instance'
import type { CreateDisaster, Disaster } from '../api/types'

export const useDisastersStore = defineStore('disasters', () => {
  const disasters = ref<Disaster[]>([])
  const activeId = ref<string | null>(null)

  const active = computed(() => disasters.value.find((d) => d.id === activeId.value) ?? null)

  async function load(): Promise<void> {
    disasters.value = await api().listDisasters()
  }

  async function create(input: CreateDisaster): Promise<Disaster> {
    const disaster = await api().createDisaster(input)
    disasters.value.push(disaster)
    activeId.value = disaster.id
    return disaster
  }

  async function remove(id: string): Promise<void> {
    await api().deleteDisaster(id)
    disasters.value = disasters.value.filter((d) => d.id !== id)
    if (activeId.value === id) {
      activeId.value = null
    }
  }

  function select(id: string | null): void {
    activeId.value = id
  }

  return { disasters, activeId, active, load, create, remove, select }
})
