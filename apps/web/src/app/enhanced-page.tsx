'use client'

import { useState, useEffect } from 'react'
import {
  ArrowLeftRight,
  Search,
  Clock,
  MapPin,
  Train,
  Zap,
  Activity,
  TrendingUp,
  AlertTriangle,
  Star,
  Navigation,
  RefreshCw,
  Eye,
  Map,
  Calendar,
  Users,
  ArrowRight,
} from 'lucide-react'
import StationSearch from '@/components/StationSearch'
import EnhancedDepartureBoard from '@/components/EnhancedDepartureBoard'
import NetworkStatusDashboard from '@/components/NetworkStatusDashboard'
import ErrorBoundary from '@/components/ErrorBoundary'

interface Station {
  code: string
  name: string
  group?: string
}

interface PopularRoute {
  from: string
  to: string
  fromCode: string
  toCode: string
  duration: string
  frequency: string
  price: string
}

interface LiveService {
  operator: string
  destination: string
  scheduled: string
  expected: string
  platform: string
  status: 'onTime' | 'delayed' | 'cancelled'
  delay?: number
}

export default function EnhancedRailhoppHome() {
  // Main state
  const [selectedFromStation, setSelectedFromStation] = useState<Station | null>(null)
  const [selectedToStation, setSelectedToStation] = useState<Station | null>(null)
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0])
  const [departureTime, setDepartureTime] = useState('now')
  const [passengers, setPassengers] = useState('1')
  const [currentTime, setCurrentTime] = useState<string>('')
  const [mounted, setMounted] = useState(false)

  // Popular stations like Realtime Trains
  const popularStations = [
    { code: 'KGX', name: 'London Kings Cross' },
    { code: 'EUS', name: 'London Euston' },
    { code: 'PAD', name: 'London Paddington' },
    { code: 'VIC', name: 'London Victoria' },
    { code: 'WAT', name: 'London Waterloo' },
    { code: 'LST', name: 'London Liverpool Street' },
    { code: 'MAN', name: 'Manchester Piccadilly' },
    { code: 'BHM', name: 'Birmingham New Street' },
    { code: 'EDB', name: 'Edinburgh' },
    { code: 'GLA', name: 'Glasgow Central' },
    { code: 'LBG', name: 'London Bridge' },
    { code: 'CLJ', name: 'Clapham Junction' },
  ]

  // Popular routes inspired by Trainline
  const popularRoutes: PopularRoute[] = [
    {
      from: 'London',
      to: 'Manchester',
      fromCode: 'EUS',
      toCode: 'MAN',
      duration: '2h 8m',
      frequency: 'Every 20 mins',
      price: 'from £29',
    },
    {
      from: 'London',
      to: 'Edinburgh',
      fromCode: 'KGX',
      toCode: 'EDB',
      duration: '4h 20m',
      frequency: 'Every 30 mins',
      price: 'from £45',
    },
    {
      from: 'London',
      to: 'Birmingham',
      fromCode: 'EUS',
      toCode: 'BHM',
      duration: '1h 24m',
      frequency: 'Every 15 mins',
      price: 'from £25',
    },
    {
      from: 'London',
      to: 'Bristol',
      fromCode: 'PAD',
      toCode: 'BRI',
      duration: '1h 45m',
      frequency: 'Every 30 mins',
      price: 'from £28',
    },
    {
      from: 'London',
      to: 'Cardiff',
      fromCode: 'PAD',
      toCode: 'CDF',
      duration: '2h 3m',
      frequency: 'Every 30 mins',
      price: 'from £28',
    },
    {
      from: 'London',
      to: 'Bath',
      fromCode: 'PAD',
      toCode: 'BTH',
      duration: '1h 25m',
      frequency: 'Every 30 mins',
      price: 'from £22',
    },
  ]

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date().toLocaleTimeString('en-GB', { timeStyle: 'short' }))

    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-GB', { timeStyle: 'short' }))
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const handleStationSelect = (station: Station, type: 'from' | 'to') => {
    if (type === 'from') {
      setSelectedFromStation(station)
    } else {
      setSelectedToStation(station)
    }
  }

  const handleSwapStations = () => {
    const temp = selectedFromStation
    setSelectedFromStation(selectedToStation)
    setSelectedToStation(temp)
  }

  const handleJourneySearch = () => {
    if (selectedFromStation && selectedToStation) {
      const searchParams = new URLSearchParams({
        from: selectedFromStation.code,
        to: selectedToStation.code,
        fromName: selectedFromStation.name,
        toName: selectedToStation.name,
        date: departureDate,
        time: departureTime,
        passengers: passengers,
      })
      window.location.href = `/journey?${searchParams.toString()}`
    }
  }

  const selectPopularRoute = (route: PopularRoute) => {
    setSelectedFromStation({ code: route.fromCode, name: route.from })
    setSelectedToStation({ code: route.toCode, name: route.to })
  }

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Train className="mx-auto mb-4 h-12 w-12 animate-pulse text-blue-600" />
          <p className="text-gray-600">Loading Railhopp...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Enhanced Header with live time */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-blue-700">
                <Train className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Railhopp</h1>
                <p className="text-xs text-slate-500">Live UK Rail Information</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 rounded-lg bg-green-50 px-3 py-1 sm:flex">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700">Live {currentTime}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section - Enhanced Journey Search */}
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-5xl font-bold text-slate-900">
            Find your perfect
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {' '}
              rail journey
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-slate-600">
            Search live times, compare routes, and track trains across the UK rail network
          </p>
        </div>

        {/* Enhanced Search Form */}
        <div className="mx-auto mb-16 max-w-5xl">
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-200">
            <div className="p-8">
              {/* Station Selection Row */}
              <div className="mb-6 grid items-end gap-4 md:grid-cols-5">
                {/* From Station */}
                <div className="md:col-span-2">
                  <label className="mb-3 block text-sm font-semibold text-slate-700">From</label>
                  <StationSearch
                    placeholder="Departure station"
                    value={selectedFromStation ? selectedFromStation.name : ''}
                    onSelect={(station) => handleStationSelect(station, 'from')}
                    onClear={() => setSelectedFromStation(null)}
                  />
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleSwapStations}
                    className="rounded-full bg-slate-100 p-3 transition-all hover:bg-slate-200 hover:scale-105 disabled:opacity-50"
                    disabled={!selectedFromStation && !selectedToStation}
                  >
                    <ArrowLeftRight className="h-5 w-5 text-slate-600" />
                  </button>
                </div>

                {/* To Station */}
                <div className="md:col-span-2">
                  <label className="mb-3 block text-sm font-semibold text-slate-700">To</label>
                  <StationSearch
                    placeholder="Destination station"
                    value={selectedToStation ? selectedToStation.name : ''}
                    onSelect={(station) => handleStationSelect(station, 'to')}
                    onClear={() => setSelectedToStation(null)}
                  />
                </div>
              </div>

              {/* Journey Options Row */}
              <div className="mb-6 grid items-end gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-700">Date</label>
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-700">Time</label>
                  <select
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="now">Now</option>
                    <option value="06:00">06:00</option>
                    <option value="09:00">09:00</option>
                    <option value="12:00">12:00</option>
                    <option value="17:00">17:00</option>
                    <option value="19:00">19:00</option>
                  </select>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-semibold text-slate-700">Passengers</label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">1 Adult</option>
                    <option value="2">2 Adults</option>
                    <option value="1child">1 Adult, 1 Child</option>
                    <option value="family">Family (2+2)</option>
                  </select>
                </div>

                <button
                  onClick={handleJourneySearch}
                  disabled={!selectedFromStation || !selectedToStation}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 py-4 px-8 text-lg font-semibold text-white transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
                >
                  <Search className="h-5 w-5" />
                  Search Trains
                </button>
              </div>

              {/* Quick Options */}
              <div className="flex flex-wrap justify-center gap-2">
                <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-100 hover:text-blue-700">
                  Return Journey
                </button>
                <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-100 hover:text-blue-700">
                  Add Railcard
                </button>
                <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-100 hover:text-blue-700">
                  Split Tickets
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Routes Section */}
        <div className="mb-16">
          <div className="mb-8 text-center">
            <h3 className="mb-2 text-3xl font-bold text-slate-900">Popular Routes</h3>
            <p className="text-slate-600">Quick access to the most traveled routes</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {popularRoutes.map((route, index) => (
              <button
                key={index}
                onClick={() => selectPopularRoute(route)}
                className="group rounded-2xl border border-slate-200 bg-white p-6 text-left transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-lg font-semibold text-slate-900 group-hover:text-blue-600">
                    {route.from} → {route.to}
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />
                </div>
                <div className="mb-2 flex items-center gap-4 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {route.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    {route.frequency}
                  </span>
                </div>
                <div className="font-medium text-green-600">{route.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Stations Section */}
        <div className="mb-16">
          <div className="mb-8 text-center">
            <h3 className="mb-2 text-3xl font-bold text-slate-900">Popular Departure Boards</h3>
            <p className="text-slate-600">Live departure information from major stations</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popularStations.map((station) => (
              <a
                key={station.code}
                href={`/departures?station=${station.code}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-blue-100">
                    <Train className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600">
                      {station.name}
                    </div>
                    <div className="text-sm text-slate-500">{station.code}</div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Live Features Section */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Sample Live Departures */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">
                Live Departures - London Kings Cross
              </h3>
              <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-green-700">Live</span>
              </div>
            </div>
            <ErrorBoundary
              fallback={
                <div className="p-4 text-center text-gray-500">
                  <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                  <p>Unable to load live departures</p>
                </div>
              }
            >
              <EnhancedDepartureBoard stationCode="KGX" maxResults={5} compact={true} />
            </ErrorBoundary>
          </div>

          {/* Network Status Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-xl font-semibold text-slate-900">Network Status</h3>
            <ErrorBoundary
              fallback={
                <div className="p-4 text-center text-gray-500">
                  <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                  <p>Unable to load network status</p>
                </div>
              }
            >
              <NetworkStatusDashboard compact={true} showFilters={false} />
            </ErrorBoundary>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900">Live Tracking</h3>
            <p className="text-slate-600">
              Track trains in real-time with live position updates and delay notifications
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Map className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900">Interactive Maps</h3>
            <p className="text-slate-600">
              View live train positions and network status on interactive route maps
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900">Smart Alerts</h3>
            <p className="text-slate-600">
              Get notified about delays, platform changes, and service disruptions
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-slate-600">
            <p>&copy; 2025 Railhopp. Live UK rail information powered by real-time data feeds.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}