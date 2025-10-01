// Network Rail TSR (Temporary Speed Restrictions) API endpoint
import { NextRequest, NextResponse } from 'next/server'
import { getNetworkRailAggregator } from '@/lib/network-rail/feeds-aggregator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const route = searchParams.get('route')
    const stanox = searchParams.get('stanox')
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')
    const format = searchParams.get('format') || 'summary'

    const aggregator = getNetworkRailAggregator()
    const tsrClient = (aggregator as any).tsrClient // Access private member

    switch (format) {
      case 'summary':
        const summary = tsrClient.getTSRSummary()
        return NextResponse.json({
          success: true,
          data: summary,
          timestamp: new Date().toISOString(),
        })

      case 'active':
        let activeTSRs = tsrClient.getActiveTSRs()

        // Apply filters
        if (route) {
          activeTSRs = activeTSRs.filter((tsr: any) =>
            tsr.route.toLowerCase().includes(route.toLowerCase())
          )
        }

        if (stanox) {
          activeTSRs = tsrClient.getTSRsForStation(stanox)
        }

        if (severity) {
          activeTSRs = activeTSRs.filter(
            (tsr: any) => tsr.severity.toLowerCase() === severity.toLowerCase()
          )
        }

        if (type) {
          activeTSRs = activeTSRs.filter(
            (tsr: any) => tsr.type.toLowerCase() === type.toLowerCase()
          )
        }

        return NextResponse.json({
          success: true,
          data: {
            tsrs: activeTSRs,
            count: activeTSRs.length,
            filters: { route, stanox, severity, type },
          },
          timestamp: new Date().toISOString(),
        })

      case 'routes':
        const allTSRs = tsrClient.getActiveTSRs()
        const routeImpact = new Map()

        allTSRs.forEach((tsr: any) => {
          const existing = routeImpact.get(tsr.route) || { count: 0, tsrs: [] }
          routeImpact.set(tsr.route, {
            count: existing.count + 1,
            tsrs: [...existing.tsrs, tsr],
          })
        })

        const routes = Array.from(routeImpact.entries())
          .map(([route, data]: [string, any]) => ({
            route,
            restrictionCount: data.count,
            tsrs: data.tsrs,
            maxSeverity: Math.max(
              ...data.tsrs.map((t: any) => {
                switch (t.severity) {
                  case 'CRITICAL':
                    return 4
                  case 'HIGH':
                    return 3
                  case 'MEDIUM':
                    return 2
                  case 'LOW':
                    return 1
                  default:
                    return 0
                }
              })
            ),
          }))
          .sort((a, b) => b.maxSeverity - a.maxSeverity || b.restrictionCount - a.restrictionCount)

        return NextResponse.json({
          success: true,
          data: {
            routes: routes,
            totalRoutes: routes.length,
          },
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_FORMAT',
              message: 'Invalid format. Use: summary, active, or routes',
            },
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('TSR API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process TSR request',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
