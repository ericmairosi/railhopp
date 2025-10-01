// Rail Data Aggregator
// Combines data from multiple sources with intelligent merging strategies
// Prioritizes Darwin API as per user preference, enhances with Knowledge Station

import { DataSourceManager } from './data-source-manager'
import { DataSourceAdapter } from './adapters/base'

export interface AggregationStrategy {
  primarySource: string
  fallbackEnabled: boolean
  enhancementEnabled: boolean
  combineMethod: 'merge' | 'override' | 'supplement'
}

export class RailDataAggregator {
  private dataSourceManager: DataSourceManager
  private strategy: AggregationStrategy

  constructor(dataSourceManager: DataSourceManager, strategy?: Partial<AggregationStrategy>) {
    this.dataSourceManager = dataSourceManager
    this.strategy = {
      primarySource: 'darwin', // User preference: Darwin first
      fallbackEnabled: true,
      enhancementEnabled: true,
      combineMethod: 'supplement', // Add Knowledge Station data to Darwin base
      ...strategy,
    }
  }

  /**
   * Get aggregated station information combining multiple sources
   */
  async getAggregatedStationInfo(crs: string): Promise<any> {
    return this.dataSourceManager.executeWithEnhancement(
      // Primary operation (Darwin API)
      async (adapter: DataSourceAdapter) => {
        return await adapter.getStationInfo(crs)
      },
      // Enhancement operation (Knowledge Station)
      async (adapter: DataSourceAdapter) => {
        if (adapter.getName() === 'Knowledge Station') {
          return await adapter.getStationInfo(crs)
        }
        return null
      },
      // Combine results
      (darwinData: any, knowledgeStationData: any) => {
        if (!knowledgeStationData) return darwinData

        return {
          // Darwin data as base (user preference)
          ...darwinData,
          // Enhanced information from Knowledge Station
          facilities: knowledgeStationData.facilities || [],
          accessibility: knowledgeStationData.accessibility || {},
          coordinates: knowledgeStationData.coordinates,
          contacts: knowledgeStationData.contacts || {},
          region: knowledgeStationData.region,
          // Indicate data source combination
          sources: ['darwin', 'knowledge-station'],
          enhanced: true,
        }
      }
    )
  }

  /**
   * Get aggregated departure board with enhancements
   */
  async getAggregatedDepartureBoard(request: any): Promise<any> {
    return this.dataSourceManager.executeWithEnhancement(
      // Primary operation (Darwin API - user preference)
      async (adapter: DataSourceAdapter) => {
        return await adapter.getDepartureBoard(request)
      },
      // Enhancement operation (get relevant disruptions from Knowledge Station)
      async (adapter: DataSourceAdapter) => {
        if (adapter.getName() === 'Knowledge Station') {
          try {
            // Cast to KnowledgeStationAdapter to access specific methods
            const ksAdapter = adapter as any
            if (ksAdapter.getDisruptions) {
              return await ksAdapter.getDisruptions({
                limit: 5,
                severity: 'medium',
              })
            }
          } catch (error) {
            console.warn('Failed to get disruptions for enhancement:', error)
          }
        }
        return null
      },
      // Combine results
      (darwinBoard: any, disruptions: any) => {
        if (!disruptions || disruptions.length === 0) return darwinBoard

        // Filter disruptions relevant to this station
        const relevantDisruptions = disruptions.filter((disruption: any) =>
          disruption.impact.routes.some(
            (route: any) => route.origin === request.crs || route.destination === request.crs
          )
        )

        return {
          ...darwinBoard,
          enhancedDisruptions: relevantDisruptions,
          sources: ['darwin', 'knowledge-station'],
          enhanced: true,
        }
      }
    )
  }

  /**
   * Get aggregated service details with enhanced tracking
   */
  async getAggregatedServiceDetails(serviceId: string): Promise<any> {
    return this.dataSourceManager.executeWithEnhancement(
      // Primary operation (Darwin API service details)
      async (adapter: DataSourceAdapter) => {
        return await adapter.getServiceDetails(serviceId)
      },
      // Enhancement operation (Knowledge Station tracking)
      async (adapter: DataSourceAdapter) => {
        if (adapter.getName() === 'Knowledge Station') {
          try {
            const ksAdapter = adapter as any
            if (ksAdapter.getServiceTracking) {
              return await ksAdapter.getServiceTracking({ serviceId })
            }
          } catch (error) {
            console.warn('Failed to get service tracking for enhancement:', error)
          }
        }
        return null
      },
      // Combine results
      (darwinDetails: any, tracking: any) => {
        if (!tracking) return darwinDetails

        return {
          ...darwinDetails,
          // Add real-time tracking information
          realTimeTracking: {
            currentLocation: tracking.currentLocation,
            nextStops: tracking.nextStops,
            route: tracking.route,
            lastUpdated: tracking.lastUpdated,
          },
          sources: ['darwin', 'knowledge-station'],
          enhanced: true,
        }
      }
    )
  }

  /**
   * Get comprehensive disruption information
   */
  async getAggregatedDisruptions(options: any = {}): Promise<any[]> {
    const results = []

    // Get disruptions from Darwin (NRCC messages)
    try {
      const primaryAdapter = this.dataSourceManager.getPrimaryAdapter()
      if (primaryAdapter && options.crs) {
        const board = await primaryAdapter.getDepartureBoard({
          crs: options.crs,
          numRows: 1,
        })

        if (board.messages && board.messages.length > 0) {
          results.push(
            ...board.messages.map((msg: any) => ({
              ...msg,
              source: 'darwin',
              type: 'station_message',
            }))
          )
        }
      }
    } catch (error) {
      console.warn('Failed to get Darwin messages:', error)
    }

    // Get enhanced disruptions from Knowledge Station
    try {
      const enhancementAdapter = this.dataSourceManager.getEnhancementAdapter()
      if (enhancementAdapter && enhancementAdapter.getName() === 'Knowledge Station') {
        const ksAdapter = enhancementAdapter as any
        if (ksAdapter.getDisruptions) {
          const disruptions = await ksAdapter.getDisruptions(options)
          results.push(
            ...disruptions.map((disruption: any) => ({
              ...disruption,
              type: 'service_disruption',
            }))
          )
        }
      }
    } catch (error) {
      console.warn('Failed to get Knowledge Station disruptions:', error)
    }

    return results
  }

  /**
   * Get health status of all data sources
   */
  async getAggregatedHealthStatus(): Promise<any> {
    const healthStatus = await this.dataSourceManager.checkHealth()

    return {
      primary: {
        source: this.strategy.primarySource,
        ...healthStatus.get(this.strategy.primarySource),
      },
      enhancement: {
        source: this.strategy.primarySource === 'darwin' ? 'knowledge-station' : 'darwin',
        ...healthStatus.get(
          this.strategy.primarySource === 'darwin' ? 'knowledge-station' : 'darwin'
        ),
      },
      strategy: this.strategy,
      timestamp: new Date(),
    }
  }

  /**
   * Update aggregation strategy
   */
  updateStrategy(newStrategy: Partial<AggregationStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy }

    // Update data source manager configuration if needed
    if (newStrategy.primarySource) {
      this.dataSourceManager.updateConfig({
        primarySource: newStrategy.primarySource as 'darwin' | 'knowledge-station',
      })
    }
  }

  /**
   * Get current aggregation strategy
   */
  getStrategy(): AggregationStrategy {
    return { ...this.strategy }
  }
}

export default RailDataAggregator
