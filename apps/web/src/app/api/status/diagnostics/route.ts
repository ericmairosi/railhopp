import { NextRequest, NextResponse } from 'next/server'
import { getMultiAPIAggregator } from '@/lib/services/multi-api-aggregator'

type DiagnosticsCounts = {
  attempted: number
  available: number
  enhanced: number
  failed: number
}

type DiagnosticsSummary = {
  counts: DiagnosticsCounts
  sources: {
    darwin: { attempted: boolean; available: boolean; failed: boolean }
    networkRail: { attempted: boolean; enhanced: boolean; failed: boolean }
    knowledgeStation: { attempted: boolean; enhanced: boolean; failed: boolean }
  }
}

// Returns the latest diagnostics snapshot from the last departures aggregation.
// Optional: ?summary=true to include a compact summary of attempted/available/enhanced/failed.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeSummary = searchParams.get('summary') === 'true'

    const aggregator = getMultiAPIAggregator()
    const diagnostics = aggregator.getLastDiagnostics()

    if (!diagnostics) {
      return NextResponse.json({
        success: true,
        diagnostics: null,
        summary: null,
        note: 'No diagnostics available yet. Trigger an aggregation via /api/unified/departures or /api/v2/departures first.',
        timestamp: new Date().toISOString(),
      })
    }

    let summary: DiagnosticsSummary | null = null
    if (includeSummary) {
      const perSource = {
        darwin: {
          attempted: diagnostics.darwin.attempted,
          available: diagnostics.darwin.available,
          failed: Boolean(diagnostics.darwin.error),
        },
        networkRail: {
          attempted: diagnostics.networkRail.attempted,
          enhanced: diagnostics.networkRail.enhanced,
          failed: Boolean(diagnostics.networkRail.error),
        },
        knowledgeStation: {
          attempted: diagnostics.knowledgeStation.attempted,
          enhanced: diagnostics.knowledgeStation.enhanced,
          failed: Boolean(diagnostics.knowledgeStation.error),
        },
      }

      const counts = {
        attempted:
          (perSource.darwin.attempted ? 1 : 0) +
          (perSource.networkRail.attempted ? 1 : 0) +
          (perSource.knowledgeStation.attempted ? 1 : 0),
        available: perSource.darwin.available ? 1 : 0,
        enhanced:
          (perSource.networkRail.enhanced ? 1 : 0) + (perSource.knowledgeStation.enhanced ? 1 : 0),
        failed:
          (perSource.darwin.failed ? 1 : 0) +
          (perSource.networkRail.failed ? 1 : 0) +
          (perSource.knowledgeStation.failed ? 1 : 0),
      }

      summary = { counts, sources: perSource }
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      summary,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Diagnostics API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DIAGNOSTICS_ERROR',
          message: 'Failed to retrieve diagnostics',
        },
      },
      { status: 500 }
    )
  }
}
