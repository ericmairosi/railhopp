// Darwin API Client for UK Rail Real-time Information
// Pub/Sub-only implementation with lightweight in-memory caching

import { DarwinConfig, StationBoardRequest, LiveStationBoard, TrainServiceDetails } from './types'
import { getDarwinPubSubClient } from './pubsub-client'

export class DarwinClient {
  private pubSubClient = getDarwinPubSubClient()
  // In-memory lightweight cache for station boards (short TTL)
  private boardCache: Map<string, { data: LiveStationBoard; expires: number }> = new Map()
  private readonly cacheTtlMs = 20_000

  constructor(_config: DarwinConfig) {
    // Only Pub/Sub is used now. STOMP and SOAP have been removed for a lighter app.
  }

  /**
   * Check if Darwin is enabled and configured (Pub/Sub only)
   */
  isEnabled(): boolean {
    return this.pubSubClient.isEnabled()
  }

  /**
   * Get departure board for a station (Pub/Sub only) with a short in-memory cache
   */
  async getStationBoard(request: StationBoardRequest): Promise<LiveStationBoard> {
    const key = JSON.stringify({
      crs: request.crs.toUpperCase(),
      n: request.numRows || 10,
      f: request.filterCrs || '',
      t: request.filterType || '',
    })

    const cached = this.boardCache.get(key)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    } else if (cached) {
      this.boardCache.delete(key)
    }

    console.log('Attempting Darwin Pub/Sub for station:', request.crs)
    const board = await this.pubSubClient.getStationBoard(request)

    this.boardCache.set(key, { data: board, expires: Date.now() + this.cacheTtlMs })
    return board
  }

  /**
   * Get detailed service information (Pub/Sub only)
   */
  async getServiceDetails(serviceId: string): Promise<TrainServiceDetails | null> {
    return this.pubSubClient.getServiceDetails(serviceId)
  }

  /**
   * Test connection to Darwin system (Pub/Sub only)
   */
  async testConnection(): Promise<boolean> {
    return this.pubSubClient.testConnection()
  }
}

// Singleton instance for the application
let darwinClient: DarwinClient | null = null

export function getDarwinClient(): DarwinClient {
  if (!darwinClient) {
    const pushToken = process.env.DARWIN_PASSWORD || process.env.DARWIN_PUSH_PORT_TOKEN || ''
    const inferredUsername =
      process.env.DARWIN_USERNAME || (pushToken ? 'darwin' : 'your_darwin_username')
    const inferredPassword =
      process.env.DARWIN_PASSWORD || process.env.DARWIN_PUSH_PORT_TOKEN || 'your_darwin_password'

    const config: DarwinConfig = {
      // Pub/Sub configuration (via broker bridge)
      queueUrl: process.env.DARWIN_QUEUE_URL || 'ssl://datafeeds.nationalrail.co.uk:61617',
      username: inferredUsername,
      password: inferredPassword,
      queueName: process.env.DARWIN_QUEUE_NAME || 'Consumer.railhopp.VirtualTopic.PushPort-v18',
      clientId: process.env.DARWIN_CLIENT_ID || 'railhopp_client',
      enabled: process.env.DARWIN_ENABLED === 'true',

      // Connection settings
      timeout: 30000,
      retries: 3,
    }

    darwinClient = new DarwinClient(config)
  }

  return darwinClient
}

export default DarwinClient
