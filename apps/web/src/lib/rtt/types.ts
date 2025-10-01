// RTT.io (Real Time Trains) API Type Definitions
// Enhanced real-time train data with historical information

export interface RTTConfig {
  apiUrl: string
  apiKey: string
  timeout?: number
  retries?: number
  enabled?: boolean
}

export interface RTTDeparturesRequest {
  crs: string
  filterType?: 'to' | 'from'
  filterCrs?: string
  services?: string // 'passenger', 'freight', or 'all'
  date?: string // YYYY-MM-DD format
}

export interface RTTServiceRequest {
  serviceUid?: string
  trainId?: string
  date?: string // YYYY-MM-DD format
}

// Raw RTT.io API Response Types
export interface RTTDeparturesResponse {
  location: {
    name: string
    crs: string
    region?: string
    coordinates?: {
      lat: number
      lng: number
    }
    facilities?: string[]
  }
  services: RTTService[]
}

export interface RTTService {
  serviceUid: string
  trainid: string
  operatorCode: string
  operatorName: string
  serviceType: string
  platform?: string
  realTimeActivated: boolean
  formation?: {
    coaches: number
  }
  locationDetail: {
    realtimeActivated: boolean
    tiploc: string
    crs: string
    description: string
    gbttBookedArrival?: string
    gbttBookedDeparture?: string
    publicArrival?: string
    publicDeparture?: string
    realtimeArrival?: string
    realtimeDeparture?: string
    actualArrival?: string
    actualDeparture?: string
    realtimeArrivalActual?: boolean
    realtimeDepartureActual?: boolean
    platform?: string
    platformConfirmed: boolean
    platformChanged: boolean
    displayAs: string
    delayMinutes?: number
    cancelReasonCode?: string
    cancelReasonShortText?: string
    cancelReasonLongText?: string
    origin?: RTTLocation[]
    destination?: RTTLocation[]
  }
}

export interface RTTLocation {
  tiploc: string
  crs: string
  description: string
  workingTime?: string
  publicTime?: string
}

export interface RTTServiceResponse {
  serviceUid: string
  runDate: string
  trainid: string
  realTimeActivated: boolean
  serviceType: string
  atocCode: string
  atocName: string
  powerType?: string
  trainClass?: string
  sleeper?: boolean
  origin?: RTTLocation[]
  destination?: RTTLocation[]
  locations?: RTTServiceLocation[]
}

export interface RTTServiceLocation {
  realtimeActivated: boolean
  tiploc: string
  crs: string
  description: string
  gbttBookedArrival?: string
  gbttBookedDeparture?: string
  publicArrival?: string
  publicDeparture?: string
  realtimeArrival?: string
  realtimeDeparture?: string
  actualArrival?: string
  actualDeparture?: string
  realtimeArrivalActual?: boolean
  realtimeDepartureActual?: boolean
  platform?: string
  platformConfirmed: boolean
  platformChanged: boolean
  line?: string
  path?: string
  activities: string[]
  displayAs: string
  delayMinutes?: number
  cancelReasonCode?: string
  cancelReasonShortText?: string
  cancelReasonLongText?: string
}

// Transformed types for our application
export interface EnhancedDeparture {
  serviceId: string
  trainId: string
  operatorCode: string
  operatorName: string
  platform?: string
  scheduledDeparture: string
  estimatedDeparture?: string
  actualDeparture?: string
  destination: {
    name: string
    crs: string
  }
  origin: {
    name: string
    crs: string
  }
  status: string
  delayMinutes: number
  isCancelled: boolean
  cancelReason?: string
  formation?: {
    coaches: number
    length: number
  }
  realTimeActivated: boolean
  lastUpdated: Date
}

export interface EnhancedService {
  serviceId: string
  trainId: string
  operatorCode: string
  operatorName: string
  serviceType: string
  powerType?: string
  trainClass?: string
  sleeper?: boolean

  route: {
    origin: {
      name: string
      crs: string
    }
    destination: {
      name: string
      crs: string
    }
  }

  locations: EnhancedLocation[]
  realTimeActivated: boolean
  runDate: string
  lastUpdated: Date
}

export interface EnhancedLocation {
  name: string
  crs: string
  scheduledArrival?: string
  scheduledDeparture?: string
  estimatedArrival?: string
  estimatedDeparture?: string
  actualArrival?: string
  actualDeparture?: string
  platform?: string
  line?: string
  path?: string
  activities: string[]
  cancelled: boolean
  delayMinutes: number
}

// Error types
export interface RTTError {
  code: string
  message: string
  details?: any
}

export class RTTAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'RTTAPIError'
  }
}

// Enhanced station information
export interface EnhancedStationInfo {
  crs: string
  name: string
  region?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  facilities: string[]
  lastUpdated: Date
}
