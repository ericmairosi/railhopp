/**
 * Base Network Rail Client
 * Common functionality for all Network Rail feed clients
 */

import type { NetworkRailConfig } from './types'

export interface BaseNetworkRailConfig extends NetworkRailConfig {
  feedName: string
  topics?: string[]
}

export interface BaseNetworkRailMessage {
  messageType: string
  timestamp: string
  data: unknown
  sourceSystem: string
  sequenceNumber?: number
}

export abstract class BaseNetworkRailClient<T extends BaseNetworkRailMessage> {
  protected config: BaseNetworkRailConfig
  protected messages: T[] = []
  protected isConnected = false

  constructor(config: BaseNetworkRailConfig) {
    this.config = config
  }

  /**
   * Parse raw message into typed message
   */
  protected abstract parseMessage(rawMessage: unknown): T

  /**
   * Store processed message
   */
  protected storeMessage(message: T): void {
    this.messages.push(message)

    // Keep only recent messages (last 1000)
    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(-1000)
    }
  }

  /**
   * Get stored messages
   */
  getMessages(since?: string): T[] {
    if (!since) return this.messages

    return this.messages.filter((msg) => msg.timestamp > since)
  }

  /**
   * Get connection status
   */
  isClientConnected(): boolean {
    return this.isConnected
  }

  /**
   * Get configuration
   */
  getConfig(): BaseNetworkRailConfig {
    return this.config
  }

  /**
   * Clear stored messages
   */
  clearMessages(): void {
    this.messages = []
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messages.length
  }

  /**
   * Get latest message
   */
  getLatestMessage(): T | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null
  }
}
