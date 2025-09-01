#!/usr/bin/env node

/**
 * Darwin & Knowledge Station Integration Test
 * Tests the integration between both APIs and verifies they work together
 */

const fs = require('fs');
const path = require('path');

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
 * Check environment variables
 */
function checkEnvironment() {
  log('\n🔍 Checking Environment Configuration...', colors.blue);
  
  const envFiles = ['.env.local', '.env.development', '.env'];
  let envFound = false;
  let config = {};
  
  // Try to read environment files
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      logSuccess(`Found ${envFile}`);
      envFound = true;
      
      try {
        const content = fs.readFileSync(envFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        lines.forEach(line => {
          const [key, value] = line.split('=').map(s => s.trim());
          if (key && value) {
            config[key] = value;
          }
        });
        
        break;
      } catch (error) {
        logError(`Failed to read ${envFile}: ${error.message}`);
      }
    }
  }
  
  if (!envFound) {
    logWarning('No environment files found');
    logInfo('Create a .env.local file with your API credentials');
  }
  
  // Check Darwin API configuration
  log('\n🚂 Darwin API Configuration:');
  const darwinUrl = config.DARWIN_API_URL || process.env.DARWIN_API_URL;
  const darwinToken = config.DARWIN_API_TOKEN || process.env.DARWIN_API_TOKEN;
  
  if (darwinUrl) {
    logSuccess(`Darwin API URL: ${darwinUrl}`);
  } else {
    logError('Darwin API URL not configured');
  }
  
  if (darwinToken && darwinToken !== 'your_darwin_api_token_here') {
    logSuccess('Darwin API Token: ✓ Configured');
  } else {
    logError('Darwin API Token not configured or placeholder value');
  }
  
  // Check Knowledge Station configuration
  log('\n🔬 Knowledge Station Configuration:');
  const ksUrl = config.KNOWLEDGE_STATION_API_URL || process.env.KNOWLEDGE_STATION_API_URL;
  const ksToken = config.KNOWLEDGE_STATION_API_TOKEN || process.env.KNOWLEDGE_STATION_API_TOKEN;
  const ksEnabled = (config.KNOWLEDGE_STATION_ENABLED || process.env.KNOWLEDGE_STATION_ENABLED) !== 'false';
  
  if (ksUrl) {
    logSuccess(`Knowledge Station API URL: ${ksUrl}`);
  } else {
    logWarning('Knowledge Station API URL not configured');
  }
  
  if (ksToken && ksToken !== 'your_knowledge_station_token_here') {
    logSuccess('Knowledge Station API Token: ✓ Configured');
  } else {
    logWarning('Knowledge Station API Token not configured or placeholder value');
  }
  
  if (ksEnabled) {
    logSuccess('Knowledge Station: Enabled');
  } else {
    logWarning('Knowledge Station: Disabled');
  }
  
  return {
    darwin: {
      url: darwinUrl,
      token: darwinToken,
      configured: !!(darwinUrl && darwinToken && darwinToken !== 'your_darwin_api_token_here')
    },
    knowledgeStation: {
      url: ksUrl,
      token: ksToken,
      enabled: ksEnabled,
      configured: !!(ksUrl && ksToken && ksToken !== 'your_knowledge_station_token_here')
    }
  };
}

/**
 * Test API endpoints directly
 */
async function testAPIEndpoints() {
  log('\n🌐 Testing API Endpoints...', colors.blue);
  
  // Test Darwin departures endpoint
  try {
    logInfo('Testing Darwin departures endpoint...');
    const darwinResponse = await fetch('http://localhost:3000/api/darwin/departures?crs=KGX&numRows=1');
    
    if (darwinResponse.ok) {
      const data = await darwinResponse.json();
      if (data.success) {
        logSuccess('Darwin API endpoint working');
        logInfo(`Data source: ${data.data?.dataSource || 'darwin'}`);
        logInfo(`Generated at: ${data.data?.generatedAt || data.timestamp}`);
      } else {
        logError(`Darwin API returned error: ${data.error?.message || 'Unknown error'}`);
      }
    } else {
      logError(`Darwin API endpoint returned ${darwinResponse.status}: ${darwinResponse.statusText}`);
    }
  } catch (error) {
    logError(`Darwin API endpoint test failed: ${error.message}`);
    logInfo('Make sure your development server is running (npm run dev)');
  }
  
  // Test Knowledge Station status endpoint
  try {
    logInfo('Testing Knowledge Station status endpoint...');
    const ksResponse = await fetch('http://localhost:3000/api/knowledge-station/status');
    
    if (ksResponse.ok) {
      const data = await ksResponse.json();
      if (data.success) {
        logSuccess('Knowledge Station status endpoint working');
        logInfo(`Available: ${data.data?.available ? 'Yes' : 'No'}`);
        logInfo(`Enabled: ${data.data?.enabled ? 'Yes' : 'No'}`);
      } else {
        logWarning(`Knowledge Station status: ${data.error?.message || 'Service unavailable'}`);
      }
    } else {
      logWarning(`Knowledge Station status endpoint returned ${ksResponse.status}`);
    }
  } catch (error) {
    logWarning(`Knowledge Station status test failed: ${error.message}`);
  }
  
  // Test unified data endpoint (if it exists)
  try {
    logInfo('Testing unified rail data endpoint...');
    const unifiedResponse = await fetch('http://localhost:3000/api/unified/departures?crs=KGX&includeStationInfo=true&includeDisruptions=true');
    
    if (unifiedResponse.ok) {
      const data = await unifiedResponse.json();
      if (data.success) {
        logSuccess('Unified rail data endpoint working');
        logInfo(`Data source: ${data.data?.dataSource || 'unknown'}`);
        logInfo(`Knowledge Station available: ${data.data?.knowledgeStationAvailable ? 'Yes' : 'No'}`);
        logInfo(`Station info included: ${data.data?.stationInfo ? 'Yes' : 'No'}`);
        logInfo(`Disruptions included: ${data.data?.disruptions ? 'Yes' : 'No'}`);
      } else {
        logWarning(`Unified endpoint returned error: ${data.error?.message || 'Unknown error'}`);
      }
    } else if (unifiedResponse.status === 404) {
      logInfo('Unified endpoint not found (this is expected if not implemented yet)');
    } else {
      logWarning(`Unified endpoint returned ${unifiedResponse.status}: ${unifiedResponse.statusText}`);
    }
  } catch (error) {
    logInfo('Unified endpoint test skipped (endpoint may not exist yet)');
  }
}

/**
 * Test service integration programmatically
 */
async function testServiceIntegration() {
  log('\n🔧 Testing Service Integration...', colors.blue);
  
  try {
    // Try to import and test the unified service
    const modulePath = path.join(process.cwd(), 'apps', 'web', 'src', 'lib', 'services', 'unified-rail-data.ts');
    
    if (fs.existsSync(modulePath)) {
      logSuccess('Unified rail data service file found');
      
      // Check if the service imports are correct
      const serviceContent = fs.readFileSync(modulePath, 'utf8');
      
      if (serviceContent.includes('getDarwinClient')) {
        logSuccess('Darwin client import found');
      } else {
        logError('Darwin client import missing');
      }
      
      if (serviceContent.includes('getKnowledgeStationClient')) {
        logSuccess('Knowledge Station client import found');
      } else {
        logError('Knowledge Station client import missing');
      }
      
      if (serviceContent.includes('getUnifiedRailDataService')) {
        logSuccess('Unified service export found');
      } else {
        logError('Unified service export missing');
      }
      
    } else {
      logError('Unified rail data service file not found');
    }
    
    // Check client files exist
    const darwinClientPath = path.join(process.cwd(), 'apps', 'web', 'src', 'lib', 'darwin', 'client.ts');
    const ksClientPath = path.join(process.cwd(), 'apps', 'web', 'src', 'lib', 'knowledge-station', 'client.ts');
    
    if (fs.existsSync(darwinClientPath)) {
      logSuccess('Darwin client file found');
    } else {
      logError('Darwin client file not found');
    }
    
    if (fs.existsSync(ksClientPath)) {
      logSuccess('Knowledge Station client file found');
    } else {
      logError('Knowledge Station client file not found');
    }
    
  } catch (error) {
    logError(`Service integration test failed: ${error.message}`);
  }
}

/**
 * Check for common issues
 */
function checkCommonIssues() {
  log('\n🐛 Checking for Common Issues...', colors.blue);
  
  // Check if development server might be running
  logInfo('Common issues to check:');
  
  log('1. Development Server:');
  log('   - Make sure "npm run dev" is running in another terminal');
  log('   - Server should be accessible at http://localhost:3000');
  
  log('2. Environment Variables:');
  log('   - Ensure .env.local file exists with proper API tokens');
  log('   - Check that tokens are not placeholder values');
  log('   - Verify Knowledge Station is enabled if you want integration');
  
  log('3. API Token Issues:');
  log('   - Darwin API token: Get from https://www.nationalrail.co.uk/100296.aspx');
  log('   - Knowledge Station token: Check with your API provider');
  
  log('4. Network/Firewall:');
  log('   - Ensure no firewall is blocking API requests');
  log('   - Check if VPN or proxy is interfering');
  
  log('5. PowerShell Issues (if seeing "broken pipe"):');
  log('   - Try running commands in regular Command Prompt instead');
  log('   - Some PowerShell versions have pipe handling issues');
  log('   - Consider using Git Bash or WSL for terminal commands');
}

/**
 * Provide recommendations
 */
function provideRecommendations(config) {
  log('\n💡 Recommendations...', colors.blue);
  
  if (!config.darwin.configured) {
    log('🔧 Darwin API Setup:');
    log('1. Get a Darwin API token from https://www.nationalrail.co.uk/100296.aspx');
    log('2. Add to .env.local:');
    log('   DARWIN_API_URL=https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx');
    log('   DARWIN_API_TOKEN=your_actual_darwin_token');
  }
  
  if (!config.knowledgeStation.configured && config.knowledgeStation.enabled) {
    log('\n🔬 Knowledge Station Setup (Optional):');
    log('1. If you have a Knowledge Station API token, add to .env.local:');
    log('   KNOWLEDGE_STATION_API_URL=https://api.rtt.io/api/v1');
    log('   KNOWLEDGE_STATION_API_TOKEN=your_actual_ks_token');
    log('   KNOWLEDGE_STATION_ENABLED=true');
    log('2. If you don\'t need Knowledge Station, disable it:');
    log('   KNOWLEDGE_STATION_ENABLED=false');
  }
  
  if (config.darwin.configured) {
    log('\n✨ Ready for Testing:');
    log('1. Start development server: npm run dev');
    log('2. Test Darwin API: node scripts/test-live-data.js');
    log('3. Test integration: node scripts/test-integration.js');
  }
}

/**
 * Main test function
 */
async function main() {
  log('🚀 Darwin & Knowledge Station Integration Test', colors.blue);
  log('=' .repeat(60), colors.blue);
  
  // Check environment
  const config = checkEnvironment();
  
  // Test API endpoints
  await testAPIEndpoints();
  
  // Test service integration
  await testServiceIntegration();
  
  // Check for common issues
  checkCommonIssues();
  
  // Provide recommendations
  provideRecommendations(config);
  
  // Summary
  log('\n📊 Summary:', colors.blue);
  
  if (config.darwin.configured) {
    logSuccess('Darwin API is configured');
  } else {
    logError('Darwin API needs configuration');
  }
  
  if (config.knowledgeStation.configured) {
    logSuccess('Knowledge Station is configured');
  } else if (config.knowledgeStation.enabled) {
    logWarning('Knowledge Station is enabled but not configured');
  } else {
    logInfo('Knowledge Station is disabled');
  }
  
  log('\n🔧 Next Steps:');
  if (!config.darwin.configured) {
    log('1. Configure Darwin API credentials');
  }
  if (config.knowledgeStation.enabled && !config.knowledgeStation.configured) {
    log('2. Configure Knowledge Station API or disable it');
  }
  log('3. Start development server: npm run dev');
  log('4. Test the integration on your website');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// Run the tests
main().catch((error) => {
  logError(`Test failed: ${error.message}`);
  process.exit(1);
});
