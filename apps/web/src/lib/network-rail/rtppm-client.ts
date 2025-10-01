// Network Rail RTPPM (Real Time Public Performance Measure) Client
// Handles real-time performance metrics and punctuality data for operators and routes

import { NetworkRailConfig, NetworkRailAPIError } from './types'

export interface RTPPMMessage {
  header: {
    msg_type: string
    source_dev_id: string
    user_id: string
    timestamp: string
    source_system_id: string
  }
  body: RTPPMData
}

export interface RTPPMData {
  RTPPMDataMsgV1: {
    timestamp: string
    time_period: string // Format: "2024-01-15"
    sector_code: string // e.g., "NW", "SE", "LONDON", etc.
    sector_desc: string

    // Performance metrics
    national: RTPPMMetrics
    operator_page: RTPPMOperatorData[]
    route_page?: RTPPMRouteData[]
    station_page?: RTPPMStationData[]
  }
}

export interface RTPPMMetrics {
  pp_text: string // Performance percentage as text
  pp_percentage: number // Numeric percentage
  total_services: number
  on_time: number
  late: number
  very_late: number // >30 minutes
  cancelled: number

  // Moving averages
  ma_pp_text: string // Moving average performance text
  ma_pp_percentage: number // Moving average percentage

  // Period information
  period_start: string
  period_end: string
}

export interface RTPPMOperatorData {
  operator_code: string // e.g., "AW", "GW", "VT"
  operator_name: string
  sector_code: string

  // Current period performance
  performance: RTPPMMetrics

  // Previous periods for comparison
  previous_periods?: {
    yesterday?: RTPPMMetrics
    last_week?: RTPPMMetrics
    last_month?: RTPPMMetrics
  }

  // Service categories
  long_distance?: RTPPMMetrics
  regional?: RTPPMMetrics
  london_se?: RTPPMMetrics
}

export interface RTPPMRouteData {
  route_code: string
  route_name: string
  operator_code: string

  performance: RTPPMMetrics

  // Route-specific metrics
  major_stations: {
    origin: string
    destination: string
    performance: RTPPMMetrics
  }[]
}

export interface RTPPMStationData {
  station_code: string // CRS code
  station_name: string
  operator_codes: string[] // Multiple operators may serve the station

  // Arrival performance
  arrivals: RTPPMMetrics
  // Departure performance
  departures: RTPPMMetrics

  // Platform-level data if available
  platforms?: {
    platform_number: string
    performance: RTPPMMetrics
  }[]
}

export interface ProcessedPerformanceData {
  timestamp: Date
  period: string
  sector: {
    code: string
    description: string
  }

  // National overview
  nationalPerformance: {
    current: PerformanceSummary
    movingAverage: PerformanceSummary
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING'
  }

  // Operator breakdown
  operatorPerformance: OperatorPerformanceSummary[]

  // Route performance
  routePerformance: RoutePerformanceSummary[]

  // Station performance
  stationPerformance: StationPerformanceSummary[]

  // Analysis
  insights: PerformanceInsight[]
}

export interface PerformanceSummary {
  onTimePercentage: number
  totalServices: number
  onTime: number
  late: number
  veryLate: number
  cancelled: number
  grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
}

export interface OperatorPerformanceSummary {
  operatorCode: string
  operatorName: string
  performance: PerformanceSummary
  rank: number // Ranking among all operators
  change: {
    vsYesterday: number // Percentage point change
    vsLastWeek: number
    trend: 'UP' | 'DOWN' | 'STABLE'
  }
}

export interface RoutePerformanceSummary {
  routeCode: string
  routeName: string
  operatorCode: string
  performance: PerformanceSummary
  majorStations: {
    origin: string
    destination: string
    performance: PerformanceSummary
  }[]
}

export interface StationPerformanceSummary {
  stationCode: string
  stationName: string
  arrivals: PerformanceSummary
  departures: PerformanceSummary
  overallGrade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
}

export interface PerformanceInsight {
  type: 'ALERT' | 'TREND' | 'COMPARISON' | 'ACHIEVEMENT'
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  description: string
  affectedOperators?: string[]
  affectedRoutes?: string[]
  recommendation?: string
}

export class RTPPMClient {
  private config: NetworkRailConfig
  private currentData: ProcessedPerformanceData | null = null
  private historicalData = new Map<string, ProcessedPerformanceData>()
  private maxHistoricalDays = 30

  constructor(config: NetworkRailConfig) {
    this.config = config
  }

  /**
   * Process incoming RTPPM message from STOMP feed
   */
  processRTPPMMessage(message: RTPPMMessage): void {
    try {
      const rtppmData = message.body.RTPPMDataMsgV1
      const processed = this.processRawRTPPMData(rtppmData)

      // Store current data
      this.currentData = processed

      // Store historical data
      this.historicalData.set(processed.period, processed)
      this.cleanupHistoricalData()

      // Log significant performance changes
      this.logPerformanceAlerts(processed)
    } catch (error) {
      console.error('Error processing RTPPM message:', error)
    }
  }

  /**
   * Get current national performance summary
   */
  getNationalPerformance(): PerformanceSummary | null {
    return this.currentData?.nationalPerformance.current || null
  }

  /**
   * Get performance data for specific operator
   */
  getOperatorPerformance(operatorCode: string): OperatorPerformanceSummary | null {
    if (!this.currentData) return null

    return (
      this.currentData.operatorPerformance.find((op) => op.operatorCode === operatorCode) || null
    )
  }

  /**
   * Get performance data for specific route
   */
  getRoutePerformance(routeCode: string): RoutePerformanceSummary | null {
    if (!this.currentData) return null

    return this.currentData.routePerformance.find((route) => route.routeCode === routeCode) || null
  }

  /**
   * Get performance data for specific station
   */
  getStationPerformance(stationCode: string): StationPerformanceSummary | null {
    if (!this.currentData) return null

    return (
      this.currentData.stationPerformance.find((station) => station.stationCode === stationCode) ||
      null
    )
  }

  /**
   * Get top performing operators
   */
  getTopPerformers(limit: number = 10): OperatorPerformanceSummary[] {
    if (!this.currentData) return []

    return this.currentData.operatorPerformance
      .slice()
      .sort((a, b) => b.performance.onTimePercentage - a.performance.onTimePercentage)
      .slice(0, limit)
  }

  /**
   * Get worst performing operators
   */
  getWorstPerformers(limit: number = 10): OperatorPerformanceSummary[] {
    if (!this.currentData) return []

    return this.currentData.operatorPerformance
      .slice()
      .sort((a, b) => a.performance.onTimePercentage - b.performance.onTimePercentage)
      .slice(0, limit)
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrend(days: number = 7): {
    dates: string[]
    nationalPerformance: number[]
    operatorTrends: { [operatorCode: string]: number[] }
  } {
    const trends = {
      dates: [] as string[],
      nationalPerformance: [] as number[],
      operatorTrends: {} as { [operatorCode: string]: number[] },
    }

    const sortedDates = Array.from(this.historicalData.keys()).sort().slice(-days)

    sortedDates.forEach((date) => {
      const data = this.historicalData.get(date)
      if (data) {
        trends.dates.push(date)
        trends.nationalPerformance.push(data.nationalPerformance.current.onTimePercentage)

        data.operatorPerformance.forEach((op) => {
          if (!trends.operatorTrends[op.operatorCode]) {
            trends.operatorTrends[op.operatorCode] = []
          }
          trends.operatorTrends[op.operatorCode].push(op.performance.onTimePercentage)
        })
      }
    })

    return trends
  }

  /**
   * Get current performance insights
   */
  getPerformanceInsights(): PerformanceInsight[] {
    return this.currentData?.insights || []
  }

  /**
   * Process raw RTPPM data into structured format
   */
  private processRawRTPPMData(data: RTPPMData['RTPPMDataMsgV1']): ProcessedPerformanceData {
    const timestamp = new Date(data.timestamp)

    // Process national performance
    const nationalCurrent = this.processMetrics(data.national)
    const nationalMA = {
      ...nationalCurrent,
      onTimePercentage: data.national.ma_pp_percentage,
    }

    // Determine trend
    const trend = this.calculateTrend(data.national.pp_percentage, data.national.ma_pp_percentage)

    // Process operators
    const operatorPerformance =
      data.operator_page?.map((op, index) => ({
        operatorCode: op.operator_code,
        operatorName: op.operator_name,
        performance: this.processMetrics(op.performance),
        rank: index + 1,
        change: this.calculateOperatorChange(op),
      })) || []

    // Process routes
    const routePerformance =
      data.route_page?.map((route) => ({
        routeCode: route.route_code,
        routeName: route.route_name,
        operatorCode: route.operator_code,
        performance: this.processMetrics(route.performance),
        majorStations:
          route.major_stations?.map((station) => ({
            origin: station.origin,
            destination: station.destination,
            performance: this.processMetrics(station.performance),
          })) || [],
      })) || []

    // Process stations
    const stationPerformance =
      data.station_page?.map((station) => ({
        stationCode: station.station_code,
        stationName: station.station_name,
        arrivals: this.processMetrics(station.arrivals),
        departures: this.processMetrics(station.departures),
        overallGrade: this.calculateGrade(
          (station.arrivals.pp_percentage + station.departures.pp_percentage) / 2
        ),
      })) || []

    // Generate insights
    const insights = this.generateInsights(nationalCurrent, operatorPerformance, routePerformance)

    return {
      timestamp,
      period: data.time_period,
      sector: {
        code: data.sector_code,
        description: data.sector_desc,
      },
      nationalPerformance: {
        current: nationalCurrent,
        movingAverage: nationalMA,
        trend,
      },
      operatorPerformance,
      routePerformance,
      stationPerformance,
      insights,
    }
  }

  /**
   * Process metrics into standardized format
   */
  private processMetrics(metrics: RTPPMMetrics): PerformanceSummary {
    return {
      onTimePercentage: metrics.pp_percentage,
      totalServices: metrics.total_services,
      onTime: metrics.on_time,
      late: metrics.late,
      veryLate: metrics.very_late,
      cancelled: metrics.cancelled,
      grade: this.calculateGrade(metrics.pp_percentage),
    }
  }

  /**
   * Calculate performance grade
   */
  private calculateGrade(percentage: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
    if (percentage >= 95) return 'EXCELLENT'
    if (percentage >= 90) return 'GOOD'
    if (percentage >= 80) return 'FAIR'
    return 'POOR'
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(
    current: number,
    movingAverage: number
  ): 'IMPROVING' | 'STABLE' | 'DECLINING' {
    const diff = current - movingAverage
    if (Math.abs(diff) <= 1) return 'STABLE'
    return diff > 0 ? 'IMPROVING' : 'DECLINING'
  }

  /**
   * Calculate operator change metrics
   */
  private calculateOperatorChange(op: RTPPMOperatorData): {
    vsYesterday: number
    vsLastWeek: number
    trend: 'UP' | 'DOWN' | 'STABLE'
  } {
    const yesterday = op.previous_periods?.yesterday?.pp_percentage || op.performance.pp_percentage
    const lastWeek = op.previous_periods?.last_week?.pp_percentage || op.performance.pp_percentage

    const vsYesterday = op.performance.pp_percentage - yesterday
    const vsLastWeek = op.performance.pp_percentage - lastWeek

    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE'
    if (vsYesterday > 1) trend = 'UP'
    else if (vsYesterday < -1) trend = 'DOWN'

    return { vsYesterday, vsLastWeek, trend }
  }

  /**
   * Generate performance insights
   */
  private generateInsights(
    national: PerformanceSummary,
    operators: OperatorPerformanceSummary[],
    routes: RoutePerformanceSummary[]
  ): PerformanceInsight[] {
    const insights: PerformanceInsight[] = []

    // National performance alerts
    if (national.onTimePercentage < 80) {
      insights.push({
        type: 'ALERT',
        severity: 'CRITICAL',
        title: 'Poor National Performance',
        description: `National on-time performance is ${national.onTimePercentage.toFixed(1)}%, below the 80% target.`,
        recommendation: 'Monitor individual operator and route performance for root causes.',
      })
    }

    // Operator performance alerts
    operators.forEach((op) => {
      if (op.performance.onTimePercentage < 70) {
        insights.push({
          type: 'ALERT',
          severity: 'WARNING',
          title: `Poor Performance: ${op.operatorName}`,
          description: `${op.operatorName} (${op.operatorCode}) performance is ${op.performance.onTimePercentage.toFixed(1)}%`,
          affectedOperators: [op.operatorCode],
          recommendation: 'Review operator-specific disruptions and capacity issues.',
        })
      }

      if (op.change.trend === 'UP' && op.change.vsYesterday > 5) {
        insights.push({
          type: 'ACHIEVEMENT',
          severity: 'INFO',
          title: `Improved Performance: ${op.operatorName}`,
          description: `${op.operatorName} performance improved by ${op.change.vsYesterday.toFixed(1)}% vs yesterday`,
          affectedOperators: [op.operatorCode],
        })
      }
    })

    return insights
  }

  /**
   * Log significant performance alerts
   */
  private logPerformanceAlerts(data: ProcessedPerformanceData): void {
    const criticalInsights = data.insights.filter((i) => i.severity === 'CRITICAL')

    criticalInsights.forEach((insight) => {
      console.warn(`📊 RTPPM ALERT: ${insight.title} - ${insight.description}`)
    })

    // Log national performance
    const national = data.nationalPerformance.current
    console.log(
      `📈 National Performance: ${national.onTimePercentage.toFixed(1)}% (${national.grade})`
    )
  }

  /**
   * Clean up old historical data
   */
  private cleanupHistoricalData(): void {
    if (this.historicalData.size <= this.maxHistoricalDays) return

    const sortedDates = Array.from(this.historicalData.keys()).sort()
    const toDelete = sortedDates.slice(0, sortedDates.length - this.maxHistoricalDays)

    toDelete.forEach((date) => {
      this.historicalData.delete(date)
    })
  }
}

export default RTPPMClient
