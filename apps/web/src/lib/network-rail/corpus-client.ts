// Network Rail CORPUS Client
// Handles location reference data with station mappings and coordinates

import { NetworkRailConfig, NetworkRailAPIError, CorpusEntry } from './types'

export interface ProcessedCorpusEntry {
  stanox: string
  uic: number
  crsCode: string
  stationName: string
  tiploc: string
  nlc: number
  description: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  region?: string
  operator?: string
  category: 'STATION' | 'JUNCTION' | 'DEPOT' | 'SIGNAL_BOX' | 'OTHER'
  isPassengerStation: boolean
  facilities?: string[]
  lastUpdated: Date
}

export interface StationSearchResult {
  exact: ProcessedCorpusEntry[]
  partial: ProcessedCorpusEntry[]
  nearby?: ProcessedCorpusEntry[]
}

export interface LocationStats {
  totalLocations: number
  passengerStations: number
  junctions: number
  depots: number
  signalBoxes: number
  other: number
  regionsCount: { [region: string]: number }
  lastUpdate: Date
}

export class CorpusClient {
  private config: NetworkRailConfig
  private corpusData = new Map<string, ProcessedCorpusEntry>()
  private stationsByCode = new Map<string, ProcessedCorpusEntry>()
  private stationsByName = new Map<string, ProcessedCorpusEntry[]>()
  private tiplocMapping = new Map<string, ProcessedCorpusEntry>()
  private lastUpdate: Date | null = null

  constructor(config: NetworkRailConfig) {
    this.config = config
  }

  /**
   * Load and process CORPUS data from Network Rail API
   */
  async loadCorpusData(): Promise<void> {
    try {
      console.log('Loading CORPUS location reference data...')

      const response = await this.makeHTTPRequest('/ntrod/CORPUSExtract')

      if (!response.TIPLOCDATA) {
        throw new NetworkRailAPIError('Invalid CORPUS data structure', 'INVALID_DATA', { response })
      }

      // Process each CORPUS entry
      let processed = 0
      response.TIPLOCDATA.forEach((entry: CorpusEntry) => {
        const processedEntry = this.processCorpusEntry(entry)
        if (processedEntry) {
          this.storeCorpusEntry(processedEntry)
          processed++
        }
      })

      this.lastUpdate = new Date()
      console.log(`✅ CORPUS data loaded: ${processed} locations processed`)
    } catch (error) {
      console.error('Failed to load CORPUS data:', error)
      throw new NetworkRailAPIError(
        'Failed to load CORPUS reference data',
        'CORPUS_LOAD_ERROR',
        error
      )
    }
  }

  /**
   * Get location by STANOX code
   */
  getLocationByStanox(stanox: string): ProcessedCorpusEntry | null {
    return this.corpusData.get(stanox) || null
  }

  /**
   * Get location by CRS code
   */
  getLocationByCRS(crs: string): ProcessedCorpusEntry | null {
    return this.stationsByCode.get(crs.toUpperCase()) || null
  }

  /**
   * Get location by TIPLOC
   */
  getLocationByTiploc(tiploc: string): ProcessedCorpusEntry | null {
    return this.tiplocMapping.get(tiploc.toUpperCase()) || null
  }

  /**
   * Search locations by name (fuzzy search)
   */
  searchLocationsByName(query: string, limit: number = 20): StationSearchResult {
    const searchTerm = query.toLowerCase().trim()
    const exact: ProcessedCorpusEntry[] = []
    const partial: ProcessedCorpusEntry[] = []

    // Search through all locations
    for (const [name, entries] of this.stationsByName) {
      const nameLower = name.toLowerCase()

      if (nameLower === searchTerm) {
        exact.push(...entries)
      } else if (nameLower.includes(searchTerm) || searchTerm.includes(nameLower)) {
        partial.push(...entries)
      }
    }

    // Limit results and sort by relevance
    const sortByRelevance = (a: ProcessedCorpusEntry, b: ProcessedCorpusEntry) => {
      const aName = a.stationName.toLowerCase()
      const bName = b.stationName.toLowerCase()

      // Prioritize passenger stations
      if (a.isPassengerStation && !b.isPassengerStation) return -1
      if (!a.isPassengerStation && b.isPassengerStation) return 1

      // Then by name similarity
      const aStartsWith = aName.startsWith(searchTerm)
      const bStartsWith = bName.startsWith(searchTerm)

      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1

      return aName.localeCompare(bName)
    }

    return {
      exact: exact.sort(sortByRelevance).slice(0, limit),
      partial: partial.sort(sortByRelevance).slice(0, limit),
    }
  }

  /**
   * Get all passenger stations
   */
  getPassengerStations(): ProcessedCorpusEntry[] {
    return Array.from(this.corpusData.values())
      .filter((entry) => entry.isPassengerStation)
      .sort((a, b) => a.stationName.localeCompare(b.stationName))
  }

  /**
   * Get locations by region
   */
  getLocationsByRegion(region: string): ProcessedCorpusEntry[] {
    return Array.from(this.corpusData.values())
      .filter((entry) => entry.region === region)
      .sort((a, b) => a.stationName.localeCompare(b.stationName))
  }

  /**
   * Get locations within radius (if coordinates available)
   */
  getLocationsNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): ProcessedCorpusEntry[] {
    const nearby: ProcessedCorpusEntry[] = []

    for (const entry of this.corpusData.values()) {
      if (entry.coordinates) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          entry.coordinates.latitude,
          entry.coordinates.longitude
        )

        if (distance <= radiusKm) {
          nearby.push({
            ...entry,
            // Add distance for sorting
            distance,
          } as any)
        }
      }
    }

    return nearby.sort((a: any, b: any) => a.distance - b.distance).slice(0, 50) // Limit to 50 results
  }

  /**
   * Get CORPUS statistics
   */
  getLocationStats(): LocationStats {
    const entries = Array.from(this.corpusData.values())
    const regions: { [region: string]: number } = {}

    let passengerStations = 0
    let junctions = 0
    let depots = 0
    let signalBoxes = 0
    let other = 0

    entries.forEach((entry) => {
      // Count by category
      switch (entry.category) {
        case 'STATION':
          if (entry.isPassengerStation) passengerStations++
          break
        case 'JUNCTION':
          junctions++
          break
        case 'DEPOT':
          depots++
          break
        case 'SIGNAL_BOX':
          signalBoxes++
          break
        default:
          other++
      }

      // Count by region
      if (entry.region) {
        regions[entry.region] = (regions[entry.region] || 0) + 1
      }
    })

    return {
      totalLocations: entries.length,
      passengerStations,
      junctions,
      depots,
      signalBoxes,
      other,
      regionsCount: regions,
      lastUpdate: this.lastUpdate || new Date(),
    }
  }

  /**
   * Convert STANOX to CRS code
   */
  stanoxToCRS(stanox: string): string | null {
    const location = this.getLocationByStanox(stanox)
    return location?.crsCode || null
  }

  /**
   * Convert CRS to STANOX code
   */
  crsToStanox(crs: string): string | null {
    const location = this.getLocationByCRS(crs)
    return location?.stanox || null
  }

  /**
   * Validate if a CRS code exists
   */
  isValidCRS(crs: string): boolean {
    return this.stationsByCode.has(crs.toUpperCase())
  }

  /**
   * Validate if a STANOX exists
   */
  isValidStanox(stanox: string): boolean {
    return this.corpusData.has(stanox)
  }

  /**
   * Process raw CORPUS entry into structured format
   */
  private processCorpusEntry(entry: CorpusEntry): ProcessedCorpusEntry | null {
    try {
      // Skip invalid entries
      if (!entry.stanox || !entry.nlcdesc16) {
        return null
      }

      const category = this.determineCategory(entry)
      const isPassengerStation = this.isPassengerStation(entry)

      return {
        stanox: entry.stanox.toString(),
        uic: entry.uic || 0,
        crsCode: entry.crs_code || '',
        stationName: entry.nlcdesc16.trim(),
        tiploc: entry.tiploc || '',
        nlc: entry.nlc || 0,
        description: entry.stanme || entry.nlcdesc16,
        category,
        isPassengerStation,
        region: this.determineRegion(entry),
        lastUpdated: new Date(),
      }
    } catch (error) {
      console.warn('Error processing CORPUS entry:', entry, error)
      return null
    }
  }

  /**
   * Store processed CORPUS entry in various indices
   */
  private storeCorpusEntry(entry: ProcessedCorpusEntry): void {
    // Primary index by STANOX
    this.corpusData.set(entry.stanox, entry)

    // Index by CRS code
    if (entry.crsCode) {
      this.stationsByCode.set(entry.crsCode.toUpperCase(), entry)
    }

    // Index by TIPLOC
    if (entry.tiploc) {
      this.tiplocMapping.set(entry.tiploc.toUpperCase(), entry)
    }

    // Index by name for searching
    const nameKey = entry.stationName.toLowerCase()
    const nameEntries = this.stationsByName.get(nameKey) || []
    nameEntries.push(entry)
    this.stationsByName.set(nameKey, nameEntries)
  }

  /**
   * Determine location category from CORPUS data
   */
  private determineCategory(entry: CorpusEntry): ProcessedCorpusEntry['category'] {
    const name = (entry.nlcdesc16 || entry.stanme || '').toLowerCase()

    if (entry.crs_code) return 'STATION'
    if (name.includes('junction') || name.includes('jn')) return 'JUNCTION'
    if (name.includes('depot') || name.includes('sidings')) return 'DEPOT'
    if (name.includes('signal') || name.includes('box')) return 'SIGNAL_BOX'

    return 'OTHER'
  }

  /**
   * Determine if location is a passenger station
   */
  private isPassengerStation(entry: CorpusEntry): boolean {
    return Boolean(entry.crs_code && entry.crs_code.length === 3)
  }

  /**
   * Determine region from STANOX or other data
   */
  private determineRegion(entry: CorpusEntry): string {
    const stanox = entry.stanox.toString()

    // Simple regional mapping based on STANOX ranges
    // This is a simplified version - real implementation would use more sophisticated mapping
    const firstTwo = parseInt(stanox.substring(0, 2))

    if (firstTwo >= 87 && firstTwo <= 88) return 'LONDON'
    if (firstTwo >= 54 && firstTwo <= 59) return 'NORTH_WEST'
    if (firstTwo >= 47 && firstTwo <= 53) return 'YORKSHIRE'
    if (firstTwo >= 68 && firstTwo <= 72) return 'WEST_MIDLANDS'
    if (firstTwo >= 89 && firstTwo <= 95) return 'SCOTLAND'
    if (firstTwo >= 56 && firstTwo <= 62) return 'WALES'
    if (firstTwo >= 40 && firstTwo <= 46) return 'SOUTH_WEST'
    if (firstTwo >= 73 && firstTwo <= 79) return 'SOUTH_EAST'

    return 'OTHER'
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Make HTTP request to Network Rail API
   */
  private async makeHTTPRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString(
      'base64'
    )

    const requestOptions: RequestInit = {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Railhopp-NetworkRail-CORPUS-Client/1.0',
        ...options.headers,
      },
      redirect: 'follow',
      ...options,
    }

    const controller = new AbortController()
    const timeoutMs = this.config.timeout || 30000 // CORPUS can be large
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
        'Failed to make HTTP request to Network Rail CORPUS API',
        'REQUEST_ERROR',
        error
      )
    }
  }
}

export default CorpusClient
