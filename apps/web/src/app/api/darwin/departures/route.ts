// API route for Darwin live departures
import { NextRequest, NextResponse } from 'next/server'
import { getDarwinClient } from '@/lib/darwin/client'
import { DarwinAPIError } from '@/lib/darwin/types'
import apiCache, { generateCacheKey } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crs = searchParams.get('crs')?.trim().toUpperCase()
    const numRows = searchParams.get('numRows')
    const filterCrs = searchParams.get('filterCrs')?.trim().toUpperCase()
    const filterType = searchParams.get('filterType') as 'to' | 'from' | undefined

    if (!crs) {
      return NextResponse.json({ error: 'Station CRS code is required' }, { status: 400 })
    }

    // Validate CRS code (should be 3 characters and alphanumeric)
    if (crs.length !== 3 || !/^[A-Z]{3}$/.test(crs)) {
      return NextResponse.json(
        { error: 'CRS code must be exactly 3 uppercase letters' },
        { status: 400 }
      )
    }

    // Validate numRows if provided
    if (numRows && (isNaN(parseInt(numRows)) || parseInt(numRows) < 1 || parseInt(numRows) > 50)) {
      return NextResponse.json({ error: 'numRows must be between 1 and 50' }, { status: 400 })
    }

    // Validate filterType if provided
    if (filterType && !['to', 'from'].includes(filterType)) {
      return NextResponse.json(
        { error: 'filterType must be either "to" or "from"' },
        { status: 400 }
      )
    }

    // Generate cache key
    const cacheKey = generateCacheKey.departures(
      crs,
      numRows ? parseInt(numRows) : 10,
      filterCrs,
      filterType
    )

    // Check cache first (30 second TTL for live data)
    const cachedData = apiCache.get(cacheKey)
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString(),
      })
    }

    const darwin = getDarwinClient()

    // Check if any Darwin service is configured
    if (!darwin.isEnabled()) {
      console.log(`Darwin APIs not configured for station ${crs}`)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'API_NOT_CONFIGURED',
            message: 'Darwin real-time APIs are not configured',
            details: {
              requiredEnv: ['DARWIN_ENABLED', 'DARWIN_USERNAME', 'DARWIN_PASSWORD', 'DARWIN_QUEUE_URL'],
            },
          },
        },
        { status: 503 }
      )
    }

    console.log(`Fetching real Darwin data for station ${crs}`)

    const departureBoard = await darwin.getStationBoard({
      crs: crs.toUpperCase(),
      numRows: numRows ? parseInt(numRows) : 10,
      filterCrs: filterCrs || undefined,
      filterType: (filterType as 'to' | 'from') || undefined,
    })

    console.log(
      `Successfully fetched Darwin data for ${crs}: ${departureBoard.departures.length} services`
    )

    const responseData = {
      success: true,
      data: departureBoard,
      timestamp: new Date().toISOString(),
      source: 'darwin-live',
      dataType: 'LIVE' as const,
      apiStatus: {
        configured: true,
        working: true,
        servicesFound: departureBoard.departures.length,
        note: 'Live data from Darwin API',
      },
    }

    // Cache the successful response, TTL configurable via env
    const ttl = parseInt(process.env.DARWIN_DEPARTURES_CACHE_TTL_SECONDS || '30', 10)
    apiCache.set(cacheKey, responseData, isNaN(ttl) ? 30 : ttl)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Darwin departures API error:', error)

    // Extract CRS and numRows from the original request context
    const { searchParams } = new URL(request.url)
    const fallbackCrs = searchParams.get('crs')?.trim().toUpperCase()
    const fallbackNumRows = searchParams.get('numRows')

    // Do not fall back to mock data. Return a clear error with guidance.
    // This follows the rule to avoid mock data when real APIs fail.
    

    if (error instanceof DarwinAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.details : undefined,
          },
        },
        { status: error.code === 'NO_DATA' ? 404 : 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { crs, numRows, filterCrs, filterType, timeOffset, timeWindow } = body

    if (!crs) {
      return NextResponse.json({ error: 'Station CRS code is required' }, { status: 400 })
    }

    const darwin = getDarwinClient()

    const departureBoard = await darwin.getStationBoard({
      crs: crs.toUpperCase(),
      numRows: numRows || 10,
      filterCrs,
      filterType,
      timeOffset,
      timeWindow,
    })

    return NextResponse.json({
      success: true,
      data: departureBoard,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Darwin departures POST error:', error)

    if (error instanceof DarwinAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
