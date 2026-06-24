<script setup lang="ts">
import type { Disaster } from '../api/types'
import { disasterMeta } from '../icons'

defineProps<{ disasters: Disaster[]; activeId: string | null }>()
const emit = defineEmits<{ select: [string]; create: []; delete: [] }>()

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
          {{ disasterMeta[d.type].emoji }} {{ d.name }} ({{ disasterMeta[d.type].label }})
        </option>
      </select>
    </label>
    <button data-test="new-disaster" @click="emit('create')">+ New</button>
    <button v-if="activeId" class="danger" data-test="delete-disaster" @click="emit('delete')">Delete</button>
  </div>
</template>
