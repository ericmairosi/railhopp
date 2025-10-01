// Test Darwin SOAP client independently
require('dotenv').config({ path: '.env.local' });

// Mock the imports since we can't directly run TypeScript
const mockConfig = {
  timeout: 10000,
  retries: 3
};

async function testDarwinSOAP() {
  console.log('=== Testing Darwin SOAP API Configuration ===');
  
  const apiUrl = process.env.DARWIN_API_URL;
  const apiToken = process.env.DARWIN_API_TOKEN;
  
  console.log('API URL:', apiUrl);
  console.log('API Token:', apiToken ? 'SET (hidden)' : 'NOT SET');
  
  const isConfigured = Boolean(
    apiUrl &&
    apiToken &&
    apiUrl.includes('nationalrail.co.uk')
  );
  
  console.log('SOAP Client Configured:', isConfigured);
  
  if (!isConfigured) {
    console.log('❌ Darwin SOAP not properly configured');
    return;
  }
  
  console.log('\n=== Testing Darwin SOAP Request ===');
  
  // Build SOAP request
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:typ="http://thalesgroup.com/RTTI/2013-11-28/Token/types" 
               xmlns:ldb="http://thalesgroup.com/RTTI/2017-10-01/ldb/">
  <soap:Header>
    <typ:AccessToken>
      <typ:TokenValue>${apiToken}</typ:TokenValue>
    </typ:AccessToken>
  </soap:Header>
  <soap:Body>
    <ldb:GetDepartureBoardRequest>
      <ldb:numRows>5</ldb:numRows>
      <ldb:crs>KGX</ldb:crs>
      <ldb:timeOffset>0</ldb:timeOffset>
      <ldb:timeWindow>120</ldb:timeWindow>
    </ldb:GetDepartureBoardRequest>
  </soap:Body>
</soap:Envelope>`;

  const soapHeaders = {
    'Content-Type': 'text/xml; charset=utf-8',
    'SOAPAction': '"http://thalesgroup.com/RTTI/2017-10-01/ldb/GetDepartureBoard"',
    'User-Agent': 'Railhopp/1.0',
    'Accept': '*/*',
    'Cache-Control': 'no-cache'
  };

  try {
    console.log('Making SOAP request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: soapHeaders,
      body: soapBody,
      signal: AbortSignal.timeout(10000)
    });

    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const xmlResponse = await response.text();
    console.log('Response Length:', xmlResponse.length);
    
    if (!response.ok) {
      console.log('❌ SOAP request failed');
      console.log('Response body (first 500 chars):', xmlResponse.substring(0, 500));
      return;
    }

    // Check for SOAP faults
    if (xmlResponse.includes('soap:Fault')) {
      const faultMatch = xmlResponse.match(/<faultstring>(.*?)<\/faultstring>/);
      const faultMessage = faultMatch ? faultMatch[1] : 'Unknown SOAP fault';
      console.log('❌ SOAP Fault:', faultMessage);
      console.log('Response body (first 1000 chars):', xmlResponse.substring(0, 1000));
      return;
    }

    console.log('✅ SOAP request successful!');
    
    // Look for key indicators in the response
    const hasStationName = xmlResponse.includes('<stationName>');
    const hasTrainServices = xmlResponse.includes('<trainServices>');
    const hasServices = xmlResponse.includes('<service>');
    
    console.log('\n=== Response Analysis ===');
    console.log('Contains station name:', hasStationName);
    console.log('Contains train services:', hasTrainServices);
    console.log('Contains individual services:', hasServices);
    
    if (hasStationName) {
      const stationMatch = xmlResponse.match(/<stationName>(.*?)<\/stationName>/);
      if (stationMatch) {
        console.log('Station Name:', stationMatch[1]);
      }
    }
    
    // Count services
    const serviceMatches = xmlResponse.match(/<service>/g);
    const serviceCount = serviceMatches ? serviceMatches.length : 0;
    console.log('Number of services found:', serviceCount);
    
    if (serviceCount > 0) {
      console.log('✅ Successfully received live departure data from Darwin SOAP API!');
      
      // Extract a sample service for verification
      const firstServiceMatch = xmlResponse.match(/<service>(.*?)<\/service>/s);
      if (firstServiceMatch) {
        console.log('\n=== Sample Service Data ===');
        const serviceXml = firstServiceMatch[1];
        
        // Extract key fields
        const std = serviceXml.match(/<std>(.*?)<\/std>/);
        const etd = serviceXml.match(/<etd>(.*?)<\/etd>/);
        const operator = serviceXml.match(/<operator>(.*?)<\/operator>/);
        const destination = serviceXml.match(/<locationName>(.*?)<\/locationName>/);
        
        console.log('Scheduled Departure:', std ? std[1] : 'N/A');
        console.log('Estimated Departure:', etd ? etd[1] : 'N/A');
        console.log('Operator:', operator ? operator[1] : 'N/A');
        console.log('Destination:', destination ? destination[1] : 'N/A');
      }
    } else {
      console.log('⚠️  No services found in response - this could be normal depending on time of day');
    }
    
  } catch (error) {
    console.error('❌ Error testing Darwin SOAP:', error.message);
    
    if (error.name === 'AbortError') {
      console.log('Request timed out - Darwin API might be slow or unavailable');
    }
  }
}

testDarwinSOAP().catch(console.error);
