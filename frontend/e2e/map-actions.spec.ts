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

function stubScopes(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('**/api/disasters/*/hazards', (r) => r.fulfill({ json: [] })),
    page.route('**/api/disasters/*/coordination-points', (r) => r.fulfill({ json: [] })),
    page.route('**/hubs/**', (r) => r.abort()),
  ])
}

test('delete a hazard from the map', async ({ page }) => {
  const hazard = {
    id: 'h1', disasterId: disaster.id, type: 'Fire', lat: 51.51, lng: -0.12,
    radiusMeters: 100, description: null, createdAtUtc: '2026-01-01T00:00:00Z',
  }
  await page.route('**/api/disasters', (r) => r.fulfill({ json: [disaster] }))
  await page.route('**/api/disasters/*/hazards/*', (r) =>
    r.request().method() === 'DELETE' ? r.fulfill({ status: 204, body: '' }) : r.continue())
  await page.route('**/api/disasters/*/hazards', (r) => r.fulfill({ json: [hazard] }))
  await page.route('**/api/disasters/*/coordination-points', (r) => r.fulfill({ json: [] }))
  await page.route('**/hubs/**', (r) => r.abort())

  await page.goto('/')
  await page.getByText(disaster.name).click()
  await expect(page.locator('.hazard-div-icon')).toHaveCount(1)

  await page.locator('.hazard-div-icon').click()
  await expect(page.locator('[data-test=marker-menu]')).toBeVisible()
  await page.locator('[data-test=marker-delete]').click()

  await expect(page.locator('.hazard-div-icon')).toHaveCount(0)
})

test('no disaster dropdown until one is selected; clicking a label selects it', async ({ page }) => {
  await page.route('**/api/disasters', (r) => r.fulfill({ json: [disaster] }))
  await stubScopes(page)

  await page.goto('/')
  // Nothing selected → no dropdown.
  await expect(page.locator('[data-test=disaster-select]')).toHaveCount(0)

  await page.getByText(disaster.name).click()

  // Selected → the dropdown appears showing that disaster.
  await expect(page.locator('[data-test=disaster-select]')).toHaveValue(disaster.id)
})

test('clicking empty space outside the disaster deselects it', async ({ page }) => {
  await page.route('**/api/disasters', (r) => r.fulfill({ json: [disaster] }))
  await stubScopes(page)

  await page.goto('/')
  await page.getByText(disaster.name).click()
  await expect(page.locator('[data-test=disaster-select]')).toHaveValue(disaster.id)

  // The area is an upward triangle; the top-right corner is outside it (and clear of the
  // zoom control top-left) → deselects.
  await page.locator('.leaflet-container').click({ position: { x: 880, y: 25 } })
  await expect(page.locator('[data-test=disaster-select]')).toHaveCount(0)
})

test('can hide and reveal the panel', async ({ page }) => {
  await page.route('**/api/disasters', (r) => r.fulfill({ json: [] }))
  await page.route('**/hubs/**', (r) => r.abort())

  await page.goto('/')
  await expect(page.locator('.sidebar')).toBeVisible()

  await page.locator('[data-test=panel-toggle]').click()
  await expect(page.locator('.sidebar')).toBeHidden()

  await page.locator('[data-test=panel-toggle]').click()
  await expect(page.locator('.sidebar')).toBeVisible()
})
