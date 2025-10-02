// WebSocket Server for Real-time Train Updates
// Provides live updates to connected clients

import { WebSocketServer, WebSocket as WS } from 'ws'
import http from 'http'

export interface TrainUpdateMessage {
  type: 'TRAIN_MOVEMENT' | 'TRAIN_DELAY' | 'SERVICE_UPDATE' | 'CONNECTION_STATUS'
  data: {
    trainId?: string
    stationCrs?: string
    delayMinutes?: number
    eventType?: 'ARRIVAL' | 'DEPARTURE'
    platform?: string
    status?: string
    timestamp: string
    message?: string
  }
}

type ClientMessage =
  | { type: 'SUBSCRIBE_STATION'; stationCrs?: string }
  | { type: 'UNSUBSCRIBE_STATION'; stationCrs?: string }
  | { type: 'PING' }
  | { type: string; [key: string]: unknown }

class WebSocketManager {
  private wss: WebSocketServer | null = null
  private clients = new Set<WS>()
  private readonly subscriptions = new WeakMap<WS, Set<string>>()
  private isRunning = false

  /**
   * Start WebSocket server
   */
  start(server?: http.Server, port: number = 3001): void {
    if (this.isRunning) {
      console.log('WebSocket server already running')
      return
    }

    try {
      if (server) {
        // Attach to existing HTTP server
        this.wss = new WebSocketServer({ server })
        console.log('✅ WebSocket server attached to HTTP server')
      } else {
        // Create standalone server
        this.wss = new WebSocketServer({ port })
        console.log(`✅ WebSocket server started on port ${port}`)
      }

      this.wss.on('connection', (ws: WS) => {
        const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        console.log(`🔌 WebSocket client connected: ${clientId}`)

        this.clients.add(ws)

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: 'CONNECTION_STATUS',
            data: {
              message: 'Connected to Railhopp live updates',
              timestamp: new Date().toISOString(),
            },
          })
        )

        // Handle client messages
        ws.on('message', (message: unknown) => {
          try {
            const text = typeof message === 'string' ? message : (message as { toString: () => string }).toString()
            const parsed = JSON.parse(text) as { type?: string; stationCrs?: unknown }
            this.handleClientMessage(ws, parsed as ClientMessage)
          } catch (error) {
            console.error('Error parsing client message:', error)
          }
        })

        // Handle client disconnect
        ws.on('close', () => {
          console.log(`🔌 WebSocket client disconnected: ${clientId}`)
          this.clients.delete(ws)
        })

        // Handle errors
        ws.on('error', (error: unknown) => {
          console.error(`WebSocket error for ${clientId}:`, error)
          this.clients.delete(ws)
        })
      })

      this.isRunning = true
      console.log('📡 WebSocket server ready for real-time updates')
    } catch (error) {
      console.error('Failed to start WebSocket server:', error)
      throw error
    }
  }

  /**
   * Stop WebSocket server
   */
  stop(): void {
    if (!this.isRunning) return

    console.log('🛑 Stopping WebSocket server...')

    // Close all client connections
    this.clients.forEach((client) => {
      if (client.readyState === (client as unknown as { OPEN: number }).OPEN) {
        client.close()
      }
    })
    this.clients.clear()

    // Close server
    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    this.isRunning = false
    console.log('✅ WebSocket server stopped')
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: TrainUpdateMessage): void {
    if (!this.isRunning) return

    const messageStr = JSON.stringify(message)
    const activeClients = new Set<WS>()

    this.clients.forEach((client) => {
      if (client.readyState === (client as unknown as { OPEN: number }).OPEN) {
        try {
          client.send(messageStr)
          activeClients.add(client)
        } catch (error) {
          console.error('Error sending message to client:', error)
        }
      }
    })

    // Update active clients list
    this.clients = activeClients
  }

  /**
   * Send message to specific client
   */
  sendToClient(client: WS, message: TrainUpdateMessage): void {
    if (client.readyState === (client as unknown as { OPEN: number }).OPEN) {
      try {
        client.send(JSON.stringify(message))
      } catch (error) {
        console.error('Error sending message to client:', error)
      }
    }
  }

  /**
   * Handle incoming client messages
   */
  private handleClientMessage(client: WS, data: ClientMessage): void {
    switch (data.type) {
      case 'SUBSCRIBE_STATION':
        // Client wants updates for specific station
        const stationCrsUnknown = (data as { stationCrs?: unknown }).stationCrs
        if (typeof stationCrsUnknown === 'string' && stationCrsUnknown) {
          const stationCrs = stationCrsUnknown
          console.log(`Client subscribed to station: ${stationCrs}`)
          // Store subscription preference (simple per-connection subscription set)
          const subs = this.subscriptions.get(client) ?? new Set<string>()
          subs.add(stationCrs)
          this.subscriptions.set(client, subs)
        }
        break

      case 'UNSUBSCRIBE_STATION':
        // Client no longer wants updates for specific station
        const unsubStationCrsUnknown = (data as { stationCrs?: unknown }).stationCrs
        if (typeof unsubStationCrsUnknown === 'string' && unsubStationCrsUnknown) {
          this.subscriptions.get(client)?.delete(unsubStationCrsUnknown)
        }
        break

      case 'PING':
        // Client ping - respond with pong
        this.sendToClient(client, {
          type: 'CONNECTION_STATUS',
          data: {
            message: 'pong',
            timestamp: new Date().toISOString(),
          },
        })
        break

      default:
        console.log('Unknown client message type:', data.type)
    }
  }

  /**
   * Get server status
   */
  getStatus(): {
    running: boolean
    clientCount: number
    uptime: number
  } {
    return {
      running: this.isRunning,
      clientCount: this.clients.size,
      uptime: this.isRunning ? Date.now() : 0,
    }
  }

  /**
   * Send train movement update
   */
  broadcastTrainMovement(
    trainId: string,
    stationCrs: string,
    eventType: 'ARRIVAL' | 'DEPARTURE',
    delayMinutes: number = 0,
    platform?: string
  ): void {
    this.broadcast({
      type: 'TRAIN_MOVEMENT',
      data: {
        trainId,
        stationCrs,
        eventType,
        delayMinutes,
        platform,
        status: delayMinutes > 5 ? 'DELAYED' : 'ON_TIME',
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Send delay alert
   */
  broadcastDelayAlert(trainId: string, stationCrs: string, delayMinutes: number): void {
    this.broadcast({
      type: 'TRAIN_DELAY',
      data: {
        trainId,
        stationCrs,
        delayMinutes,
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Send service update
   */
  broadcastServiceUpdate(message: string, stationCrs?: string): void {
    this.broadcast({
      type: 'SERVICE_UPDATE',
      data: {
        message,
        stationCrs,
        timestamp: new Date().toISOString(),
      },
    })
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager()
  }
  return wsManager
}

export { WebSocketManager }
export default WebSocketManager
