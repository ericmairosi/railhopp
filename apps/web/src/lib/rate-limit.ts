// Simple rate limiter with Redis backend (if available) and in-memory fallback
// Use per-endpoint, per-identifier (e.g., IP) limiting

import type { NextRequest } from 'next/server'

class MemoryCounter {
  private store = new Map<string, { count: number; resetAt: number }>()

  consume(key: string, windowSeconds: number): { count: number; resetAt: number } {
    const now = Date.now()
    const entry = this.store.get(key)
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + windowSeconds * 1000
      const rec = { count: 1, resetAt }
      this.store.set(key, rec)
      return rec
    }
    entry.count += 1
    return entry
  }
}

let memoryCounter: MemoryCounter | null = null

async function redisConsume(key: string, windowSeconds: number): Promise<{ count: number; resetAt: number } | null> {
  if (typeof window !== 'undefined') return null
  const url = process.env.REDIS_URL
  if (!url) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IORedis = require('ioredis')
    const client = new IORedis(url, { lazyConnect: true, maxRetriesPerRequest: 2, password: process.env.REDIS_TOKEN })
    await client.connect()
    const pttl = await client.pttl(key)
    const multi = client.multi()
    multi.incr(key)
    if (pttl < 0) {
      multi.pexpire(key, windowSeconds * 1000)
    }
    const [count] = (await multi.exec()) as unknown as [number, number?]
    const ttlMs = await client.pttl(key)
    await client.quit()
    const resetAt = Date.now() + (ttlMs > 0 ? ttlMs : windowSeconds * 1000)
    return { count: typeof count === 'number' ? count : 1, resetAt }
  } catch {
    return null
  }
}

export async function rateLimit(
  request: NextRequest,
  {
    keyPrefix,
    limit,
    windowSeconds,
  }: { keyPrefix: string; limit: number; windowSeconds: number }
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  const ip = forwarded.split(',')[0]?.trim() || 'unknown'
  const key = `${keyPrefix}:${ip}`

  // Try Redis first
  const redisResult = await redisConsume(key, windowSeconds)
  if (redisResult) {
    const allowed = redisResult.count <= limit
    const remaining = Math.max(0, limit - redisResult.count)
    return { allowed, remaining, reset: new Date(redisResult.resetAt) }
  }

  // Fallback to in-memory counter
  if (!memoryCounter) memoryCounter = new MemoryCounter()
  const mem = memoryCounter.consume(key, windowSeconds)
  return { allowed: mem.count <= limit, remaining: Math.max(0, limit - mem.count), reset: new Date(mem.resetAt) }
}
