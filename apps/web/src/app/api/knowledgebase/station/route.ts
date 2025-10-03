import { NextRequest, NextResponse } from 'next/server'
import { getKnowledgebaseClient } from '@/lib/knowledgebase/client'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crs = (searchParams.get('crs') || '').trim()
    if (!/^[a-zA-Z]{3}$/.test(crs)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CRS', message: 'crs must be a 3-letter code' } },
        { status: 400 }
      )
    }

    const kb = getKnowledgebaseClient()
    if (!kb.isEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'SERVICE_DISABLED', message: 'Knowledgebase is not configured' },
        },
        { status: 503 }
      )
    }

    const details = await kb.getStationDetails(crs)
    if (!details) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Station not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: details, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Knowledgebase station detail error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch station details',
          details:
            process.env.NODE_ENV === 'development'
              ? String((error as Error)?.message || error)
              : undefined,
        },
      },
      { status: 500 }
    )
  }
}
