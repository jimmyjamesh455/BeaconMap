<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { MapAdapter, MapAdapterFactory, MapClick, MapMarkerClick, MapViewport } from '../map/MapAdapter'
import { createLeafletAdapter } from '../map/leafletAdapter'
import type { LatLng } from '../api/types'
import { majorCities } from '../data/cities'
import { useDisastersStore } from '../stores/disasters'
import { useHazardsStore } from '../stores/hazards'
import { useCoordinationPointsStore } from '../stores/coordinationPoints'
import { useRouteStore } from '../stores/route'
import { useEmergencyServicesStore } from '../stores/emergencyServices'

const props = withDefaults(
  defineProps<{ adapterFactory?: MapAdapterFactory; draftArea?: LatLng[] }>(),
  { draftArea: () => [] },
)

const emit = defineEmits<{
  'map-click': [MapClick]
  'marker-click': [MapMarkerClick]
  'disaster-click': [string]
}>()

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

// Keep disasters visible (and clickable) by fitting to the selected one, or to all of them when
// none is selected. Without this, small disasters are sub-pixel at world zoom.
function fitToContext() {
  if (!adapter) return
  if (active.value) {
    adapter.fitTo(active.value.area)
    return
  }
  const allPoints = disasters.value.flatMap((d) => d.area)
  if (allPoints.length) adapter.fitTo(allPoints)
}

onMounted(() => {
  adapter = makeAdapter(el.value!)
  adapter.onClick((click) => emit('map-click', click))
  adapter.onMarkerClick((marker) => emit('marker-click', marker))
  adapter.onDisasterClick((id) => emit('disaster-click', id))
  adapter.drawCities(majorCities)
  adapter.drawDisasters(disasters.value, activeId.value)
  adapter.drawDraftArea(props.draftArea)
  adapter.drawHazards(hazards.value)
  adapter.drawCoordinationPoints(points.value)
  drawServices()
  adapter.drawRoute(route.value)
  fitToContext()
})

defineExpose({
  getViewport: (): MapViewport | null => adapter?.getViewport() ?? null,
})

watch(disasters, (value) => {
  adapter?.drawDisasters(value, activeId.value)
  if (!activeId.value) fitToContext()
}, { deep: true })
watch(activeId, (value) => {
  adapter?.drawDisasters(disasters.value, value)
  fitToContext()
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
