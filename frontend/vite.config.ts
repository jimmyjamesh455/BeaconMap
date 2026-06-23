import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Unit tests only; Playwright owns the e2e/ specs.
    include: ['src/**/*.test.ts'],
  },
})
