// Darwin API Adapter for Rail Data Package
// Abstract adapter - actual implementations should be provided by consumer
// This is the primary data source as per user preference

import { DataSourceAdapter } from './base'

export interface DarwinClient {
  testConnection(): Promise<boolean>
  getDepartureBoard(request: any): Promise<any>
  getServiceDetails(request: any): Promise<any>
}

export class DarwinAdapter extends DataSourceAdapter {
  private client?: DarwinClient

  constructor(client?: DarwinClient) {
    super('Darwin API')
    this.client = client
  }

  /**
   * Set the Darwin client implementation
   */
  setClient(client: DarwinClient): void {
    this.client = client
  }

  /**
   * Check if Darwin API is healthy and available
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled || !this.client) return false

    try {
      return await this.client.testConnection()
    } catch (error) {
      console.warn('Darwin API health check failed:', error)
      return false
    }
  }

  /**
   * Get station information from Darwin
   */
  async getStationInfo(crs: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('Darwin adapter is disabled')
    }

    if (!this.client) {
      throw new Error('Darwin client not configured')
    }

    try {
      // Darwin doesn't have detailed station info, so we get basic info from departure board
      const board = await this.client.getDepartureBoard({ crs, numRows: 1 })

      return {
        crs: board.stationCode,
        name: board.stationName,
        source: 'darwin',
        generatedAt: board.generatedAt,
        platformsAvailable: board.platformsAvailable,
      }
    } catch (error) {
      console.error('Darwin station info failed:', error)
      throw error
    }
  }

  /**
   * Get departure board from Darwin
   */
  async getDepartureBoard(request: any): Promise<any> {
    if (!this.enabled) {
      throw new Error('Darwin adapter is disabled')
    }

    if (!this.client) {
      throw new Error('Darwin client not configured')
    }

    try {
      const board = await this.client.getDepartureBoard(request)

      return {
        ...board,
        source: 'darwin',
      }
    } catch (error) {
      console.error('Darwin departure board failed:', error)
      throw error
    }
  }

  /**
   * Get service details from Darwin
   */
  async getServiceDetails(serviceId: string): Promise<any> {
    if (!this.enabled) {
      throw new Error('Darwin adapter is disabled')
    }

    if (!this.client) {
      throw new Error('Darwin client not configured')
    }

    try {
      const details = await this.client.getServiceDetails({ serviceId })

      return {
        ...details,
        source: 'darwin',
      }
    } catch (error) {
      console.error('Darwin service details failed:', error)
      throw error
    }
  }

  /**
   * Test connection to Darwin API
   */
  async testConnection(): Promise<boolean> {
    return this.isHealthy()
  }

  /**
   * Get the priority of Darwin adapter
   * Priority 1 (highest) as per user preference
   */
  getPriority(): number {
    return 1 // Highest priority - user prefers Darwin API
  }

  /**
   * Get Darwin adapter capabilities
   */
  getCapabilities() {
    return {
      stationInfo: true, // Basic station info from departure board
      departureBoard: true, // Core capability
      serviceDetails: true, // Detailed service information
      disruptions: true, // Messages from NRCC
      realTimeTracking: false, // Not available in Darwin
    }
  }
}

export default DarwinAdapter
