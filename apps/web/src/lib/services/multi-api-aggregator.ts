// Multi-API Aggregator Service
// Combines data from Darwin, Network Rail, Knowledge Station, and National Rail APIs
// Provides intelligent data merging and conflict resolution

import { getDarwinClient } from '@/lib/darwin/client'
import { getNetworkRailClient } from '@/lib/network-rail/client'
import { getKnowledgeStationClient } from '@/lib/knowledge-station/client'
import { getNationalRailClient } from '@/lib/national-rail/client'
import { LiveStationBoard, LiveDeparture, TrainServiceDetails } from '@/lib/darwin/types'
import { EnhancedStationInfo, DisruptionInfo } from '@/lib/knowledge-station/types'
import { EnhancedTrainService, TrainMovement } from '@/lib/network-rail/types'

export interface MultiAPIRequest {
  crs: string
  numRows?: number
  filterCrs?: string
  filterType?: 'to' | 'from'
  timeOffset?: number
  timeWindow?: number
  includeEnhancedData?: boolean
  includeHistoricalData?: boolean
  includeRealTimePosition?: boolean
}

export interface EnhancedDeparture extends LiveDeparture {
  // Network Rail enhancements
  realTimePosition?: {
    stanox: string
    berth?: string
    lastUpdate: Date
  }
  movements?: TrainMovement[]

  // Knowledge Station enhancements
  facilityAlerts?: string[]
  accessibilityInfo?: any

  // Aggregated data quality
  dataQuality: {
    darwinFresh: boolean
    networkRailFresh: boolean
    knowledgeStationFresh: boolean
    confidence: number // 0-100
  }
}

export interface AggregatedStationBoard {
  stationName: string
  stationCode: string
  departures: EnhancedDeparture[]
  generatedAt: string

  // Data source information
  dataSources: {
    primary: string
    enhanced: string[]
    failed: string[]
  }

  // Enhanced station information
  stationInfo?: EnhancedStationInfo
  disruptions?: DisruptionInfo[]

  // Data quality metrics
  dataQuality: {
    overall: number
    realTimeAccuracy: number
    completeness: number
  }

  // Metadata
  metadata: {
    cacheHit: boolean
    processingTime: number
    apiCallsUsed: number
  }
}

export class MultiAPIAggregator {
  private darwinClient = getDarwinClient()
  private networkRailClient = getNetworkRailClient()
  private knowledgeStationClient = getKnowledgeStationClient()
  private nationalRailClient = getNationalRailClient()

  // Cache for reducing API calls
  private cache = new Map<string, { data: any; expires: number }>()
  private readonly cacheTimeout = 30000 // 30 seconds

  /**
   * Get enhanced departure board with data from multiple APIs
   */
  async getDepartures(request: MultiAPIRequest): Promise<AggregatedStationBoard> {
    const startTime = Date.now()
    const cacheKey = this.generateCacheKey('departures', request)

    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      cached.metadata.cacheHit = true
      return cached
    }

    const dataSources = {
      primary: 'darwin',
      enhanced: [] as string[],
      failed: [] as string[],
    }

    let apiCallsUsed = 0

    try {
      // 1. Get primary data from Darwin (user's preferred source)
      const darwinBoard = await this.darwinClient.getStationBoard({
        crs: request.crs,
        numRows: request.numRows || 10,
        filterCrs: request.filterCrs,
        filterType: request.filterType,
        timeOffset: request.timeOffset,
        timeWindow: request.timeWindow,
      })

      apiCallsUsed++

      // 2. Initialize enhanced departures
      const enhancedDepartures: EnhancedDeparture[] = darwinBoard.departures.map((dep) => ({
        ...dep,
        realTimePosition: undefined,
        movements: undefined,
        facilityAlerts: undefined,
        accessibilityInfo: undefined,
        dataQuality: {
          darwinFresh: true,
          networkRailFresh: false,
          knowledgeStationFresh: false,
          confidence: 75, // Base confidence from Darwin
        },
      }))

      // 3. Enhance with Network Rail data if requested
      if (request.includeRealTimePosition && this.networkRailClient) {
        try {
          await this.enhanceWithNetworkRail(enhancedDepartures)
          dataSources.enhanced.push('network-rail')
          apiCallsUsed++
        } catch (error) {
          console.warn('Network Rail enhancement failed:', error)
          dataSources.failed.push('network-rail')
        }
      }

      // 4. Enhance with Knowledge Station data if requested
      let stationInfo: EnhancedStationInfo | undefined
      let disruptions: DisruptionInfo[] | undefined

      if (request.includeEnhancedData && this.knowledgeStationClient.isEnabled()) {
        try {
          const [stationData, disruptionData] = await Promise.allSettled([
            this.knowledgeStationClient.getStationInfo({ crs: request.crs }),
            this.knowledgeStationClient.getDisruptions({ limit: 10 }),
          ])

          if (stationData.status === 'fulfilled') {
            stationInfo = stationData.value
            dataSources.enhanced.push('knowledge-station')
          }

          if (disruptionData.status === 'fulfilled') {
            disruptions = disruptionData.value.filter((d) =>
              d.impact.routes.some((r) => r.origin === request.crs || r.destination === request.crs)
            )
          }

          apiCallsUsed += 2
        } catch (error) {
          console.warn('Knowledge Station enhancement failed:', error)
          dataSources.failed.push('knowledge-station')
        }
      }

      // 5. Calculate data quality metrics
      const dataQuality = this.calculateDataQuality(enhancedDepartures)

      // 6. Build aggregated response
      const aggregatedBoard: AggregatedStationBoard = {
        stationName: darwinBoard.stationName,
        stationCode: darwinBoard.stationCode,
        departures: enhancedDepartures,
        generatedAt: darwinBoard.generatedAt,
        dataSources,
        stationInfo,
        disruptions,
        dataQuality,
        metadata: {
          cacheHit: false,
          processingTime: Date.now() - startTime,
          apiCallsUsed,
        },
      }

      // Cache the result
      this.setCache(cacheKey, aggregatedBoard)

      return aggregatedBoard
    } catch (error) {
      console.error('Multi-API aggregation failed:', error)
      // Re-throw the original error so API routes can return structured errors
      throw error
    }
  }

  /**
   * Enhance departures with Network Rail real-time position data
   */
  private async enhanceWithNetworkRail(departures: EnhancedDeparture[]): Promise<void> {
    for (const departure of departures) {
      try {
        if (departure.serviceID) {
          const networkRailService = await this.networkRailClient.getEnhancedTrainService(
            departure.serviceID
          )

          if (networkRailService) {
            departure.realTimePosition = networkRailService.currentLocation
              ? {
                  stanox: networkRailService.currentLocation.stanox,
                  berth: networkRailService.currentLocation.berth,
                  lastUpdate: networkRailService.lastUpdated,
                }
              : undefined

            departure.movements = networkRailService.movements
            departure.dataQuality.networkRailFresh = true
            departure.dataQuality.confidence = Math.min(departure.dataQuality.confidence + 15, 100)
          }
        }
      } catch (error) {
        console.warn(
          `Failed to enhance departure ${departure.serviceID} with Network Rail data:`,
          error
        )
      }
    }
  }

  /**
   * Calculate overall data quality metrics
   */
  private calculateDataQuality(departures: EnhancedDeparture[]): {
    overall: number
    realTimeAccuracy: number
    completeness: number
  } {
    if (departures.length === 0) {
      return { overall: 0, realTimeAccuracy: 0, completeness: 0 }
    }

    const totalConfidence = departures.reduce((sum, dep) => sum + dep.dataQuality.confidence, 0)
    const overall = Math.round(totalConfidence / departures.length)

    const withRealTime = departures.filter((dep) => dep.realTimePosition || dep.movements).length
    const realTimeAccuracy = Math.round((withRealTime / departures.length) * 100)

    const withCompleteData = departures.filter((dep) => dep.std && dep.etd && dep.platform).length
    const completeness = Math.round((withCompleteData / departures.length) * 100)

    return {
      overall,
      realTimeAccuracy,
      completeness,
    }
  }

  /**
   * Generate cache key for requests
   */
  private generateCacheKey(type: string, request: any): string {
    const key = `${type}:${JSON.stringify(request)}`
    return key
  }

  /**
   * Get data from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }
    if (cached) {
      this.cache.delete(key)
    }
    return null
  }

  /**
   * Set data in cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.cacheTimeout,
    })
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (value.expires <= now) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Get service status from all APIs
   */
  async getServiceStatus(): Promise<{
    darwin: { available: boolean; responseTime: number }
    networkRail: { available: boolean; responseTime: number }
    knowledgeStation: { available: boolean; responseTime: number }
  }> {
    const [darwinStatus, networkRailStatus, ksStatus] = await Promise.allSettled([
      this.testDarwinConnection(),
      this.testNetworkRailConnection(),
      this.testKnowledgeStationConnection(),
    ])

    return {
      darwin:
        darwinStatus.status === 'fulfilled'
          ? darwinStatus.value
          : { available: false, responseTime: 0 },
      networkRail:
        networkRailStatus.status === 'fulfilled'
          ? networkRailStatus.value
          : { available: false, responseTime: 0 },
      knowledgeStation:
        ksStatus.status === 'fulfilled' ? ksStatus.value : { available: false, responseTime: 0 },
    }
  }

  private async testDarwinConnection(): Promise<{ available: boolean; responseTime: number }> {
    const startTime = Date.now()
    try {
      await this.darwinClient.testConnection()
      return { available: true, responseTime: Date.now() - startTime }
    } catch {
      return { available: false, responseTime: Date.now() - startTime }
    }
  }

  private async testNetworkRailConnection(): Promise<{ available: boolean; responseTime: number }> {
    const startTime = Date.now()
    try {
      const available = await this.networkRailClient.testConnection()
      return { available, responseTime: Date.now() - startTime }
    } catch {
      return { available: false, responseTime: Date.now() - startTime }
    }
  }

  private async testKnowledgeStationConnection(): Promise<{
    available: boolean
    responseTime: number
  }> {
    const startTime = Date.now()
    try {
      const available = await this.knowledgeStationClient.testConnection()
      return { available, responseTime: Date.now() - startTime }
    } catch {
      return { available: false, responseTime: Date.now() - startTime }
    }
  }
}

// Singleton instance
let multiAPIAggregator: MultiAPIAggregator | null = null

export function getMultiAPIAggregator(): MultiAPIAggregator {
  if (!multiAPIAggregator) {
    multiAPIAggregator = new MultiAPIAggregator()
  }
  return multiAPIAggregator
}

export default MultiAPIAggregator
