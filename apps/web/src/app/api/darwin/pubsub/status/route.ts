import { NextResponse } from 'next/server'
import { getDarwinPubSubClient } from '@/lib/darwin/pubsub-client'

export async function GET() {
  try {
    const client = getDarwinPubSubClient()
    const enabled = client.isEnabled()
    let ok = false
    try {
      ok = await client.testConnection()
    } catch {
      ok = false
    }

    const cacheStats = client.getCacheStatistics()

    return NextResponse.json({
      success: true,
      data: {
        enabled,
        ok,
        cache: cacheStats,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Pub/Sub status check failed' },
      },
      { status: 500 }
    )
  }
}