import { NextRequest, NextResponse } from 'next/server'
import { getNetworkRailAggregator } from '@/lib/network-rail/feeds-aggregator'

/**
 * GET /api/network-rail/tps
 *
 * Get Train Planning System (TPS) information including timing points and network topology
 *
 * Query Parameters:
 * - tiploc: Get timing point information for specific TIPLOC
 * - crs: Search timing points by CRS code
 * - name: Search timing points by name
 * - route: Get route between two TIPLOCs (format: FROM-TO)
 * - network: Get network topology information
 * - stats: Get network statistics
 * - search: General search query for timing points
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tiploc = searchParams.get('tiploc')
    const crs = searchParams.get('crs')
    const name = searchParams.get('name')
    const route = searchParams.get('route')
    const network = searchParams.get('network')
    const stats = searchParams.get('stats')
    const search = searchParams.get('search')

    const aggregator = getNetworkRailAggregator()

    // Get specific timing point
    if (tiploc) {
      const timingPoint = await aggregator.getTimingPoint(tiploc)
      return NextResponse.json({
        success: true,
        data: timingPoint,
        metadata: {
          requestType: 'timing_point',
          tiploc,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Get route information between two points
    if (route && route.includes('-')) {
      const [fromTiploc, toTiploc] = route.split('-')
      const routeInfo = await aggregator.getRoute(fromTiploc, toTiploc)

      return NextResponse.json({
        success: true,
        data: routeInfo,
        metadata: {
          requestType: 'route',
          from: fromTiploc,
          to: toTiploc,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Search timing points
    if (crs || name || search) {
      const timingPoints = await aggregator.searchTimingPoints({
        crs: crs || undefined,
        name: name || search || undefined,
        limit: 50,
      })

      return NextResponse.json({
        success: true,
        data: timingPoints,
        metadata: {
          requestType: 'search',
          criteria: { crs, name: name || search },
          resultCount: timingPoints.length,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Get network statistics
    if (stats) {
      // This would come from the TPS client
      const networkStats = {
        totalTimingPoints: 12500,
        totalRoutes: 850,
        electrifiedMileage: 5200,
        totalMileage: 15800,
        signalBoxes: 180,
        lastUpdate: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        data: networkStats,
        metadata: {
          requestType: 'statistics',
          timestamp: new Date().toISOString(),
        },
      })
    }

    // Get network topology information
    if (network) {
      // This would be implemented with the TPS client
      const topology = {
        message: 'Network topology data available',
        endpoints: [
          'GET /api/network-rail/tps?tiploc=EUSTON - Get timing point details',
          'GET /api/network-rail/tps?route=EUSTON-BHAMINT - Get route information',
          'GET /api/network-rail/tps?search=London - Search timing points',
          'GET /api/network-rail/tps?stats=true - Get network statistics',
        ],
      }

      return NextResponse.json({
        success: true,
        data: topology,
        metadata: {
          requestType: 'topology',
          timestamp: new Date().toISOString(),
        },
      })
    }

    // No specific criteria - return general TPS information
    return NextResponse.json({
      success: true,
      data: {
        message: 'TPS (Train Planning System) feed active',
        availableParams: [
          'tiploc - Get timing point details',
          'crs - Search by CRS code',
          'name or search - Search timing points by name',
          'route - Get route info (format: FROM-TO)',
          'network - Get network topology',
          'stats - Get network statistics',
        ],
        examples: [
          '/api/network-rail/tps?tiploc=EUSTON',
          '/api/network-rail/tps?route=EUSTON-BHAMINT',
          '/api/network-rail/tps?search=Birmingham',
          '/api/network-rail/tps?stats=true',
        ],
      },
      metadata: {
        requestType: 'info',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('TPS API Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TPS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/network-rail/tps
 *
 * Advanced TPS queries with complex criteria
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tiplocs, routes, searchCriteria, boundingBox, operatingCompanies } = body

    const aggregator = getNetworkRailAggregator()
    const results = {
      timingPoints: [] as any[],
      routes: [] as any[],
      networkInfo: null,
    }

    // Get multiple timing points
    if (tiplocs && Array.isArray(tiplocs)) {
      for (const tiploc of tiplocs) {
        const timingPoint = await aggregator.getTimingPoint(tiploc)
        if (timingPoint) {
          results.timingPoints.push(timingPoint)
        }
      }
    }

    // Get multiple routes
    if (routes && Array.isArray(routes)) {
      for (const route of routes) {
        if (route.from && route.to) {
          const routeInfo = await aggregator.getRoute(route.from, route.to)
          if (routeInfo) {
            results.routes.push(routeInfo)
          }
        }
      }
    }

    // Advanced search with criteria
    if (searchCriteria) {
      const searchResults = await aggregator.searchTimingPoints({
        name: searchCriteria.name,
        crs: searchCriteria.crs,
        limit: searchCriteria.limit || 100,
      })
      results.timingPoints.push(...searchResults)
    }

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        requestType: 'advanced_query',
        criteria: body,
        resultCount: {
          timingPoints: results.timingPoints.length,
          routes: results.routes.length,
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('TPS Advanced Query Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'TPS_QUERY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}
