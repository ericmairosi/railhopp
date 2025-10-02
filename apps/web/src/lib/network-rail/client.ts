// Network Rail API Client for Train Movements, VSTP, SMART, CORPUS
// Handles STOMP feeds and REST API calls for Network Rail data

import {
  NetworkRailConfig,
  TrainMovementMessage,
  VSTPMessage,
  TrainDescriberMessage,
  CorpusEntry,
  SmartEntry,
  ScheduleMessage,
  EnhancedTrainService,
  NetworkRailAPIError,
  NetworkRailStatus,
} from './types'

// Minimal STOMP typings we rely on
type StompConnectOptions = { host: string; port: number; connectHeaders: Record<string, string> }
type StompMessage = {
  readString: (encoding: string, callback: (error: unknown, body: string) => void) => void
  ack: () => void
}
type StompClient = {
  on: (event: 'error' | 'disconnect', listener: (...args: unknown[]) => void) => void
  subscribe: (
    headers: { destination: string; ack?: string },
    callback: (error: unknown, message: StompMessage) => void
  ) => void
  disconnect: () => void
}

type StompitModule = {
  connect: (
    options: StompConnectOptions,
    callback: (error: unknown, client: StompClient) => void
  ) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export class NetworkRailClient {
  private config: NetworkRailConfig
  private stompClient: StompClient | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10

  constructor(config: NetworkRailConfig) {
    this.config = {
      timeout: 15000,
      retries: 3,
      ...config,
    }
  }

  /**
   * Initialize STOMP connection for real-time feeds
   */
  async initializeSTOMPConnection(): Promise<void> {
    try {
      // Dynamic import for STOMP client (Node.js environment)
      const stompit = (await import('stompit')) as unknown as StompitModule

      const connectOptions: StompConnectOptions = {
        host: this.extractHostFromUrl(this.config.stompUrl),
        port: this.extractPortFromUrl(this.config.stompUrl),
        connectHeaders: {
          host: '/',
          login: this.config.username,
          passcode: this.config.password,
          'heart-beat': '5000,5000',
        },
      }

      this.stompClient = await new Promise<StompClient>((resolve, reject) => {
        stompit.connect(connectOptions, (error: unknown, client: StompClient) => {
          if (error) {
            reject(
              new NetworkRailAPIError(
                'Failed to connect to Network Rail STOMP server',
                'STOMP_CONNECTION_ERROR',
                error
              )
            )
            return
          }
          resolve(client)
        })
      })

      this.isConnected = true
      this.reconnectAttempts = 0
      console.log('Network Rail STOMP connection established')

      // Set up connection error handlers
      this.stompClient.on('error', this.handleSTOMPError.bind(this))
      this.stompClient.on('disconnect', this.handleSTOMPDisconnect.bind(this))
    } catch (error) {
      throw new NetworkRailAPIError(
        'Failed to initialize STOMP connection',
        'INITIALIZATION_ERROR',
        error
      )
    }
  }

  /**
   * Subscribe to Train Movements feed
   */
  subscribeToTrainMovements(callback: (movement: TrainMovementMessage) => void): void {
    if (!this.isConnected || !this.stompClient) {
      throw new NetworkRailAPIError('STOMP connection not established', 'NOT_CONNECTED')
    }

    const subscribeHeaders = {
      destination: '/topic/TRAIN_MVT_ALL_TOC',
      ack: 'client-individual',
    }

    this.stompClient.subscribe(subscribeHeaders, (error: unknown, message: StompMessage) => {
      if (error) {
        console.error('Train movements subscription error:', error)
        return
      }

      try {
        message.readString('utf-8', (error: unknown, body: string) => {
          if (error) {
            console.error('Error reading train movement message:', error)
            return
          }

          const movements = JSON.parse(body)
          movements.forEach((movement: TrainMovementMessage) => {
            callback(movement)
          })

          message.ack()
        })
      } catch (parseError) {
        console.error('Error parsing train movement data:', parseError)
      }
    })
  }

  /**
   * Subscribe to VSTP feed
   */
  subscribeToVSTP(callback: (vstp: VSTPMessage) => void): void {
    if (!this.isConnected || !this.stompClient) {
      throw new NetworkRailAPIError('STOMP connection not established', 'NOT_CONNECTED')
    }

    const subscribeHeaders = {
      destination: '/topic/VSTP_ALL',
      ack: 'client-individual',
    }

    this.stompClient.subscribe(subscribeHeaders, (error: unknown, message: StompMessage) => {
      if (error) {
        console.error('VSTP subscription error:', error)
        return
      }

      try {
        message.readString('utf-8', (error: unknown, body: string) => {
          if (error) {
            console.error('Error reading VSTP message:', error)
            return
          }

          const vstpData = JSON.parse(body)
          vstpData.forEach((vstp: VSTPMessage) => {
            callback(vstp)
          })

          message.ack()
        })
      } catch (parseError) {
        console.error('Error parsing VSTP data:', parseError)
      }
    })
  }

  /**
   * Subscribe to Train Describer feed
   */
  subscribeToTrainDescriber(
    areaId: string,
    callback: (describer: TrainDescriberMessage) => void
  ): void {
    if (!this.isConnected || !this.stompClient) {
      throw new NetworkRailAPIError('STOMP connection not established', 'NOT_CONNECTED')
    }

    const subscribeHeaders = {
      destination: `/topic/TD_${areaId}_SIG_AREA`,
      ack: 'client-individual',
    }

    this.stompClient.subscribe(subscribeHeaders, (error: unknown, message: StompMessage) => {
      if (error) {
        console.error('Train Describer subscription error:', error)
        return
      }

      try {
        message.readString('utf-8', (error: unknown, body: string) => {
          if (error) {
            console.error('Error reading Train Describer message:', error)
            return
          }

          const describerData = JSON.parse(body)
          describerData.forEach((describer: TrainDescriberMessage) => {
            callback(describer)
          })

          message.ack()
        })
      } catch (parseError) {
        console.error('Error parsing Train Describer data:', parseError)
      }
    })
  }

  /**
   * Get CORPUS reference data
   */
  async getCorpusData(): Promise<CorpusEntry[]> {
    try {
      const response = await this.makeHTTPRequest<{ CORPUS?: CorpusEntry[] }>('/api/corpus')
      return response.CORPUS || []
    } catch (error) {
      throw new NetworkRailAPIError('Failed to fetch CORPUS data', 'CORPUS_ERROR', error)
    }
  }

  /**
   * Get SMART reference data
   */
  async getSmartData(): Promise<SmartEntry[]> {
    try {
      const response = await this.makeHTTPRequest<{ SMART?: SmartEntry[] }>('/api/smart')
      return response.SMART || []
    } catch (error) {
      throw new NetworkRailAPIError('Failed to fetch SMART data', 'SMART_ERROR', error)
    }
  }

  /**
   * Get schedule data for a specific train
   */
  async getScheduleData(trainUid: string, date: string): Promise<ScheduleMessage | null> {
    try {
      const response = await this.makeHTTPRequest<{ schedule?: ScheduleMessage }>(
        `/api/schedule/${trainUid}/${date}`
      )
      return response.schedule || null
    } catch (error) {
      throw new NetworkRailAPIError('Failed to fetch schedule data', 'SCHEDULE_ERROR', error)
    }
  }

  /**
   * Get comprehensive train service information
   */
  async getEnhancedTrainService(trainId: string): Promise<EnhancedTrainService | null> {
    try {
      // This would combine data from multiple sources
      // Implementation would aggregate movements, schedule, and other data
      const response = await this.makeHTTPRequest<unknown>(`/api/train/${trainId}`)

      if (!isRecord(response) || !('train' in response)) {
        return null
      }
      const trainRaw = (response as { train?: unknown }).train
      if (!isRecord(trainRaw)) {
        return null
      }

      const getString = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
      const getNumber = (v: unknown, fallback = 0): number =>
        typeof v === 'number' ? v : typeof v === 'string' && !Number.isNaN(Number(v)) ? Number(v) : fallback

      const currentLoc = isRecord(trainRaw.current_location)
        ? {
            stanox: getString(trainRaw.current_location.stanox),
            berth: getString(trainRaw.current_location.berth) || undefined,
            platform: getString(trainRaw.current_location.platform) || undefined,
            timestamp: getString(trainRaw.current_location.timestamp, new Date().toISOString()),
          }
        : undefined

      return {
        trainId: getString(trainRaw.train_id, trainId),
        headcode: getString(trainRaw.headcode),
        uid: getString(trainRaw.uid),
        origin: (trainRaw.origin as EnhancedTrainService['origin']) || {
          tiploc: '',
          scheduledTime: '',
        },
        destination: (trainRaw.destination as EnhancedTrainService['destination']) || {
          tiploc: '',
          scheduledTime: '',
        },
        currentLocation: currentLoc,
        movements: Array.isArray(trainRaw.movements)
          ? (trainRaw.movements as EnhancedTrainService['movements'])
          : [],
        schedule: (trainRaw.schedule as EnhancedTrainService['schedule']) || undefined,
        delayMinutes: getNumber(trainRaw.delay_minutes, 0),
        variationStatus: (getString(trainRaw.variation_status, 'ON TIME') as
          | 'EARLY'
          | 'ON TIME'
          | 'LATE'),
        toc: getString(trainRaw.toc),
        serviceCode: getString(trainRaw.service_code),
        lastUpdated: new Date(),
        dataSource: 'network-rail',
      }
    } catch (error) {
      throw new NetworkRailAPIError(
        'Failed to fetch enhanced train service',
        'SERVICE_ERROR',
        error
      )
    }
  }

  /**
   * Get Network Rail service status
   */
  async getStatus(): Promise<NetworkRailStatus> {
    const startTime = Date.now()

    try {
      const response = await this.makeHTTPRequest<{
        feeds?: { movements?: boolean; vstp?: boolean; describer?: boolean; schedule?: boolean }
      }>(
        '/api/health'
      )

      return {
        feeds: {
          movements: response.feeds?.movements || false,
          vstp: response.feeds?.vstp || false,
          describer: response.feeds?.describer || false,
          schedule: response.feeds?.schedule || false,
        },
        lastHealthCheck: new Date(),
        responseTime: Date.now() - startTime,
      }
    } catch {
      return {
        feeds: {
          movements: false,
          vstp: false,
          describer: false,
          schedule: false,
        },
        lastHealthCheck: new Date(),
        responseTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Test connection to Network Rail APIs
   */
  async testConnection(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      return Object.values(status.feeds).some((feed) => feed)
    } catch (error) {
      console.error('Network Rail connection test failed:', error)
      return false
    }
  }

  /**
   * Make HTTP request to Network Rail API
   */
  private async makeHTTPRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
      'base64'
    )

    const requestOptions: RequestInit = {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Railhopp-NetworkRail-Client/1.0',
        ...options.headers,
      },
      ...options,
    }

    const controller = new AbortController()
    const timeoutMs = this.config.timeout ?? 30000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    requestOptions.signal = controller.signal

    try {
      const response = await fetch(url, requestOptions)
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.text()
        throw new NetworkRailAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, body: errorBody, url }
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof NetworkRailAPIError) {
        throw error
      }

      throw new NetworkRailAPIError(
        'Failed to make HTTP request to Network Rail API',
        'REQUEST_ERROR',
        error
      )
    }
  }

  /**
   * Handle STOMP connection errors
   */
  private handleSTOMPError(error: unknown): void {
    console.error('Network Rail STOMP error:', error)
    this.isConnected = false
    this.attemptReconnection()
  }

  /**
   * Handle STOMP disconnection
   */
  private handleSTOMPDisconnect(): void {
    console.warn('Network Rail STOMP disconnected')
    this.isConnected = false
    this.attemptReconnection()
  }

  /**
   * Attempt to reconnect STOMP connection
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for Network Rail STOMP')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

    console.log(
      `Attempting Network Rail STOMP reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`
    )

    setTimeout(async () => {
      try {
        await this.initializeSTOMPConnection()
        console.log('Network Rail STOMP reconnection successful')
      } catch (error) {
        console.error('Network Rail STOMP reconnection failed:', error)
        this.attemptReconnection()
      }
    }, delay)
  }

  /**
   * Extract host from URL
   */
  private extractHostFromUrl(url: string): string {
    const match = url.match(/^(?:https?:\/\/)?([^:\/\s]+)/)
    return match ? match[1] : 'localhost'
  }

  /**
   * Extract port from URL
   */
  private extractPortFromUrl(url: string): number {
    const match = url.match(/:(\d+)/)
    return match ? parseInt(match[1]) : 61613 // Default STOMP port
  }

  /**
   * Disconnect from Network Rail services
   */
  disconnect(): void {
    if (this.stompClient && this.isConnected) {
      this.stompClient.disconnect()
      this.isConnected = false
      console.log('Network Rail STOMP connection closed')
    }
  }
}

// Singleton instance for the application
let networkRailClient: NetworkRailClient | null = null

export function getNetworkRailClient(): NetworkRailClient {
  if (!networkRailClient) {
    const config = {
      username: process.env.NETWORK_RAIL_USERNAME || '',
      password: process.env.NETWORK_RAIL_PASSWORD || '',
      apiUrl: process.env.NETWORK_RAIL_API_URL || 'https://api.rtt.io/api/v1/json',
      stompUrl: process.env.NETWORK_RAIL_STOMP_URL || 'stomp://datafeeds.networkrail.co.uk:61618',
    }

    networkRailClient = new NetworkRailClient(config)
  }

  return networkRailClient
}

export default NetworkRailClient
