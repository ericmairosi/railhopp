// Enhanced Departures API v2 - Multi-source data aggregation
// Combines Darwin, Network Rail, Knowledge Station, and National Rail APIs
// Provides comprehensive real-time rail information

import { NextRequest, NextResponse } from 'next/server'
import { getMultiAPIAggregator } from '@/lib/services/multi-api-aggregator'
import { DarwinAPIError } from '@/lib/darwin/types'
import { NetworkRailAPIError } from '@/lib/network-rail/types'
import { KnowledgeStationAPIError } from '@/lib/knowledge-station/types'
import { NationalRailAPIError } from '@/lib/national-rail/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const crs = searchParams.get('crs')
    const numRows = searchParams.get('numRows')
    const filterCrs = searchParams.get('filterCrs')
    const filterType = searchParams.get('filterType')
    const includeRealTimePosition = searchParams.get('includeRealTimePosition') === 'true'
    const includeEnhancedData = searchParams.get('includeEnhancedData') === 'true'
    const includeDisruptions = searchParams.get('includeDisruptions') === 'true'
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true'

    if (!crs) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Station CRS code is required',
            details: 'Please provide a valid 3-letter CRS code (e.g., KGX, PAD, LIV)',
          },
        },
        { status: 400 }
      )
    }

    // Validate CRS code format
    if (!/^[A-Z]{3}$/.test(crs.toUpperCase())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CRS_FORMAT',
            message: 'CRS code must be exactly 3 uppercase letters',
            details: `Received: "${crs}". Expected format: "KGX", "PAD", "LIV"`,
          },
        },
        { status: 400 }
      )
    }

    const aggregator = getMultiAPIAggregator()

    // Build comprehensive request based on query parameters
    const aggregatedData = await aggregator.getDepartures({
      crs: crs.toUpperCase(),
      numRows: numRows ? parseInt(numRows) : 10,
      filterCrs: filterCrs?.toUpperCase(),
      filterType: filterType as 'to' | 'from' | undefined,
      includeEnhancedData: includeEnhancedData || includeDisruptions,
      includeRealTimePosition: includeRealTimePosition,
      includeHistoricalData: includeAnalytics,
    })

    // Enhanced response with comprehensive metadata
    const response = {
      success: true,
      data: {
        // Core departure board data
        station: {
          name: aggregatedData.stationName,
          code: aggregatedData.stationCode,
          info: aggregatedData.stationInfo,
        },
        departures: aggregatedData.departures.map((departure) => ({
          // Core departure info
          serviceId: departure.serviceID,
          operator: {
            name: departure.operator,
            code: departure.operatorCode,
          },
          destination: departure.destination,
          scheduledTime: departure.std,
          estimatedTime: departure.etd,
          platform: departure.platform,
          status: departure.serviceType,

          // Enhanced real-time data
          realTime: departure.realTimePosition
            ? {
                position: departure.realTimePosition,
                movements: departure.movements?.slice(-5), // Last 5 movements
                confidence: departure.dataQuality.confidence,
              }
            : null,

          // Data quality indicators
          dataQuality: {
            confidence: departure.dataQuality.confidence,
            sources: {
              darwin: departure.dataQuality.darwinFresh,
              networkRail: departure.dataQuality.networkRailFresh,
              knowledgeStation: departure.dataQuality.knowledgeStationFresh,
            },
          },
        })),

        // Station facilities and accessibility
        facilities: aggregatedData.stationInfo
          ? {
              accessibility: aggregatedData.stationInfo.accessibility,
              facilities: aggregatedData.stationInfo.facilities,
              contacts: aggregatedData.stationInfo.contacts,
            }
          : null,

        // Current disruptions affecting this station
        disruptions:
          aggregatedData.disruptions?.map((disruption) => ({
            id: disruption.id,
            title: disruption.title,
            severity: disruption.severity,
            status: disruption.status,
            description: disruption.description,
            affectedRoutes: disruption.impact.routes,
            alternativeArrangements: disruption.alternativeArrangements,
          })) || [],

        // Data source transparency
        dataSources: {
          primary: aggregatedData.dataSources.primary,
          enhanced: aggregatedData.dataSources.enhanced,
          failed: aggregatedData.dataSources.failed,
        },

        // Quality metrics
        quality: {
          overall: aggregatedData.dataQuality.overall,
          realTimeAccuracy: aggregatedData.dataQuality.realTimeAccuracy,
          completeness: aggregatedData.dataQuality.completeness,
        },

        // Metadata
        generatedAt: aggregatedData.generatedAt,
        cacheHit: aggregatedData.metadata.cacheHit,
        processingTime: aggregatedData.metadata.processingTime,
      },

      // API usage information
      apiUsage: {
        callsUsed: aggregatedData.metadata.apiCallsUsed,
        cachingEnabled: true,
        dataFreshness: aggregatedData.metadata.cacheHit ? 'cached' : 'fresh',
      },

      timestamp: new Date().toISOString(),
      version: '2.0',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Enhanced departures API error:', error)

    // Handle specific API errors with appropriate responses
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
          fallbackSuggestion: 'Try using basic departure information without enhancements',
        },
        { status: error.code === 'NO_DATA' ? 404 : 500 }
      )
    }

    if (error instanceof NetworkRailAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            source: 'network-rail',
            details: process.env.NODE_ENV === 'development' ? error.details : undefined,
          },
          fallbackSuggestion: 'Real-time position data may not be available',
        },
        { status: 503 }
      )
    }

    if (error instanceof KnowledgeStationAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            source: 'knowledge-station',
            details: process.env.NODE_ENV === 'development' ? error.details : undefined,
          },
          fallbackSuggestion: 'Enhanced station information may not be available',
        },
        { status: 503 }
      )
    }

    if (error instanceof NationalRailAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            source: 'national-rail',
            details: process.env.NODE_ENV === 'development' ? error.details : undefined,
          },
          fallbackSuggestion: 'Disruption information may not be available',
        },
        { status: 503 }
      )
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while aggregating rail data',
          source: 'aggregator',
        },
        fallbackSuggestion: 'Try reducing the scope of data requested or contact support',
      },
      { status: 500 }
    )
  }
}

// OPTIONS method for CORS support
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
