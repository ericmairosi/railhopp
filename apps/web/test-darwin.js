#!/usr/bin/env node

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const https = require('https');
const http = require('http');

class DarwinTester {
  constructor() {
    this.results = {
      configuration: {},
      connectivity: {},
      apiEndpoints: {}
    };
  }

  async runTests() {
    console.log('🚄 Darwin API Comprehensive Test');
    console.log('================================\n');

    await this.testConfiguration();
    await this.testConnectivity();
    await this.testApiEndpoints();
    
    this.displayResults();
  }

  async testConfiguration() {
    console.log('📋 Testing Configuration...\n');
    
    // Check environment variables
    const pubsubConfig = {
      queueUrl: process.env.DARWIN_QUEUE_URL,
      username: process.env.DARWIN_USERNAME,
      password: process.env.DARWIN_PASSWORD,
      queueName: process.env.DARWIN_QUEUE_NAME,
      clientId: process.env.DARWIN_CLIENT_ID,
      enabled: process.env.DARWIN_ENABLED
    };

    const soapConfig = {
      apiUrl: process.env.DARWIN_API_URL,
      apiToken: process.env.DARWIN_API_TOKEN
    };

    console.log('Darwin Pub/Sub Configuration:');
    console.log(`  Queue URL: ${pubsubConfig.queueUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Username: ${pubsubConfig.username ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Password: ${pubsubConfig.password ? '✅ Masked' : '❌ Missing'}`);
    console.log(`  Queue Name: ${pubsubConfig.queueName ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Client ID: ${pubsubConfig.clientId ? '✅ Set' : '❌ Missing'}`);
    console.log(`  Enabled: ${pubsubConfig.enabled}`);

    console.log('\nLegacy Darwin SOAP Configuration:');
    console.log(`  API URL: ${soapConfig.apiUrl ? '✅ Set' : '❌ Missing'}`);
    console.log(`  API Token: ${soapConfig.apiToken ? '✅ Set' : '❌ Missing'}`);

    const pubsubConfigured = !!(pubsubConfig.queueUrl && pubsubConfig.username && pubsubConfig.password && pubsubConfig.enabled === 'true');
    const soapConfigured = !!(soapConfig.apiUrl && soapConfig.apiToken);

    this.results.configuration = {
      pubsubConfigured,
      soapConfigured,
      pubsubConfig,
      soapConfig: {
        ...soapConfig,
        apiToken: soapConfig.apiToken ? '***' + soapConfig.apiToken.slice(-8) : null
      }
    };

    console.log(`\n🔧 Configuration Status:`);
    console.log(`  Darwin Pub/Sub: ${pubsubConfigured ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`  Darwin SOAP: ${soapConfigured ? '✅ Configured' : '❌ Not configured'}`);
  }

  async testConnectivity() {
    console.log('\n🌐 Testing Connectivity...\n');

    // Test Darwin Pub/Sub queue connectivity (simplified)
    if (this.results.configuration.pubsubConfigured) {
      try {
        console.log('Testing Darwin Pub/Sub queue connectivity...');
        const queueUrl = process.env.DARWIN_QUEUE_URL;
        const [protocol, , host, port] = queueUrl.split(':');
        const hostname = host.replace('//', '');
        const portNum = parseInt(port) || (protocol === 'ssl' ? 61617 : 61616);

        const isReachable = await this.testTcpConnection(hostname, portNum);
        console.log(`  Queue Server (${hostname}:${portNum}): ${isReachable ? '✅ Reachable' : '❌ Unreachable'}`);
        
        this.results.connectivity.pubsubQueue = isReachable;
      } catch (error) {
        console.log(`  Queue Server: ❌ Error - ${error.message}`);
        this.results.connectivity.pubsubQueue = false;
      }
    }

    // Test SOAP API if configured
    if (this.results.configuration.soapConfigured) {
      try {
        console.log('Testing Darwin SOAP API connectivity...');
        const response = await this.makeHttpRequest(process.env.DARWIN_API_URL, {
          method: 'GET',
          timeout: 5000
        });
        console.log(`  SOAP API Endpoint: ${response ? '✅ Reachable' : '❌ Unreachable'}`);
        this.results.connectivity.soapApi = !!response;
      } catch (error) {
        console.log(`  SOAP API Endpoint: ❌ Error - ${error.message}`);
        this.results.connectivity.soapApi = false;
      }
    }
  }

  async testApiEndpoints() {
    console.log('\n🔌 Testing API Endpoints...\n');

    const endpoints = [
      { path: '/api/status', name: 'API Status' },
      { path: '/api/darwin/departures?crs=KGX', name: 'Darwin Departures' },
      { path: '/api/disruptions', name: 'Disruptions' }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name}...`);
        const response = await this.makeHttpRequest(`http://localhost:3000${endpoint.path}`, {
          method: 'GET',
          timeout: 10000
        });

        if (response && response.data) {
          let status = '✅ Working';
          let details = '';
          
          if (endpoint.path.includes('/darwin/departures')) {
            if (response.success === false) {
              status = '⚠️  API not configured';
              details = response.error?.message || '';
            }
          }

          console.log(`  ${endpoint.name}: ${status}`);
          if (details) console.log(`    Details: ${details}`);
          
          this.results.apiEndpoints[endpoint.name] = {
            working: response.success !== false,
            response: response
          };
        } else {
          console.log(`  ${endpoint.name}: ❌ No response`);
          this.results.apiEndpoints[endpoint.name] = {
            working: false,
            error: 'No response'
          };
        }
      } catch (error) {
        console.log(`  ${endpoint.name}: ❌ Error - ${error.message}`);
        this.results.apiEndpoints[endpoint.name] = {
          working: false,
          error: error.message
        };
      }
    }
  }

  displayResults() {
    console.log('\n📊 Test Results Summary');
    console.log('=======================\n');

    // Configuration Summary
    console.log('Configuration:');
    console.log(`  Darwin Pub/Sub: ${this.results.configuration.pubsubConfigured ? '✅ Ready' : '❌ Missing credentials'}`);
    console.log(`  Darwin SOAP: ${this.results.configuration.soapConfigured ? '✅ Ready' : '❌ Missing credentials'}`);

    // Connectivity Summary
    console.log('\nConnectivity:');
    if (this.results.connectivity.pubsubQueue !== undefined) {
      console.log(`  Pub/Sub Queue: ${this.results.connectivity.pubsubQueue ? '✅ Accessible' : '❌ Cannot reach'}`);
    }
    if (this.results.connectivity.soapApi !== undefined) {
      console.log(`  SOAP API: ${this.results.connectivity.soapApi ? '✅ Accessible' : '❌ Cannot reach'}`);
    }

    // API Endpoints Summary
    console.log('\nAPI Endpoints:');
    Object.entries(this.results.apiEndpoints).forEach(([name, result]) => {
      console.log(`  ${name}: ${result.working ? '✅ Working' : '❌ Not working'}`);
    });

    // Overall Assessment
    console.log('\n🎯 Overall Assessment:');
    const pubsubReady = this.results.configuration.pubsubConfigured;
    const soapReady = this.results.configuration.soapConfigured;

    if (pubsubReady) {
      console.log('✅ Darwin Pub/Sub is configured and ready');
      console.log('   This is the recommended modern approach for real-time data');
      console.log('   ⚠️  However, Pub/Sub requires a backend service to maintain JMS connection');
    }

    if (soapReady) {
      console.log('✅ Darwin SOAP API is configured');
      console.log('   This is the legacy API for departure/arrival data');
    }

    if (!pubsubReady && !soapReady) {
      console.log('❌ Darwin is not properly configured');
      console.log('   You need to set up either Pub/Sub or SOAP API credentials');
    }

    console.log('\n💡 Recommendations:');
    if (pubsubReady) {
      console.log('• Consider implementing a backend service for Darwin Pub/Sub');
      console.log('• This will provide real-time updates via JMS messaging');
    }
    if (!this.results.apiEndpoints['Darwin Departures']?.working) {
      console.log('• Darwin departures API is not working - check configuration');
    }
    console.log('• The system will fall back to RTT API and mock data when Darwin is unavailable');
  }

  async testTcpConnection(hostname, port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 5000);

      socket.connect(port, hostname, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  async makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const lib = urlObj.protocol === 'https:' ? https : http;
      
      const req = lib.request(url, {
        method: options.method || 'GET',
        timeout: options.timeout || 5000,
        headers: options.headers || {}
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (e) {
            resolve({ data: data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }
}

// Run the tests if called directly
if (require.main === module) {
  const tester = new DarwinTester();
  tester.runTests().catch(console.error);
}

module.exports = DarwinTester;
