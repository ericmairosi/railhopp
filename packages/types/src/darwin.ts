// Darwin API Type definitions
// Types for UK National Rail Darwin data feeds

export interface DarwinConfig {
  apiUrl: string
  token: string
  timeout?: number
  retries?: number
}

export interface StationBoardRequest {
  crs: string // Station CRS code (e.g., "KGX")
  numRows?: number // Number of services to return (default 10)
  filterCrs?: string // Filter by destination/origin station
  filterType?: 'to' | 'from'
  timeOffset?: number // Minutes from now
  timeWindow?: number // Minutes of services to include
}

export interface ServiceDetailsRequest {
  serviceId: string // Darwin service ID
}

// Raw Darwin API response types
export interface LiveStationBoard {
  stationName: string
  stationCode: string
  requestTime: string
  generatedAt: Date
  platformsAvailable: boolean
  services?: LiveDeparture[]
  busServices?: LiveDeparture[]
  ferryServices?: LiveDeparture[]
  nrccMessages?: NrccMessage[]
}

export interface LiveDeparture {
  serviceId: string
  serviceType: string
  trainNumber?: string
  operator: string
  operatorCode: string
  scheduledTime: string
  estimatedTime?: string
  actualTime?: string
  platform?: string
  destination: DarwinCallingPoint[]
  origin?: DarwinCallingPoint[]
  status: string
  delayReason?: string
  cancelled?: boolean
  filterLocationCancelled?: boolean
  length?: number
  detachFront?: boolean
  isReverseFormation?: boolean
  cancelReason?: string
  adhocAlert?: string
}

export interface TrainServiceDetails {
  serviceId: string
  trainNumber: string
  operator: string
  operatorCode: string
  status: string
  delayReason?: string
  cancelReason?: string
  platform?: string
  sta?: string // Scheduled time of arrival
  eta?: string // Estimated time of arrival
  ata?: string // Actual time of arrival
  std?: string // Scheduled time of departure
  etd?: string // Estimated time of departure
  atd?: string // Actual time of departure
  previousCallingPoints?: ServiceLocation[]
  subsequentCallingPoints?: ServiceLocation[]
  cancelled?: boolean
  length?: number
  detachFront?: boolean
  isReverseFormation?: boolean
  adhocAlert?: string
}

export interface DarwinCallingPoint {
  locationName: string
  crs: string
  via?: string
  futureChangeTo?: string
  assocIsCancelled?: boolean
}

export interface ServiceLocation {
  locationName: string
  crs: string
  via?: string
  sta?: string
  eta?: string
  ata?: string
  std?: string
  etd?: string
  atd?: string
  isCancelled?: boolean
  length?: number
  detachFront?: boolean
  formation?: FormationData
  adhocAlert?: string
}

export interface FormationData {
  avgLoading?: number
  coaches?: CoachData[]
}

export interface CoachData {
  coachClass: 'First' | 'Mixed' | 'Standard'
  loading?: number
  number?: string
  toilet?: ToiletAvailability
}

export interface ToiletAvailability {
  status: 'Unknown' | 'InService' | 'NotInService'
  value: 'Unknown' | 'Available' | 'NotAvailable'
}

export interface NrccMessage {
  category: string
  severity: number
  xhtmlMessage: string
  suppressPtd?: boolean
}

// Error types
export interface DarwinError {
  code: string
  message: string
  details?: any
}

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
