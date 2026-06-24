import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationsStore } from './notifications'

beforeEach(() => setActivePinia(createPinia()))

describe('notifications store', () => {
  it('adds a message on notify', () => {
    const store = useNotificationsStore()
    store.notify('Server unreachable')
    expect(store.messages).toEqual(['Server unreachable'])
  })

  it('does not add duplicate messages', () => {
    const store = useNotificationsStore()
    store.notify('Server unreachable')
    store.notify('Server unreachable')
    expect(store.messages).toHaveLength(1)
  })

  it('removes a message on dismiss', () => {
    const store = useNotificationsStore()
    store.notify('A')
    store.notify('B')
    store.dismiss(0)
    expect(store.messages).toEqual(['B'])
  })
})
