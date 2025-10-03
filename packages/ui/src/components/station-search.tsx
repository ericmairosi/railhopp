import React, { useState, useEffect, useRef } from 'react'
import { Search, MapPin, Navigation } from 'lucide-react'
import { cn } from '../lib/utils'

interface Station {
  code: string
  name: string
  latitude: number
  longitude: number
}

interface StationSearchProps {
  onStationSelect: (station: Station) => void
  placeholder?: string
  className?: string
  showNearby?: boolean
  stations: Station[]
}

export function StationSearch({
  onStationSelect,
  placeholder = 'Search stations...',
  className,
  showNearby = true,
  stations,
}: StationSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [filteredStations, setFilteredStations] = useState<Station[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setFilteredStations([])
      return
    }

    const filtered = stations
      .filter(
        (station) =>
          station.name.toLowerCase().includes(query.toLowerCase()) ||
          station.code.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 10)

    setFilteredStations(filtered)
    setSelectedIndex(-1)
  }, [query, stations])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredStations.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < filteredStations.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredStations.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleStationSelect(filteredStations[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleStationSelect = (station: Station) => {
    setQuery(station.name)
    setIsOpen(false)
    onStationSelect(station)
  }

  const getNearbyStations = () => {
    // In a real app, this would use geolocation API
    // For now, return popular London stations
    return stations.slice(0, 5)
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-lg focus:border-transparent focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {query.length < 2 && showNearby && (
            <div className="border-b border-gray-100 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-600">
                <Navigation className="h-4 w-4" />
                Nearby Stations
              </div>
              <ul>
                {getNearbyStations().map((station) => (
                  <li key={station.code}>
                    <button
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-gray-50"
                      onClick={() => handleStationSelect(station)}
                    >
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{station.name}</div>
                        <div className="text-xs text-gray-500">{station.code}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {filteredStations.length > 0 && (
            <ul ref={listRef} className="py-1">
              {filteredStations.map((station, index) => (
                <li key={station.code}>
                  <button
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50',
                      selectedIndex === index && 'bg-blue-50'
                    )}
                    onClick={() => handleStationSelect(station)}
                  >
                    <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium">{station.name}</div>
                      <div className="text-sm text-gray-500">{station.code}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.length >= 2 && filteredStations.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              No stations found for &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
