import { test, expect } from '@playwright/test'

// The API is stubbed so this runs without the backend or an OpenRouteService key.
const disaster = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'E2E Quake',
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
  durationSeconds: 720, // 12 min
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/disasters', async (route) => {
    await route.fulfill({ json: route.request().method() === 'GET' ? [disaster] : disaster })
  })
  await page.route('**/api/disasters/*/hazards', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/disasters/*/coordination-points', (route) => route.fulfill({ json: [] }))
  await page.route('**/api/disasters/*/routes', (route) => route.fulfill({ json: routeData }))
  // Live updates are best-effort and irrelevant here.
  await page.route('**/hubs/**', (route) => route.abort())
})

test('computes a route, draws it, and shows distance + drive time on hover', async ({ page }) => {
  await page.goto('/')

  // Select the (stubbed) disaster to load its map.
  await page.locator('[data-test=disaster-select]').selectOption(disaster.id)

  // Set start and end by choosing the mode then clicking the map.
  const map = page.locator('.leaflet-container')
  await page.getByRole('button', { name: 'Set start' }).click()
  await map.click({ position: { x: 250, y: 200 } })
  // Setting the start auto-advances to setting the end, so the next click is the end point.
  await map.click({ position: { x: 360, y: 260 } })

  // The route polyline is drawn.
  const routeLine = page.locator('path.route-line')
  await expect(routeLine).toBeVisible()

  // Hover a point that lies on the stroke (an SVG path only receives pointer events on the
  // painted line, not its bounding-box centre), so the sticky tooltip opens.
  const point = await page.evaluate(() => {
    const path = document.querySelector('path.route-line') as SVGPathElement
    const mid = path.getPointAtLength(path.getTotalLength() / 2)
    const screen = mid.matrixTransform(path.ownerSVGElement!.getScreenCTM()!)
    return { x: screen.x, y: screen.y }
  })
  await page.mouse.move(point.x, point.y)
  await page.mouse.move(point.x + 1, point.y + 1)

  const tooltip = page.locator('.leaflet-tooltip.route-tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText('km')
  await expect(tooltip).toContainText('min')

  // And the sidebar summary agrees.
  await expect(page.locator('[data-test=route-summary]')).toContainText('7.4 km · 12 min')
})
