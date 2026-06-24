import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationsStore = defineStore('notifications', () => {
  const messages = ref<string[]>([])

  function notify(message: string): void {
    if (!messages.value.includes(message)) {
      messages.value.push(message)
    }
  }

  function dismiss(index: number): void {
    messages.value.splice(index, 1)
  }

  function clear(): void {
    messages.value = []
  }

  return { messages, notify, dismiss, clear }
})
