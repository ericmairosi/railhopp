'use client'

import { useState, useEffect } from 'react'
import {
  Train,
  MapPin,
  Clock,
  ArrowRight,
  Zap,
  AlertCircle,
  Navigation2,
  Route,
  Users,
  Activity,
} from 'lucide-react'
import Navigation from '@/components/Navigation'
import StationSearch from '@/components/StationSearch'
import EnhancedDepartureBoard from '@/components/EnhancedDepartureBoard'
import InteractiveMap from '@/components/InteractiveMap'
import EnhancedJourneyPlanner from '@/components/EnhancedJourneyPlanner'
import LiveUpdates from '@/components/LiveUpdates'

interface Station {
  code: string
  name: string
  group?: string
}

export default function RailhoppHome() {
  const [selectedFromStation, setSelectedFromStation] = useState<Station | null>(null)
  const [selectedToStation, setSelectedToStation] = useState<Station | null>(null)
  const [watchedStations, setWatchedStations] = useState<string[]>(['KGX', 'EUS', 'PAD']) // London terminals
  const [mapCenter, setMapCenter] = useState({ lat: 51.5074, lng: -0.1278 }) // London
  const [activeView, setActiveView] = useState<'overview' | 'journey' | 'map'>('overview')

  // Real-time data states
  const [departures, setDepartures] = useState<Record<string, any>>({})
  const [liveTrains, setLiveTrains] = useState([])
  const [networkStatus, setNetworkStatus] = useState('operational')

  // Responsive layout
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch live data on mount and set up real-time updates
  useEffect(() => {
    const fetchLiveData = async () => {
      // Fetch departures for watched stations
      for (const stationCode of watchedStations) {
        try {
          const response = await fetch(`/api/unified/departures?crs=${stationCode}&numRows=5`)
          const data = await response.json()
          if (data.success) {
            setDepartures((prev) => ({
              ...prev,
              [stationCode]: data.data,
            }))
          }
        } catch (error) {
          console.error(`Error fetching departures for ${stationCode}:`, error)
        }
      }
    }

    fetchLiveData()

    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchLiveData, 30000)
    return () => clearInterval(interval)
  }, [watchedStations])

  const handleStationSelect = (station: Station, type: 'from' | 'to') => {
    if (type === 'from') {
      setSelectedFromStation(station)
    } else {
      setSelectedToStation(station)
    }

    // Center map on selected station
    // Note: Would need coordinates lookup in production
    setMapCenter({ lat: 51.5074, lng: -0.1278 })
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage="home" />

      {/* Main Content - Three Panel Layout */}
      <main className="flex-1">
        <div className="flex h-screen">
          {/* Left Panel - Journey Planner */}
          <div
            className={`${isMobile ? 'hidden' : 'w-80'} flex flex-col border-r border-slate-200 bg-white`}
          >
            <div className="flex-1 overflow-y-auto">
              {/* Journey Planner Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="mb-4 flex items-center gap-3">
                  <Route className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Journey Planner</h2>
                </div>
                <p className="text-sm text-blue-100">
                  Plan your journey across the UK rail network
                </p>
              </div>

              {/* Journey Form */}
              <div className="space-y-6 p-6">
                {/* From Station */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">From</label>
                  <div className="relative">
                    <StationSearch
                      placeholder="Enter departure station"
                      value={
                        selectedFromStation
                          ? `${selectedFromStation.name} (${selectedFromStation.code})`
                          : ''
                      }
                      onSelect={(station) => handleStationSelect(station, 'from')}
                      onClear={() => setSelectedFromStation(null)}
                    />
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      const temp = selectedFromStation
                      setSelectedFromStation(selectedToStation)
                      setSelectedToStation(temp)
                    }}
                    className="rounded-full border border-slate-300 p-2 transition-colors hover:bg-slate-50"
                    disabled={!selectedFromStation && !selectedToStation}
                  >
                    <ArrowRight className="h-5 w-5 text-slate-600" />
                  </button>
                </div>

                {/* To Station */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">To</label>
                  <div className="relative">
                    <StationSearch
                      placeholder="Enter destination station"
                      value={
                        selectedToStation
                          ? `${selectedToStation.name} (${selectedToStation.code})`
                          : ''
                      }
                      onSelect={(station) => handleStationSelect(station, 'to')}
                      onClear={() => setSelectedToStation(null)}
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Date</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Time</label>
                    <input
                      type="time"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      defaultValue="09:00"
                    />
                  </div>
                </div>

                {/* Journey Options */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-700">Preferences</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="journeyType"
                        value="depart"
                        defaultChecked
                        className="mr-2"
                      />
                      <span className="text-sm">Departing at this time</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="journeyType" value="arrive" className="mr-2" />
                      <span className="text-sm">Arriving by this time</span>
                    </label>
                  </div>
                </div>

                {/* Search Button */}
                <button
                  onClick={handleJourneySearch}
                  disabled={!selectedFromStation || !selectedToStation}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Route className="h-5 w-5" />
                  Find Trains
                </button>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-slate-200 p-6">
                <h3 className="mb-3 text-sm font-medium text-slate-700">Popular Routes</h3>
                <div className="space-y-2">
                  <button className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100">
                    London → Manchester
                  </button>
                  <button className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100">
                    London → Edinburgh
                  </button>
                  <button className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100">
                    Birmingham → London
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Interactive Map */}
          <div className="relative flex-1">
            {/* Map Header */}
            <div className="absolute left-0 right-0 top-0 z-10 border-b border-slate-200 bg-white/95 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Navigation2 className="h-6 w-6 text-slate-700" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">UK Rail Network</h2>
                    <p className="text-sm text-slate-600">
                      Live train positions and network status
                    </p>
                  </div>
                </div>

                {/* Map Controls */}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                      networkStatus === 'operational'
                        ? 'bg-green-100 text-green-800'
                        : networkStatus === 'disrupted'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        networkStatus === 'operational'
                          ? 'animate-pulse bg-green-500'
                          : networkStatus === 'disrupted'
                            ? 'animate-pulse bg-amber-500'
                            : 'animate-pulse bg-red-500'
                      }`}
                    ></div>
                    Network {networkStatus}
                  </div>

                  <button className="rounded-lg p-2 transition-colors hover:bg-slate-100">
                    <Activity className="h-5 w-5 text-slate-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Map Component */}
            <div className="h-full pt-20">
              {(() => {
                const selectedStationsForMap: Station[] = [
                  selectedFromStation,
                  selectedToStation,
                ].filter((s): s is Station => Boolean(s))
                return (
                  <InteractiveMap
                    center={mapCenter}
                    selectedStations={selectedStationsForMap}
                    liveTrains={liveTrains}
                    onStationClick={(station) => {
                      if (!selectedFromStation) {
                        setSelectedFromStation(station)
                      } else if (!selectedToStation) {
                        setSelectedToStation(station)
                      }
                    }}
                  />
                )
              })()}
            </div>

            {/* Map Overlay - Journey Route */}
            {selectedFromStation && selectedToStation && (
              <div className="absolute bottom-6 left-6 right-6 z-10">
                <div className="rounded-lg border border-slate-200 bg-white/95 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                      <span className="font-medium">{selectedFromStation.name}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{selectedToStation.name}</span>
                      <div className="h-3 w-3 rounded-full bg-green-600"></div>
                    </div>
                    <button
                      onClick={handleJourneySearch}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                      Plan Journey
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Live Departure Boards */}
          <div
            className={`${isMobile ? 'hidden' : 'w-96'} flex flex-col border-l border-slate-200 bg-white`}
          >
            <div className="flex-1 overflow-y-auto">
              {/* Live Boards Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 text-white">
                <div className="mb-4 flex items-center gap-3">
                  <Activity className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Live Departures</h2>
                </div>
                <p className="text-sm text-emerald-100">
                  Real-time information from major stations
                </p>
              </div>

              {/* Station Tabs */}
              <div className="border-b border-slate-200">
                <div className="flex overflow-x-auto">
                  {watchedStations.map((stationCode) => (
                    <button
                      key={stationCode}
                      className="whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium hover:border-slate-300"
                    >
                      {stationCode}
                    </button>
                  ))}
                  <button className="whitespace-nowrap px-4 py-3 text-sm text-slate-500 hover:text-slate-700">
                    + Add Station
                  </button>
                </div>
              </div>

              {/* Departure Boards */}
              <div className="space-y-6 p-4">
                {Object.entries(departures).map(([stationCode, stationData]: [string, any]) => (
                  <div key={stationCode} className="space-y-3">
                    <h3 className="flex items-center gap-2 font-bold text-slate-900">
                      <MapPin className="h-4 w-4" />
                      {stationData.stationName}
                    </h3>

                    {stationData.departures && stationData.departures.length > 0 ? (
                      <div className="space-y-2">
                        {stationData.departures.slice(0, 3).map((departure: any, idx: number) => (
                          <div key={idx} className="rounded-lg bg-slate-50 p-3 text-sm">
                            <div className="mb-2 flex items-start justify-between">
                              <div className="font-semibold text-slate-900">
                                {departure.destination}
                              </div>
                              <div
                                className={`rounded px-2 py-1 text-xs ${
                                  departure.status === 'On Time'
                                    ? 'bg-green-100 text-green-700'
                                    : departure.status === 'Delayed'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {departure.status}
                              </div>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Plat {departure.platform}</span>
                              <span>{departure.scheduledTime}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-500">
                        <Train className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">No departures available</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Network Status */}
              <div className="border-t border-slate-200 p-4">
                <LiveUpdates />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-4">
          <div className="flex justify-around">
            <button
              onClick={() => setActiveView('journey')}
              className={`flex flex-col items-center gap-1 p-2 ${activeView === 'journey' ? 'text-blue-600' : 'text-slate-600'}`}
            >
              <Route className="h-6 w-6" />
              <span className="text-xs">Journey</span>
            </button>
            <button
              onClick={() => setActiveView('map')}
              className={`flex flex-col items-center gap-1 p-2 ${activeView === 'map' ? 'text-blue-600' : 'text-slate-600'}`}
            >
              <Navigation2 className="h-6 w-6" />
              <span className="text-xs">Map</span>
            </button>
            <button
              onClick={() => setActiveView('overview')}
              className={`flex flex-col items-center gap-1 p-2 ${activeView === 'overview' ? 'text-blue-600' : 'text-slate-600'}`}
            >
              <Activity className="h-6 w-6" />
              <span className="text-xs">Live</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
