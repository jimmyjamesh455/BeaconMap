import { test, expect } from '@playwright/test'

test('shows city labels at world zoom and toggles the theme', async ({ page }) => {
  await page.route('**/api/disasters', (route) => route.fulfill({ json: [] }))
  await page.route('**/hubs/**', (route) => route.abort())

  await page.goto('/')

  // Curated city labels orient the user at the default world zoom.
  await expect(page.locator('.leaflet-tooltip.city-label', { hasText: 'London' })).toBeVisible()

  // Theme toggle flips the document theme and remembers it.
  const html = page.locator('html')
  const before = await html.getAttribute('data-theme')
  await page.locator('[data-test=theme-toggle]').click()
  const after = await html.getAttribute('data-theme')

  expect(after).not.toBe(before)
  expect(['dark', 'light']).toContain(after)
})
