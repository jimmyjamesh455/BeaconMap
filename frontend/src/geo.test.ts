import { describe, it, expect } from 'vitest'
import { pointInPolygon } from './geo'

// A square from (lat 0..2, lng 0..2).
const square = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 2 },
  { lat: 2, lng: 2 },
  { lat: 2, lng: 0 },
]

describe('pointInPolygon', () => {
  it('is true for a point inside the ring', () => {
    expect(pointInPolygon({ lat: 1, lng: 1 }, square)).toBe(true)
  })

  it('is false for a point outside the ring', () => {
    expect(pointInPolygon({ lat: 3, lng: 1 }, square)).toBe(false)
    expect(pointInPolygon({ lat: 1, lng: -1 }, square)).toBe(false)
  })
})
