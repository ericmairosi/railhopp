#!/usr/bin/env node

/**
 * Fix Broken Pipe Issues & Test Integration
 * This script avoids PowerShell issues and provides comprehensive testing
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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
 * Check if development server is running
 */
async function checkDevServer() {
  log('\n🌐 Checking Development Server...', colors.blue);
  
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      timeout: 5000
    }).catch(() => {
      // Try a basic endpoint if health doesn't exist
      return fetch('http://localhost:3000', { timeout: 5000 });
    });
    
    if (response.ok) {
      logSuccess('Development server is running');
      return true;
    } else {
      logWarning(`Server responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError('Development server is not running');
    logInfo('Start it with: npm run dev');
    return false;
  }
}

/**
 * Start development server if not running
 */
function startDevServer() {
  return new Promise((resolve, reject) => {
    log('\n🚀 Starting Development Server...', colors.blue);
    
    const child = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true,
      detached: true
    });
    
    let output = '';
    let hasStarted = false;
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      
      // Look for common dev server startup messages
      if (output.includes('localhost:3000') || 
          output.includes('ready') || 
          output.includes('compiled') ||
          output.includes('started server')) {
        if (!hasStarted) {
          hasStarted = true;
          logSuccess('Development server started successfully');
          // Give it a moment to fully initialize
          setTimeout(() => resolve(child), 2000);
        }
      }
    });
    
    child.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      if (errorOutput.includes('EADDRINUSE') || errorOutput.includes('port')) {
        logInfo('Server may already be running on port 3000');
        resolve(null);
      } else {
        logError(`Server error: ${errorOutput}`);
      }
    });
    
    child.on('error', (error) => {
      logError(`Failed to start server: ${error.message}`);
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!hasStarted) {
        logWarning('Server startup taking longer than expected');
        resolve(child);
      }
    }, 30000);
  });
}

/**
 * Test API endpoints with proper error handling
 */
async function testEndpoints() {
  log('\n🧪 Testing API Endpoints...', colors.blue);
  
  const endpoints = [
    {
      name: 'Darwin Departures',
      url: 'http://localhost:3000/api/darwin/departures?crs=KGX&numRows=1',
      critical: true
    },
    {
      name: 'Knowledge Station Status',
      url: 'http://localhost:3000/api/knowledge-station/status',
      critical: false
    },
    {
      name: 'Unified Departures',
      url: 'http://localhost:3000/api/unified/departures?crs=KGX&numRows=1&includeStationInfo=true',
      critical: false
    }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      logInfo(`Testing ${endpoint.name}...`);
      
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Railhopp-Debug-Tool/1.0'
        },
        timeout: 10000
      });
      
      const data = await response.json();
      
      if (response.ok && data.success !== false) {
        logSuccess(`${endpoint.name}: Working ✓`);
        results.push({ name: endpoint.name, status: 'working', data });
      } else {
        logWarning(`${endpoint.name}: ${data.error?.message || 'Error response'}`);
        results.push({ name: endpoint.name, status: 'error', error: data.error });
      }
    } catch (error) {
      if (endpoint.critical) {
        logError(`${endpoint.name}: ${error.message}`);
      } else {
        logWarning(`${endpoint.name}: ${error.message}`);
      }
      results.push({ name: endpoint.name, status: 'failed', error: error.message });
    }
  }
  
  return results;
}

/**
 * Analyze and provide solutions for common issues
 */
function analyzeProblem(results) {
  log('\n🔍 Problem Analysis...', colors.blue);
  
  const darwinResult = results.find(r => r.name === 'Darwin Departures');
  const ksResult = results.find(r => r.name === 'Knowledge Station Status');
  const unifiedResult = results.find(r => r.name === 'Unified Departures');
  
  // Check Darwin API issues
  if (darwinResult?.status === 'failed' || darwinResult?.status === 'error') {
    log('\n🚂 Darwin API Issues:', colors.yellow);
    
    if (darwinResult.error?.message?.includes('DARWIN_API_TOKEN') || 
        darwinResult.error?.includes('token') ||
        darwinResult.error?.includes('CONFIGURATION_ERROR')) {
      logError('Darwin API token is missing or invalid');
      log('Solutions:');
      log('1. Get a Darwin API token from: https://www.nationalrail.co.uk/100296.aspx');
      log('2. Update .env.local with your actual token');
      log('3. Restart your development server');
    } else if (darwinResult.error?.includes('network') || darwinResult.error?.includes('fetch')) {
      logError('Network connectivity issue with Darwin API');
      log('Solutions:');
      log('1. Check your internet connection');
      log('2. Verify firewall settings');
      log('3. Try connecting from a different network');
    }
  }
  
  // Check Knowledge Station issues
  if (ksResult?.status === 'working') {
    const ksData = ksResult.data?.data;
    if (ksData?.enabled === false) {
      logInfo('Knowledge Station is disabled (this is OK)');
      log('To enable: Set KNOWLEDGE_STATION_ENABLED=true in .env.local');
    } else if (ksData?.available === false) {
      logWarning('Knowledge Station is enabled but not available');
      log('Solutions:');
      log('1. Get a Knowledge Station API token');
      log('2. Update KNOWLEDGE_STATION_API_TOKEN in .env.local');
      log('3. Or disable it: KNOWLEDGE_STATION_ENABLED=false');
    }
  }
  
  // Check unified endpoint
  if (unifiedResult?.status === 'working') {
    const unifiedData = unifiedResult.data?.data;
    logSuccess('Unified endpoint is working!');
    logInfo(`Data source: ${unifiedData?.dataSource || 'unknown'}`);
    logInfo(`Knowledge Station available: ${unifiedData?.knowledgeStationAvailable ? 'Yes' : 'No'}`);
  }
}

/**
 * Create a simple environment fix script
 */
function createEnvFix() {
  log('\n🔧 Environment Configuration Help...', colors.blue);
  
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    
    if (content.includes('your_darwin_api_token_here')) {
      logWarning('Darwin API token needs to be configured');
      log('\nInstructions:');
      log('1. Go to: https://www.nationalrail.co.uk/100296.aspx');
      log('2. Register and get your free Darwin API token');
      log('3. Edit .env.local file');
      log('4. Replace "your_darwin_api_token_here" with your actual token');
      log('5. Save the file and restart your dev server');
    }
    
    if (content.includes('KNOWLEDGE_STATION_ENABLED=true') && 
        content.includes('your_knowledge_station_token_here')) {
      logWarning('Knowledge Station is enabled but token is not configured');
      log('\nOptions:');
      log('A. Get Knowledge Station token and configure it');
      log('B. Disable Knowledge Station: KNOWLEDGE_STATION_ENABLED=false');
    }
  } else {
    logError('.env.local file not found!');
    log('Run the integration test first: node scripts/test-integration.js');
  }
}

/**
 * Provide PowerShell alternatives
 */
function providePowershellAlternatives() {
  log('\n🔧 PowerShell "Broken Pipe" Solutions...', colors.blue);
  
  log('If you\'re seeing "broken pipe" errors in PowerShell:');
  log('');
  log('1. Use Command Prompt instead:');
  log('   - Press Win+R, type "cmd", press Enter');
  log('   - Navigate to your project: cd "C:\\Users\\ericm\\Desktop\\Rail app\\Railhopp"');
  log('   - Run commands normally: npm run dev');
  log('');
  log('2. Use Git Bash:');
  log('   - Right-click in your project folder → "Git Bash Here"');
  log('   - Run commands: npm run dev');
  log('');
  log('3. Use WSL (Windows Subsystem for Linux):');
  log('   - Install WSL if you haven\'t: wsl --install');
  log('   - Access your project from WSL');
  log('');
  log('4. Use VS Code integrated terminal:');
  log('   - Open project in VS Code');
  log('   - Terminal → New Terminal');
  log('   - Try different shell options');
}

/**
 * Main execution function
 */
async function main() {
  log('🛠️  Fix Broken Pipe & Integration Issues', colors.blue);
  log('=' .repeat(50), colors.blue);
  
  // Check if dev server is running
  const serverRunning = await checkDevServer();
  
  if (!serverRunning) {
    logInfo('Attempting to start development server...');
    try {
      await startDevServer();
      // Wait a bit for server to fully start
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      logError('Could not start development server automatically');
      logInfo('Please start it manually: npm run dev');
      return;
    }
  }
  
  // Test endpoints
  const results = await testEndpoints();
  
  // Analyze problems
  analyzeProblem(results);
  
  // Environment configuration help
  createEnvFix();
  
  // PowerShell alternatives
  providePowershellAlternatives();
  
  // Summary
  log('\n📊 Summary & Next Steps:', colors.blue);
  
  const workingEndpoints = results.filter(r => r.status === 'working').length;
  const totalEndpoints = results.length;
  
  logInfo(`Working endpoints: ${workingEndpoints}/${totalEndpoints}`);
  
  if (workingEndpoints === 0) {
    logError('No endpoints are working - check your Darwin API token configuration');
  } else if (workingEndpoints === totalEndpoints) {
    logSuccess('All endpoints are working! Your integration is ready.');
  } else {
    logWarning('Some endpoints need attention - see analysis above');
  }
  
  log('\n🔧 Immediate Actions:');
  log('1. Configure Darwin API token in .env.local');
  log('2. Choose: Enable Knowledge Station OR disable it');
  log('3. Use non-PowerShell terminal if seeing pipe errors');
  log('4. Restart development server after environment changes');
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection: ${reason}`);
  console.error(promise);
});

// Run the fix
main().catch((error) => {
  logError(`Fix script failed: ${error.message}`);
  console.error(error);
});
