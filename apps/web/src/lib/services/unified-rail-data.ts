// Unified Rail Data Service
// Combines Darwin API (primary) with Knowledge Station API (enhancement)
// Prioritizes Darwin data as per user preference, enriches with Knowledge Station where beneficial

import { getDarwinClient } from '@/lib/darwin/client'
import { getKnowledgeStationClient } from '@/lib/knowledge-station/client'
import { LiveStationBoard, LiveDeparture, TrainServiceDetails } from '@/lib/darwin/types'
import {
  EnhancedStationInfo,
  DisruptionInfo,
  ServiceTracking,
  EnhancedServiceInfo,
  DataSourceStatus,
  KnowledgeStationAPIError,
} from '@/lib/knowledge-station/types'

export interface UnifiedStationBoardRequest {
  crs: string
  numRows?: number
  filterCrs?: string
  filterType?: 'to' | 'from'
  timeOffset?: number
  timeWindow?: number
  // Knowledge Station enhancements
  includeStationInfo?: boolean
  includeDisruptions?: boolean
}

export interface EnhancedStationBoard extends LiveStationBoard {
  // Enhanced data from Knowledge Station (optional)
  stationInfo?: EnhancedStationInfo
  disruptions?: DisruptionInfo[]
  dataSource: 'darwin' | 'combined'
  knowledgeStationAvailable: boolean
}

export interface UnifiedServiceDetailsRequest {
  serviceId: string
  // Knowledge Station enhancements
  includeTracking?: boolean
  includeDisruptions?: boolean
}

export interface EnhancedServiceDetails extends TrainServiceDetails {
  // Enhanced data from Knowledge Station (optional)
  tracking?: ServiceTracking
  disruptions?: DisruptionInfo[]
  dataSource: 'darwin' | 'combined'
  knowledgeStationAvailable: boolean
}

export class UnifiedRailDataService {
  private darwinClient = getDarwinClient()
  private knowledgeStationClient = getKnowledgeStationClient()

  /**
   * Get comprehensive station board data
   * Uses Darwin as primary source, enriches with Knowledge Station data
   */
  async getEnhancedStationBoard(
    request: UnifiedStationBoardRequest
  ): Promise<EnhancedStationBoard> {
    const crs = request.crs.toUpperCase()

    // Always get Darwin data first (as per user preference)
    const darwinBoard = await this.darwinClient.getStationBoard({
      crs,
      numRows: request.numRows,
      filterCrs: request.filterCrs,
      filterType: request.filterType,
      timeOffset: request.timeOffset,
      timeWindow: request.timeWindow,
    })

    const knowledgeStationAvailable = this.knowledgeStationClient.isEnabled()
    const enhancedBoard: EnhancedStationBoard = {
      ...darwinBoard,
      dataSource: 'darwin',
      knowledgeStationAvailable,
    }

    // If Knowledge Station is available, enrich the data
    if (knowledgeStationAvailable) {
      try {
        const enhancements = await Promise.allSettled([
          // Get station info if requested
          request.includeStationInfo
            ? this.knowledgeStationClient.getStationInfo({
                crs,
                includeServices: false,
                includeDisruptions: false,
              })
            : null,
          // Get disruptions if requested
          request.includeDisruptions
            ? this.knowledgeStationClient.getDisruptions({
                limit: 10,
                severity: 'medium', // Focus on medium+ severity
              })
            : null,
        ])

        // Add station info if available
        const stationInfoResult = enhancements[0]
        if (stationInfoResult.status === 'fulfilled' && stationInfoResult.value) {
          enhancedBoard.stationInfo = stationInfoResult.value
        }

        // Add disruptions if available
        const disruptionsResult = enhancements[1]
        if (disruptionsResult.status === 'fulfilled' && disruptionsResult.value) {
          // Filter disruptions that might affect this station
          const relevantDisruptions = disruptionsResult.value.filter(
            (disruption) =>
              disruption.impact.routes.some(
                (route) => route.origin === crs || route.destination === crs
              ) || disruption.impact.operators.length === 0 // Network-wide disruptions
          )
          enhancedBoard.disruptions = relevantDisruptions
        }

        // Mark as combined data if we successfully enriched
        if (enhancedBoard.stationInfo || enhancedBoard.disruptions) {
          enhancedBoard.dataSource = 'combined'
        }
      } catch (error) {
        console.warn('Failed to enrich station board with Knowledge Station data:', error)
        // Continue with Darwin-only data
      }
    }

    return enhancedBoard
  }

  /**
   * Get comprehensive service details
   * Uses Darwin as primary source, enriches with Knowledge Station data
   */
  async getEnhancedServiceDetails(
    request: UnifiedServiceDetailsRequest
  ): Promise<EnhancedServiceDetails> {
    // Always get Darwin data first (as per user preference)
    const darwinDetails = await this.darwinClient.getServiceDetails(request.serviceId)
    if (!darwinDetails) {
      throw new Error('Darwin service details not found')
    }

    const knowledgeStationAvailable = this.knowledgeStationClient.isEnabled()
    const enhancedDetails: EnhancedServiceDetails = {
      ...darwinDetails,
      dataSource: 'darwin',
      knowledgeStationAvailable,
    }

    // If Knowledge Station is available, enrich the data
    if (knowledgeStationAvailable) {
      try {
        const enhancements = await Promise.allSettled([
          // Get tracking info if requested
          request.includeTracking
            ? this.knowledgeStationClient.getServiceTracking({
                serviceId: request.serviceId,
                uid: darwinDetails.trainid || request.serviceId,
              })
            : null,
          // Get disruptions if requested
          request.includeDisruptions
            ? this.knowledgeStationClient.getDisruptions({
                affectedServices: [request.serviceId],
                limit: 5,
              })
            : null,
        ])

        // Add tracking info if available
        const trackingResult = enhancements[0]
        if (trackingResult.status === 'fulfilled' && trackingResult.value) {
          enhancedDetails.tracking = trackingResult.value
        }

        // Add disruptions if available
        const disruptionsResult = enhancements[1]
        if (disruptionsResult.status === 'fulfilled' && disruptionsResult.value) {
          enhancedDetails.disruptions = disruptionsResult.value
        }

        // Mark as combined data if we successfully enriched
        if (enhancedDetails.tracking || enhancedDetails.disruptions) {
          enhancedDetails.dataSource = 'combined'
        }
      } catch (error) {
        console.warn('Failed to enrich service details with Knowledge Station data:', error)
        // Continue with Darwin-only data
      }
    }

    return enhancedDetails
  }

  /**
   * Get comprehensive data source status
   */
  async getDataSourceStatus(): Promise<DataSourceStatus> {
    const [darwinAvailable, knowledgeStationStatus] = await Promise.allSettled([
      this.darwinClient.testConnection(),
      this.knowledgeStationClient.getStatus(),
    ])

    return {
      darwin: {
        available: darwinAvailable.status === 'fulfilled' ? darwinAvailable.value : false,
        lastCheck: new Date(),
        responseTime: undefined, // Could be enhanced with timing
      },
      knowledgeStation:
        knowledgeStationStatus.status === 'fulfilled'
          ? knowledgeStationStatus.value
          : {
              available: false,
              enabled: this.knowledgeStationClient.isEnabled(),
              lastCheck: new Date(),
              responseTime: undefined,
            },
    }
  }

  /**
   * Get station information with fallback strategy
   * Tries Knowledge Station first for detailed info, falls back to basic Darwin data
   */
  async getStationInfo(crs: string): Promise<EnhancedStationInfo | null> {
    const normalizedCrs = crs.toUpperCase()

    // Try Knowledge Station first for detailed station info
    if (this.knowledgeStationClient.isEnabled()) {
      try {
        return await this.knowledgeStationClient.getStationInfo({
          crs: normalizedCrs,
          includeServices: false,
          includeDisruptions: false,
        })
      } catch (error) {
        console.warn('Knowledge Station station info failed, trying Darwin:', error)
      }
    }

    // Fallback: try to get basic info from Darwin departure board
    try {
      const board = await this.darwinClient.getStationBoard({
        crs: normalizedCrs,
        numRows: 1,
      })

      return {
        crs: board.stationCode,
        name: board.stationName,
        facilities: [],
        accessibility: {
          wheelchairAccess: false,
          assistanceAvailable: false,
          audioAnnouncements: false,
          inductionLoop: false,
        },
        contacts: {},
        lastUpdated: new Date(board.generatedAt),
      }
    } catch (error) {
      console.warn('Failed to get station info from both sources:', error)
      return null
    }
  }

  /**
   * Get active disruptions with intelligent filtering
   */
  async getRelevantDisruptions(
    options: {
      crs?: string
      serviceIds?: string[]
      severity?: 'low' | 'medium' | 'high'
      limit?: number
    } = {}
  ): Promise<DisruptionInfo[]> {
    if (!this.knowledgeStationClient.isEnabled()) {
      return []
    }

    try {
      const allDisruptions = await this.knowledgeStationClient.getDisruptions({
        severity: options.severity || 'medium',
        limit: options.limit || 20,
      })

      // Filter disruptions based on relevance
      return allDisruptions.filter((disruption) => {
        // If specific station requested, check if it's affected
        if (options.crs) {
          const affectsStation = disruption.impact.routes.some(
            (route) => route.origin === options.crs || route.destination === options.crs
          )
          if (affectsStation) return true
        }

        // If specific services requested, check if they're affected
        if (options.serviceIds && options.serviceIds.length > 0) {
          const affectsService = options.serviceIds.some((serviceId) =>
            disruption.impact.services.includes(serviceId)
          )
          if (affectsService) return true
        }

        // Include network-wide disruptions if no specific filters
        if (!options.crs && !options.serviceIds) {
          return (
            disruption.impact.operators.length === 0 || // Network-wide
            disruption.severity === 'high'
          ) // High severity always relevant
        }

        return false
      })
    } catch (error) {
      console.warn('Failed to get disruptions from Knowledge Station:', error)
      return []
    }
  }

  /**
   * Check if Knowledge Station enhancement is available
   */
  isKnowledgeStationAvailable(): boolean {
    return this.knowledgeStationClient.isEnabled()
  }

  /**
   * Get enhanced service info combining both sources
   */
  async getEnhancedServiceInfo(serviceId: string): Promise<EnhancedServiceInfo | null> {
    try {
      // Get Darwin data as primary
      const darwinDetails = await this.darwinClient.getServiceDetails(serviceId)
      if (!darwinDetails) {
        throw new Error('Darwin service not found')
      }

      const baseServiceInfo: EnhancedServiceInfo = {
        darwinData: {
          serviceId: darwinDetails.serviceID,
          operator: darwinDetails.operator,
          scheduledDeparture:
            darwinDetails.previousCallingPoints?.[0]?.callingPoint?.[0]?.st || '',
          estimatedDeparture:
            darwinDetails.previousCallingPoints?.[0]?.callingPoint?.[0]?.et,
          platform: darwinDetails.platform,
          status: darwinDetails.cancelReason
            ? 'Cancelled'
            : darwinDetails.delayReason
            ? 'Delayed'
            : 'On time',
        },
        dataSource: 'darwin',
        lastUpdated: new Date(),
      }

      // Enhance with Knowledge Station data if available
      if (this.knowledgeStationClient.isEnabled()) {
        try {
          const [tracking, disruptions] = await Promise.allSettled([
            this.knowledgeStationClient.getServiceTracking({ serviceId }),
            this.knowledgeStationClient.getDisruptions({
              affectedServices: [serviceId],
              limit: 3,
            }),
          ])

          const knowledgeStationData: any = {}

          if (tracking.status === 'fulfilled') {
            knowledgeStationData.realTimeTracking = tracking.value
          }

          if (disruptions.status === 'fulfilled') {
            knowledgeStationData.disruptions = disruptions.value
          }

          if (Object.keys(knowledgeStationData).length > 0) {
            baseServiceInfo.knowledgeStationData = knowledgeStationData
            baseServiceInfo.dataSource = 'combined'
          }
        } catch (error) {
          console.warn('Failed to enhance service info with Knowledge Station:', error)
        }
      }

      return baseServiceInfo
    } catch (error) {
      console.error('Failed to get service info:', error)
      return null
    }
  }
}

// Singleton instance
let unifiedRailDataService: UnifiedRailDataService | null = null

export function getUnifiedRailDataService(): UnifiedRailDataService {
  if (!unifiedRailDataService) {
    unifiedRailDataService = new UnifiedRailDataService()
  }
  return unifiedRailDataService
}

export default UnifiedRailDataService
