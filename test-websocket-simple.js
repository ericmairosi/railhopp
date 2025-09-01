#!/usr/bin/env node

/**
 * Simple WebSocket connectivity test for Network Rail
 * Tests basic WebSocket connection before STOMP protocol
 */

const WebSocket = require('ws');

console.log('🔌 Testing WebSocket connection to Network Rail...');
console.log('===============================================');

const WEBSOCKET_URL = 'wss://publicdatafeeds.networkrail.co.uk:61618';

console.log(`📡 Connecting to: ${WEBSOCKET_URL}`);
console.log('⏱️  Timeout: 15 seconds');
console.log('');

// Create WebSocket connection
const ws = new WebSocket(WEBSOCKET_URL, {
  headers: {
    'User-Agent': 'Railhopp-Test/1.0',
  }
});

let connectionTimer = setTimeout(() => {
  console.error('❌ Connection timeout after 15 seconds');
  console.error('');
  console.error('🔍 Possible issues:');
  console.error('   • Firewall blocking WebSocket connections');
  console.error('   • Corporate network restrictions');
  console.error('   • Network Rail server issues');
  console.error('   • ISP blocking non-standard ports');
  console.error('');
  console.error('💡 Try:');
  console.error('   • Connect from different network (mobile hotspot)');
  console.error('   • Check with IT about port 61618 access');
  console.error('   • Verify Network Rail service status');
  
  ws.terminate();
  process.exit(1);
}, 15000);

ws.on('open', function open() {
  console.log('✅ WebSocket connection successful!');
  console.log('🎉 Network Rail server is reachable');
  console.log('📡 Port 61618 is accessible');
  console.log('');
  console.log('🔄 Now testing STOMP protocol...');
  
  clearTimeout(connectionTimer);
  ws.close();
  
  // If WebSocket works, try STOMP
  setTimeout(() => {
    console.log('🚂 Running STOMP connection test...');
    console.log('');
    
    // Run the STOMP test
    const { spawn } = require('child_process');
    const stompTest = spawn('node', ['test-stomp-direct.js'], {
      stdio: 'inherit'
    });
    
    stompTest.on('close', (code) => {
      process.exit(code);
    });
  }, 1000);
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket connection failed');
  console.error(`   📝 Error: ${err.message}`);
  console.error('');
  
  // Analyze the error
  if (err.code === 'ENOTFOUND') {
    console.error('🌐 DNS resolution failed');
    console.error('   • Check internet connection');
    console.error('   • Verify domain name');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('🔒 Connection refused by server');
    console.error('   • Port 61618 may be closed');
    console.error('   • Server may be down');
  } else if (err.code === 'ETIMEDOUT') {
    console.error('⏱️  Connection timed out');
    console.error('   • Network/firewall blocking connection');
    console.error('   • Slow network connection');
  } else if (err.message.includes('certificate')) {
    console.error('🔐 SSL/TLS certificate issue');
    console.error('   • Certificate validation failed');
  }
  
  clearTimeout(connectionTimer);
  process.exit(1);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 Connection closed (Code: ${code})`);
  if (reason) {
    console.log(`   📋 Reason: ${reason.toString()}`);
  }
  clearTimeout(connectionTimer);
  
  if (code === 1000) {
    console.log('✅ Clean disconnect - WebSocket is working!');
    process.exit(0);
  } else {
    console.log('⚠️  Unexpected disconnect');
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGINT', function() {
  console.log('\n🛑 Test interrupted by user');
  clearTimeout(connectionTimer);
  ws.terminate();
  process.exit(0);
});
