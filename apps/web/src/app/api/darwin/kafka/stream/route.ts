import { NextRequest } from 'next/server'
import { getDarwinKafkaClient } from '@/lib/darwin/kafka-client'
import { extractServiceUpdates } from '@/lib/darwin/parsers/pushport-json'
import { getRealtimeCache, ServiceUpdate } from '@/lib/realtime/realtime-cache'

export const runtime = 'nodejs'

function sseController() {
  let controller: ReadableStreamDefaultController<Uint8Array>

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
    cancel() {},
  })

  const send = (event: string, data: unknown) => {
    const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`
    controller.enqueue(encoder.encode(payload))
  }
  const comment = (text: string) => controller.enqueue(encoder.encode(`: ${text}\n\n`))
  const close = () => controller.close()

  return { stream, send, comment, close }
}

export async function GET(_req: NextRequest) {
  const { stream, send, comment, close } = sseController()

  // Ensure Kafka client is running and hooked into realtime cache
  const kafka = getDarwinKafkaClient()
  const cache = getRealtimeCache()

  if (kafka.isEnabled()) {
    // Attach parser once (idempotent behavior if multiple streams attach)
    kafka.onMessage((json) => {
      try {
        const updates = extractServiceUpdates(json)
        for (const u of updates) cache.upsert(u)
      } catch {}
    })
    try {
      await kafka.start()
    } catch {
      // ignore; status is visible via status endpoint
    }
  }

  // Subscribe to cache and push live events
  const unsubscribe = cache.subscribe((evt: { type: 'service_update'; data: ServiceUpdate }) => send('service_update', evt.data))

  // Initial handshake + snapshot
  comment('connected')
  const snapshot = cache.snapshot(50)
  if (snapshot.length) send('bootstrap', snapshot)

  // Heartbeats for proxies
  const hb = setInterval(() => comment('hb'), 15000)

  const headers = new Headers()
  headers.set('Content-Type', 'text/event-stream')
  headers.set('Cache-Control', 'no-cache, no-transform')
  headers.set('Connection', 'keep-alive')

  const response = new Response(stream, { headers })

  // When the client disconnects, clear interval + unsubscribe.
  ;(response as any).socket?.on('close', () => {
    clearInterval(hb)
    unsubscribe()
    close()
  })

  return response
}