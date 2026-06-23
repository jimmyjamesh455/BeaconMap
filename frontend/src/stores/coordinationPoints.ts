import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/instance'
import type { CoordinationPoint, CreateCoordinationPoint } from '../api/types'

export const useCoordinationPointsStore = defineStore('coordinationPoints', () => {
  const points = ref<CoordinationPoint[]>([])

  function upsert(point: CoordinationPoint): void {
    const index = points.value.findIndex((p) => p.id === point.id)
    if (index >= 0) {
      points.value[index] = point
    } else {
      points.value.push(point)
    }
  }

  function removeLocal(id: string): void {
    points.value = points.value.filter((p) => p.id !== id)
  }

  async function load(disasterId: string): Promise<void> {
    points.value = await api().listCoordinationPoints(disasterId)
  }

  async function create(disasterId: string, input: CreateCoordinationPoint): Promise<CoordinationPoint> {
    const point = await api().createCoordinationPoint(disasterId, input)
    upsert(point)
    return point
  }

  async function remove(disasterId: string, id: string): Promise<void> {
    await api().deleteCoordinationPoint(disasterId, id)
    removeLocal(id)
  }

  function clear(): void {
    points.value = []
  }

  const onCreated = upsert
  const onUpdated = upsert
  const onDeleted = removeLocal

  return { points, load, create, remove, clear, upsert, onCreated, onUpdated, onDeleted }
})
