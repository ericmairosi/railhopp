// Network Rail Service Initializer
// Manages startup and lifecycle of Network Rail feeds

import { getNetworkRailAggregator } from '@/lib/network-rail/feeds-aggregator'

class NetworkRailInitializer {
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  /**
   * Initialize Network Rail feeds (singleton pattern)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Network Rail already initialized')
      return
    }

    if (this.initializationPromise) {
      console.log('Network Rail initialization in progress...')
      return this.initializationPromise
    }

    this.initializationPromise = this.performInitialization()
    await this.initializationPromise
  }

  /**
   * Perform the actual initialization
   */
  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing Network Rail feeds system...')

      // Check if Network Rail is enabled
      const enabled = process.env.NETWORK_RAIL_ENABLED === 'true'
      const hasCredentials = !!(
        process.env.NETWORK_RAIL_USERNAME && process.env.NETWORK_RAIL_PASSWORD
      )

      if (!enabled) {
        console.log('⚠️  Network Rail feeds disabled in configuration')
        return
      }

      if (!hasCredentials) {
        console.log('⚠️  Network Rail credentials not configured - feeds will not start')
        console.log('   Configure NETWORK_RAIL_USERNAME and NETWORK_RAIL_PASSWORD in .env.local')
        return
      }

      // Initialize the aggregator service
      const aggregator = getNetworkRailAggregator()

      // Start the aggregation service in the background
      // Note: In production, you might want to handle this differently
      // For now, we'll start it in development mode only
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Starting Network Rail feeds aggregation (development mode)...')

        // Start aggregation in the background with error handling
        aggregator.startAggregation().catch((error) => {
          console.error('❌ Network Rail aggregation startup failed:', error.message)
          console.log("   This is expected if you don't have valid Network Rail credentials")
          console.log('   The system will continue to work with other data sources')
        })
      } else {
        console.log('✅ Network Rail aggregator initialized (production mode - start manually)')
      }

      this.isInitialized = true
      console.log('✅ Network Rail feeds system initialized successfully')
    } catch (error) {
      console.error('❌ Network Rail initialization failed:', error)
      // Don't throw - allow the app to continue with other data sources
    }
  }

  /**
   * Get initialization status
   */
  getStatus(): {
    initialized: boolean
    enabled: boolean
    hasCredentials: boolean
    feeds: string[]
  } {
    const enabled = process.env.NETWORK_RAIL_ENABLED === 'true'
    const hasCredentials = !!(
      process.env.NETWORK_RAIL_USERNAME && process.env.NETWORK_RAIL_PASSWORD
    )

    return {
      initialized: this.isInitialized,
      enabled,
      hasCredentials,
      feeds: [
        'MOVEMENT (Train Movements)',
        'TD (Train Describer)',
        'TSR (Temporary Speed Restrictions)',
        'VSTP (Very Short Term Planning)',
        'RTPPM (Real Time Public Performance Measure)',
        'CORPUS (Location Reference Data)',
        'SMART (Berth Offset Data)',
      ],
    }
  }

  /**
   * Gracefully shutdown Network Rail services
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return

    try {
      console.log('🛑 Shutting down Network Rail feeds...')

      const aggregator = getNetworkRailAggregator()
      aggregator.stopAggregation()

      this.isInitialized = false
      console.log('✅ Network Rail feeds shutdown complete')
    } catch (error) {
      console.error('❌ Error during Network Rail shutdown:', error)
    }
  }
}

// Singleton instance
let networkRailInitializer: NetworkRailInitializer | null = null

export function getNetworkRailInitializer(): NetworkRailInitializer {
  if (!networkRailInitializer) {
    networkRailInitializer = new NetworkRailInitializer()
  }
  return networkRailInitializer
}

// Auto-initialize on import in development
if (typeof window === 'undefined') {
  // Server-side only
  const initializer = getNetworkRailInitializer()

  // Initialize with a small delay to allow env vars to load
  setTimeout(() => {
    initializer.initialize().catch((error) => {
      console.error('Auto-initialization failed:', error)
    })
  }, 1000)
}

export default NetworkRailInitializer
