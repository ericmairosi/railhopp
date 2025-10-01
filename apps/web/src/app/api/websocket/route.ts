import { NextRequest, NextResponse } from 'next/server'
import { getWebSocketManager } from '../../../lib/websocket/server'

export async function GET(request: NextRequest) {
  try {
    const wsManager = getWebSocketManager()
    const status = wsManager.getStatus()

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        message: status.running ? 'WebSocket server is running' : 'WebSocket server is stopped',
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('WebSocket status error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to get WebSocket status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    const wsManager = getWebSocketManager()

    switch (action) {
      case 'start':
        const port = body.port || 3001
        wsManager.start(undefined, port)
        return NextResponse.json({
          success: true,
          message: `WebSocket server started on port ${port}`,
          timestamp: new Date().toISOString(),
        })

      case 'stop':
        wsManager.stop()
        return NextResponse.json({
          success: true,
          message: 'WebSocket server stopped',
          timestamp: new Date().toISOString(),
        })

      case 'broadcast':
        const { messageType, trainId, stationCrs, delayMinutes, eventType, platform, message } =
          body

        switch (messageType) {
          case 'TRAIN_MOVEMENT':
            wsManager.broadcastTrainMovement(trainId, stationCrs, eventType, delayMinutes, platform)
            break
          case 'TRAIN_DELAY':
            wsManager.broadcastDelayAlert(trainId, stationCrs, delayMinutes)
            break
          case 'SERVICE_UPDATE':
            wsManager.broadcastServiceUpdate(message, stationCrs)
            break
          default:
            return NextResponse.json(
              {
                success: false,
                error: { message: 'Invalid message type' },
              },
              { status: 400 }
            )
        }

        return NextResponse.json({
          success: true,
          message: 'Message broadcasted successfully',
          timestamp: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Invalid action',
              validActions: ['start', 'stop', 'broadcast'],
            },
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('WebSocket action error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to execute WebSocket action',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
