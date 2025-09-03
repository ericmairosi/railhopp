// API route for Darwin live departures
import { NextRequest, NextResponse } from 'next/server';
import { getDarwinClient } from '@/lib/darwin/client';
import { DarwinAPIError } from '@/lib/darwin/types';
import { generateMockStationBoard, shouldUseMockData } from '@/lib/darwin/mock';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const crs = searchParams.get('crs');
    const numRows = searchParams.get('numRows');
    const filterCrs = searchParams.get('filterCrs');
    const filterType = searchParams.get('filterType');

    if (!crs) {
      return NextResponse.json(
        { error: 'Station CRS code is required' },
        { status: 400 }
      );
    }

    // Validate CRS code (should be 3 characters)
    if (crs.length !== 3) {
      return NextResponse.json(
        { error: 'CRS code must be exactly 3 characters' },
        { status: 400 }
      );
    }

    // Check if we should use mock data
    if (shouldUseMockData()) {
      console.log(`Using mock data for station ${crs} - Darwin API not configured or disabled`);
      
      const mockData = generateMockStationBoard(
        crs.toUpperCase(),
        numRows ? parseInt(numRows) : 10
      );
      
      // Add a clear indicator that this is mock data
      mockData.messages = mockData.messages || [];
      mockData.messages.unshift({
        severity: 'info',
        message: 'This is sample data for demonstration purposes. Configure Darwin API for real-time information.',
        category: 'MOCK_DATA_NOTICE'
      });
      
      return NextResponse.json({
        success: true,
        data: mockData,
        timestamp: new Date().toISOString(),
        source: 'mock',
        message: 'Using mock data - Darwin API not configured',
        apiStatus: {
          configured: false,
          reason: 'Darwin API key not set or invalid'
        }
      });
    }

    const darwin = getDarwinClient();
    
    console.log(`Fetching real Darwin data for station ${crs}`);
    
    const departureBoard = await darwin.getStationBoard({
      crs: crs.toUpperCase(),
      numRows: numRows ? parseInt(numRows) : 10,
      filterCrs: filterCrs || undefined,
      filterType: filterType as 'to' | 'from' | undefined
    });
    
    console.log(`Successfully fetched Darwin data for ${crs}: ${departureBoard.departures.length} services`);

    return NextResponse.json({
      success: true,
      data: departureBoard,
      timestamp: new Date().toISOString(),
      source: 'darwin',
      apiStatus: {
        configured: true,
        working: true,
        servicesFound: departureBoard.departures.length
      }
    });

  } catch (error) {
    console.error('Darwin departures API error:', error);

    if (error instanceof DarwinAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.details : undefined
          }
        },
        { status: error.code === 'NO_DATA' ? 404 : 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { crs, numRows, filterCrs, filterType, timeOffset, timeWindow } = body;

    if (!crs) {
      return NextResponse.json(
        { error: 'Station CRS code is required' },
        { status: 400 }
      );
    }

    const darwin = getDarwinClient();
    
    const departureBoard = await darwin.getStationBoard({
      crs: crs.toUpperCase(),
      numRows: numRows || 10,
      filterCrs,
      filterType,
      timeOffset,
      timeWindow
    });

    return NextResponse.json({
      success: true,
      data: departureBoard,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Darwin departures POST error:', error);

    if (error instanceof DarwinAPIError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        }
      },
      { status: 500 }
    );
  }
}
