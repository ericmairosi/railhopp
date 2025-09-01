// API route for Knowledge Station disruption information
import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStationClient } from '@/lib/knowledge-station/client';
import { KnowledgeStationAPIError } from '@/lib/knowledge-station/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | null;
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');

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

    const disruptions = await knowledgeStation.getDisruptions({
      severity: severity || undefined,
      category: category || undefined,
      limit: limit ? parseInt(limit) : undefined
    });

    return NextResponse.json({
      success: true,
      data: disruptions,
      count: disruptions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Knowledge Station disruptions API error:', error);

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
    const { severity, category, limit, affectedServices } = body;

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

    const disruptions = await knowledgeStation.getDisruptions({
      severity,
      category,
      limit,
      affectedServices
    });

    return NextResponse.json({
      success: true,
      data: disruptions,
      count: disruptions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Knowledge Station disruptions POST error:', error);

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
