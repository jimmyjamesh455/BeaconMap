export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'beaconmap-theme'

function systemPrefersLight(matchMedia?: (q: string) => boolean): boolean {
  const fn = matchMedia ?? ((q: string) =>
    typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches)
  return fn('(prefers-color-scheme: light)')
}

/** Stored choice wins; otherwise follow the OS/browser setting (default dark). */
export function resolveInitialTheme(
  getItem: (key: string) => string | null = (k) => localStorage.getItem(k),
  matchMedia?: (q: string) => boolean,
): Theme {
  const stored = getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  return systemPrefersLight(matchMedia) ? 'light' : 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function persistTheme(
  theme: Theme,
  setItem: (key: string, value: string) => void = (k, v) => localStorage.setItem(k, v),
): void {
  setItem(STORAGE_KEY, theme)
}
