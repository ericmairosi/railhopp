#!/usr/bin/env node

/**
 * WebSocket Client Test - connects to your Railhopp WebSocket server
 * Demonstrates real-time updates (simulation mode)
 */

const WebSocket = require('ws');

console.log('🚂 Railhopp WebSocket Client Test');
console.log('=================================');
console.log('📡 Connecting to local WebSocket server...');

const ws = new WebSocket('ws://localhost:3003');

ws.on('open', function open() {
  console.log('✅ Connected to Railhopp WebSocket server!');
  console.log('🎮 Server is running in simulation mode');
  console.log('🎧 Listening for real-time updates...');
  console.log('');
  
  // Subscribe to train movements
  ws.send(JSON.stringify({
    action: 'subscribe',
    channel: 'train-movements'
  }));
  
  console.log('📥 Subscribed to train movements');
  console.log('⏰ Waiting for updates (every 30 seconds)...');
  console.log('');
});

ws.on('message', function message(data) {
  try {
    const update = JSON.parse(data.toString());
    console.log('📦 Received update:');
    console.log(`   📍 Type: ${update.type || 'unknown'}`);
    console.log(`   🕐 Time: ${new Date().toLocaleTimeString()}`);
    
    if (update.type === 'train-movement') {
      console.log(`   🚆 Train: ${update.data.trainId || 'N/A'}`);
      console.log(`   📍 Location: ${update.data.location || 'N/A'}`);
      console.log(`   ⏰ Event: ${update.data.eventType || 'N/A'}`);
      console.log(`   🕐 Timestamp: ${update.data.timestamp || 'N/A'}`);
    } else if (update.type === 'td-update') {
      console.log(`   📡 TD Area: ${update.data.area || 'N/A'}`);
      console.log(`   📍 Berth: ${update.data.berth || 'N/A'}`);
      console.log(`   🚆 Description: ${update.data.description || 'N/A'}`);
    } else if (update.type === 'connection-status') {
      console.log(`   🔗 Status: ${update.data.status}`);
      console.log(`   💡 Message: ${update.data.message}`);
    }
    
    console.log('');
    
  } catch (error) {
    console.log('⚠️  Received non-JSON message:', data.toString());
    console.log('');
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  console.error('');
  console.error('💡 Make sure the server is running:');
  console.error('   cd websocket-server');
  console.error('   PORT=3003 node server.js');
});

ws.on('close', function close(code, reason) {
  console.log('🔌 Connection closed');
  console.log(`   📋 Code: ${code}`);
  if (reason) {
    console.log(`   📝 Reason: ${reason.toString()}`);
  }
  console.log('');
  console.log('👋 Test completed!');
});

// Handle process termination
process.on('SIGINT', function() {
  console.log('\n🛑 Test interrupted by user');
  ws.close();
});

// Auto-close after 2 minutes for demo
setTimeout(() => {
  console.log('⏰ Demo timeout - closing connection');
  ws.close();
}, 120000);
