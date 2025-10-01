import { NextRequest, NextResponse } from 'next/server'
import { getKnowledgeStationClient } from '@/lib/knowledge-station/client'
import { getKnowledgebaseClient } from '@/lib/knowledgebase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limitRaw = searchParams.get('limit') || '10'
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 10, 1), 25)

    if (!q || q.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_QUERY', message: 'Query must be at least 2 characters' },
        },
        { status: 400 }
      )
    }

    // Prefer Rail Data Marketplace Knowledgebase (XML) if configured
    const kb = getKnowledgebaseClient()
    if (kb.isEnabled && kb.isEnabled()) {
      const stations = await kb.search(q, limit)
      if (stations.length > 0) {
        return NextResponse.json({
          success: true,
          data: stations.map((s) => ({ code: s.code, name: s.name })),
          source: 'knowledgebase',
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Fallback to existing Knowledge Station client (if configured or if KB returned empty)
    const ks = getKnowledgeStationClient()
    if (ks.isEnabled()) {
      const results = await ks.searchStations({ query: q, limit })
      return NextResponse.json({ success: true, data: results, source: 'knowledge-station', timestamp: new Date().toISOString() })
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVICE_DISABLED',
          message: 'No station suggestion service configured (Knowledgebase or Knowledge Station)'
        },
      },
      { status: 503 }
    )
  } catch (error) {
    console.error('Station suggest API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to search stations' },
      },
      { status: 500 }
    )
  }
}
