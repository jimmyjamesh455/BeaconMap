<script setup lang="ts">
import { computed } from 'vue'
import type { Route } from '../api/types'
import { formatRouteSummary } from '../format'

const props = defineProps<{
  route: Route | null
  error: string | null
  hasStart: boolean
  hasEnd: boolean
  activeMode: string | null
}>()

const emit = defineEmits<{ setStart: []; setEnd: []; clear: [] }>()

const summary = computed(() =>
  props.route ? formatRouteSummary(props.route.distanceMeters, props.route.durationSeconds) : null)
</script>

<template>
  <div class="route-panel">
    <h3>Safe route</h3>
    <div class="actions">
      <button :class="{ active: activeMode === 'route-start' }" @click="emit('setStart')">
        {{ hasStart ? 'Start set ✓' : 'Set start' }}
      </button>
      <button :class="{ active: activeMode === 'route-end' }" @click="emit('setEnd')">
        {{ hasEnd ? 'End set ✓' : 'Set end' }}
      </button>
      <button @click="emit('clear')">Clear</button>
    </div>
    <p v-if="route" class="route-summary" data-test="route-summary">
      {{ summary }} — avoids all recorded hazards
    </p>
    <p v-if="error" class="error" data-test="route-error">{{ error }}</p>
    <p v-if="!route && !error" class="hint">
      Set a start and end point to compute a route that avoids every hazard.
    </p>
  </div>
</template>
