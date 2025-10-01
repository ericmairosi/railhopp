import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load env from current dir, then fall back to apps/web/.env.local
dotenv.config()
try {
  dotenv.config({ path: path.resolve(process.cwd(), '..', 'web', '.env.local') })
} catch {}

async function main() {
  const apiUrl = process.env.NETWORK_RAIL_API_URL || 'https://datafeeds.networkrail.co.uk'
  const username = process.env.NETWORK_RAIL_USERNAME || ''
  const password = process.env.NETWORK_RAIL_PASSWORD || ''

  if (!username || !password) {
    console.error('Missing NETWORK_RAIL_USERNAME or NETWORK_RAIL_PASSWORD in env')
  }

  const outDir = process.env.MAP_OUT_DIR || path.resolve(process.cwd(), 'data')
  const outFile = path.join(outDir, 'tiploc-to-crs.json')

  const url = `${apiUrl.replace(/\/$/, '')}/ntrod/CORPUSExtract`
  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  console.log('Fetching CORPUS from', url)
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    timeout: 60000 as any,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`CORPUS HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`)
  }

  const json: any = await res.json()
  const arr: any[] = Array.isArray(json?.TIPLOCDATA) ? json.TIPLOCDATA : []

  const map: Record<string, string> = {}
  for (const e of arr) {
    const tiploc = e?.tiploc
    const crs = e?.crs_code
    if (tiploc && crs && typeof crs === 'string' && crs.length === 3) {
      map[String(tiploc).toUpperCase()] = String(crs).toUpperCase()
    }
  }

  await fs.promises.mkdir(outDir, { recursive: true })
  await fs.promises.writeFile(outFile, JSON.stringify(map, null, 2))
  console.log(`Built TIPLOC->CRS map with ${Object.keys(map).length} entries at ${outFile}`)
}

main().catch((err) => {
  console.error('Failed building map:', err.message || err)
  process.exit(1)
})
