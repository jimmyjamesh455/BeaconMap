import { test, expect } from '@playwright/test'

test('shows a friendly banner (not a crash) when the backend is unreachable', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // Simulate the backend being down. Scope to the backend origin only — a broad "**/api/**"
  // would also abort the app's own Vite modules under /src/api/ and stop it booting.
  await page.route('http://localhost:5180/**', (route) => route.abort())

  await page.goto('/')

  // The app shell still renders, and the map still loads.
  await expect(page.getByRole('heading', { name: 'BeaconMap' })).toBeVisible()
  await expect(page.locator('.leaflet-container')).toBeVisible()

  // A clear, actionable banner is shown instead of an uncaught error.
  const banner = page.locator('[data-test=notification]')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('backend')

  // The failed request did not surface as an uncaught error.
  expect(pageErrors).toEqual([])
})
