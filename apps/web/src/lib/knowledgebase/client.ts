import { XMLParser } from 'fast-xml-parser'

export type KBStationSummary = {
  code: string
  name: string
  toc?: string
  tiploc?: string
  stanox?: string
}

export type KBStationDetail = KBStationSummary & {
  address?: string
  postcode?: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  facilities?: string[]
  accessibility?: string[]
}

export type KnowledgebaseConfig = {
  apiUrl: string
  apiKey: string
  timeout?: number
  toc?: string
}

export class KnowledgebaseClient {
  private parser: XMLParser
  private config: KnowledgebaseConfig
  private cacheAll?: { items: KBStationSummary[]; fetchedAt: number }

  private extractStations(raw: unknown): unknown[] {
    if (!raw || typeof raw !== 'object') return []

    const r = raw as Record<string, unknown>
    const candidates: unknown[] = []

    const Stations = r['Stations']
    if (Stations && typeof Stations === 'object') {
      candidates.push((Stations as Record<string, unknown>)['Station'])
    }
    const stations = r['stations']
    if (stations && typeof stations === 'object') {
      candidates.push((stations as Record<string, unknown>)['station'])
    }
    const StationList = r['StationList']
    if (StationList && typeof StationList === 'object') {
      candidates.push((StationList as Record<string, unknown>)['Station'])
    }
    const StationsList = r['StationsList']
    if (StationsList && typeof StationsList === 'object') {
      candidates.push((StationsList as Record<string, unknown>)['Station'])
    }
    const ArrayOfStation = r['ArrayOfStation']
    if (ArrayOfStation && typeof ArrayOfStation === 'object') {
      candidates.push((ArrayOfStation as Record<string, unknown>)['Station'])
    }
    // also push roots if they might directly be arrays
    if (r['Stations']) candidates.push(r['Stations'])
    if (r['stations']) candidates.push(r['stations'])

    for (const c of candidates.filter(Boolean)) {
      if (Array.isArray(c)) return c
      if (c && typeof c === 'object') {
        const maybe = (c as Record<string, unknown>)['Station']
        if (Array.isArray(maybe)) return maybe
      }
    }

    // Fallback: deep scan for arrays of station-like objects
    const result: unknown[] = []
    const stack: unknown[] = [raw]
    while (stack.length) {
      const node = stack.pop()
      if (!node || typeof node !== 'object') continue
      for (const [, v] of Object.entries(node as Record<string, unknown>)) {
        if (Array.isArray(v)) {
          const looksLikeStations = v.some(
            (x) => x && typeof x === 'object' && (("CrsCode" in (x as Record<string, unknown>)) || ("CRS" in (x as Record<string, unknown>)) || ("StationName" in (x as Record<string, unknown>)) || ("Name" in (x as Record<string, unknown>)))
          )
          if (looksLikeStations) {
            result.push(...(v as unknown[]))
          }
        } else if (v && typeof v === 'object') {
          stack.push(v)
        }
      }
    }
    return result
  }

  constructor(cfg: KnowledgebaseConfig) {
    this.config = { timeout: 15000, ...cfg }
    this.parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  }

  isEnabled(): boolean {
    return Boolean(this.config.apiUrl && this.config.apiKey)
  }

  private resolveBaseRoot(): string {
    // If apiUrl already includes a 4.0 path, strip to product root
    const idx = this.config.apiUrl.indexOf('/4.0/')
    if (idx > -1) return this.config.apiUrl.slice(0, idx)
    return this.config.apiUrl.replace(/\/$/, '')
  }

  private async fetchXml(fullOrPath: string): Promise<unknown> {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), this.config.timeout)
    try {
      const url = fullOrPath.startsWith('http')
        ? fullOrPath
        : `${this.resolveBaseRoot()}${fullOrPath}`
      const key = (this.config.apiKey || '').trim()
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-apikey': key,
          apikey: key, // some gateways accept either header name
          Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Railhopp/1.0',
        },
        cache: 'no-store',
        signal: controller.signal,
      })
      const text = await res.text()
      if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}: ${text.slice(0, 200)}`)
      return this.parser.parse(text)
    } finally {
      clearTimeout(t)
    }
  }

  // Get all stations (cached ~12h). Assumes /4.0/stations.xml exists; if not, caller should fallback.
  async getAllStations(): Promise<KBStationSummary[]> {
    const now = Date.now()
    if (this.cacheAll && now - this.cacheAll.fetchedAt < 12 * 60 * 60 * 1000) {
      return this.cacheAll.items
    }

    const primary = (this.config.toc || 'LE').toUpperCase()
    const listEnv = (process.env.KNOWLEDGEBASE_TOC_LIST || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
    const tocs = Array.from(new Set([primary, ...listEnv])).slice(0, 8) // cap at 8 TOCs max

    const allItems: KBStationSummary[] = []

    for (const toc of tocs) {
      try {
        let listUrl = ''
        if (this.config.apiUrl.includes('{TOC}')) {
          listUrl = this.config.apiUrl.replace('{TOC}', toc)
        } else {
          listUrl = `${this.resolveBaseRoot()}/4.0/stations-${toc}.xml`
        }
        const json = await this.fetchXml(listUrl)
        const stations = this.extractStations(json)
        const items: KBStationSummary[] = stations
          .map((s) => this.toSummaryFromUnknown(s))
          .filter((x): x is KBStationSummary => Boolean(x && x.code && x.name))
        allItems.push(...items)
      } catch (e) {
        // ignore this TOC
      }
    }

    // de-duplicate by CRS code
    const byCrs = new Map<string, KBStationSummary>()
    for (const s of allItems) {
      if (!byCrs.has(s.code)) byCrs.set(s.code, s)
    }

    const result = Array.from(byCrs.values())
    this.cacheAll = { items: result, fetchedAt: now }
    return result
  }

  // Quick fetch by CRS, using station-{CRS}.xml (summary)
  async getStation(crs: string): Promise<KBStationSummary | null> {
    const detail = await this.getStationDetails(crs)
    if (!detail) return null
    const { code, name, toc, tiploc, stanox } = detail
    return { code, name, toc, tiploc, stanox }
  }

  // Detailed fetch by CRS with facilities/accessibility/address if present
  async getStationDetails(crs: string): Promise<KBStationDetail | null> {
    let json: unknown
    try {
      json = await this.fetchXml(`/4.0/station-${encodeURIComponent(crs.toUpperCase())}.xml`)
    } catch (e) {
      // Fallback: search the TOC stations list
      try {
        const list = await this.getAllStations()
        const hit = list.find((st) => st.code?.toUpperCase() === crs.toUpperCase())
        if (hit) {
          return {
            ...hit,
          }
        }
      } catch {}
      throw e
    }
    const root = (json || {}) as Record<string, unknown>
    let s: unknown = root['Station']
    if (!s) {
      const stationsObj = root['Stations']
      if (stationsObj && typeof stationsObj === 'object') {
        s = (stationsObj as Record<string, unknown>)['Station']
      }
    }
    if (!s || typeof s !== 'object') return null
    const so = s as Record<string, unknown>

    const facilities: string[] = []
    const accessibility: string[] = []

    const pushArray = (arr: unknown, target: string[]) => {
      if (!arr) return
      if (Array.isArray(arr)) arr.forEach((x) => x && target.push(String(x).trim()))
      else target.push(String(arr).trim())
    }

    // Attempt to collect facilities/accessibility from common keys
    const facRoot = (so['Facilities'] ?? so['facilities'] ?? so['StationFacilities']) as
      | Record<string, unknown>
      | undefined
    if (facRoot) {
      pushArray(facRoot['Facility'] ?? facRoot['List'] ?? facRoot['Item'], facilities)
    }
    const accRoot = (so['Accessibility'] ?? so['accessibility'] ?? so['StationAccessibility']) as
      | Record<string, unknown>
      | undefined
    if (accRoot) {
      pushArray(accRoot['Feature'] ?? accRoot['List'] ?? accRoot['Item'], accessibility)
    }

    const coords = (so['Coordinates'] ?? so['Location']) as Record<string, unknown> | undefined

    const detail: KBStationDetail = {
      code:
        (typeof so['CrsCode'] === 'string' && so['CrsCode']) ||
        (typeof so['CRS'] === 'string' && so['CRS']) ||
        crs.toUpperCase(),
      name:
        (typeof so['Name'] === 'string' && so['Name']) ||
        (typeof so['StationName'] === 'string' && so['StationName']) ||
        '',
      toc:
        (typeof so['Toc'] === 'string' && so['Toc']) ||
        (typeof so['TOC'] === 'string' && so['TOC']) ||
        undefined,
      tiploc:
        (typeof so['Tiploc'] === 'string' && so['Tiploc']) ||
        (typeof so['TIPLOC'] === 'string' && so['TIPLOC']) ||
        undefined,
      stanox:
        (typeof so['Stanox'] === 'string' && so['Stanox']) ||
        (typeof so['STANOX'] === 'string' && so['STANOX']) ||
        undefined,
      address:
        (typeof so['Address'] === 'string' && so['Address']) ||
        (typeof so['PostalAddress'] === 'string' && so['PostalAddress']) ||
        undefined,
      postcode:
        (typeof so['Postcode'] === 'string' && so['Postcode']) ||
        (typeof so['PostCode'] === 'string' && so['PostCode']) ||
        (typeof so['PostCodeText'] === 'string' && so['PostCodeText']) ||
        undefined,
      latitude:
        coords && typeof coords['Latitude'] !== 'undefined'
          ? Number(coords['Latitude'])
          : coords && typeof coords['lat'] !== 'undefined'
            ? Number(coords['lat'])
            : undefined,
      longitude:
        coords && typeof coords['Longitude'] !== 'undefined'
          ? Number(coords['Longitude'])
          : coords && typeof coords['lon'] !== 'undefined'
            ? Number(coords['lon'])
            : undefined,
      phone:
        (typeof so['Phone'] === 'string' && so['Phone']) ||
        (typeof so['Telephone'] === 'string' && so['Telephone']) ||
        undefined,
      website:
        (typeof so['Website'] === 'string' && so['Website']) ||
        (typeof so['Url'] === 'string' && so['Url']) ||
        undefined,
      facilities: facilities.length ? facilities : undefined,
      accessibility: accessibility.length ? accessibility : undefined,
    }

    return detail.name ? detail : null
  }

  // Simple search: if q looks like CRS (3 letters), attempt getStation; otherwise search cached all-stations list.
  async search(q: string, limit = 10): Promise<KBStationSummary[]> {
    const term = (q || '').trim()
    if (term.length === 3 && /^[a-zA-Z]{3}$/.test(term)) {
      const one = await this.getStation(term)
      return one ? [one] : []
    }
    const all = await this.getAllStations()
    const n = term.toLowerCase()
    return all
      .filter((s) => s.name.toLowerCase().includes(n) || s.code.toLowerCase().includes(n))
      .slice(0, Math.min(Math.max(limit, 1), 25))
  }

  private toSummaryFromUnknown(u: unknown): KBStationSummary | null {
    if (!u || typeof u !== 'object') return null
    const o = u as Record<string, unknown>
    const code =
      (typeof o['CrsCode'] === 'string' && o['CrsCode']) ||
      (typeof o['CRS'] === 'string' && o['CRS']) ||
      ''
    const name =
      (typeof o['Name'] === 'string' && o['Name']) ||
      (typeof o['StationName'] === 'string' && o['StationName']) ||
      ''
    const toc = (typeof o['Toc'] === 'string' && o['Toc']) || (typeof o['TOC'] === 'string' && o['TOC']) || undefined
    const tiploc =
      (typeof o['Tiploc'] === 'string' && o['Tiploc']) || (typeof o['TIPLOC'] === 'string' && o['TIPLOC']) || undefined
    const stanox =
      (typeof o['Stanox'] === 'string' && o['Stanox']) || (typeof o['STANOX'] === 'string' && o['STANOX']) || undefined

    if (!code || !name) return null
    return { code: String(code), name: String(name), toc: toc ? String(toc) : undefined, tiploc: tiploc ? String(tiploc) : undefined, stanox: stanox ? String(stanox) : undefined }
  }
}

let kbClient: KnowledgebaseClient | null = null
export function getKnowledgebaseClient(): KnowledgebaseClient {
  if (!kbClient) {
    const apiUrl = process.env.KNOWLEDGEBASE_API_URL || ''
    const apiKey = process.env.KNOWLEDGEBASE_API_KEY || ''
    const toc = process.env.KNOWLEDGEBASE_TOC || 'LE'
    kbClient = new KnowledgebaseClient({ apiUrl, apiKey, toc })
  }
  return kbClient
}