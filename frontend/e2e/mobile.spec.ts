import { test, expect } from '@playwright/test'

test('on a phone the controls collapse and the map dominates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.route('**/api/disasters', (route) => route.fulfill({ json: [] }))
  await page.route('**/hubs/**', (route) => route.abort())

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'BeaconMap' })).toBeVisible()
  // The Controls toggle is offered, and the controls are collapsed by default.
  await expect(page.locator('[data-test=controls-toggle]')).toBeVisible()
  await expect(page.locator('[data-test=controls]')).toBeHidden()

  // The map takes more of the screen than the sidebar.
  const map = await page.locator('.map-pane').boundingBox()
  const sidebar = await page.locator('.sidebar').boundingBox()
  expect(map!.height).toBeGreaterThan(sidebar!.height)

  // Tapping the toggle reveals the controls.
  await page.locator('[data-test=controls-toggle]').click()
  await expect(page.locator('[data-test=controls]')).toBeVisible()
})
