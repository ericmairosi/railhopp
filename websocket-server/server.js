#!/usr/bin/env node

/**
 * Production WebSocket Server for Railhopp
 * Handles real-time train updates and Network Rail integration
 */

const { WebSocketServer } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'production';

console.log('🚂 Starting Railhopp WebSocket Server');
console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`🔌 Port: ${PORT}`);

class ProductionWebSocketServer {
  constructor() {
    this.clients = new Set();
    this.networkRailClient = null;
    this.isNetworkRailConnected = false;
    this.messageCount = 0;
    this.startTime = Date.now();
    
    // Station mapping for STANOX to CRS conversion
    this.stationMapping = new Map([
      ['87701', { crs: 'KGX', name: 'London Kings Cross' }],
      ['87700', { crs: 'PAD', name: 'London Paddington' }],
      ['88641', { crs: 'VIC', name: 'London Victoria' }],
      ['88646', { crs: 'WAT', name: 'London Waterloo' }],
      ['88518', { crs: 'LIV', name: 'Liverpool Street' }],
      ['54100', { crs: 'MAN', name: 'Manchester Piccadilly' }],
      ['68269', { crs: 'BHM', name: 'Birmingham New Street' }]
    ]);
  }

  /**
   * Start the WebSocket server
   */
  start() {
    // Create HTTP server for health checks
    this.httpServer = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          uptime: Date.now() - this.startTime,
          clients: this.clients.size,
          networkRail: this.isNetworkRailConnected,
          messages: this.messageCount,
          timestamp: new Date().toISOString()
        }));
        return;
      }

      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Railhopp WebSocket Server - Live UK Rail Data');
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      server: this.httpServer,
      clientTracking: false 
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    // Start HTTP server
    this.httpServer.listen(PORT, () => {
      console.log(`✅ WebSocket server running on port ${PORT}`);
      console.log(`🌍 Health check: http://localhost:${PORT}/health`);
    });

    // Initialize Network Rail connection
    this.initializeNetworkRail();

    // Graceful shutdown
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  /**
   * Handle new WebSocket connections
   */
  handleConnection(ws, req) {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔌 Client connected: ${clientId} (${this.clients.size + 1} total)`);

    this.clients.add(ws);
    ws._clientId = clientId;
    ws._subscribedStations = new Set();

    // Send welcome message
    this.sendToClient(ws, {
      type: 'CONNECTION_STATUS',
      data: {
        message: 'Connected to Railhopp live updates',
        networkRailStatus: this.isNetworkRailConnected ? 'connected' : 'connecting',
        timestamp: new Date().toISOString()
      }
    });

    // Handle messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleClientMessage(ws, data);
      } catch (error) {
        console.error(`Error parsing message from ${clientId}:`, error);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      console.log(`🔌 Client disconnected: ${clientId} (${this.clients.size - 1} remaining)`);
      this.clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle client messages
   */
  handleClientMessage(ws, data) {
    switch (data.type) {
      case 'SUBSCRIBE_STATION':
        if (data.stationCrs) {
          ws._subscribedStations.add(data.stationCrs);
          console.log(`📍 ${ws._clientId} subscribed to ${data.stationCrs}`);
        }
        break;

      case 'UNSUBSCRIBE_STATION':
        if (data.stationCrs) {
          ws._subscribedStations.delete(data.stationCrs);
          console.log(`📍 ${ws._clientId} unsubscribed from ${data.stationCrs}`);
        }
        break;

      case 'PING':
        this.sendToClient(ws, {
          type: 'CONNECTION_STATUS',
          data: {
            message: 'pong',
            timestamp: new Date().toISOString()
          }
        });
        break;

      default:
        console.log(`Unknown message type from ${ws._clientId}: ${data.type}`);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(client, message) {
    if (client.readyState === client.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message to client:', error);
      }
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message, stationFilter = null) {
    if (this.clients.size === 0) return;

    const messageStr = JSON.stringify(message);
    const activeClients = new Set();

    this.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        // Apply station filter if specified
        if (stationFilter && !client._subscribedStations.has(stationFilter)) {
          activeClients.add(client);
          return;
        }

        try {
          client.send(messageStr);
          activeClients.add(client);
        } catch (error) {
          console.error('Error broadcasting to client:', error);
        }
      }
    });

    this.clients = activeClients;
  }

  /**
   * Initialize Network Rail connection
   */
  async initializeNetworkRail() {
    const username = process.env.NETWORK_RAIL_USERNAME;
    const password = process.env.NETWORK_RAIL_PASSWORD;

    if (!username || !password) {
      console.log('⚠️  Network Rail credentials not configured - using simulation mode');
      this.startSimulationMode();
      return;
    }

    try {
      console.log('🚂 Connecting to Network Rail STOMP feeds...');
      const stompit = require('stompit');

      const connectOptions = {
        host: 'datafeeds.networkrail.co.uk',
        port: 61618,
        connectHeaders: {
          'host': '/',
          'login': username,
          'passcode': password,
          'heart-beat': '5000,5000'
        }
      };

      this.networkRailClient = await new Promise((resolve, reject) => {
        stompit.connect(connectOptions, (error, client) => {
          if (error) {
            console.error('❌ Network Rail connection failed:', error.message);
            reject(error);
            return;
          }
          resolve(client);
        });
      });

      console.log('✅ Connected to Network Rail!');
      this.isNetworkRailConnected = true;

      // Subscribe to train movements
      this.networkRailClient.subscribe(
        { destination: '/topic/TRAIN_MVT_ALL_TOC', ack: 'client-individual' },
        (error, message) => {
          if (error) {
            console.error('Network Rail subscription error:', error);
            return;
          }

          message.readString('utf-8', (readError, body) => {
            if (!readError && body) {
              try {
                const movements = JSON.parse(body);
                movements.forEach(msg => {
                  if (msg.body) {
                    this.processTrainMovement(msg.body);
                  }
                });
              } catch (parseError) {
                console.error('Error parsing Network Rail data:', parseError);
              }
            }
          });
        }
      );

      // Broadcast connection status
      this.broadcast({
        type: 'CONNECTION_STATUS',
        data: {
          message: 'Network Rail live data connected',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Failed to connect to Network Rail:', error);
      console.log('🤖 Starting simulation mode...');
      this.startSimulationMode();
    }
  }

  /**
   * Process Network Rail train movement
   */
  processTrainMovement(movement) {
    if (!movement.train_id || !movement.loc_stanox) return;

    const station = this.stationMapping.get(movement.loc_stanox);
    if (!station) return; // Only process known stations

    const delayMinutes = Math.floor(parseInt(movement.timetable_variation || '0') / 60);
    this.messageCount++;

    // Broadcast train movement
    this.broadcast({
      type: 'TRAIN_MOVEMENT',
      data: {
        trainId: movement.train_id,
        stationCrs: station.crs,
        eventType: movement.event_type,
        delayMinutes,
        platform: movement.platform,
        status: delayMinutes > 5 ? 'DELAYED' : 'ON_TIME',
        timestamp: new Date().toISOString()
      }
    }, station.crs);

    // Broadcast delay alerts for significant delays
    if (delayMinutes > 5) {
      this.broadcast({
        type: 'TRAIN_DELAY',
        data: {
          trainId: movement.train_id,
          stationCrs: station.crs,
          delayMinutes,
          timestamp: new Date().toISOString()
        }
      }, station.crs);

      console.log(`🚨 Delay alert: Train ${movement.train_id} delayed ${delayMinutes} min at ${station.crs}`);
    }

    // Log interesting events
    if (movement.event_type === 'DEPARTURE') {
      console.log(`🚂 ${movement.event_type}: ${movement.train_id} from ${station.crs}${delayMinutes > 0 ? ` (${delayMinutes} min delay)` : ''}`);
    }
  }

  /**
   * Start simulation mode for testing
   */
  startSimulationMode() {
    console.log('🤖 Starting simulation mode - sending test data every 30 seconds');
    
    const stations = ['KGX', 'PAD', 'VIC', 'WAT', 'LIV'];
    const trains = ['1A23', '2B45', '3C67', '4D89', '5E12'];
    
    setInterval(() => {
      if (this.clients.size === 0) return;

      const station = stations[Math.floor(Math.random() * stations.length)];
      const train = trains[Math.floor(Math.random() * trains.length)];
      const eventType = Math.random() > 0.5 ? 'DEPARTURE' : 'ARRIVAL';
      const delayMinutes = Math.floor(Math.random() * 15);

      this.broadcast({
        type: 'TRAIN_MOVEMENT',
        data: {
          trainId: train,
          stationCrs: station,
          eventType,
          delayMinutes,
          platform: Math.floor(Math.random() * 10) + 1,
          status: delayMinutes > 5 ? 'DELAYED' : 'ON_TIME',
          timestamp: new Date().toISOString()
        }
      }, station);

      this.messageCount++;
      console.log(`🤖 Simulated: Train ${train} ${eventType} at ${station}${delayMinutes > 0 ? ` (${delayMinutes} min delay)` : ''}`);
      
    }, 30000); // Every 30 seconds
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    console.log('🛑 Shutting down WebSocket server...');
    
    // Close all client connections
    this.clients.forEach(client => {
      if (client.readyState === client.OPEN) {
        client.close(1001, 'Server shutdown');
      }
    });

    // Close Network Rail connection
    if (this.networkRailClient) {
      this.networkRailClient.disconnect();
    }

    // Close HTTP server
    if (this.httpServer) {
      this.httpServer.close();
    }

    console.log('✅ Server shutdown complete');
    process.exit(0);
  }
}

// Start the server
const server = new ProductionWebSocketServer();
server.start();
