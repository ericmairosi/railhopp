// Knowledge Station API Type definitions for enhanced rail data feeds
// Knowledge Station provides additional data sources that complement Darwin API

export interface KnowledgeStationConfig {
  apiUrl: string;
  token: string;
  timeout?: number;
  retries?: number;
  enabled?: boolean;
}

export interface KnowledgeStationRequest {
  // Base request interface for all Knowledge Station API calls
  format?: 'json' | 'xml';
  limit?: number;
}

export interface StationInfoRequest extends KnowledgeStationRequest {
  crs: string;         // Station CRS code (e.g., "KGX")
  includeServices?: boolean;
  includeDisruptions?: boolean;
}

export interface ServiceTrackingRequest extends KnowledgeStationRequest {
  serviceId?: string;
  headcode?: string;
  uid?: string;
  date?: string;       // Format: YYYY-MM-DD
}

export interface DisruptionRequest extends KnowledgeStationRequest {
  severity?: 'low' | 'medium' | 'high';
  category?: string;
  affectedServices?: string[];
}

// Raw Knowledge Station API Response Types
export interface KnowledgeStationStation {
  crs: string;
  name: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  operator?: string;
  facilities?: string[];
  accessibility?: {
    wheelchairAccess: boolean;
    assistanceAvailable: boolean;
    audioAnnouncements: boolean;
    inductionLoop: boolean;
  };
  contacts?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

export interface KnowledgeStationService {
  uid: string;
  headcode: string;
  serviceType: 'passenger' | 'freight' | 'charter';
  operator: string;
  operatorCode: string;
  origin: {
    name: string;
    crs: string;
    scheduledDeparture?: string;
    actualDeparture?: string;
  };
  destination: {
    name: string;
    crs: string;
    scheduledArrival?: string;
    actualArrival?: string;
  };
  locations: KnowledgeStationLocation[];
  status: 'active' | 'cancelled' | 'terminated';
  updated: string;
}

export interface KnowledgeStationLocation {
  name: string;
  crs: string;
  scheduledArrival?: string;
  actualArrival?: string;
  scheduledDeparture?: string;
  actualDeparture?: string;
  platform?: string;
  line?: string;
  path?: string;
  activities?: string[];
  cancelled?: boolean;
  source?: string;
}

export interface KnowledgeStationDisruption {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  status: 'active' | 'resolved' | 'planned';
  created: string;
  updated: string;
  validFrom?: string;
  validTo?: string;
  affectedServices?: string[];
  affectedOperators?: string[];
  affectedRoutes?: {
    origin: string;
    destination: string;
  }[];
  alternativeArrangements?: string;
  source: string;
}

// Transformed types for our application
export interface EnhancedStationInfo {
  crs: string;
  name: string;
  region?: string;
  operator?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  facilities: string[];
  accessibility: {
    wheelchairAccess: boolean;
    assistanceAvailable: boolean;
    audioAnnouncements: boolean;
    inductionLoop: boolean;
  };
  contacts: {
    phone?: string;
    email?: string;
    website?: string;
  };
  lastUpdated: Date;
}

export interface ServiceTracking {
  uid: string;
  headcode: string;
  serviceType: 'passenger' | 'freight' | 'charter';
  operator: string;
  operatorCode: string;
  route: {
    origin: {
      name: string;
      crs: string;
    };
    destination: {
      name: string;
      crs: string;
    };
  };
  currentLocation?: {
    name: string;
    crs: string;
    platform?: string;
    estimatedDeparture?: string;
    actualDeparture?: string;
  };
  nextStops: {
    name: string;
    crs: string;
    scheduledArrival?: string;
    estimatedArrival?: string;
    platform?: string;
  }[];
  status: 'active' | 'cancelled' | 'terminated';
  lastUpdated: Date;
}

export interface DisruptionInfo {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  status: 'active' | 'resolved' | 'planned';
  timeframe: {
    created: Date;
    validFrom?: Date;
    validTo?: Date;
  };
  impact: {
    services: string[];
    operators: string[];
    routes: {
      origin: string;
      destination: string;
    }[];
  };
  alternativeArrangements?: string;
  lastUpdated: Date;
  source: string;
}

// Error types
export interface KnowledgeStationError {
  code: string;
  message: string;
  details?: any;
}

export class KnowledgeStationAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'KnowledgeStationAPIError';
  }
}

// Combined data types (Darwin + Knowledge Station)
export interface EnhancedServiceInfo {
  // Core service data from Darwin
  darwinData: {
    serviceId: string;
    operator: string;
    scheduledDeparture: string;
    estimatedDeparture?: string;
    platform?: string;
    status: string;
  };
  // Enhanced data from Knowledge Station
  knowledgeStationData?: {
    facilities?: string[];
    accessibility?: any;
    realTimeTracking?: ServiceTracking;
    disruptions?: DisruptionInfo[];
  };
  dataSource: 'darwin' | 'knowledge-station' | 'combined';
  lastUpdated: Date;
}

export interface DataSourceStatus {
  darwin: {
    available: boolean;
    lastCheck?: Date;
    responseTime?: number;
  };
  knowledgeStation: {
    available: boolean;
    enabled: boolean;
    lastCheck?: Date;
    responseTime?: number;
  };
}
