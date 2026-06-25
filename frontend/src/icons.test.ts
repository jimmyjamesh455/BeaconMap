import { describe, it, expect } from 'vitest'
import { hazardMeta, pointMeta, serviceMeta, disasterMeta, hazardInfo, disasterInfo } from './icons'

describe('icon metadata', () => {
  it('gives hazards human-readable labels (not run-on enum names)', () => {
    expect(hazardMeta.BlockedRoad.label).toBe('Blocked road')
    expect(hazardMeta.DamagedBuilding.label).toBe('Damaged building')
  })

  it('gives coordination points human-readable labels', () => {
    expect(pointMeta.CommandPost.label).toBe('Command post')
    expect(pointMeta.MedicalStation.label).toBe('Medical station')
  })

  it('maps emergency-service kinds to labels and icons', () => {
    expect(serviceMeta.fire_station.label).toBe('Fire station')
    expect(serviceMeta.police.emoji).toBeTruthy()
  })

  it('covers every disaster type with an emoji', () => {
    for (const meta of Object.values(disasterMeta)) {
      expect(meta.emoji).toBeTruthy()
    }
  })

  it('resolvers fall back to a default for unknown/legacy values (never undefined)', () => {
    expect(hazardInfo('SomethingOld')).toBe(hazardMeta.Other)
    expect(disasterInfo('')).toBe(disasterMeta.Other)
    // Known values still resolve normally.
    expect(hazardInfo('Fire')).toBe(hazardMeta.Fire)
  })
})
