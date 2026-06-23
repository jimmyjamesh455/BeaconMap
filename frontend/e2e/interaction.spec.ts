import { test, expect } from '@playwright/test'

const disaster = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Kobe Quake',
  type: 'Earthquake',
  area: [
    { lat: 51.5, lng: -0.13 },
    { lat: 51.5, lng: -0.11 },
    { lat: 51.52, lng: -0.12 },
  ],
  description: null,
  createdAtUtc: '2026-01-01T00:00:00Z',
}

const secondDisaster = {
  ...disaster,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Valencia Flood',
  type: 'Flood',
  area: [
    { lat: 39.46, lng: -0.39 },
    { lat: 39.46, lng: -0.33 },
    { lat: 39.5, lng: -0.36 },
  ],
}

test('shows multiple disasters (outline + label) without selecting one', async ({ page }) => {
  await page.route('**/api/disasters', (route) => route.fulfill({ json: [disaster, secondDisaster] }))
  await page.route('**/hubs/**', (route) => route.abort())

  await page.goto('/')

  const labels = page.locator('.leaflet-tooltip.disaster-label')
  await expect(labels).toHaveCount(2)
  await expect(page.getByText('Kobe Quake — Earthquake')).toBeVisible()
  await expect(page.getByText('Valencia Flood — Flood')).toBeVisible()
})

test('left-click offers an add menu, and adding a hazard drops an icon on the map', async ({ page }) => {
  const createdHazard = {
    id: 'h1',
    disasterId: disaster.id,
    type: 'Fire',
    lat: 51.51,
    lng: -0.12,
    radiusMeters: 100,
    description: null,
    createdAtUtc: '2026-01-01T00:00:00Z',
  }
  await page.route('**/api/disasters', (route) => route.fulfill({ json: [disaster] }))
  await page.route('**/api/disasters/*/hazards', (route) =>
    route.fulfill({ json: route.request().method() === 'GET' ? [] : createdHazard }))
  await page.route('**/api/disasters/*/coordination-points', (route) => route.fulfill({ json: [] }))
  await page.route('**/hubs/**', (route) => route.abort())

  await page.goto('/')
  await page.locator('[data-test=disaster-select]').selectOption(disaster.id)

  // Left-click the map → context menu with add options.
  await page.locator('.leaflet-container').click({ position: { x: 300, y: 220 } })
  await expect(page.locator('[data-test=map-context-menu]')).toBeVisible()

  // Choose "Add hazard" → the hazard form opens; save it.
  await page.locator('[data-test=menu-add-hazard]').click()
  await expect(page.locator('[data-test=hazard-type]')).toBeVisible()
  await page.getByRole('button', { name: 'Save' }).click()

  // The hazard icon marker appears on the map.
  await expect(page.locator('.hazard-div-icon')).toHaveCount(1)
})
