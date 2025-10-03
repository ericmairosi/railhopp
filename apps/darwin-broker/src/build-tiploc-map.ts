import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Build a TIPLOC -> CRS map by calling the web app CORPUS endpoint
// Requires NETWORK_RAIL credentials in apps/web/.env.local already configured
async function main() {
  const base = process.env.CORPUS_BASE_URL || 'http://localhost:3000'
  const outDir = process.env.MAP_OUT_DIR || path.resolve(process.cwd(), 'data')
  const outFile = path.join(outDir, 'tiploc-to-crs.json')

  // The web app should expose an endpoint that returns { map: { [tiploc]: crs } }
  // For now, try a fallback that builds a minimal file if the endpoint is missing.
  let map: Record<string, string> = {}

  try {
    const res = await fetch(`${base}/api/network-rail/corpus/tiploc-map`, {
      /* timeout: 30000 */
    } as any)
    if (res.ok) {
      const json = await res.json()
      map = json?.map || {}
    } else {
      console.warn(`Corpus endpoint returned ${res.status} - generating minimal file`)
    }
  } catch (e) {
    console.warn('Failed to fetch CORPUS map from web app:', (e as any)?.message || e)
  }

  if (!Object.keys(map).length) {
    // Minimal defaults if the endpoint isn’t available yet
    map = {
      KGX: 'KGX',
      PAD: 'PAD',
      WAT: 'WAT',
      EUS: 'EUS',
      LST: 'LST',
      CRDFCEN: 'CDF',
      GLGQHL: 'GLQ',
      NEWHVNH: 'NHE',
    }
  }

  await fs.promises.mkdir(outDir, { recursive: true })
  await fs.promises.writeFile(outFile, JSON.stringify(map, null, 2))
  console.log(`TIPLOC map written to ${outFile} with ${Object.keys(map).length} entries`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
