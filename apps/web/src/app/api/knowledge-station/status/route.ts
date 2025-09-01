// API route for Knowledge Station service status
import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeStationClient } from '@/lib/knowledge-station/client';
import { getDarwinClient } from '@/lib/darwin/client';
import { DataSourceStatus } from '@/lib/knowledge-station/types';

export async function GET(request: NextRequest) {
  try {
    const knowledgeStation = getKnowledgeStationClient();
    const darwin = getDarwinClient();
    
    // Get status for both data sources
    const [knowledgeStationStatus, darwinAvailable] = await Promise.allSettled([
      knowledgeStation.getStatus(),
      darwin.testConnection()
    ]);

    const status: DataSourceStatus = {
      darwin: {
        available: darwinAvailable.status === 'fulfilled' ? darwinAvailable.value : false,
        lastCheck: new Date(),
        responseTime: darwinAvailable.status === 'fulfilled' ? undefined : undefined
      },
      knowledgeStation: knowledgeStationStatus.status === 'fulfilled' 
        ? knowledgeStationStatus.value 
        : {
            available: false,
            enabled: knowledgeStation.isEnabled(),
            lastCheck: new Date(),
            responseTime: undefined
          }
    };

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Knowledge Station status API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check service status'
        }
      },
      { status: 500 }
    );
  }
}
