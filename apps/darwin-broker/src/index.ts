import 'dotenv/config'
import dotenv from 'dotenv'
import path from 'path'
import express from 'express'

// Also load web app env for shared INTERNAL_API_TOKEN if present
try {
  dotenv.config({ path: path.resolve(process.cwd(), '..', 'web', '.env.local') })
} catch {}
import cors from 'cors'
import { Kafka, logLevel } from 'kafkajs'
import pino from 'pino'
import { WebSocketServer } from 'ws'
import { mapTiplocToCrs } from './tiploc-crs'

// Env
const PORT = parseInt(process.env.BROKER_PORT || '4001', 10)
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const KAFKA_SASL_USERNAME = process.env.KAFKA_SASL_USERNAME || ''
const KAFKA_SASL_PASSWORD = process.env.KAFKA_SASL_PASSWORD || ''
const KAFKA_TOPIC =
  process.env.KAFKA_TOPIC || 'prod-1010-Darwin-Train-Information-Push-Port-IIII2_0-JSON'
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'railhopp-darwin-broker'
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'railhopp-darwin-consumers'
// Optional CORPUS lookup service (web app internal route)
const CORPUS_LOOKUP_URL = (
  process.env.CORPUS_LOOKUP_URL || 'http://localhost:3000/api/internal/corpus/lookup'
).replace(/\/$/, '')
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || process.env.CORPUS_LOOKUP_TOKEN || ''

const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

// In-memory caches (can swap to Redis later)
type MovementMsg = any
const stationCache: Map<string, MovementMsg[]> = new Map() // key: CRS, latest messages
let lastMessageAt: number | null = null
let messagesSeen = 0

// WS clients
const wsClients = new Set<any>()

// Persist map on updates (debounced)
import fs from 'fs'
import path from 'path'
let pendingSave = false
function saveMapDebounced() {
  if (pendingSave) return
  pendingSave = true
  setTimeout(() => {
    try {
      const p = path.resolve(process.cwd(), 'data', 'tiploc-to-crs.json')
      fs.mkdirSync(path.dirname(p), { recursive: true })
      // TIPLOC_TO_CRS is the base; LOADED_MAP resides in tiploc-crs module. For simplicity, re-write merged view later.
      // Here we only ensure the file exists; real merging is handled in tiploc-crs via external map precedence.
    } catch {}
    pendingSave = false
  }, 1000)
}

function addToStationCache(crs: string, msg: MovementMsg) {
  const arr = stationCache.get(crs) || []
  arr.unshift(msg)
  // keep last 200
  stationCache.set(crs, arr.slice(0, 200))
}

// Simple inflight limiter for lookups
const inflight = new Set<string>()
async function resolveCrsFromTiploc(tpl?: string): Promise<string | null> {
  if (!tpl) return null
  const key = tpl.toUpperCase()
  if (!CORPUS_LOOKUP_URL || !INTERNAL_TOKEN) return null
  if (inflight.has(key)) return null
  inflight.add(key)
  try {
    const u = `${CORPUS_LOOKUP_URL}?tpl=${encodeURIComponent(key)}`
    const res = await fetch(u, {
      headers: { 'x-internal-token': INTERNAL_TOKEN },
      timeout: 10000 as any,
    })
    if (!res.ok) return null
    const json: any = await res.json()
    const crs: string | null = json?.crs || null
    return crs && typeof crs === 'string' && crs.length === 3 ? crs.toUpperCase() : null
  } catch {
    return null
  } finally {
    inflight.delete(key)
  }
}

async function startKafkaConsumer() {
  if (!KAFKA_BROKERS.length || !KAFKA_SASL_USERNAME || !KAFKA_SASL_PASSWORD) {
    logger.warn(
      'Kafka credentials/brokers missing. Set KAFKA_BROKERS, KAFKA_SASL_USERNAME, KAFKA_SASL_PASSWORD'
    )
    return
  }

  const kafka = new Kafka({
    clientId: KAFKA_CLIENT_ID,
    brokers: KAFKA_BROKERS,
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: KAFKA_SASL_USERNAME,
      password: KAFKA_SASL_PASSWORD,
    },
    logLevel: logLevel.NOTHING,
  })

  const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID })
  await consumer.connect()
  logger.info({ brokers: KAFKA_BROKERS }, 'Kafka connected')
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false })
  logger.info({ topic: KAFKA_TOPIC }, 'Subscribed to topic')

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        if (!message.value) return
        const text = message.value.toString('utf8')
        const payload = JSON.parse(text)
        // payload can be an array of events or single event
        const events: any[] = Array.isArray(payload) ? payload : [payload]
        for (const ev of events) {
          messagesSeen++
          lastMessageAt = Date.now()
          // Basic mapping: try to locate CRS; else derive from TIPLOC where possible
          const body = ev.body || ev
          let crs = body?.loc_crs || body?.crs || body?.location?.crs || null

          // Darwin messages often carry TIPLOC under Location.tpl or body.tpl
          const tpl = body?.Location?.tpl || body?.tpl || body?.location?.tpl
          if (!crs && tpl) {
            const mapped = mapTiplocToCrs(tpl)
            if (mapped) {
              crs = mapped
            } else {
              // Try on-demand CORPUS lookup; if resolved, append to cache
              try {
                const found = await resolveCrsFromTiploc(tpl)
                if (found) {
                  crs = found
                }
              } catch {}
            }
          }

          addToStationCache((crs || 'UNKNOWN').toUpperCase(), body)
          // Broadcast via WS
          const out = JSON.stringify({ type: 'movement', crs, body })
          for (const ws of wsClients) {
            try {
              ws.send(out)
            } catch {}
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to process Kafka message')
      }
    },
  })
}

async function main() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  // Health
  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      messagesSeen,
      lastMessageAt,
      topic: KAFKA_TOPIC,
      brokers: KAFKA_BROKERS,
      now: new Date().toISOString(),
    })
  })

  // Recent messages by station CRS
  app.get('/station/:crs/recent', (req, res) => {
    const crs = (req.params.crs || '').toUpperCase()
    const data = stationCache.get(crs) || []
    const sample = data[0]
    res.json({ crs, count: data.length, sample, data })
  })

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Darwin broker listening')
  })

  // WebSocket for live push
  const wss = new WebSocketServer({ server, path: '/ws' })
  wss.on('connection', (ws) => {
    wsClients.add(ws)
    ws.on('close', () => wsClients.delete(ws))
    ws.send(JSON.stringify({ type: 'hello', now: new Date().toISOString() }))
  })

  // Start Kafka consumption
  startKafkaConsumer().catch((err) => {
    logger.error({ err }, 'Kafka consumer failed to start')
  })
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
