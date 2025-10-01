// Network Rail Feeds Aggregator Service
// Combines all Network Rail feeds (MOVEMENT, TD, TSR, VSTP, RTPPM, SCHEDULE, TPS) into a unified real-time data stream

import { getNetworkRailClient } from './client'
import TSRClient, { TSRMessage, ProcessedTSR } from './tsr-client'
import RTPPMClient, { RTPPMMessage, ProcessedPerformanceData } from './rtppm-client'
import CorpusClient from './corpus-client'
import { ScheduleClient } from './schedule-client'
import { TPSClient } from './tps-client'
import {
  NetworkRailConfig,
  TrainMovementMessage,
  VSTPMessage,
  TrainDescriberMessage,
  EnhancedTrainService,
} from './types'

export interface AggregatedTrainData {
  trainId: string
  headcode?: string
  uid?: string

  // Real-time position from MOVEMENT/TD
  currentPosition?: {
    stanox: string
    berth?: string
    platform?: string
    stationName?: string
    crs?: string
    timestamp: Date
    confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  }

  // Movement history
  movements: {
    eventType: 'ARRIVAL' | 'DEPARTURE'
    location: string
    scheduledTime?: Date
    actualTime: Date
    delayMinutes: number
    platform?: string
  }[]

  // Performance data
  performance?: {
    onTimePercentage: number
    averageDelay: number
    rank: number
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  }

  // Speed restrictions affecting this train
  affectingTSRs: ProcessedTSR[]
  estimatedTSRDelay: number

  // Schedule information
  schedule?: {
    origin: { name: string; crs: string; time: string }
    destination: { name: string; crs: string; time: string }
    stops: { name: string; crs: string; arrival?: string; departure?: string }[]
  }

  // Data quality and sources
  dataQuality: {
    movementsFresh: boolean
    positionConfidence: 'HIGH' | 'MEDIUM' | 'LOW'
    scheduleAccuracy: 'CONFIRMED' | 'ESTIMATED' | 'UNKNOWN'
    lastUpdate: Date
  }
}

export interface NetworkStatus {
  overall: 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'POOR'
  feeds: {
    movements: { active: boolean; messageRate: number; lastMessage?: Date }
    trainDescriber: { active: boolean; messageRate: number; lastMessage?: Date }
    tsr: { active: boolean; activeTSRs: number; lastMessage?: Date }
    vstp: { active: boolean; messageRate: number; lastMessage?: Date }
    rtppm: { active: boolean; nationalPerformance?: number; lastMessage?: Date }
    schedule: { active: boolean; totalSchedules: number; lastMessage?: Date }
    tps: { active: boolean; timingPoints: number; lastMessage?: Date }
  }
  performance: {
    nationalOnTime: number
    activeTSRs: number
    majorDisruptions: number
  }
  lastUpdate: Date
}

export class NetworkRailFeedsAggregator {
  private config: NetworkRailConfig
  private networkRailClient = getNetworkRailClient()
  private tsrClient: TSRClient
  private rtppmClient: RTPPMClient
  private corpusClient: CorpusClient
  private scheduleClient: ScheduleClient
  private tpsClient: TPSClient

  // Data stores
  private trainData = new Map<string, AggregatedTrainData>()
  private feedStats = {
    movements: { messageCount: 0, lastMessage: null as Date | null, rate: 0 },
    td: { messageCount: 0, lastMessage: null as Date | null, rate: 0 },
    tsr: { messageCount: 0, lastMessage: null as Date | null, rate: 0 },
    vstp: { messageCount: 0, lastMessage: null as Date | null, rate: 0 },
    rtppm: { messageCount: 0, lastMessage: null as Date | null, rate: 0 },
    schedule: { messageCount: 0, lastMessage: null as Date | null, rate: 0 },
    tps: { messageCount: 0, lastMessage: null as Date | null, rate: 0 },
  }

  private isRunning = false
  private statsInterval?: NodeJS.Timeout

  constructor(config: NetworkRailConfig) {
    this.config = config
    this.tsrClient = new TSRClient(config)
    this.rtppmClient = new RTPPMClient(config)
    this.corpusClient = new CorpusClient(config)
    this.scheduleClient = new ScheduleClient({ ...config, feedName: 'SCHEDULE' })
    this.tpsClient = new TPSClient({ ...config, feedName: 'TPS' })
  }

  /**
   * Start all Network Rail feeds and begin aggregation
   */
  async startAggregation(): Promise<void> {
    if (this.isRunning) {
      console.log('Network Rail aggregator already running')
      return
    }

    try {
      console.log('🚀 Starting Network Rail feeds aggregation...')

      // Load reference data first
      await this.corpusClient.loadCorpusData()

      // Initialize STOMP connection
      await this.networkRailClient.initializeSTOMPConnection()

      // Subscribe to all feeds
      this.subscribeToFeeds()

      // Start statistics tracking
      this.startStatsTracking()

      this.isRunning = true
      console.log('✅ Network Rail feeds aggregation started successfully')
    } catch (error) {
      console.error('Failed to start Network Rail aggregation:', error)
      throw error
    }
  }

  /**
   * Stop all feeds and cleanup
   */
  stopAggregation(): void {
    if (!this.isRunning) return

    console.log('Stopping Network Rail feeds aggregation...')

    if (this.statsInterval) {
      clearInterval(this.statsInterval)
    }

    this.isRunning = false
    console.log('Network Rail feeds aggregation stopped')
  }

  /**
   * Get aggregated data for a specific train
   */
  getTrainData(trainId: string): AggregatedTrainData | null {
    return this.trainData.get(trainId) || null
  }

  /**
   * Get all active trains
   */
  getActiveTrains(): AggregatedTrainData[] {
    return Array.from(this.trainData.values())
      .filter((train) => {
        const age = Date.now() - train.dataQuality.lastUpdate.getTime()
        return age < 30 * 60 * 1000 // Active if updated within 30 minutes
      })
      .sort((a, b) => b.dataQuality.lastUpdate.getTime() - a.dataQuality.lastUpdate.getTime())
  }

  /**
   * Get trains at or near a specific station
   */
  getTrainsAtStation(stanox: string): AggregatedTrainData[] {
    return this.getActiveTrains().filter(
      (train) =>
        train.currentPosition?.stanox === stanox ||
        train.movements.some(
          (movement) =>
            movement.location === stanox &&
            Date.now() - movement.actualTime.getTime() < 10 * 60 * 1000 // Within 10 minutes
        )
    )
  }

  /**
   * Get train schedule information
   */
  async getTrainSchedule(trainUid: string): Promise<any> {
    return await this.scheduleClient.getSchedules({ trainUid })
  }

  /**
   * Search train schedules by criteria
   */
  async searchSchedules(criteria: {
    origin?: string
    destination?: string
    operator?: string
    departureTime?: string
  }): Promise<any[]> {
    return await this.scheduleClient.searchSchedules(criteria)
  }

  /**
   * Get timing point information
   */
  async getTimingPoint(tiploc: string): Promise<any> {
    return await this.tpsClient.getTimingPoint(tiploc)
  }

  /**
   * Search timing points
   */
  async searchTimingPoints(criteria: {
    name?: string
    crs?: string
    limit?: number
  }): Promise<any[]> {
    return await this.tpsClient.searchTimingPoints(criteria)
  }

  /**
   * Get route information between stations
   */
  async getRoute(fromTiploc: string, toTiploc: string): Promise<any> {
    return await this.tpsClient.findPath(fromTiploc, toTiploc)
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    const now = new Date()
    const national = this.rtppmClient.getNationalPerformance()
    const tsrSummary = this.tsrClient.getTSRSummary()

    // Calculate overall status
    let overall: NetworkStatus['overall'] = 'EXCELLENT'
    if (!national || national.onTimePercentage < 70) overall = 'POOR'
    else if (national.onTimePercentage < 85) overall = 'DEGRADED'
    else if (national.onTimePercentage < 95) overall = 'GOOD'

    return {
      overall,
      feeds: {
        movements: {
          active: this.feedStats.movements.rate > 0,
          messageRate: this.feedStats.movements.rate,
          lastMessage: this.feedStats.movements.lastMessage || undefined,
        },
        trainDescriber: {
          active: this.feedStats.td.rate > 0,
          messageRate: this.feedStats.td.rate,
          lastMessage: this.feedStats.td.lastMessage || undefined,
        },
        tsr: {
          active: this.feedStats.tsr.rate > 0,
          activeTSRs: tsrSummary.totalActive,
          lastMessage: this.feedStats.tsr.lastMessage || undefined,
        },
        vstp: {
          active: this.feedStats.vstp.rate > 0,
          messageRate: this.feedStats.vstp.rate,
          lastMessage: this.feedStats.vstp.lastMessage || undefined,
        },
        rtppm: {
          active: this.feedStats.rtppm.rate > 0,
          nationalPerformance: national?.onTimePercentage,
          lastMessage: this.feedStats.rtppm.lastMessage || undefined,
        },
        schedule: {
          active: this.feedStats.schedule.rate > 0,
          totalSchedules: 15000, // This would come from schedule client stats
          lastMessage: this.feedStats.schedule.lastMessage || undefined,
        },
        tps: {
          active: this.feedStats.tps.rate > 0,
          timingPoints: 12500, // This would come from TPS client stats
          lastMessage: this.feedStats.tps.lastMessage || undefined,
        },
      },
      performance: {
        nationalOnTime: national?.onTimePercentage || 0,
        activeTSRs: tsrSummary.totalActive,
        majorDisruptions: tsrSummary.bySeverity.critical + tsrSummary.bySeverity.high,
      },
      lastUpdate: now,
    }
  }

  /**
   * Subscribe to all Network Rail feeds
   */
  private subscribeToFeeds(): void {
    // Subscribe to train movements
    this.networkRailClient.subscribeToTrainMovements(this.handleTrainMovement.bind(this))

    // Subscribe to VSTP
    this.networkRailClient.subscribeToVSTP(this.handleVSTPMessage.bind(this))

    // Subscribe to Train Describer (multiple areas)
    const areas = ['LN', 'SE', 'SW', 'WM', 'NW', 'NE', 'SC'] // Major areas
    areas.forEach((area) => {
      this.networkRailClient.subscribeToTrainDescriber(
        area,
        this.handleTrainDescriberMessage.bind(this)
      )
    })
  }

  /**
   * Handle incoming train movement messages
   */
  private handleTrainMovement(message: TrainMovementMessage): void {
    try {
      this.updateFeedStats('movements')

      const movement = message.body
      const trainId = movement.train_id

      // Get or create train data
      let trainData = this.trainData.get(trainId)
      if (!trainData) {
        trainData = this.createNewTrainData(trainId)
        this.trainData.set(trainId, trainData)
      }

      // Update position
      const location = this.corpusClient.getLocationByStanox(movement.loc_stanox)
      trainData.currentPosition = {
        stanox: movement.loc_stanox,
        platform: movement.platform,
        stationName: location?.stationName,
        crs: location?.crsCode,
        timestamp: new Date(parseInt(movement.actual_timestamp) * 1000),
        confidence: 'HIGH',
      }

      // Add to movement history
      trainData.movements.push({
        eventType: movement.event_type,
        location: movement.loc_stanox,
        scheduledTime: new Date(parseInt(movement.planned_timestamp) * 1000),
        actualTime: new Date(parseInt(movement.actual_timestamp) * 1000),
        delayMinutes: Math.floor(parseInt(movement.timetable_variation) / 60) || 0,
        platform: movement.platform,
      })

      // Keep only recent movements (last 24 hours)
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000
      trainData.movements = trainData.movements.filter((m) => m.actualTime.getTime() > dayAgo)

      // Check for TSR impacts
      if (trainData.currentPosition) {
        const affectingTSRs = this.tsrClient.getTSRsForStation(trainData.currentPosition.stanox)
        trainData.affectingTSRs = affectingTSRs
        trainData.estimatedTSRDelay = affectingTSRs.reduce((total, tsr) => {
          return total + this.estimateTSRDelay(tsr)
        }, 0)
      }

      // Update data quality
      trainData.dataQuality = {
        movementsFresh: true,
        positionConfidence: 'HIGH',
        scheduleAccuracy: trainData.schedule ? 'CONFIRMED' : 'UNKNOWN',
        lastUpdate: new Date(),
      }
    } catch (error) {
      console.error('Error processing train movement:', error)
    }
  }

  /**
   * Handle VSTP messages
   */
  private handleVSTPMessage(message: VSTPMessage): void {
    try {
      this.updateFeedStats('vstp')

      const vstp = message.body
      console.log(`📅 VSTP ${vstp.transaction_type}: ${vstp.train_uid}`)

      // Here you would process schedule changes
      // This could update existing train data with new schedule information
    } catch (error) {
      console.error('Error processing VSTP message:', error)
    }
  }

  /**
   * Handle Train Describer messages
   */
  private handleTrainDescriberMessage(message: TrainDescriberMessage): void {
    try {
      this.updateFeedStats('td')

      // Process TD messages for berth-level positioning
      // This would enhance position data with more granular berth information
    } catch (error) {
      console.error('Error processing Train Describer message:', error)
    }
  }

  /**
   * Create new train data entry
   */
  private createNewTrainData(trainId: string): AggregatedTrainData {
    return {
      trainId,
      movements: [],
      affectingTSRs: [],
      estimatedTSRDelay: 0,
      dataQuality: {
        movementsFresh: false,
        positionConfidence: 'LOW',
        scheduleAccuracy: 'UNKNOWN',
        lastUpdate: new Date(),
      },
    }
  }

  /**
   * Estimate delay from TSR
   */
  private estimateTSRDelay(tsr: ProcessedTSR): number {
    // Simple estimation - would be more complex in reality
    const speedReduction = 70 - tsr.speedLimit
    return Math.round(speedReduction / 10) // Rough minutes of delay
  }

  /**
   * Update feed statistics
   */
  private updateFeedStats(feed: keyof typeof this.feedStats): void {
    const stats = this.feedStats[feed]
    stats.messageCount++
    stats.lastMessage = new Date()
  }

  /**
   * Start statistics tracking
   */
  private startStatsTracking(): void {
    this.statsInterval = setInterval(() => {
      // Calculate message rates (messages per minute)
      Object.values(this.feedStats).forEach((stats) => {
        stats.rate = stats.messageCount // Reset counter for next minute
        stats.messageCount = 0
      })

      // Log statistics
      const status = this.getNetworkStatus()
      console.log(
        `📊 Network Rail Status: ${status.overall} | Performance: ${status.performance.nationalOnTime.toFixed(1)}% | Active TSRs: ${status.performance.activeTSRs}`
      )
    }, 60000) // Every minute
  }
}

// Singleton instance
let feedsAggregator: NetworkRailFeedsAggregator | null = null

export function getNetworkRailAggregator(): NetworkRailFeedsAggregator {
  if (!feedsAggregator) {
    const config: NetworkRailConfig = {
      username: process.env.NETWORK_RAIL_USERNAME || '',
      password: process.env.NETWORK_RAIL_PASSWORD || '',
      apiUrl: process.env.NETWORK_RAIL_API_URL || 'https://publicdatafeeds.networkrail.co.uk',
      stompUrl:
        process.env.NETWORK_RAIL_STOMP_URL || 'stomp://publicdatafeeds.networkrail.co.uk:61618',
    }

    feedsAggregator = new NetworkRailFeedsAggregator(config)
  }

  return feedsAggregator
}

export default NetworkRailFeedsAggregator
