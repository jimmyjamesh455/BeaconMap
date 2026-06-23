import { HubConnectionBuilder, type HubConnection } from '@microsoft/signalr'
import { defaultBaseUrl } from '../api/client'
import type { CoordinationPoint, Hazard } from '../api/types'

export interface MapHubHandlers {
  hazardCreated: (hazard: Hazard) => void
  hazardUpdated: (hazard: Hazard) => void
  hazardDeleted: (hazardId: string) => void
  coordinationPointCreated: (point: CoordinationPoint) => void
  coordinationPointUpdated: (point: CoordinationPoint) => void
  coordinationPointDeleted: (pointId: string) => void
}

export function createMapHub(baseUrl: string = defaultBaseUrl) {
  let connection: HubConnection | null = null
  let currentDisasterId: string | null = null

  function wire(handlers: MapHubHandlers): HubConnection {
    const conn = new HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/map`)
      .withAutomaticReconnect()
      .build()

    conn.on('HazardCreated', handlers.hazardCreated)
    conn.on('HazardUpdated', handlers.hazardUpdated)
    conn.on('HazardDeleted', handlers.hazardDeleted)
    conn.on('CoordinationPointCreated', handlers.coordinationPointCreated)
    conn.on('CoordinationPointUpdated', handlers.coordinationPointUpdated)
    conn.on('CoordinationPointDeleted', handlers.coordinationPointDeleted)
    return conn
  }

  return {
    async connect(disasterId: string, handlers: MapHubHandlers): Promise<void> {
      connection = wire(handlers)
      await connection.start()
      await connection.invoke('JoinDisaster', disasterId)
      currentDisasterId = disasterId
    },
    async switchDisaster(disasterId: string): Promise<void> {
      if (!connection) return
      if (currentDisasterId) {
        await connection.invoke('LeaveDisaster', currentDisasterId)
      }
      await connection.invoke('JoinDisaster', disasterId)
      currentDisasterId = disasterId
    },
    async disconnect(): Promise<void> {
      await connection?.stop()
      connection = null
      currentDisasterId = null
    },
  }
}
