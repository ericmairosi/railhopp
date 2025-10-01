import { NextRequest, NextResponse } from 'next/server'
import { getNetworkRailAggregator } from '@/lib/network-rail/feeds-aggregator'

/**
 * GET /api/network-rail/schedule
 *
 * Get train schedule information from Network Rail SCHEDULE feed
 *
 * Query Parameters:
 * - trainUid: Train unique identifier
 * - headcode: Train headcode
 * - operator: Operating company code
 * - origin: Origin station CRS/TIPLOC
 * - destination: Destination station CRS/TIPLOC
 * - departureTime: Departure time filter
 * - date: Schedule date (YYYY-MM-DD)
 * - search: General search query
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trainUid = searchParams.get('trainUid')
    const headcode = searchParams.get('headcode')
    const operator = searchParams.get('operator')
    const origin = searchParams.get('origin')
    const destination = searchParams.get('destination')
    const departureTime = searchParams.get('departureTime')
    const date = searchParams.get('date')
    const search = searchParams.get('search')

    const aggregator = getNetworkRailAggregator()

    // If specific train UID requested, get that schedule
    if (trainUid) {
      const schedule = await aggregator.getTrainSchedule(trainUid)
      return NextResponse.json({
        success: true,
        data: schedule,
        metadata: {
          requestType: 'schedule',
          trainUid,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // If search criteria provided, search schedules
    if (origin || destination || operator || departureTime || search) {
      const schedules = await aggregator.searchSchedules({
        origin: origin || undefined,
        destination: destination || undefined,
        operator: operator || undefined,
        departureTime: departureTime || undefined,
      })

      return NextResponse.json({
        success: true,
        data: schedules,
        metadata: {
          requestType: 'search',
          criteria: { origin, destination, operator, departureTime },
          resultCount: schedules.length,
          timestamp: new Date().toISOString(),
        },
      })
    }

    // No specific criteria - return general schedule information
    return NextResponse.json({
      success: true,
      data: {
        message: 'SCHEDULE feed active',
        availableParams: [
          'trainUid - Get specific train schedule',
          'origin + destination - Search routes',
          'operator - Filter by operator',
          'departureTime - Filter by departure time',
        ],
      },
      metadata: {
        requestType: 'info',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('SCHEDULE API Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SCHEDULE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/network-rail/schedule
 *
 * Advanced schedule search with complex criteria
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trainUids, operators, routes, timeWindows, daysOfWeek, trainCategories } = body

    const aggregator = getNetworkRailAggregator()

    // This would implement more complex search logic
    const results = []

    if (trainUids && Array.isArray(trainUids)) {
      for (const uid of trainUids) {
        const schedule = await aggregator.getTrainSchedule(uid)
        if (schedule && schedule.length > 0) {
          results.push(...schedule)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      metadata: {
        requestType: 'advanced_search',
        criteria: body,
        resultCount: results.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('SCHEDULE Advanced Search Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SCHEDULE_SEARCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    )
  }
}
