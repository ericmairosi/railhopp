// API route for Knowledge Station enhanced station information
import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStationClient } from '@/lib/knowledge-station/client';
import { KnowledgeStationAPIError } from '@/lib/knowledge-station/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const crs = searchParams.get('crs');
    const includeServices = searchParams.get('includeServices') === 'true';
    const includeDisruptions = searchParams.get('includeDisruptions') === 'true';

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

    const knowledgeStation = getKnowledgeStationClient();
    
    // Check if Knowledge Station is enabled
    if (!knowledgeStation.isEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_DISABLED',
            message: 'Knowledge Station service is not enabled or configured'
          }
        },
        { status: 503 }
      );
    }

    const stationInfo = await knowledgeStation.getStationInfo({
      crs: crs.toUpperCase(),
      includeServices,
      includeDisruptions
    });

    return NextResponse.json({
      success: true,
      data: stationInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Knowledge Station station info API error:', error);

    if (error instanceof KnowledgeStationAPIError) {
      const statusCode = error.code === 'NOT_ENABLED' ? 503 : 
                        error.code === 'NO_DATA' ? 404 : 500;
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.details : undefined
          }
        },
        { status: statusCode }
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
    const { crs, includeServices, includeDisruptions } = body;

    if (!crs) {
      return NextResponse.json(
        { error: 'Station CRS code is required' },
        { status: 400 }
      );
    }

    const knowledgeStation = getKnowledgeStationClient();
    
    if (!knowledgeStation.isEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_DISABLED',
            message: 'Knowledge Station service is not enabled or configured'
          }
        },
        { status: 503 }
      );
    }

    const stationInfo = await knowledgeStation.getStationInfo({
      crs: crs.toUpperCase(),
      includeServices,
      includeDisruptions
    });

    return NextResponse.json({
      success: true,
      data: stationInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Knowledge Station station info POST error:', error);

    if (error instanceof KnowledgeStationAPIError) {
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
