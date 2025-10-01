// Darwin API Client for UK Rail Real-time Information
// Uses Darwin Real Time Train Information with STOMP protocol
// Darwin feeds use STOMP (Simple Text-Oriented Messaging Protocol) for real-time data

import {
  DarwinConfig,
  StationBoardRequest,
  LiveStationBoard,
  TrainServiceDetails,
  DarwinAPIError,
} from './types'
import { getDarwinPubSubClient } from './pubsub-client'
import DarwinSTOMPClient from './stomp-client'
import DarwinSOAPClient from './soap-client'

export class DarwinClient {
  private pubSubClient = getDarwinPubSubClient()
  private stompClient: DarwinSTOMPClient
  private soapClient: DarwinSOAPClient
  private soapEnabled: boolean

  constructor(config: DarwinConfig) {
    // Initialize clients
    this.soapClient = new DarwinSOAPClient(config)
    this.stompClient = new DarwinSTOMPClient(config)
    // Enable SOAP automatically if credentials are present, or explicit opt-in via env
    this.soapEnabled =
      process.env.DARWIN_SOAP_ENABLED === 'true' ||
      Boolean(process.env.DARWIN_API_URL && process.env.DARWIN_API_TOKEN)
  }

  /**
   * Check if Darwin is enabled and configured (SOAP, STOMP, or Pub/Sub)
   */
  isEnabled(): boolean {
    return (
      this.stompClient.isEnabled() ||
      (this.soapEnabled && this.soapClient.isEnabled()) ||
      this.pubSubClient.isEnabled()
    )
  }

  /**
   * Get departure board for a station (priority: Pub/Sub > STOMP > SOAP)
   */
  async getStationBoard(request: StationBoardRequest): Promise<LiveStationBoard> {
    let lastError: Error | null = null

    // Prefer broker-based Pub/Sub first for reliability in your current setup
    try {
      console.log('Attempting Darwin Pub/Sub for station:', request.crs)
      return await this.pubSubClient.getStationBoard(request)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn('Darwin Pub/Sub failed for', request.crs, ':', lastError.message)
    }

    // Try STOMP next (real-time if network allows 61617)
    if (this.stompClient.isEnabled()) {
      try {
        console.log('Attempting Darwin STOMP for station:', request.crs)
        return await this.stompClient.getStationBoard(request)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn('Darwin STOMP failed for', request.crs, ':', lastError.message)
      }
    }

    // Finally try SOAP if explicitly enabled and configured
    if (this.soapEnabled && this.soapClient.isEnabled()) {
      try {
        console.log('Attempting Darwin SOAP API for station:', request.crs)
        const result = await this.soapClient.getStationBoard(request)
        console.log('Darwin SOAP API successful for:', request.crs)
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn('Darwin SOAP API failed for', request.crs, ':', lastError.message)
      }
    }

    // All real APIs failed - provide informative error with API status
    console.log('All Darwin APIs failed, APIs not properly configured or accessible')
    throw new DarwinAPIError(
      'All Darwin APIs failed - real-time data unavailable',
      'ALL_APIS_FAILED',
      {
        lastError: lastError?.message || 'Unknown error',
        soapEnabled: this.soapEnabled && this.soapClient.isEnabled(),
        stompEnabled: this.stompClient.isEnabled(),
        pubSubEnabled: this.pubSubClient.isEnabled(),
        suggestion: 'Check API credentials, broker status, or STOMP port access (61617)',
      }
    )
  }

  /**
   * Get detailed service information (priority: STOMP > SOAP (if enabled) > Pub/Sub)
   */
  async getServiceDetails(serviceId: string): Promise<TrainServiceDetails | null> {
    if (this.stompClient.isEnabled()) {
      try {
        return await this.stompClient.getServiceDetails(serviceId)
      } catch {}
    }

    if (this.soapEnabled && this.soapClient.isEnabled()) {
      try {
        return await this.soapClient.getServiceDetails(serviceId)
      } catch {}
    }

    // Fallback to Pub/Sub client (requires backend JMS service)
    return this.pubSubClient.getServiceDetails(serviceId)
  }

  /**
   * Test connection to Darwin system (priority: STOMP > SOAP (if enabled) > Pub/Sub)
   */
  async testConnection(): Promise<boolean> {
    if (this.stompClient.isEnabled()) {
      try {
        return true === (await this.stompClient.testConnection())
      } catch {}
    }

    if (this.soapEnabled && this.soapClient.isEnabled()) {
      try {
        return await this.soapClient.testConnection()
      } catch {}
    }

    // Fallback to Pub/Sub client (requires backend JMS service)
    return this.pubSubClient.testConnection()
  }
}

// Singleton instance for the application
let darwinClient: DarwinClient | null = null

export function getDarwinClient(): DarwinClient {
  if (!darwinClient) {
    // Prefer explicit STOMP enablement; do NOT infer from SOAP token.
    const pushToken = process.env.DARWIN_PASSWORD || process.env.DARWIN_PUSH_PORT_TOKEN || ''
    const inferredUsername =
      process.env.DARWIN_USERNAME || (pushToken ? 'darwin' : 'your_darwin_username')
    const inferredPassword =
      process.env.DARWIN_PASSWORD || process.env.DARWIN_PUSH_PORT_TOKEN || 'your_darwin_password'

    const config: DarwinConfig = {
      // STOMP configuration (Darwin uses STOMP protocol)
      stompUrl:
        process.env.DARWIN_STOMP_URL ||
        process.env.DARWIN_QUEUE_URL ||
        'ssl://datafeeds.nationalrail.co.uk:61617',
      username: inferredUsername,
      password: inferredPassword,

      // Queue configuration for Darwin STOMP / PubSub
      queueUrl: process.env.DARWIN_QUEUE_URL || 'ssl://datafeeds.nationalrail.co.uk:61617',
      queueName: process.env.DARWIN_QUEUE_NAME || 'Consumer.railhopp.VirtualTopic.PushPort-v18',
      clientId: process.env.DARWIN_CLIENT_ID || 'railhopp_client',
      enabled: process.env.DARWIN_ENABLED === 'true',

      // Connection settings
      timeout: 30000,
      retries: 3,
    }

    darwinClient = new DarwinClient(config)
  }

  return darwinClient
}

export default DarwinClient
