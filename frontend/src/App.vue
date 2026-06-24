<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { CreateCoordinationPoint, CreateDisaster, CreateHazard, LatLng } from './api/types'
import type { MapClick } from './map/MapAdapter'
import { useDisastersStore } from './stores/disasters'
import { useHazardsStore } from './stores/hazards'
import { useCoordinationPointsStore } from './stores/coordinationPoints'
import { useRouteStore } from './stores/route'
import { useNotificationsStore } from './stores/notifications'
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
const notifications = useNotificationsStore()
const { active, activeId } = storeToRefs(disasters)

const SERVER_DOWN = 'Could not reach the server. Make sure the backend is running (dotnet run on port 5180), then try again.'

/** Runs an API action, surfacing a friendly banner instead of an uncaught error if it fails. */
async function withServerError<T>(action: () => Promise<T>): Promise<T | undefined> {
  try {
    return await action()
  } catch {
    notifications.notify(SERVER_DOWN)
    return undefined
  }
}

const hub = createMapHub()
let hubConnected = false

const mode = ref<Mode>(null)
const pendingLocation = ref<LatLng | null>(null)
const draftArea = ref<LatLng[]>([])
const routeStart = ref<LatLng | null>(null)
const routeEnd = ref<LatLng | null>(null)
const contextMenu = ref<MapClick | null>(null)

const hasActive = computed(() => active.value !== null)

onMounted(() => withServerError(() => disasters.load()))

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
  await withServerError(() => Promise.all([hazards.load(id), points.load(id)]))
  await ensureHub(id)
}

function resetTransient() {
  mode.value = null
  pendingLocation.value = null
  draftArea.value = []
  routeStart.value = null
  routeEnd.value = null
  contextMenu.value = null
}

function startNewDisaster() {
  resetTransient()
  mode.value = 'new-disaster'
}

function setMode(next: Mode) {
  mode.value = mode.value === next ? null : next
  pendingLocation.value = null
  contextMenu.value = null
}

function onMapClick(click: MapClick) {
  const point: LatLng = { lat: click.lat, lng: click.lng }
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
      mode.value = 'route-end' // auto-advance to setting the end point
      break
    case 'route-end':
      routeEnd.value = point
      mode.value = null
      void tryRoute()
      break
    default:
      // No active placing mode: offer a quick "add" menu at the clicked spot.
      if (hasActive.value) contextMenu.value = click
  }
}

function menuLocation(): LatLng {
  return { lat: contextMenu.value!.lat, lng: contextMenu.value!.lng }
}

function addHazardHere() {
  pendingLocation.value = menuLocation()
  mode.value = 'hazard'
  contextMenu.value = null
}

function addPointHere() {
  pendingLocation.value = menuLocation()
  mode.value = 'point'
  contextMenu.value = null
}

function startRouteHere() {
  routeStart.value = menuLocation()
  routeEnd.value = null
  route.clear()
  mode.value = 'route-end' // next map click sets the end point
  contextMenu.value = null
}

async function tryRoute() {
  if (activeId.value && routeStart.value && routeEnd.value) {
    await route.request(activeId.value, routeStart.value, routeEnd.value)
  }
}

async function submitDisaster(input: CreateDisaster) {
  const created = await withServerError(() => disasters.create(input))
  if (created) await selectDisaster(created.id)
}

async function submitHazard(input: CreateHazard) {
  if (!activeId.value) return
  const created = await withServerError(() => hazards.create(activeId.value!, input))
  if (created) {
    pendingLocation.value = null
    mode.value = null
  }
}

async function submitPoint(input: CreateCoordinationPoint) {
  if (!activeId.value) return
  const created = await withServerError(() => points.create(activeId.value!, input))
  if (created) {
    pendingLocation.value = null
    mode.value = null
  }
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

      <div v-if="notifications.messages.length" class="banners">
        <div
          v-for="(message, i) in notifications.messages"
          :key="i"
          class="banner"
          data-test="notification"
        >
          <span>{{ message }}</span>
          <button class="banner-dismiss" aria-label="Dismiss" @click="notifications.dismiss(i)">×</button>
        </div>
      </div>

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

      <div
        v-if="contextMenu"
        class="context-menu"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        data-test="map-context-menu"
      >
        <button data-test="menu-add-hazard" @click="addHazardHere">Add hazard</button>
        <button data-test="menu-add-point" @click="addPointHere">Add coordination point</button>
        <button data-test="menu-start-route" @click="startRouteHere">Start route here</button>
        <button class="menu-cancel" @click="contextMenu = null">Cancel</button>
      </div>
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

.banners { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #7f1d1d;
  color: #fee2e2;
  border: 1px solid #b91c1c;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.8rem;
}
.banner-dismiss {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #fecaca;
  font-size: 1rem;
  line-height: 1;
  padding: 0 4px;
  cursor: pointer;
}

.context-menu {
  position: absolute;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}
.context-menu button {
  border: none;
  border-radius: 0;
  text-align: left;
  padding: 10px 12px;
}
.context-menu button:hover { background: #2563eb; }
.context-menu .menu-cancel { color: #94a3b8; border-top: 1px solid #334155; }
.context-menu .menu-cancel:hover { background: #334155; }

/* Permanent disaster labels on the map. */
.leaflet-tooltip.disaster-label {
  background: rgba(15, 23, 42, 0.8);
  color: #e2e8f0;
  border: none;
  box-shadow: none;
  font-weight: 600;
  font-size: 0.8rem;
}
.leaflet-tooltip.disaster-label::before { display: none; }

@media (max-width: 720px) {
  .app { flex-direction: column; }
  .sidebar { width: 100%; height: 45vh; }
  .map-pane { height: 55vh; }
}
</style>
