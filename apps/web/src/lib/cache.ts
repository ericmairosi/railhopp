// Server-first cache with Redis (ioredis) for production and in-memory fallback
// All operations are async for a consistent API across backends

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem<unknown>>()

  async set<T>(key: string, data: T, ttlSeconds: number = 60): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    })
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    return item.data as T
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

class RedisCache {
  private client: any | null = null
  private isReady = false

  constructor() {
    if (typeof window !== 'undefined') return
    const url = process.env.REDIS_URL
    const token = process.env.REDIS_TOKEN
    if (!url) return
    try {
      // Lazy require to avoid bundling on edge/client
      /* eslint-disable @typescript-eslint/no-require-imports */
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const IORedis = require('ioredis')
      /* eslint-enable @typescript-eslint/no-require-imports */
      const options: Record<string, unknown> = { lazyConnect: true, maxRetriesPerRequest: 2 }
      if (token) options.password = token
      this.client = new IORedis(url, options)
      this.client.on('error', () => {})
      this.client.connect().then(() => {
        this.isReady = true
      }).catch(() => {})
    } catch {
      this.client = null
    }
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 60): Promise<void> {
    if (!this.client || !this.isReady) return
    const value = JSON.stringify({ v: data })
    await this.client.set(key, value, 'EX', ttlSeconds)
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.client || !this.isReady) return null
    const raw = await this.client.get(key)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return parsed?.v as T
    } catch {
      return null
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.client || !this.isReady) return false
    const res = await this.client.del(key)
    return res > 0
  }
}

// Choose backend
const useRedis = typeof window === 'undefined' && !!process.env.REDIS_URL
const memory = new MemoryCache()
const redis = new RedisCache()

const apiCache = {
  async set<T>(key: string, data: T, ttlSeconds = 60): Promise<void> {
    if (useRedis) {
      await redis.set(key, data, ttlSeconds)
    } else {
      await memory.set(key, data, ttlSeconds)
    }
  },
  async get<T = unknown>(key: string): Promise<T | null> {
    if (useRedis) {
      return redis.get<T>(key)
    }
    return memory.get<T>(key)
  },
  async delete(key: string): Promise<boolean> {
    if (useRedis) {
      return redis.delete(key)
    }
    return memory.delete(key)
  },
  // Expose cleanup for memory cache (no-op for redis)
  cleanup(): void {
    memory.cleanup()
  },
}

// Clean up expired entries every 5 minutes (memory only)
if (typeof window === 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 5 * 60 * 1000)
}

export default apiCache

// Cache key generators
export const generateCacheKey = {
  departures: (crs: string, numRows: number = 10, filterCrs?: string, filterType?: string) => {
    return `departures:${crs}:${numRows}:${filterCrs || ''}:${filterType || ''}`
  },

  serviceDetails: (serviceId: string) => {
    return `service:${serviceId}`
  },

  disruptions: (severity?: string, operator?: string, includeResolved?: boolean) => {
    return `disruptions:${severity || ''}:${operator || ''}:${includeResolved || false}`
  },

  journeyPlan: (from: string, to: string, date: string, time: string, passengers: number) => {
    return `journey:${from}:${to}:${date}:${time}:${passengers}`
  },
}
