import { test, expect } from '@playwright/test'

// A hazard dropped on top of an existing route should trigger a fresh route request so the
// path bends around the new danger zone. The API is stubbed (no backend / ORS key needed).
const disaster = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Recompute Quake',
  type: 'Earthquake',
  area: [
    { lat: 51.5, lng: -0.13 },
    { lat: 51.5, lng: -0.11 },
    { lat: 51.52, lng: -0.12 },
  ],
  description: null,
  createdAtUtc: '2026-01-01T00:00:00Z',
}

const routeData = {
  coordinates: [
    { lat: 51.505, lng: -0.128 },
    { lat: 51.51, lng: -0.12 },
    { lat: 51.515, lng: -0.114 },
  ],
  distanceMeters: 7400,
  durationSeconds: 720,
}

test('placing a hazard on the route recomputes it', async ({ page }) => {
  let routeCalls = 0
  const createdHazard = {
    id: 'h1', disasterId: disaster.id, type: 'Fire', lat: 51.508, lng: -0.121,
    radiusMeters: 100, description: null, createdAtUtc: '2026-01-01T00:00:00Z',
  }

  await page.route('**/api/disasters', (r) => r.fulfill({ json: [disaster] }))
  await page.route('**/api/disasters/*/hazards', (r) =>
    r.fulfill({ json: r.request().method() === 'GET' ? [] : createdHazard }))
  await page.route('**/api/disasters/*/coordination-points', (r) => r.fulfill({ json: [] }))
  await page.route('**/api/disasters/*/routes', (r) => {
    routeCalls += 1
    return r.fulfill({ json: routeData })
  })
  await page.route('**/hubs/**', (r) => r.abort())

  await page.goto('/')
  await page.getByText(disaster.name).click()

  // The selected disaster's label sits at the polygon centre and is click-through, so its
  // screen position is a reliable point that lands inside the area.
  const box = await page.locator('.disaster-label.selected').boundingBox()
  const cx = box!.x + box!.width / 2
  const cy = box!.y + box!.height / 2

  // Draw a route: Set start → click → (auto-advances to end) → click.
  await page.getByRole('button', { name: 'Set start' }).click()
  await page.mouse.click(cx, cy)
  await page.mouse.click(cx + 4, cy + 4)

  await expect(page.locator('path.route-line')).toBeVisible()
  await expect.poll(() => routeCalls).toBe(1)

  // Drop a hazard inside the area via the context menu.
  await page.mouse.click(cx, cy)
  await page.locator('[data-test=menu-add-hazard]').click()
  await page.getByRole('button', { name: 'Save' }).click()

  // The hazard set changed while a route was displayed → it is recomputed.
  await expect.poll(() => routeCalls).toBe(2)
})
