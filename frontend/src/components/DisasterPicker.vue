<script setup lang="ts">
import type { Disaster } from '../api/types'

defineProps<{ disasters: Disaster[]; activeId: string | null }>()
const emit = defineEmits<{ select: [string]; create: [] }>()

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value) emit('select', value)
}
</script>

<template>
  <div class="picker">
    <label>
      Disaster
      <select :value="activeId ?? ''" data-test="disaster-select" @change="onChange">
        <option value="" disabled>Select a disaster…</option>
        <option v-for="d in disasters" :key="d.id" :value="d.id">
          {{ d.name }} ({{ d.type }})
        </option>
      </select>
    </label>
    <button data-test="new-disaster" @click="emit('create')">+ New</button>
  </div>
</template>
