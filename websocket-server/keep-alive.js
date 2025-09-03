#!/usr/bin/env node

/**
 * Keep-Alive Service for Render Free Tier
 * Pings your WebSocket server every 10 minutes to prevent sleeping
 */

const https = require('https');

const WEBSOCKET_URL = 'https://YOUR-RENDER-URL.onrender.com'; // Replace with your actual URL
const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

console.log('🔄 Starting Keep-Alive Service for Render...');
console.log(`📡 Pinging: ${WEBSOCKET_URL}/health`);
console.log(`⏰ Interval: Every ${PING_INTERVAL / 1000 / 60} minutes`);

function pingService() {
  const url = `${WEBSOCKET_URL}/health`;
  
  https.get(url, (res) => {
    console.log(`✅ Ping successful - Status: ${res.statusCode} - ${new Date().toISOString()}`);
  }).on('error', (err) => {
    console.error(`❌ Ping failed: ${err.message}`);
  });
}

// Ping immediately on start
pingService();

// Set up interval
setInterval(pingService, PING_INTERVAL);

console.log('🚀 Keep-alive service is running...');
console.log('💡 Your Render service will now stay awake!');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down keep-alive service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down keep-alive service...');
  process.exit(0);
});
