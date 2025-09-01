// Network Rail API Client for Train Movements, VSTP, SMART, CORPUS
// Handles STOMP feeds and REST API calls for Network Rail data

import { 
  NetworkRailConfig,
  TrainMovementMessage,
  VSTPMessage,
  TrainDescriberMessage,
  CorpusEntry,
  SmartEntry,
  ScheduleMessage,
  EnhancedTrainService,
  NetworkRailAPIError,
  NetworkRailStatus
} from './types';

export class NetworkRailClient {
  private config: NetworkRailConfig;
  private stompClient: any = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(config: NetworkRailConfig) {
    this.config = {
      timeout: 15000,
      retries: 3,
      ...config
    };
  }

  /**
   * Initialize STOMP connection for real-time feeds
   */
  async initializeSTOMPConnection(): Promise<void> {
    try {
      // Dynamic import for STOMP client (Node.js environment)
      const stompit = require('stompit');
      
      const connectOptions = {
        host: this.extractHostFromUrl(this.config.stompUrl),
        port: this.extractPortFromUrl(this.config.stompUrl),
        connectHeaders: {
          'host': '/',
          'login': this.config.username,
          'passcode': this.config.password,
          'heart-beat': '5000,5000'
        }
      };

      this.stompClient = await new Promise((resolve, reject) => {
        stompit.connect(connectOptions, (error: any, client: any) => {
          if (error) {
            reject(new NetworkRailAPIError(
              'Failed to connect to Network Rail STOMP server',
              'STOMP_CONNECTION_ERROR',
              error
            ));
            return;
          }
          resolve(client);
        });
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Network Rail STOMP connection established');

      // Set up connection error handlers
      this.stompClient.on('error', this.handleSTOMPError.bind(this));
      this.stompClient.on('disconnect', this.handleSTOMPDisconnect.bind(this));

    } catch (error) {
      throw new NetworkRailAPIError(
        'Failed to initialize STOMP connection',
        'INITIALIZATION_ERROR',
        error
      );
    }
  }

  /**
   * Subscribe to Train Movements feed
   */
  subscribeToTrainMovements(callback: (movement: TrainMovementMessage) => void): void {
    if (!this.isConnected || !this.stompClient) {
      throw new NetworkRailAPIError(
        'STOMP connection not established',
        'NOT_CONNECTED'
      );
    }

    const subscribeHeaders = {
      destination: '/topic/TRAIN_MVT_ALL_TOC',
      ack: 'client-individual'
    };

    this.stompClient.subscribe(subscribeHeaders, (error: any, message: any) => {
      if (error) {
        console.error('Train movements subscription error:', error);
        return;
      }

      try {
        message.readString('utf-8', (error: any, body: string) => {
          if (error) {
            console.error('Error reading train movement message:', error);
            return;
          }

          const movements = JSON.parse(body);
          movements.forEach((movement: TrainMovementMessage) => {
            callback(movement);
          });

          message.ack();
        });
      } catch (parseError) {
        console.error('Error parsing train movement data:', parseError);
      }
    });
  }

  /**
   * Subscribe to VSTP feed
   */
  subscribeToVSTP(callback: (vstp: VSTPMessage) => void): void {
    if (!this.isConnected || !this.stompClient) {
      throw new NetworkRailAPIError(
        'STOMP connection not established',
        'NOT_CONNECTED'
      );
    }

    const subscribeHeaders = {
      destination: '/topic/VSTP_ALL',
      ack: 'client-individual'
    };

    this.stompClient.subscribe(subscribeHeaders, (error: any, message: any) => {
      if (error) {
        console.error('VSTP subscription error:', error);
        return;
      }

      try {
        message.readString('utf-8', (error: any, body: string) => {
          if (error) {
            console.error('Error reading VSTP message:', error);
            return;
          }

          const vstpData = JSON.parse(body);
          vstpData.forEach((vstp: VSTPMessage) => {
            callback(vstp);
          });

          message.ack();
        });
      } catch (parseError) {
        console.error('Error parsing VSTP data:', parseError);
      }
    });
  }

  /**
   * Subscribe to Train Describer feed
   */
  subscribeToTrainDescriber(areaId: string, callback: (describer: TrainDescriberMessage) => void): void {
    if (!this.isConnected || !this.stompClient) {
      throw new NetworkRailAPIError(
        'STOMP connection not established',
        'NOT_CONNECTED'
      );
    }

    const subscribeHeaders = {
      destination: `/topic/TD_${areaId}_SIG_AREA`,
      ack: 'client-individual'
    };

    this.stompClient.subscribe(subscribeHeaders, (error: any, message: any) => {
      if (error) {
        console.error('Train Describer subscription error:', error);
        return;
      }

      try {
        message.readString('utf-8', (error: any, body: string) => {
          if (error) {
            console.error('Error reading Train Describer message:', error);
            return;
          }

          const describerData = JSON.parse(body);
          describerData.forEach((describer: TrainDescriberMessage) => {
            callback(describer);
          });

          message.ack();
        });
      } catch (parseError) {
        console.error('Error parsing Train Describer data:', parseError);
      }
    });
  }

  /**
   * Get CORPUS reference data
   */
  async getCorpusData(): Promise<CorpusEntry[]> {
    try {
      const response = await this.makeHTTPRequest('/api/corpus');
      return response.CORPUS || [];
    } catch (error) {
      throw new NetworkRailAPIError(
        'Failed to fetch CORPUS data',
        'CORPUS_ERROR',
        error
      );
    }
  }

  /**
   * Get SMART reference data
   */
  async getSmartData(): Promise<SmartEntry[]> {
    try {
      const response = await this.makeHTTPRequest('/api/smart');
      return response.SMART || [];
    } catch (error) {
      throw new NetworkRailAPIError(
        'Failed to fetch SMART data',
        'SMART_ERROR',
        error
      );
    }
  }

  /**
   * Get schedule data for a specific train
   */
  async getScheduleData(trainUid: string, date: string): Promise<ScheduleMessage | null> {
    try {
      const response = await this.makeHTTPRequest(
        `/api/schedule/${trainUid}/${date}`
      );
      return response.schedule || null;
    } catch (error) {
      throw new NetworkRailAPIError(
        'Failed to fetch schedule data',
        'SCHEDULE_ERROR',
        error
      );
    }
  }

  /**
   * Get comprehensive train service information
   */
  async getEnhancedTrainService(trainId: string): Promise<EnhancedTrainService | null> {
    try {
      // This would combine data from multiple sources
      // Implementation would aggregate movements, schedule, and other data
      const response = await this.makeHTTPRequest(`/api/train/${trainId}`);
      
      if (!response.train) {
        return null;
      }

      return {
        trainId: response.train.train_id,
        headcode: response.train.headcode,
        uid: response.train.uid,
        origin: response.train.origin,
        destination: response.train.destination,
        currentLocation: response.train.current_location,
        movements: response.train.movements || [],
        schedule: response.train.schedule,
        delayMinutes: response.train.delay_minutes || 0,
        variationStatus: response.train.variation_status || 'ON TIME',
        toc: response.train.toc,
        serviceCode: response.train.service_code,
        lastUpdated: new Date(),
        dataSource: 'network-rail'
      };
    } catch (error) {
      throw new NetworkRailAPIError(
        'Failed to fetch enhanced train service',
        'SERVICE_ERROR',
        error
      );
    }
  }

  /**
   * Get Network Rail service status
   */
  async getStatus(): Promise<NetworkRailStatus> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeHTTPRequest('/api/health');
      
      return {
        feeds: {
          movements: response.feeds?.movements || false,
          vstp: response.feeds?.vstp || false,
          describer: response.feeds?.describer || false,
          schedule: response.feeds?.schedule || false
        },
        lastHealthCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        feeds: {
          movements: false,
          vstp: false,
          describer: false,
          schedule: false
        },
        lastHealthCheck: new Date(),
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test connection to Network Rail APIs
   */
  async testConnection(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return Object.values(status.feeds).some(feed => feed);
    } catch (error) {
      console.error('Network Rail connection test failed:', error);
      return false;
    }
  }

  /**
   * Make HTTP request to Network Rail API
   */
  private async makeHTTPRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    
    const requestOptions: RequestInit = {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Railhopp-NetworkRail-Client/1.0',
        ...options.headers
      },
      timeout: this.config.timeout,
      ...options
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new NetworkRailAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, body: errorBody, url }
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof NetworkRailAPIError) {
        throw error;
      }
      
      throw new NetworkRailAPIError(
        'Failed to make HTTP request to Network Rail API',
        'REQUEST_ERROR',
        error
      );
    }
  }

  /**
   * Handle STOMP connection errors
   */
  private handleSTOMPError(error: any): void {
    console.error('Network Rail STOMP error:', error);
    this.isConnected = false;
    this.attemptReconnection();
  }

  /**
   * Handle STOMP disconnection
   */
  private handleSTOMPDisconnect(): void {
    console.warn('Network Rail STOMP disconnected');
    this.isConnected = false;
    this.attemptReconnection();
  }

  /**
   * Attempt to reconnect STOMP connection
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached for Network Rail STOMP');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting Network Rail STOMP reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.initializeSTOMPConnection();
        console.log('Network Rail STOMP reconnection successful');
      } catch (error) {
        console.error('Network Rail STOMP reconnection failed:', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Extract host from URL
   */
  private extractHostFromUrl(url: string): string {
    const match = url.match(/^(?:https?:\/\/)?([^:\/\s]+)/);
    return match ? match[1] : 'localhost';
  }

  /**
   * Extract port from URL
   */
  private extractPortFromUrl(url: string): number {
    const match = url.match(/:(\d+)/);
    return match ? parseInt(match[1]) : 61613; // Default STOMP port
  }

  /**
   * Disconnect from Network Rail services
   */
  disconnect(): void {
    if (this.stompClient && this.isConnected) {
      this.stompClient.disconnect();
      this.isConnected = false;
      console.log('Network Rail STOMP connection closed');
    }
  }
}

// Singleton instance for the application
let networkRailClient: NetworkRailClient | null = null;

export function getNetworkRailClient(): NetworkRailClient {
  if (!networkRailClient) {
    const config = {
      username: process.env.NETWORK_RAIL_USERNAME || '',
      password: process.env.NETWORK_RAIL_PASSWORD || '',
      apiUrl: process.env.NETWORK_RAIL_API_URL || 'https://api.rtt.io/api/v1/json',
      stompUrl: process.env.NETWORK_RAIL_STOMP_URL || 'stomp://datafeeds.networkrail.co.uk:61618'
    };

    networkRailClient = new NetworkRailClient(config);
  }

  return networkRailClient;
}

export default NetworkRailClient;
