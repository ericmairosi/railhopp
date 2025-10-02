// API route for comprehensive journey planning
import { NextRequest, NextResponse } from 'next/server'

interface JourneyPlanRequest {
  from: string
  to: string
  date: string
  time: string
  passengers: number
  type: 'depart' | 'arrive'
}

interface JourneyOption {
  id: string
  departureTime: string
  arrivalTime: string
  duration: string
  changes: number
  operator: string
  price?: {
    adult: number
    currency: string
  }
  status: 'on-time' | 'delayed' | 'cancelled' | 'disrupted'
  delay?: number
  platforms?: {
    departure?: string
    arrival?: string
  }
  segments: JourneySegment[]
  disruptions?: string[]
  realTimeData: boolean
}

interface JourneySegment {
  id: string
  from: { code: string; name: string }
  to: { code: string; name: string }
  departureTime: string
  arrivalTime: string
  operator: string
  serviceId?: string
  platform?: string
  duration: string
  status: 'on-time' | 'delayed' | 'cancelled'
  delay?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: JourneyPlanRequest = await request.json()
    const { from, to, date, time, passengers, type } = body

    if (!from || !to || !date || !time) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    console.log(`Planning journey from ${from} to ${to} on ${date} at ${time}`)

    // No mock fallback: require real journey planning integration
    const simulate = process.env.ENABLE_JOURNEY_SIMULATION === 'true'
    if (!simulate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_DISABLED',
            message:
              'Journey planner is not yet integrated with a real API. No mock fallback is used. Configure a journey API or enable simulation explicitly.',
            details: {
              enableSimulation: 'Set ENABLE_JOURNEY_SIMULATION=true to enable simulated results in development only',
            },
          },
        },
        { status: 503 }
      )
    }

    // Simulation path (development only)

    // In a real implementation, this would integrate with multiple APIs:
    // 1. Darwin API for real-time data
    // 2. National Rail Enquiries for timetables
    // 3. Trainline/other booking APIs for prices
    // 4. Network Rail for disruptions

    const journeyOptions: JourneyOption[] = []

    // Generate realistic journey options based on common UK routes
    const routeData = getRouteData(from, to)
    const baseDateTime = new Date(`${date}T${time}`)

    // Generate multiple journey options
    for (let i = 0; i < routeData.services.length; i++) {
      const service = routeData.services[i]
      const departTime = new Date(baseDateTime.getTime() + i * service.frequency * 60000)
      const arrivalTime = new Date(departTime.getTime() + service.duration * 60000)

      // Use deterministic variations based on service index to prevent hydration issues
      const hasDelay = i % 7 === 0 // Every 7th service has delay
      const isCancelled = i % 50 === 0 // Every 50th service is cancelled
      const actualDelay = hasDelay ? ((i % 4) + 1) * 5 : 0 // 5, 10, 15, or 20 min delays

      const journeyOption: JourneyOption = {
        id: `journey-${from}-${to}-${i}`,
        departureTime: departTime.toTimeString().slice(0, 5),
        arrivalTime: new Date(arrivalTime.getTime() + actualDelay * 60000)
          .toTimeString()
          .slice(0, 5),
        duration: formatDuration(service.duration + actualDelay),
        changes: service.changes,
        operator: service.operator,
        price: service.price,
        status: isCancelled ? 'cancelled' : hasDelay ? 'delayed' : 'on-time',
        delay: actualDelay > 0 ? actualDelay : undefined,
        platforms: {
          departure: service.platforms?.departure,
          arrival: service.platforms?.arrival,
        },
        segments: service.segments.map((segment: SimpleSegment, segIdx: number): JourneySegment => ({
          ...segment,
          id: `segment-${i}-${segIdx}`,
          departureTime:
            segIdx === 0
              ? departTime.toTimeString().slice(0, 5)
              : new Date(departTime.getTime() + segIdx * 60 * 60000).toTimeString().slice(0, 5),
          arrivalTime:
            segIdx === service.segments.length - 1
              ? new Date(arrivalTime.getTime() + actualDelay * 60000).toTimeString().slice(0, 5)
              : new Date(departTime.getTime() + (segIdx + 1) * 60 * 60000)
                  .toTimeString()
                  .slice(0, 5),
          status: isCancelled ? 'cancelled' : hasDelay && segIdx === 0 ? 'delayed' : 'on-time',
          delay: hasDelay && segIdx === 0 ? actualDelay : undefined,
        })),
        disruptions: hasDelay ? [`Service delayed due to ${getDelayReason(i)}`] : undefined,
        realTimeData: true,
      }

      journeyOptions.push(journeyOption)
    }

    // Sort by departure time
    journeyOptions.sort((a, b) => a.departureTime.localeCompare(b.departureTime))

    return NextResponse.json({
      success: true,
      data: {
        journeys: journeyOptions,
        searchCriteria: { from, to, date, time, passengers, type },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Journey planning error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'JOURNEY_PLAN_ERROR',
          message: 'Failed to plan journey',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

type SimpleSegment = { from: { code: string; name: string }; to: { code: string; name: string }; operator: string; duration: string }

type RouteService = {
  operator: string
  duration: number
  frequency: number
  changes: number
  price?: { adult: number; currency: string }
  platforms?: { departure?: string; arrival?: string }
  segments: SimpleSegment[]
}

type RouteData = { services: RouteService[] }

function getRouteData(from: string, to: string): RouteData {
  // Simulate route data based on common UK rail connections
  const routes: Record<string, RouteData> = {
    'KGX-YOR': {
      services: [
        {
          operator: 'LNER',
          duration: 120, // 2 hours
          frequency: 30, // Every 30 minutes
          changes: 0,
          price: { adult: 45, currency: 'GBP' },
          platforms: { departure: '1', arrival: '3' },
          segments: [
            {
              from: { code: 'KGX', name: 'London Kings Cross' },
              to: { code: 'YOR', name: 'York' },
              operator: 'LNER',
              duration: '2h 0m',
            },
          ],
        },
      ],
    },
    'KGX-EDB': {
      services: [
        {
          operator: 'LNER',
          duration: 280, // 4h 40m
          frequency: 60, // Every hour
          changes: 0,
          price: { adult: 85, currency: 'GBP' },
          platforms: { departure: '2', arrival: '1' },
          segments: [
            {
              from: { code: 'KGX', name: 'London Kings Cross' },
              to: { code: 'EDB', name: 'Edinburgh Waverley' },
              operator: 'LNER',
              duration: '4h 40m',
            },
          ],
        },
      ],
    },
    'KGX-MAN': {
      services: [
        {
          operator: 'Avanti West Coast',
          duration: 130, // 2h 10m
          frequency: 45, // Every 45 minutes
          changes: 0,
          price: { adult: 55, currency: 'GBP' },
          platforms: { departure: '4', arrival: '2' },
          segments: [
            {
              from: { code: 'KGX', name: 'London Kings Cross' },
              to: { code: 'MAN', name: 'Manchester Piccadilly' },
              operator: 'Avanti West Coast',
              duration: '2h 10m',
            },
          ],
        },
      ],
    },
  }

  const routeKey = `${from}-${to}`
  const reverseKey = `${to}-${from}`

  // Return route data or generate default
  if (routes[routeKey]) {
    return routes[routeKey]
  } else if (routes[reverseKey]) {
    // Reverse the route
    const reverseRoute: RouteData = { ...routes[reverseKey] }
    reverseRoute.services = reverseRoute.services.map((service: RouteService) => ({
      ...service,
      segments: service.segments.map((segment: SimpleSegment) => ({
        ...segment,
        from: segment.to,
        to: segment.from,
      })),
    }))
    return reverseRoute
  }

  // Default route data for unknown routes
  return {
    services: [
      {
        operator: 'National Rail',
        duration: 90, // 1h 30m default
        frequency: 30,
        changes: 0,
        price: { adult: 35, currency: 'GBP' },
        segments: [
          {
            from: { code: from, name: `Station ${from}` },
            to: { code: to, name: `Station ${to}` },
            operator: 'National Rail',
            duration: '1h 30m',
          },
        ],
      },
    ],
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

function getDelayReason(index: number): string {
  const reasons = [
    'signal failure',
    'points failure',
    'overhead line problems',
    'trespassing incident',
    'weather conditions',
    'earlier incident',
    'crew availability',
    'technical fault',
  ]

  return reasons[index % reasons.length]
}
