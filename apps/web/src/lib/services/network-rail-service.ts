// Network Rail Real-time Service Manager
// Handles STOMP connections, data processing, and integration with the unified API

import { getNetworkRailClient } from '../network-rail/client';
import { 
  TrainMovementMessage, 
  VSTPMessage, 
  EnhancedTrainService,
  NetworkRailStatus 
} from '../network-rail/types';

export interface ProcessedTrainMovement {
  trainId: string;
  headcode?: string;
  eventType: 'ARRIVAL' | 'DEPARTURE';
  station: {
    stanox: string;
    crs?: string;
    name?: string;
  };
  timing: {
    scheduled: Date;
    actual: Date;
    delayMinutes: number;
  };
  status: 'EARLY' | 'ON TIME' | 'LATE';
  platform?: string;
  toc: string;
  lastUpdated: Date;
}

export interface NetworkRailData {
  trainMovements: Map<string, ProcessedTrainMovement>;
  lastUpdate: Date;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  messageCount: number;
}

class NetworkRailService {
  private client = getNetworkRailClient();
  private isRunning = false;
  private data: NetworkRailData = {
    trainMovements: new Map(),
    lastUpdate: new Date(),
    connectionStatus: 'disconnected',
    messageCount: 0
  };
  
  // Station code mapping (STANOX to CRS)
  private stationMapping = new Map<string, { crs: string; name: string }>();
  
  constructor() {
    this.initializeStationMapping();
  }

  /**
   * Start Network Rail real-time data collection
   */
  async startRealTimeService(): Promise<void> {
    if (this.isRunning) {
      console.log('Network Rail service already running');
      return;
    }

    try {
      console.log('Starting Network Rail real-time service...');
      
      // Initialize STOMP connection
      await this.client.initializeSTOMPConnection();
      this.data.connectionStatus = 'connected';
      
      // Subscribe to Train Movements
      this.client.subscribeToTrainMovements(this.processTrainMovement.bind(this));
      
      // Subscribe to VSTP (schedule changes)
      this.client.subscribeToVSTP(this.processVSTPMessage.bind(this));
      
      this.isRunning = true;
      console.log('✅ Network Rail service started successfully');
      
    } catch (error) {
      console.error('Failed to start Network Rail service:', error);
      this.data.connectionStatus = 'disconnected';
      throw error;
    }
  }

  /**
   * Stop Network Rail service
   */
  stopRealTimeService(): void {
    if (!this.isRunning) return;
    
    console.log('Stopping Network Rail service...');
    this.client.disconnect();
    this.isRunning = false;
    this.data.connectionStatus = 'disconnected';
    console.log('Network Rail service stopped');
  }

  /**
   * Process incoming train movement messages
   */
  private processTrainMovement(message: TrainMovementMessage): void {
    try {
      const movement = message.body;
      
      // Skip if no essential data
      if (!movement.train_id || !movement.loc_stanox) {
        return;
      }

      const processed: ProcessedTrainMovement = {
        trainId: movement.train_id,
        eventType: movement.event_type,
        station: {
          stanox: movement.loc_stanox,
          ...this.getStationInfo(movement.loc_stanox)
        },
        timing: {
          scheduled: new Date(parseInt(movement.planned_timestamp) * 1000),
          actual: new Date(parseInt(movement.actual_timestamp) * 1000),
          delayMinutes: Math.floor(parseInt(movement.timetable_variation) / 60) || 0
        },
        status: movement.variation_status,
        platform: movement.platform,
        toc: movement.toc_id,
        lastUpdated: new Date()
      };

      // Store processed movement
      this.data.trainMovements.set(movement.train_id, processed);
      this.data.lastUpdate = new Date();
      this.data.messageCount++;

      // Log interesting movements (delays, cancellations, etc.)
      if (processed.timing.delayMinutes > 5) {
        console.log(`🚂 Train ${processed.trainId} delayed ${processed.timing.delayMinutes} min at ${processed.station.crs || processed.station.stanox}`);
      }

    } catch (error) {
      console.error('Error processing train movement:', error);
    }
  }

  /**
   * Process VSTP (schedule change) messages
   */
  private processVSTPMessage(message: VSTPMessage): void {
    try {
      const vstp = message.body;
      console.log(`📅 Schedule change: ${vstp.transaction_type} for train ${vstp.train_uid}`);
      
      // Here you would process schedule changes
      // This could update departure board predictions, cancel services, etc.
      
    } catch (error) {
      console.error('Error processing VSTP message:', error);
    }
  }

  /**
   * Get current train movements for a station
   */
  getMovementsForStation(stanox: string): ProcessedTrainMovement[] {
    const movements: ProcessedTrainMovement[] = [];
    
    for (const [trainId, movement] of this.data.trainMovements) {
      if (movement.station.stanox === stanox) {
        movements.push(movement);
      }
    }
    
    // Sort by actual time
    return movements.sort((a, b) => 
      a.timing.actual.getTime() - b.timing.actual.getTime()
    );
  }

  /**
   * Get current data snapshot
   */
  getDataSnapshot(): NetworkRailData {
    return {
      ...this.data,
      trainMovements: new Map(this.data.trainMovements) // Clone the map
    };
  }

  /**
   * Get service status
   */
  async getStatus(): Promise<NetworkRailStatus & { isRunning: boolean; dataAge: number }> {
    const baseStatus = await this.client.getStatus();
    const dataAge = Date.now() - this.data.lastUpdate.getTime();
    
    return {
      ...baseStatus,
      isRunning: this.isRunning,
      dataAge // milliseconds since last update
    };
  }

  /**
   * Test connection without starting service
   */
  async testConnection(): Promise<boolean> {
    return await this.client.testConnection();
  }

  /**
   * Get enhanced train service information
   */
  async getEnhancedTrainService(trainId: string): Promise<EnhancedTrainService | null> {
    // First check our real-time data
    const movement = this.data.trainMovements.get(trainId);
    
    if (!movement) {
      // Fall back to Network Rail API
      return await this.client.getEnhancedTrainService(trainId);
    }

    // Build enhanced service from our real-time data
    // This would be expanded with more data sources
    return {
      trainId: movement.trainId,
      headcode: movement.headcode || '',
      uid: '', // Would need to be populated from schedule data
      origin: {
        tiploc: '',
        scheduledTime: movement.timing.scheduled.toISOString(),
        actualTime: movement.timing.actual.toISOString()
      },
      destination: {
        tiploc: '',
        scheduledTime: '',
        actualTime: ''
      },
      currentLocation: {
        stanox: movement.station.stanox,
        platform: movement.platform,
        timestamp: movement.timing.actual.toISOString()
      },
      movements: [], // Would be populated with movement history
      delayMinutes: movement.timing.delayMinutes,
      variationStatus: movement.status,
      toc: movement.toc,
      serviceCode: '',
      lastUpdated: movement.lastUpdated,
      dataSource: 'network-rail'
    };
  }

  /**
   * Initialize station code mapping
   */
  private initializeStationMapping(): void {
    // Common station mappings (would be loaded from CORPUS data in production)
    const stations = [
      { stanox: '87701', crs: 'KGX', name: 'London Kings Cross' },
      { stanox: '87700', crs: 'PAD', name: 'London Paddington' },
      { stanox: '88641', crs: 'VIC', name: 'London Victoria' },
      { stanox: '88646', crs: 'WAT', name: 'London Waterloo' },
      { stanox: '88518', crs: 'LIV', name: 'Liverpool Street' },
      { stanox: '54100', crs: 'MAN', name: 'Manchester Piccadilly' },
      { stanox: '68269', crs: 'BHM', name: 'Birmingham New Street' },
      // Add more as needed
    ];

    stations.forEach(station => {
      this.stationMapping.set(station.stanox, {
        crs: station.crs,
        name: station.name
      });
    });
  }

  /**
   * Get station information from STANOX code
   */
  private getStationInfo(stanox: string): { crs?: string; name?: string } {
    return this.stationMapping.get(stanox) || {};
  }
}

// Singleton instance
let networkRailService: NetworkRailService | null = null;

export function getNetworkRailService(): NetworkRailService {
  if (!networkRailService) {
    networkRailService = new NetworkRailService();
  }
  return networkRailService;
}

export default NetworkRailService;
