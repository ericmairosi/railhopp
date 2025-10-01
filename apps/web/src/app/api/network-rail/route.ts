// Network Rail API endpoint - comprehensive feeds data
import { NextRequest, NextResponse } from 'next/server'
import { getNetworkRailAggregator } from '@/lib/network-rail/feeds-aggregator'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'status'
    const trainId = searchParams.get('trainId')
    const stanox = searchParams.get('stanox')
    const limit = parseInt(searchParams.get('limit') || '50')

    const aggregator = getNetworkRailAggregator()

    switch (type) {
      case 'status':
        const networkStatus = aggregator.getNetworkStatus()
        return NextResponse.json({
          success: true,
          data: networkStatus,
          timestamp: new Date().toISOString(),
        })

      case 'train':
        if (!trainId) {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'MISSING_TRAIN_ID', message: 'trainId parameter is required' },
            },
            { status: 400 }
          )
        }

        const trainData = aggregator.getTrainData(trainId)
        if (!trainData) {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'TRAIN_NOT_FOUND', message: `Train ${trainId} not found` },
            },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          data: trainData,
          timestamp: new Date().toISOString(),
        })

      case 'trains':
        const activeTrains = aggregator.getActiveTrains().slice(0, limit)
        return NextResponse.json({
          success: true,
          data: {
            trains: activeTrains,
            total: activeTrains.length,
            limit,
          },
          timestamp: new Date().toISOString(),
        })

      case 'station':
        if (!stanox) {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'MISSING_STANOX', message: 'stanox parameter is required' },
            },
            { status: 400 }
          )
        }

        const trainsAtStation = aggregator.getTrainsAtStation(stanox)
        return NextResponse.json({
          success: true,
          data: {
            stanox,
            trains: trainsAtStation,
            count: trainsAtStation.length,
          },
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TYPE',
              message: 'Invalid type. Use: status, train, trains, or station',
            },
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Network Rail API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process Network Rail request',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
