// Minimal TIPLOC -> CRS map for major UK stations and some common locations
// Extend as needed or generate from CORPUS
import fs from 'fs'
import path from 'path'

let LOADED_MAP: Record<string, string> | null = null

function loadExternalMap(): Record<string, string> {
  if (LOADED_MAP) return LOADED_MAP
  try {
    const p = path.resolve(process.cwd(), 'data', 'tiploc-to-crs.json')
    const raw = fs.readFileSync(p, 'utf8')
    LOADED_MAP = JSON.parse(raw)
    return LOADED_MAP
  } catch {
    LOADED_MAP = null
    return {}
  }
}

export const TIPLOC_TO_CRS: Record<string, string> = {
  // Common mappings (extend later via CORPUS)
  // Direct 1:1 TIPLOC equals CRS
  KGX: 'KGX',
  PAD: 'PAD',
  VIC: 'VIC',
  WAT: 'WAT',
  EUS: 'EUS',
  LST: 'LST',
  MAN: 'MAN',
  BHM: 'BHM',
  LDS: 'LDS',
  EDB: 'EDB',
  GLC: 'GLC',
  BRI: 'BRI',
  NCL: 'NCL',
  SHF: 'SHF',
  NOT: 'NOT',
  LPL: 'LIV',
  // Known aliases observed in feed
  CRDFCEN: 'CDF',
  CARDIFFC: 'CDF',
  GLGQHL: 'GLQ',
  GLQ: 'GLQ',
  NEWHVNH: 'NHE',
  STPXI: 'STP',
  STP: 'STP',
  KNGX: 'KGX',
  EUSTON: 'EUS',
  LIVST: 'LIV',
  LIVERST: 'LIV',
  PADTON: 'PAD',
}

export function mapTiplocToCrs(tpl?: string): string | null {
  if (!tpl) return null
  const ext = loadExternalMap()
  const key = tpl.toUpperCase()
  return ext[key] || TIPLOC_TO_CRS[key] || null
}
