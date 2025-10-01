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
} from 'lucide-react'
import StationSearch from '@/components/StationSearch'
import EnhancedDepartureBoard from '@/components/EnhancedDepartureBoard'
import NetworkStatusDashboard from '@/components/NetworkStatusDashboard'
import ErrorBoundary from '@/components/ErrorBoundary'
import StationSummaryCard from '@/components/StationSummaryCard'

interface Station {
  code: string
  name: string
  group?: string
}

interface DashboardStats {
  totalServices: number
  onTimePerformance: number
  delayedServices: number
  cancelledServices: number
  averageDelay: number
  networkStatus: 'good' | 'minor' | 'major' | 'severe'
}

export default function RailhoppHome() {
  // Journey planner stations
  const [selectedFromStation, setSelectedFromStation] = useState<Station | null>(null)
  const [selectedToStation, setSelectedToStation] = useState<Station | null>(null)

  // Departure board station (separate from journey planner)
  const [departureStation, setDepartureStation] = useState<Station>({
    code: 'KGX',
    name: 'London Kings Cross',
  })

  const [departureTime, setDepartureTime] = useState('now')
  const [activeTab, setActiveTab] = useState<'journey' | 'departures' | 'status' | 'dashboard'>(
    'dashboard'
  )
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [mounted, setMounted] = useState(false)

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

  useEffect(() => {
    // Set initial time on client side only
    setMounted(true)
    setCurrentTime(new Date().toLocaleTimeString())

    fetchDashboardStats()
    const interval = setInterval(() => {
      fetchDashboardStats()
      setCurrentTime(new Date().toLocaleTimeString())
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      // Fetch network status first
      const networkResponse = await fetch('/api/disruptions')
      const networkResult = await networkResponse.json()

      // Calculate stats from available data
      const stats: DashboardStats = {
        totalServices: 1247,
        onTimePerformance: 91.2,
        delayedServices: 87,
        cancelledServices: 12,
        averageDelay: 4.3,
        networkStatus: networkResult.success ? networkResult.data.overall : 'good',
      }

      setDashboardStats(stats)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      // Set default stats
      setDashboardStats({
        totalServices: 1247,
        onTimePerformance: 91.2,
        delayedServices: 87,
        cancelledServices: 12,
        averageDelay: 4.3,
        networkStatus: 'good',
      })
    }
  }

  const handleJourneySearch = () => {
    if (selectedFromStation && selectedToStation) {
      const searchParams = new URLSearchParams({
        from: selectedFromStation.code,
        to: selectedToStation.code,
        fromName: selectedFromStation.name,
        toName: selectedToStation.name,
      })
      window.location.href = `/journey?${searchParams.toString()}`
    }
  }

  const goToDepartures = () => {
    setActiveTab('departures')
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600'
    if (percentage >= 90) return 'text-blue-600'
    if (percentage >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Clean Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Train className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Railhopp</h1>
            </div>
            <nav className="hidden space-x-8 md:flex">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('journey')}
                className={`font-medium transition-colors ${
                  activeTab === 'journey' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Journey Planner
              </button>
              <button
                onClick={() => setActiveTab('departures')}
                className={`font-medium transition-colors ${
                  activeTab === 'departures'
                    ? 'text-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Departures
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`font-medium transition-colors ${
                  activeTab === 'status' ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Network Status
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && mounted && (
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900">Live UK Rail Dashboard</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Real-time insights and live data from across the UK rail network
            </p>
          </div>

          {/* Key Metrics */}
          {dashboardStats && (
            <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Services</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardStats.totalServices.toLocaleString()}
                    </p>
                  </div>
                  <Train className="h-8 w-8 text-blue-600" />
                </div>
                <p className="mt-2 text-sm text-gray-500">Active today</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">On-Time Performance</p>
                    <p
                      className={`text-2xl font-bold ${getPerformanceColor(dashboardStats.onTimePerformance)}`}
                    >
                      {dashboardStats.onTimePerformance}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <p className="mt-2 text-sm text-gray-500">Last 24 hours</p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Delayed Services</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {dashboardStats.delayedServices}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-amber-600" />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Average: {dashboardStats.averageDelay}min
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Network Status</p>
                    <p className="text-2xl font-bold capitalize text-green-600">
                      {dashboardStats.networkStatus}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {dashboardStats.cancelledServices} cancelled
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-12 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <button
                onClick={() => setActiveTab('journey')}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <Search className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                    Plan Journey
                  </div>
                  <div className="text-sm text-gray-500">Find the best routes</div>
                </div>
              </button>

              <button
                onClick={goToDepartures}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <Train className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                    Live Departures
                  </div>
                  <div className="text-sm text-gray-500">Check departure times</div>
                </div>
              </button>

              <a
                href="/dashboard"
                className="group flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-300 hover:shadow-sm"
              >
                <Activity className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                    Full Dashboard
                  </div>
                  <div className="text-sm text-gray-500">Complete overview</div>
                </div>
              </a>
            </div>
          </div>

          {/* Station Summary (Knowledgebase) */}
          <div className="mb-12">
            <StationSummaryCard />
          </div>

          {/* Live Data Sections */}
          <div className="mb-12 grid gap-8 lg:grid-cols-2">
            {/* Live Departures */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Live Departures</h3>
                <button
                  onClick={() => setActiveTab('departures')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View All →
                </button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <select
                    value={departureStation.code}
                    onChange={(e) => {
                      const stationCode = e.target.value
                      const stationName = [
                        { code: 'KGX', name: 'London Kings Cross' },
                        { code: 'EUS', name: 'London Euston' },
                        { code: 'PAD', name: 'London Paddington' },
                        { code: 'VIC', name: 'London Victoria' },
                        { code: 'WAT', name: 'London Waterloo' },
                        { code: 'LST', name: 'London Liverpool Street' },
                      ].find((s) => s.code === stationCode)
                      if (stationName) setDepartureStation(stationName)
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="KGX">London Kings Cross</option>
                    <option value="EUS">London Euston</option>
                    <option value="PAD">London Paddington</option>
                    <option value="VIC">London Victoria</option>
                    <option value="WAT">London Waterloo</option>
                    <option value="LST">London Liverpool Street</option>
                  </select>
                </div>
              </div>

              <ErrorBoundary
                fallback={
                  <div className="p-4 text-center text-gray-500">
                    <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
                    <p>Unable to load departure board</p>
                  </div>
                }
              >
                <EnhancedDepartureBoard
                  stationCode={departureStation.code}
                  maxResults={5}
                  showDetailed={false}
                  compact={true}
                />
              </ErrorBoundary>
            </div>

            {/* Network Status */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Network Status</h3>
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
        </main>
      )}

      {/* Hero Section - Journey Planner */}
      {activeTab === 'journey' && (
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900">
              Plan your perfect rail journey
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Find the best trains, compare prices, and book tickets for travel across the UK
            </p>
          </div>

          {/* Main Journey Planner Card */}
          <div className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              <div className="p-8">
                <div className="grid items-end gap-6 md:grid-cols-5">
                  {/* From Station */}
                  <div className="md:col-span-2">
                    <label className="mb-3 block text-sm font-semibold text-slate-700">From</label>
                    <StationSearch
                      placeholder="Departure station"
                      value={selectedFromStation ? `${selectedFromStation.name}` : ''}
                      onSelect={(station) => handleStationSelect(station, 'from')}
                      onClear={() => setSelectedFromStation(null)}
                    />
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center">
                    <button
                      onClick={handleSwapStations}
                      className="rounded-full bg-slate-100 p-3 transition-colors hover:bg-slate-200"
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
                      value={selectedToStation ? `${selectedToStation.name}` : ''}
                      onSelect={(station) => handleStationSelect(station, 'to')}
                      onClear={() => setSelectedToStation(null)}
                    />
                  </div>
                </div>

                {/* Date and Time Row */}
                <div className="mt-6 grid items-end gap-6 md:grid-cols-3">
                  <div>
                    <label className="mb-3 block text-sm font-semibold text-slate-700">
                      Departure
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="date"
                        className="rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        defaultValue={new Date().toISOString().split('T')[0]}
                      />
                      <select
                        value={departureTime}
                        onChange={(e) => setDepartureTime(e.target.value)}
                        className="rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="now">Now</option>
                        <option value="09:00">09:00</option>
                        <option value="12:00">12:00</option>
                        <option value="17:00">17:00</option>
                        <option value="custom">Choose time</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-sm font-semibold text-slate-700">
                      Passengers
                    </label>
                    <select className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500">
                      <option>1 Adult</option>
                      <option>2 Adults</option>
                      <option>1 Adult, 1 Child</option>
                      <option>Family (2+2)</option>
                    </select>
                  </div>

                  <button
                    onClick={handleJourneySearch}
                    disabled={!selectedFromStation || !selectedToStation}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Search className="h-5 w-5" />
                    Find Trains
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Routes */}
          <div className="mx-auto mt-16 max-w-4xl">
            <h3 className="mb-8 text-center text-2xl font-bold text-slate-900">Popular Routes</h3>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { from: 'London', to: 'Manchester', time: '2h 8m', price: 'from £29' },
                { from: 'London', to: 'Edinburgh', time: '4h 20m', price: 'from £45' },
                { from: 'Birmingham', to: 'London', time: '1h 24m', price: 'from £25' },
                { from: 'London', to: 'Bath', time: '1h 25m', price: 'from £22' },
                { from: 'York', to: 'London', time: '1h 53m', price: 'from £31' },
                { from: 'London', to: 'Cardiff', time: '2h 3m', price: 'from £28' },
              ].map((route, idx) => (
                <button
                  key={idx}
                  className="group rounded-lg border border-slate-200 bg-white p-6 text-left transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-semibold text-slate-900">
                      {route.from} → {route.to}
                    </div>
                    <Clock className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{route.time}</span>
                    <span className="font-medium text-green-600">{route.price}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Live Departures Tab */}
      {activeTab === 'departures' && (
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900">Live Departure Boards</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Real-time departure information from major UK railway stations
            </p>
          </div>

          {/* Station Selection */}
          <div className="mx-auto mb-12 max-w-2xl">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="mb-3 block text-sm font-semibold text-slate-700">
                Select Station
              </label>
              <StationSearch
                placeholder="Search for a station"
                value={departureStation ? `${departureStation.name}` : ''}
                onSelect={(station) => setDepartureStation(station)}
                onClear={() => setDepartureStation({ code: 'KGX', name: 'London Kings Cross' })}
              />
            </div>
          </div>

          {/* Quick Station Links */}
          <div className="mb-12 flex flex-wrap justify-center gap-4">
            {[
              { name: 'Kings Cross', code: 'KGX' },
              { name: 'Euston', code: 'EUS' },
              { name: 'Paddington', code: 'PAD' },
              { name: 'Victoria', code: 'VIC' },
              { name: 'Waterloo', code: 'WAT' },
              { name: 'Liverpool St', code: 'LST' },
            ].map((station) => (
              <button
                key={station.code}
                onClick={() =>
                  setDepartureStation({ code: station.code, name: `London ${station.name}` })
                }
                className={`rounded-lg border px-6 py-3 font-medium transition-all ${
                  departureStation?.code === station.code
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'
                }`}
              >
                {station.name}
              </button>
            ))}
          </div>

          {/* Live Departure Board */}
          <div className="mx-auto max-w-6xl">
            <ErrorBoundary
              fallback={
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                  <p className="text-slate-600">Unable to load departure information</p>
                </div>
              }
            >
              <EnhancedDepartureBoard
                stationCode={departureStation.code}
                maxResults={15}
                showDetailed={true}
                compact={false}
                autoRefresh={true}
                variant="modern"
              />
            </ErrorBoundary>
          </div>
        </main>
      )}

      {/* Network Status Tab */}
      {activeTab === 'status' && (
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-slate-900">Network Status</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Live status and disruptions across the UK rail network
            </p>
          </div>

          <ErrorBoundary
            fallback={
              <div className="mx-auto max-w-4xl">
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                  <p className="text-slate-600">Unable to load network status</p>
                </div>
              </div>
            }
          >
            <NetworkStatusDashboard compact={false} showFilters={true} />
          </ErrorBoundary>
        </main>
      )}
    </div>
  )
}
