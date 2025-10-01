import { NextRequest, NextResponse } from 'next/server'
import { getDarwinKafkaClient } from '@/lib/darwin/kafka-client'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  try {
    const client = getDarwinKafkaClient()

    // Start lazily on first status call
    if (client.isEnabled()) {
      try {
        await client.start()
      } catch (err) {
        // fall through – we'll still return status including lastError
      }
    }

    const status = client.status()
    return NextResponse.json({ success: true, data: status, timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Kafka status check failed' } },
      { status: 500 }
    )
  }
}