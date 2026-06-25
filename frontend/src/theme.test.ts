import { describe, it, expect } from 'vitest'
import { resolveInitialTheme } from './theme'

describe('resolveInitialTheme', () => {
  it('honours a stored choice over the system setting', () => {
    expect(resolveInitialTheme(() => 'light', () => false)).toBe('light')
    expect(resolveInitialTheme(() => 'dark', () => true)).toBe('dark')
  })

  it('follows the system setting when nothing is stored', () => {
    expect(resolveInitialTheme(() => null, () => true)).toBe('light')
    expect(resolveInitialTheme(() => null, () => false)).toBe('dark')
  })

  it('ignores an invalid stored value and falls back to system', () => {
    expect(resolveInitialTheme(() => 'purple', () => true)).toBe('light')
  })
})
