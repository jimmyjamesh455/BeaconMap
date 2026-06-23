<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { CreateCoordinationPoint, CreateDisaster, CreateHazard, LatLng } from './api/types'
import { useDisastersStore } from './stores/disasters'
import { useHazardsStore } from './stores/hazards'
import { useCoordinationPointsStore } from './stores/coordinationPoints'
import { useRouteStore } from './stores/route'
import { createMapHub } from './realtime/mapHub'
import DisasterPicker from './components/DisasterPicker.vue'
import DisasterForm from './components/DisasterForm.vue'
import HazardForm from './components/HazardForm.vue'
import CoordinationPointForm from './components/CoordinationPointForm.vue'
import RoutePanel from './components/RoutePanel.vue'
import MapView from './components/MapView.vue'

type Mode = 'new-disaster' | 'hazard' | 'point' | 'route-start' | 'route-end' | null

const disasters = useDisastersStore()
const hazards = useHazardsStore()
const points = useCoordinationPointsStore()
const route = useRouteStore()
const { active, activeId } = storeToRefs(disasters)

const hub = createMapHub()
let hubConnected = false

const mode = ref<Mode>(null)
const pendingLocation = ref<LatLng | null>(null)
const draftArea = ref<LatLng[]>([])
const routeStart = ref<LatLng | null>(null)
const routeEnd = ref<LatLng | null>(null)

const hasActive = computed(() => active.value !== null)

onMounted(() => disasters.load())

async function ensureHub(disasterId: string) {
  const handlers = {
    hazardCreated: hazards.onCreated,
    hazardUpdated: hazards.onUpdated,
    hazardDeleted: hazards.onDeleted,
    coordinationPointCreated: points.onCreated,
    coordinationPointUpdated: points.onUpdated,
    coordinationPointDeleted: points.onDeleted,
  }
  try {
    if (!hubConnected) {
      await hub.connect(disasterId, handlers)
      hubConnected = true
    } else {
      await hub.switchDisaster(disasterId)
    }
  } catch {
    // Live updates are best-effort; the app still works without them.
  }
}

async function selectDisaster(id: string) {
  disasters.select(id)
  resetTransient()
  route.clear()
  await Promise.all([hazards.load(id), points.load(id)])
  await ensureHub(id)
}

function resetTransient() {
  mode.value = null
  pendingLocation.value = null
  draftArea.value = []
  routeStart.value = null
  routeEnd.value = null
}

function startNewDisaster() {
  resetTransient()
  mode.value = 'new-disaster'
}

function setMode(next: Mode) {
  mode.value = mode.value === next ? null : next
  pendingLocation.value = null
}

function onMapClick(point: LatLng) {
  switch (mode.value) {
    case 'new-disaster':
      draftArea.value = [...draftArea.value, point]
      break
    case 'hazard':
    case 'point':
      pendingLocation.value = point
      break
    case 'route-start':
      routeStart.value = point
      void tryRoute()
      break
    case 'route-end':
      routeEnd.value = point
      void tryRoute()
      break
  }
}

async function tryRoute() {
  if (activeId.value && routeStart.value && routeEnd.value) {
    await route.request(activeId.value, routeStart.value, routeEnd.value)
  }
}

async function submitDisaster(input: CreateDisaster) {
  const created = await disasters.create(input)
  await selectDisaster(created.id)
}

async function submitHazard(input: CreateHazard) {
  if (!activeId.value) return
  await hazards.create(activeId.value, input)
  pendingLocation.value = null
  mode.value = null
}

async function submitPoint(input: CreateCoordinationPoint) {
  if (!activeId.value) return
  await points.create(activeId.value, input)
  pendingLocation.value = null
  mode.value = null
}

function clearRoute() {
  route.clear()
  routeStart.value = null
  routeEnd.value = null
}
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <h1>BeaconMap</h1>
      <DisasterPicker
        :disasters="disasters.disasters"
        :active-id="activeId"
        @select="selectDisaster"
        @create="startNewDisaster"
      />

      <DisasterForm
        v-if="mode === 'new-disaster'"
        :area="draftArea"
        @submit="submitDisaster"
        @cancel="resetTransient"
      />

      <template v-if="hasActive && mode !== 'new-disaster'">
        <div class="toolbar">
          <button :class="{ active: mode === 'hazard' }" @click="setMode('hazard')">Add hazard</button>
          <button :class="{ active: mode === 'point' }" @click="setMode('point')">Add point</button>
        </div>

        <HazardForm
          v-if="mode === 'hazard' && pendingLocation"
          :location="pendingLocation"
          @submit="submitHazard"
          @cancel="pendingLocation = null"
        />
        <CoordinationPointForm
          v-if="mode === 'point' && pendingLocation"
          :location="pendingLocation"
          @submit="submitPoint"
          @cancel="pendingLocation = null"
        />

        <RoutePanel
          :route="route.route"
          :error="route.error"
          :has-start="routeStart !== null"
          :has-end="routeEnd !== null"
          :active-mode="mode"
          @set-start="setMode('route-start')"
          @set-end="setMode('route-end')"
          @clear="clearRoute"
        />

        <p class="counts">{{ hazards.hazards.length }} hazards · {{ points.points.length }} points</p>
      </template>

      <p v-if="mode" class="mode-hint">Click the map to place ({{ mode }}).</p>
    </aside>

    <main class="map-pane">
      <MapView :draft-area="draftArea" @map-click="onMapClick" />
    </main>
  </div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; }
.app { display: flex; height: 100vh; }
.sidebar {
  width: 320px; padding: 16px; overflow-y: auto;
  background: #0f172a; color: #e2e8f0; flex-shrink: 0;
}
.sidebar h1 { font-size: 1.2rem; margin: 0 0 12px; }
.map-pane { flex: 1; position: relative; }
.map { position: absolute; inset: 0; }
.picker { display: flex; gap: 8px; align-items: end; margin-bottom: 12px; }
.picker select { width: 100%; }
.toolbar { display: flex; gap: 8px; margin: 12px 0; }
button {
  background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
  padding: 6px 10px; border-radius: 6px; cursor: pointer;
}
button.active { background: #2563eb; border-color: #2563eb; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.form, .route-panel { background: #1e293b; padding: 12px; border-radius: 8px; margin: 12px 0; }
.form h3, .route-panel h3 { margin: 0 0 8px; font-size: 1rem; }
label { display: block; font-size: 0.85rem; margin-bottom: 8px; }
input, select { width: 100%; padding: 6px; margin-top: 2px; border-radius: 4px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; }
.actions { display: flex; gap: 8px; margin-top: 8px; }
.coords, .hint, .counts, .mode-hint { font-size: 0.8rem; color: #94a3b8; }
.route-summary { color: #34d399; font-size: 0.85rem; }
.error { color: #f87171; font-size: 0.85rem; }

@media (max-width: 720px) {
  .app { flex-direction: column; }
  .sidebar { width: 100%; height: 45vh; }
  .map-pane { height: 55vh; }
}
</style>
