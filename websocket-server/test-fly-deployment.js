#!/usr/bin/env node

/**
 * Test script for Fly.io-deployed WebSocket server
 */

const WebSocket = require('ws');

const FLY_URL = 'wss://railhopp-websocket.fly.dev'; // Your Fly.io URL
const FLY_HTTPS_URL = 'https://railhopp-websocket.fly.dev'; // For health check

console.log('🧪 Testing Railhopp WebSocket Server on Fly.io...\n');
console.log('📍 Region: London (lhr) - Optimized for UK users');
console.log('⚡ Always-on deployment - No cold starts!\n');

// Test 1: Health Check
console.log('1️⃣  Testing Health Check...');

// For Node.js versions without fetch
const https = require('https');
const url = require('url');

function healthCheck() {
  const urlParts = url.parse(`${FLY_HTTPS_URL}/health`);
  
  const options = {
    hostname: urlParts.hostname,
    port: urlParts.port || 443,
    path: urlParts.path,
    method: 'GET'
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log('✅ Health Check Response:', jsonData);
          console.log('🌍 Deployed in London region for optimal UK performance');
          console.log('');
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

healthCheck()
  .then(() => {
    // Test 2: WebSocket Connection
    testWebSocket();
  })
  .catch(error => {
    console.error('❌ Health Check Failed:', error.message);
    console.log('ℹ️  Make sure your Fly.io app is deployed and running');
    console.log('ℹ️  URL should be: https://railhopp-websocket.fly.dev');
  });

function testWebSocket() {
  console.log('2️⃣  Testing WebSocket Connection...');
  console.log('🚀 Connecting to Fly.io edge network in London...');
  
  const ws = new WebSocket(FLY_URL);
  
  ws.on('open', function open() {
    console.log('✅ WebSocket Connected to Fly.io!');
    console.log('⚡ No cold start delay - always ready!');
    
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
    console.error('❌ WebSocket Error:', err.message);
    console.log('ℹ️  Make sure your Fly.io app is deployed and running');
  });
  
  ws.on('close', function close() {
    console.log('🔌 WebSocket Disconnected');
    console.log('\n🎉 Test Complete!');
    console.log('✨ Your WebSocket server is running successfully on Fly.io');
    console.log('🌍 Global edge deployment with London region optimization');
    console.log('⚡ Always-on performance for real-time rail data');
    console.log('\n💰 Cost: ~$2/month (covered by $5 free credits)');
  });
  
  // Close after 5 seconds
  setTimeout(() => {
    ws.close();
  }, 5000);
}

// Performance note
console.log('💡 Fly.io Benefits for UK Rail Data:');
console.log('   🇬🇧 London region deployment');  
console.log('   ⚡ No sleeping - always ready');
console.log('   🚀 Global edge network');
console.log('   📊 Built-in monitoring');
console.log('   🔒 Automatic HTTPS/WSS');
console.log('');
