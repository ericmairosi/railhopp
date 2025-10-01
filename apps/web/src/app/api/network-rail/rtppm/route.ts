// Network Rail RTPPM (Real Time Public Performance Measure) API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { getNetworkRailAggregator } from '@/lib/network-rail/feeds-aggregator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'national'
    const operatorCode = searchParams.get('operator')
    const routeCode = searchParams.get('route')
    const stationCode = searchParams.get('station')
    const days = parseInt(searchParams.get('days') || '7')
    const limit = parseInt(searchParams.get('limit') || '20')

    const aggregator = getNetworkRailAggregator()
    const rtppmClient = (aggregator as any).rtppmClient // Access private member

    switch (type) {
      case 'national':
        const nationalPerformance = rtppmClient.getNationalPerformance()
        if (!nationalPerformance) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'NO_DATA',
                message: 'National performance data not available',
              },
            },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            performance: nationalPerformance,
            grade: nationalPerformance.grade,
            summary: {
              onTime: nationalPerformance.onTime,
              late: nationalPerformance.late,
              veryLate: nationalPerformance.veryLate,
              cancelled: nationalPerformance.cancelled,
              total: nationalPerformance.totalServices,
            },
          },
          timestamp: new Date().toISOString(),
        })

      case 'operators':
        const topPerformers = rtppmClient.getTopPerformers(limit)
        const worstPerformers = rtppmClient.getWorstPerformers(limit)

        return NextResponse.json({
          success: true,
          data: {
            topPerformers,
            worstPerformers,
            total: topPerformers.length + worstPerformers.length,
          },
          timestamp: new Date().toISOString(),
        })

      case 'operator':
        if (!operatorCode) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_OPERATOR',
                message: 'operator parameter is required',
              },
            },
            { status: 400 }
          )
        }

        const operatorPerformance = rtppmClient.getOperatorPerformance(operatorCode)
        if (!operatorPerformance) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'OPERATOR_NOT_FOUND',
                message: `Operator ${operatorCode} not found`,
              },
            },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: operatorPerformance,
          timestamp: new Date().toISOString(),
        })

      case 'route':
        if (!routeCode) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_ROUTE',
                message: 'route parameter is required',
              },
            },
            { status: 400 }
          )
        }

        const routePerformance = rtppmClient.getRoutePerformance(routeCode)
        if (!routePerformance) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'ROUTE_NOT_FOUND',
                message: `Route ${routeCode} not found`,
              },
            },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: routePerformance,
          timestamp: new Date().toISOString(),
        })

      case 'station':
        if (!stationCode) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'MISSING_STATION',
                message: 'station parameter is required',
              },
            },
            { status: 400 }
          )
        }

        const stationPerformance = rtppmClient.getStationPerformance(stationCode)
        if (!stationPerformance) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'STATION_NOT_FOUND',
                message: `Station ${stationCode} not found`,
              },
            },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: stationPerformance,
          timestamp: new Date().toISOString(),
        })

      case 'trends':
        const trends = rtppmClient.getPerformanceTrend(days)

        return NextResponse.json({
          success: true,
          data: {
            trends,
            period: {
              days,
              from: trends.dates[0] || null,
              to: trends.dates[trends.dates.length - 1] || null,
            },
          },
          timestamp: new Date().toISOString(),
        })

      case 'insights':
        const insights = rtppmClient.getPerformanceInsights()

        // Group insights by severity
        const groupedInsights = {
          critical: insights.filter((i: any) => i.severity === 'CRITICAL'),
          warning: insights.filter((i: any) => i.severity === 'WARNING'),
          info: insights.filter((i: any) => i.severity === 'INFO'),
        }

        return NextResponse.json({
          success: true,
          data: {
            insights: groupedInsights,
            summary: {
              total: insights.length,
              critical: groupedInsights.critical.length,
              warning: groupedInsights.warning.length,
              info: groupedInsights.info.length,
            },
          },
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TYPE',
              message:
                'Invalid type. Use: national, operators, operator, route, station, trends, or insights',
            },
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('RTPPM API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process RTPPM request',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
