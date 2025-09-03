#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🧪 Testing WebSocket via Fly.io proxy...');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', function open() {
  console.log('✅ WebSocket Connected!');
  
  // Test subscription
  console.log('📡 Testing station subscription...');
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE_STATION',
    stationCrs: 'KGX'
  }));
  
  // Test ping
  setTimeout(() => {
    console.log('🏓 Testing ping...');
    ws.send(JSON.stringify({ type: 'PING' }));
  }, 1000);
});

ws.on('message', function message(data) {
  const msg = JSON.parse(data.toString());
  console.log('📨 Received:', msg);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket Error:', err);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket Disconnected');
  console.log('\n🎉 WebSocket test complete!');
  process.exit(0);
});

// Close after 5 seconds
setTimeout(() => {
  ws.close();
}, 5000);
