// Darwin API Types for UK Rail Real-time Information
// Core types for the National Rail Darwin API

export interface DarwinConfig {
  // STOMP protocol configuration (Darwin uses STOMP)
  stompUrl?: string
  queueUrl: string
  username: string
  password: string
  queueName: string
  clientId: string
  enabled: boolean
  timeout?: number
  retries?: number

  // Legacy fields (kept for backward compatibility)
  apiUrl?: string
  apiToken?: string
}

// Darwin Pub/Sub Message Types (from JSON schema)
export interface DarwinPubSubMessage {
  destination: {
    name: string
    destinationType: string
  }
  messageID: string
  type: any
  priority: number
  redelivered: boolean
  messageType: string
  deliveryMode: number
  bytes: string // Base64 encoded XML message
  replyTo?: string
  correlationID?: string
  expiration: number
  text?: string
  map?: any
  properties: {
    Username: {
      string: string
      propertyType: string
      [key: string]: any
    }
    PushPortSequence: {
      string: string
      propertyType: string
      [key: string]: any
    }
  }
  timestamp: number
}

// Darwin XML Message Types (parsed from bytes)
export interface DarwinXMLMessage {
  Pport?: {
    '@_ts': string
    '@_version': string
    uR?: {
      '@_updateOrigin': string
      TS?: DarwinTrainStatus[]
    }
  }
}

export interface DarwinTrainStatus {
  '@_rid': string
  '@_uid': string
  '@_ssd': string
  Location?: DarwinLocation[]
}

export interface DarwinLocation {
  '@_tpl': string
  '@_wta'?: string
  '@_wtd'?: string
  '@_pta'?: string
  '@_ptd'?: string
  arr?: {
    '@_at': string
    '@_atClass': string
    '@_src': string
  }
  dep?: {
    '@_at': string
    '@_atClass': string
    '@_src': string
  }
  plat?: {
    '@_platsrc': string
    '@_conf': string
    '#text': string
  }
  length?: string
}

export interface StationBoardRequest {
  crs: string
  numRows?: number
  filterCrs?: string
  filterType?: 'to' | 'from'
  timeOffset?: number
  timeWindow?: number
}

export interface LiveDeparture {
  serviceID: string
  rsid?: string
  operator: string
  operatorCode: string
  destination: string
  destinationCRS: string
  origin?: string
  originCRS?: string
  std: string // Scheduled departure time
  etd: string // Estimated departure time
  platform?: string
  delayReason?: string
  serviceType: string
  length?: number
  cancelled?: boolean
  filterLocationCancelled?: boolean
  detachFront?: boolean
  isReverseFormation?: boolean
  cancelReason?: string
  formation?: TrainFormation
  activities?: string[]
}

export interface LiveStationBoard {
  locationName: string
  crs: string
  filterLocationName?: string
  filtercrs?: string
  filterType?: string
  departures: LiveDeparture[]
  generatedAt: string
  stationName: string
  stationCode: string
  messages?: StationMessage[]
  platformsAvailable?: boolean
}

export interface StationMessage {
  severity: 'info' | 'warning' | 'error'
  message: string
  category: string
}

export interface TrainServiceDetails {
  serviceID: string
  rsid?: string
  operator: string
  operatorCode: string
  runDate: string
  trainid?: string
  platform?: string
  delayReason?: string
  cancelReason?: string
  length?: number
  formation?: TrainFormation
  origin: ServiceLocation[]
  destination: ServiceLocation[]
  currentOrigins?: ServiceLocation[]
  currentDestinations?: ServiceLocation[]
  previousCallingPoints?: CallingPointList[]
  subsequentCallingPoints?: CallingPointList[]
}

export interface ServiceLocation {
  locationName: string
  crs: string
  via?: string
  futureChangeTo?: string
}

export interface CallingPointList {
  serviceType?: string
  serviceChangeRequired?: boolean
  assocIsCancelled?: boolean
  callingPoint: CallingPoint[]
}

export interface CallingPoint {
  locationName: string
  crs: string
  st?: string // Scheduled time
  et?: string // Estimated time
  at?: string // Actual time
  isCancelled?: boolean
  length?: number
  detachFront?: boolean
  formation?: TrainFormation
  adhocAlerts?: string[]
}

export interface TrainFormation {
  avgLoading?: number
  coaches?: Coach[]
}

export interface Coach {
  coachClass: string
  toilet?: ToiletInfo
  loading?: number
  number?: string
}

export interface ToiletInfo {
  status: string
  value?: string
}

// Error types
export class DarwinAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'DarwinAPIError'
  }
}

// Response wrapper
export interface DarwinResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}
