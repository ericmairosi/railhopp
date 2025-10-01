// Base Data Source Adapter
// Abstract base class for all railway data source adapters

export abstract class DataSourceAdapter {
  protected name: string
  protected enabled: boolean = true

  constructor(name: string) {
    this.name = name
  }

  /**
   * Get the name of this adapter
   */
  getName(): string {
    return this.name
  }

  /**
   * Check if this adapter is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Enable or disable this adapter
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if the data source is healthy and available
   */
  abstract isHealthy(): Promise<boolean>

  /**
   * Get station information
   */
  abstract getStationInfo(crs: string): Promise<any>

  /**
   * Get departure board for a station
   */
  abstract getDepartureBoard(request: any): Promise<any>

  /**
   * Get service details
   */
  abstract getServiceDetails(serviceId: string): Promise<any>

  /**
   * Test connection to the data source
   */
  abstract testConnection(): Promise<boolean>

  /**
   * Get the priority of this adapter (lower number = higher priority)
   * Darwin API should have priority 1 as per user preference
   */
  abstract getPriority(): number

  /**
   * Get adapter capabilities
   */
  abstract getCapabilities(): {
    stationInfo: boolean
    departureBoard: boolean
    serviceDetails: boolean
    disruptions: boolean
    realTimeTracking: boolean
  }
}

export default DataSourceAdapter
