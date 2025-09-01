// RTT.io (Real Time Trains) API Client
// Provides enhanced real-time train data with historical information and live positions
import {
  RTTConfig,
  RTTDeparturesRequest,
  RTTServiceRequest,
  RTTDeparturesResponse,
  RTTServiceResponse,
  RTTAPIError,
  EnhancedDeparture,
  EnhancedService
} from './types';

export class RTTClient {
  private config: RTTConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: RTTConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      enabled: true,
      ...config
    };

    this.baseHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Railhopp-RTT-Client/1.0',
      'Authorization': `Bearer ${this.config.apiKey}`
    };
  }

  /**
   * Check if RTT.io is enabled and configured
   */
  isEnabled(): boolean {
    return Boolean(
      this.config.enabled && 
      this.config.apiUrl && 
      this.config.apiKey && 
      this.config.apiKey !== 'your_rtt_api_key_here'
    );
  }

  /**
   * Make HTTP request to RTT.io API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.isEnabled()) {
      throw new RTTAPIError(
        'RTT.io is not enabled or properly configured',
        'NOT_ENABLED',
        { enabled: this.config.enabled, hasApiKey: !!this.config.apiKey }
      );
    }

    const url = `${this.config.apiUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      headers: {
        ...this.baseHeaders,
        ...options.headers
      },
      ...options
    };

    // Implement timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    requestOptions.signal = controller.signal;

    let lastError: any;
    const maxRetries = this.config.retries || 1;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorBody = await response.text();
          throw new RTTAPIError(
            `HTTP ${response.status}: ${response.statusText}`,
            'HTTP_ERROR',
            { status: response.status, body: errorBody, url }
          );
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new RTTAPIError(
            'Expected JSON response from RTT.io API',
            'INVALID_RESPONSE_TYPE',
            { contentType, url }
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (error instanceof RTTAPIError) {
          throw error;
        }

        if (attempt === maxRetries) {
          throw new RTTAPIError(
            `Failed to connect to RTT.io API after ${maxRetries} attempts`,
            'CONNECTION_ERROR',
            { originalError: error, url, attempt }
          );
        }

        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError;
  }

  /**
   * Get enhanced departures for a station
   */
  async getDepartures(request: RTTDeparturesRequest): Promise<EnhancedDeparture[]> {
    const queryParams = new URLSearchParams({
      format: 'json'
    });

    if (request.filterType) queryParams.append('filterType', request.filterType);
    if (request.filterCrs) queryParams.append('filterCrs', request.filterCrs);
    if (request.services) queryParams.append('services', request.services);

    try {
      const endpoint = `/json/search/${request.crs.toUpperCase()}`;
      const response: RTTDeparturesResponse = await this.makeRequest(`${endpoint}?${queryParams}`);
      
      return this.transformDepartures(response);
    } catch (error) {
      if (error instanceof RTTAPIError) throw error;
      
      throw new RTTAPIError(
        'Failed to fetch departures from RTT.io',
        'API_REQUEST_ERROR',
        error
      );
    }
  }

  /**
   * Get detailed service information
   */
  async getService(request: RTTServiceRequest): Promise<EnhancedService> {
    const queryParams = new URLSearchParams({
      format: 'json'
    });

    try {
      let endpoint = '/json/service';
      
      if (request.serviceUid) {
        endpoint += `/${request.serviceUid}/${request.date || this.getCurrentDate()}`;
      } else if (request.trainId) {
        endpoint += `/train/${request.trainId}/${request.date || this.getCurrentDate()}`;
      } else {
        throw new RTTAPIError(
          'Either serviceUid or trainId must be provided',
          'INVALID_REQUEST',
          request
        );
      }

      const response: RTTServiceResponse = await this.makeRequest(`${endpoint}?${queryParams}`);
      
      return this.transformService(response);
    } catch (error) {
      if (error instanceof RTTAPIError) throw error;
      
      throw new RTTAPIError(
        'Failed to fetch service details from RTT.io',
        'API_REQUEST_ERROR',
        error
      );
    }
  }

  /**
   * Get station information
   */
  async getStationInfo(crs: string): Promise<any> {
    try {
      const endpoint = `/json/search/${crs.toUpperCase()}`;
      const response = await this.makeRequest(endpoint);
      
      return {
        crs: response.location?.crs,
        name: response.location?.name,
        region: response.location?.region,
        facilities: response.location?.facilities || [],
        coordinates: response.location?.coordinates ? {
          latitude: response.location.coordinates.lat,
          longitude: response.location.coordinates.lng
        } : undefined,
        lastUpdated: new Date()
      };
    } catch (error) {
      if (error instanceof RTTAPIError) throw error;
      
      throw new RTTAPIError(
        'Failed to fetch station info from RTT.io',
        'API_REQUEST_ERROR',
        error
      );
    }
  }

  /**
   * Transform RTT.io departures to our format
   */
  private transformDepartures(response: RTTDeparturesResponse): EnhancedDeparture[] {
    const services = response.services || [];
    
    return services.map(service => ({
      serviceId: service.serviceUid,
      trainId: service.trainid,
      operatorCode: service.operatorCode,
      operatorName: service.operatorName,
      platform: service.platform,
      scheduledDeparture: service.locationDetail.gbttBookedDeparture || service.locationDetail.publicDeparture,
      estimatedDeparture: service.locationDetail.realtimeDeparture,
      actualDeparture: service.locationDetail.actualDeparture,
      destination: {
        name: service.locationDetail.destination?.[0]?.description,
        crs: service.locationDetail.destination?.[0]?.crs
      },
      origin: {
        name: service.locationDetail.origin?.[0]?.description,
        crs: service.locationDetail.origin?.[0]?.crs
      },
      status: this.determineStatus(service),
      delayMinutes: service.locationDetail.delayMinutes || 0,
      isCancelled: service.locationDetail.cancelReasonCode !== null,
      cancelReason: service.locationDetail.cancelReasonLongText,
      formation: service.formation ? {
        coaches: service.formation.coaches,
        length: service.formation.coaches?.length || 0
      } : undefined,
      realTimeActivated: service.realTimeActivated,
      lastUpdated: new Date()
    }));
  }

  /**
   * Transform RTT.io service to our format
   */
  private transformService(response: RTTServiceResponse): EnhancedService {
    return {
      serviceId: response.serviceUid,
      trainId: response.trainid,
      operatorCode: response.atocCode,
      operatorName: response.atocName,
      serviceType: response.serviceType,
      powerType: response.powerType,
      trainClass: response.trainClass,
      sleeper: response.sleeper,
      
      route: {
        origin: {
          name: response.origin?.[0]?.description,
          crs: response.origin?.[0]?.crs
        },
        destination: {
          name: response.destination?.[0]?.description,
          crs: response.destination?.[0]?.crs
        }
      },
      
      locations: response.locations?.map(location => ({
        name: location.description,
        crs: location.crs,
        scheduledArrival: location.gbttBookedArrival || location.publicArrival,
        scheduledDeparture: location.gbttBookedDeparture || location.publicDeparture,
        estimatedArrival: location.realtimeArrival,
        estimatedDeparture: location.realtimeDeparture,
        actualArrival: location.actualArrival,
        actualDeparture: location.actualDeparture,
        platform: location.platform,
        line: location.line,
        path: location.path,
        activities: location.activities,
        cancelled: location.cancelReasonCode !== null,
        delayMinutes: location.delayMinutes || 0
      })) || [],
      
      realTimeActivated: response.realTimeActivated,
      runDate: response.runDate,
      lastUpdated: new Date()
    };
  }

  /**
   * Determine service status from RTT.io data
   */
  private determineStatus(service: any): string {
    if (service.locationDetail.cancelReasonCode) return 'Cancelled';
    
    const delay = service.locationDetail.delayMinutes || 0;
    if (delay === 0) return 'On time';
    if (delay > 0) return `${delay} min late`;
    if (delay < 0) return `${Math.abs(delay)} min early`;
    
    return 'No report';
  }

  /**
   * Get current date in YYYY-MM-DD format
   */
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Test connection to RTT.io API
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      // Make a simple request to test connectivity
      await this.makeRequest('/json/search/KGX');
      return true;
    } catch (error) {
      console.error('RTT.io connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance for the application
let rttClient: RTTClient | null = null;

export function getRTTClient(): RTTClient {
  if (!rttClient) {
    const apiUrl = process.env.RTT_API_URL || process.env.KNOWLEDGE_STATION_API_URL;
    const apiKey = process.env.RTT_API_KEY || process.env.KNOWLEDGE_STATION_API_TOKEN;
    const enabled = process.env.RTT_ENABLED !== 'false' && process.env.KNOWLEDGE_STATION_ENABLED !== 'false';
    
    // Create the client even if not properly configured (it will check enabled state internally)
    const config: RTTConfig = {
      apiUrl: apiUrl || '',
      apiKey: apiKey || '',
      enabled
    };

    rttClient = new RTTClient(config);
    
    // Log initialization for development
    if (process.env.NODE_ENV === 'development') {
      if (rttClient.isEnabled()) {
        console.log('✅ RTT.io client initialized (enhanced data source)');
      } else {
        console.log('⚠️  RTT.io client disabled or not configured');
      }
    }
  }

  return rttClient;
}

export default RTTClient;
