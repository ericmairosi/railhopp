'use client'

import { useEffect, useRef, useState } from 'react'
import { Train, MapPin, Navigation, AlertTriangle, Zap, Clock } from 'lucide-react'

interface Station {
  code: string
  name: string
  group?: string
  coordinates?: { lat: number; lng: number }
}

interface LiveTrain {
  id: string
  service: string
  operator: string
  from: string
  to: string
  coordinates: { lat: number; lng: number }
  speed: number
  status: 'onTime' | 'delayed' | 'cancelled'
  delay?: number
}

interface InteractiveMapProps {
  center: { lat: number; lng: number }
  selectedStations: Station[]
  liveTrains: LiveTrain[]
  onStationClick?: (station: Station) => void
  className?: string
}

// Major UK stations with coordinates for demonstration
const majorStations: Station[] = [
  { code: 'KGX', name: 'London Kings Cross', coordinates: { lat: 51.5308, lng: -0.1238 } },
  { code: 'EUS', name: 'London Euston', coordinates: { lat: 51.5282, lng: -0.1337 } },
  { code: 'PAD', name: 'London Paddington', coordinates: { lat: 51.5154, lng: -0.1755 } },
  { code: 'WAT', name: 'London Waterloo', coordinates: { lat: 51.5031, lng: -0.1132 } },
  { code: 'VIC', name: 'London Victoria', coordinates: { lat: 51.4952, lng: -0.1441 } },
  { code: 'LST', name: 'London Liverpool Street', coordinates: { lat: 51.5185, lng: -0.0814 } },
  { code: 'MAN', name: 'Manchester Piccadilly', coordinates: { lat: 53.4773, lng: -2.2309 } },
  { code: 'BHM', name: 'Birmingham New Street', coordinates: { lat: 52.4777, lng: -1.8996 } },
  { code: 'LDS', name: 'Leeds', coordinates: { lat: 53.7949, lng: -1.5491 } },
  { code: 'EDI', name: 'Edinburgh Waverley', coordinates: { lat: 55.952, lng: -3.1883 } },
  { code: 'GLC', name: 'Glasgow Central', coordinates: { lat: 55.8584, lng: -4.2579 } },
  { code: 'LIV', name: 'Liverpool Lime Street', coordinates: { lat: 53.4077, lng: -2.9773 } },
  { code: 'NCL', name: 'Newcastle Central', coordinates: { lat: 54.9689, lng: -1.6176 } },
  { code: 'YOR', name: 'York', coordinates: { lat: 53.9583, lng: -1.0933 } },
  { code: 'BRI', name: 'Bristol Temple Meads', coordinates: { lat: 51.4491, lng: -2.5813 } },
  { code: 'CDF', name: 'Cardiff Central', coordinates: { lat: 51.4761, lng: -3.1778 } },
  { code: 'BTN', name: 'Brighton', coordinates: { lat: 50.8292, lng: -0.1412 } },
  { code: 'RDG', name: 'Reading', coordinates: { lat: 51.4584, lng: -0.9706 } },
  { code: 'OXF', name: 'Oxford', coordinates: { lat: 51.7535, lng: -1.27 } },
  { code: 'CAM', name: 'Cambridge', coordinates: { lat: 52.1943, lng: 0.1371 } },
]

// Mock rail network connections for visualization
const railConnections = [
  // London to North
  { from: 'KGX', to: 'YOR', color: '#3B82F6' },
  { from: 'YOR', to: 'EDI', color: '#3B82F6' },
  { from: 'EUS', to: 'BHM', color: '#10B981' },
  { from: 'BHM', to: 'MAN', color: '#10B981' },
  { from: 'MAN', to: 'LDS', color: '#10B981' },
  { from: 'LIV', to: 'MAN', color: '#F59E0B' },
  { from: 'MAN', to: 'NCL', color: '#8B5CF6' },

  // London to West/South West
  { from: 'PAD', to: 'RDG', color: '#EC4899' },
  { from: 'RDG', to: 'BRI', color: '#EC4899' },
  { from: 'BRI', to: 'CDF', color: '#EC4899' },
  { from: 'WAT', to: 'BTN', color: '#06B6D4' },

  // East/South East
  { from: 'LST', to: 'CAM', color: '#84CC16' },
  { from: 'KGX', to: 'CAM', color: '#84CC16' },

  // Cross-country
  { from: 'BHM', to: 'BRI', color: '#F97316' },
  { from: 'OXF', to: 'BHM', color: '#EF4444' },
]

export default function InteractiveMap({
  center,
  selectedStations,
  liveTrains,
  onStationClick,
  className = '',
}: InteractiveMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapDimensions, setMapDimensions] = useState({ width: 800, height: 600 })
  const [hoveredStation, setHoveredStation] = useState<Station | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [viewBox, setViewBox] = useState({
    minLat: 49.5,
    maxLat: 60.5,
    minLng: -8,
    maxLng: 2,
  })

  // Convert lat/lng to canvas coordinates
  const latLngToCanvas = (lat: number, lng: number) => {
    const x = ((lng - viewBox.minLng) / (viewBox.maxLng - viewBox.minLng)) * mapDimensions.width
    const y =
      mapDimensions.height -
      ((lat - viewBox.minLat) / (viewBox.maxLat - viewBox.minLat)) * mapDimensions.height
    return { x, y }
  }

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMapDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Draw the map
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = mapDimensions.width
    canvas.height = mapDimensions.height

    // Clear canvas
    ctx.fillStyle = '#F8FAFC'
    ctx.fillRect(0, 0, mapDimensions.width, mapDimensions.height)

    // Draw rail connections
    railConnections.forEach((connection) => {
      const fromStation = majorStations.find((s) => s.code === connection.from)
      const toStation = majorStations.find((s) => s.code === connection.to)

      if (fromStation?.coordinates && toStation?.coordinates) {
        const fromPos = latLngToCanvas(fromStation.coordinates.lat, fromStation.coordinates.lng)
        const toPos = latLngToCanvas(toStation.coordinates.lat, toStation.coordinates.lng)

        ctx.strokeStyle = connection.color + '40' // Add transparency
        ctx.lineWidth = 3
        ctx.setLineDash([5, 3])
        ctx.beginPath()
        ctx.moveTo(fromPos.x, fromPos.y)
        ctx.lineTo(toPos.x, toPos.y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    })

    // Draw stations
    majorStations.forEach((station) => {
      if (!station.coordinates) return

      const pos = latLngToCanvas(station.coordinates.lat, station.coordinates.lng)
      const isSelected = selectedStations.some((s) => s.code === station.code)
      const isHovered = hoveredStation?.code === station.code

      // Station circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, isSelected ? 8 : isHovered ? 6 : 4, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? '#DC2626' : station.code.startsWith('L') ? '#3B82F6' : '#10B981'
      ctx.fill()

      // Station border
      if (isSelected || isHovered) {
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Station label for major stations or selected/hovered
      if (
        isSelected ||
        isHovered ||
        ['KGX', 'EUS', 'PAD', 'MAN', 'EDI', 'BHM'].includes(station.code)
      ) {
        ctx.fillStyle = '#1F2937'
        ctx.font = `${isSelected || isHovered ? '12px' : '10px'} -apple-system, BlinkMacSystemFont, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(station.code, pos.x, pos.y - (isSelected ? 12 : 8))
      }
    })

    // Draw live trains
    liveTrains.forEach((train) => {
      const pos = latLngToCanvas(train.coordinates.lat, train.coordinates.lng)

      // Train icon background
      ctx.fillStyle =
        train.status === 'onTime' ? '#10B981' : train.status === 'delayed' ? '#F59E0B' : '#EF4444'
      ctx.beginPath()
      ctx.roundRect(pos.x - 8, pos.y - 4, 16, 8, 2)
      ctx.fill()

      // Train icon
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🚄', pos.x, pos.y + 2)
    })
  }, [mapDimensions, selectedStations, liveTrains, hoveredStation, viewBox])

  // Handle mouse events
  const handleMouseMove = (event: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setMousePosition({ x: event.clientX, y: event.clientY })

    // Check if hovering over a station
    let foundStation: Station | null = null
    for (const station of majorStations) {
      if (!station.coordinates) continue

      const pos = latLngToCanvas(station.coordinates.lat, station.coordinates.lng)
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2))

      if (distance <= 8) {
        foundStation = station
        break
      }
    }

    setHoveredStation(foundStation)
  }

  const handleClick = (event: React.MouseEvent) => {
    if (hoveredStation && onStationClick) {
      onStationClick(hoveredStation)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-slate-50 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={() => setHoveredStation(null)}
      />

      {/* Station tooltip */}
      {hoveredStation && (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full transform rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"
          style={{
            left: mousePosition.x - (containerRef.current?.getBoundingClientRect().left || 0),
            top: mousePosition.y - (containerRef.current?.getBoundingClientRect().top || 0) - 10,
          }}
        >
          <div className="font-semibold">{hoveredStation.name}</div>
          <div className="text-xs text-slate-300">{hoveredStation.code}</div>
          {hoveredStation.group && (
            <div className="text-xs text-slate-400">{hoveredStation.group}</div>
          )}
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 transform">
            <div className="border-4 border-transparent border-t-slate-900"></div>
          </div>
        </div>
      )}

      {/* Map legend */}
      <div className="absolute left-4 top-4 space-y-2 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs backdrop-blur-sm">
        <div className="mb-2 font-semibold text-slate-900">Map Legend</div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-600"></div>
          <span>London Stations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-emerald-600"></div>
          <span>Regional Stations</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-600"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">🚄</span>
          <span>Live Trains</span>
        </div>
      </div>

      {/* Network status indicator */}
      <div className="absolute right-4 top-4 rounded-lg border border-slate-200 bg-white/95 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
          <span className="font-medium">Network Operational</span>
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {majorStations.length} stations • {liveTrains.length} trains tracked
        </div>
      </div>

      {/* Selected route overlay */}
      {selectedStations.length === 2 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 transform rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          <div className="flex items-center gap-2">
            <Train className="h-4 w-4" />
            Route: {selectedStations[0].name} → {selectedStations[1].name}
          </div>
        </div>
      )}
    </div>
  )
}
