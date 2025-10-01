// API status endpoint to test connectivity to external rail data APIs
import { NextRequest, NextResponse } from 'next/server'

interface ApiStatus {
  name: string
  configured: boolean
  accessible: boolean
  error?: string
  lastTested: string
}

export async function GET(request: NextRequest) {
  try {
    const results: ApiStatus[] = []

    // Test RTT (Real Time Trains) API
    const rttApiUrl = process.env.KNOWLEDGE_STATION_API_URL
    const rttApiUsername = process.env.KNOWLEDGE_STATION_API_USERNAME
    const rttApiPassword = process.env.KNOWLEDGE_STATION_API_PASSWORD
    const rttEnabled = process.env.KNOWLEDGE_STATION_ENABLED === 'true'

    const rttStatus: ApiStatus = {
      name: 'Real Time Trains (RTT)',
      configured: !!(rttApiUrl && rttApiUsername && rttApiPassword && rttEnabled),
      accessible: false,
      lastTested: new Date().toISOString(),
    }

    if (rttStatus.configured) {
      try {
        const authHeader = `Basic ${Buffer.from(`${rttApiUsername}:${rttApiPassword}`).toString('base64')}`
        const response = await fetch(`${rttApiUrl}/json/search/BMH`, {
          headers: {
            Authorization: authHeader,
            'User-Agent': 'Railhopp/1.0',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (response.ok) {
          rttStatus.accessible = true
        } else {
          const errorText = await response.text()
          rttStatus.error = `HTTP ${response.status}: ${response.statusText} - ${errorText.substring(0, 100)}`
        }
      } catch (error) {
        rttStatus.error = error instanceof Error ? error.message : 'Connection failed'
      }
    } else {
      rttStatus.error = 'Missing configuration (URL, username, password, or disabled)'
    }

    results.push(rttStatus)

    // Test Darwin API
    const darwinApiUrl = process.env.DARWIN_API_URL
    const darwinApiToken = process.env.DARWIN_API_TOKEN

    const darwinStatus: ApiStatus = {
      name: 'Darwin (National Rail)',
      configured: !!(darwinApiUrl && darwinApiToken),
      accessible: false,
      lastTested: new Date().toISOString(),
    }

    if (darwinStatus.configured) {
      // Darwin API uses SOAP, which is more complex to test
      // For now, we'll just mark it as configured but note the limitation
      darwinStatus.error = 'SOAP API - full testing not implemented yet'
    } else {
      darwinStatus.error = 'Missing configuration (URL or token)'
    }

    results.push(darwinStatus)

    // Calculate overall status
    const allConfigured = results.every((api) => api.configured)
    const anyAccessible = results.some((api) => api.accessible)
    const overallStatus =
      allConfigured && anyAccessible ? 'healthy' : allConfigured ? 'configured' : 'misconfigured'

    return NextResponse.json({
      success: true,
      data: {
        overall: overallStatus,
        apis: results,
        timestamp: new Date().toISOString(),
        notes: [
          'RTT API provides real-time train data and service disruptions',
          'Darwin API provides official National Rail departure/arrival data',
          'When APIs are unavailable, the system falls back to realistic mock data',
        ],
      },
    })
  } catch (error) {
    console.error('API status check failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'STATUS_CHECK_ERROR',
          message: 'Failed to check API status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
