'use client'

import { useState, useEffect } from 'react'
import { Clock, AlertCircle, RefreshCw, MapPin, Train } from 'lucide-react'
import Navigation from '@/components/Navigation'
import StationSearch from '@/components/StationSearch'
import LiveIndicator from '@/components/LiveIndicator'
import StationDetailsPanel from '@/components/StationDetailsPanel'
import DataAttribution from '@/components/DataAttribution'

interface Departure {
  serviceId: string
  operator: string
  operatorCode: string
  trainNumber?: string
  platform?: string
  scheduledDeparture: string
  estimatedDeparture?: string
  destination: string
  destinationCRS: string
  origin?: string
  originCRS?: string
  status: string
  delayMinutes?: number
  isCancelled: boolean
  cancelReason?: string
  delayReason?: string
  length?: number
  formation?: string
  serviceType: string
}

interface StationBoard {
  stationName: string
  stationCode: string
  generatedAt: string
  departures: Departure[]
  messages: {
    severity: 'info' | 'warning' | 'severe'
    message: string
    category?: string
  }[]
  platformsAvailable: boolean
}

const popularStations = [
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

export default function DeparturesPage() {
  const [stationCode, setStationCode] = useState('KGX')
  const [stationSearchValue, setStationSearchValue] = useState('London Kings Cross (KGX)')
  const [stationBoard, setStationBoard] = useState<StationBoard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showStationInfo, setShowStationInfo] = useState(false)

  const fetchDepartures = async (crs: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/unified/departures?crs=${crs}&numRows=15`)
      const result = await response.json()

      if (result.success && result.data) {
        // Map unified API response to the StationBoard shape expected by this page
        const mapped: StationBoard = {
          stationName: result.data.stationName || result.data.station?.name || crs,
          stationCode: result.data.stationCode || result.data.station?.code || crs,
          generatedAt: result.data.generatedAt || new Date().toISOString(),
          platformsAvailable: Boolean(result.data.platformsAvailable ?? true),
          messages: [],
          departures: (result.data.departures || []).map((d: any) => {
            const scheduled = d.std || d.scheduledTime || d.scheduledDeparture || ''
            const estimated = d.etd || d.estimatedTime || d.estimatedDeparture || undefined
            const isCancelled = Boolean(d.cancelled)

            let delayMinutes: number | undefined
            if (
              !isCancelled &&
              estimated &&
              estimated !== 'On time' &&
              scheduled &&
              estimated !== scheduled
            ) {
              const [sh, sm] = scheduled.split(':').map(Number)
              const [eh, em] = estimated.split(':').map(Number)
              if (
                !Number.isNaN(sh) &&
                !Number.isNaN(sm) &&
                !Number.isNaN(eh) &&
                !Number.isNaN(em)
              ) {
                delayMinutes = Math.max(0, eh * 60 + em - (sh * 60 + sm))
              }
            }

            return {
              serviceId: d.serviceID || d.serviceId,
              operator: d.operator?.name || d.operator || '',
              operatorCode: d.operatorCode || d.operator?.code || '',
              trainNumber: d.trainNumber,
              platform: d.platform,
              scheduledDeparture: scheduled,
              estimatedDeparture: estimated,
              destination: d.destination?.locationName || d.destination || '',
              destinationCRS: d.destinationCRS || d.destination?.crs || '',
              origin: d.origin?.locationName || d.origin || undefined,
              originCRS: d.originCRS || d.origin?.crs || undefined,
              status: isCancelled
                ? 'Cancelled'
                : estimated && estimated !== 'On time' && estimated !== scheduled
                  ? 'Delayed'
                  : 'On time',
              delayMinutes,
              isCancelled,
              cancelReason: d.cancelReason,
              delayReason: d.delayReason,
              length: d.length,
              formation: d.formation,
              serviceType: d.serviceType || 'train',
            } as Departure
          }),
        }

        setStationBoard(mapped)
        setLastUpdated(new Date())
      } else {
        setError(result.error?.message || 'Failed to fetch departures')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initialize from ?crs= param if present
    try {
      const u = new URL(window.location.href)
      const crs = u.searchParams.get('crs')
      if (crs && /^[A-Za-z]{3}$/.test(crs)) {
        setStationCode(crs.toUpperCase())
      }
    } catch {}
    fetchDepartures(stationCode)
  }, [stationCode])

  // Live updates via SSE stream (Darwin Kafka)
  useEffect(() => {
    const es = new EventSource('/api/darwin/kafka/stream')

    const applyUpdate = (u: any) => {
      setStationBoard((prev) => {
        if (!prev) return prev
        const idx = prev.departures.findIndex((d) => d.serviceId === (u.serviceId || u.serviceID))
        if (idx === -1) return prev
        const next = { ...prev }
        const dep = { ...next.departures[idx] }
        if (typeof u.estimatedDeparture === 'string') dep.estimatedDeparture = u.estimatedDeparture
        if (typeof u.platform === 'string') dep.platform = u.platform
        if (typeof u.cancelled === 'boolean') {
          dep.isCancelled = u.cancelled
          dep.status = u.cancelled ? 'Cancelled' : dep.status
        }
        if (typeof u.delayReason === 'string') dep.delayReason = u.delayReason

        // recompute delay minutes
        if (
          !dep.isCancelled &&
          dep.estimatedDeparture &&
          dep.estimatedDeparture !== 'On time' &&
          dep.estimatedDeparture !== dep.scheduledDeparture
        ) {
          const [sh, sm] = (dep.scheduledDeparture || '').split(':').map(Number)
          const [eh, em] = dep.estimatedDeparture.split(':').map(Number)
          if (!Number.isNaN(sh) && !Number.isNaN(sm) && !Number.isNaN(eh) && !Number.isNaN(em)) {
            dep.delayMinutes = Math.max(0, eh * 60 + em - (sh * 60 + sm))
            dep.status = 'Delayed'
          }
        }

        next.departures = [...next.departures]
        next.departures[idx] = dep
        return next
      })
    }

    es.addEventListener('bootstrap', (ev: MessageEvent) => {
      try {
        const arr = JSON.parse(ev.data)
        if (Array.isArray(arr)) arr.forEach(applyUpdate)
      } catch {}
    })

    es.addEventListener('service_update', (ev: MessageEvent) => {
      try {
        const u = JSON.parse(ev.data)
        applyUpdate(u)
      } catch {}
    })

    es.onerror = () => {
      // Let the browser retry automatically
    }

    return () => es.close()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchDepartures(stationCode)
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(interval)
    }
  }, [stationCode, autoRefresh])

  const getStatusColor = (departure: Departure) => {
    if (departure.isCancelled) return 'text-red-600'
    if (departure.delayMinutes && departure.delayMinutes > 0) return 'text-amber-600'
    return 'text-green-600'
  }

  const getStatusBg = (departure: Departure) => {
    if (departure.isCancelled) return 'bg-red-100'
    if (departure.delayMinutes && departure.delayMinutes > 0) return 'bg-amber-100'
    return 'bg-green-100'
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="departures" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Station Search */}
        <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-black">
            <MapPin size={24} className="text-blue-600" />
            Search Station
          </h2>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <StationSearch
                placeholder="Search for a station..."
                value={stationSearchValue}
                onSelect={(station) => {
                  setStationCode(station.code)
                  setStationSearchValue(`${station.name} (${station.code})`)
                }}
                onClear={() => {
                  setStationSearchValue('')
                }}
              />
            </div>
            <button
              onClick={() => fetchDepartures(stationCode)}
              disabled={loading || !stationCode}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 ${
                loading || !stationCode ? 'cursor-not-allowed opacity-60' : ''
              }`}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Search
            </button>
          </div>
        </div>

        {/* Station Board */}
        {stationBoard && (
          <div className="mb-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-black">
                    {stationBoard.stationName} ({stationBoard.stationCode})
                  </h3>
                  <button
                    onClick={() => setShowStationInfo(true)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Station info
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
                </p>
                <div className="mt-2 text-xs text-slate-600">
                  {/* Compact info strip (best-effort; only shows when Knowledgebase returns data) */}
                  <a
                    className="text-blue-600 hover:underline"
                    onClick={() => setShowStationInfo(true)}
                  >
                    View station info
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <LiveIndicator />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  Auto refresh
                </label>
                <button
                  onClick={() => fetchDepartures(stationCode)}
                  disabled={loading}
                  className={`flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 ${
                    loading ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Service Messages */}
            {stationBoard.messages.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                {stationBoard.messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      marginBottom: '0.5rem',
                      background:
                        message.severity === 'severe'
                          ? 'rgba(239, 68, 68, 0.1)'
                          : message.severity === 'warning'
                            ? 'rgba(251, 191, 36, 0.1)'
                            : 'rgba(59, 130, 246, 0.1)',
                      border: `1px solid ${
                        message.severity === 'severe'
                          ? '#ef4444'
                          : message.severity === 'warning'
                            ? '#fbbf24'
                            : '#3b82f6'
                      }`,
                      fontSize: '0.875rem',
                    }}
                  >
                    <strong style={{ textTransform: 'uppercase' }}>{message.severity}:</strong>{' '}
                    {message.message}
                  </div>
                ))}
              </div>
            )}

            {/* Departures Table */}
            {loading && (
              <div className="py-8 text-center text-lg text-gray-700">
                <RefreshCw size={24} className="mr-2 inline animate-spin" />
                Loading departures...
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <AlertCircle size={24} className="mr-2 inline text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {!loading && !error && stationBoard.departures.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                No departures found for this station.
              </div>
            )}

            {!loading && !error && stationBoard.departures.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-4 bg-blue-100 p-4 text-sm font-bold text-blue-900">
                  <div>TIME</div>
                  <div>DESTINATION</div>
                  <div>PLATFORM</div>
                  <div>OPERATOR</div>
                  <div>STATUS</div>
                  <div>DETAILS</div>
                </div>

                {/* Departures */}
                {stationBoard.departures.map((departure, index) => (
                  <div
                    key={departure.serviceId}
                    className={`grid grid-cols-6 items-center gap-4 p-4 text-sm text-gray-900 ${
                      index < stationBoard.departures.length - 1 ? 'border-b border-blue-200' : ''
                    }`}
                  >
                    {/* Time */}
                    <div>
                      <div className="text-base font-bold text-black">
                        {departure.scheduledDeparture}
                      </div>
                      {departure.estimatedDeparture &&
                        departure.estimatedDeparture !== departure.scheduledDeparture && (
                          <div className="text-xs text-amber-600">
                            ({departure.estimatedDeparture})
                          </div>
                        )}
                    </div>

                    {/* Destination */}
                    <div>
                      <div className="font-bold text-black">{departure.destination}</div>
                      <div className="text-xs text-gray-500">{departure.destinationCRS}</div>
                    </div>

                    {/* Platform */}
                    <div className="text-center">
                      {departure.platform ? (
                        <span className="rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                          {departure.platform}
                        </span>
                      ) : (
                        <span className="text-gray-500">TBA</span>
                      )}
                    </div>

                    {/* Operator */}
                    <div className="text-xs">
                      <div className="font-medium">{departure.operatorCode}</div>
                      {departure.trainNumber && (
                        <div className="text-gray-500">{departure.trainNumber}</div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-center">
                      <span
                        className={`rounded px-2 py-1 text-xs font-bold ${
                          departure.isCancelled
                            ? 'bg-red-100 text-red-600'
                            : departure.delayMinutes && departure.delayMinutes > 0
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-green-100 text-green-600'
                        }`}
                      >
                        {departure.status}
                      </span>
                      {departure.delayMinutes && departure.delayMinutes > 0 && (
                        <div className="mt-1 text-xs text-amber-600">
                          +{departure.delayMinutes}min
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="text-center">
                      <a
                        href={`/service/${encodeURIComponent(departure.serviceId)}`}
                        className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        More
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Popular Stations */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
          <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-black">
            <Train size={24} className="text-blue-600" />
            Popular Stations
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {popularStations.map((station) => (
              <button
                key={station.code}
                onClick={() => {
                  setStationCode(station.code)
                  setStationSearchValue(`${station.name} (${station.code})`)
                }}
                className={`rounded-xl p-4 text-left text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                  stationCode === station.code
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100'
                }`}
              >
                <div className="text-lg font-bold">{station.code}</div>
                <div className="mt-1 text-xs opacity-75">{station.name}</div>
              </button>
            ))}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <StationDetailsPanel
        crs={stationCode}
        open={showStationInfo}
        onClose={() => setShowStationInfo(false)}
      />
      <DataAttribution />
    </div>
  )
}
