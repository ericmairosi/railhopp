'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface TrainUpdate {
  type: 'TRAIN_MOVEMENT' | 'TRAIN_DELAY' | 'SERVICE_UPDATE' | 'CONNECTION_STATUS';
  data: {
    trainId?: string;
    stationCrs?: string;
    delayMinutes?: number;
    eventType?: 'ARRIVAL' | 'DEPARTURE';
    platform?: string;
    status?: string;
    timestamp: string;
    message?: string;
  };
}

export interface UseRealTimeUpdatesOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseRealTimeUpdatesReturn {
  isConnected: boolean;
  isConnecting: boolean;
  updates: TrainUpdate[];
  latestUpdate: TrainUpdate | null;
  connectionStatus: string;
  connect: () => void;
  disconnect: () => void;
  subscribeToStation: (crs: string) => void;
  unsubscribeFromStation: (crs: string) => void;
  clearUpdates: () => void;
  sendPing: () => void;
}

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}): UseRealTimeUpdatesReturn {
  const {
    url = 'ws://localhost:3001',
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [updates, setUpdates] = useState<TrainUpdate[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<TrainUpdate | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setConnectionStatus('Connecting...');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to Railhopp real-time updates');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus('Connected');
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const update: TrainUpdate = JSON.parse(event.data);
          
          setLatestUpdate(update);
          setUpdates(prev => [...prev.slice(-99), update]); // Keep last 100 updates
          
          // Update connection status for status messages
          if (update.type === 'CONNECTION_STATUS' && update.data.message) {
            if (update.data.message.includes('Connected')) {
              setConnectionStatus('Connected');
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;

        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          setConnectionStatus(`Reconnecting... (${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, reconnectInterval);
        } else {
          setConnectionStatus('Disconnected');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
        setConnectionStatus('Connection Error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnecting(false);
      setConnectionStatus('Connection Failed');
    }
  }, [url, isConnecting, isConnected, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setConnectionStatus('Disconnected');
    reconnectAttempts.current = 0;
  }, []);

  const subscribeToStation = useCallback((crs: string) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'SUBSCRIBE_STATION',
        stationCrs: crs
      }));
    }
  }, [isConnected]);

  const unsubscribeFromStation = useCallback((crs: string) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'UNSUBSCRIBE_STATION',
        stationCrs: crs
      }));
    }
  }, [isConnected]);

  const sendPing = useCallback(() => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'PING'
      }));
    }
  }, [isConnected]);

  const clearUpdates = useCallback(() => {
    setUpdates([]);
    setLatestUpdate(null);
  }, []);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    updates,
    latestUpdate,
    connectionStatus,
    connect,
    disconnect,
    subscribeToStation,
    unsubscribeFromStation,
    clearUpdates,
    sendPing
  };
}
