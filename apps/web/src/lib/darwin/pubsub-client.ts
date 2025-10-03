// Darwin Real Time Train Information Pub/Sub Client
// Handles Darwin real-time messaging system using WebSocket/Server-Sent Events
// Based on Darwin Real Time Train Information (P-d3bf124c-1058-4040-8a62-87181a877d59)

import {
  DarwinConfig,
  DarwinPubSubMessage,
  DarwinXMLMessage,
  LiveStationBoard,
  LiveDeparture,
  TrainServiceDetails,
  DarwinAPIError,
  StationBoardRequest,
  DarwinLocation,
} from './types'
import { XMLParser } from 'fast-xml-parser'

type BrokerEvent = { body?: Record<string, unknown> } | Record<string, unknown>

type CachedService = {
  serviceId: string
  uid: string
  runDate: string
  locations: DarwinLocation[]
  lastUpdate: string
}

export class DarwinPubSubClient {
  private config: DarwinConfig
  private parser: XMLParser
  private trainDataCache: Map<string, CachedService> = new Map()
  private lastUpdateTime: number = 0

  constructor(config: DarwinConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      ...config,
    }

    // Initialize XML parser for Darwin messages
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => {
        const arrayElements = ['TS', 'Location', 'service', 'callingPoint']
        return arrayElements.includes(name)
      },
    })
  }

  /**
   * Check if Darwin Pub/Sub is enabled and configured
   */
  isEnabled(): boolean {
    const brokerUrl = process.env.DARWIN_BROKER_URL
    return Boolean(
      this.config.enabled &&
        (brokerUrl ||
          (this.config.queueUrl &&
            this.config.username &&
            this.config.password &&
            this.config.username !== 'your_darwin_username'))
    )
  }

  /**
   * Get station departure board (using cached real-time data)
   */
  async getStationBoard(request: StationBoardRequest): Promise<LiveStationBoard> {
    if (!this.isEnabled()) {
      console.log('Darwin Pub/Sub not configured')
      throw new DarwinAPIError(
        'Darwin Pub/Sub not configured - missing credentials',
        'API_NOT_CONFIGURED',
        {
          message:
            'Please set DARWIN_QUEUE_URL, DARWIN_USERNAME, DARWIN_PASSWORD environment variables',
          requiredVars: ['DARWIN_QUEUE_URL', 'DARWIN_USERNAME', 'DARWIN_PASSWORD'],
        }
      )
    }

    console.log(`Fetching Darwin Pub/Sub data for station: ${request.crs}`)

    try {
      // Since we can't directly connect to JMS from browser, we need a server-side endpoint
      // This would typically connect to your backend service that maintains the JMS connection
      const response = await this.fetchFromDarwinService(request)

      console.log(`Successfully fetched Darwin Pub/Sub data for ${request.crs}`)
      return response
    } catch (error) {
      console.error('Darwin Pub/Sub error:', error)
      throw error
    }
  }

  /**
   * Get detailed service information
   */
  async getServiceDetails(serviceId: string): Promise<TrainServiceDetails | null> {
    if (!this.isEnabled()) {
      throw new DarwinAPIError(
        'Darwin Pub/Sub not configured - missing credentials',
        'API_NOT_CONFIGURED',
        { message: 'Please configure Darwin Pub/Sub environment variables' }
      )
    }

    // Look up service details from cached real-time data
    const cachedService = this.trainDataCache.get(serviceId)
    if (!cachedService) {
      throw new DarwinAPIError(
        `Service ${serviceId} not found in real-time data`,
        'SERVICE_NOT_FOUND',
        { serviceId }
      )
    }

    return this.parseServiceDetailsFromCache(cachedService)
  }

  /**
   * Test connection to Darwin Pub/Sub system
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled()) {
      console.log('Darwin Pub/Sub not configured')
      return false
    }

    try {
      // Test with a simple station request
      await this.getStationBoard({ crs: 'KGX', numRows: 1 })
      return true
    } catch (error) {
      console.error('Darwin Pub/Sub connection test failed:', error)
      return false
    }
  }

  /**
   * Process incoming Darwin Pub/Sub message
   */
  processDarwinMessage(message: DarwinPubSubMessage): void {
    try {
      // Decode base64 bytes to get XML content
      const xmlContent = Buffer.from(message.bytes, 'base64').toString('utf-8')

      // Parse XML to get Darwin data
      const parsedXml: DarwinXMLMessage = this.parser.parse(xmlContent)

      // Update internal cache with real-time data
      this.updateTrainDataCache(parsedXml)

      this.lastUpdateTime = Date.now()

      console.log('Processed Darwin Pub/Sub message:', {
        messageId: message.messageID,
        timestamp: new Date(message.timestamp).toISOString(),
        updateOrigin: parsedXml.Pport?.uR?.['@_updateOrigin'],
      })
    } catch (error) {
      console.error('Error processing Darwin Pub/Sub message:', error)
    }
  }

  /**
   * Fetch data from Darwin service (backend endpoint that maintains JMS connection)
   */
  private async fetchFromDarwinService(request: StationBoardRequest): Promise<LiveStationBoard> {
    // Try an external Darwin broker if available (bridges JMS/Kafka to HTTP)
    const baseUrl = (process.env.DARWIN_BROKER_URL || 'http://localhost:4001').replace(/\/$/, '')

    try {
      const res = await fetch(`${baseUrl}/station/${encodeURIComponent(request.crs)}/recent`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      })

      if (!res.ok) {
        throw new DarwinAPIError(
          `Darwin broker returned ${res.status}: ${res.statusText}`,
          'BROKER_HTTP_ERROR',
          {
            status: res.status,
            statusText: res.statusText,
            url: `${baseUrl}/station/${request.crs}/recent`,
          }
        )
      }

      const json = (await res.json()) as { data?: unknown }
      const items: BrokerEvent[] = Array.isArray(json?.data) ? (json.data as BrokerEvent[]) : []

      const departures: LiveDeparture[] = this.mapBrokerEventsToDepartures(
        items,
        request.numRows || 10
      )

      return {
        locationName: this.getStationName(request.crs),
        crs: request.crs,
        stationName: this.getStationName(request.crs),
        stationCode: request.crs,
        departures,
        generatedAt: new Date().toISOString(),
      }
    } catch {
      // If broker is not reachable, surface informative error
      throw new DarwinAPIError(
        'Darwin Pub/Sub requires a backend service to maintain JMS connection',
        'BACKEND_SERVICE_REQUIRED',
        {
          message: `Could not reach Darwin broker at ${baseUrl}. Start the broker service or expose a compatible endpoint.`,
          architecture: 'pub-sub',
          brokerUrlTried: baseUrl,
          requiredBackendEndpoints: ['GET /station/{crs}/recent', 'WS /ws'],
        }
      )
    }
  }

  // Best-effort mapping from broker events to LiveDeparture list
  private mapBrokerEventsToDepartures(items: BrokerEvent[], limit: number): LiveDeparture[] {
    const out: LiveDeparture[] = []
    for (const ev of items) {
      const body = ('body' in ev && ev.body ? ev.body : ev) as Record<string, unknown>

      const getStr = (keys: string[], fallback = ''): string => {
        for (const k of keys) {
          const v = body[k]
          if (typeof v === 'string' && v.trim().length > 0) return v
        }
        return fallback
      }

      const destName = getStr(
        ['destination_name', 'dest_name', 'dest', 'destination'],
        'Unknown destination'
      )
      const destCrs = getStr(['destination_crs', 'dest_crs', 'destCRS'], '---')
      const std = getStr(['std', 'dep_time', 'planned_dep', 'ptd', 'time'], '')
      const etd = getStr(['etd', 'expected_dep', 'atd', 'actual_dep'], 'On time')
      const operator = getStr(['toc_name', 'operator'], 'Unknown')
      const operatorCode = getStr(['toc', 'operatorCode'], '')
      const idRaw = getStr(['serviceId', 'rid', 'train_id'], '')
      const serviceID = idRaw || `${Date.now()}_${out.length}`
      const platform = getStr(['plat', 'platform'], '') || undefined

      out.push({
        serviceID,
        operator,
        operatorCode,
        destination: destName,
        destinationCRS: destCrs,
        std,
        etd,
        platform,
        serviceType: 'train',
      })

      if (out.length >= limit) break
    }
    return out
  }

  private getStationName(crs: string): string {
    const stations: { [key: string]: string } = {
      KGX: 'London Kings Cross',
      PAD: 'London Paddington',
      VIC: 'London Victoria',
      WAT: 'London Waterloo',
      LIV: 'London Liverpool Street',
      EUS: 'London Euston',
      CHX: 'London Charing Cross',
      LST: 'London St Pancras International',
      MAN: 'Manchester Piccadilly',
      BHM: 'Birmingham New Street',
      LDS: 'Leeds',
      EDB: 'Edinburgh Waverley',
      GLC: 'Glasgow Central',
      BRI: 'Bristol Temple Meads',
      CAR: 'Cardiff Central',
      NCL: 'Newcastle',
      LPL: 'Liverpool Lime Street',
      SHF: 'Sheffield',
      NTG: 'Nottingham',
    }
    return stations[crs] || `Station ${crs}`
  }

  /**
   * Update internal cache with real-time train data
   */
  private updateTrainDataCache(xmlData: DarwinXMLMessage): void {
    if (!xmlData.Pport?.uR?.TS) return

    xmlData.Pport.uR.TS.forEach((trainStatus) => {
      if (trainStatus['@_rid']) {
        this.trainDataCache.set(trainStatus['@_rid'], {
          serviceId: trainStatus['@_rid'],
          uid: trainStatus['@_uid'],
          runDate: trainStatus['@_ssd'],
          locations: trainStatus.Location || [],
          lastUpdate: new Date().toISOString(),
        })
      }
    })
  }

  /**
   * Parse service details from cached data
   */
  private parseServiceDetailsFromCache(cachedService: CachedService): TrainServiceDetails {
    return {
      serviceID: cachedService.serviceId,
      rsid: cachedService.uid,
      operator: 'Unknown', // Would need to be derived from TOC codes
      operatorCode: '',
      runDate: cachedService.runDate,
      trainid: cachedService.uid,
      platform: undefined,
      delayReason: undefined,
      cancelReason: undefined,
      length: undefined,
      origin: [],
      destination: [],
      previousCallingPoints: [],
      subsequentCallingPoints: [],
    }
  }

  /**
   * Get statistics about cached data
   */
  getCacheStatistics() {
    return {
      totalServices: this.trainDataCache.size,
      lastUpdate: this.lastUpdateTime ? new Date(this.lastUpdateTime).toISOString() : null,
      cacheAge: this.lastUpdateTime ? Date.now() - this.lastUpdateTime : null,
    }
  }
}

// Singleton instance for the application
let darwinPubSubClient: DarwinPubSubClient | null = null

export function getDarwinPubSubClient(): DarwinPubSubClient {
  if (!darwinPubSubClient) {
    const config: DarwinConfig = {
      queueUrl: process.env.DARWIN_QUEUE_URL || 'ssl://datafeeds.nationalrail.co.uk:61617',
      username: process.env.DARWIN_USERNAME || 'your_darwin_username',
      password: process.env.DARWIN_PASSWORD || 'your_darwin_password',
      queueName: process.env.DARWIN_QUEUE_NAME || 'Consumer.rdmportal.VirtualTopic.PushPort-v18',
      clientId: process.env.DARWIN_CLIENT_ID || 'railhopp_client',
      enabled: process.env.DARWIN_ENABLED === 'true',
    }

    darwinPubSubClient = new DarwinPubSubClient(config)
  }

  return darwinPubSubClient
}

export default DarwinPubSubClient
