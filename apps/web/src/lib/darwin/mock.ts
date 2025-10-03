// Mock Darwin data for testing and fallback when API is not available
import { LiveStationBoard, LiveDeparture, TrainServiceDetails } from './types'

export const mockStations = [
  { code: 'KGX', name: 'London Kings Cross' },
  { code: 'MAN', name: 'Manchester Piccadilly' },
  { code: 'BHM', name: 'Birmingham New Street' },
  { code: 'LDS', name: 'Leeds' },
  { code: 'EDB', name: 'Edinburgh' },
  { code: 'GLA', name: 'Glasgow Central' },
  { code: 'LIV', name: 'Liverpool Lime Street' },
  { code: 'YOR', name: 'York' },
  { code: 'NCL', name: 'Newcastle' },
  { code: 'BRI', name: 'Bristol Temple Meads' },
]

export function generateMockDepartures(stationCode: string, numRows: number = 10): LiveDeparture[] {
  const station = mockStations.find((s) => s.code === stationCode) || mockStations[0]
  const now = new Date()

  const operators = [
    { name: 'London North Eastern Railway', code: 'GR' },
    { name: 'CrossCountry', code: 'XC' },
    { name: 'Northern Rail', code: 'NT' },
    { name: 'TransPennine Express', code: 'TP' },
    { name: 'Great Western Railway', code: 'GW' },
    { name: 'Avanti West Coast', code: 'AW' },
  ]

  const destinations = mockStations.filter((s) => s.code !== stationCode)

  const departures: LiveDeparture[] = []

  for (let i = 0; i < numRows; i++) {
    const departureTime = new Date(now.getTime() + (i * 15 + Math.random() * 10) * 60000)
    const operator = operators[Math.floor(Math.random() * operators.length)]
    const destination = destinations[Math.floor(Math.random() * destinations.length)]

    const scheduledTime = departureTime.toTimeString().slice(0, 5)
    const delayMinutes = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 20)
    const estimatedTime =
      delayMinutes > 0
        ? new Date(departureTime.getTime() + delayMinutes * 60000).toTimeString().slice(0, 5)
        : scheduledTime

    const isCancelled = Math.random() < 0.05 // 5% chance of cancellation

    departures.push({
      serviceID: `${operator.code}_${Date.now()}_${i}`,
      operator: operator.name,
      operatorCode: operator.code,
      std: scheduledTime, // scheduled departure time
      etd: isCancelled ? 'Cancelled' : delayMinutes > 0 ? estimatedTime : 'On time',
      destination: destination.name,
      destinationCRS: destination.code,
      origin: station.name,
      originCRS: station.code,
      platform: String(Math.floor(Math.random() * 15) + 1) + (Math.random() < 0.3 ? 'A' : ''),
      length: Math.floor(Math.random() * 8) + 4,
      cancelled: isCancelled,
      cancelReason: isCancelled ? 'Due to a signalling problem' : undefined,
      delayReason: delayMinutes > 5 ? 'Due to earlier delays' : undefined,
      serviceType: 'P', // Passenger service
    })
  }

  return departures.sort((a, b) => a.std.localeCompare(b.std))
}

export function getMockStationBoard(request: { crs: string; numRows?: number }): LiveStationBoard {
  return generateMockStationBoard(request.crs, request.numRows || 10)
}

export function generateMockStationBoard(
  stationCode: string,
  numRows: number = 10
): LiveStationBoard {
  const station = mockStations.find((s) => s.code === stationCode) || mockStations[0]
  const departures = generateMockDepartures(stationCode, numRows)

  const messages = []

  // Add some random service messages
  if (Math.random() < 0.3) {
    messages.push({
      severity: 'info' as const,
      message: 'Good service is currently operating on all lines.',
      category: 'SERVICE_UPDATE',
    })
  }

  if (Math.random() < 0.2) {
    messages.push({
      severity: 'warning' as const,
      message: 'Due to earlier delays, some services may be running up to 10 minutes late.',
      category: 'DELAY_WARNING',
    })
  }

  return {
    locationName: station.name,
    crs: station.code,
    stationName: station.name,
    stationCode: station.code,
    generatedAt: new Date().toISOString(),
    departures,
    messages,
    platformsAvailable: true,
  }
}

export function generateMockServiceDetails(serviceId: string): TrainServiceDetails {
  const operators = [
    { name: 'London North Eastern Railway', code: 'GR' },
    { name: 'CrossCountry', code: 'XC' },
    { name: 'Northern Rail', code: 'NT' },
  ]

  const operator = operators[Math.floor(Math.random() * operators.length)]
  const delayMinutes = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 15)
  const isCancelled = Math.random() < 0.05

  // Generate calling points
  const allStations = [...mockStations]
  const numStops = Math.floor(Math.random() * 8) + 3
  const callingStations = allStations.slice(0, numStops)

  const previousCallingPoints = [
    {
      callingPoint: callingStations.slice(0, Math.floor(numStops / 2)).map((station, index) => ({
        locationName: station.name,
        crs: station.code,
        st: new Date(Date.now() - (numStops - index) * 15 * 60000).toTimeString().slice(0, 5),
        at: new Date(Date.now() - (numStops - index) * 15 * 60000 + Math.random() * 5 * 60000)
          .toTimeString()
          .slice(0, 5),
        isCancelled: false,
      })),
    },
  ]

  const subsequentCallingPoints = [
    {
      callingPoint: callingStations.slice(Math.floor(numStops / 2) + 1).map((station, index) => {
        const schedTime = new Date(Date.now() + (index + 1) * 15 * 60000)
        const estTime = new Date(schedTime.getTime() + delayMinutes * 60000)
        return {
          locationName: station.name,
          crs: station.code,
          st: schedTime.toTimeString().slice(0, 5),
          et: isCancelled ? undefined : estTime.toTimeString().slice(0, 5),
          isCancelled,
        }
      }),
    },
  ]

  return {
    serviceID: serviceId,
    operator: operator.name,
    operatorCode: operator.code,
    runDate: new Date().toISOString().slice(0, 10),
    platform: String(Math.floor(Math.random() * 15) + 1) + (Math.random() < 0.3 ? 'A' : ''),
    length: Math.floor(Math.random() * 8) + 4,
    formation: { avgLoading: Math.floor(Math.random() * 100) },
    delayReason: delayMinutes > 5 ? 'Due to earlier network congestion' : undefined,
    cancelReason: isCancelled ? 'Due to a signalling problem' : undefined,
    origin: [
      {
        locationName: callingStations[0]?.name || 'Origin',
        crs: callingStations[0]?.code || 'OR1',
      },
    ],
    destination: [
      {
        locationName: callingStations[callingStations.length - 1]?.name || 'Destination',
        crs: callingStations[callingStations.length - 1]?.code || 'DST',
      },
    ],
    previousCallingPoints,
    subsequentCallingPoints,
  }
}

// Check if we should use mock data (when Darwin API is not configured or failing)
export function shouldUseMockData(): boolean {
  // Use mock data if Darwin API is not properly configured
  const hasApiKey = Boolean(
    process.env.DARWIN_API_KEY &&
      process.env.DARWIN_API_KEY !== 'your_darwin_api_token_here' &&
      process.env.DARWIN_API_KEY !== 'your_darwin_api_key_here' &&
      process.env.DARWIN_API_KEY !== 'your_darwin_api_key' &&
      process.env.DARWIN_API_KEY.length > 10 // Basic validation
  )

  // For development, you can force mock mode by setting FORCE_MOCK_DATA=true
  const forceMock = process.env.FORCE_MOCK_DATA === 'true'

  // Use environment variable to control mock data usage
  const mockDataEnabled = process.env.USE_MOCK_DATA !== 'false'

  return !hasApiKey || forceMock || !mockDataEnabled
}
