import { describe, it, expect } from 'vitest'
import { formatRouteSummary } from './format'

describe('formatRouteSummary', () => {
  it('formats distance in km and time in minutes', () => {
    expect(formatRouteSummary(12_340, 18 * 60)).toBe('12.3 km · 18 min')
  })

  it('rounds minutes to the nearest whole minute', () => {
    expect(formatRouteSummary(1000, 100)).toBe('1.0 km · 2 min')
  })

  it('uses hours and minutes for durations of an hour or more', () => {
    expect(formatRouteSummary(90_000, 3900)).toBe('90.0 km · 1 h 5 min')
  })

  it('shows whole hours without a trailing 0 min', () => {
    expect(formatRouteSummary(120_000, 7200)).toBe('120.0 km · 2 h')
  })
})
