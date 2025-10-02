// Knowledge Station API Client for enhanced rail data feeds
// Provides additional data sources that complement Darwin API
import {
  KnowledgeStationConfig,
  StationInfoRequest,
  ServiceTrackingRequest,
  DisruptionRequest,
  KnowledgeStationStation,
  KnowledgeStationService,
  KnowledgeStationDisruption,
  EnhancedStationInfo,
  ServiceTracking,
  DisruptionInfo,
  KnowledgeStationAPIError,
  DataSourceStatus,
  StationSearchRequest,
  StationSummary,
} from './types'

export class KnowledgeStationClient {
  private config: KnowledgeStationConfig
  private baseHeaders: Record<string, string>
  private getAuthHeader(): string {
    const username = process.env.KNOWLEDGE_STATION_USERNAME
    const password = process.env.KNOWLEDGE_STATION_PASSWORD || ''
    if (username) {
      const creds = Buffer.from(`${username}:${password}`).toString('base64')
      return `Basic ${creds}`
    }
    if (this.config.token) {
      // RTT commonly uses Basic with token as username and empty password
      const creds = Buffer.from(`${this.config.token}:`).toString('base64')
      return `Basic ${creds}`
    }
    return ''
  }

  constructor(config: KnowledgeStationConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      enabled: true,
      ...config,
    }

    const auth = this.getAuthHeader()
    this.baseHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Railhopp-Knowledge-Station-Client/1.0',
      ...(auth ? { Authorization: auth } : {}),
    }
  }

  /**
   * Check if Knowledge Station is enabled and configured
   */
  isEnabled(): boolean {
    const hasBasic = Boolean(process.env.KNOWLEDGE_STATION_USERNAME)
    const hasToken = Boolean(this.config.token && this.config.token !== 'your_knowledge_station_token_here')
    return Boolean(this.config.enabled && this.config.apiUrl && (hasBasic || hasToken))
  }

  /**
   * Make HTTP request to Knowledge Station API
   */
  private async makeRequest<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isEnabled()) {
      throw new KnowledgeStationAPIError(
        'Knowledge Station is not enabled or properly configured',
        'NOT_ENABLED',
        { enabled: this.config.enabled, hasToken: !!this.config.token }
      )
    }

    const url = `${this.config.apiUrl}${endpoint}`
    const requestOptions: RequestInit = {
      headers: {
        ...this.baseHeaders,
        // Recompute auth header each request in case env changes at runtime
        ...(this.getAuthHeader() ? { Authorization: this.getAuthHeader() } : {}),
        ...options.headers,
      },
      ...options,
    }

    // Implement timeout using AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)
    requestOptions.signal = controller.signal

    let lastError: unknown
    const maxRetries = this.config.retries || 1

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions)
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorBody = await response.text()
          if (response.status === 401 || response.status === 403) {
            throw new KnowledgeStationAPIError(
              `Unauthorized: Check Knowledge Station credentials and auth scheme (Basic vs token)`,
              'UNAUTHORIZED',
              { status: response.status, body: errorBody, url }
            )
          }
          throw new KnowledgeStationAPIError(
            `HTTP ${response.status}: ${response.statusText}`,
            'HTTP_ERROR',
            { status: response.status, body: errorBody, url }
          )
        }

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          throw new KnowledgeStationAPIError(
            'Expected JSON response from Knowledge Station API',
            'INVALID_RESPONSE_TYPE',
            { contentType, url }
          )
        }

        return (await response.json()) as T
      } catch (error) {
        lastError = error

        if (error instanceof KnowledgeStationAPIError) {
          throw error
        }

        if (attempt === maxRetries) {
          throw new KnowledgeStationAPIError(
            `Failed to connect to Knowledge Station API after ${maxRetries} attempts`,
            'CONNECTION_ERROR',
            { originalError: error, url, attempt }
          )
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw lastError
  }

  /**
   * Get enhanced station information
   */
  async getStationInfo(request: StationInfoRequest): Promise<EnhancedStationInfo> {
    const queryParams = new URLSearchParams({
      crs: request.crs.toUpperCase(),
      format: request.format || 'json',
    })

    if (request.includeServices) {
      queryParams.append('include', 'services')
    }
    if (request.includeDisruptions) {
      queryParams.append('include', 'disruptions')
    }

    try {
      const response = await this.makeRequest<KnowledgeStationStation>(
        `/station/${request.crs.toUpperCase()}?${queryParams}`
      )
      return this.transformStationInfo(response)
    } catch (error) {
      if (error instanceof KnowledgeStationAPIError) throw error

      throw new KnowledgeStationAPIError(
        'Failed to fetch station information from Knowledge Station',
        'API_REQUEST_ERROR',
        error
      )
    }
  }

  /**
   * Get service tracking information
   */
  async getServiceTracking(request: ServiceTrackingRequest): Promise<ServiceTracking> {
    const queryParams = new URLSearchParams({
      format: request.format || 'json',
    })

    if (request.serviceId) queryParams.append('service_id', request.serviceId)
    if (request.headcode) queryParams.append('headcode', request.headcode)
    if (request.uid) queryParams.append('uid', request.uid)
    if (request.date) queryParams.append('date', request.date)

    let endpoint = '/service'
    if (request.serviceId) {
      endpoint += `/${request.serviceId}`
    } else if (request.uid) {
      endpoint += `/uid/${request.uid}`
    } else if (request.headcode) {
      endpoint += `/headcode/${request.headcode}`
    }

    try {
      const response = await this.makeRequest<KnowledgeStationService>(`${endpoint}?${queryParams}`)
      return this.transformServiceTracking(response)
    } catch (error) {
      if (error instanceof KnowledgeStationAPIError) throw error

      throw new KnowledgeStationAPIError(
        'Failed to fetch service tracking from Knowledge Station',
        'API_REQUEST_ERROR',
        error
      )
    }
  }

  /**
   * Get disruption information
   */
  async getDisruptions(request: DisruptionRequest = {}): Promise<DisruptionInfo[]> {
    const queryParams = new URLSearchParams({
      format: request.format || 'json',
    })

    if (request.severity) queryParams.append('severity', request.severity)
    if (request.category) queryParams.append('category', request.category)
    if (request.limit) queryParams.append('limit', request.limit.toString())

    try {
      const response = await this.makeRequest<{ disruptions?: KnowledgeStationDisruption[] } | KnowledgeStationDisruption[]>(`/disruptions?${queryParams}`)
      const list: KnowledgeStationDisruption[] = Array.isArray(response)
        ? response
        : response?.disruptions || []
      return list.map((disruption) => this.transformDisruption(disruption))
    } catch (error) {
      if (error instanceof KnowledgeStationAPIError) throw error

      throw new KnowledgeStationAPIError(
        'Failed to fetch disruptions from Knowledge Station',
        'API_REQUEST_ERROR',
        error
      )
    }
  }

  /**
   * Search for stations by name or code
   */
  async searchStations(request: StationSearchRequest): Promise<StationSummary[]> {
    if (!this.isEnabled()) {
      throw new KnowledgeStationAPIError(
        'Knowledge Station is not enabled or properly configured',
        'NOT_ENABLED',
        { enabled: this.config.enabled, hasToken: !!this.config.token }
      )
    }

    const q = request.query?.trim()
    const limit = Math.min(Math.max(request.limit ?? 10, 1), 25)

    if (!q || q.length < 2) {
      throw new KnowledgeStationAPIError('Query must be at least 2 characters', 'INVALID_QUERY')
    }

    // Assume upstream endpoint shape; adjust as needed to your KS API
    const queryParams = new URLSearchParams({ q, limit: String(limit) })
    const response = await this.makeRequest<{ stations?: Array<{ crs?: string; code?: string; name?: string; region?: string }> } | Array<{ crs?: string; code?: string; name?: string; region?: string }>>(`/stations/search?${queryParams.toString()}`)

    const items: Array<{ crs?: string; code?: string; name?: string; region?: string }> = Array.isArray(response)
      ? response
      : response?.stations || []

    return items
      .filter(Boolean)
      .map((s) => ({
        code: s.crs || s.code || '',
        name: s.name || '',
        region: s.region,
      }))
      .filter((s: StationSummary) => s.code !== '' && s.name !== '')
  }

  /**
   * Get data source status
   */
  async getStatus(): Promise<DataSourceStatus['knowledgeStation']> {
    const startTime = Date.now()

    try {
      // Make a simple health check request
      await this.makeRequest('/health')

      return {
        available: true,
        enabled: this.isEnabled(),
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        available: false,
        enabled: this.isEnabled(),
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
      }
    }
  }

  /**
   * Transform Knowledge Station station data to our format
   */
  private transformStationInfo(rawData: KnowledgeStationStation): EnhancedStationInfo {
    return {
      crs: rawData.crs,
      name: rawData.name,
      region: rawData.region,
      operator: rawData.operator,
      coordinates:
        rawData.latitude && rawData.longitude
          ? {
              latitude: rawData.latitude,
              longitude: rawData.longitude,
            }
          : undefined,
      facilities: rawData.facilities || [],
      accessibility: rawData.accessibility || {
        wheelchairAccess: false,
        assistanceAvailable: false,
        audioAnnouncements: false,
        inductionLoop: false,
      },
      contacts: rawData.contacts || {},
      lastUpdated: new Date(),
    }
  }

  /**
   * Transform Knowledge Station service data to our format
   */
  private transformServiceTracking(rawData: KnowledgeStationService): ServiceTracking {
    return {
      uid: rawData.uid,
      headcode: rawData.headcode,
      serviceType: rawData.serviceType,
      operator: rawData.operator,
      operatorCode: rawData.operatorCode,
      route: {
        origin: {
          name: rawData.origin.name,
          crs: rawData.origin.crs,
        },
        destination: {
          name: rawData.destination.name,
          crs: rawData.destination.crs,
        },
      },
      currentLocation:
        rawData.locations && rawData.locations.length > 0
          ? {
              name: rawData.locations[0].name,
              crs: rawData.locations[0].crs,
              platform: rawData.locations[0].platform,
              estimatedDeparture: rawData.locations[0].scheduledDeparture,
              actualDeparture: rawData.locations[0].actualDeparture,
            }
          : undefined,
      nextStops:
        rawData.locations?.slice(1, 4).map((location) => ({
          name: location.name,
          crs: location.crs,
          scheduledArrival: location.scheduledArrival,
          estimatedArrival: location.actualArrival || location.scheduledArrival,
          platform: location.platform,
        })) || [],
      status: rawData.status,
      lastUpdated: new Date(rawData.updated),
    }
  }

  /**
   * Transform Knowledge Station disruption data to our format
   */
  private transformDisruption(rawData: KnowledgeStationDisruption): DisruptionInfo {
    return {
      id: rawData.id,
      title: rawData.title,
      description: rawData.description,
      severity: rawData.severity,
      category: rawData.category,
      status: rawData.status,
      timeframe: {
        created: new Date(rawData.created),
        validFrom: rawData.validFrom ? new Date(rawData.validFrom) : undefined,
        validTo: rawData.validTo ? new Date(rawData.validTo) : undefined,
      },
      impact: {
        services: rawData.affectedServices || [],
        operators: rawData.affectedOperators || [],
        routes: rawData.affectedRoutes || [],
      },
      alternativeArrangements: rawData.alternativeArrangements,
      lastUpdated: new Date(rawData.updated),
      source: rawData.source,
    }
  }

  /**
   * Test connection to Knowledge Station API
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled()) {
      return false
    }

    try {
      const status = await this.getStatus()
      return status.available
    } catch (error) {
      console.error('Knowledge Station connection test failed:', error)
      return false
    }
  }
}

// Singleton instance for the application
let knowledgeStationClient: KnowledgeStationClient | null = null

export function getKnowledgeStationClient(): KnowledgeStationClient {
  if (!knowledgeStationClient) {
    const apiUrl = process.env.KNOWLEDGE_STATION_API_URL
    const token = process.env.KNOWLEDGE_STATION_API_TOKEN
    const enabled = process.env.KNOWLEDGE_STATION_ENABLED !== 'false'

    // Even if not properly configured, create the client (it will check enabled state internally)
    const config: KnowledgeStationConfig = {
      apiUrl: apiUrl || '',
      token: token || '',
      enabled,
    }

    knowledgeStationClient = new KnowledgeStationClient(config)
  }

  return knowledgeStationClient
}

export default KnowledgeStationClient
