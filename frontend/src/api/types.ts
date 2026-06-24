// Mirrors the backend DTOs (BeaconMap.Api.Contracts).

export type DisasterType =
  | 'Earthquake'
  | 'Flood'
  | 'Wildfire'
  | 'Storm'
  | 'Industrial'
  | 'Other'
  | 'Eruption'
  | 'Tsunami'

export type HazardType =
  | 'BlockedRoad'
  | 'UnsafeRoute'
  | 'Fire'
  | 'DamagedBuilding'
  | 'Other'

export type CoordinationPointType =
  | 'CommandPost'
  | 'MedicalStation'
  | 'Shelter'
  | 'Supply'
  | 'Other'

export interface LatLng {
  lat: number
  lng: number
}

export interface Disaster {
  id: string
  name: string
  type: DisasterType
  area: LatLng[]
  description: string | null
  createdAtUtc: string
}

export interface CreateDisaster {
  name: string
  type: DisasterType
  area: LatLng[]
  description: string | null
}

export interface Hazard {
  id: string
  disasterId: string
  type: HazardType
  lat: number
  lng: number
  radiusMeters: number
  description: string | null
  createdAtUtc: string
}

export interface CreateHazard {
  type: HazardType
  lat: number
  lng: number
  radiusMeters: number | null
  description: string | null
}

export interface CoordinationPoint {
  id: string
  disasterId: string
  name: string
  type: CoordinationPointType
  lat: number
  lng: number
  description: string | null
  createdAtUtc: string
}

export interface CreateCoordinationPoint {
  name: string
  type: CoordinationPointType
  lat: number
  lng: number
  description: string | null
}

export type ServiceKind = 'police' | 'hospital' | 'fire_station'

export interface EmergencyService {
  id: string
  kind: ServiceKind
  name: string
  lat: number
  lng: number
}

export interface RouteRequest {
  start: LatLng
  end: LatLng
  profile: string | null
}

export interface Route {
  coordinates: LatLng[]
  distanceMeters: number
  durationSeconds: number
}
