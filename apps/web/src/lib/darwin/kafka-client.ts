// Darwin Kafka Client (Rail Data Marketplace - Confluent Cloud)
// Consumes JSON messages from the Darwin Train Information Push-Port topic
// and exposes minimal runtime status for health verification.

import { Kafka, logLevel, Consumer, type SASLOptions } from 'kafkajs'
import fs from 'fs'
import path from 'path'

export type DarwinKafkaStatus = {
  enabled: boolean
  configured: boolean
  connected: boolean
  topic?: string
  groupId?: string
  brokers?: string[]
  messagesConsumed: number
  lastMessageAt?: string
  lastError?: string
}

class DarwinKafkaClient {
  private kafka?: Kafka
  private consumer?: Consumer
  private started = false
  private messagesConsumed = 0
  private lastMessageAt?: Date
  private lastError?: string

  private getConfig() {
    const brokers = (process.env.DARWIN_KAFKA_BROKERS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    return {
      brokers,
      username: process.env.DARWIN_KAFKA_USERNAME || '',
      password: process.env.DARWIN_KAFKA_PASSWORD || '',
      topic: process.env.DARWIN_KAFKA_TOPIC || '',
      groupId:
        process.env.DARWIN_KAFKA_GROUP_ID || 'railhopp-darwin-consumer-' + (process.env.NODE_ENV || 'dev'),
      saslMechanism: (process.env.DARWIN_KAFKA_SASL_MECHANISM || 'plain') as 'plain' | 'scram-sha-256' | 'scram-sha-512',
      ssl: (process.env.DARWIN_KAFKA_SSL || 'true') !== 'false',
    }
  }

  isEnabled(): boolean {
    // Enable via env flag if provided; default true if any broker is set
    const enabledFlag = process.env.DARWIN_KAFKA_ENABLED
    if (enabledFlag === 'false') return false

    const { brokers, username, password, topic } = this.getConfig()
    return brokers.length > 0 && !!username && !!password && !!topic
  }

  status(): DarwinKafkaStatus {
    const { brokers, topic, groupId } = this.getConfig()
    return {
      enabled: this.isEnabled(),
      configured: brokers.length > 0 && !!topic,
      connected: !!this.consumer && this.started,
      topic,
      groupId,
      brokers,
      messagesConsumed: this.messagesConsumed,
      lastMessageAt: this.lastMessageAt?.toISOString(),
      lastError: this.lastError,
    }
  }

  private handlers = new Set<(payload: any) => void>()

  onMessage(handler: (payload: any) => void) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  async start(): Promise<void> {
    if (this.started) return
    if (!this.isEnabled()) return

    const cfg = this.getConfig()
    // Optional CA bundle support
    let ssl: any = cfg.ssl
    const caPath = process.env.DARWIN_KAFKA_CA_PATH
    if (cfg.ssl && caPath) {
      try {
        const full = path.isAbsolute(caPath)
          ? caPath
          : path.join(process.cwd(), caPath)
        const ca = fs.readFileSync(full, 'utf-8')
        ssl = { ca: [ca] }
      } catch (e) {
        this.lastError = `Failed to load CA bundle at ${caPath}`
      }
    }

    let saslOption: SASLOptions | undefined
    if (cfg.username && cfg.password) {
      if (cfg.saslMechanism === 'plain') {
        saslOption = { mechanism: 'plain', username: cfg.username, password: cfg.password }
      } else if (cfg.saslMechanism === 'scram-sha-256') {
        saslOption = {
          mechanism: 'scram-sha-256',
          username: cfg.username,
          password: cfg.password,
        }
      } else if (cfg.saslMechanism === 'scram-sha-512') {
        saslOption = {
          mechanism: 'scram-sha-512',
          username: cfg.username,
          password: cfg.password,
        }
      }
    }

    this.kafka = new Kafka({
      brokers: cfg.brokers,
      ssl,
      sasl: saslOption,
      clientId: 'railhopp-darwin',
      logLevel: logLevel.ERROR,
    })

    this.consumer = this.kafka.consumer({ groupId: cfg.groupId })

    try {
      await this.consumer.connect()
      await this.consumer.subscribe({ topic: cfg.topic, fromBeginning: false })

      await this.consumer.run({
        autoCommit: true,
        partitionsConsumedConcurrently: 1,
        eachMessage: async ({ message }) => {
          this.messagesConsumed++
          this.lastMessageAt = new Date()
          try {
            const raw = message.value?.toString('utf-8') || ''
            if (raw) {
              const json = JSON.parse(raw)
              for (const h of this.handlers) {
                try { h(json) } catch {}
              }
            }
          } catch (e) {
            this.lastError = 'JSON parse error'
          }
        },
      })

      this.started = true
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.consumer) await this.consumer.disconnect()
    } catch {
      // ignore
    } finally {
      this.started = false
    }
  }
}

let singleton: DarwinKafkaClient | null = null

export function getDarwinKafkaClient(): DarwinKafkaClient {
  if (!singleton) singleton = new DarwinKafkaClient()
  return singleton
}