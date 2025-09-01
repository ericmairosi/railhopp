// Unified Rail Data Types
// Types for combining Darwin API with Knowledge Station API

import { LiveStationBoard, TrainServiceDetails } from './darwin';
import { EnhancedStationInfo, DisruptionInfo, ServiceTracking } from './knowledge-station';

export interface UnifiedStationBoardRequest {
  crs: string;
  numRows?: number;
  filterCrs?: string;
  filterType?: 'to' | 'from';
  timeOffset?: number;
  timeWindow?: number;
  // Knowledge Station enhancements
  includeStationInfo?: boolean;
  includeDisruptions?: boolean;
}

export interface EnhancedStationBoard extends LiveStationBoard {
  // Enhanced data from Knowledge Station (optional)
  stationInfo?: EnhancedStationInfo;
  disruptions?: DisruptionInfo[];
  dataSource: 'darwin' | 'combined';
  knowledgeStationAvailable: boolean;
}

export interface UnifiedServiceDetailsRequest {
  serviceId: string;
  // Knowledge Station enhancements
  includeTracking?: boolean;
  includeDisruptions?: boolean;
}

export interface EnhancedServiceDetails extends TrainServiceDetails {
  // Enhanced data from Knowledge Station (optional)
  tracking?: ServiceTracking;
  disruptions?: DisruptionInfo[];
  dataSource: 'darwin' | 'combined';
  knowledgeStationAvailable: boolean;
}
