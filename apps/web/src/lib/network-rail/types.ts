// Network Rail API Types for Train Movements, VSTP, SMART, CORPUS, etc.
// Comprehensive types for all Network Rail data feeds

export interface NetworkRailConfig {
  username: string
  password: string
  apiUrl: string
  stompUrl: string
  timeout?: number
  retries?: number
}

// Train Movement Types
export interface TrainMovementMessage {
  header: {
    msg_type: string
    source_dev_id: string
    user_id: string
    timestamp: string
    source_system_id: string
  }
  body: TrainMovement
}

export interface TrainMovement {
  event_type: 'ARRIVAL' | 'DEPARTURE'
  gbtt_timestamp: string
  original_loc_stanox: string
  planned_timestamp: string
  timetable_variation: string
  original_loc_timestamp: string
  current_train_id: string
  delay_monitoring_point: boolean
  next_report_run_time: string
  reporting_stanox: string
  actual_timestamp: string
  correction_ind: boolean
  event_source: string
  train_file_address?: string
  platform?: string
  division_code: string
  train_terminated: boolean
  train_id: string
  offroute_ind: boolean
  variation_status: 'EARLY' | 'ON TIME' | 'LATE'
  train_service_code: string
  toc_id: string
  loc_stanox: string
  auto_expected: boolean
  direction_ind: string
  route: string
  planned_event_type: 'ARRIVAL' | 'DEPARTURE'
  next_report_stanox: string
  line_ind: string
}

// VSTP (Very Short Term Planning) Types
export interface VSTPMessage {
  header: {
    msg_type: string
    source_dev_id: string
    user_id: string
    timestamp: string
    source_system_id: string
  }
  body: VSTPSchedule
}

export interface VSTPSchedule {
  schedule_start_date: string
  schedule_end_date: string
  schedule_days_runs: string
  train_uid: string
  schedule_segment: VSTPScheduleSegment
  CIF_train_uid: string
  CIF_stp_indicator: string
  transaction_type: 'Create' | 'Delete'
}

export interface VSTPScheduleSegment {
  signalling_id: string
  CIF_train_category: string
  CIF_headcode: string
  schedule_location: VSTPLocation[]
  atoc_code: string
}

export interface VSTPLocation {
  location_order: number
  CIF_record_identity: string
  location_type: string
  record_identity: string
  tiploc_code: string
  tiploc_instance: string
  departure?: string
  arrival?: string
  pass?: string
  public_departure?: string
  public_arrival?: string
  platform?: string
  line?: string
  path?: string
  engineering_allowance?: string
  pathing_allowance?: string
  performance_allowance?: string
}

// Train Describer Types
export interface TrainDescriberMessage {
  header: {
    msg_type: string
    source_dev_id: string
    user_id: string
    timestamp: string
    source_system_id: string
  }
  body: TrainDescriberStep | TrainDescriberCancel
}

export interface TrainDescriberStep {
  msg_type: 'CA' | 'CB' | 'CC' | 'CT'
  area_id: string
  from: string
  to: string
  descr: string
  time: string
}

export interface TrainDescriberCancel {
  msg_type: 'SF'
  area_id: string
  address: string
  time: string
}

// Reference Data Types
export interface CorpusEntry {
  stanox: number
  uic: number
  crs_code: string
  nlcdesc16: string
  tiploc: string
  nlc: number
  stanme: string
}

export interface SmartEntry {
  from_berth: string
  to_berth: string
  from_stanox: string
  to_stanox: string
  from_line: string
  to_line: string
  berthstep: string
  event: string
  route: string
  steptype: string
  comment: string
}

// Schedule Types
export interface ScheduleMessage {
  JsonScheduleV1: {
    classification: string
    schedule_start_date: string
    schedule_end_date: string
    schedule_days_runs: string
    CIF_bank_holiday_running?: string
    train_status: string
    train_category: string
    signalling_id: string
    CIF_headcode: string
    CIF_train_service_code: string
    CIF_business_sector: string
    CIF_power_type: string
    CIF_timing_load: string
    CIF_speed: string
    CIF_operating_characteristics: string
    CIF_train_class: string
    CIF_sleepers: string
    CIF_reservations: string
    CIF_connection_indicator: string
    CIF_catering_code: string
    CIF_service_branding: string
    schedule_location: ScheduleLocation[]
    new_schedule_segment?: unknown
    train_uid: string
    applicable_timetable: string
    atoc_code: string
  }
}

export interface ScheduleLocation {
  location_order: string
  CIF_record_identity: string
  location_type: string
  record_identity: string
  tiploc_code: string
  tiploc_instance: string
  arrival?: string
  departure?: string
  pass?: string
  public_arrival?: string
  public_departure?: string
  platform?: string
  line?: string
  path?: string
  activity?: string
  engineering_allowance?: string
  pathing_allowance?: string
  performance_allowance?: string
}

// Error Types
export class NetworkRailAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'NetworkRailAPIError'
  }
}

// Enhanced service info combining multiple sources
export interface EnhancedTrainService {
  // Core identifiers
  trainId: string
  headcode: string
  uid: string

  // Service details
  origin: {
    tiploc: string
    crs?: string
    name?: string
    scheduledTime: string
    actualTime?: string
  }

  destination: {
    tiploc: string
    crs?: string
    name?: string
    scheduledTime: string
    actualTime?: string
  }

  // Current status
  currentLocation?: {
    stanox: string
    berth?: string
    platform?: string
    timestamp: string
  }

  // Movement history
  movements: TrainMovement[]

  // Schedule information
  schedule?: VSTPSchedule

  // Performance
  delayMinutes: number
  variationStatus: 'EARLY' | 'ON TIME' | 'LATE'

  // Metadata
  toc: string
  serviceCode: string
  lastUpdated: Date
  dataSource: 'network-rail'
}

// Aggregated data types
export interface NetworkRailDataQuality {
  movementsFresh: boolean
  vstpCoverage: number
  describerActive: boolean
  lastUpdate: Date
}

export interface NetworkRailStatus {
  feeds: {
    movements: boolean
    vstp: boolean
    describer: boolean
    schedule: boolean
  }
  lastHealthCheck: Date
  responseTime: number
}

// SCHEDULE Feed Types
export interface ScheduleConfig extends NetworkRailConfig {
  feedName: 'SCHEDULE'
}

export interface ScheduleMessageWrapper {
  messageType: 'schedule' | 'association'
  timestamp: string
  data: unknown
  sourceSystem: 'ITPS'
  sequenceNumber: number
}

export interface ScheduleRecord {
  recordType: 'schedule' | 'association'
  transactionType: 'Create' | 'Update' | 'Delete'
  data: unknown
  timestamp: string
  sequenceNumber: number
}

export interface TrainSchedule {
  trainUid: string
  headcode: string
  trainCategory: string
  trainIdentity: string
  operator: string
  powerType: string
  timingLoad: string
  speed: string
  operatingCharacteristics: string
  trainClass: string
  sleepers: string
  reservations: string
  connectionIndicator: string
  cateringCode: string
  serviceBranding: string
  scheduleStartDate: string
  scheduleEndDate: string
  scheduleStatus: string
  scheduleSource: string
  locations: ScheduleLocationDetail[]
  associations: AssociationRecord[]
}

export interface ScheduleLocationDetail {
  locationOrder: number
  tiploc: string
  crs?: string
  locationName?: string
  scheduledArrival?: string
  scheduledDeparture?: string
  publicArrival?: string
  publicDeparture?: string
  platform?: string
  activities: string
  engineeringAllowance: number
  pathingAllowance: number
  performanceAllowance: number
}

export interface AssociationRecord {
  transactionType: 'Create' | 'Update' | 'Delete'
  mainTrainUid: string
  associatedTrainUid: string
  associationStartDate: string
  associationEndDate: string
  associationCategory: string
  associationDateIndicator: string
  location: string
  baseLocationSuffix?: string
  associatedLocationSuffix?: string
  diagramType?: string
  associationType: string
}

// TPS Feed Types
export interface TPSConfig extends NetworkRailConfig {
  feedName: 'TPS'
}

export interface TPSMessage {
  messageType: 'timing_point' | 'route_section' | 'network_topology'
  timestamp: string
  data: unknown
  sourceSystem: 'TPS'
  sequenceNumber: number
}

export interface TPSRecord {
  recordType: 'timing_point' | 'route_section' | 'network_topology'
  data: unknown
  timestamp: string
  sequenceNumber: number
}

export interface TimingPoint {
  tiploc: string
  crs?: string
  stanox: string
  nalco: string
  description: string
  easting: number
  northing: number
  changeTime: number
  tpsDescription: string
  subsidiaryLocation: string
  operatingCompany: string
  workingTimetableId: string
}

export interface RouteSection {
  routeCode: string
  description: string
  fromTiploc: string
  toTiploc: string
  mileage: number
  electrified: boolean
  maxSpeed: number
  routeType: string
  operatingCompany: string
  signallingSystem: string
  gradients: Array<{
    mileage: number
    gradient: number
  }>
  speedRestrictions: Array<{
    fromMileage: number
    toMileage: number
    speed: number
    reason?: string
  }>
}
