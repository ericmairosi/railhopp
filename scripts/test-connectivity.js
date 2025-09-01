#!/usr/bin/env node

/**
 * Network Connectivity Test Script
 * Tests basic connectivity to Darwin API endpoints and diagnoses "broken pipe" errors
 */

const https = require('https');
const dns = require('dns');

// Test endpoints
const endpoints = [
  {
    name: 'Darwin API (HTTPS)',
    url: 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx',
    method: 'HEAD'
  },
  {
    name: 'National Rail (Main Site)',
    url: 'https://www.nationalrail.co.uk',
    method: 'HEAD'
  }
];

function log(message, color = '') {
  const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function testDNS(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: true, address });
      }
    });
  });
}

function testHTTPS(url, method = 'HEAD') {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      timeout: 10000,
      headers: {
        'User-Agent': 'Railhopp-Diagnostic/1.0'
      }
    };

    const req = https.request(options, (res) => {
      resolve({
        success: true,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers
      });
    });

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        code: err.code
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runDiagnostics() {
  log('🔍 Network Connectivity Diagnostics', 'blue');
  log('=' .repeat(50), 'blue');

  // Test DNS resolution
  log('\n📡 Testing DNS Resolution...', 'cyan');
  for (const endpoint of endpoints) {
    const url = new URL(endpoint.url);
    const dnsResult = await testDNS(url.hostname);
    
    if (dnsResult.success) {
      log(`✅ ${url.hostname} -> ${dnsResult.address}`, 'green');
    } else {
      log(`❌ ${url.hostname} DNS failed: ${dnsResult.error}`, 'red');
    }
  }

  // Test HTTPS connectivity
  log('\n🌐 Testing HTTPS Connectivity...', 'cyan');
  for (const endpoint of endpoints) {
    log(`\nTesting ${endpoint.name}...`);
    
    const result = await testHTTPS(endpoint.url, endpoint.method);
    
    if (result.success) {
      log(`✅ Connected successfully`, 'green');
      log(`   Status: ${result.statusCode} ${result.statusMessage}`);
      
      if (result.headers.server) {
        log(`   Server: ${result.headers.server}`);
      }
      
      if (result.headers['content-type']) {
        log(`   Content-Type: ${result.headers['content-type']}`);
      }
    } else {
      log(`❌ Connection failed: ${result.error}`, 'red');
      
      if (result.code) {
        log(`   Error Code: ${result.code}`, 'yellow');
        
        // Provide specific advice based on error code
        switch (result.code) {
          case 'ENOTFOUND':
            log('   → DNS resolution failed. Check your internet connection.', 'yellow');
            break;
          case 'ECONNREFUSED':
            log('   → Connection refused. The server may be down.', 'yellow');
            break;
          case 'EPIPE':
          case 'ECONNRESET':
            log('   → Connection broken/reset. This is the "broken pipe" error.', 'yellow');
            log('   → This often happens due to network instability or server issues.', 'yellow');
            break;
          case 'ETIMEDOUT':
            log('   → Connection timed out. Network may be slow.', 'yellow');
            break;
          default:
            log(`   → Unexpected error: ${result.code}`, 'yellow');
        }
      }
    }
  }

  // Test Darwin API SOAP endpoint specifically
  log('\n🚂 Testing Darwin API SOAP Endpoint...', 'cyan');
  const soapTest = await testDarwinSOAP();
  
  if (soapTest.success) {
    log('✅ Darwin API endpoint is accessible', 'green');
    log(`   Response indicates SOAP service is running`, 'green');
  } else {
    log(`❌ Darwin API SOAP test failed: ${soapTest.error}`, 'red');
    
    if (soapTest.error.includes('broken pipe') || soapTest.error.includes('EPIPE')) {
      log('🔧 Broken Pipe Error Detected!', 'yellow');
      log('   This is likely caused by:', 'yellow');
      log('   1. Network instability or firewall interference', 'yellow');
      log('   2. The Darwin API server rejecting the connection', 'yellow');
      log('   3. Missing or invalid authentication headers', 'yellow');
      log('   4. Request timeout or server overload', 'yellow');
      log('\n💡 Solutions to try:', 'cyan');
      log('   1. Ensure you have a valid Darwin API token', 'cyan');
      log('   2. Check your firewall/antivirus settings', 'cyan');
      log('   3. Try from a different network (mobile hotspot)', 'cyan');
      log('   4. Wait a few minutes and try again', 'cyan');
    }
  }

  log('\n📊 Diagnostic Summary:', 'blue');
  log('If you see "broken pipe" errors, this is typically a network-level issue.');
  log('Make sure you have:');
  log('1. A stable internet connection');
  log('2. A valid Darwin API token (get from https://www.nationalrail.co.uk/100296.aspx)');
  log('3. No firewall blocking HTTPS connections to *.nationalrail.co.uk');
}

function testDarwinSOAP() {
  return new Promise((resolve) => {
    // Simple test - just try to connect to the SOAP endpoint
    const testData = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body></soap:Body></soap:Envelope>';
    
    const options = {
      hostname: 'lite.realtime.nationalrail.co.uk',
      port: 443,
      path: '/OpenLDBWS/ldb12.asmx',
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://thalesgroup.com/RTTI/2017-10-01/ldb/GetDepartureBoard',
        'Content-Length': Buffer.byteLength(testData),
        'User-Agent': 'Railhopp-Diagnostic/1.0'
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Even if we get a SOAP fault, at least we connected
        resolve({ success: true, statusCode: res.statusCode, response: data });
      });
    });

    req.on('error', (err) => {
      resolve({ success: false, error: err.message, code: err.code });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });

    req.write(testData);
    req.end();
  });
}

// Run diagnostics
runDiagnostics().catch(console.error);
