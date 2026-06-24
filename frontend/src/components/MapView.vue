<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { MapAdapter, MapAdapterFactory, MapClick } from '../map/MapAdapter'
import { createLeafletAdapter } from '../map/leafletAdapter'
import type { LatLng } from '../api/types'
import { useDisastersStore } from '../stores/disasters'
import { useHazardsStore } from '../stores/hazards'
import { useCoordinationPointsStore } from '../stores/coordinationPoints'
import { useRouteStore } from '../stores/route'
import { useEmergencyServicesStore } from '../stores/emergencyServices'

const props = withDefaults(
  defineProps<{ adapterFactory?: MapAdapterFactory; draftArea?: LatLng[] }>(),
  { draftArea: () => [] },
)

const emit = defineEmits<{ 'map-click': [MapClick]; 'marker-click': [LatLng] }>()

// Vue uses a function-typed prop default as-is (it won't call it), so resolve the factory
// here rather than via withDefaults — otherwise the default would be a factory-of-factory.
const makeAdapter: MapAdapterFactory = props.adapterFactory ?? createLeafletAdapter

const el = ref<HTMLDivElement>()
let adapter: MapAdapter | null = null

const { disasters, active, activeId } = storeToRefs(useDisastersStore())
const { hazards } = storeToRefs(useHazardsStore())
const { points } = storeToRefs(useCoordinationPointsStore())
const { route } = storeToRefs(useRouteStore())
const { services, visible: servicesVisible } = storeToRefs(useEmergencyServicesStore())

function drawServices() {
  adapter?.drawEmergencyServices(servicesVisible.value ? services.value : [])
}

onMounted(() => {
  adapter = makeAdapter(el.value!)
  adapter.onClick((click) => emit('map-click', click))
  adapter.onMarkerClick((point) => emit('marker-click', point))
  adapter.drawDisasters(disasters.value, activeId.value)
  adapter.drawDraftArea(props.draftArea)
  adapter.drawHazards(hazards.value)
  adapter.drawCoordinationPoints(points.value)
  drawServices()
  adapter.drawRoute(route.value)
})

watch(disasters, (value) => adapter?.drawDisasters(value, activeId.value), { deep: true })
watch(activeId, (value) => {
  adapter?.drawDisasters(disasters.value, value)
  if (active.value) adapter?.fitTo(active.value.area)
})
watch(() => props.draftArea, (value) => adapter?.drawDraftArea(value), { deep: true })
watch(hazards, (value) => adapter?.drawHazards(value), { deep: true })
watch(points, (value) => adapter?.drawCoordinationPoints(value), { deep: true })
watch([services, servicesVisible], drawServices, { deep: true })
watch(route, (value) => adapter?.drawRoute(value))

onBeforeUnmount(() => adapter?.destroy())
</script>

<template>
  <div ref="el" class="map" data-test="map"></div>
</template>
