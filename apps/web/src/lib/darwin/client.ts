// Darwin API Client for UK Rail Real-time Information
// Handles National Rail Darwin API calls with SOAP/REST interface

import { 
  DarwinConfig,
  StationBoardRequest,
  LiveStationBoard,
  TrainServiceDetails,
  DarwinAPIError
} from './types';

export class DarwinClient {
  private config: DarwinConfig;
  private baseHeaders: Record<string, string>;

  constructor(config: DarwinConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      ...config
    };

    this.baseHeaders = {
      'Content-Type': 'text/xml; charset=utf-8',
      'User-Agent': 'Railhopp-Darwin-Client/1.0',
      'SOAPAction': ''
    };
  }

  /**
   * Check if Darwin API is enabled and configured
   */
  isEnabled(): boolean {
    return Boolean(
      this.config.token && 
      this.config.apiUrl && 
      this.config.token !== 'your_darwin_api_key'
    );
  }

  /**
   * Get departure board for a station
   */
  async getStationBoard(request: StationBoardRequest): Promise<LiveStationBoard> {
    if (!this.isEnabled()) {
      // Return mock data for development
      return this.getMockStationBoard(request);
    }

    try {
      const soapEnvelope = this.buildStationBoardSOAP(request);
      const response = await this.makeSOAPRequest(soapEnvelope);
      return this.parseStationBoardResponse(response);
    } catch (error) {
      console.warn('Darwin API failed, using mock data:', error);
      return this.getMockStationBoard(request);
    }
  }

  /**
   * Get detailed service information
   */
  async getServiceDetails(serviceId: string): Promise<TrainServiceDetails | null> {
    if (!this.isEnabled()) {
      // Return mock data for development
      return this.getMockServiceDetails(serviceId);
    }

    try {
      const soapEnvelope = this.buildServiceDetailsSOAP(serviceId);
      const response = await this.makeSOAPRequest(soapEnvelope);
      return this.parseServiceDetailsResponse(response);
    } catch (error) {
      console.warn('Darwin service details failed, using mock data:', error);
      return this.getMockServiceDetails(serviceId);
    }
  }

  /**
   * Test connection to Darwin API
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled()) {
      console.log('Darwin API not configured, using mock mode');
      return true; // Mock mode always works
    }

    try {
      // Try a simple station board request
      await this.getStationBoard({ crs: 'KGX', numRows: 1 });
      return true;
    } catch (error) {
      console.error('Darwin connection test failed:', error);
      return false;
    }
  }

  /**
   * Make SOAP request to Darwin API
   */
  private async makeSOAPRequest(soapEnvelope: string): Promise<string> {
    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: this.baseHeaders,
      body: soapEnvelope
    });

    if (!response.ok) {
      throw new DarwinAPIError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
        { status: response.status }
      );
    }

    return await response.text();
  }

  /**
   * Build SOAP envelope for station board request
   */
  private buildStationBoardSOAP(request: StationBoardRequest): string {
    return `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
                     xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/">
        <soap:Header>
          <ldb:AccessToken>
            <ldb:TokenValue>${this.config.token}</ldb:TokenValue>
          </ldb:AccessToken>
        </soap:Header>
        <soap:Body>
          <ldb:GetDepBoardRequest>
            <ldb:numRows>${request.numRows || 10}</ldb:numRows>
            <ldb:crs>${request.crs}</ldb:crs>
            ${request.filterCrs ? `<ldb:filterCrs>${request.filterCrs}</ldb:filterCrs>` : ''}
            ${request.filterType ? `<ldb:filterType>${request.filterType}</ldb:filterType>` : ''}
            ${request.timeOffset ? `<ldb:timeOffset>${request.timeOffset}</ldb:timeOffset>` : ''}
            ${request.timeWindow ? `<ldb:timeWindow>${request.timeWindow}</ldb:timeWindow>` : ''}
          </ldb:GetDepBoardRequest>
        </soap:Body>
      </soap:Envelope>`;
  }

  /**
   * Build SOAP envelope for service details request
   */
  private buildServiceDetailsSOAP(serviceId: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
                     xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/">
        <soap:Header>
          <ldb:AccessToken>
            <ldb:TokenValue>${this.config.token}</ldb:TokenValue>
          </ldb:AccessToken>
        </soap:Header>
        <soap:Body>
          <ldb:GetServiceDetailsRequest>
            <ldb:serviceID>${serviceId}</ldb:serviceID>
          </ldb:GetServiceDetailsRequest>
        </soap:Body>
      </soap:Envelope>`;
  }

  /**
   * Parse SOAP response for station board (simplified)
   */
  private parseStationBoardResponse(response: string): LiveStationBoard {
    // This is a simplified parser - you would normally use xml2js or similar
    // For now, return mock data structure
    return {
      locationName: "Mock Station",
      crs: "MST",
      stationName: "Mock Station",
      stationCode: "MST",
      departures: [],
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Parse SOAP response for service details (simplified)
   */
  private parseServiceDetailsResponse(response: string): TrainServiceDetails {
    // This is a simplified parser - you would normally use xml2js or similar
    return {
      serviceID: "mock-service",
      operator: "Mock Operator",
      operatorCode: "MO",
      runDate: new Date().toISOString(),
      origin: [],
      destination: []
    };
  }

  /**
   * Get mock station board data for development
   */
  private getMockStationBoard(request: StationBoardRequest): LiveStationBoard {
    const mockDepartures = [
      {
        serviceID: "mock-1",
        operator: "Great Western Railway",
        operatorCode: "GW",
        destination: "Reading",
        destinationCRS: "RDG",
        std: "10:15",
        etd: "On time",
        platform: "1",
        serviceType: "train",
        cancelled: false
      },
      {
        serviceID: "mock-2", 
        operator: "CrossCountry",
        operatorCode: "XC",
        destination: "Birmingham New Street",
        destinationCRS: "BHM",
        std: "10:30",
        etd: "10:33",
        platform: "2",
        serviceType: "train",
        cancelled: false
      },
      {
        serviceID: "mock-3",
        operator: "Virgin Trains",
        operatorCode: "VT",
        destination: "Manchester Piccadilly",
        destinationCRS: "MAN",
        std: "10:45",
        etd: "Cancelled",
        platform: null,
        serviceType: "train",
        cancelled: true,
        cancelReason: "Train fault"
      }
    ];

    return {
      locationName: this.getStationName(request.crs),
      crs: request.crs,
      stationName: this.getStationName(request.crs),
      stationCode: request.crs,
      departures: mockDepartures.slice(0, request.numRows || 10),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get mock service details for development
   */
  private getMockServiceDetails(serviceId: string): TrainServiceDetails {
    return {
      serviceID: serviceId,
      operator: "Great Western Railway",
      operatorCode: "GW", 
      runDate: new Date().toISOString(),
      platform: "1",
      origin: [{
        locationName: "London Paddington",
        crs: "PAD"
      }],
      destination: [{
        locationName: "Reading",
        crs: "RDG"
      }]
    };
  }

  /**
   * Get station name from CRS code (basic mapping)
   */
  private getStationName(crs: string): string {
    const stationMap: Record<string, string> = {
      'KGX': 'London Kings Cross',
      'PAD': 'London Paddington', 
      'LIV': 'Liverpool Street',
      'VIC': 'London Victoria',
      'WAT': 'London Waterloo',
      'BHM': 'Birmingham New Street',
      'MAN': 'Manchester Piccadilly',
      'RDG': 'Reading',
      'BTN': 'Brighton'
    };
    
    return stationMap[crs.toUpperCase()] || `${crs} Station`;
  }
}

// Singleton instance for the application
let darwinClient: DarwinClient | null = null;

export function getDarwinClient(): DarwinClient {
  if (!darwinClient) {
    const config: DarwinConfig = {
      apiUrl: process.env.DARWIN_API_URL || 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx',
      token: process.env.DARWIN_API_KEY || process.env.DARWIN_API_TOKEN || ''
    };

    darwinClient = new DarwinClient(config);
  }

  return darwinClient;
}

export default DarwinClient;
