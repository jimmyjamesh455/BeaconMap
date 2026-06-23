import type {
  CoordinationPoint,
  CreateCoordinationPoint,
  CreateDisaster,
  CreateHazard,
  Disaster,
  Hazard,
  Route,
  RouteRequest,
} from './types'

export type FetchFn = typeof fetch

export const defaultBaseUrl: string =
  (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:5180'

export function createApiClient(baseUrl: string = defaultBaseUrl, fetchFn: FetchFn = fetch) {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetchFn(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!response.ok) {
      throw new Error(`Request to ${path} failed with status ${response.status}`)
    }
    if (response.status === 204) {
      return undefined as T
    }
    return (await response.json()) as T
  }

  const body = (value: unknown) => JSON.stringify(value)

  return {
    listDisasters: () => request<Disaster[]>('/api/disasters'),
    getDisaster: (id: string) => request<Disaster>(`/api/disasters/${id}`),
    createDisaster: (input: CreateDisaster) =>
      request<Disaster>('/api/disasters', { method: 'POST', body: body(input) }),
    updateDisaster: (id: string, input: CreateDisaster) =>
      request<Disaster>(`/api/disasters/${id}`, { method: 'PUT', body: body(input) }),
    deleteDisaster: (id: string) =>
      request<void>(`/api/disasters/${id}`, { method: 'DELETE' }),

    listHazards: (disasterId: string) =>
      request<Hazard[]>(`/api/disasters/${disasterId}/hazards`),
    createHazard: (disasterId: string, input: CreateHazard) =>
      request<Hazard>(`/api/disasters/${disasterId}/hazards`, { method: 'POST', body: body(input) }),
    deleteHazard: (disasterId: string, hazardId: string) =>
      request<void>(`/api/disasters/${disasterId}/hazards/${hazardId}`, { method: 'DELETE' }),

    listCoordinationPoints: (disasterId: string) =>
      request<CoordinationPoint[]>(`/api/disasters/${disasterId}/coordination-points`),
    createCoordinationPoint: (disasterId: string, input: CreateCoordinationPoint) =>
      request<CoordinationPoint>(`/api/disasters/${disasterId}/coordination-points`, {
        method: 'POST',
        body: body(input),
      }),
    deleteCoordinationPoint: (disasterId: string, pointId: string) =>
      request<void>(`/api/disasters/${disasterId}/coordination-points/${pointId}`, { method: 'DELETE' }),

    requestRoute: (disasterId: string, input: RouteRequest) =>
      request<Route>(`/api/disasters/${disasterId}/routes`, { method: 'POST', body: body(input) }),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
