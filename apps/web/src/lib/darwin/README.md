# Darwin Real Time Train Information Integration

## Overview

The Darwin API client has been **completely restructured** to use the correct **Darwin Real Time Train Information Pub/Sub messaging system** instead of the previous SOAP/REST approach.

Based on the official Darwin documentation (`P-d3bf124c-1058-4040-8a62-87181a877d59`), Darwin uses **JMS/ActiveMQ messaging** with **base64-encoded XML messages**.

## Architecture Change

### Previous (Incorrect) Architecture

- ❌ Used SOAP API calls to `https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb11.asmx`
- ❌ Made synchronous HTTP requests for data
- ❌ No real-time updates

### Current (Correct) Architecture

- ✅ Uses **Darwin Real Time Train Information Pub/Sub** system
- ✅ Connects to **JMS/ActiveMQ** message queues at `ssl://datafeeds.nationalrail.co.uk:61617`
- ✅ Subscribes to **real-time train status updates**
- ✅ Processes **base64-encoded XML messages** containing live train data

## Configuration

### Environment Variables

Update your `.env.local` file:

```bash
# Darwin Real Time Train Information Pub/Sub Configuration
DARWIN_QUEUE_URL=ssl://datafeeds.nationalrail.co.uk:61617
DARWIN_USERNAME=your_darwin_username
DARWIN_PASSWORD=your_darwin_password
DARWIN_QUEUE_NAME=Consumer.rdmportal.VirtualTopic.PushPort-v18
DARWIN_CLIENT_ID=railhopp_client
DARWIN_ENABLED=true
```

### Getting Credentials

1. Visit the **Rail Data Marketplace**: https://raildata.org.uk/
2. Register for an account
3. Subscribe to **Darwin Real Time Train Information** (Product ID: `P-d3bf124c-1058-4040-8a62-87181a877d59`)
4. You will receive your JMS credentials

## Technical Implementation

### Message Flow

1. **JMS Connection**: Backend service connects to Darwin JMS queue
2. **Message Receipt**: Receives real-time messages with base64-encoded XML data
3. **Message Processing**: Decodes and parses XML to extract train status updates
4. **Data Caching**: Maintains real-time cache of train positions and status
5. **API Serving**: Frontend queries processed data via REST endpoints

### Message Format

Darwin messages follow this structure:

```typescript
interface DarwinPubSubMessage {
  messageID: string
  timestamp: number
  bytes: string // Base64-encoded XML with train data
  properties: {
    Username: { string: string }
    PushPortSequence: { string: string }
  }
}
```

The `bytes` field contains XML like:

```xml
<Pport ts="2024-06-10T12:48:28.3014892+01:00" version="STG-17.0">
  <uR updateOrigin="TD">
    <TS rid="202406107149951" uid="G49951" ssd="2024-06-10">
      <Location tpl="STPXBOX" wta="12:47:30" wtd="12:48:30" pta="12:48" ptd="12:48">
        <arr at="12:47" atClass="Automatic" src="TD" />
        <dep at="12:48" atClass="Automatic" src="TD" />
        <plat platsrc="A" conf="true">B</plat>
        <length>8</length>
      </Location>
    </TS>
  </uR>
</Pport>
```

## Required Backend Service

**IMPORTANT**: Darwin Pub/Sub requires a backend service because:

1. **JMS/ActiveMQ cannot be accessed directly from browsers**
2. **WebSocket or Server-Sent Events** are needed for real-time frontend updates
3. **Message processing and caching** must happen server-side

### Required Backend Endpoints

Your backend service should implement:

```typescript
// REST API endpoints for querying processed Darwin data
GET / api / darwin / station / { crs } / departures
GET / api / darwin / service / { serviceId }

// WebSocket for real-time updates
WebSocket / api / darwin / realtime
```

### Backend Architecture

```
[Darwin JMS Queue]
       ↓
[Backend Service with JMS Client]
       ↓ (processes & caches)
[REST API + WebSocket Server]
       ↓
[Frontend React App]
```

## Usage

The client interface remains the same for backward compatibility:

```typescript
import { getDarwinClient } from './lib/darwin/client'

const client = getDarwinClient()

// Check if properly configured
if (client.isEnabled()) {
  // Get station departure board
  const board = await client.getStationBoard({
    crs: 'KGX',
    numRows: 10,
  })

  // Get service details
  const service = await client.getServiceDetails('serviceId')
}
```

## Migration Notes

1. **Environment Variables**: Update from `DARWIN_API_URL`/`DARWIN_API_TOKEN` to the new Pub/Sub variables
2. **Backend Service**: You **must** implement a backend service to handle JMS messaging
3. **Real-time Data**: Darwin now provides **live updates** instead of request/response
4. **Message Processing**: XML parsing now handles the Darwin Pub/Sub message format

## Error Handling

The new client provides detailed error messages explaining the architecture requirements:

```typescript
// Will throw detailed error explaining backend service requirement
try {
  await client.getStationBoard({ crs: 'KGX' })
} catch (error) {
  console.log(error.details.requiredBackendEndpoints)
  // Shows what backend endpoints you need to implement
}
```

## Data Quality

Darwin Pub/Sub provides **much better data quality**:

- ✅ **Real-time updates** as trains move
- ✅ **Live platform changes** and delays
- ✅ **Actual arrival/departure times** from signalling systems
- ✅ **Automatic updates** without polling
- ✅ **Lower latency** than SOAP API calls

## License Terms

According to the Rail Data Marketplace agreement:

- ✅ **Open license** - free access to licensed data
- ✅ **Distribution allowed** - can redistribute to third parties
- ✅ **Attribution required** - must credit Rail Delivery Group
- ✅ **1-year renewable term** - automatically renews

---

**Next Steps**: Implement the backend JMS service to complete the Darwin Pub/Sub integration.
