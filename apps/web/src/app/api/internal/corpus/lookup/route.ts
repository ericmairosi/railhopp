import { NextRequest, NextResponse } from 'next/server'
import { CorpusClient } from '@/lib/network-rail/corpus-client'
import { NetworkRailConfig } from '@/lib/network-rail/types'

// In-memory cache (process scoped)
let cachedAt: number | null = null
let cacheMap: Map<string, string> | null = null
const TTL_MS = 1000 * 60 * 60 * 6 // 6 hours

function getToken(): string {
  return process.env.INTERNAL_API_TOKEN || ''
}

function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

async function ensureCorpusLoaded(): Promise<void> {
  if (cacheMap && cachedAt && Date.now() - cachedAt < TTL_MS) return

  const cfg: NetworkRailConfig = {
    apiUrl: process.env.NETWORK_RAIL_API_URL || 'https://publicdatafeeds.networkrail.co.uk',
    username: process.env.NETWORK_RAIL_USERNAME || '',
    password: process.env.NETWORK_RAIL_PASSWORD || '',
    stompUrl: process.env.NETWORK_RAIL_STOMP_URL || '',
    timeout: 60000,
  }
  const client = new CorpusClient(cfg)
  await client.loadCorpusData()

  // Build TIPLOC->CRS map from processed stations
  const map = new Map<string, string>()
  const stations = client.getPassengerStations()
  for (const s of stations) {
    if (s.tiploc && s.crsCode) {
      map.set(s.tiploc.toUpperCase(), s.crsCode.toUpperCase())
    }
  }
  cacheMap = map
  cachedAt = Date.now()
}

export async function GET(req: NextRequest) {
  try {
    // Require internal token
    const token = req.headers.get('x-internal-token') || ''
    if (!token || token !== getToken()) return unauthorized()

    const tpl = (new URL(req.url).searchParams.get('tpl') || '').toUpperCase().trim()
    if (!tpl)
      return NextResponse.json({ success: false, error: 'Missing tpl param' }, { status: 400 })

    await ensureCorpusLoaded()

    const crs = cacheMap?.get(tpl) || null
    return NextResponse.json({
      success: true,
      tpl,
      crs,
      cachedAt: cachedAt ? new Date(cachedAt).toISOString() : null,
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
