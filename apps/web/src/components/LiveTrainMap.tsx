'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Train,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MapPin,
  AlertCircle,
  RefreshCw,
  Signal,
  Clock,
  Info,
} from 'lucide-react'

interface TrainPosition {
  id: string
  headcode: string
  operator: string
  origin: string
  destination: string
  x: number // Map coordinates
  y: number
  speed: number
  direction: number // degrees
  delayed: boolean
  onTime: boolean
  nextStation: string
  platform?: string
  status: 'moving' | 'stopped' | 'approaching' | 'delayed'
}

interface Signal {
  id: string
  x: number
  y: number
  aspect: 'red' | 'yellow' | 'green' | 'unknown'
  type: 'main' | 'distant' | 'shunt'
}

interface Station {
  id: string
  name: string
  code: string
  x: number
  y: number
  platforms: number
  isJunction: boolean
}

interface LiveTrainMapProps {
  region?: string
  height?: string
  showSignals?: boolean
  showStations?: boolean
  autoRefresh?: boolean
  className?: string
}

export default function LiveTrainMap({
  region = 'london',
  height = '400px',
  showSignals = true,
  showStations = true,
  autoRefresh = true,
  className = '',
}: LiveTrainMapProps) {
  const [trains, setTrains] = useState<TrainPosition[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [selectedTrain, setSelectedTrain] = useState<TrainPosition | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const mapRef = useRef<SVGSVGElement>(null)

  // Mock data generation - in real app this would come from live APIs
  const generateMockTrains = (): TrainPosition[] => {
    const mockTrains: TrainPosition[] = []
    const operators = ['LNER', 'GWR', 'SWR', 'Northern', 'CrossCountry']
    const routes = [
      { origin: 'London KGX', destination: 'Edinburgh', headcode: '1S05' },
      { origin: 'Manchester', destination: 'London EUS', headcode: '1A24' },
      { origin: 'London PAD', destination: 'Cardiff', headcode: '1W15' },
      { origin: 'Birmingham', destination: 'London EUS', headcode: '1B42' },
      { origin: 'London WAT', destination: 'Bournemouth', headcode: '1W83' },
    ]

    for (let i = 0; i < 12; i++) {
      const route = routes[i % routes.length]
      const operator = operators[i % operators.length]
      
      mockTrains.push({
        id: `train_${i + 1}`,
        headcode: `${route.headcode}${String(i + 1).padStart(2, '0')}`,
        operator,
        origin: route.origin,
        destination: route.destination,
        x: 50 + (i % 4) * 200 + Math.random() * 150,
        y: 50 + Math.floor(i / 4) * 120 + Math.random() * 80,
        speed: Math.random() * 125,
        direction: Math.random() * 360,
        delayed: Math.random() > 0.8,
        onTime: Math.random() > 0.3,
        nextStation: `Station ${String.fromCharCode(65 + (i % 10))}`,
        platform: Math.random() > 0.5 ? `${Math.floor(Math.random() * 12) + 1}` : undefined,
        status: (['moving', 'stopped', 'approaching'] as const)[Math.floor(Math.random() * 3)],
      })
    }

    return mockTrains
  }

  const generateMockSignals = (): Signal[] => {
    const mockSignals: Signal[] = []
    for (let i = 0; i < 20; i++) {
      mockSignals.push({
        id: `signal_${i + 1}`,
        x: Math.random() * 800,
        y: Math.random() * 400,
        aspect: (['red', 'yellow', 'green'] as const)[Math.floor(Math.random() * 3)],
        type: (['main', 'distant'] as const)[Math.floor(Math.random() * 2)],
      })
    }
    return mockSignals
  }

  const generateMockStations = (): Station[] => {
    const stationNames = [
      'King\'s Cross', 'Euston', 'Paddington', 'Victoria', 'Waterloo',
      'Liverpool St', 'London Bridge', 'Clapham Junction', 'Stratford'
    ]
    
    return stationNames.map((name, i) => ({
      id: `station_${i}`,
      name,
      code: name.substring(0, 3).toUpperCase(),
      x: 100 + (i % 3) * 250,
      y: 80 + Math.floor(i / 3) * 140,
      platforms: Math.floor(Math.random() * 20) + 4,
      isJunction: Math.random() > 0.7,
    }))
  }

  useEffect(() => {
    // Initialize with mock data
    setTrains(generateMockTrains())
    setSignals(generateMockSignals())
    setStations(generateMockStations())
    setLoading(false)
    setLastUpdate(new Date())

    if (autoRefresh) {
      const interval = setInterval(() => {
        // Update train positions
        setTrains(prev => prev.map(train => ({
          ...train,
          x: train.x + (Math.random() - 0.5) * 5,
          y: train.y + (Math.random() - 0.5) * 5,
          speed: Math.max(0, train.speed + (Math.random() - 0.5) * 10),
          status: (['moving', 'stopped', 'approaching', 'delayed'] as const)[Math.floor(Math.random() * 4)],
        })))
        setLastUpdate(new Date())
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true)
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const getTrainColor = (train: TrainPosition) => {
    if (train.delayed) return '#ef4444' // red-500
    if (train.status === 'stopped') return '#f97316' // orange-500
    if (train.status === 'approaching') return '#eab308' // yellow-500
    return '#22c55e' // green-500
  }

  const getSignalColor = (signal: Signal) => {
    switch (signal.aspect) {
      case 'red': return '#dc2626'
      case 'yellow': return '#ca8a04'
      case 'green': return '#16a34a'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 ${className}`} style={{ height }}>
        <div className="text-center">
          <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600">Loading live map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
          className="rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-slate-50"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
          className="rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-slate-50"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-slate-50"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Map Info */}
      <div className="absolute top-4 right-4 z-10 rounded-lg bg-white p-3 shadow-md">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
          <span className="text-sm font-medium">Live Map</span>
        </div>
        {lastUpdate && (
          <p className="text-xs text-slate-500">
            Updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* SVG Map */}
      <svg
        ref={mapRef}
        width="100%"
        height={height}
        className="cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${800 / zoom} ${400 / zoom}`}
      >
        {/* Grid Background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Railway Lines */}
        <g className="railway-lines">
          <line x1="100" y1="100" x2="700" y2="100" stroke="#475569" strokeWidth="3" />
          <line x1="300" y1="50" x2="300" y2="350" stroke="#475569" strokeWidth="3" />
          <line x1="500" y1="80" x2="600" y2="320" stroke="#475569" strokeWidth="3" />
        </g>

        {/* Stations */}
        {showStations && stations.map((station) => (
          <g key={station.id} className="station">
            <circle
              cx={station.x}
              cy={station.y}
              r={station.isJunction ? 12 : 8}
              fill="#1e293b"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <text
              x={station.x}
              y={station.y - 16}
              textAnchor="middle"
              fontSize="10"
              fill="#1e293b"
              fontWeight="bold"
            >
              {station.name}
            </text>
            <text
              x={station.x}
              y={station.y + 25}
              textAnchor="middle"
              fontSize="8"
              fill="#64748b"
            >
              {station.platforms} platforms
            </text>
          </g>
        ))}

        {/* Signals */}
        {showSignals && signals.map((signal) => (
          <g key={signal.id} className="signal">
            <rect
              x={signal.x - 3}
              y={signal.y - 8}
              width="6"
              height="16"
              fill={getSignalColor(signal)}
              rx="2"
            />
            <circle
              cx={signal.x}
              cy={signal.y}
              r="4"
              fill={getSignalColor(signal)}
              stroke="#ffffff"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* Trains */}
        {trains.map((train) => (
          <g
            key={train.id}
            className="train cursor-pointer"
            onClick={() => setSelectedTrain(train)}
            transform={`translate(${train.x}, ${train.y}) rotate(${train.direction})`}
          >
            <rect
              x="-8"
              y="-4"
              width="16"
              height="8"
              fill={getTrainColor(train)}
              stroke="#ffffff"
              strokeWidth="1"
              rx="2"
            />
            <polygon
              points="8,-2 12,0 8,2"
              fill={getTrainColor(train)}
            />
            {train.speed > 0 && (
              <text
                x="0"
                y="12"
                textAnchor="middle"
                fontSize="8"
                fill="#374151"
                fontWeight="bold"
              >
                {train.headcode}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Train Details Panel */}
      {selectedTrain && (
        <div className="absolute bottom-4 left-4 z-10 w-80 rounded-lg bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              {selectedTrain.headcode} - {selectedTrain.operator}
            </h3>
            <button
              onClick={() => setSelectedTrain(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Route:</span>
              <span className="font-medium">
                {selectedTrain.origin} → {selectedTrain.destination}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Speed:</span>
              <span className="font-medium">{Math.round(selectedTrain.speed)} mph</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Status:</span>
              <span className={`font-medium ${
                selectedTrain.delayed ? 'text-red-600' : 
                selectedTrain.status === 'stopped' ? 'text-orange-600' : 
                'text-green-600'
              }`}>
                {selectedTrain.delayed ? 'Delayed' : 
                 selectedTrain.status.charAt(0).toUpperCase() + selectedTrain.status.slice(1)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-slate-600">Next Station:</span>
              <span className="font-medium">{selectedTrain.nextStation}</span>
            </div>

            {selectedTrain.platform && (
              <div className="flex justify-between">
                <span className="text-slate-600">Platform:</span>
                <span className="font-medium">{selectedTrain.platform}</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200">
            <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
              View Service Details →
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-10 rounded-lg bg-white p-3 shadow-md">
        <h4 className="mb-2 text-sm font-semibold text-slate-900">Legend</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-green-500"></div>
            <span>On Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-red-500"></div>
            <span>Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-orange-500"></div>
            <span>Stopped</span>
          </div>
          {showSignals && (
            <>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-600"></div>
                <span>Green Signal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-600"></div>
                <span>Red Signal</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}