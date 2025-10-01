// Realtime cache and pub-sub for service updates
// Uses in-memory store by default; switches to Redis if REALTIME_REDIS_URL or REDIS_URL is present.

export type ServiceUpdate = {
  serviceId: string
  scheduledDeparture?: string
  estimatedDeparture?: string
  platform?: string
  cancelled?: boolean
  delayReason?: string
  operator?: string
  lastUpdated: string
}

export type Subscriber = (event: { type: 'service_update'; data: ServiceUpdate }) => void

// ---------------- In-memory implementation ----------------
class RealtimeCacheMemory {
  private updates = new Map<string, ServiceUpdate>()
  private subscribers = new Set<Subscriber>()

  upsert(update: Omit<ServiceUpdate, 'lastUpdated'> & { lastUpdated?: string }) {
    const existing = this.updates.get(update.serviceId)
    const merged: ServiceUpdate = {
      ...existing,
      ...update,
      lastUpdated: update.lastUpdated || new Date().toISOString(),
    }
    this.updates.set(merged.serviceId, merged)
    this.broadcast({ type: 'service_update', data: merged })
  }

  snapshot(limit = 100): ServiceUpdate[] {
    const arr = Array.from(this.updates.values())
    arr.sort((a, b) => (a.lastUpdated > b.lastUpdated ? -1 : 1))
    return arr.slice(0, limit)
  }

  subscribe(fn: Subscriber) {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  private broadcast(evt: { type: 'service_update'; data: ServiceUpdate }) {
    for (const s of this.subscribers) {
      try { s(evt) } catch {}
    }
  }
}

// ---------------- Redis implementation ----------------
let Redis: any
try {
  // Lazy import to avoid bundling when not used
   
  Redis = require('ioredis')
} catch {}

class RealtimeCacheRedis {
  private pub: any
  private sub: any
  private channel = 'realtime:service_update'
  private recentKey = 'realtime:recent'
  private subscribers = new Set<Subscriber>()
  private boundHandler: any

  constructor(private url: string) {
    this.pub = new Redis(this.url)
    this.sub = new Redis(this.url)
    this.boundHandler = (channel: string, message: string) => {
      if (channel !== this.channel) return
      try {
        const data: ServiceUpdate = JSON.parse(message)
        this.broadcast({ type: 'service_update', data })
      } catch {}
    }
    this.sub.subscribe(this.channel)
    this.sub.on('message', this.boundHandler)
  }

  async upsert(update: Omit<ServiceUpdate, 'lastUpdated'> & { lastUpdated?: string }) {
    const payload: ServiceUpdate = {
      ...update,
      lastUpdated: update.lastUpdated || new Date().toISOString(),
    } as ServiceUpdate

    await this.pub.publish(this.channel, JSON.stringify(payload))
    // Keep a rolling window of recent updates for bootstrap
    await this.pub.lpush(this.recentKey, JSON.stringify(payload))
    await this.pub.ltrim(this.recentKey, 0, 199)
  }

  async snapshot(limit = 100): Promise<ServiceUpdate[]> {
    try {
      const items: string[] = await this.pub.lrange(this.recentKey, 0, Math.max(0, limit - 1))
      return items.map((s) => JSON.parse(s))
    } catch {
      return []
    }
  }

  subscribe(fn: Subscriber) {
    this.subscribers.add(fn)
    return () => this.subscribers.delete(fn)
  }

  private broadcast(evt: { type: 'service_update'; data: ServiceUpdate }) {
    for (const s of this.subscribers) {
      try { s(evt) } catch {}
    }
  }
}

// ---------------- Factory ----------------
let singleton: any = null
export function getRealtimeCache() {
  if (singleton) return singleton
  const redisUrl = process.env.REALTIME_REDIS_URL || process.env.REDIS_URL
  if (redisUrl && Redis) {
    singleton = new RealtimeCacheRedis(redisUrl)
  } else {
    singleton = new RealtimeCacheMemory()
  }
  return singleton
}
