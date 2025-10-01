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

  private extractStations(raw: any): any[] {
    if (!raw || typeof raw !== 'object') return []
    // Common shapes
    const candidates = [
      raw?.Stations?.Station,
      raw?.stations?.station,
      raw?.StationList?.Station,
      raw?.StationsList?.Station,
      raw?.ArrayOfStation?.Station,
      raw?.Stations,
      raw?.stations,
    ].filter(Boolean)

    for (const c of candidates) {
      if (Array.isArray(c)) return c
      if (c && typeof c === 'object' && Array.isArray((c as any).Station)) return (c as any).Station
    }

    // Fallback: deep scan for arrays of station-like objects
    const result: any[] = []
    const stack = [raw]
    while (stack.length) {
      const node = stack.pop()
      if (!node || typeof node !== 'object') continue
      for (const [k, v] of Object.entries(node)) {
        if (Array.isArray(v)) {
          const looksLikeStations = v.some(
            (x) => x && typeof x === 'object' && (('CrsCode' in x) || ('CRS' in x) || ('StationName' in x) || ('Name' in x))
          )
          if (looksLikeStations) {
            result.push(...(v as any[]))
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

  private async fetchXml(fullOrPath: string): Promise<any> {
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
        const items: KBStationSummary[] = stations.map((s: any) => ({
          code: s?.CrsCode || s?.CRS || '',
          name: s?.Name || s?.StationName || '',
          toc: s?.Toc || s?.TOC,
          tiploc: s?.Tiploc || s?.TIPLOC,
          stanox: s?.Stanox || s?.STANOX,
        })).filter((x) => x.code && x.name)
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
    let json: any
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
    const s = json?.Station || json?.Stations?.Station
    if (!s) return null

    const facilities: string[] = []
    const accessibility: string[] = []

    const pushArray = (arr: any, target: string[]) => {
      if (!arr) return
      if (Array.isArray(arr)) arr.forEach((x) => x && target.push(String(x).trim()))
      else target.push(String(arr).trim())
    }

    // Attempt to collect facilities/accessibility from common keys
    const facRoot = s.Facilities || s.facilities || s.StationFacilities
    if (facRoot) {
      pushArray(facRoot.Facility || facRoot.List || facRoot.Item, facilities)
    }
    const accRoot = s.Accessibility || s.accessibility || s.StationAccessibility
    if (accRoot) {
      pushArray(accRoot.Feature || accRoot.List || accRoot.Item, accessibility)
    }

    const coords = s.Coordinates || s.Location || {}

    const detail: KBStationDetail = {
      code: s?.CrsCode || s?.CRS || crs.toUpperCase(),
      name: s?.Name || s?.StationName || '',
      toc: s?.Toc || s?.TOC,
      tiploc: s?.Tiploc || s?.TIPLOC,
      stanox: s?.Stanox || s?.STANOX,
      address: s?.Address || s?.PostalAddress || undefined,
      postcode: s?.Postcode || s?.PostCode || s?.PostCodeText || undefined,
      latitude: coords?.Latitude ? Number(coords.Latitude) : coords?.lat ? Number(coords.lat) : undefined,
      longitude: coords?.Longitude ? Number(coords.Longitude) : coords?.lon ? Number(coords.lon) : undefined,
      phone: s?.Phone || s?.Telephone || undefined,
      website: s?.Website || s?.Url || undefined,
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