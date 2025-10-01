import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'not_configured', // Update when you add a database
        apis: {
          darwin:
            process.env.DARWIN_ENABLED === 'true' ||
            !!process.env.DARWIN_STOMP_URL ||
            !!process.env.DARWIN_API_TOKEN ||
            !!process.env.DARWIN_API_URL
              ? 'configured'
              : 'not_configured',
          rtt: process.env.RTT_API_KEY ? 'configured' : 'not_configured',
          knowledgeStation: process.env.KNOWLEDGE_STATION_API_KEY ? 'configured' : 'not_configured',
        },
      },
    }

    return NextResponse.json(healthStatus, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support HEAD requests for simple health checks
export async function HEAD() {
  try {
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}
