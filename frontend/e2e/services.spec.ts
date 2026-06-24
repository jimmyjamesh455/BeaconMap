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

test('loads and shows emergency services on demand', async ({ page }) => {
  await page.route('**/api/disasters', (route) => route.fulfill({ json: [disaster] }))
  await page.route('**/api/disasters/*/hazards', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/disasters/*/coordination-points', (route) => route.fulfill({ json: [] }))
  await page.route('**/hubs/**', (route) => route.abort())
  // Stub the Overpass response.
  await page.route('**/overpass-api.de/**', (route) =>
    route.fulfill({
      json: {
        elements: [
          { type: 'node', id: 1, lat: 51.51, lon: -0.12, tags: { amenity: 'hospital', name: 'St Thomas Hospital' } },
        ],
      },
    }))

  await page.goto('/')
  await page.locator('[data-test=disaster-select]').selectOption(disaster.id)

  // Nothing until requested.
  await expect(page.locator('.service-div-icon')).toHaveCount(0)

  await page.locator('[data-test=toggle-services]').click()

  await expect(page.locator('.service-div-icon')).toHaveCount(1)
  // The name shows on hover.
  await page.locator('.service-div-icon').hover()
  await expect(page.getByText('St Thomas Hospital')).toBeVisible()

  // Toggling again hides them.
  await page.locator('[data-test=toggle-services]').click()
  await expect(page.locator('.service-div-icon')).toHaveCount(0)
})
