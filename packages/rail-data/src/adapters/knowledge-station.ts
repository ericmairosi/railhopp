// Knowledge Station API Adapter for Rail Data Package
// Abstract adapter - actual implementations should be provided by consumer
// This serves as enhancement source to complement Darwin API

import { DataSourceAdapter } from './base'

export interface KnowledgeStationClient {
  testConnection(): Promise<boolean>
  getStationInfo(request: any): Promise<any>
  getServiceTracking(request: any): Promise<any>
  getDisruptions(options: any): Promise<any>
}

export class KnowledgeStationAdapter extends DataSourceAdapter {
  private client?: KnowledgeStationClient

  constructor(client?: KnowledgeStationClient) {
    super('Knowledge Station')
    this.client = client
  }

  /**
   * Set the Knowledge Station client implementation
   */
  setClient(client: KnowledgeStationClient): void {
    this.client = client
  }

  /**
   * Check if Knowledge Station API is healthy and available
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled || !this.client) return false

    try {
      return await this.client.testConnection()
    } catch (error) {
      console.warn('Knowledge Station API health check failed:', error)
      return false
    }
  }

  /**
   * Get enhanced station information from Knowledge Station
   */
  async getStationInfo(crs: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('Knowledge Station adapter is disabled')
    }

    if (!this.client) {
      throw new Error('Knowledge Station client not configured')
    }

    try {
      const stationInfo = await this.client.getStationInfo({
        crs,
        includeServices: false,
        includeDisruptions: false,
      })

      return {
        ...stationInfo,
        source: 'knowledge-station',
      }
    } catch (error) {
      console.error('Knowledge Station station info failed:', error)
      throw error
    }
  }

  /**
   * Get departure board from Knowledge Station (not primary capability)
   */
  async getDepartureBoard(request: any): Promise<any> {
    if (!this.enabled) {
      throw new Error('Knowledge Station adapter is disabled')
    }

    // Knowledge Station doesn't provide departure boards directly
    // This would need to be implemented based on the specific API capabilities
    throw new Error(
      'Departure board not available from Knowledge Station - use Darwin API as primary source'
    )
  }

  /**
   * Get service details from Knowledge Station
   */
  async getServiceDetails(serviceId: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('Knowledge Station adapter is disabled')
    }

    if (!this.client) {
      throw new Error('Knowledge Station client not configured')
    }

    try {
      const tracking = await this.client.getServiceTracking({
        serviceId,
      })

      return {
        ...tracking,
        source: 'knowledge-station',
      }
    } catch (error) {
      console.error('Knowledge Station service details failed:', error)
      throw error
    }
  }

  /**
   * Test connection to Knowledge Station API
   */
  async testConnection(): Promise<boolean> {
    return this.isHealthy()
  }

  /**
   * Get the priority of Knowledge Station adapter
   * Priority 2 (lower than Darwin) - serves as enhancement source
   */
  getPriority(): number {
    return 2 // Lower priority - enhancement source
  }

  /**
   * Get Knowledge Station adapter capabilities
   */
  getCapabilities() {
    return {
      stationInfo: true, // Enhanced station information with facilities
      departureBoard: false, // Not primary capability - use Darwin
      serviceDetails: false, // Different format - provides tracking instead
      disruptions: true, // Comprehensive disruption information
      realTimeTracking: true, // Real-time service tracking
    }
  }

  /**
   * Get disruptions from Knowledge Station
   */
  async getDisruptions(options: any = {}): Promise<any> {
    if (!this.enabled) {
      throw new Error('Knowledge Station adapter is disabled')
    }

    if (!this.client) {
      throw new Error('Knowledge Station client not configured')
    }

    try {
      const disruptions = await this.client.getDisruptions(options)

      return disruptions.map((disruption: any) => ({
        ...disruption,
        source: 'knowledge-station',
      }))
    } catch (error) {
      console.error('Knowledge Station disruptions failed:', error)
      throw error
    }
  }

  /**
   * Get service tracking from Knowledge Station
   */
  async getServiceTracking(request: any): Promise<any> {
    if (!this.enabled) {
      throw new Error('Knowledge Station adapter is disabled')
    }

    if (!this.client) {
      throw new Error('Knowledge Station client not configured')
    }

    try {
      const tracking = await this.client.getServiceTracking(request)

      return {
        ...tracking,
        source: 'knowledge-station',
      }
    } catch (error) {
      console.error('Knowledge Station service tracking failed:', error)
      throw error
    }
  }
}

export default KnowledgeStationAdapter
