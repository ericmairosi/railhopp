// National Rail API Client for Disruptions and Service Information
// Handles disruption feeds and additional National Rail services

import { 
  NationalRailConfig,
  NationalRailDisruption,
  ServicePerformanceMetrics,
  NationalRailStationFacilities,
  TimetableChange,
  NationalRailAPIError,
  NationalRailStatus,
  NationalRailResponse
} from './types';

export class NationalRailClient {
  private config: NationalRailConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: NationalRailConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      ...config
    };

    this.baseHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Railhopp-NationalRail-Client/1.0',
      'X-API-Key': this.config.apiKey
    };
  }

  /**
   * Check if National Rail API is enabled and configured
   */
  isEnabled(): boolean {
    return Boolean(
      this.config.apiKey && 
      this.config.apiUrl && 
      this.config.apiKey !== 'your_national_rail_api_key'
    );
  }

  /**
   * Get current service disruptions
   */
  async getDisruptions(options: {
    severity?: 'Minor' | 'Moderate' | 'Severe' | 'Critical';
    operators?: string[];
    limit?: number;
  } = {}): Promise<NationalRailDisruption[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.severity) queryParams.append('severity', options.severity);
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.operators) {
        options.operators.forEach(op => queryParams.append('operators', op));
      }

      const response = await this.makeRequest(
        `/disruptions?${queryParams.toString()}`
      );

      return this.transformDisruptions(response.data?.disruptions || []);
    } catch (error) {
      throw new NationalRailAPIError(
        'Failed to fetch disruptions from National Rail API',
        'DISRUPTION_REQUEST_ERROR',
        error
      );
    }
  }

  /**
   * Get service performance metrics for operators
   */
  async getServicePerformance(
    operatorCode: string,
    startDate: string,
    endDate: string
  ): Promise<ServicePerformanceMetrics | null> {
    try {
      const response = await this.makeRequest(
        `/performance/${operatorCode}?start=${startDate}&end=${endDate}`
      );

      if (!response.data?.performance) {
        return null;
      }

      return {
        operatorCode: response.data.performance.operator_code,
        operatorName: response.data.performance.operator_name,
        period: {
          startDate: response.data.performance.period.start_date,
          endDate: response.data.performance.period.end_date
        },
        performance: {
          punctuality: response.data.performance.metrics.punctuality,
          reliability: response.data.performance.metrics.reliability,
          customerSatisfaction: response.data.performance.metrics.customer_satisfaction
        },
        metrics: {
          totalServices: response.data.performance.metrics.total_services,
          onTimeServices: response.data.performance.metrics.on_time_services,
          cancelledServices: response.data.performance.metrics.cancelled_services,
          delayedServices: response.data.performance.metrics.delayed_services
        }
      };
    } catch (error) {
      throw new NationalRailAPIError(
        'Failed to fetch service performance metrics',
        'PERFORMANCE_REQUEST_ERROR',
        error
      );
    }
  }

  /**
   * Get station facilities information
   */
  async getStationFacilities(crs: string): Promise<NationalRailStationFacilities | null> {
    try {
      const response = await this.makeRequest(`/stations/${crs.toUpperCase()}/facilities`);

      if (!response.data?.station) {
        return null;
      }

      return this.transformStationFacilities(response.data.station);
    } catch (error) {
      throw new NationalRailAPIError(
        'Failed to fetch station facilities',
        'FACILITIES_REQUEST_ERROR',
        error
      );
    }
  }

  /**
   * Get timetable changes
   */
  async getTimetableChanges(options: {
    from?: string;
    to?: string;
    effectiveFrom?: string;
  } = {}): Promise<TimetableChange[]> {
    try {
      const queryParams = new URLSearchParams();
      
      if (options.from) queryParams.append('from', options.from);
      if (options.to) queryParams.append('to', options.to);
      if (options.effectiveFrom) queryParams.append('effective_from', options.effectiveFrom);

      const response = await this.makeRequest(
        `/timetable/changes?${queryParams.toString()}`
      );

      return (response.data?.changes || []).map((change: any) => ({
        changeId: change.change_id,
        title: change.title,
        description: change.description,
        effectiveFrom: change.effective_from,
        effectiveTo: change.effective_to,
        changeType: change.change_type,
        affectedServices: change.affected_services,
        publishedDate: change.published_date
      }));
    } catch (error) {
      throw new NationalRailAPIError(
        'Failed to fetch timetable changes',
        'TIMETABLE_REQUEST_ERROR',
        error
      );
    }
  }

  /**
   * Get API status and health
   */
  async getStatus(): Promise<NationalRailStatus> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest('/health');
      
      return {
        available: response.success,
        lastHealthCheck: new Date(),
        responseTime: Date.now() - startTime,
        apiLimits: {
          hourlyLimit: response.data?.limits?.hourly_limit || 1000,
          remaining: response.data?.limits?.remaining || 1000,
          resetTime: new Date(response.data?.limits?.reset_time || Date.now() + 3600000)
        },
        services: {
          disruptions: response.data?.services?.disruptions || false,
          facilities: response.data?.services?.facilities || false,
          performance: response.data?.services?.performance || false,
          timetables: response.data?.services?.timetables || false
        }
      };
    } catch (error) {
      return {
        available: false,
        lastHealthCheck: new Date(),
        responseTime: Date.now() - startTime,
        apiLimits: {
          hourlyLimit: 1000,
          remaining: 0,
          resetTime: new Date(Date.now() + 3600000)
        },
        services: {
          disruptions: false,
          facilities: false,
          performance: false,
          timetables: false
        }
      };
    }
  }

  /**
   * Test connection to National Rail API
   */
  async testConnection(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.available;
    } catch (error) {
      console.error('National Rail connection test failed:', error);
      return false;
    }
  }

  /**
   * Make HTTP request to National Rail API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<NationalRailResponse<any>> {
    if (!this.isEnabled()) {
      throw new NationalRailAPIError(
        'National Rail API is not enabled or properly configured',
        'NOT_ENABLED',
        { enabled: !!this.config.apiKey, hasApiKey: !!this.config.apiKey }
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
          throw new NationalRailAPIError(
            `HTTP ${response.status}: ${response.statusText}`,
            'HTTP_ERROR',
            { status: response.status, body: errorBody, url }
          );
        }

        const data = await response.json();
        return {
          success: true,
          data,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: response.headers.get('x-request-id') || undefined,
            rateLimit: {
              remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
              resetTime: response.headers.get('x-ratelimit-reset') || new Date().toISOString()
            }
          }
        };
      } catch (error) {
        lastError = error;
        
        if (error instanceof NationalRailAPIError) {
          throw error;
        }

        if (attempt === maxRetries) {
          throw new NationalRailAPIError(
            `Failed to connect to National Rail API after ${maxRetries} attempts`,
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
   * Transform raw disruption data to our format
   */
  private transformDisruptions(rawDisruptions: any[]): NationalRailDisruption[] {
    return rawDisruptions.map(disruption => ({
      incidentNumber: disruption.incident_number,
      incidentTitle: disruption.incident_title,
      incidentSummary: disruption.incident_summary,
      incidentDescription: disruption.incident_description,
      incidentStatus: disruption.incident_status,
      incidentType: disruption.incident_type,
      severity: disruption.severity,
      startTime: disruption.start_time,
      endTime: disruption.end_time,
      lastUpdated: disruption.last_updated,
      affectedOperators: disruption.affected_operators || [],
      affectedRoutes: (disruption.affected_routes || []).map((route: any) => ({
        routeName: route.route_name,
        fromStation: {
          name: route.from_station.name,
          crs: route.from_station.crs
        },
        toStation: {
          name: route.to_station.name,
          crs: route.to_station.crs
        },
        direction: route.direction
      })),
      alternativeTransport: disruption.alternative_transport,
      passengerAdvice: disruption.passenger_advice,
      url: disruption.url
    }));
  }

  /**
   * Transform station facilities data to our format
   */
  private transformStationFacilities(rawData: any): NationalRailStationFacilities {
    return {
      crs: rawData.crs,
      stationName: rawData.station_name,
      facilities: {
        ticketOffice: rawData.facilities?.ticket_office || false,
        waitingRoom: rawData.facilities?.waiting_room || false,
        toilets: rawData.facilities?.toilets || false,
        disabledToilets: rawData.facilities?.disabled_toilets || false,
        babyChanging: rawData.facilities?.baby_changing || false,
        wifi: rawData.facilities?.wifi || false,
        refreshments: rawData.facilities?.refreshments || false,
        parking: rawData.facilities?.parking || false,
        carPark: rawData.facilities?.car_park || false,
        bicycleStorage: rawData.facilities?.bicycle_storage || false,
        taxiRank: rawData.facilities?.taxi_rank || false,
        busStop: rawData.facilities?.bus_stop || false,
        helpPoint: rawData.facilities?.help_point || false,
        payphone: rawData.facilities?.payphone || false,
        postBox: rawData.facilities?.post_box || false,
        cashMachine: rawData.facilities?.cash_machine || false
      },
      accessibility: {
        stepFreeAccess: rawData.accessibility?.step_free_access || false,
        wheelchairAccessible: rawData.accessibility?.wheelchair_accessible || false,
        assistedBoardingAvailable: rawData.accessibility?.assisted_boarding_available || false,
        inductionLoop: rawData.accessibility?.induction_loop || false,
        largePrintTimetables: rawData.accessibility?.large_print_timetables || false
      },
      staffing: {
        staffed: rawData.staffing?.staffed || false,
        staffingHours: rawData.staffing?.staffing_hours
      },
      lastUpdated: rawData.last_updated || new Date().toISOString()
    };
  }
}

// Singleton instance for the application
let nationalRailClient: NationalRailClient | null = null;

export function getNationalRailClient(): NationalRailClient {
  if (!nationalRailClient) {
    const config: NationalRailConfig = {
      apiKey: process.env.NATIONAL_RAIL_API_KEY || '',
      apiUrl: process.env.NATIONAL_RAIL_API_URL || 'https://api.nationalrail.co.uk/api'
    };

    nationalRailClient = new NationalRailClient(config);
  }

  return nationalRailClient;
}

export default NationalRailClient;
