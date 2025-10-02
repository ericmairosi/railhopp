import { NextResponse } from 'next/server'
import { getMultiAPIAggregator } from '@/lib/services/multi-api-aggregator'

export async function GET() {
  try {
    const aggregator = getMultiAPIAggregator()
    const status = await aggregator.getServiceStatus()
    const diagnostics = aggregator.getLastDiagnostics()

    return NextResponse.json({
      success: true,
      status,
      diagnostics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: 'Failed to retrieve service status',
        },
      },
      { status: 500 }
    )
  }
}
