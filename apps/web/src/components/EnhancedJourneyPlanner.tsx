'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  ArrowLeftRight,
  Clock,
  AlertTriangle,
  Zap,
  Train,
  MapPin,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import StationSearch from './StationSearch'
import Navigation from './Navigation'
import LiveIndicator from './LiveIndicator'
import StationDetailsPanel from './StationDetailsPanel'
import DataAttribution from './DataAttribution'

interface Station {
  code: string
  name: string
  group?: string
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
  from: Station
  to: Station
  departureTime: string
  arrivalTime: string
  operator: string
  serviceId?: string
  platform?: string
  duration: string
  status: 'on-time' | 'delayed' | 'cancelled'
  delay?: number
}

interface JourneySearchParams {
  from: Station
  to: Station
  departureDate: string
  departureTime: string
  passengers: number
  journeyType: 'depart' | 'arrive'
}

interface EnhancedJourneyPlannerProps {
  mode?: 'component' | 'page'
  className?: string
  initialFrom?: Station
  initialTo?: Station
  compact?: boolean
  showNavigation?: boolean
}

export default function EnhancedJourneyPlanner({
  mode = 'component',
  className,
  initialFrom,
  initialTo,
  compact = false,
  showNavigation = false,
}: EnhancedJourneyPlannerProps = {}) {
  const [fromStation, setFromStation] = useState<Station | null>(initialFrom || null)
  const [toStation, setToStation] = useState<Station | null>(initialTo || null)
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0])
  const [departureTime, setDepartureTime] = useState('09:00')
  const [passengers, setPassengers] = useState(1)
  const [journeyType, setJourneyType] = useState<'depart' | 'arrive'>('depart')

  const [journeyOptions, setJourneyOptions] = useState<JourneyOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchPerformed, setSearchPerformed] = useState(false)
  const [showFromInfo, setShowFromInfo] = useState(false)
  const [showToInfo, setShowToInfo] = useState(false)

  const [fromDetails, setFromDetails] = useState<any | null>(null)
  const [toDetails, setToDetails] = useState<any | null>(null)

  // Direct trains (live) between From -> To
  const [directLoading, setDirectLoading] = useState(false)
  const [directError, setDirectError] = useState<string | null>(null)
  const [directTrains, setDirectTrains] = useState<any[]>([])

  useEffect(() => {
    const fetchDirect = async () => {
      if (!fromStation?.code || !toStation?.code) {
        setDirectTrains([])
        return
      }
      setDirectLoading(true)
      setDirectError(null)
      try {
        const params = new URLSearchParams({
          crs: fromStation.code,
          filterCrs: toStation.code,
          filterType: 'to',
          numRows: '10',
        })
        const res = await fetch(`/api/unified/departures?${params.toString()}`)
        const json = await res.json()
        if (json.success) {
          const rows = Array.isArray(json.data?.departures) ? json.data.departures : []
          setDirectTrains(rows)
        } else {
          setDirectTrains([])
          setDirectError(json.error?.message || 'Failed to load direct services')
        }
      } catch (e) {
        setDirectTrains([])
        setDirectError(e instanceof Error ? e.message : 'Network error')
      } finally {
        setDirectLoading(false)
      }
    }
    fetchDirect()
    const iv = setInterval(fetchDirect, 60000)
    return () => clearInterval(iv)
  }, [fromStation?.code, toStation?.code])

  useEffect(() => {
    const load = async () => {
      if (!fromStation?.code) { setFromDetails(null); return }
      try {
        const res = await fetch(`/api/knowledgebase/station?crs=${fromStation.code}`)
        const json = await res.json()
        if (json.success) setFromDetails(json.data)
        else setFromDetails(null)
      } catch { setFromDetails(null) }
    }
    load()
  }, [fromStation?.code])

  useEffect(() => {
    const load = async () => {
      if (!toStation?.code) { setToDetails(null); return }
      try {
        const res = await fetch(`/api/knowledgebase/station?crs=${toStation.code}`)
        const json = await res.json()
        if (json.success) setToDetails(json.data)
        else setToDetails(null)
      } catch { setToDetails(null) }
    }
    load()
  }, [toStation?.code])

  // Live updates: apply SSE updates to current journey list by serviceId
  useEffect(() => {
    const es = new EventSource('/api/darwin/kafka/stream')

    const applyUpdate = (u: any) => {
      setJourneyOptions((prev) => {
        if (!prev || prev.length === 0) return prev
        let changed = false
        const next = prev.map((j) => {
          if (j.id !== (u.serviceId || u.serviceID)) return j
          changed = true
          const copy = { ...j }
          // Update platform
          if (typeof u.platform === 'string') {
            copy.platforms = { ...(copy.platforms || {}), departure: u.platform }
            if (copy.segments && copy.segments[0]) {
              copy.segments = [...copy.segments]
              copy.segments[0] = { ...copy.segments[0], platform: u.platform }
            }
          }
          // Update status/delay based on estimatedDeparture
          if (typeof u.estimatedDeparture === 'string' && copy.departureTime) {
            const [sh, sm] = copy.departureTime.split(':').map(Number)
            const [eh, em] = u.estimatedDeparture.split(':').map(Number)
            if (!Number.isNaN(sh) && !Number.isNaN(sm) && !Number.isNaN(eh) && !Number.isNaN(em)) {
              const delay = Math.max(0, eh * 60 + em - (sh * 60 + sm))
              copy.delay = delay > 0 ? delay : undefined
              copy.status = delay > 0 ? 'delayed' : 'on-time'
              if (copy.segments && copy.segments[0]) {
                copy.segments = [...copy.segments]
                copy.segments[0] = { ...copy.segments[0], delay: copy.delay, status: copy.status }
              }
            }
          }
          // Cancellation support
          if (typeof u.cancelled === 'boolean' && u.cancelled) {
            copy.status = 'cancelled'
            if (copy.segments && copy.segments[0]) {
              copy.segments = [...copy.segments]
              copy.segments[0] = { ...copy.segments[0], status: 'cancelled' }
            }
          }
          return copy
        })
        return changed ? next : prev
      })
    }

    es.addEventListener('service_update', (ev: MessageEvent) => {
      try { applyUpdate(JSON.parse(ev.data)) } catch {}
    })
    es.addEventListener('bootstrap', (ev: MessageEvent) => {
      try {
        const arr = JSON.parse(ev.data)
        if (Array.isArray(arr)) arr.forEach(applyUpdate)
      } catch {}
    })

    es.onerror = () => {}
    return () => es.close()
  }, [])

  const handleStationSwap = () => {
    const temp = fromStation
    setFromStation(toStation)
    setToStation(temp)
  }

  const searchJourneys = async () => {
    if (!fromStation || !toStation) {
      setError('Please select both departure and arrival stations')
      return
    }

    setLoading(true)
    setError(null)
    setSearchPerformed(false)

    try {
      // Get direct services (live) between from and to using unified aggregator
      const departuresResponse = await fetch(
        `/api/unified/departures?crs=${fromStation.code}&numRows=50&filterCrs=${toStation.code}&filterType=to&includeRealTimePosition=true&includeEnhancedData=true`
      )
      const departuresResult = await departuresResponse.json()

      const enhancedJourneys: JourneyOption[] = []

      if (departuresResult.success && departuresResult.data?.departures) {
        const liveDepartures = departuresResult.data.departures.slice(0, 12)

        for (const departure of liveDepartures) {
          const journeyOption: JourneyOption = {
            id: departure.serviceID || departure.serviceId,
            departureTime: departure.std,
            // Arrival time and duration are unknown without a routing engine; leave blank (no mock values)
            arrivalTime: '',
            duration: '',
            changes: 0, // Direct service (filtered by destination)
            operator: departure.operator,
            status: departure.cancelled
              ? 'cancelled'
              : departure.etd === 'Delayed'
                ? 'delayed'
                : departure.etd && departure.std && departure.etd !== 'On time' && departure.etd !== departure.std
                  ? 'delayed'
                  : 'on-time',
            delay:
              departure.etd === 'Delayed'
                ? undefined
                : departure.etd && departure.std && departure.etd !== 'On time' && departure.etd !== departure.std
                  ? calculateDelay(departure.std, departure.etd)
                  : undefined,
            platforms: {
              departure: departure.platform,
            },
            segments: [
              {
                id: departure.serviceID || departure.serviceId,
                from: fromStation,
                to: toStation,
                departureTime: departure.std,
                arrivalTime: '',
                operator: departure.operator,
                serviceId: departure.serviceID || departure.serviceId,
                platform: departure.platform,
                duration: '',
                status: departure.cancelled
                  ? 'cancelled'
                  : departure.etd === 'Delayed'
                    ? 'delayed'
                    : 'on-time',
                delay:
                  departure.etd === 'Delayed'
                    ? undefined
                    : departure.etd && departure.std && departure.etd !== 'On time' && departure.etd !== departure.std
                      ? calculateDelay(departure.std, departure.etd)
                      : undefined,
              },
            ],
            disruptions: departure.delayReason ? [departure.delayReason] : undefined,
            realTimeData: true,
          }

          enhancedJourneys.push(journeyOption)
        }
      }

      // Sort by departure time
      enhancedJourneys.sort((a, b) => a.departureTime.localeCompare(b.departureTime))

      setJourneyOptions(enhancedJourneys)
      setSearchPerformed(true)
    } catch (err) {
      console.error('Journey search error:', err)
      setError(err instanceof Error ? err.message : 'Failed to search journeys')
      setJourneyOptions([])
      setSearchPerformed(true)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: JourneyOption['status']) => {
    switch (status) {
      case 'on-time':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'delayed':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'disrupted':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: JourneyOption['status']) => {
    switch (status) {
      case 'on-time':
        return 'text-green-600'
      case 'delayed':
        return 'text-amber-600'
      case 'cancelled':
        return 'text-red-600'
      case 'disrupted':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  // Add popular stations for quick selection
  const popularStations: Station[] = [
    { code: 'KGX', name: 'London Kings Cross' },
    { code: 'LIV', name: 'Liverpool Lime Street' },
    { code: 'MAN', name: 'Manchester Piccadilly' },
    { code: 'BHM', name: 'Birmingham New Street' },
    { code: 'LDS', name: 'Leeds' },
    { code: 'EDB', name: 'Edinburgh' },
    { code: 'GLA', name: 'Glasgow Central' },
    { code: 'YOR', name: 'York' },
    { code: 'NCL', name: 'Newcastle' },
    { code: 'BRI', name: 'Bristol Temple Meads' },
  ]

  const handleQuickSelect = (station: Station, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromStation(station)
    } else {
      setToStation(station)
    }
  }

  if (mode === 'page') {
    return (
      <div className="min-h-screen bg-white">
        {showNavigation && <Navigation currentPage="journey" />}

        <main className={cn('mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8', className)}>
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-gray-900">
              <MapPin className="h-8 w-8 text-blue-600" />
              Plan Your Journey
            </h1>
            <p className="text-gray-600">
              Find the best trains, compare prices, and book tickets for travel across the UK
            </p>
          </div>

          <div className="space-y-8">
            {/* Search Form */}
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">Journey Planner</div>
                <LiveIndicator />
              </div>
              {/* Station Selection */}
              <div className="mb-8 grid grid-cols-1 items-end gap-4 md:grid-cols-3">
                {/* From Station */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>From</span>
                    {fromStation?.code && (
                      <button
                        type="button"
                        onClick={() => setShowFromInfo(true)}
                        className="rounded border border-slate-300 px-2 py-0.5 text-xs font-normal text-slate-700 hover:bg-slate-50"
                      >
                        Info
                      </button>
                    )}
                  </label>
                  <StationSearch
                    placeholder="Enter departure station"
                    value={fromStation ? fromStation.name : ''}
                    onSelect={setFromStation}
                    onClear={() => setFromStation(null)}
                  />
                </div>

                {/* Swap Button */}
                <div className="flex justify-center md:block">
                  <button
                    onClick={handleStationSwap}
                    className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-gray-300 bg-white p-3 text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <ArrowLeftRight className="h-5 w-5" />
                  </button>
                </div>

                {/* To Station */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Train className="h-4 w-4 text-blue-600" />
                    <span>To</span>
                    {toStation?.code && (
                      <button
                        type="button"
                        onClick={() => setShowToInfo(true)}
                        className="rounded border border-slate-300 px-2 py-0.5 text-xs font-normal text-slate-700 hover:bg-slate-50"
                      >
                        Info
                      </button>
                    )}
                  </label>
                  <StationSearch
                    placeholder="Enter destination station"
                    value={toStation ? toStation.name : ''}
                    onSelect={setToStation}
                    onClear={() => setToStation(null)}
                  />
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="mb-8">
                <h3 className="mb-4 text-lg font-bold text-gray-800">Popular Stations</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                  {popularStations.map((station) => (
                    <div key={station.code} className="flex flex-col gap-1">
                      <button
                        onClick={() => handleQuickSelect(station, 'from')}
                        className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100"
                      >
                        From {station.code}
                      </button>
                      <button
                        onClick={() => handleQuickSelect(station, 'to')}
                        className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-100"
                      >
                        To {station.code}
                      </button>
                      <div className="mt-1 text-center text-xs text-gray-500">{station.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date/Time/Passengers */}
              <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-800">
                    <Calendar className="mr-2 inline h-4 w-4 text-blue-600" />
                    Departure Date
                  </label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-xl border-2 border-gray-300 bg-white p-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-800">
                    <Clock className="mr-2 inline h-4 w-4 text-blue-600" />
                    Departure Time
                  </label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-300 bg-white p-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-800">
                    <Users className="mr-2 inline h-4 w-4 text-blue-600" />
                    Passengers
                  </label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(parseInt(e.target.value))}
                    className="w-full rounded-xl border-2 border-gray-300 bg-white p-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'Adult' : 'Adults'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-gray-800">Journey Type</label>
                  <select
                    value={journeyType}
                    onChange={(e) => setJourneyType(e.target.value as 'depart' | 'arrive')}
                    className="w-full rounded-xl border-2 border-gray-300 bg-white p-3 text-base text-gray-900 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="depart">Departing</option>
                    <option value="arrive">Arriving</option>
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <div className="text-center">
                <button
                  onClick={searchJourneys}
                  disabled={!fromStation || !toStation || loading}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-8 py-4 text-lg font-bold text-white transition-colors',
                    !fromStation || !toStation || loading
                      ? 'cursor-not-allowed bg-gray-400'
                      : 'cursor-pointer bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      Find Trains
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Info Strips */}
            <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="text-xs text-slate-600">
                {fromDetails && (
                  <div className="rounded border border-slate-200 p-3">
                    <div className="mb-1 font-semibold text-slate-700">{fromDetails.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {fromDetails.facilities?.slice(0, 2).map((f: string, i: number) => (
                        <span key={`ff-${i}`} className="rounded bg-slate-100 px-2 py-0.5">{f}</span>
                      ))}
                      {fromDetails.accessibility?.slice(0, 1).map((f: string, i: number) => (
                        <span key={`fa-${i}`} className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">{f}</span>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowFromInfo(true)}
                        className="ml-auto text-blue-600 hover:underline"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-600">
                {toDetails && (
                  <div className="rounded border border-slate-200 p-3">
                    <div className="mb-1 font-semibold text-slate-700">{toDetails.name}</div>
                    <div className="flex flex-wrap gap-2">
                      {toDetails.facilities?.slice(0, 2).map((f: string, i: number) => (
                        <span key={`tf-${i}`} className="rounded bg-slate-100 px-2 py-0.5">{f}</span>
                      ))}
                      {toDetails.accessibility?.slice(0, 1).map((f: string, i: number) => (
                        <span key={`ta-${i}`} className="rounded bg-amber-50 px-2 py-0.5 text-amber-700">{f}</span>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowToInfo(true)}
                        className="ml-auto text-blue-600 hover:underline"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Trains (Live) */}
            {fromStation?.code && toStation?.code && (
              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-bold text-blue-900">
                    Direct trains: {fromStation.name} → {toStation.name}
                  </div>
                  <a href="#" onClick={(e) => { e.preventDefault(); }} className="text-xs text-blue-700">
                    Live
                  </a>
                </div>
                {directLoading && <div className="text-sm text-blue-900">Loading…</div>}
                {directError && <div className="text-sm text-amber-700">{directError}</div>}
                {!directLoading && directTrains.length === 0 && (
                  <div className="text-sm text-blue-900">No direct services found right now.</div>
                )}
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {directTrains.slice(0, 6).map((d: any) => (
                    <div key={d.serviceId || d.serviceID} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="font-mono text-lg font-bold text-slate-900">{d.std || d.scheduledTime}</div>
                        <div className="text-sm text-slate-700">
                          {fromStation.name} → {toStation.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">{d.platform || 'TBA'}</span>
                        <span className="text-xs text-slate-600">{d.operator || d.operator?.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <div>
                    <h4 className="text-lg font-semibold text-red-800">Search Error</h4>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchPerformed && (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
                <h3 className="mb-4 text-2xl font-bold text-black">Journey Options</h3>
                <p className="mb-6 text-sm text-gray-600">
                  {fromStation?.name} → {toStation?.name} on{' '}
                  {new Date(departureDate).toLocaleDateString()}
                </p>

                <div className="space-y-4">
                  {journeyOptions.length === 0 ? (
                    <div className="py-12 text-center">
                      <Train className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                      <h4 className="mb-2 text-lg font-semibold text-gray-900">
                        No journeys found
                      </h4>
                      <p className="text-gray-600">
                        Try adjusting your search criteria or check for alternative routes.
                      </p>
                    </div>
                  ) : (
                    journeyOptions.map((journey: any) => (
                      <div
                        key={journey.id}
                        className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-blue-200 bg-blue-50 p-6 transition-colors hover:bg-blue-100 md:grid-cols-4"
                      >
                        {/* Times */}
                        <div className="text-center">
                          <div className="text-xl font-bold text-black">
                            {journey.departureTime}
                          </div>
                          <div className="text-xs text-gray-500">Depart</div>
                        </div>

                        {/* Journey Info */}
                        <div>
                          <div className="mb-2 flex items-center gap-4">
                            <div className="text-xl font-bold text-black">
                              {journey.arrivalTime}
                            </div>
                            <div className="text-sm text-gray-700">
                              {journey.duration} •{' '}
                              {journey.changes === 0
                                ? 'Direct'
                                : `${journey.changes} change${journey.changes > 1 ? 's' : ''}`}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {journey.operator}
                            {journey.realTimeData && (
                              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                                <Zap className="h-3 w-3" />
                                Live
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-600">
                            {journey.price ? `£${journey.price.adult}` : 'From £29.90'}
                          </div>
                          <div className="text-xs text-gray-500">per adult</div>
                        </div>

                        {/* Book Button */}
                        <div className="text-center">
                          <button className="cursor-pointer rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-colors hover:bg-blue-700">
                            Select
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={cn('mx-auto max-w-6xl space-y-6', className)}>
      {/* Search Form */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="grid items-end gap-6 lg:grid-cols-12">
          {/* From Station */}
          <div className="lg:col-span-4">
            <label className="mb-3 block text-sm font-semibold text-gray-700">From</label>
            <StationSearch
              placeholder="Departure station"
              value={fromStation ? `${fromStation.name}` : ''}
              onSelect={setFromStation}
              onClear={() => setFromStation(null)}
            />
          </div>

          {/* Swap Button */}
          <div className="flex justify-center lg:col-span-1">
            <button
              onClick={handleStationSwap}
              className="rounded-full bg-gray-100 p-3 transition-colors hover:bg-gray-200"
              disabled={!fromStation && !toStation}
            >
              <ArrowLeftRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* To Station */}
          <div className="lg:col-span-4">
            <label className="mb-3 block text-sm font-semibold text-gray-700">To</label>
            <StationSearch
              placeholder="Destination station"
              value={toStation ? `${toStation.name}` : ''}
              onSelect={setToStation}
              onClear={() => setToStation(null)}
            />
          </div>

          {/* Search Button */}
          <div className="lg:col-span-3">
            <button
              onClick={searchJourneys}
              disabled={loading || !fromStation || !toStation}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Find Trains
                </>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mt-6 grid gap-4 border-t border-gray-200 pt-6 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Time</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Passengers</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <select
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Passenger' : 'Passengers'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Journey Type</label>
            <select
              value={journeyType}
              onChange={(e) => setJourneyType(e.target.value as 'depart' | 'arrive')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="depart">Departing</option>
              <option value="arrive">Arriving</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Journey Results */}
      {searchPerformed && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900">
              Journey Options{' '}
              {fromStation && toStation && `(${fromStation.name} → ${toStation.name})`}
            </h3>
            <p className="mt-1 text-gray-600">
              {journeyOptions.length} options found •{' '}
              {journeyOptions.filter((j) => j.realTimeData).length} with real-time data
            </p>
          </div>

          {journeyOptions.length === 0 ? (
            <div className="p-8 text-center">
              <Train className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h4 className="mb-2 text-lg font-semibold text-gray-900">No journeys found</h4>
              <p className="text-gray-600">
                Try adjusting your search criteria or check for alternative routes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {journeyOptions.map((journey) => (
                <div key={journey.id} className="p-6 transition-colors hover:bg-gray-50">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {journey.departureTime}
                        </div>
                        <div className="text-sm text-gray-500">Depart</div>
                      </div>
                      <div className="flex-1 px-4">
                        <div className="mb-1 flex items-center gap-2">
                          <div className="relative h-2 flex-1 rounded-full bg-blue-200">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: '100%' }}
                            ></div>
                            {journey.changes > 0 && (
                              <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 transform rounded-full border-2 border-blue-600 bg-white"></div>
                            )}
                          </div>
                        </div>
                        <div className="text-center text-xs text-gray-500">
                          {journey.duration} • {journey.changes}{' '}
                          {journey.changes === 1 ? 'change' : 'changes'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {journey.arrivalTime}
                        </div>
                        <div className="text-sm text-gray-500">Arrive</div>
                      </div>
                    </div>

                    <div className="ml-6 text-right">
                      <div className="mb-1 flex items-center gap-2">
                        {getStatusIcon(journey.status)}
                        <span className={`text-sm font-medium ${getStatusColor(journey.status)}`}>
                          {journey.status === 'on-time'
                            ? 'On Time'
                            : journey.status === 'delayed'
                              ? `Delayed${journey.delay ? ` ${journey.delay}min` : ''}`
                              : journey.status === 'cancelled'
                                ? 'Cancelled'
                                : 'Disrupted'}
                        </span>
                      </div>
                      {journey.realTimeData && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <Zap className="h-3 w-3" />
                          Live data
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Journey Details */}
                  <div className="space-y-3">
                    {journey.segments.map((segment, index) => (
                      <div key={segment.id} className="flex items-center gap-4 text-sm">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Train className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          <span className="font-medium text-gray-900">{segment.operator}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-gray-600">
                            {segment.from.name} → {segment.to.name}
                          </span>
                        </div>

                        {segment.platform && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <MapPin className="h-3 w-3" />
                            Platform {segment.platform}
                          </div>
                        )}

                        <div className="text-gray-500">
                          {segment.departureTime} - {segment.arrivalTime}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Disruptions */}
                  {journey.disruptions && journey.disruptions.length > 0 && (
                    <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                          Service Information
                        </span>
                      </div>
                      {journey.disruptions.map((disruption, index) => (
                        <p
                          key={`disruption-${journey.id}-${index}`}
                          className="text-sm text-yellow-700"
                        >
                          {disruption}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="text-sm text-gray-500">Operated by {journey.operator}</div>
                    <div className="flex items-center gap-3">
                      {journey.price && (
                        <div className="text-lg font-bold text-green-600">
                          from £{journey.price.adult}
                        </div>
                      )}
                      <a
                        href={`/service/${encodeURIComponent(journey.id)}`}
                        className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        View Details
                      </a>
                      <button className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                        Select Journey
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DataAttribution className="mb-8" />

      <StationDetailsPanel crs={fromStation?.code || null} open={showFromInfo} onClose={() => setShowFromInfo(false)} />
      <StationDetailsPanel crs={toStation?.code || null} open={showToInfo} onClose={() => setShowToInfo(false)} />
    </div>
  )
}

// Helper functions
function getEstimatedJourneyTime(fromCrs: string, toCrs: string): number {
  // This would normally come from a routing engine or stored journey times
  const journeyTimes: Record<string, Record<string, number>> = {
    KGX: { YOR: 120, EDB: 280, MAN: 130 },
    YOR: { KGX: 120, EDB: 160, MAN: 90 },
    EDB: { KGX: 280, YOR: 160, GLA: 60 },
  }

  return journeyTimes[fromCrs]?.[toCrs] || 90 // Default 90 minutes
}

function calculateDelay(scheduled: string, estimated: string): number {
  const [schedHour, schedMin] = scheduled.split(':').map(Number)
  const [estHour, estMin] = estimated.split(':').map(Number)

  const schedMinutes = schedHour * 60 + schedMin
  const estMinutes = estHour * 60 + estMin

  return Math.max(0, estMinutes - schedMinutes)
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

