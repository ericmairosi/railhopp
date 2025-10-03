#!/usr/bin/env node
/*
  Quick Knowledgebase connectivity test (RDM)
  - Loads env from apps/web/.env.local (when run from apps/web)
  - Fetches a small stations list for the configured TOC or tries station KGX
  - Masks secrets in output
*/

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const https = require('https')
const { XMLParser } = require('fast-xml-parser')

function mask(v) { if (!v) return 'MISSING'; const s = String(v); return s.length <= 6 ? '***' : s.slice(0,2) + '***' + s.slice(-2) }

async function fetchXml(url, apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'x-apikey': apiKey,
        'apikey': apiKey,
        'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Railhopp/KB-Test/1.0'
      },
      timeout: 15000,
    }, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}: ${data.slice(0,200)}`))
        }
        resolve(data)
      })
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(new Error('Request timeout')) })
    req.end()
  })
}

(async () => {
  const apiUrl = (process.env.KNOWLEDGEBASE_API_URL || '').trim()
  const apiKey = (process.env.KNOWLEDGEBASE_API_KEY || '').trim()
  const toc = (process.env.KNOWLEDGEBASE_TOC || 'LE').toUpperCase()

  console.log('🚉 Knowledgebase (RDM) connectivity check')
  console.log('-----------------------------------------')
  console.log('API URL:', apiUrl ? 'SET' : 'MISSING')
  console.log('API KEY:', apiKey ? mask(apiKey) : 'MISSING')
  console.log('TOC    :', toc)

  if (!apiUrl || !apiKey) {
    console.log('❌ Missing API URL or API KEY in env (.env.local). Aborting.')
    process.exit(1)
  }

  // Build a stations list URL for the TOC
  let listUrl = apiUrl.includes('{TOC}') ? apiUrl.replace('{TOC}', toc) : `${apiUrl.replace(/\/$/,'')}/4.0/stations-${toc}.xml`

  try {
    const xml = await fetchXml(listUrl, apiKey)
    const parser = new XMLParser({ ignoreAttributes: false })
    const json = parser.parse(xml)

    // Roughly count station-like entries
    let count = 0
    function collect(node) {
      if (!node || typeof node !== 'object') return
      for (const [k, v] of Object.entries(node)) {
        if (Array.isArray(v)) {
          const looksLike = v.some(x => x && typeof x === 'object' && (('CrsCode' in x) || ('CRS' in x) || ('StationName' in x) || ('Name' in x)))
          if (looksLike) count += v.length
        } else if (v && typeof v === 'object') {
          collect(v)
        }
      }
    }
    collect(json)

    console.log(`✅ Fetched stations list (approx ${count} entries) from ${listUrl}`)
    process.exit(0)
  } catch (e) {
    console.log('⚠️  Stations list fetch failed:', e.message)
    // Fallback: try a single station summary (KGX)
    try {
      const baseRoot = apiUrl.includes('/4.0/') ? apiUrl.slice(0, apiUrl.indexOf('/4.0/')) : apiUrl.replace(/\/$/,'')
      const oneUrl = `${baseRoot}/4.0/station-KGX.xml`
      const xml2 = await fetchXml(oneUrl, apiKey)
      const parser2 = new XMLParser({ ignoreAttributes: false })
      const json2 = parser2.parse(xml2)
      const hasKGX = JSON.stringify(json2).toLowerCase().includes('kgx')
      console.log(`✅ Single station fetch (${oneUrl}) ${hasKGX ? 'contains KGX' : ''}`)
      process.exit(0)
    } catch (e2) {
      console.log('❌ Single station fetch failed as well:', e2.message)
      process.exit(2)
    }
  }
})()
