// Darwin API Client for UK Rail Real-time Information
// Handles National Rail Darwin API calls with SOAP/REST interface

import { 
  DarwinConfig,
  StationBoardRequest,
  LiveStationBoard,
  LiveDeparture,
  TrainServiceDetails,
  ServiceLocation,
  CallingPointList,
  CallingPoint,
  DarwinAPIError
} from './types';
import { XMLParser } from 'fast-xml-parser';

export class DarwinClient {
  private config: DarwinConfig;
  private baseHeaders: Record<string, string>;
  private parser: XMLParser;

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
    
    // Initialize XML parser
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name, jpath) => {
        // These elements should always be treated as arrays even when there's only one
        const arrayElements = [
          'destination', 'origin', 'service', 'callingPoint', 'previousCallingPoints',
          'subsequentCallingPoints', 'message', 'platform'
        ];
        return arrayElements.includes(name);
      }
    });
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
    // Check if API is configured properly
    if (!this.isEnabled()) {
      console.log('Darwin API not configured, using mock data');
      return this.getMockStationBoard(request);
    }

    try {
      console.log(`Fetching real Darwin data for station: ${request.crs}`);
      
      const soapEnvelope = this.buildStationBoardSOAP(request);
      const response = await this.makeSOAPRequest(soapEnvelope);
      const stationBoard = this.parseStationBoardResponse(response);
      
      console.log(`Successfully fetched real Darwin data for ${request.crs}: ${stationBoard.departures.length} services`);
      return stationBoard;
    } catch (error) {
      console.warn(`Darwin API failed for station ${request.crs}, falling back to mock data:`, error);
      
      // If we have a specific API error, we might want to throw it in some cases
      if (error instanceof DarwinAPIError && error.code === 'NO_DATA') {
        // For "No data" errors, return empty station board instead of mock data
        return {
          locationName: this.getStationName(request.crs),
          crs: request.crs,
          stationName: this.getStationName(request.crs),
          stationCode: request.crs,
          departures: [],
          generatedAt: new Date().toISOString(),
          messages: [{
            severity: 'info',
            message: 'No departure information available for this station at the moment.',
            category: 'NO_DATA'
          }]
        };
      }
      
      // For other errors, return mock data as fallback
      const mockData = this.getMockStationBoard(request);
      
      // Add a message indicating we're using mock data
      mockData.messages = mockData.messages || [];
      mockData.messages.push({
        severity: 'warning',
        message: 'Live departure data temporarily unavailable - showing sample data',
        category: 'MOCK_DATA'
      });
      
      return mockData;
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
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 10000);
      
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: this.baseHeaders,
        body: soapEnvelope,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Darwin API HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        throw new DarwinAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          { status: response.status, body: errorText }
        );
      }

      const responseText = await response.text();
      
      // Check for SOAP faults
      if (responseText.includes('<soap:Fault>') || responseText.includes('faultstring')) {
        console.error('Darwin API SOAP Fault:', responseText);
        throw new DarwinAPIError(
          'SOAP fault in Darwin API response',
          'SOAP_FAULT',
          { response: responseText }
        );
      }
      
      return responseText;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new DarwinAPIError(
          `Request timeout after ${this.config.timeout}ms`,
          'TIMEOUT',
          { timeout: this.config.timeout }
        );
      }
      
      if (error instanceof DarwinAPIError) {
        throw error;
      }
      
      throw new DarwinAPIError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        { originalError: error }
      );
    }
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
   * Parse SOAP response for station board
   */
  private parseStationBoardResponse(response: string): LiveStationBoard {
    try {
      // Parse XML response
      const parsed = this.parser.parse(response);
      
      // Extract the relevant parts from SOAP response
      const envelope = parsed['soap:Envelope'];
      const body = envelope['soap:Body'];
      const getDepBoardResponse = body['GetDepBoardWithDetailsResponse'] || body['GetDepartureBoardResponse'];
      
      if (!getDepBoardResponse) {
        throw new DarwinAPIError('Invalid SOAP response format', 'PARSING_ERROR', { response });
      }
      
      // Get station board data
      const stationBoard = getDepBoardResponse['GetStationBoardResult'];
      
      if (!stationBoard) {
        throw new DarwinAPIError('No station board data in response', 'NO_DATA', { response });
      }
      
      // Extract train services
      const trainServices = stationBoard.trainServices?.service || [];
      const nrccMessages = stationBoard.nrccMessages?.message || [];

      // Map to our LiveDeparture format
      const departures: LiveDeparture[] = trainServices.map((service: any) => {
        return {
          serviceID: service.serviceID || '',
          rsid: service.rsid || undefined,
          std: service.std || '',
          etd: service.etd || '',
          operator: service.operator || '',
          operatorCode: service.operatorCode || '',
          destination: service.destination?.[0]?.location?.[0]?.locationName || 'Unknown',
          destinationCRS: service.destination?.[0]?.location?.[0]?.crs || '',
          origin: service.origin?.[0]?.location?.[0]?.locationName || undefined,
          originCRS: service.origin?.[0]?.location?.[0]?.crs || undefined,
          platform: service.platform || undefined,
          serviceType: service.serviceType || 'train',
          length: service.length ? parseInt(service.length) : undefined,
          cancelled: service.isCancelled === 'true' || service.etd === 'Cancelled',
          cancelReason: service.cancelReason || undefined,
          delayReason: service.delayReason || undefined,
          isReverseFormation: service.isReverseFormation === 'true',
          detachFront: service.detachFront === 'true',
          formation: service.formation || undefined
        };
      });
      
      // Create the final station board object
      return {
        locationName: stationBoard.locationName || '',
        crs: stationBoard.crs || '',
        stationName: stationBoard.locationName || '',
        stationCode: stationBoard.crs || '',
        generatedAt: stationBoard.generatedAt || new Date().toISOString(),
        departures,
        messages: nrccMessages.map((msg: any) => ({
          severity: msg['@_severity'] || 'info',
          message: msg._, // The text content of the message
          category: 'STATION_MESSAGE'
        }))
      };
    } catch (error) {
      console.error('Error parsing station board response:', error);
      throw error instanceof DarwinAPIError ? error : 
        new DarwinAPIError('Failed to parse SOAP response', 'PARSING_ERROR', { error });
    }
  }

  /**
   * Parse SOAP response for service details
   */
  private parseServiceDetailsResponse(response: string): TrainServiceDetails {
    try {
      // Parse XML response
      const parsed = this.parser.parse(response);
      
      // Extract the relevant parts from SOAP response
      const envelope = parsed['soap:Envelope'];
      const body = envelope['soap:Body'];
      const getServiceDetailsResponse = body['GetServiceDetailsResponse'];
      
      if (!getServiceDetailsResponse) {
        throw new DarwinAPIError('Invalid service details response format', 'PARSING_ERROR', { response });
      }
      
      // Get service details
      const serviceDetails = getServiceDetailsResponse['GetServiceDetailsResult'];
      
      if (!serviceDetails) {
        throw new DarwinAPIError('No service details in response', 'NO_DATA', { response });
      }

      // Parse origins and destinations
      const origins: ServiceLocation[] = serviceDetails.origin?.location?.map((loc: any) => ({
        locationName: loc.locationName || '',
        crs: loc.crs || '',
        via: loc.via || undefined
      })) || [];
      
      const destinations: ServiceLocation[] = serviceDetails.destination?.location?.map((loc: any) => ({
        locationName: loc.locationName || '',
        crs: loc.crs || '',
        via: loc.via || undefined
      })) || [];
      
      // Parse calling points
      const previousCallingPoints: CallingPointList[] = this.parseCallingPointLists(
        serviceDetails.previousCallingPoints
      );
      
      const subsequentCallingPoints: CallingPointList[] = this.parseCallingPointLists(
        serviceDetails.subsequentCallingPoints
      );

      // Create the train service details object
      return {
        serviceID: serviceDetails.serviceID || '',
        rsid: serviceDetails.rsid || undefined,
        operator: serviceDetails.operator || '',
        operatorCode: serviceDetails.operatorCode || '',
        runDate: serviceDetails.runDate || new Date().toISOString(),
        trainid: serviceDetails.trainid || undefined,
        platform: serviceDetails.platform || undefined,
        delayReason: serviceDetails.delayReason || undefined,
        cancelReason: serviceDetails.cancelReason || undefined,
        length: serviceDetails.length ? parseInt(serviceDetails.length) : undefined,
        origin: origins,
        destination: destinations,
        previousCallingPoints: previousCallingPoints,
        subsequentCallingPoints: subsequentCallingPoints
      };
    } catch (error) {
      console.error('Error parsing service details response:', error);
      throw error instanceof DarwinAPIError ? error : 
        new DarwinAPIError('Failed to parse service details', 'PARSING_ERROR', { error });
    }
  }

  /**
   * Parse calling point lists
   */
  private parseCallingPointLists(callingPointsData: any): CallingPointList[] {
    if (!callingPointsData || !callingPointsData.callingPointList) {
      return [];
    }
    
    // Ensure we handle both single and multiple calling point lists
    const callingPointLists = Array.isArray(callingPointsData.callingPointList)
      ? callingPointsData.callingPointList
      : [callingPointsData.callingPointList];
    
    return callingPointLists.map((list: any) => {
      // Parse the calling points
      const points: CallingPoint[] = list.callingPoint?.map((point: any) => ({
        locationName: point.locationName || '',
        crs: point.crs || '',
        st: point.st || undefined,
        et: point.et || undefined,
        at: point.at || undefined,
        isCancelled: point.isCancelled === 'true',
        length: point.length ? parseInt(point.length) : undefined,
        detachFront: point.detachFront === 'true',
        formation: point.formation || undefined,
        adhocAlerts: point.adhocAlerts || undefined
      })) || [];
      
      return {
        serviceType: list.serviceType || undefined,
        serviceChangeRequired: list.serviceChangeRequired === 'true',
        assocIsCancelled: list.assocIsCancelled === 'true',
        callingPoint: points
      };
    });
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
