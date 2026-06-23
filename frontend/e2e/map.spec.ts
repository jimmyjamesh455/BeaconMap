import { test, expect } from '@playwright/test'

test('app shell renders with the BeaconMap heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BeaconMap' })).toBeVisible()
})

test('map renders: container is sized and Leaflet tiles are created', async ({ page }) => {
  await page.goto('/')

  const map = page.locator('.leaflet-container')
  await expect(map).toBeVisible()

  // The blank-map bug was a zero-sized / un-invalidated container. Assert real dimensions.
  const box = await map.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(300)
  expect(box!.height).toBeGreaterThan(300)

  // Leaflet only builds tile <img> elements once the container has a size. Their presence in
  // the DOM (not their successful download) is what proves the map initialised correctly, so
  // this stays robust even if tile servers are unreachable.
  await expect(page.locator('.leaflet-tile').first()).toBeAttached({ timeout: 10_000 })
})
