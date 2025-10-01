// Unified API route for combined Darwin, RTT.io, and Knowledge Station departure data
import { NextRequest, NextResponse } from 'next/server'
import { getMultiAPIAggregator } from '@/lib/services/multi-api-aggregator'
import { DarwinAPIError } from '@/lib/darwin/types'
import { RTTAPIError } from '@/lib/rtt/types'
import { KnowledgeStationAPIError } from '@/lib/knowledge-station/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crs = searchParams.get('crs')
    const numRows = searchParams.get('numRows')
    const filterCrs = searchParams.get('filterCrs')
    const filterType = searchParams.get('filterType')
    const includeStationInfo = searchParams.get('includeStationInfo') === 'true'
    const includeDisruptions = searchParams.get('includeDisruptions') === 'true'

    if (!crs) {
      return NextResponse.json({ error: 'Station CRS code is required' }, { status: 400 })
    }

    // Validate CRS code (should be 3 characters)
    if (crs.length !== 3) {
      return NextResponse.json({ error: 'CRS code must be exactly 3 characters' }, { status: 400 })
    }

    const aggregator = getMultiAPIAggregator()

    const aggregatedData = await aggregator.getDepartures({
      crs: crs.toUpperCase(),
      numRows: numRows ? parseInt(numRows) : 10,
      filterCrs: filterCrs || undefined,
      filterType: filterType as 'to' | 'from' | undefined,
      includeEnhancedData: includeStationInfo || includeDisruptions,
      includeHistoricalData: false,
      includeRealTimePosition: true,
    })

    return NextResponse.json({
      success: true,
      data: {
        stationName: aggregatedData.stationName,
        stationCode: aggregatedData.stationCode,
        departures: aggregatedData.departures,
        generatedAt: aggregatedData.generatedAt,
        dataSource: aggregatedData.dataSources.primary,
        enhancedSources: aggregatedData.dataSources.enhanced,
        failedSources: aggregatedData.dataSources.failed,
        dataQuality: aggregatedData.dataQuality,
        platformsAvailable: true,
      },
      metadata: aggregatedData.metadata,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Unified departures API error:', error)

    if (error instanceof DarwinAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            source: 'darwin',
            details: process.env.NODE_ENV === 'development' ? error.details : undefined,
          },
        },
        { status: error.code === 'NO_DATA' ? 404 : 500 }
      )
    }

    if (error instanceof KnowledgeStationAPIError) {
      // For Knowledge Station errors, try to continue with Darwin-only data
      console.warn('Knowledge Station error, continuing with Darwin only:', error)

      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            source: 'knowledge-station',
            details: process.env.NODE_ENV === 'development' ? error.details : undefined,
          },
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          source: 'unified',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      crs,
      numRows,
      filterCrs,
      filterType,
      timeOffset,
      timeWindow,
      includeStationInfo,
      includeDisruptions,
    } = body

    if (!crs) {
      return NextResponse.json({ error: 'Station CRS code is required' }, { status: 400 })
    }

    const aggregator = getMultiAPIAggregator()

    const aggregatedData = await aggregator.getDepartures({
      crs: crs.toUpperCase(),
      numRows: numRows || 10,
      filterCrs,
      filterType,
      timeOffset,
      timeWindow,
      includeEnhancedData: includeStationInfo || includeDisruptions,
      includeHistoricalData: false,
      includeRealTimePosition: true,
    })

    return NextResponse.json({
      success: true,
      data: {
        stationName: aggregatedData.stationName,
        stationCode: aggregatedData.stationCode,
        departures: aggregatedData.departures,
        generatedAt: aggregatedData.generatedAt,
        dataSource: aggregatedData.dataSources.primary,
        enhancedSources: aggregatedData.dataSources.enhanced,
        failedSources: aggregatedData.dataSources.failed,
        dataQuality: aggregatedData.dataQuality,
        platformsAvailable: true,
      },
      metadata: aggregatedData.metadata,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Unified departures POST error:', error)

    if (error instanceof DarwinAPIError || error instanceof KnowledgeStationAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            source: error instanceof DarwinAPIError ? 'darwin' : 'knowledge-station',
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
          source: 'unified',
        },
      },
      { status: 500 }
    )
  }
}
