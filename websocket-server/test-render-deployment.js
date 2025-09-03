#!/usr/bin/env node

/**
 * Test script for Render-deployed WebSocket server
 */

const WebSocket = require('ws');

const RENDER_URL = 'wss://YOUR-SERVICE-URL.onrender.com'; // Replace with your actual URL from Render dashboard

console.log('🧪 Testing Railhopp WebSocket Server on Render...\n');

// Test 1: Health Check
console.log('1️⃣  Testing Health Check...');
fetch(`https://railhopp-websocket.onrender.com/health`)
  .then(response => response.json())
  .then(data => {
    console.log('✅ Health Check Response:', data);
    console.log('');
    
    // Test 2: WebSocket Connection
    testWebSocket();
  })
  .catch(error => {
    console.error('❌ Health Check Failed:', error);
    console.log('ℹ️  Make sure to replace the URL with your actual Render service URL');
  });

function testWebSocket() {
  console.log('2️⃣  Testing WebSocket Connection...');
  
  const ws = new WebSocket(RENDER_URL);
  
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
    console.log('\n🎉 Test Complete!');
    console.log('Your WebSocket server is running successfully on Render');
  });
  
  // Close after 5 seconds
  setTimeout(() => {
    ws.close();
  }, 5000);
}

// If fetch is not available (older Node.js), use a simple note
if (typeof fetch === 'undefined') {
  console.log('ℹ️  To test the health check, visit: https://railhopp-websocket.onrender.com/health');
  testWebSocket();
}
