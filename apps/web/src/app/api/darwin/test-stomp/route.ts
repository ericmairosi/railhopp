import { NextRequest, NextResponse } from 'next/server'
import stompit from 'stompit'

function parseStompUrl(url: string): { host: string; port: number; ssl: boolean } {
  try {
    const m = url.match(/^(\w+):\/\/([^:]+):(\d+)/)
    if (m) {
      const scheme = m[1].toLowerCase()
      const host = m[2]
      const port = parseInt(m[3], 10)
      const ssl = scheme === 'ssl' || scheme === 'wss' || scheme === 'https'
      return { host, port, ssl }
    }
  } catch {}
  return { host: 'datafeeds.nationalrail.co.uk', port: 61613, ssl: true }
}

export async function GET(_request: NextRequest) {
  // Prefer explicit DARWIN_STOMP_URL, then DARWIN_QUEUE_URL, then default to 61617
  const stompUrl =
    process.env.DARWIN_STOMP_URL ||
    process.env.DARWIN_QUEUE_URL ||
    'ssl://datafeeds.nationalrail.co.uk:61617'
  const username = process.env.DARWIN_USERNAME || ''
  const password = process.env.DARWIN_PASSWORD || ''

  const { host, port, ssl } = parseStompUrl(stompUrl)

  if (!username || !password) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'DARWIN_USERNAME and DARWIN_PASSWORD are required for STOMP',
        },
        details: { host, port },
      },
      { status: 400 }
    )
  }

  const connectOptions: any = {
    host,
    port,
    ssl,
    connectHeaders: {
      login: username,
      passcode: password,
      'heart-beat': '15000,15000',
    },
  }

  const start = Date.now()
  try {
    const client: any = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CONNECT_TIMEOUT')), 15000)
      stompit.connect(connectOptions, (error: any, c: any) => {
        clearTimeout(timer)
        if (error) return reject(error)
        resolve(c)
      })
    })

    // Gracefully disconnect
    try {
      client.disconnect()
    } catch {}

    return NextResponse.json({
      success: true,
      status: 'CONNECTED',
      latencyMs: Date.now() - start,
      endpoint: { host, port },
    })
  } catch (error: any) {
    const msg = error?.message || String(error)
    const code = /timeout|ETIMEDOUT/i.test(msg) ? 'CONNECT_TIMEOUT' : 'CONNECT_ERROR'
    return NextResponse.json(
      {
        success: false,
        error: { code, message: msg },
        endpoint: { host, port },
      },
      { status: 502 }
    )
  }
}
