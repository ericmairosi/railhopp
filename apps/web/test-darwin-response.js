// Test Darwin API response
const fetch = require('node-fetch');

async function testDarwinAPI() {
  try {
    console.log('Testing Darwin API...');
    const response = await fetch('http://localhost:3000/api/darwin/departures?crs=KGX&numRows=5');
    const data = await response.json();
    
    console.log('=== Darwin API Response Analysis ===');
    console.log('Success:', data.success);
    console.log('Source:', data.source);
    console.log('Station:', data.data.stationName, `(${data.data.stationCode})`);
    console.log('Generated At:', data.data.generatedAt);
    console.log('Services Found:', data.data.departures.length);
    
    console.log('\n=== Departures ===');
    data.data.departures.forEach((dep, i) => {
      console.log(`${i + 1}. ${dep.std} → ${dep.destination}`);
      console.log(`   Status: ${dep.etd}`);
      console.log(`   Platform: ${dep.platform || 'TBA'}`);
      console.log(`   Operator: ${dep.operator}`);
      if (dep.delayReason) console.log(`   Delay: ${dep.delayReason}`);
      if (dep.cancelReason) console.log(`   Cancelled: ${dep.cancelReason}`);
      console.log('');
    });
    
    console.log('=== API Status ===');
    console.log('Configured:', data.apiStatus.configured);
    console.log('Working:', data.apiStatus.working);
    console.log('Services Found:', data.apiStatus.servicesFound);
    
  } catch (error) {
    console.error('Error testing Darwin API:', error.message);
  }
}

testDarwinAPI();
