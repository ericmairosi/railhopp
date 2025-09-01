#!/usr/bin/env node

/**
 * Direct Network Rail STOMP Connection Test
 * Tests the STOMP connection to Network Rail's live data feed
 */

const StompJs = require('@stomp/stompjs');
const WebSocket = require('ws');

// Use WebSocket for Node.js environment
Object.assign(global, { WebSocket });

console.log('🚂 Network Rail STOMP Connection Test');
console.log('=====================================');

// Your Network Rail credentials
const NETWORK_RAIL_USERNAME = 'ericmairosi@gmail.com';
const NETWORK_RAIL_PASSWORD = 'Kirsty77!';
const STOMP_URL = 'wss://publicdatafeeds.networkrail.co.uk:61618';

// Connection timeout
const CONNECTION_TIMEOUT = 30000; // 30 seconds

let connectionTimer;

// Create STOMP client
const client = new StompJs.Client({
  brokerURL: STOMP_URL,
  connectHeaders: {
    login: NETWORK_RAIL_USERNAME,
    passcode: NETWORK_RAIL_PASSWORD,
    'client-id': `railhopp-test-${Date.now()}`,
  },
  debug: function (str) {
    console.log('🔧 STOMP Debug:', str);
  },
  reconnectDelay: 5000,
  heartbeatIncoming: 4000,
  heartbeatOutgoing: 4000,
});

console.log(`📡 Attempting to connect to: ${STOMP_URL}`);
console.log(`👤 Username: ${NETWORK_RAIL_USERNAME}`);
console.log(`🔑 Password: ${'*'.repeat(NETWORK_RAIL_PASSWORD.length)}`);
console.log('');

// Connection successful
client.onConnect = function (frame) {
  console.log('✅ Connected to Network Rail STOMP successfully!');
  console.log(`📋 Session ID: ${frame.headers.session || 'N/A'}`);
  console.log(`🏷️  Server: ${frame.headers.server || 'N/A'}`);
  console.log('');
  
  clearTimeout(connectionTimer);
  
  // Subscribe to train movement feed
  console.log('📥 Subscribing to train movement updates...');
  
  const subscription = client.subscribe('/topic/TRAIN_MVT_ALL_TOC', function (message) {
    try {
      const data = JSON.parse(message.body);
      console.log('📦 Received train movement data:');
      console.log(`   📍 Message type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      console.log(`   📊 Data size: ${message.body.length} bytes`);
      
      if (Array.isArray(data) && data.length > 0) {
        const firstMessage = data[0];
        console.log(`   🚆 First message type: ${firstMessage.header?.msg_type || 'unknown'}`);
        console.log(`   🕐 Timestamp: ${new Date(firstMessage.header?.msg_queue_timestamp || Date.now()).toLocaleTimeString()}`);
      }
      
      console.log(`   📄 Raw sample: ${message.body.substring(0, 200)}...`);
      console.log('');
      
    } catch (error) {
      console.log('⚠️  Could not parse message:', error.message);
      console.log(`   📄 Raw data: ${message.body.substring(0, 200)}...`);
      console.log('');
    }
  });
  
  // Subscribe to TD (Train Describer) messages for real-time signalling
  console.log('📥 Subscribing to TD (signalling) updates...');
  
  const tdSubscription = client.subscribe('/topic/TD_ALL_SIG_AREA', function (message) {
    try {
      const data = JSON.parse(message.body);
      console.log('📡 Received TD signalling data:');
      console.log(`   📊 Data size: ${message.body.length} bytes`);
      console.log(`   📄 Sample: ${message.body.substring(0, 150)}...`);
      console.log('');
      
    } catch (error) {
      console.log('⚠️  Could not parse TD message:', error.message);
    }
  });
  
  console.log('🎧 Listening for live data... (Press Ctrl+C to stop)');
  console.log('');
  
  // Keep alive for 60 seconds to see some data
  setTimeout(() => {
    console.log('⏰ Test completed after 60 seconds');
    subscription.unsubscribe();
    tdSubscription.unsubscribe();
    client.disconnect();
    process.exit(0);
  }, 60000);
};

// Connection error
client.onStompError = function (frame) {
  console.error('❌ STOMP Error occurred:');
  console.error(`   🔴 Headers:`, frame.headers);
  console.error(`   📝 Body: ${frame.body}`);
  console.error('');
  
  clearTimeout(connectionTimer);
  
  // Common error analysis
  if (frame.body.includes('Authentication failed')) {
    console.error('🚫 Authentication Failed - Possible Issues:');
    console.error('   • Invalid username or password');
    console.error('   • Account may be suspended or expired');
    console.error('   • Check Network Rail account status');
  } else if (frame.body.includes('Connection refused')) {
    console.error('🔒 Connection Refused - Possible Issues:');
    console.error('   • Network/firewall blocking connection');
    console.error('   • STOMP server may be down');
    console.error('   • Wrong URL or port');
  }
  
  process.exit(1);
};

// WebSocket error
client.onWebSocketError = function (error) {
  console.error('❌ WebSocket Error:');
  console.error('   📝 Error:', error.message || error);
  console.error('   🌐 This could indicate network connectivity issues');
  console.error('');
  
  clearTimeout(connectionTimer);
  process.exit(1);
};

// Disconnection
client.onDisconnect = function (frame) {
  console.log('🔌 Disconnected from Network Rail');
  if (frame) {
    console.log(`   📋 Reason: ${frame.body || 'Clean disconnect'}`);
  }
  console.log('');
  
  clearTimeout(connectionTimer);
  process.exit(0);
};

// Set connection timeout
connectionTimer = setTimeout(() => {
  console.error('⏱️  Connection timeout after 30 seconds');
  console.error('');
  console.error('🔍 Troubleshooting steps:');
  console.error('   1. Check your internet connection');
  console.error('   2. Verify Network Rail credentials');
  console.error('   3. Check if corporate firewall blocks websockets');
  console.error('   4. Try running from a different network');
  console.error('');
  
  client.deactivate();
  process.exit(1);
}, CONNECTION_TIMEOUT);

// Handle process termination
process.on('SIGINT', function() {
  console.log('\n🛑 Test interrupted by user');
  clearTimeout(connectionTimer);
  client.deactivate();
  process.exit(0);
});

process.on('SIGTERM', function() {
  console.log('\n🛑 Test terminated');
  clearTimeout(connectionTimer);
  client.deactivate();
  process.exit(0);
});

// Start the connection
console.log('🔄 Initiating connection...');
client.activate();
