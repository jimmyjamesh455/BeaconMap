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
  await page.getByText(disaster.name).click()

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

test('asks the user to zoom in when the view is too wide', async ({ page }) => {
  // A large disaster area → fit zooms out below the services threshold.
  const wide = {
    ...disaster,
    area: [{ lat: 50, lng: -5 }, { lat: 55, lng: -5 }, { lat: 55, lng: 2 }, { lat: 50, lng: 2 }],
  }
  await page.route('**/api/disasters', (route) => route.fulfill({ json: [wide] }))
  await page.route('**/api/disasters/*/hazards', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/disasters/*/coordination-points', (route) => route.fulfill({ json: [] }))
  await page.route('**/hubs/**', (route) => route.abort())

  await page.goto('/')
  await page.getByText(wide.name).click()
  await page.locator('[data-test=toggle-services]').click()

  await expect(page.locator('[data-test=notification]')).toContainText('Zoom in')
  await expect(page.locator('.service-div-icon')).toHaveCount(0)
})
