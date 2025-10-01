// Data Source Manager for Railway Data
// Manages multiple data sources with prioritization and fallback strategies
// Prioritizes Darwin API as per user preference, enhances with Knowledge Station when available

import { DataSourceAdapter } from './adapters/base'
import { DarwinAdapter } from './adapters/darwin'
import { KnowledgeStationAdapter } from './adapters/knowledge-station'

export interface DataSourceConfig {
  primarySource: 'darwin' | 'knowledge-station'
  enableFallback: boolean
  enableEnhancement: boolean
  timeout: number
  retries: number
}

export interface DataSourceHealth {
  name: string
  available: boolean
  responseTime?: number
  lastCheck: Date
  errorCount: number
}

export class DataSourceManager {
  private adapters: Map<string, DataSourceAdapter> = new Map()
  private config: DataSourceConfig
  private healthStatus: Map<string, DataSourceHealth> = new Map()

  constructor(config: Partial<DataSourceConfig> = {}) {
    this.config = {
      primarySource: 'darwin', // User preference: Darwin API first
      enableFallback: true,
      enableEnhancement: true,
      timeout: 10000,
      retries: 3,
      ...config,
    }

    this.initializeAdapters()
  }

  /**
   * Initialize data source adapters
   */
  private initializeAdapters(): void {
    // Darwin API (Primary as per user preference)
    const darwinAdapter = new DarwinAdapter()
    this.adapters.set('darwin', darwinAdapter)
    this.healthStatus.set('darwin', {
      name: 'Darwin API',
      available: false,
      lastCheck: new Date(),
      errorCount: 0,
    })

    // Knowledge Station API (Enhancement)
    const knowledgeStationAdapter = new KnowledgeStationAdapter()
    this.adapters.set('knowledge-station', knowledgeStationAdapter)
    this.healthStatus.set('knowledge-station', {
      name: 'Knowledge Station',
      available: false,
      lastCheck: new Date(),
      errorCount: 0,
    })
  }

  /**
   * Get primary data source adapter
   */
  getPrimaryAdapter(): DataSourceAdapter | null {
    return this.adapters.get(this.config.primarySource) || null
  }

  /**
   * Get enhancement adapter (non-primary source)
   */
  getEnhancementAdapter(): DataSourceAdapter | null {
    if (!this.config.enableEnhancement) return null

    const enhancementSource =
      this.config.primarySource === 'darwin' ? 'knowledge-station' : 'darwin'

    return this.adapters.get(enhancementSource) || null
  }

  /**
   * Get fallback adapter if primary fails
   */
  getFallbackAdapter(): DataSourceAdapter | null {
    if (!this.config.enableFallback) return null

    const fallbackSource = this.config.primarySource === 'darwin' ? 'knowledge-station' : 'darwin'

    const adapter = this.adapters.get(fallbackSource)
    const health = this.healthStatus.get(fallbackSource)

    // Only use as fallback if it's available
    return adapter && health?.available ? adapter : null
  }

  /**
   * Execute operation with primary source and potential enhancement
   */
  async executeWithEnhancement<T, E>(
    primaryOperation: (adapter: DataSourceAdapter) => Promise<T>,
    enhancementOperation?: (adapter: DataSourceAdapter) => Promise<E>,
    combineResults?: (primary: T, enhancement: E | null) => T
  ): Promise<T> {
    const primaryAdapter = this.getPrimaryAdapter()

    if (!primaryAdapter) {
      throw new Error(`Primary data source '${this.config.primarySource}' not available`)
    }

    let primaryResult: T

    try {
      // Execute primary operation (Darwin API as per user preference)
      primaryResult = await primaryOperation(primaryAdapter)
      this.updateHealthStatus(this.config.primarySource, true)
    } catch (error) {
      this.updateHealthStatus(this.config.primarySource, false)

      // Try fallback if enabled
      const fallbackAdapter = this.getFallbackAdapter()
      if (fallbackAdapter) {
        console.warn(`Primary source failed, trying fallback: ${error}`)
        try {
          primaryResult = await primaryOperation(fallbackAdapter)
          this.updateHealthStatus(
            this.config.primarySource === 'darwin' ? 'knowledge-station' : 'darwin',
            true
          )
        } catch (fallbackError) {
          console.error('Fallback source also failed:', fallbackError)
          throw error // Re-throw original error
        }
      } else {
        throw error
      }
    }

    // Try to enhance with secondary source if available and requested
    if (enhancementOperation && combineResults) {
      const enhancementAdapter = this.getEnhancementAdapter()

      if (enhancementAdapter) {
        try {
          const enhancementResult = await enhancementOperation(enhancementAdapter)
          return combineResults(primaryResult, enhancementResult)
        } catch (error) {
          console.warn('Enhancement operation failed, using primary result only:', error)
          // Don't fail the whole operation if enhancement fails
        }
      }
    }

    return primaryResult
  }

  /**
   * Update health status for a data source
   */
  private updateHealthStatus(source: string, success: boolean, responseTime?: number): void {
    const current = this.healthStatus.get(source)
    if (current) {
      current.available = success
      current.lastCheck = new Date()
      current.responseTime = responseTime
      current.errorCount = success ? 0 : current.errorCount + 1
    }
  }

  /**
   * Check health of all data sources
   */
  async checkHealth(): Promise<Map<string, DataSourceHealth>> {
    const healthPromises = Array.from(this.adapters.entries()).map(async ([name, adapter]) => {
      const startTime = Date.now()

      try {
        const isHealthy = await adapter.isHealthy()
        const responseTime = Date.now() - startTime

        this.updateHealthStatus(name, isHealthy, responseTime)
      } catch (error) {
        this.updateHealthStatus(name, false)
      }

      return [name, this.healthStatus.get(name)!] as [string, DataSourceHealth]
    })

    const results = await Promise.all(healthPromises)
    return new Map(results)
  }

  /**
   * Get current health status
   */
  getHealthStatus(): Map<string, DataSourceHealth> {
    return new Map(this.healthStatus)
  }

  /**
   * Get configuration
   */
  getConfig(): DataSourceConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DataSourceConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Log preference confirmation
    if (newConfig.primarySource && process.env.NODE_ENV === 'development') {
      console.log(`🚂 Primary data source set to: ${this.config.primarySource}`)
    }
  }

  /**
   * Get available adapters
   */
  getAvailableAdapters(): string[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Check if a specific adapter is available
   */
  isAdapterAvailable(name: string): boolean {
    const health = this.healthStatus.get(name)
    return health?.available || false
  }
}

// Singleton instance for application use
let dataSourceManager: DataSourceManager | null = null

export function getDataSourceManager(): DataSourceManager {
  if (!dataSourceManager) {
    dataSourceManager = new DataSourceManager({
      primarySource: 'darwin', // Respects user preference
      enableEnhancement: true,
      enableFallback: true,
    })
  }
  return dataSourceManager
}

export default DataSourceManager
