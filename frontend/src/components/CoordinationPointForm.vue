<script setup lang="ts">
import { ref } from 'vue'
import type { CoordinationPointType, CreateCoordinationPoint, LatLng } from '../api/types'
import { pointMeta } from '../icons'

const props = defineProps<{ location: LatLng }>()
const emit = defineEmits<{ submit: [CreateCoordinationPoint]; cancel: [] }>()

const pointTypes: CoordinationPointType[] = ['CommandPost', 'MedicalStation', 'Shelter', 'Supply', 'Other']

const name = ref<string>('')
const type = ref<CoordinationPointType>('CommandPost')
const description = ref<string>('')

function submit() {
  if (!name.value.trim()) return
  emit('submit', {
    name: name.value.trim(),
    type: type.value,
    lat: props.location.lat,
    lng: props.location.lng,
    description: description.value.trim() || null,
  })
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <h3>Add coordination point</h3>
    <label>
      Name
      <input v-model="name" type="text" required data-test="point-name" />
    </label>
    <label>
      Type
      <select v-model="type" data-test="point-type">
        <option v-for="t in pointTypes" :key="t" :value="t">{{ pointMeta[t].emoji }} {{ pointMeta[t].label }}</option>
      </select>
    </label>
    <label>
      Description
      <input v-model="description" type="text" data-test="point-description" />
    </label>
    <p class="coords">at {{ location.lat.toFixed(5) }}, {{ location.lng.toFixed(5) }}</p>
    <div class="actions">
      <button type="submit">Save</button>
      <button type="button" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
