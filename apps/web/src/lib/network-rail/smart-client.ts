// Network Rail SMART Client
// Handles train describer berth offset data used for train reporting

import { NetworkRailConfig, NetworkRailAPIError, SmartEntry } from './types'

export interface ProcessedSmartEntry {
  fromBerth: string
  toBerth: string
  fromStanox: string
  toStanox: string
  fromLine: string
  toLine: string
  berthStep: string
  event: 'ARRIVAL' | 'DEPARTURE' | 'PASS'
  route: string
  stepType: 'NORMAL' | 'JUNCTION' | 'PLATFORM'
  comment?: string
  lastUpdated: Date
}

export interface BerthMapping {
  berth: string
  stanox: string
  line: string
  description?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  nextBerths: string[]
  previousBerths: string[]
}

export interface TrainDescriberArea {
  areaId: string
  description: string
  berths: Map<string, BerthMapping>
  routes: string[]
  lastUpdate: Date
}

export class SMARTClient {
  private config: NetworkRailConfig
  private smartData = new Map<string, ProcessedSmartEntry>()
  private berthMappings = new Map<string, BerthMapping>()
  private areaData = new Map<string, TrainDescriberArea>()
  private lastUpdate: Date | null = null

  constructor(config: NetworkRailConfig) {
    this.config = config
  }

  /**
   * Load SMART berth offset data from Network Rail API
   */
  async loadSMARTData(): Promise<void> {
    try {
      console.log('Loading SMART berth offset data...')

      const response = await this.makeHTTPRequest<{ BERTHDATA?: SmartEntry[] }>(
        '/ntrod/SupportingFileAuthenticate?type=SMART'
      )

      if (!response.BERTHDATA) {
        throw new NetworkRailAPIError('Invalid SMART data structure', 'INVALID_DATA', { response })
      }

      // Process each SMART entry
      let processed = 0
      response.BERTHDATA.forEach((entry: SmartEntry) => {
        const processedEntry = this.processSMARTEntry(entry)
        if (processedEntry) {
          this.storeSMARTEntry(processedEntry)
          processed++
        }
      })

      // Build berth mappings
      this.buildBerthMappings()

      this.lastUpdate = new Date()
      console.log(`✅ SMART data loaded: ${processed} berth mappings processed`)
    } catch (error) {
      console.error('Failed to load SMART data:', error)
      throw new NetworkRailAPIError(
        'Failed to load SMART berth offset data',
        'SMART_LOAD_ERROR',
        error
      )
    }
  }

  /**
   * Get berth mapping for a specific berth
   */
  getBerthMapping(berth: string): BerthMapping | null {
    return this.berthMappings.get(berth) || null
  }

  /**
   * Get all berths for a specific STANOX
   */
  getBerthsForStanox(stanox: string): BerthMapping[] {
    return Array.from(this.berthMappings.values()).filter((berth) => berth.stanox === stanox)
  }

  /**
   * Get berth progression for train tracking
   */
  getBerthProgression(fromBerth: string, toBerth: string): ProcessedSmartEntry[] {
    return Array.from(this.smartData.values()).filter(
      (entry) => entry.fromBerth === fromBerth && entry.toBerth === toBerth
    )
  }

  /**
   * Get next possible berths from a given berth
   */
  getNextBerths(berth: string): BerthMapping[] {
    const berthMapping = this.getBerthMapping(berth)
    if (!berthMapping) return []

    return berthMapping.nextBerths
      .map((nextBerth) => this.getBerthMapping(nextBerth))
      .filter(Boolean) as BerthMapping[]
  }

  /**
   * Get previous berths leading to a given berth
   */
  getPreviousBerths(berth: string): BerthMapping[] {
    const berthMapping = this.getBerthMapping(berth)
    if (!berthMapping) return []

    return berthMapping.previousBerths
      .map((prevBerth) => this.getBerthMapping(prevBerth))
      .filter(Boolean) as BerthMapping[]
  }

  /**
   * Calculate route between two berths
   */
  calculateBerthRoute(startBerth: string, endBerth: string): BerthMapping[] {
    // Simple breadth-first search for berth route
    const visited = new Set<string>()
    const queue: { berth: string; path: BerthMapping[] }[] = []

    const startMapping = this.getBerthMapping(startBerth)
    if (!startMapping) return []

    queue.push({ berth: startBerth, path: [startMapping] })
    visited.add(startBerth)

    while (queue.length > 0) {
      const current = queue.shift()!

      if (current.berth === endBerth) {
        return current.path
      }

      const nextBerths = this.getNextBerths(current.berth)
      for (const nextBerth of nextBerths) {
        if (!visited.has(nextBerth.berth)) {
          visited.add(nextBerth.berth)
          queue.push({
            berth: nextBerth.berth,
            path: [...current.path, nextBerth],
          })
        }
      }
    }

    return [] // No route found
  }

  /**
   * Get train describer area information
   */
  getTrainDescriberArea(areaId: string): TrainDescriberArea | null {
    return this.areaData.get(areaId) || null
  }

  /**
   * Get all train describer areas
   */
  getAllAreas(): TrainDescriberArea[] {
    return Array.from(this.areaData.values())
  }

  /**
   * Search berths by location or description
   */
  searchBerths(query: string): BerthMapping[] {
    const searchTerm = query.toLowerCase()

    return Array.from(this.berthMappings.values())
      .filter(
        (berth) =>
          berth.berth.toLowerCase().includes(searchTerm) ||
          berth.description?.toLowerCase().includes(searchTerm) ||
          berth.stanox.includes(searchTerm)
      )
      .slice(0, 50) // Limit results
  }

  /**
   * Get SMART statistics
   */
  getSMARTStatistics(): {
    totalMappings: number
    totalBerths: number
    areas: number
    routes: number
    lastUpdate: Date
  } {
    const routes = new Set()
    Array.from(this.smartData.values()).forEach((entry) => {
      routes.add(entry.route)
    })

    return {
      totalMappings: this.smartData.size,
      totalBerths: this.berthMappings.size,
      areas: this.areaData.size,
      routes: routes.size,
      lastUpdate: this.lastUpdate || new Date(),
    }
  }

  /**
   * Process raw SMART entry into structured format
   */
  private processSMARTEntry(entry: SmartEntry): ProcessedSmartEntry | null {
    try {
      if (!entry.from_berth || !entry.to_berth) {
        return null
      }

      return {
        fromBerth: entry.from_berth,
        toBerth: entry.to_berth,
        fromStanox: entry.from_stanox || '',
        toStanox: entry.to_stanox || '',
        fromLine: entry.from_line || '',
        toLine: entry.to_line || '',
        berthStep: entry.berthstep || '',
        event: this.parseEvent(entry.event),
        route: entry.route || '',
        stepType: this.parseStepType(entry.steptype),
        comment: entry.comment || undefined,
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.warn('Error processing SMART entry:', entry, error)
      return null
    }
  }

  /**
   * Store processed SMART entry
   */
  private storeSMARTEntry(entry: ProcessedSmartEntry): void {
    const key = `${entry.fromBerth}-${entry.toBerth}`
    this.smartData.set(key, entry)
  }

  /**
   * Build berth mappings from SMART data
   */
  private buildBerthMappings(): void {
    console.log('Building berth mappings from SMART data...')

    const berthConnections = new Map<string, Set<string>>()
    const berthDetails = new Map<string, { stanox: string; line: string }>()

    // Analyze SMART data to build connections
    for (const entry of this.smartData.values()) {
      // Store berth details
      if (entry.fromStanox) {
        berthDetails.set(entry.fromBerth, {
          stanox: entry.fromStanox,
          line: entry.fromLine,
        })
      }
      if (entry.toStanox) {
        berthDetails.set(entry.toBerth, {
          stanox: entry.toStanox,
          line: entry.toLine,
        })
      }

      // Build connections
      if (!berthConnections.has(entry.fromBerth)) {
        berthConnections.set(entry.fromBerth, new Set())
      }
      berthConnections.get(entry.fromBerth)!.add(entry.toBerth)
    }

    // Create berth mappings
    for (const [berth, connections] of berthConnections) {
      const details = berthDetails.get(berth)
      const nextBerths = Array.from(connections)

      // Find previous berths
      const previousBerths: string[] = []
      for (const [otherBerth, otherConnections] of berthConnections) {
        if (otherConnections.has(berth)) {
          previousBerths.push(otherBerth)
        }
      }

      this.berthMappings.set(berth, {
        berth,
        stanox: details?.stanox || '',
        line: details?.line || '',
        nextBerths,
        previousBerths,
        description: this.generateBerthDescription(berth, details?.stanox),
      })
    }

    console.log(`Built ${this.berthMappings.size} berth mappings`)
  }

  /**
   * Parse event type from SMART data
   */
  private parseEvent(event: string): 'ARRIVAL' | 'DEPARTURE' | 'PASS' {
    const eventLower = event?.toLowerCase() || ''
    if (eventLower.includes('arrival') || eventLower.includes('arr')) return 'ARRIVAL'
    if (eventLower.includes('departure') || eventLower.includes('dep')) return 'DEPARTURE'
    return 'PASS'
  }

  /**
   * Parse step type from SMART data
   */
  private parseStepType(steptype: string): 'NORMAL' | 'JUNCTION' | 'PLATFORM' {
    const typeLower = steptype?.toLowerCase() || ''
    if (typeLower.includes('junction') || typeLower.includes('jn')) return 'JUNCTION'
    if (typeLower.includes('platform') || typeLower.includes('plat')) return 'PLATFORM'
    return 'NORMAL'
  }

  /**
   * Generate descriptive text for berth
   */
  private generateBerthDescription(berth: string, stanox?: string): string {
    if (stanox) {
      return `Berth ${berth} (STANOX: ${stanox})`
    }
    return `Berth ${berth}`
  }

  /**
   * Make HTTP request to Network Rail API
   */
  private async makeHTTPRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
      'base64'
    )

    const requestOptions: RequestInit = {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Railhopp-NetworkRail-SMART-Client/1.0',
        ...options.headers,
      },
      ...options,
    }

    const controller = new AbortController()
    const timeoutMs = this.config.timeout || 30000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    requestOptions.signal = controller.signal

    try {
      const response = await fetch(url, requestOptions)
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.text()
        throw new NetworkRailAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, body: errorBody, url }
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof NetworkRailAPIError) {
        throw error
      }

      throw new NetworkRailAPIError(
        'Failed to make HTTP request to Network Rail SMART API',
        'REQUEST_ERROR',
        error
      )
    }
  }
}

export default SMARTClient
