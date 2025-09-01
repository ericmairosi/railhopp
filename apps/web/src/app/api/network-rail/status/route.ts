import { NextRequest, NextResponse } from 'next/server';
import { getNetworkRailService } from '../../../../lib/services/network-rail-service';

export async function GET(request: NextRequest) {
  try {
    const networkRailService = getNetworkRailService();
    
    // Get comprehensive status
    const status = await networkRailService.getStatus();
    const dataSnapshot = networkRailService.getDataSnapshot();
    
    // Check environment configuration
    const hasCredentials = Boolean(
      process.env.NETWORK_RAIL_USERNAME && 
      process.env.NETWORK_RAIL_PASSWORD &&
      process.env.NETWORK_RAIL_USERNAME !== 'your_network_rail_username' &&
      process.env.NETWORK_RAIL_PASSWORD !== 'your_network_rail_password'
    );
    
    return NextResponse.json({
      success: true,
      data: {
        configured: hasCredentials,
        connectionStatus: dataSnapshot.connectionStatus,
        isRunning: status.isRunning,
        credentials: {
          hasUsername: Boolean(process.env.NETWORK_RAIL_USERNAME),
          hasPassword: Boolean(process.env.NETWORK_RAIL_PASSWORD),
          username: process.env.NETWORK_RAIL_USERNAME?.substring(0, 3) + '***' || 'not set'
        },
        feeds: status.feeds,
        performance: {
          responseTime: status.responseTime,
          dataAge: status.dataAge,
          lastUpdate: dataSnapshot.lastUpdate,
          messageCount: dataSnapshot.messageCount
        },
        health: {
          canConnect: hasCredentials,
          feedsActive: Object.values(status.feeds).some(active => active),
          dataFresh: status.dataAge < 300000, // Less than 5 minutes old
          overall: hasCredentials && status.isRunning && status.dataAge < 300000 ? 'healthy' : 'degraded'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Network Rail status error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Failed to get Network Rail status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    const networkRailService = getNetworkRailService();
    
    switch (action) {
      case 'start':
        await networkRailService.startRealTimeService();
        return NextResponse.json({
          success: true,
          message: 'Network Rail service started',
          timestamp: new Date().toISOString()
        });
        
      case 'stop':
        networkRailService.stopRealTimeService();
        return NextResponse.json({
          success: true,
          message: 'Network Rail service stopped',
          timestamp: new Date().toISOString()
        });
        
      case 'test':
        const connectionOk = await networkRailService.testConnection();
        return NextResponse.json({
          success: true,
          data: {
            connectionTest: connectionOk,
            message: connectionOk ? 'Connection test passed' : 'Connection test failed'
          },
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: {
            message: 'Invalid action',
            validActions: ['start', 'stop', 'test']
          }
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Network Rail action error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: 'Failed to execute Network Rail action',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}
