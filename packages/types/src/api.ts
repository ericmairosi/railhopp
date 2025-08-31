// API types for external data feeds and internal APIs

// Darwin API Types
export interface DarwinDeparture {
  std: string; // scheduled time of departure
  etd: string; // estimated time of departure
  platform?: string;
  operator: string;
  operatorCode: string;
  service: string;
  length?: number;
  delayReason?: string;
  cancelReason?: string;
  destination: DarwinLocation[];
  origin?: DarwinLocation[];
}

export interface DarwinLocation {
  locationName: string;
  crs: string;
  via?: string;
}

// Network Rail Feed Types
export interface TrainMovement {
  event_type: string;
  gbtt_timestamp: string;
  original_loc_stanox: string;
  planned_timestamp: string;
  timetable_variation: string;
  original_loc_timestamp: string;
  current_train_id: string;
  delay_monitoring_point: boolean;
  next_report_run_time: string;
  reporting_stanox: string;
  actual_timestamp: string;
  correction_ind: boolean;
  event_source: string;
  train_file_address?: string;
  platform?: string;
  division_code: string;
  train_terminated: boolean;
  train_id: string;
  offroute_ind: boolean;
  variation_status: string;
  train_service_code: string;
  toc_id: string;
  loc_stanox: string;
  auto_expected: boolean;
  direction_ind: string;
  route: string;
  planned_event_type: string;
  next_report_stanox: string;
  line_ind: string;
}

// Internal API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  cached?: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface LiveDeparturesRequest {
  stationCode: string;
  timeWindow?: number; // minutes
  filterType?: 'departures' | 'arrivals' | 'both';
  numRows?: number;
}

export interface JourneyPlanRequest {
  from: string;
  to: string;
  departureTime?: Date;
  arrivalTime?: Date;
  journeyType?: 'departure' | 'arrival';
  maxChanges?: number;
  accessibilityNeeds?: boolean;
}

export interface JourneyPlanResponse {
  journeys: Journey[];
  searchParams: JourneyPlanRequest;
  searchTime: Date;
}

export interface Journey {
  id: string;
  departureTime: Date;
  arrivalTime: Date;
  duration: number; // minutes
  changes: number;
  legs: JourneyLeg[];
  price?: Price;
  carbon?: number; // kg CO2
  reliability?: number; // percentage
}

export interface JourneyLeg {
  mode: 'train' | 'walk' | 'bus';
  operator?: string;
  serviceId?: string;
  from: Station;
  to: Station;
  departureTime: Date;
  arrivalTime: Date;
  platform?: string;
  duration: number;
  distance?: number; // meters for walking
}

export interface Price {
  adult: number;
  child?: number;
  currency: string;
  ticketType: string;
  restrictions?: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'departure_update' | 'service_update' | 'disruption' | 'alert';
  timestamp: Date;
  data: any;
}

export interface DepartureUpdate extends WebSocketMessage {
  type: 'departure_update';
  data: {
    stationCode: string;
    departures: DarwinDeparture[];
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}
