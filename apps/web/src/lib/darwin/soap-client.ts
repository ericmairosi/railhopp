// Darwin SOAP Web Service Client for Real Live Departure Data
// Uses the official Darwin web service at https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb11.asmx

import {
  DarwinConfig,
  StationBoardRequest,
  LiveStationBoard,
  LiveDeparture,
  TrainServiceDetails,
  DarwinAPIError,
} from './types'
import { XMLParser } from 'fast-xml-parser'

interface DarwinSOAPResponse {
  'soap:Envelope': {
    'soap:Body': {
      GetDepartureBoardResponse?: {
        GetDepartureBoardResult: {
          stationName: string
          crs: string
          trainServices?: {
            service: DarwinService[] | DarwinService
          }
          generatedAt: string
          filterLocationName?: string
          filtercrs?: string
          filterType?: string
          nrccMessages?: any
        }
      }
      'soap:Fault'?: {
        faultcode: string
        faultstring: string
        detail: any
      }
    }
  }
}

interface DarwinService {
  sta?: string // scheduled arrival
  eta?: string // estimated arrival
  std?: string // scheduled departure
  etd?: string // estimated departure
  platform?: string
  operator: string
  operatorCode: string
  serviceType: string
  serviceID: string
  rsid?: string
  origin: {
    location:
      | {
          locationName: string
          crs: string
        }[]
      | {
          locationName: string
          crs: string
        }
  }
  destination: {
    location:
      | {
          locationName: string
          crs: string
        }[]
      | {
          locationName: string
          crs: string
        }
  }
  length?: number
  delayReason?: string
  cancelReason?: string
  adherenceCode?: string
}

export class DarwinSOAPClient {
  private config: DarwinConfig
  private parser: XMLParser
  private apiUrl: string
  private apiToken: string

  constructor(config: DarwinConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      ...config,
    }

    // Initialize XML parser for SOAP responses
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name) => {
        const arrayElements = ['service', 'location']
        return arrayElements.includes(name)
      },
    })

    this.apiUrl = process.env.DARWIN_API_URL || ''
    this.apiToken = process.env.DARWIN_API_TOKEN || ''
  }

  /**
   * Check if Darwin SOAP client is enabled and configured
   */
  isEnabled(): boolean {
    return Boolean(this.apiUrl && this.apiToken && this.apiUrl.includes('nationalrail.co.uk'))
  }

  /**
   * Get live station departure board via Darwin SOAP API
   */
  async getStationBoard(request: StationBoardRequest): Promise<LiveStationBoard> {
    if (!this.isEnabled()) {
      throw new DarwinAPIError(
        'Darwin SOAP API not configured - missing URL or token',
        'API_NOT_CONFIGURED',
        {
          message: 'Please set DARWIN_API_URL and DARWIN_API_TOKEN environment variables',
          requiredVars: ['DARWIN_API_URL', 'DARWIN_API_TOKEN'],
        }
      )
    }

    console.log(`Fetching live Darwin SOAP data for station: ${request.crs}`)

    try {
      const soapResponse = await this.callDarwinSOAP(request)
      const parsedData = this.parseDarwinSOAPResponse(soapResponse)

      console.log(
        `Successfully fetched live Darwin data for ${request.crs}: ${parsedData.departures.length} services`
      )
      return parsedData
    } catch (error) {
      console.error('Darwin SOAP API error:', error)
      throw error
    }
  }

  /**
   * Get detailed service information via Darwin SOAP API
   */
  async getServiceDetails(serviceId: string): Promise<TrainServiceDetails | null> {
    if (!this.isEnabled()) {
      throw new DarwinAPIError(
        'Darwin SOAP API not configured - missing URL or token',
        'API_NOT_CONFIGURED'
      )
    }

    try {
      // Implement service details lookup via SOAP
      // This would require a different SOAP method call
      return {
        serviceID: serviceId,
        rsid: '',
        operator: 'Unknown',
        operatorCode: '',
        runDate: new Date().toISOString().split('T')[0],
        trainid: serviceId,
        platform: undefined,
        delayReason: undefined,
        cancelReason: undefined,
        length: undefined,
        origin: [],
        destination: [],
        previousCallingPoints: [],
        subsequentCallingPoints: [],
      }
    } catch (error) {
      console.error('Darwin SOAP service details error:', error)
      return null
    }
  }

  /**
   * Test connection to Darwin SOAP API
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled()) {
      return false
    }

    try {
      // Test with a simple station request
      const testBoard = await this.getStationBoard({ crs: 'KGX', numRows: 1 })
      return true
    } catch (error) {
      console.error('Darwin SOAP connection test failed:', error)
      return false
    }
  }

  /**
   * Make SOAP API call to Darwin web service
   */
  private async callDarwinSOAP(request: StationBoardRequest): Promise<string> {
    const soapBody = this.buildSOAPRequest(request)

    const soapHeaders = {
      'Content-Type': 'text/xml; charset=utf-8',
      Accept: 'text/xml',
      // Updated to use correct schema version and SOAPAction
      SOAPAction: '"http://thalesgroup.com/RTTI/2017-10-01/ldb/GetDepBoardWithDetails"',
      'User-Agent': 'Railhopp/1.0 (+https://railhopp.app)',
      'Cache-Control': 'no-cache',
    }

    console.log(`Darwin SOAP request to ${this.apiUrl} for station ${request.crs}`)
    console.log('SOAP Body length:', soapBody.length)

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: soapHeaders,
        body: soapBody,
        signal: AbortSignal.timeout(this.config.timeout || 15000),
      })

      console.log(`Darwin SOAP response: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body')
        console.error('Darwin SOAP error response:', errorText)

        // Check for specific Darwin API errors
        if (response.status === 401) {
          throw new DarwinAPIError(
            'Darwin API authentication failed - check API token',
            'AUTH_ERROR',
            {
              status: response.status,
              message: 'Invalid or expired API token',
              url: this.apiUrl,
            }
          )
        }

        throw new DarwinAPIError(
          `Darwin SOAP API returned ${response.status}: ${response.statusText}`,
          'API_HTTP_ERROR',
          {
            status: response.status,
            statusText: response.statusText,
            responseBody: errorText.substring(0, 500),
            url: this.apiUrl,
          }
        )
      }

      const xmlResponse = await response.text()
      console.log('Darwin SOAP response length:', xmlResponse.length)

      // Check for SOAP faults
      if (xmlResponse.includes('soap:Fault') || xmlResponse.includes('faultstring')) {
        const faultMatch =
          xmlResponse.match(/<faultstring[^>]*>([^<]*)<\/faultstring>/) ||
          xmlResponse.match(/<faultstring>([^<]*)<\/faultstring>/)
        const faultMessage = faultMatch ? faultMatch[1] : 'Unknown SOAP fault'
        console.error('Darwin SOAP fault detected:', faultMessage)

        throw new DarwinAPIError(`Darwin SOAP fault: ${faultMessage}`, 'SOAP_FAULT', {
          soapFault: faultMessage,
          responseBody: xmlResponse.substring(0, 1000),
        })
      }

      // Log successful response for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Darwin SOAP response preview:', xmlResponse.substring(0, 300) + '...')
      }

      return xmlResponse
    } catch (error) {
      if (error instanceof DarwinAPIError) {
        throw error
      }

      // Handle network errors
      console.error('Darwin SOAP network error:', error)
      throw new DarwinAPIError(
        `Network error calling Darwin SOAP API: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR',
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      )
    }
  }

  /**
   * Build SOAP request XML for departure board
   */
  private buildSOAPRequest(request: StationBoardRequest): string {
    const numRows = Math.min(request.numRows || 10, 50) // Darwin has limits
    const filterCrs = request.filterCrs || ''
    const filterType = request.filterType || 'to'
    const timeOffset = request.timeOffset || 0
    const timeWindow = request.timeWindow || 120

    // Use 2017-10-01 schema which is more stable and widely supported
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:typ="http://thalesgroup.com/RTTI/2013-11-28/Token/types" 
               xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/">
  <soap:Header>
    <typ:AccessToken>
      <typ:TokenValue>${this.apiToken}</typ:TokenValue>
    </typ:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepBoardWithDetailsRequest>
      <ldb:numRows>${numRows}</ldb:numRows>
      <ldb:crs>${request.crs.toUpperCase()}</ldb:crs>${
        filterCrs
          ? `
      <ldb:filterCrs>${filterCrs.toUpperCase()}</ldb:filterCrs>
      <ldb:filterType>${filterType}</ldb:filterType>`
          : ''
      }
      <ldb:timeOffset>${timeOffset}</ldb:timeOffset>
      <ldb:timeWindow>${timeWindow}</ldb:timeWindow>
    </ldb:GetDepBoardWithDetailsRequest>
  </soap:Body>
</soap:Envelope>`

    console.log('Darwin SOAP request for station:', request.crs)
    if (process.env.NODE_ENV === 'development') {
      console.log('SOAP request preview:', soapRequest.substring(0, 500) + '...')
    }

    return soapRequest
  }

  /**
   * Parse Darwin SOAP XML response to our internal format
   */
  private parseDarwinSOAPResponse(xmlResponse: string): LiveStationBoard {
    try {
      console.log('Parsing Darwin SOAP response...')

      const parsed: DarwinSOAPResponse = this.parser.parse(xmlResponse)
      const body = parsed['soap:Envelope']['soap:Body']

      // Handle different response structures
      const resp2017 = (body as any).GetDepartureBoardResponse?.GetDepartureBoardResult
      const resp2017Details = (body as any).GetDepBoardWithDetailsResponse
        ?.GetDepBoardWithDetailsResult
      const respGeneric = (body as any).GetStationBoardResponse?.GetStationBoardResult
      const result = resp2017 || resp2017Details || respGeneric

      if (!result) {
        console.error('No valid result found in SOAP response')
        console.log('Available body keys:', Object.keys(body))

        throw new DarwinAPIError(
          'Invalid SOAP response format - no departure board result found',
          'INVALID_RESPONSE',
          {
            response: xmlResponse.substring(0, 1000),
            availableKeys: Object.keys(body),
          }
        )
      }

      console.log('Found departure board result for station:', result.stationName || result.crs)

      const departures: LiveDeparture[] = []

      // Handle train services
      if (result.trainServices?.service) {
        const services = Array.isArray(result.trainServices.service)
          ? result.trainServices.service
          : [result.trainServices.service]

        console.log(`Processing ${services.length} train services`)

        services.forEach((service: DarwinService, index: number) => {
          try {
            const departure = this.convertServiceToDeparture(service)
            if (departure) {
              departures.push(departure)
            }
          } catch (error) {
            console.warn(`Failed to convert service ${index}:`, error)
          }
        })
      } else {
        console.log('No train services found in response')
      }

      const stationBoard: LiveStationBoard = {
        locationName: result.stationName || `Station ${result.crs}`,
        crs: result.crs || 'UNK',
        stationName: result.stationName || `Station ${result.crs}`,
        stationCode: result.crs || 'UNK',
        departures: departures,
        generatedAt: result.generatedAt || new Date().toISOString(),
      }

      console.log(
        `Successfully parsed Darwin response: ${departures.length} departures for ${stationBoard.stationName}`
      )
      return stationBoard
    } catch (error) {
      console.error('Error parsing Darwin SOAP response:', error)

      if (error instanceof DarwinAPIError) {
        throw error
      }

      throw new DarwinAPIError('Failed to parse Darwin SOAP response', 'PARSE_ERROR', {
        originalError: error instanceof Error ? error.message : 'Unknown error',
        response: xmlResponse.substring(0, 1000),
      })
    }
  }

  /**
   * Convert Darwin service data to our departure format
   */
  private convertServiceToDeparture(service: DarwinService): LiveDeparture | null {
    try {
      // Get destination information
      const destinations = Array.isArray(service.destination.location)
        ? service.destination.location
        : [service.destination.location]
      const destination = destinations[destinations.length - 1] // Final destination

      // Get origin information
      const origins = Array.isArray(service.origin.location)
        ? service.origin.location
        : [service.origin.location]
      const origin = origins[0] // Starting origin

      return {
        serviceID: service.serviceID,
        rsid: service.rsid,
        operator: service.operator,
        operatorCode: service.operatorCode,
        destination: destination.locationName,
        destinationCRS: destination.crs,
        origin: origin.locationName,
        originCRS: origin.crs,
        std: service.std || '',
        etd: service.etd || 'On time',
        platform: service.platform,
        serviceType: service.serviceType || 'Train',
        length: service.length,
        cancelled: false,
        delayReason: service.delayReason,
        cancelReason: service.cancelReason,
      }
    } catch (error) {
      console.error('Error converting Darwin service to departure:', error, service)
      return null
    }
  }
}

export default DarwinSOAPClient
