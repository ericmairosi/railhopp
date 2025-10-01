// WebSocket Server for Real-time Train Updates
// Provides live updates to connected clients

import { WebSocketServer } from 'ws'
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

class WebSocketManager {
  private wss: any | null = null
  private clients = new Set<any>()
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

      this.wss.on('connection', (ws: any, req: any) => {
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
        ws.on('message', (message: any) => {
          try {
            const data = JSON.parse(message.toString())
            this.handleClientMessage(ws, data)
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
        ws.on('error', (error: any) => {
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
      if (client.readyState === client.OPEN) {
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
    const activeClients = new Set<any>()

    this.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
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
  sendToClient(client: any, message: TrainUpdateMessage): void {
    if (client.readyState === client.OPEN) {
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
  private handleClientMessage(client: any, data: any): void {
    switch (data.type) {
      case 'SUBSCRIBE_STATION':
        // Client wants updates for specific station
        const stationCrs = data.stationCrs
        if (stationCrs) {
          console.log(`Client subscribed to station: ${stationCrs}`)
          // Store subscription preference (would implement more sophisticated filtering)
          client._subscribedStations = client._subscribedStations || new Set()
          client._subscribedStations.add(stationCrs)
        }
        break

      case 'UNSUBSCRIBE_STATION':
        // Client no longer wants updates for specific station
        const unsubStationCrs = data.stationCrs
        if (unsubStationCrs && client._subscribedStations) {
          client._subscribedStations.delete(unsubStationCrs)
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
