import { NextRequest, NextResponse } from 'next/server'
import { getKnowledgeStationClient } from '@/lib/knowledge-station/client'
import { getKnowledgebaseClient } from '@/lib/knowledgebase/client'
import { CorpusClient } from '@/lib/network-rail/corpus-client'
import { NetworkRailConfig } from '@/lib/network-rail/types'

declare global {
  // Global-cached Network Rail CORPUS client (server-only)
  // eslint-disable-next-line no-var
  var __corpusClient: CorpusClient | undefined
}

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

    // Fallback to Network Rail CORPUS if configured (broad coverage of station names/CRS)
    try {
      const cfg: NetworkRailConfig = {
        apiUrl: process.env.NETWORK_RAIL_API_URL || '',
        username: process.env.NETWORK_RAIL_USERNAME || '',
        password: process.env.NETWORK_RAIL_PASSWORD || '',
        stompUrl: process.env.NETWORK_RAIL_STOMP_URL || '',
        timeout: 45000,
      }
      if (cfg.apiUrl && cfg.username && cfg.password) {
        // Module-level singleton to avoid reloading between requests
        if (!globalThis.__corpusClient) {
          globalThis.__corpusClient = new CorpusClient(cfg)
          try {
            await globalThis.__corpusClient.loadCorpusData()
          } catch {}
        }
        const corpus = globalThis.__corpusClient
        if (corpus) {
          const stations = corpus
            .getPassengerStations()
            .filter((s) =>
              s.stationName.toLowerCase().includes(q.toLowerCase()) || s.crsCode.toLowerCase().includes(q.toLowerCase())
            )
            .slice(0, limit)
            .map((s) => ({ code: s.crsCode, name: s.stationName }))

          if (stations.length > 0) {
            return NextResponse.json({
              success: true,
              data: stations,
              source: 'network-rail-corpus',
              timestamp: new Date().toISOString(),
            })
          }
        }
      }
    } catch (e) {
      // Ignore and proceed to final fallback
    }

    // As a usability fallback, if the user types exactly 3 letters, treat as CRS code candidate
    // This does not use mock data; it simply passes through the user's code for downstream validation.
    if (/^[a-zA-Z]{3}$/.test(q)) {
      const code = q.toUpperCase()
      return NextResponse.json({
        success: true,
        data: [{ code, name: code }],
        source: 'passthrough',
        timestamp: new Date().toISOString(),
      })
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
