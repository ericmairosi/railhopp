// National Rail API Client for Disruptions and Service Information
// Handles disruption feeds and additional National Rail services

import {
  NationalRailConfig,
  NationalRailDisruption,
  ServicePerformanceMetrics,
  NationalRailStationFacilities,
  TimetableChange,
  NationalRailAPIError,
  NationalRailStatus,
  NationalRailResponse,
} from './types'

export class NationalRailClient {
  private config: NationalRailConfig
  private baseHeaders: Record<string, string>

  constructor(config: NationalRailConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      ...config,
    }

    this.baseHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Railhopp-NationalRail-Client/1.0',
      'X-API-Key': this.config.apiKey,
    }
  }

  /**
   * Check if National Rail API is enabled and configured
   */
  isEnabled(): boolean {
    return Boolean(
      this.config.apiKey &&
        this.config.apiUrl &&
        this.config.apiKey !== 'your_national_rail_api_key'
    )
  }

  /**
   * Get current service disruptions
   */
  async getDisruptions(
    options: {
      severity?: 'Minor' | 'Moderate' | 'Severe' | 'Critical'
      operators?: string[]
      limit?: number
    } = {}
  ): Promise<NationalRailDisruption[]> {
    try {
      const queryParams = new URLSearchParams()

      if (options.severity) queryParams.append('severity', options.severity)
      if (options.limit) queryParams.append('limit', options.limit.toString())
      if (options.operators) {
        options.operators.forEach((op) => queryParams.append('operators', op))
      }

      const response = await this.makeRequest<{ disruptions?: unknown[] }>(`/disruptions?${queryParams.toString()}`)

      return this.transformDisruptions(response.data?.disruptions || [])
    } catch (error) {
      throw new NationalRailAPIError(
        'Failed to fetch disruptions from National Rail API',
        'DISRUPTION_REQUEST_ERROR',
        error
      )
    }
  }

  /**
   * Get service performance metrics for operators
   */
  async getServicePerformance(
    operatorCode: string,
    startDate: string,
    endDate: string
  ): Promise<ServicePerformanceMetrics | null> {
    type PerformanceEnvelope = {
      performance?: {
        operator_code: string
        operator_name: string
        period: { start_date: string; end_date: string }
        metrics: {
          punctuality: number
          reliability: number
          customer_satisfaction?: number
          total_services: number
          on_time_services: number
          cancelled_services: number
          delayed_services: number
        }
      }
    }
    try {
      const response = await this.makeRequest<PerformanceEnvelope>(
        `/performance/${operatorCode}?start=${startDate}&end=${endDate}`
      )

      if (!response.data?.performance) {
        return null
      }

      return {
        operatorCode: response.data.performance.operator_code,
        operatorName: response.data.performance.operator_name,
        period: {
          startDate: response.data.performance.period.start_date,
          endDate: response.data.performance.period.end_date,
        },
        performance: {
          punctuality: response.data.performance.metrics.punctuality,
          reliability: response.data.performance.metrics.reliability,
          customerSatisfaction: response.data.performance.metrics.customer_satisfaction,
        },
        metrics: {
          totalServices: response.data.performance.metrics.total_services,
          onTimeServices: response.data.performance.metrics.on_time_services,
          cancelledServices: response.data.performance.metrics.cancelled_services,
          delayedServices: response.data.performance.metrics.delayed_services,
        },
      }
    } catch (error) {
      throw new NationalRailAPIError(
        'Failed to fetch service performance metrics',
        'PERFORMANCE_REQUEST_ERROR',
        error
      )
    }
  }

  /**
   * Get station facilities information
   */
  async getStationFacilities(crs: string): Promise<NationalRailStationFacilities | null> {
    try {
      const response = await this.makeRequest<{ station?: unknown }>(`/stations/${crs.toUpperCase()}/facilities`)

      if (!response.data?.station) {
        return null
      }

      return this.transformStationFacilities(response.data.station)
    } catch (error) {
      throw new NationalRailAPIError(
        'Failed to fetch station facilities',
        'FACILITIES_REQUEST_ERROR',
        error
      )
    }
  }

  /**
   * Get timetable changes
   */
  async getTimetableChanges(
    options: {
      from?: string
      to?: string
      effectiveFrom?: string
    } = {}
  ): Promise<TimetableChange[]> {
    try {
      const queryParams = new URLSearchParams()

      if (options.from) queryParams.append('from', options.from)
      if (options.to) queryParams.append('to', options.to)
      if (options.effectiveFrom) queryParams.append('effective_from', options.effectiveFrom)

      const response = await this.makeRequest<{ changes?: unknown[] }>(`/timetable/changes?${queryParams.toString()}`)

      const mapChangeType = (v: unknown): TimetableChange['changeType'] => {
        const s = String(v ?? '')
        if (s === 'New Service') return 'New Service'
        if (s === 'Service Withdrawal') return 'Service Withdrawal'
        if (s === 'Timing Change') return 'Timing Change'
        if (s === 'Route Change') return 'Route Change'
        return 'Timing Change'
      }

      return (response.data?.changes || []).map((changeUnknown) => {
        const change = (changeUnknown || {}) as Record<string, unknown>
        return {
          changeId: String(change.change_id ?? ''),
          title: String(change.title ?? ''),
          description: String(change.description ?? ''),
          effectiveFrom: String(change.effective_from ?? ''),
          effectiveTo: change.effective_to ? String(change.effective_to) : undefined,
          changeType: mapChangeType(change.change_type),
          affectedServices: Array.isArray(change.affected_services)
            ? (change.affected_services as unknown[]).map((svc) => {
                const s = (svc || {}) as Record<string, unknown>
                return {
                  operatorCode: String(s.operator_code ?? ''),
                  serviceNumber: s.service_number ? String(s.service_number) : undefined,
                  routeDescription: String(s.route_description ?? ''),
                }
              })
            : [],
          publishedDate: String(change.published_date ?? ''),
        }
      }) as TimetableChange[]
    } catch (error) {
      throw new NationalRailAPIError(
        'Failed to fetch timetable changes',
        'TIMETABLE_REQUEST_ERROR',
        error
      )
    }
  }

  /**
   * Get API status and health
   */
  async getStatus(): Promise<NationalRailStatus> {
    const startTime = Date.now()

    try {
      type HealthPayload = {
        limits?: { hourly_limit: number; remaining: number; reset_time: string }
        services?: {
          disruptions?: boolean
          facilities?: boolean
          performance?: boolean
          timetables?: boolean
        }
      }
      const response = await this.makeRequest<HealthPayload>('/health')

      return {
        available: Boolean(response.success),
        lastHealthCheck: new Date(),
        responseTime: Date.now() - startTime,
        apiLimits: {
          hourlyLimit: response.data?.limits?.hourly_limit || 1000,
          remaining: response.data?.limits?.remaining || 1000,
          resetTime: new Date(response.data?.limits?.reset_time || Date.now() + 3600000),
        },
        services: {
          disruptions: Boolean(response.data?.services?.disruptions),
          facilities: Boolean(response.data?.services?.facilities),
          performance: Boolean(response.data?.services?.performance),
          timetables: Boolean(response.data?.services?.timetables),
        },
      }
    } catch (error) {
      return {
        available: false,
        lastHealthCheck: new Date(),
        responseTime: Date.now() - startTime,
        apiLimits: {
          hourlyLimit: 1000,
          remaining: 0,
          resetTime: new Date(Date.now() + 3600000),
        },
        services: {
          disruptions: false,
          facilities: false,
          performance: false,
          timetables: false,
        },
      }
    }
  }

  /**
   * Test connection to National Rail API
   */
  async testConnection(): Promise<boolean> {
    try {
      const status = await this.getStatus()
      return status.available
    } catch (error) {
      console.error('National Rail connection test failed:', error)
      return false
    }
  }

  /**
   * Make HTTP request to National Rail API
   */
  private async makeRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<NationalRailResponse<T>> {
    if (!this.isEnabled()) {
      throw new NationalRailAPIError(
        'National Rail API is not enabled or properly configured',
        'NOT_ENABLED',
        { enabled: !!this.config.apiKey, hasApiKey: !!this.config.apiKey }
      )
    }

    const url = `${this.config.apiUrl}${endpoint}`
    const requestOptions: RequestInit = {
      headers: {
        ...this.baseHeaders,
        ...options.headers,
      },
      ...options,
    }

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
          throw new NationalRailAPIError(
            `HTTP ${response.status}: ${response.statusText}`,
            'HTTP_ERROR',
            { status: response.status, body: errorBody, url }
          )
        }

        const data = (await response.json()) as T
        return {
          success: true,
          data,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: response.headers.get('x-request-id') || undefined,
            rateLimit: {
              remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
              resetTime: response.headers.get('x-ratelimit-reset') || new Date().toISOString(),
            },
          },
        }
      } catch (error) {
        lastError = error

        if (error instanceof NationalRailAPIError) {
          throw error
        }

        if (attempt === maxRetries) {
          throw new NationalRailAPIError(
            `Failed to connect to National Rail API after ${maxRetries} attempts`,
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
   * Transform raw disruption data to our format
   */
  private transformDisruptions(rawDisruptions: unknown[]): NationalRailDisruption[] {
    return rawDisruptions.map((discUnknown) => {
      const d = (discUnknown || {}) as Record<string, unknown>
      const routes = Array.isArray(d.affected_routes) ? (d.affected_routes as unknown[]) : []
      return {
        incidentNumber: String(d.incident_number ?? ''),
        incidentTitle: String(d.incident_title ?? ''),
        incidentSummary: String(d.incident_summary ?? ''),
        incidentDescription: String(d.incident_description ?? ''),
        incidentStatus: String(d.incident_status ?? '' as any) as NationalRailDisruption['incidentStatus'],
        incidentType: String(d.incident_type ?? '' as any) as NationalRailDisruption['incidentType'],
        severity: String(d.severity ?? '' as any) as NationalRailDisruption['severity'],
        startTime: String(d.start_time ?? ''),
        endTime: d.end_time ? String(d.end_time) : undefined,
        lastUpdated: String(d.last_updated ?? ''),
        affectedOperators: Array.isArray(d.affected_operators)
          ? (d.affected_operators as unknown[]).map((x) => String(x)).filter(Boolean)
          : [],
        affectedRoutes: routes.map((routeUnknown) => {
          const r = (routeUnknown || {}) as Record<string, unknown>
          const from = (r.from_station || {}) as Record<string, unknown>
          const to = (r.to_station || {}) as Record<string, unknown>
          return {
            routeName: String(r.route_name ?? ''),
            fromStation: {
              name: String(from.name ?? ''),
              crs: String(from.crs ?? ''),
            },
            toStation: {
              name: String(to.name ?? ''),
              crs: String(to.crs ?? ''),
            },
            direction: (r.direction as any) as 'Both' | 'Inbound' | 'Outbound' | undefined,
          }
        }),
        alternativeTransport: d.alternative_transport ? String(d.alternative_transport) : undefined,
        passengerAdvice: String(d.passenger_advice ?? ''),
        url: d.url ? String(d.url) : undefined,
      }
    })
  }

  /**
   * Transform station facilities data to our format
   */
  private transformStationFacilities(rawDataUnknown: unknown): NationalRailStationFacilities {
    const rawData = (rawDataUnknown || {}) as Record<string, unknown>
    const facilities = (rawData.facilities || {}) as Record<string, unknown>
    const accessibility = (rawData.accessibility || {}) as Record<string, unknown>
    const staffing = (rawData.staffing || {}) as Record<string, unknown>

    return {
      crs: String(rawData.crs ?? ''),
      stationName: String(rawData.station_name ?? ''),
      facilities: {
        ticketOffice: Boolean(facilities.ticket_office),
        waitingRoom: Boolean(facilities.waiting_room),
        toilets: Boolean(facilities.toilets),
        disabledToilets: Boolean(facilities.disabled_toilets),
        babyChanging: Boolean(facilities.baby_changing),
        wifi: Boolean(facilities.wifi),
        refreshments: Boolean(facilities.refreshments),
        parking: Boolean(facilities.parking),
        carPark: Boolean(facilities.car_park),
        bicycleStorage: Boolean(facilities.bicycle_storage),
        taxiRank: Boolean(facilities.taxi_rank),
        busStop: Boolean(facilities.bus_stop),
        helpPoint: Boolean(facilities.help_point),
        payphone: Boolean(facilities.payphone),
        postBox: Boolean(facilities.post_box),
        cashMachine: Boolean(facilities.cash_machine),
      },
      accessibility: {
        stepFreeAccess: Boolean(accessibility.step_free_access),
        wheelchairAccessible: Boolean(accessibility.wheelchair_accessible),
        assistedBoardingAvailable: Boolean(accessibility.assisted_boarding_available),
        inductionLoop: Boolean(accessibility.induction_loop),
        largePrintTimetables: Boolean(accessibility.large_print_timetables),
      },
      staffing: {
        staffed: Boolean(staffing.staffed),
        staffingHours: staffing.staffing_hours ? String(staffing.staffing_hours) : undefined,
      },
      lastUpdated: String(rawData.last_updated ?? new Date().toISOString()),
    }
  }
}

// Singleton instance for the application
let nationalRailClient: NationalRailClient | null = null

export function getNationalRailClient(): NationalRailClient {
  if (!nationalRailClient) {
    const config: NationalRailConfig = {
      apiKey: process.env.NATIONAL_RAIL_API_KEY || '',
      apiUrl: process.env.NATIONAL_RAIL_API_URL || 'https://api.nationalrail.co.uk/api',
    }

    nationalRailClient = new NationalRailClient(config)
  }

  return nationalRailClient
}

export default NationalRailClient
