// API route for comprehensive journey planning (MVP using real data, no mocks)
import { NextRequest, NextResponse } from 'next/server'
import { getDarwinClient } from '@/lib/darwin/client'
import { rateLimit } from '@/lib/rate-limit'

// Prefer `type` over `interface` for TS types
export type JourneyPlanRequest = {
  from: string
  to: string
  date: string
  time: string
  passengers: number
  type: 'depart' | 'arrive'
}

export type JourneySegment = {
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

export type JourneyOption = {
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

async function enrichDirectJourneys(journeys: JourneyOption[], to: string) {
  try {
    const ks = (await import('@/lib/knowledge-station/client')).getKnowledgeStationClient()
    if (!ks.isEnabled()) return journeys

    const enriched: JourneyOption[] = []
    for (const j of journeys) {
      if (!j.segments?.[0]?.serviceId) {
        enriched.push(j)
        continue
      }
      try {
        const tracking = await ks.getServiceTracking({ serviceId: j.segments[0].serviceId })
        // Find arrival time at destination among nextStops
        const stop = tracking.nextStops.find((s) => s.crs?.toUpperCase() === to)
        if (stop && (stop.estimatedArrival || stop.scheduledArrival)) {
          const arr = (stop.estimatedArrival || stop.scheduledArrival)!.slice(0, 5)
          const dep = j.departureTime
          const durationMins = computeDurationMinutes(dep, arr)
          j.arrivalTime = arr
          j.duration = formatDuration(durationMins)
          if (j.segments?.[0]) {
            j.segments = [...j.segments]
            j.segments[0] = {
              ...j.segments[0],
              arrivalTime: arr,
              duration: formatDuration(durationMins),
            }
          }
        }
      } catch {}
      enriched.push(j)
    }
    return enriched
  } catch {
    return journeys
  }
}

function computeDurationMinutes(depHHMM: string, arrHHMM: string): number {
  const [dh, dm] = depHHMM.split(':').map(Number)
  const [ah, am] = arrHHMM.split(':').map(Number)
  const d = dh * 60 + dm,
    a = ah * 60 + am
  const span = a - d
  return span >= 0 ? span : 24 * 60 + span
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

async function buildOneChangeJourneys(
  from: string,
  to: string,
  date: string,
  maxResults: number
): Promise<JourneyOption[]> {
  const out: JourneyOption[] = []
  try {
    const { getDarwinClient } = await import('@/lib/darwin/client')
    const { getKnowledgeStationClient } = await import('@/lib/knowledge-station/client')
    const darwin = getDarwinClient()
    const ks = getKnowledgeStationClient()
    if (!darwin.isEnabled() || !ks.isEnabled()) return out

    // Get candidate first-leg services (no filter to allow interchanges)
    const fromBoard = await darwin.getStationBoard({ crs: from, numRows: 20 })

    for (const dep of fromBoard.departures) {
      if (dep.destinationCRS?.toUpperCase() === to) continue // direct; handled elsewhere
      if (!dep.serviceID) continue
      if (out.length >= maxResults) break

      let firstArrAt = ''
      let interchange: { name: string; crs: string; platform?: string } | null = null
      try {
        const t = await ks.getServiceTracking({ serviceId: dep.serviceID })
        // choose first next stop as interchange candidate
        const nxt = t.nextStops?.[0]
        if (!nxt) continue
        interchange = { name: nxt.name, crs: nxt.crs, platform: nxt.platform }
        firstArrAt = (nxt.estimatedArrival || nxt.scheduledArrival || '').slice(0, 5)
        if (!firstArrAt) continue
      } catch {
        continue
      }

      // Find a connecting service from interchange to destination after arrival + 5m
      const connBoard = await darwin.getStationBoard({
        crs: interchange!.crs,
        numRows: 20,
        filterCrs: to,
        filterType: 'to',
      })
      const minDepMinutes = addMinutes(firstArrAt, 5)
      const connecting = connBoard.departures.find(
        (d) => hhmmToMinutes(d.etd && d.etd !== 'On time' ? d.etd : d.std) >= minDepMinutes
      )
      if (!connecting || !connecting.serviceID) continue

      let finalArr = ''
      try {
        const t2 = await ks.getServiceTracking({ serviceId: connecting.serviceID })
        const stopTo = t2.nextStops.find((s) => s.crs?.toUpperCase() === to)
        finalArr = (stopTo?.estimatedArrival || stopTo?.scheduledArrival || '').slice(0, 5)
        if (!finalArr) continue
      } catch {
        continue
      }

      const journeyId = `${dep.serviceID}__${connecting.serviceID}`
      const totalDuration = formatDuration(
        minutesDiff(hhmmToMinutes(dep.std), hhmmToMinutes(finalArr))
      )

      out.push({
        id: journeyId,
        departureTime: dep.std.slice(0, 5),
        arrivalTime: finalArr,
        duration: totalDuration,
        changes: 1,
        operator: `${dep.operator} / ${connecting.operator}`,
        status: 'on-time',
        platforms: { departure: dep.platform, arrival: undefined },
        segments: [
          {
            id: `${dep.serviceID}-leg1`,
            from: { code: from, name: from },
            to: { code: interchange!.crs, name: interchange!.name },
            departureTime: dep.std.slice(0, 5),
            arrivalTime: firstArrAt,
            operator: dep.operator,
            serviceId: dep.serviceID,
            platform: dep.platform,
            duration: formatDuration(
              minutesDiff(hhmmToMinutes(dep.std), hhmmToMinutes(firstArrAt))
            ),
            status: 'on-time',
          },
          {
            id: `${connecting.serviceID}-leg2`,
            from: { code: interchange!.crs, name: interchange!.name },
            to: { code: to, name: to },
            departureTime: (connecting.std || '').slice(0, 5),
            arrivalTime: finalArr,
            operator: connecting.operator,
            serviceId: connecting.serviceID,
            platform: connecting.platform,
            duration: formatDuration(
              minutesDiff(hhmmToMinutes(connecting.std), hhmmToMinutes(finalArr))
            ),
            status: 'on-time',
          },
        ],
        realTimeData: true,
      })
    }
  } catch {
    // ignore
  }
  return out
}

function hhmmToMinutes(t: string): number {
  const [h, m] = (t || '0:0').split(':').map(Number)
  return h * 60 + m
}
function minutesDiff(a: number, b: number): number {
  const d = b - a
  return d >= 0 ? d : 24 * 60 + d
}
function addMinutes(hhmm: string, mins: number): number {
  return hhmmToMinutes(hhmm) + mins
}

export async function POST(request: NextRequest) {
  try {
    const body: JourneyPlanRequest = await request.json()
    const from = (body.from || '').toUpperCase().trim()
    const to = (body.to || '').toUpperCase().trim()
    const date = body.date
    const time = body.time
    const passengers = Number(body.passengers || 1)
    const type = body.type || 'depart'

    if (!from || !to || !date || !time) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMS',
            message: 'Missing required parameters: from, to, date, time',
          },
        },
        { status: 400 }
      )
    }

    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CRS',
            message: 'from/to must be CRS codes (3 uppercase letters)',
          },
        },
        { status: 400 }
      )
    }

    // Rate limit per IP per OD pair
    const rlCfg = {
      keyPrefix: `api:journey:plan:${from}:${to}`,
      limit: parseInt(process.env.RATE_LIMIT_JOURNEY_PER_MIN || '20', 10),
      windowSeconds: 60,
    }
    const rl = await rateLimit(request, rlCfg)
    if (!rl.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(rlCfg.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
            'X-RateLimit-Reset': rl.reset.toISOString(),
          },
        }
      )
    }

    const darwin = getDarwinClient()
    if (!darwin.isEnabled()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DARWIN_NOT_CONFIGURED',
            message: 'Darwin Pub/Sub not configured. Set Darwin environment variables.',
          },
        },
        { status: 503 }
      )
    }

    // Use Darwin station board filtered by destination for direct services
    const board = await darwin.getStationBoard({
      crs: from,
      numRows: 30,
      filterCrs: to,
      filterType: 'to',
    })

    let journeys: JourneyOption[] = (board.departures || []).map((dep, idx) => {
      const scheduled = (dep.std || '').slice(0, 5)
      const estimated = (dep.etd || '').slice(0, 5)

      // Compute delay in minutes if possible
      let delay: number | undefined
      if (scheduled && estimated && estimated !== 'On time' && estimated !== scheduled) {
        const [sh, sm] = scheduled.split(':').map(Number)
        const [eh, em] = estimated.split(':').map(Number)
        if (!Number.isNaN(sh) && !Number.isNaN(sm) && !Number.isNaN(eh) && !Number.isNaN(em)) {
          delay = Math.max(0, eh * 60 + em - (sh * 60 + sm))
        }
      }

      const status: JourneyOption['status'] = dep.cancelReason
        ? 'cancelled'
        : delay && delay > 0
          ? 'delayed'
          : 'on-time'

      return {
        id: dep.serviceID || `svc-${from}-${to}-${idx}`,
        departureTime: scheduled,
        arrivalTime: '', // Arrival time not available without schedule details in MVP
        duration: '', // Not computed in MVP (no mock values)
        changes: 0,
        operator: dep.operator || '',
        status,
        delay,
        platforms: { departure: dep.platform },
        segments: [
          {
            id: `seg-${idx}`,
            from: { code: from, name: board.stationName || from },
            to: { code: to, name: dep.destination || to },
            departureTime: scheduled,
            arrivalTime: '',
            operator: dep.operator || '',
            serviceId: dep.serviceID,
            platform: dep.platform,
            duration: '',
            status:
              status === 'cancelled' ? 'cancelled' : delay && delay > 0 ? 'delayed' : 'on-time',
            delay,
          },
        ],
        realTimeData: true,
      }
    })

    // Enrich direct journeys with arrival/duration via Knowledge Station
    journeys = await enrichDirectJourneys(journeys, to)

    // If few options, attempt to build one-change journeys (best effort)
    if (journeys.length < 4) {
      const withChanges = await buildOneChangeJourneys(from, to, date, 4 - journeys.length)
      journeys.push(...withChanges)
    }

    // Sort by departure time
    journeys.sort((a, b) => a.departureTime.localeCompare(b.departureTime))

    return NextResponse.json({
      success: true,
      data: {
        journeys,
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
