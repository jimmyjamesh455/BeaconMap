import type { CoordinationPointType, DisasterType, HazardType, ServiceKind } from './api/types'

export interface IconMeta {
  emoji: string
  label: string
}

export const hazardMeta: Record<HazardType, IconMeta> = {
  BlockedRoad: { emoji: '🚧', label: 'Blocked road' },
  UnsafeRoute: { emoji: '⚠️', label: 'Unsafe route' },
  Fire: { emoji: '🔥', label: 'Fire' },
  DamagedBuilding: { emoji: '🏚️', label: 'Damaged building' },
  Other: { emoji: '❗', label: 'Other' },
}

export const pointMeta: Record<CoordinationPointType, IconMeta> = {
  CommandPost: { emoji: '🚩', label: 'Command post' },
  MedicalStation: { emoji: '🏥', label: 'Medical station' },
  Shelter: { emoji: '🏠', label: 'Shelter' },
  Supply: { emoji: '📦', label: 'Supply' },
  Other: { emoji: '📍', label: 'Other' },
}

export const disasterMeta: Record<DisasterType, IconMeta> = {
  Earthquake: { emoji: '🫨', label: 'Earthquake' },
  Flood: { emoji: '💧', label: 'Flood' },
  Wildfire: { emoji: '🔥', label: 'Wildfire' },
  Storm: { emoji: '🌀', label: 'Storm' },
  Industrial: { emoji: '🏭', label: 'Industrial' },
  Other: { emoji: '⚠️', label: 'Other' },
  Eruption: { emoji: '🌋', label: 'Eruption' },
  Tsunami: { emoji: '🌊', label: 'Tsunami' },
}

export const serviceMeta: Record<ServiceKind, IconMeta> = {
  police: { emoji: '👮', label: 'Police station' },
  hospital: { emoji: '🏥', label: 'Hospital' },
  fire_station: { emoji: '🚒', label: 'Fire station' },
}
