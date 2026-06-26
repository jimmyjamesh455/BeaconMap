import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // Emit the SPA directly into the backend's static web root so the
    // .NET app is the single deployable unit (see .context/DEPLOYMENT_PIPELINE.md).
    outDir: '../backend/src/BeaconMap.Api/wwwroot',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // Unit tests only; Playwright owns the e2e/ specs.
    include: ['src/**/*.test.ts'],
  },
})
