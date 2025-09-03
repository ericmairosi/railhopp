// API route for Darwin service details
import { NextRequest, NextResponse } from 'next/server';
import { getDarwinClient } from '@/lib/darwin/client';
import { DarwinAPIError } from '@/lib/darwin/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params;

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      );
    }

    const darwin = getDarwinClient();
    
    const serviceDetails = await darwin.getServiceDetails(
      decodeURIComponent(serviceId)
    );

    return NextResponse.json({
      success: true,
      data: serviceDetails,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Darwin service details API error:', error);

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
