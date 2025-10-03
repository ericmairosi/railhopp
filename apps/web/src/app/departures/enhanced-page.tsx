'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Train, Filter, Eye, Share, RefreshCw, AlertTriangle } from 'lucide-react'
import StationSearch from '@/components/StationSearch'
import EnhancedDepartureBoard from '@/components/EnhancedDepartureBoard'
import ErrorBoundary from '@/components/ErrorBoundary'
import LiveTrainMap from '@/components/LiveTrainMap'

interface Station {
  code: string
  name: string
  group?: string
}

interface QuickLink {
  station: Station
  isPopular?: boolean
  description?: string
}

export default function EnhancedDeparturesPage() {
  const searchParams = useSearchParams()
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [filterDestination, setFilterDestination] = useState('')
  const [filterOperator, setFilterOperator] = useState('')
  const [currentTime, setCurrentTime] = useState<string>('')
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Popular stations like Realtime Trains
  const popularStations: QuickLink[] = [
    {
      station: { code: 'LBG', name: 'London Bridge' },
      isPopular: true,
      description: 'Major terminus',
    },
    {
      station: { code: 'WAT', name: 'London Waterloo' },
      isPopular: true,
      description: 'Busiest station',
    },
    {
      station: { code: 'EUS', name: 'London Euston' },
      isPopular: true,
      description: 'West Coast Main Line',
    },
    {
      station: { code: 'PAD', name: 'London Paddington' },
      isPopular: true,
      description: 'Great Western Railway',
    },
    {
      station: { code: 'VIC', name: 'London Victoria' },
      isPopular: true,
      description: 'South & Southeast',
    },
    {
      station: { code: 'LST', name: 'London Liverpool Street' },
      isPopular: true,
      description: 'City & East Anglia',
    },
    {
      station: { code: 'CLJ', name: 'Clapham Junction' },
      isPopular: true,
      description: 'Busiest interchange',
    },
    {
      station: { code: 'MAN', name: 'Manchester Piccadilly' },
      isPopular: true,
      description: 'Northern hub',
    },
    {
      station: { code: 'BHM', name: 'Birmingham New Street' },
      isPopular: true,
      description: 'Midlands hub',
    },
    {
      station: { code: 'EDB', name: 'Edinburgh' },
      isPopular: true,
      description: 'Scottish capital',
    },
    { station: { code: 'GLA', name: 'Glasgow Queen Street' }, description: 'Scottish services' },
    { station: { code: 'LDS', name: 'Leeds' }, description: 'Yorkshire hub' },
  ]

  // Station groups like Traksy
  const stationGroups = [
    {
      name: 'London Terminals',
      stations: ['KGX', 'EUS', 'PAD', 'VIC', 'WAT', 'LST', 'LBG', 'CHX', 'FST', 'MOG'],
      description: 'All major London stations',
    },
    {
      name: 'Birmingham Stations',
      stations: ['BHM', 'BSW', 'BHI'],
      description: 'Birmingham area stations',
    },
    {
      name: 'Manchester Stations',
      stations: ['MAN', 'MCV', 'MPT'],
      description: 'Greater Manchester stations',
    },
  ]

  useEffect(() => {
    // Set initial station from URL params
    const stationParam = searchParams?.get('station')
    if (stationParam) {
      const station = popularStations.find(
        (s) => s.station.code === stationParam.toUpperCase()
      )?.station
      if (station) {
        setSelectedStation(station)
      }
    } else {
      // Default to Kings Cross
      setSelectedStation({ code: 'KGX', name: 'London Kings Cross' })
    }

    // Set up time updates
    setCurrentTime(new Date().toLocaleTimeString('en-GB', { timeStyle: 'short' }))
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-GB', { timeStyle: 'short' }))
    }, 30000)

    return () => {
      clearInterval(timeInterval)
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        setLastRefresh(new Date())
      }, refreshInterval * 1000)

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval])

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station)
    // Update URL without page reload
    const url = new URL(window.location.href)
    url.searchParams.set('station', station.code)
    window.history.pushState({}, '', url.toString())
  }

  const handleQuickStation = (station: Station) => {
    handleStationSelect(station)
  }

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh)
    if (autoRefresh && refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }
  }

  const manualRefresh = () => {
    setLastRefresh(new Date())
  }

  const shareStation = async () => {
    if (selectedStation && navigator.share) {
      try {
        await navigator.share({
          title: `Live departures from ${selectedStation.name}`,
          text: `Check live train departures from ${selectedStation.name} (${selectedStation.code})`,
          url: window.location.href,
        })
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard?.writeText(window.location.href)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700">
                  <Train className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Railhopp</h1>
                  <p className="text-xs text-slate-500">Live Departures</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 rounded-lg bg-green-50 px-3 py-1 sm:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700">Live {currentTime}</span>
              </div>

              <button
                onClick={() => setShowMap(!showMap)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  showMap
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Eye className="mr-1 inline h-4 w-4" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Search Section */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Live Departure Boards</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  showFilters
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Filter className="mr-1 inline h-4 w-4" />
                Filters
              </button>
              {selectedStation && (
                <button
                  onClick={shareStation}
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                >
                  <Share className="mr-1 inline h-4 w-4" />
                  Share
                </button>
              )}
            </div>
          </div>

          {/* Station Search */}
          <div className="mb-6">
            <label className="mb-3 block text-sm font-semibold text-slate-700">
              Search for a station
            </label>
            <div className="max-w-xl">
              <StationSearch
                placeholder="Enter station name or code (e.g. Kings Cross, KGX)"
                value={selectedStation ? selectedStation.name : ''}
                onSelect={handleStationSelect}
                onClear={() => setSelectedStation(null)}
              />
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mb-6 grid gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Filter by destination
                </label>
                <input
                  type="text"
                  placeholder="e.g. Manchester"
                  value={filterDestination}
                  onChange={(e) => setFilterDestination(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Filter by operator
                </label>
                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All operators</option>
                  <option value="LNER">LNER</option>
                  <option value="GWR">Great Western Railway</option>
                  <option value="SWR">South Western Railway</option>
                  <option value="Northern">Northern</option>
                  <option value="CrossCountry">CrossCountry</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Auto-refresh
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={toggleAutoRefresh}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">Every {refreshInterval}s</span>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={manualRefresh}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Now
                </button>
              </div>
            </div>
          )}

          {/* Popular Stations Grid */}
          <div className="mb-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Popular Departure Boards</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {popularStations.slice(0, 8).map((item) => (
                <button
                  key={item.station.code}
                  onClick={() => handleQuickStation(item.station)}
                  className={`group rounded-lg border p-3 text-left transition-all hover:shadow-md ${
                    selectedStation?.code === item.station.code
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        selectedStation?.code === item.station.code
                          ? 'bg-blue-100'
                          : 'bg-slate-100 group-hover:bg-blue-100'
                      }`}
                    >
                      <Train
                        className={`h-5 w-5 ${
                          selectedStation?.code === item.station.code
                            ? 'text-blue-600'
                            : 'text-slate-600 group-hover:text-blue-600'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-semibold ${
                          selectedStation?.code === item.station.code
                            ? 'text-blue-900'
                            : 'text-slate-900 group-hover:text-blue-600'
                        }`}
                      >
                        {item.station.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.station.code}
                        {item.isPopular && <span className="ml-1">⭐</span>}
                      </div>
                    </div>
                  </div>
                  {item.description && (
                    <p className="mt-2 text-xs text-slate-600">{item.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Station Groups */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Station Groups</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {stationGroups.map((group) => (
                <div key={group.name} className="rounded-lg border border-slate-200 bg-white p-4">
                  <h4 className="mb-2 font-semibold text-slate-900">{group.name}</h4>
                  <p className="mb-3 text-sm text-slate-600">{group.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {group.stations.slice(0, 5).map((code) => (
                      <span
                        key={code}
                        className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                      >
                        {code}
                      </span>
                    ))}
                    {group.stations.length > 5 && (
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                        +{group.stations.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Train Map */}
        {showMap && (
          <div className="mb-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-xl font-semibold text-slate-900">Live Train Map</h3>
              <LiveTrainMap height="500px" region="london" />
            </div>
          </div>
        )}

        {/* Departure Board */}
        {selectedStation && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedStation.name}</h2>
                  <div className="mt-1 flex items-center gap-4 text-sm text-slate-600">
                    <span>Station Code: {selectedStation.code}</span>
                    {lastRefresh && <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>}
                    {autoRefresh && (
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                        <span>Auto-refresh active</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={manualRefresh}
                    className="rounded-lg bg-slate-100 p-2 transition-colors hover:bg-slate-200"
                    title="Refresh departures"
                  >
                    <RefreshCw className="h-5 w-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            <ErrorBoundary
              fallback={
                <div className="p-8 text-center">
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                  <p className="mb-2 text-lg font-semibold text-slate-900">
                    Unable to load departures
                  </p>
                  <p className="text-slate-600">
                    Please try refreshing or selecting a different station.
                  </p>
                  <button
                    onClick={manualRefresh}
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              }
            >
              <EnhancedDepartureBoard
                stationCode={selectedStation.code}
                maxResults={20}
                showDetailed={true}
                compact={false}
                autoRefresh={autoRefresh}
                refreshInterval={refreshInterval * 1000}
                variant="modern"
                filterDestination={filterDestination || undefined}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* No Station Selected */}
        {!selectedStation && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Train className="mx-auto mb-4 h-16 w-16 text-slate-400" />
            <h2 className="mb-2 text-2xl font-bold text-slate-900">Select a Station</h2>
            <p className="mb-6 text-slate-600">
              Choose a station from the popular options above or search for any UK rail station.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => handleQuickStation(popularStations[0].station)}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
              >
                View London Bridge Departures
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-slate-600">
            <p>
              Live departure data updates every {refreshInterval} seconds. Times shown are based on
              real-time information where available.
            </p>
            <p className="mt-1">© 2025 Railhopp. Powered by UK rail network data feeds.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
