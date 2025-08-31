// Core railway data types for Railhopp

export interface Station {
  code: string; // CRS code (e.g., "KGX")
  name: string;
  latitude: number;
  longitude: number;
  operator: string;
  facilities: StationFacility[];
  platforms: Platform[];
  accessibility: AccessibilityInfo;
}

export interface Platform {
  number: string;
  length?: number; // in meters
  accessibility: boolean;
}

export interface StationFacility {
  type: 'parking' | 'wifi' | 'toilets' | 'cafe' | 'shop' | 'taxi' | 'bus';
  available: boolean;
  details?: string;
}

export interface AccessibilityInfo {
  stepFreeAccess: boolean;
  wheelchairAccessible: boolean;
  hearingLoop: boolean;
  visualAids: boolean;
  staffAssistance: boolean;
}

export interface Service {
  serviceId: string;
  operator: string;
  origin: Station;
  destination: Station;
  scheduledDeparture: Date;
  scheduledArrival: Date;
  estimatedDeparture?: Date;
  estimatedArrival?: Date;
  platform?: string;
  status: ServiceStatus;
  callingPoints: CallingPoint[];
  coaches: number;
  formation?: TrainFormation;
}

export interface CallingPoint {
  station: Station;
  scheduledArrival?: Date;
  scheduledDeparture?: Date;
  estimatedArrival?: Date;
  estimatedDeparture?: Date;
  platform?: string;
  activities: ('pickup' | 'setdown' | 'request')[];
}

export interface TrainFormation {
  coaches: Coach[];
  direction: 'forward' | 'reverse';
}

export interface Coach {
  number: string;
  class: 'first' | 'standard';
  facilities: CoachFacility[];
  loading?: 'light' | 'moderate' | 'heavy';
}

export interface CoachFacility {
  type: 'wifi' | 'power' | 'quiet' | 'accessible' | 'bicycle' | 'catering';
  available: boolean;
}

export type ServiceStatus = 
  | 'on-time'
  | 'delayed'
  | 'cancelled'
  | 'diverted'
  | 'terminated'
  | 'starts-here';

export interface Disruption {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'severe';
  type: 'planned' | 'unplanned';
  affectedRoutes: string[];
  affectedStations: string[];
  startTime: Date;
  endTime?: Date;
  alternativeRoutes?: string[];
}

export interface TemporarySpeedRestriction {
  id: string;
  description: string;
  speedLimit: number; // mph
  location: TSRLocation;
  startTime: Date;
  endTime?: Date;
  reason: string;
}

export interface TSRLocation {
  startMileage: number;
  endMileage: number;
  route: string;
  coordinates: [number, number][]; // lat, lng pairs
}

export interface VSTPChange {
  id: string;
  serviceId: string;
  changeType: 'new' | 'cancel' | 'modify';
  details: string;
  effectiveDate: Date;
  originalSchedule?: Partial<Service>;
  newSchedule?: Partial<Service>;
}

export interface UserAlert {
  id: string;
  userId: string;
  type: 'station' | 'route' | 'service';
  target: string; // station code, route, or service ID
  conditions: AlertCondition[];
  enabled: boolean;
  createdAt: Date;
}

export interface AlertCondition {
  type: 'delay' | 'cancellation' | 'platform-change' | 'disruption';
  threshold?: number; // minutes for delays
}
