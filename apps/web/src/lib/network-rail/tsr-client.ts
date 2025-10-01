// Network Rail TSR (Temporary Speed Restrictions) Client
// Handles temporary speed restrictions that affect train performance across the network

import { NetworkRailConfig, NetworkRailAPIError } from './types'

export interface TSRMessage {
  header: {
    msg_type: string
    source_dev_id: string
    user_id: string
    timestamp: string
    source_system_id: string
  }
  body: TSRData
}

export interface TSRData {
  tsr_id: string
  route_group_id: string
  route: string
  tsr_reference: string
  from_stanox: string
  to_stanox: string
  from_mileage: string
  to_mileage: string
  direction: 'UP' | 'DOWN' | 'BOTH'
  speed_restriction: number // mph
  reason_code: string
  reason_text: string
  valid_from: string // ISO timestamp
  valid_to?: string // ISO timestamp
  tsr_type: 'EMERGENCY' | 'TEMPORARY' | 'PERMANENT'
  comments?: string
  contact_details?: string
}

export interface ProcessedTSR {
  tsrId: string
  route: string
  reference: string
  section: {
    from: {
      stanox: string
      crs?: string
      name?: string
      mileage: string
    }
    to: {
      stanox: string
      crs?: string
      name?: string
      mileage: string
    }
  }
  direction: 'UP' | 'DOWN' | 'BOTH'
  speedLimit: number // mph
  reason: {
    code: string
    description: string
  }
  validity: {
    from: Date
    to?: Date
    isActive: boolean
  }
  type: 'EMERGENCY' | 'TEMPORARY' | 'PERMANENT'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  impactScore: number // 0-100 based on speed reduction and route importance
  metadata: {
    comments?: string
    contact?: string
    lastUpdated: Date
  }
}

export interface TSRSummary {
  totalActive: number
  byType: {
    emergency: number
    temporary: number
    permanent: number
  }
  bySeverity: {
    low: number
    medium: number
    high: number
    critical: number
  }
  mostImpacted: {
    route: string
    restrictionCount: number
    averageSpeedReduction: number
  }[]
  lastUpdate: Date
}

export class TSRClient {
  private config: NetworkRailConfig
  private activeTSRs = new Map<string, ProcessedTSR>()
  private stationMapping = new Map<string, { crs: string; name: string }>()

  constructor(config: NetworkRailConfig) {
    this.config = config
    this.initializeStationMapping()
  }

  /**
   * Process incoming TSR message from STOMP feed
   */
  processTSRMessage(message: TSRMessage): void {
    try {
      const tsr = message.body
      const processed = this.processRawTSR(tsr)

      // Update active TSRs
      if (processed.validity.isActive) {
        this.activeTSRs.set(processed.tsrId, processed)

        // Log significant TSRs
        if (processed.severity === 'CRITICAL' || processed.severity === 'HIGH') {
          console.log(
            `🚧 ${processed.severity} TSR: ${processed.speedLimit}mph limit on ${processed.route} (${processed.reason.description})`
          )
        }
      } else {
        // Remove expired/cancelled TSRs
        this.activeTSRs.delete(processed.tsrId)
        console.log(`✅ TSR ${processed.reference} lifted on ${processed.route}`)
      }
    } catch (error) {
      console.error('Error processing TSR message:', error)
    }
  }

  /**
   * Get all active TSRs
   */
  getActiveTSRs(): ProcessedTSR[] {
    const now = new Date()
    const active: ProcessedTSR[] = []

    for (const [id, tsr] of this.activeTSRs) {
      // Check if still active
      if (tsr.validity.to && tsr.validity.to < now) {
        // Remove expired TSR
        this.activeTSRs.delete(id)
        continue
      }

      active.push(tsr)
    }

    return active.sort((a, b) => b.impactScore - a.impactScore)
  }

  /**
   * Get TSRs affecting a specific route
   */
  getTSRsForRoute(route: string): ProcessedTSR[] {
    return this.getActiveTSRs().filter((tsr) =>
      tsr.route.toLowerCase().includes(route.toLowerCase())
    )
  }

  /**
   * Get TSRs affecting a specific station
   */
  getTSRsForStation(stanox: string): ProcessedTSR[] {
    return this.getActiveTSRs().filter(
      (tsr) => tsr.section.from.stanox === stanox || tsr.section.to.stanox === stanox
    )
  }

  /**
   * Get TSR summary statistics
   */
  getTSRSummary(): TSRSummary {
    const active = this.getActiveTSRs()

    const byType = {
      emergency: active.filter((t) => t.type === 'EMERGENCY').length,
      temporary: active.filter((t) => t.type === 'TEMPORARY').length,
      permanent: active.filter((t) => t.type === 'PERMANENT').length,
    }

    const bySeverity = {
      low: active.filter((t) => t.severity === 'LOW').length,
      medium: active.filter((t) => t.severity === 'MEDIUM').length,
      high: active.filter((t) => t.severity === 'HIGH').length,
      critical: active.filter((t) => t.severity === 'CRITICAL').length,
    }

    // Calculate most impacted routes
    const routeImpact = new Map<string, { count: number; totalReduction: number }>()
    active.forEach((tsr) => {
      const existing = routeImpact.get(tsr.route) || { count: 0, totalReduction: 0 }
      routeImpact.set(tsr.route, {
        count: existing.count + 1,
        totalReduction: existing.totalReduction + (70 - tsr.speedLimit), // Assume 70mph normal speed
      })
    })

    const mostImpacted = Array.from(routeImpact.entries())
      .map(([route, impact]) => ({
        route,
        restrictionCount: impact.count,
        averageSpeedReduction: Math.round(impact.totalReduction / impact.count),
      }))
      .sort((a, b) => b.restrictionCount - a.restrictionCount)
      .slice(0, 5)

    return {
      totalActive: active.length,
      byType,
      bySeverity,
      mostImpacted,
      lastUpdate: new Date(),
    }
  }

  /**
   * Check if a train service is likely to be affected by TSRs
   */
  checkServiceImpact(
    trainId: string,
    route: string
  ): {
    affected: boolean
    affectingTSRs: ProcessedTSR[]
    estimatedDelayMinutes: number
  } {
    const relevantTSRs = this.getTSRsForRoute(route)

    if (relevantTSRs.length === 0) {
      return {
        affected: false,
        affectingTSRs: [],
        estimatedDelayMinutes: 0,
      }
    }

    // Simple delay estimation based on speed restrictions
    // In reality, this would require more complex calculations
    const totalDelayEstimate = relevantTSRs.reduce((total, tsr) => {
      const speedReduction = 70 - tsr.speedLimit // Assume 70mph normal
      const delayFactor = speedReduction / 70 // Percentage speed reduction
      return total + delayFactor * 5 // Rough estimate: 5 minutes per significant restriction
    }, 0)

    return {
      affected: true,
      affectingTSRs: relevantTSRs,
      estimatedDelayMinutes: Math.round(totalDelayEstimate),
    }
  }

  /**
   * Process raw TSR data into structured format
   */
  private processRawTSR(tsr: TSRData): ProcessedTSR {
    const now = new Date()
    const validFrom = new Date(tsr.valid_from)
    const validTo = tsr.valid_to ? new Date(tsr.valid_to) : undefined

    const isActive = validFrom <= now && (!validTo || validTo > now)

    return {
      tsrId: tsr.tsr_id,
      route: tsr.route,
      reference: tsr.tsr_reference,
      section: {
        from: {
          stanox: tsr.from_stanox,
          mileage: tsr.from_mileage,
          ...this.getStationInfo(tsr.from_stanox),
        },
        to: {
          stanox: tsr.to_stanox,
          mileage: tsr.to_mileage,
          ...this.getStationInfo(tsr.to_stanox),
        },
      },
      direction: tsr.direction,
      speedLimit: tsr.speed_restriction,
      reason: {
        code: tsr.reason_code,
        description: tsr.reason_text,
      },
      validity: {
        from: validFrom,
        to: validTo,
        isActive,
      },
      type: tsr.tsr_type,
      severity: this.calculateTSRSeverity(tsr),
      impactScore: this.calculateImpactScore(tsr),
      metadata: {
        comments: tsr.comments,
        contact: tsr.contact_details,
        lastUpdated: new Date(),
      },
    }
  }

  /**
   * Calculate TSR severity based on speed limit and type
   */
  private calculateTSRSeverity(tsr: TSRData): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (tsr.tsr_type === 'EMERGENCY') return 'CRITICAL'

    const speedLimit = tsr.speed_restriction
    if (speedLimit <= 20) return 'CRITICAL'
    if (speedLimit <= 40) return 'HIGH'
    if (speedLimit <= 60) return 'MEDIUM'
    return 'LOW'
  }

  /**
   * Calculate impact score (0-100) based on various factors
   */
  private calculateImpactScore(tsr: TSRData): number {
    let score = 0

    // Speed impact (40 points max)
    const normalSpeed = 70 // Assume 70mph normal speed
    const speedReduction = normalSpeed - tsr.speed_restriction
    score += Math.min((speedReduction / normalSpeed) * 40, 40)

    // Type impact (30 points max)
    switch (tsr.tsr_type) {
      case 'EMERGENCY':
        score += 30
        break
      case 'TEMPORARY':
        score += 15
        break
      case 'PERMANENT':
        score += 10
        break
    }

    // Duration impact (20 points max)
    if (tsr.valid_to) {
      const duration = new Date(tsr.valid_to).getTime() - new Date(tsr.valid_from).getTime()
      const durationDays = duration / (1000 * 60 * 60 * 24)
      if (durationDays > 30) score += 20
      else if (durationDays > 7) score += 15
      else if (durationDays > 1) score += 10
      else score += 5
    } else {
      score += 20 // Indefinite duration
    }

    // Direction impact (10 points max)
    if (tsr.direction === 'BOTH') score += 10
    else score += 5

    return Math.min(Math.round(score), 100)
  }

  /**
   * Get station information from STANOX
   */
  private getStationInfo(stanox: string): { crs?: string; name?: string } {
    return this.stationMapping.get(stanox) || {}
  }

  /**
   * Initialize common station mappings
   */
  private initializeStationMapping(): void {
    const stations = [
      { stanox: '87701', crs: 'KGX', name: 'London Kings Cross' },
      { stanox: '87700', crs: 'PAD', name: 'London Paddington' },
      { stanox: '88641', crs: 'VIC', name: 'London Victoria' },
      { stanox: '88646', crs: 'WAT', name: 'London Waterloo' },
      { stanox: '88518', crs: 'LIV', name: 'Liverpool Street' },
      { stanox: '54100', crs: 'MAN', name: 'Manchester Piccadilly' },
      { stanox: '68269', crs: 'BHM', name: 'Birmingham New Street' },
      { stanox: '89100', crs: 'EDB', name: 'Edinburgh Waverley' },
      { stanox: '66400', crs: 'GLC', name: 'Glasgow Central' },
      { stanox: '47900', crs: 'LDS', name: 'Leeds' },
    ]

    stations.forEach((station) => {
      this.stationMapping.set(station.stanox, {
        crs: station.crs,
        name: station.name,
      })
    })
  }
}

export default TSRClient
