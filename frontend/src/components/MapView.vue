<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { MapAdapter, MapAdapterFactory } from '../map/MapAdapter'
import { createLeafletAdapter } from '../map/leafletAdapter'
import type { LatLng } from '../api/types'
import { useDisastersStore } from '../stores/disasters'
import { useHazardsStore } from '../stores/hazards'
import { useCoordinationPointsStore } from '../stores/coordinationPoints'
import { useRouteStore } from '../stores/route'

const props = withDefaults(
  defineProps<{ adapterFactory?: MapAdapterFactory; draftArea?: LatLng[] }>(),
  { draftArea: () => [] },
)

const emit = defineEmits<{ 'map-click': [LatLng] }>()

// Vue uses a function-typed prop default as-is (it won't call it), so resolve the factory
// here rather than via withDefaults — otherwise the default would be a factory-of-factory.
const makeAdapter: MapAdapterFactory = props.adapterFactory ?? createLeafletAdapter

const el = ref<HTMLDivElement>()
let adapter: MapAdapter | null = null

const { active } = storeToRefs(useDisastersStore())
const { hazards } = storeToRefs(useHazardsStore())
const { points } = storeToRefs(useCoordinationPointsStore())
const { route } = storeToRefs(useRouteStore())

function redrawArea() {
  if (!adapter) return
  adapter.drawArea(props.draftArea.length ? props.draftArea : active.value?.area ?? [])
}

onMounted(() => {
  adapter = makeAdapter(el.value!)
  adapter.onClick((point) => emit('map-click', point))
  redrawArea()
  adapter.drawHazards(hazards.value)
  adapter.drawCoordinationPoints(points.value)
  adapter.drawRoute(route.value?.coordinates ?? [])
})

watch(hazards, (value) => adapter?.drawHazards(value), { deep: true })
watch(points, (value) => adapter?.drawCoordinationPoints(value), { deep: true })
watch(route, (value) => adapter?.drawRoute(value?.coordinates ?? []))
watch(() => props.draftArea, redrawArea, { deep: true })
watch(active, (value) => {
  redrawArea()
  if (value) adapter?.fitTo(value.area)
})

onBeforeUnmount(() => adapter?.destroy())
</script>

<template>
  <div ref="el" class="map" data-test="map"></div>
</template>
