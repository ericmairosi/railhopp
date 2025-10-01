// Simple in-memory cache for API responses
interface CacheItem {
  data: any
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache = new Map<string, CacheItem>()

  set(key: string, data: any, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  delete(key: string): boolean {
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

  size(): number {
    return this.cache.size
  }
}

// Global cache instance
const apiCache = new MemoryCache()

// Clean up expired entries every 5 minutes
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(
    () => {
      apiCache.cleanup()
    },
    5 * 60 * 1000
  )
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
