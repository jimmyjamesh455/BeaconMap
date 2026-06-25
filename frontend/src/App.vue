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
import { useEmergencyServicesStore } from './stores/emergencyServices'
import type { Bounds } from './api/overpass'
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
const services = useEmergencyServicesStore()
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
// Collapsed by default on phones so the map gets the screen; open on larger screens.
const controlsOpen = ref(typeof window === 'undefined' || window.innerWidth > 720)

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
  services.clear()
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

async function deleteActiveDisaster() {
  if (!activeId.value) return
  const name = active.value?.name ?? 'this disaster'
  if (!window.confirm(`Delete "${name}" and all its hazards and coordination points?`)) return
  try {
    await disasters.remove(activeId.value)
    hazards.clear()
    points.clear()
    route.clear()
    services.clear()
    resetTransient()
  } catch {
    notifications.notify(SERVER_DOWN)
  }
}

const modeHintText = computed(() => {
  switch (mode.value) {
    case 'new-disaster': return 'Click the map to outline the disaster area.'
    case 'hazard': return 'Click the map to place a hazard.'
    case 'point': return 'Click the map to place a coordination point.'
    case 'route-start': return 'Click the map or a marker to set the route start.'
    case 'route-end': return 'Click the map or a marker to set the route end.'
    default: return ''
  }
})

function areaBounds(area: LatLng[]): Bounds {
  const lats = area.map((p) => p.lat)
  const lngs = area.map((p) => p.lng)
  return { south: Math.min(...lats), north: Math.max(...lats), west: Math.min(...lngs), east: Math.max(...lngs) }
}

async function toggleServices() {
  if (!active.value) return
  try {
    await services.toggle(areaBounds(active.value.area))
  } catch {
    notifications.notify('Could not load emergency services from OpenStreetMap. Please try again.')
  }
}

// Routes can start/end at a coordination point or emergency-service marker (exact location).
function onMarkerClick(point: LatLng) {
  if (mode.value === 'route-start') {
    routeStart.value = point
    mode.value = 'route-end'
  } else if (mode.value === 'route-end') {
    routeEnd.value = point
    mode.value = null
    void tryRoute()
  }
}
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          <img class="emblem" src="/beaconmap-emblem.svg" alt="" aria-hidden="true" />
          <h1>Beacon<span class="accent">Map</span></h1>
        </div>
        <button
          class="controls-toggle"
          data-test="controls-toggle"
          @click="controlsOpen = !controlsOpen"
        >
          {{ controlsOpen ? 'Hide ▲' : 'Controls ▾' }}
        </button>
      </div>

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

      <div v-show="controlsOpen" class="sidebar-body" data-test="controls">
        <DisasterPicker
          :disasters="disasters.disasters"
          :active-id="activeId"
          @select="selectDisaster"
          @create="startNewDisaster"
          @delete="deleteActiveDisaster"
        />

        <DisasterForm
          v-if="mode === 'new-disaster'"
          :area="draftArea"
          @submit="submitDisaster"
          @cancel="resetTransient"
        />

        <template v-if="hasActive && mode !== 'new-disaster'">
          <div class="toolbar">
            <button :class="{ active: mode === 'hazard' }" @click="setMode('hazard')">🚧 Add hazard</button>
            <button :class="{ active: mode === 'point' }" @click="setMode('point')">🚩 Add point</button>
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

          <button
            class="services-btn"
            data-test="toggle-services"
            :disabled="services.loading"
            @click="toggleServices"
          >
            {{ services.loading ? 'Loading…' : services.visible ? 'Hide emergency services' : '🚑 Show emergency services' }}
          </button>

          <p class="counts">{{ hazards.hazards.length }} hazards · {{ points.points.length }} points</p>
        </template>

        <p v-if="modeHintText" class="mode-hint">{{ modeHintText }}</p>
      </div>
    </aside>

    <main class="map-pane">
      <MapView :draft-area="draftArea" @map-click="onMapClick" @marker-click="onMarkerClick" />

      <div
        v-if="contextMenu"
        class="context-menu"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        data-test="map-context-menu"
      >
        <button data-test="menu-add-hazard" @click="addHazardHere">🚧 Add hazard</button>
        <button data-test="menu-add-point" @click="addPointHere">🚩 Add coordination point</button>
        <button data-test="menu-start-route" @click="startRouteHere">🟢 Start route here</button>
        <button class="menu-cancel" @click="contextMenu = null">Cancel</button>
      </div>
    </main>
  </div>
</template>

<style>
:root {
  --ink: #07151F;        /* deepest ground / map canvas */
  --ground: #0A1C2A;     /* page */
  --steel: #0F2738;      /* panel / instrument face */
  --steel2: #143049;     /* raised */
  --line: #1E3D54;       /* hairline */
  --line-soft: #163047;
  --mute: #6E8799;       /* data / secondary */
  --text: #D8E4EE;       /* primary on dark */
  --dim: #9CB1C2;
  --beacon: #F6A623;     /* the signal — primary action, used sparingly */
  --beacon-hi: #FFCB5E;
  --hazard: #E5484D;     /* hazards / danger radii */
  --safe: #16B786;       /* safe routes */
  --coord: #1FA9D6;      /* coordination, selection, focus, links */

  --display: 'Space Grotesk', system-ui, sans-serif;
  --body: 'Inter', system-ui, -apple-system, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
}

* { box-sizing: border-box; }
body { margin: 0; font-family: var(--body); }
.app { display: flex; height: 100vh; }
.sidebar {
  width: 320px; padding: 16px; overflow-y: auto;
  background: var(--steel); color: var(--text); flex-shrink: 0;
  border-right: 1px solid var(--line);
}
.sidebar-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
.brand { display: flex; align-items: center; gap: 10px; }
.emblem { width: 26px; height: 30px; display: block; }
.sidebar h1 { font-family: var(--display); font-weight: 600; font-size: 1.25rem; letter-spacing: -0.02em; margin: 0; }
.accent { color: var(--beacon); }
.controls-toggle { display: none; }

.map-pane { flex: 1; position: relative; }
.map { position: absolute; inset: 0; background: var(--ink); }
.picker { display: flex; gap: 8px; align-items: end; margin-bottom: 12px; }
.picker select { width: 100%; }
.toolbar { display: flex; gap: 8px; margin: 12px 0; }

button {
  background: var(--steel2); color: var(--text); border: 1px solid var(--line);
  padding: 6px 10px; border-radius: 6px; cursor: pointer;
  font-family: var(--body); font-size: 0.85rem;
}
button:hover { border-color: var(--coord); }
button.active { background: var(--beacon); border-color: var(--beacon); color: var(--ink); font-weight: 600; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
button.danger { background: transparent; border-color: var(--hazard); color: #fca5a5; }
button.danger:hover { background: var(--hazard); color: #fff; }
/* Primary action (form submit) carries the beacon. */
.actions button[type="submit"] { background: var(--beacon); border-color: var(--beacon); color: var(--ink); font-weight: 600; }
.actions button[type="submit"]:hover { background: var(--beacon-hi); border-color: var(--beacon-hi); }
.actions button[type="submit"]:disabled { background: var(--steel2); color: var(--text); border-color: var(--line); }

.form, .route-panel { background: var(--steel2); border: 1px solid var(--line); padding: 12px; border-radius: 8px; margin: 12px 0; }
.form h3, .route-panel h3 { font-family: var(--display); font-weight: 600; margin: 0 0 8px; font-size: 1rem; }
label { display: block; font-size: 0.85rem; margin-bottom: 8px; color: var(--dim); }
input, select {
  width: 100%; padding: 6px; margin-top: 2px; border-radius: 4px;
  border: 1px solid var(--line); background: var(--ink); color: var(--text);
}
input:focus, select:focus { outline: none; border-color: var(--coord); }
.actions { display: flex; gap: 8px; margin-top: 8px; }

/* Data readouts speak in mono — the instrument's voice. */
.coords, .counts, .mode-hint, .route-summary { font-family: var(--mono); }
.coords, .counts, .mode-hint { font-size: 0.76rem; color: var(--mute); letter-spacing: 0.02em; }
.hint { font-size: 0.8rem; color: var(--dim); }
.route-summary { color: var(--safe); font-size: 0.8rem; }
.error { color: var(--hazard); font-size: 0.85rem; }

.banners { margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
.banner {
  display: flex; align-items: flex-start; gap: 8px;
  background: rgba(229, 72, 77, 0.14); color: #fecdd0;
  border: 1px solid var(--hazard); border-radius: 6px;
  padding: 8px 10px; font-size: 0.8rem;
}
.banner-dismiss {
  margin-left: auto; background: transparent; border: none; color: #fca5a5;
  font-size: 1rem; line-height: 1; padding: 0 4px; cursor: pointer;
}

.context-menu {
  position: absolute; z-index: 1000; display: flex; flex-direction: column; min-width: 190px;
  background: var(--steel); border: 1px solid var(--line); border-radius: 8px;
  box-shadow: 0 8px 24px rgba(4, 14, 22, 0.55); overflow: hidden;
}
.context-menu button { border: none; border-radius: 0; text-align: left; padding: 10px 12px; }
.context-menu button:hover { background: var(--steel2); border-color: var(--steel2); }
.context-menu .menu-cancel { color: var(--mute); border-top: 1px solid var(--line); }
.context-menu .menu-cancel:hover { background: var(--steel2); }

.services-btn { width: 100%; margin-bottom: 8px; }

/* Leaflet surfaces themed to the instrument. */
.leaflet-container { background: var(--ink); font-family: var(--body); }
.leaflet-control-attribution { background: rgba(7, 21, 31, 0.7) !important; color: var(--mute) !important; }
.leaflet-control-attribution a { color: var(--dim) !important; }
.leaflet-popup-content-wrapper, .leaflet-popup-tip { background: var(--steel); color: var(--text); }
.leaflet-popup-content { font-family: var(--body); }
.leaflet-tooltip {
  background: var(--steel); color: var(--text);
  border: 1px solid var(--line); box-shadow: 0 2px 8px rgba(4, 14, 22, 0.5);
}
.leaflet-tooltip.route-tooltip { font-family: var(--mono); color: var(--safe); font-weight: 500; }
.leaflet-tooltip.disaster-label {
  background: rgba(7, 21, 31, 0.82); color: var(--text);
  border: 1px solid var(--line); box-shadow: none; font-weight: 600; font-size: 0.8rem;
}
.leaflet-tooltip.disaster-label::before { display: none; }

/* Map icon "chips": fixed on-screen size at every zoom; border ties each to the legend. */
.leaflet-marker-icon.map-pin-icon { background: transparent; border: none; }
.map-pin {
  width: 30px; height: 30px; border-radius: 50%;
  background: #fff; border: 2px solid var(--steel);
  box-shadow: 0 1px 5px rgba(4, 14, 22, 0.6);
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; line-height: 1;
}
.hazard-div-icon .map-pin { border-color: var(--hazard); }
.point-div-icon .map-pin { border-color: var(--coord); }
.service-div-icon .map-pin { border-color: var(--beacon); }

@media (max-width: 720px) {
  /* Phone: the map dominates; controls collapse to a compact, scrollable panel. */
  .app { flex-direction: column; }
  .sidebar { width: 100%; max-height: 60vh; flex-shrink: 0; padding: 10px 12px; border-right: none; border-bottom: 1px solid var(--line); }
  .sidebar-body { max-height: 48vh; overflow-y: auto; }
  .controls-toggle { display: inline-block; }
  .map-pane { flex: 1; }
}
</style>
