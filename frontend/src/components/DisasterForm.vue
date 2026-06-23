<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CreateDisaster, DisasterType, LatLng } from '../api/types'

const props = defineProps<{ area: LatLng[] }>()
const emit = defineEmits<{ submit: [CreateDisaster]; cancel: [] }>()

const disasterTypes: DisasterType[] = [
  'Earthquake', 'Flood', 'Wildfire', 'Storm', 'Industrial', 'Eruption', 'Tsunami', 'Other',
]

const name = ref<string>('')
const type = ref<DisasterType>('Earthquake')
const description = ref<string>('')

const canSubmit = computed(() => name.value.trim().length > 0 && props.area.length >= 3)

function submit() {
  if (!canSubmit.value) return
  emit('submit', {
    name: name.value.trim(),
    type: type.value,
    area: props.area,
    description: description.value.trim() || null,
  })
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <h3>New disaster</h3>
    <label>
      Name
      <input v-model="name" type="text" required data-test="disaster-name" />
    </label>
    <label>
      Type
      <select v-model="type" data-test="disaster-type">
        <option v-for="t in disasterTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>
    <label>
      Description
      <input v-model="description" type="text" data-test="disaster-description" />
    </label>
    <p class="hint">
      Click the map to outline the affected area.
      <strong>{{ area.length }}</strong> point(s) added (need at least 3).
    </p>
    <div class="actions">
      <button type="submit" :disabled="!canSubmit">Create</button>
      <button type="button" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
