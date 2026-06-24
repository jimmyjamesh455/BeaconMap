import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HazardForm from './HazardForm.vue'
import MapView from './MapView.vue'
import type { MapAdapter, MapClick } from '../map/MapAdapter'
import type { Hazard, LatLng } from '../api/types'
import { useHazardsStore } from '../stores/hazards'

function hazard(id: string): Hazard {
  return { id, disasterId: 'd1', type: 'Fire', lat: 1, lng: 2, radiusMeters: 100, description: null, createdAtUtc: '' }
}

type FakeAdapter = MapAdapter & {
  clickHandler: ((c: MapClick) => void) | null
  markerClickHandler: ((p: LatLng) => void) | null
}

function fakeAdapter(): FakeAdapter {
  const fake: FakeAdapter = {
    clickHandler: null,
    markerClickHandler: null,
    onClick(handler: (c: MapClick) => void) { fake.clickHandler = handler },
    onMarkerClick(handler: (p: LatLng) => void) { fake.markerClickHandler = handler },
    fitTo: vi.fn(),
    drawDisasters: vi.fn(),
    drawDraftArea: vi.fn(),
    drawHazards: vi.fn(),
    drawCoordinationPoints: vi.fn(),
    drawEmergencyServices: vi.fn(),
    drawRoute: vi.fn(),
    destroy: vi.fn(),
  }
  return fake
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('HazardForm', () => {
  it('emits a CreateHazard payload from the entered values and clicked location', async () => {
    const wrapper = mount(HazardForm, { props: { location: { lat: 51.5, lng: -0.12 } } })

    await wrapper.find('[data-test=hazard-type]').setValue('BlockedRoad')
    await wrapper.find('[data-test=hazard-radius]').setValue(300)
    await wrapper.find('[data-test=hazard-description]').setValue('bridge out')
    await wrapper.find('form').trigger('submit')

    const payload = wrapper.emitted('submit')?.[0][0]
    expect(payload).toMatchObject({
      type: 'BlockedRoad',
      radiusMeters: 300,
      lat: 51.5,
      lng: -0.12,
      description: 'bridge out',
    })
  })
})

describe('MapView', () => {
  it('draws hazards on the adapter when the hazards store changes', async () => {
    const fake = fakeAdapter()
    mount(MapView, { props: { adapterFactory: () => fake } })
    const hazards = useHazardsStore()

    hazards.hazards = [hazard('h1')]
    await nextTick()

    const drawHazards = fake.drawHazards as unknown as ReturnType<typeof vi.fn>
    expect(drawHazards).toHaveBeenCalled()
    const lastCall = drawHazards.mock.calls.at(-1)![0] as Hazard[]
    expect(lastCall.map((h) => h.id)).toContain('h1')
  })

  it('emits map-click when the adapter reports a click', async () => {
    const fake = fakeAdapter()
    const wrapper = mount(MapView, { props: { adapterFactory: () => fake } })

    fake.clickHandler!({ lat: 10, lng: 20, x: 100, y: 200 })

    expect(wrapper.emitted('map-click')?.[0][0]).toEqual({ lat: 10, lng: 20, x: 100, y: 200 })
  })

  it('emits marker-click when the adapter reports a marker click', async () => {
    const fake = fakeAdapter()
    const wrapper = mount(MapView, { props: { adapterFactory: () => fake } })

    fake.markerClickHandler!({ lat: 51.5, lng: -0.12 })

    expect(wrapper.emitted('marker-click')?.[0][0]).toEqual({ lat: 51.5, lng: -0.12 })
  })
})
