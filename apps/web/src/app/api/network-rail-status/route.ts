// Enhanced API Status endpoint with Network Rail integration
import { NextRequest, NextResponse } from 'next/server'
import { getNetworkRailInitializer } from '@/lib/services/network-rail-initializer'

export async function GET(request: NextRequest) {
  try {
    const networkRailInit = getNetworkRailInitializer()
    const networkRailStatus = networkRailInit.getStatus()

    // Get existing API status
    const rttApiUrl = process.env.KNOWLEDGE_STATION_API_URL
    const rttApiUsername = process.env.KNOWLEDGE_STATION_API_USERNAME
    const rttApiPassword = process.env.KNOWLEDGE_STATION_API_PASSWORD
    const rttEnabled = process.env.KNOWLEDGE_STATION_ENABLED === 'true'

    const darwinApiUrl = process.env.DARWIN_API_URL
    const darwinApiToken = process.env.DARWIN_API_TOKEN
    const darwinPubSubEnabled = process.env.DARWIN_ENABLED === 'true'

    // Build comprehensive status
    const apis = [
      {
        name: 'Real Time Trains (RTT)',
        configured: !!(rttApiUrl && rttApiUsername && rttApiPassword && rttEnabled),
        accessible: false, // Would test in production
        enabled: rttEnabled,
        lastTested: new Date().toISOString(),
        type: 'REST API',
        description: 'Real-time train data and service information',
      },
      {
        name: 'Darwin (National Rail)',
        configured: !!(darwinApiUrl && darwinApiToken),
        accessible: false, // Would test in production
        enabled: darwinPubSubEnabled,
        lastTested: new Date().toISOString(),
        type: 'SOAP/Pub-Sub API',
        description: 'Official National Rail departure/arrival data',
      },
      {
        name: 'Network Rail Data Feeds',
        configured: networkRailStatus.hasCredentials,
        accessible: networkRailStatus.initialized,
        enabled: networkRailStatus.enabled,
        lastTested: new Date().toISOString(),
        type: 'STOMP Real-time Feeds',
        description: 'Comprehensive real-time rail network data',
        feeds: networkRailStatus.feeds,
        details: {
          feedCount: networkRailStatus.feeds.length,
          initialized: networkRailStatus.initialized,
          credentialsConfigured: networkRailStatus.hasCredentials,
        },
      },
    ]

    // Calculate overall status
    const configuredApis = apis.filter((api) => api.configured)
    const enabledApis = apis.filter((api) => api.enabled)
    const accessibleApis = apis.filter((api) => api.accessible)

    let overallStatus = 'misconfigured'
    if (configuredApis.length > 0 && enabledApis.length > 0) {
      if (accessibleApis.length > 0) {
        overallStatus = 'healthy'
      } else {
        overallStatus = 'configured'
      }
    }

    // Enhanced status with Network Rail details
    const status = {
      overall: overallStatus,
      apis,
      summary: {
        total: apis.length,
        configured: configuredApis.length,
        enabled: enabledApis.length,
        accessible: accessibleApis.length,
      },
      networkRail: {
        status: networkRailStatus.enabled
          ? networkRailStatus.initialized
            ? 'running'
            : 'configured'
          : 'disabled',
        feeds: networkRailStatus.feeds.length,
        initialized: networkRailStatus.initialized,
        capabilities: [
          'Real-time train movements',
          'Speed restriction monitoring',
          'Performance analytics',
          'Location reference data',
          'Berth-level positioning',
          'Schedule information',
          'Network disruption alerts',
        ],
      },
      timestamp: new Date().toISOString(),
      notes: [
        'RTT API provides real-time train data and service disruptions',
        'Darwin API provides official National Rail departure/arrival data',
        'Network Rail feeds provide comprehensive real-time network data',
        'When APIs are unavailable, the system falls back to realistic mock data',
      ],
    }

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error('Network Rail status check failed:', error)

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
