<script setup lang="ts">
import { ref } from 'vue'
import type { CreateHazard, HazardType, LatLng } from '../api/types'

const props = defineProps<{ location: LatLng }>()
const emit = defineEmits<{ submit: [CreateHazard]; cancel: [] }>()

const hazardTypes: HazardType[] = ['BlockedRoad', 'UnsafeRoute', 'Fire', 'DamagedBuilding', 'Other']

const type = ref<HazardType>('Fire')
const radiusMeters = ref<number>(100)
const description = ref<string>('')

function submit() {
  emit('submit', {
    type: type.value,
    lat: props.location.lat,
    lng: props.location.lng,
    radiusMeters: radiusMeters.value,
    description: description.value.trim() || null,
  })
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <h3>Record hazard</h3>
    <label>
      Type
      <select v-model="type" data-test="hazard-type">
        <option v-for="t in hazardTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>
    <label>
      Danger radius (m)
      <input v-model.number="radiusMeters" type="number" min="1" data-test="hazard-radius" />
    </label>
    <label>
      Description
      <input v-model="description" type="text" data-test="hazard-description" />
    </label>
    <p class="coords">at {{ location.lat.toFixed(5) }}, {{ location.lng.toFixed(5) }}</p>
    <div class="actions">
      <button type="submit">Save</button>
      <button type="button" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
