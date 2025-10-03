// API route for network disruptions and service alerts
import { NextRequest, NextResponse } from 'next/server'

interface DisruptionSource {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'severe'
  category: 'planned' | 'unplanned' | 'weather' | 'industrial' | 'technical'
  affectedRoutes: string[]
  affectedOperators: string[]
  startTime: string
  endTime?: string
  lastUpdated: string
  source: 'darwin' | 'networkrail' | 'knowledge-station'
  externalUrl?: string
}

interface NetworkStatus {
  overall: 'good' | 'minor' | 'major' | 'severe'
  disruptions: DisruptionSource[]
  lastUpdated: string
  summary: {
    total: number
    planned: number
    unplanned: number
    severe: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const operator = searchParams.get('operator')
    const route = searchParams.get('route')
    const severity = searchParams.get('severity')
    const includeResolved = searchParams.get('includeResolved') === 'true'

    console.log('Fetching network disruptions and service alerts')

    const disruptions: DisruptionSource[] = []

    // Fetch from Knowledge Station API if available
    if (
      process.env.KNOWLEDGE_STATION_ENABLED === 'true' &&
      process.env.KNOWLEDGE_STATION_API_TOKEN
    ) {
      try {
        const ksDisruptions = await fetchKnowledgeStationDisruptions()
        disruptions.push(...ksDisruptions)
      } catch (error) {
        console.warn('Knowledge Station disruptions fetch failed:', error)
      }
    }

    // Fetch from Network Rail if available
    try {
      const networkRailDisruptions = await fetchNetworkRailDisruptions()
      disruptions.push(...networkRailDisruptions)
    } catch (error) {
      console.warn('Network Rail disruptions fetch failed:', error)
    }

    // If no real disruption data is available, do not fall back to mock data (per project rules)
    // Proceed with empty list and computed summary

    // Apply filters
    let filteredDisruptions = disruptions

    if (operator) {
      filteredDisruptions = filteredDisruptions.filter((d) =>
        d.affectedOperators.some((op) => op.toLowerCase().includes(operator.toLowerCase()))
      )
    }

    if (route) {
      filteredDisruptions = filteredDisruptions.filter((d) =>
        d.affectedRoutes.some((r) => r.toLowerCase().includes(route.toLowerCase()))
      )
    }

    if (severity) {
      filteredDisruptions = filteredDisruptions.filter((d) => d.severity === severity)
    }

    if (!includeResolved) {
      const now = new Date()
      filteredDisruptions = filteredDisruptions.filter(
        (d) => !d.endTime || new Date(d.endTime) > now
      )
    }

    // Calculate overall network status
    const severeCounts = filteredDisruptions.reduce(
      (acc, d) => {
        if (d.severity === 'severe') acc.severe++
        if (d.severity === 'high') acc.high++
        return acc
      },
      { severe: 0, high: 0 }
    )

    const overallStatus =
      severeCounts.severe > 0
        ? 'severe'
        : severeCounts.high > 2
          ? 'major'
          : filteredDisruptions.length > 5
            ? 'minor'
            : 'good'

    const summary = {
      total: filteredDisruptions.length,
      planned: filteredDisruptions.filter((d) => d.category === 'planned').length,
      unplanned: filteredDisruptions.filter((d) => d.category === 'unplanned').length,
      severe: filteredDisruptions.filter((d) => d.severity === 'severe').length,
    }

    const networkStatus: NetworkStatus = {
      overall: overallStatus,
      disruptions: filteredDisruptions,
      lastUpdated: new Date().toISOString(),
      summary,
    }

    return NextResponse.json({
      success: true,
      data: networkStatus,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Disruptions API error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DISRUPTIONS_ERROR',
          message: 'Failed to fetch network disruptions',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

async function fetchKnowledgeStationDisruptions(): Promise<DisruptionSource[]> {
  const apiUrl = process.env.KNOWLEDGE_STATION_API_URL
  const apiUsername = process.env.KNOWLEDGE_STATION_API_USERNAME
  const apiPassword = process.env.KNOWLEDGE_STATION_API_PASSWORD

  if (!apiUrl || !apiUsername || !apiPassword) {
    console.log('RTT API not configured - missing credentials')
    return []
  }

  try {
    console.log('Attempting to fetch RTT disruption data...')

    // Use correct username/password authentication for RTT API
    const authHeader = `Basic ${Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64')}`

    // Test authentication with a simple search query
    const testResponse = await fetch(`${apiUrl}/json/search/BMH`, {
      headers: {
        Authorization: authHeader,
        'User-Agent': 'Railhopp/1.0',
      },
    })

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.log(`RTT API authentication failed: ${testResponse.status} - ${errorText}`)
      return []
    }

    console.log('RTT API authentication successful')

    // RTT doesn't have a direct disruptions endpoint, but we can analyze service data
    // to identify potential disruptions by looking at delays and cancellations
    const disruptions: DisruptionSource[] = []

    // Check major stations for service disruptions
    const majorStations = ['LBG', 'VIC', 'WAT', 'KGX', 'EUS', 'PAD']

    for (const station of majorStations.slice(0, 3)) {
      // Limit requests
      try {
        const stationResponse = await fetch(`${apiUrl}/json/search/${station}`, {
          headers: {
            Authorization: authHeader,
            'User-Agent': 'Railhopp/1.0',
          },
        })

        if (stationResponse.ok) {
          const stationData = await stationResponse.json()

          // Analyze services for disruptions
          if (stationData.services && Array.isArray(stationData.services)) {
            const problematicServices = stationData.services.filter((service: unknown) => {
              const s = (service || {}) as Record<string, unknown>
              // Check for cancellations
              if (s.isCancelled === true) return true

              // Check for significant delays (more than 10 minutes)
              const booked =
                typeof s.gbttBookedDeparture === 'string' ? s.gbttBookedDeparture : undefined
              const realtime =
                typeof s.realtimeDeparture === 'string' ? s.realtimeDeparture : undefined
              if (booked && realtime) {
                const scheduled = new Date(`2024-01-01T${booked}:00`)
                const actual = new Date(`2024-01-01T${realtime}:00`)
                const delayMinutes = (actual.getTime() - scheduled.getTime()) / (1000 * 60)
                if (delayMinutes > 10) return true
              }

              return false
            })

            // If multiple services are affected, consider it a disruption
            if (problematicServices.length >= 2) {
              const cancelledCount = problematicServices.filter(
                (svc: unknown) => (svc as Record<string, unknown>).isCancelled === true
              ).length
              const severity =
                cancelledCount > 2 ? 'high' : problematicServices.length > 4 ? 'medium' : 'low'

              disruptions.push({
                id: `rtt-${station}-${Date.now()}`,
                title: `Service Disruptions at ${stationData.location?.name || station}`,
                description: `${problematicServices.length} services affected with delays or cancellations. ${cancelledCount} cancelled services.`,
                severity: severity as DisruptionSource['severity'],
                category: 'unplanned' as const,
                affectedRoutes: [
                  ...new Set(
                    problematicServices
                      .map((svc: unknown) => {
                        const sd = (svc as Record<string, unknown>).locationDetail as
                          | Record<string, unknown>
                          | undefined
                        const destArr = (sd?.destination as unknown[]) || []
                        const first = (destArr[0] || {}) as Record<string, unknown>
                        return typeof first.description === 'string' ? first.description : undefined
                      })
                      .filter(Boolean) as string[]
                  ),
                ],
                affectedOperators: [
                  ...new Set(
                    problematicServices
                      .map((svc: unknown) => {
                        const name = (svc as Record<string, unknown>).atocName
                        return typeof name === 'string' ? name : undefined
                      })
                      .filter(Boolean) as string[]
                  ),
                ],
                startTime: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                source: 'knowledge-station' as const,
              })
            }
          }
        }
      } catch (stationError) {
        console.log(`Failed to fetch data for station ${station}:`, stationError)
      }
    }

    console.log(`Found ${disruptions.length} disruptions from RTT API`)
    return disruptions
  } catch (error) {
    console.error('RTT API fetch failed:', error)
    return []
  }
}

async function fetchNetworkRailDisruptions(): Promise<DisruptionSource[]> {
  const darwinApiUrl = process.env.DARWIN_API_URL
  const darwinApiToken = process.env.DARWIN_API_TOKEN

  if (!darwinApiUrl || !darwinApiToken) {
    console.log('Darwin API not configured')
    return []
  }

  try {
    // Darwin API uses SOAP, but we'll try the RESTful approach first
    // Note: Darwin's REST API might not have direct disruption endpoints
    // This is a simplified implementation - real Darwin integration would need SOAP client

    // For now, we'll focus on the RTT API which provides better disruption data
    // Darwin is primarily for live departure/arrival data
    console.log(
      'Darwin API integration for disruptions not yet implemented - using RTT API instead'
    )
    return []
  } catch (error) {
    console.error('Darwin API fetch failed:', error)
    return []
  }
}

function mapSeverity(severity: string): DisruptionSource['severity'] {
  const sev = severity?.toLowerCase()
  if (sev?.includes('severe') || sev?.includes('major')) return 'severe'
  if (sev?.includes('high') || sev?.includes('significant')) return 'high'
  if (sev?.includes('medium') || sev?.includes('moderate')) return 'medium'
  return 'low'
}

function mapAlertSeverity(severity: string | undefined): DisruptionSource['severity'] {
  if (!severity) return 'medium'
  const sev = severity.toLowerCase()
  if (sev.includes('severe') || sev.includes('major') || sev.includes('critical')) return 'severe'
  if (sev.includes('high') || sev.includes('significant') || sev.includes('important'))
    return 'high'
  if (sev.includes('medium') || sev.includes('moderate') || sev.includes('warning')) return 'medium'
  return 'low'
}

function mapIncidentSeverity(severity: string | undefined): DisruptionSource['severity'] {
  if (!severity) return 'high' // Incidents are generally more serious
  const sev = severity.toLowerCase()
  if (sev.includes('severe') || sev.includes('major') || sev.includes('critical')) return 'severe'
  if (sev.includes('high') || sev.includes('significant')) return 'high'
  if (sev.includes('medium') || sev.includes('moderate')) return 'medium'
  return 'low'
}

function mapCategory(category: string): DisruptionSource['category'] {
  const cat = category?.toLowerCase()
  if (cat?.includes('plan') || cat?.includes('engineer') || cat?.includes('maintenance'))
    return 'planned'
  if (
    cat?.includes('weather') ||
    cat?.includes('snow') ||
    cat?.includes('wind') ||
    cat?.includes('flood')
  )
    return 'weather'
  if (cat?.includes('strike') || cat?.includes('industrial') || cat?.includes('union'))
    return 'industrial'
  if (cat?.includes('signal') || cat?.includes('technical') || cat?.includes('equipment'))
    return 'technical'
  return 'unplanned'
}

function mapAlertCategory(text: string | undefined): DisruptionSource['category'] {
  if (!text) return 'unplanned'
  const txt = text.toLowerCase()
  if (
    txt.includes('plan') ||
    txt.includes('engineer') ||
    txt.includes('maintenance') ||
    txt.includes('work')
  )
    return 'planned'
  if (
    txt.includes('weather') ||
    txt.includes('snow') ||
    txt.includes('wind') ||
    txt.includes('flood') ||
    txt.includes('storm')
  )
    return 'weather'
  if (
    txt.includes('strike') ||
    txt.includes('industrial') ||
    txt.includes('union') ||
    txt.includes('staff')
  )
    return 'industrial'
  if (
    txt.includes('signal') ||
    txt.includes('technical') ||
    txt.includes('equipment') ||
    txt.includes('failure')
  )
    return 'technical'
  return 'unplanned'
}

function mapIncidentCategory(category: string | undefined): DisruptionSource['category'] {
  if (!category) return 'unplanned'
  const cat = category.toLowerCase()
  if (cat.includes('plan') || cat.includes('engineer') || cat.includes('maintenance'))
    return 'planned'
  if (cat.includes('weather') || cat.includes('environmental')) return 'weather'
  if (cat.includes('strike') || cat.includes('industrial') || cat.includes('staff'))
    return 'industrial'
  if (cat.includes('signal') || cat.includes('technical') || cat.includes('infrastructure'))
    return 'technical'
  return 'unplanned'
}
