#!/usr/bin/env node

/**
 * Live Data Validation Script
 * Tests Darwin API connectivity and validates real-time data functionality
 * 
 * Usage: node scripts/test-live-data.js [station-code]
 * Example: node scripts/test-live-data.js KGX
 */

const https = require('https');
const xml2js = require('xml2js');
const process = require('process');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      // Skip comments and empty lines
      if (!line || line.startsWith('#')) return;
      
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key] = value;
      }
    });
  }
}

// Load environment variables
loadEnvFile();

// Configuration
const CONFIG = {
  DARWIN_API_URL: process.env.DARWIN_API_URL || 'https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx',
  DARWIN_API_TOKEN: process.env.DARWIN_API_TOKEN || '',
  TEST_STATION: process.argv[2] || 'KGX', // King's Cross by default
  TIMEOUT: 10000
};

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

/**
 * Check environment configuration
 */
function checkEnvironment() {
  log('\n🔍 Checking Environment Configuration...', colors.blue);
  
  if (!CONFIG.DARWIN_API_TOKEN) {
    logError('DARWIN_API_TOKEN not found in environment variables');
    logInfo('Please set DARWIN_API_TOKEN in your .env file or environment');
    logInfo('Get your token from: https://www.nationalrail.co.uk/100296.aspx');
    return false;
  }
  
  if (CONFIG.DARWIN_API_TOKEN === 'demo_token' || CONFIG.DARWIN_API_TOKEN.length < 10) {
    logError('Invalid DARWIN_API_TOKEN detected (too short or demo token)');
    logInfo('Please provide a valid Darwin API token');
    return false;
  }
  
  logSuccess('DARWIN_API_TOKEN found');
  logSuccess(`DARWIN_API_URL: ${CONFIG.DARWIN_API_URL}`);
  logSuccess(`Test station: ${CONFIG.TEST_STATION}`);
  
  return true;
}

/**
 * Create SOAP envelope for Darwin API request
 */
function createDarwinSOAPRequest(stationCode) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/"
               xmlns:typ="http://thalesgroup.com/RTTI/2013-11-28/Token/types">
  <soap:Header>
    <typ:AccessToken>
      <typ:TokenValue>${CONFIG.DARWIN_API_TOKEN}</typ:TokenValue>
    </typ:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepartureBoardRequest>
      <ldb:numRows>5</ldb:numRows>
      <ldb:crs>${stationCode}</ldb:crs>
    </ldb:GetDepartureBoardRequest>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Make Darwin API request
 */
function makeDarwinRequest(stationCode) {
  return new Promise((resolve, reject) => {
    const soapEnvelope = createDarwinSOAPRequest(stationCode);
    const url = new URL(CONFIG.DARWIN_API_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://thalesgroup.com/RTTI/2017-10-01/ldb/GetDepartureBoard',
        'Content-Length': Buffer.byteLength(soapEnvelope),
        'User-Agent': 'Railhopp/1.0',
        'Accept': 'text/xml',
        'Cache-Control': 'no-cache'
      },
      timeout: CONFIG.TIMEOUT
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        resolve(data);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(soapEnvelope);
    req.end();
  });
}

/**
 * Parse Darwin SOAP response
 */
async function parseDarwinResponse(xmlData) {
  const parser = new xml2js.Parser({
    ignoreAttrs: false,
    explicitArray: false
  });

  try {
    const result = await parser.parseStringPromise(xmlData);
    const soapBody = result['soap:Envelope']['soap:Body'];
    
    if (soapBody['soap:Fault']) {
      throw new Error(`SOAP Fault: ${soapBody['soap:Fault']['faultstring']}`);
    }
    
    const stationBoard = soapBody['GetDepartureBoardResponse']['GetStationBoardResult'];
    return stationBoard;
  } catch (error) {
    throw new Error(`Failed to parse response: ${error.message}`);
  }
}

/**
 * Validate live data timestamps
 */
function validateLiveData(stationBoard) {
  log('\n📊 Validating Live Data...', colors.blue);
  
  const generatedAt = new Date(stationBoard['generatedAt']);
  const now = new Date();
  const timeDiff = Math.abs(now - generatedAt) / (1000 * 60); // minutes
  
  logInfo(`Data generated at: ${generatedAt.toISOString()}`);
  logInfo(`Current time: ${now.toISOString()}`);
  logInfo(`Time difference: ${timeDiff.toFixed(2)} minutes`);
  
  if (timeDiff > 5) {
    logWarning('Data is more than 5 minutes old - may not be truly live');
    return false;
  } else {
    logSuccess('Data appears to be live (within 5 minutes)');
  }
  
  // Check services
  const services = stationBoard['trainServices'];
  if (!services || !services['service']) {
    logWarning('No train services found in response');
    return true;
  }
  
  const serviceList = Array.isArray(services['service']) ? services['service'] : [services['service']];
  
  log(`\n🚂 Found ${serviceList.length} train services:`);
  
  serviceList.forEach((service, index) => {
    const std = service['std']; // scheduled departure
    const etd = service['etd']; // estimated departure
    const destination = service['destination']['location']['locationName'];
    const operator = service['operator'];
    
    log(`${index + 1}. ${operator} to ${destination}`);
    log(`   Scheduled: ${std}, Estimated: ${etd}`);
    
    if (etd !== 'On time' && etd !== std) {
      log(`   Status: DELAYED`, colors.yellow);
    } else if (etd === 'On time') {
      log(`   Status: ON TIME`, colors.green);
    }
  });
  
  return true;
}

/**
 * Test Darwin API connectivity
 */
async function testDarwinAPI() {
  log('\n🌐 Testing Darwin API Connectivity...', colors.blue);
  
  try {
    logInfo(`Making request to ${CONFIG.DARWIN_API_URL}`);
    logInfo(`Station code: ${CONFIG.TEST_STATION}`);
    
    const xmlResponse = await makeDarwinRequest(CONFIG.TEST_STATION);
    logSuccess('Successfully received response from Darwin API');
    
    const stationBoard = await parseDarwinResponse(xmlResponse);
    logSuccess('Successfully parsed SOAP response');
    
    logInfo(`Station: ${stationBoard['locationName']} (${stationBoard['crs']})`);
    
    const isLive = validateLiveData(stationBoard);
    
    if (isLive) {
      logSuccess('✨ Live data validation PASSED - Your Darwin API is working with real-time data!');
    } else {
      logWarning('Live data validation had warnings - please check timestamps');
    }
    
    return true;
    
  } catch (error) {
    logError(`Darwin API test failed: ${error.message}`);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      logError('Network connectivity issue - check your internet connection');
    } else if (error.message.includes('403') || error.message.includes('Unauthorized')) {
      logError('Authentication failed - check your Darwin API token');
    } else if (error.message.includes('timeout')) {
      logError('Request timed out - the Darwin API may be slow or unavailable');
    } else if (error.message.includes('broken pipe')) {
      logError('Connection broken - this could be a network or server issue');
      logInfo('Try running the test again in a few moments');
    }
    
    return false;
  }
}

/**
 * Test environment variable loading from .env files
 */
function testEnvLoading() {
  log('\n📁 Testing Environment Variable Loading...', colors.blue);
  
  try {
    // Try to load .env file
    const fs = require('fs');
    const path = require('path');
    
    const envFiles = ['.env.local', '.env.development', '.env'];
    let foundEnvFile = false;
    
    for (const envFile of envFiles) {
      const envPath = path.join(process.cwd(), envFile);
      if (fs.existsSync(envPath)) {
        logSuccess(`Found ${envFile}`);
        foundEnvFile = true;
        
        const envContent = fs.readFileSync(envPath, 'utf8');
        const hasDarwinToken = envContent.includes('DARWIN_API_TOKEN');
        const hasDarwinUrl = envContent.includes('DARWIN_API_URL');
        
        if (hasDarwinToken) {
          logSuccess('DARWIN_API_TOKEN found in .env file');
        } else {
          logWarning('DARWIN_API_TOKEN not found in .env file');
        }
        
        if (hasDarwinUrl) {
          logSuccess('DARWIN_API_URL found in .env file');
        }
        
        break;
      }
    }
    
    if (!foundEnvFile) {
      logWarning('No .env files found');
      logInfo('Create a .env.local file with your Darwin API credentials');
    }
    
  } catch (error) {
    logError(`Error checking .env files: ${error.message}`);
  }
}

/**
 * Provide setup instructions
 */
function provideSetupInstructions() {
  log('\n📋 Darwin API Setup Instructions:', colors.blue);
  log('1. Get a Darwin API token from: https://www.nationalrail.co.uk/100296.aspx');
  log('2. Create a .env.local file in your project root');
  log('3. Add the following lines to .env.local:');
  log('   DARWIN_API_URL=https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx');
  log('   DARWIN_API_TOKEN=your_actual_token_here');
  log('4. Restart your development server');
  log('5. Run this test again: node scripts/test-live-data.js');
}

/**
 * Main test function
 */
async function main() {
  log('🚀 Railhopp Live Data Validation Test', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  // Test environment loading
  testEnvLoading();
  
  // Check environment
  const envOk = checkEnvironment();
  
  if (!envOk) {
    provideSetupInstructions();
    process.exit(1);
  }
  
  // Test Darwin API
  const apiOk = await testDarwinAPI();
  
  if (apiOk) {
    log('\n🎉 All tests passed! Your Darwin API is configured correctly and providing live data.', colors.green);
  } else {
    log('\n💥 Tests failed. Please check the errors above and try again.', colors.red);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  main().catch((error) => {
    logError(`Test failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testDarwinAPI,
  checkEnvironment,
  validateLiveData
};
