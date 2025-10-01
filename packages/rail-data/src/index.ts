// @railhopp/rail-data - Railway data processing utilities
// Provides unified access to multiple rail data sources including Darwin and Knowledge Station

export { DataSourceManager, type DataSourceConfig } from './data-source-manager'
export { RailDataAggregator } from './aggregator'
export { DataSourceAdapter } from './adapters/base'
export { DarwinAdapter, type DarwinClient } from './adapters/darwin'
export { KnowledgeStationAdapter, type KnowledgeStationClient } from './adapters/knowledge-station'

// Re-export types from @railhopp/types package
export type {
  // Darwin types
  LiveStationBoard,
  LiveDeparture,
  TrainServiceDetails,
  StationBoardRequest,
  ServiceDetailsRequest,
  // Knowledge Station types
  EnhancedStationInfo,
  ServiceTracking,
  DisruptionInfo,
  StationInfoRequest,
  ServiceTrackingRequest,
  DisruptionRequest,
  DataSourceStatus,
  // Unified data types
  UnifiedStationBoardRequest,
  EnhancedStationBoard,
  UnifiedServiceDetailsRequest,
  EnhancedServiceDetails,
} from '@railhopp/types'
