import { NextRequest, NextResponse } from 'next/server'
import { CorpusClient } from '@/lib/network-rail/corpus-client'
import { NetworkRailConfig } from '@/lib/network-rail/types'

// Build a TIPLOC -> CRS map from CORPUS entries
export async function GET(_req: NextRequest) {
  try {
    const cfg: NetworkRailConfig = {
      apiUrl: process.env.NETWORK_RAIL_API_URL || 'https://datafeeds.networkrail.co.uk',
      username: process.env.NETWORK_RAIL_USERNAME || '',
      password: process.env.NETWORK_RAIL_PASSWORD || '',
      stompUrl: process.env.NETWORK_RAIL_STOMP_URL || '',
      timeout: 45000,
    }

    const client = new CorpusClient(cfg)
    await client.loadCorpusData()

    const map: Record<string, string> = {}
    // get all passenger stations and use their TIPLOC->CRS
    const stations = client.getPassengerStations()
    for (const s of stations) {
      if (s.tiploc && s.crsCode) {
        map[s.tiploc.toUpperCase()] = s.crsCode.toUpperCase()
      }
    }

    return NextResponse.json({ success: true, count: Object.keys(map).length, map })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 })
  }
}
