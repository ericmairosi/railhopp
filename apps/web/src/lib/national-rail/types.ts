// National Rail API Types for Disruptions and Service Information
// Covers NationalRail Disruptions API and additional National Rail services

export interface NationalRailConfig {
  apiKey: string
  apiUrl: string
  timeout?: number
  retries?: number
}

// Disruption Types
export interface NationalRailDisruption {
  incidentNumber: string
  incidentTitle: string
  incidentSummary: string
  incidentDescription: string
  incidentStatus: 'Open' | 'Closed' | 'Planned'
  incidentType: 'Delay' | 'Cancellation' | 'Engineering Work' | 'Strike' | 'Weather' | 'Other'
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Critical'
  startTime: string
  endTime?: string
  lastUpdated: string
  affectedOperators: string[]
  affectedRoutes: NationalRailAffectedRoute[]
  alternativeTransport?: string
  passengerAdvice: string
  url?: string
}

export interface NationalRailAffectedRoute {
  routeName: string
  fromStation: {
    name: string
    crs: string
  }
  toStation: {
    name: string
    crs: string
  }
  direction?: 'Both' | 'Inbound' | 'Outbound'
}

// Service Performance Types
export interface ServicePerformanceMetrics {
  operatorCode: string
  operatorName: string
  period: {
    startDate: string
    endDate: string
  }
  performance: {
    punctuality: number // percentage
    reliability: number // percentage
    customerSatisfaction?: number
  }
  metrics: {
    totalServices: number
    onTimeServices: number
    cancelledServices: number
    delayedServices: number
  }
}

// Station Facilities Types (complementing Knowledge Station)
export interface NationalRailStationFacilities {
  crs: string
  stationName: string
  facilities: {
    ticketOffice: boolean
    waitingRoom: boolean
    toilets: boolean
    disabledToilets: boolean
    babyChanging: boolean
    wifi: boolean
    refreshments: boolean
    parking: boolean
    carPark: boolean
    bicycleStorage: boolean
    taxiRank: boolean
    busStop: boolean
    helpPoint: boolean
    payphone: boolean
    postBox: boolean
    cashMachine: boolean
  }
  accessibility: {
    stepFreeAccess: boolean
    wheelchairAccessible: boolean
    assistedBoardingAvailable: boolean
    inductionLoop: boolean
    largePrintTimetables: boolean
  }
  staffing: {
    staffed: boolean
    staffingHours?: string
  }
  lastUpdated: string
}

// Timetable Change Types
export interface TimetableChange {
  changeId: string
  title: string
  description: string
  effectiveFrom: string
  effectiveTo?: string
  changeType: 'New Service' | 'Service Withdrawal' | 'Timing Change' | 'Route Change'
  affectedServices: {
    operatorCode: string
    serviceNumber?: string
    routeDescription: string
  }[]
  publishedDate: string
}

// Error Types
export class NationalRailAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'NationalRailAPIError'
  }
}

// Response wrapper types
export interface NationalRailResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata: {
    timestamp: string
    requestId?: string
    rateLimit?: {
      remaining: number
      resetTime: string
    }
  }
}

// Status and health check types
export interface NationalRailStatus {
  available: boolean
  lastHealthCheck: Date
  responseTime: number
  apiLimits: {
    hourlyLimit: number
    remaining: number
    resetTime: Date
  }
  services: {
    disruptions: boolean
    facilities: boolean
    performance: boolean
    timetables: boolean
  }
}
