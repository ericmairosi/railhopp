'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, MapPin, X } from 'lucide-react'

interface Station {
  code: string
  name: string
  group?: string
}

interface StationSearchProps {
  placeholder?: string
  value?: string
  onSelect: (station: Station) => void
  onClear?: () => void
  disabled?: boolean
}

export default function StationSearch({
  placeholder = 'Enter station name or code',
  value = '',
  onSelect,
  onClear,
  disabled = false,
}: StationSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value)
  const [suggestions, setSuggestions] = useState<Station[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setSearchTerm(value)
  }, [value])

  // Debounced remote suggestions
  useEffect(() => {
    const handle = setTimeout(async () => {
      const q = searchTerm.trim()
      if (q.length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/stations/suggest?q=${encodeURIComponent(q)}&limit=10`)
        const json = await res.json()
        if (json.success && Array.isArray(json.data)) {
          setSuggestions(json.data)
          setShowSuggestions(json.data.length > 0)
        } else {
          setSuggestions([])
          setShowSuggestions(false)
        }
      } catch (e) {
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        setLoading(false)
        setSelectedIndex(-1)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [searchTerm])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow keyboard nav when suggestions open
    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
          return
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0) {
            handleSelectStation(suggestions[selectedIndex])
            return
          }
          break
        case 'Escape':
          setShowSuggestions(false)
          setSelectedIndex(-1)
          inputRef.current?.blur()
          return
      }
    }

    // Enter-to-select when input is exactly a CRS code (3 letters)
    if (e.key === 'Enter') {
      const code = searchTerm.trim().toUpperCase()
      if (/^[A-Z]{3}$/.test(code)) {
        const match = suggestions.find((s) => s.code.toUpperCase() === code)
        if (match) {
          handleSelectStation(match)
        } else {
          // Fallback: minimal station object when suggestion list hasn't loaded
          onSelect({ code, name: code })
          setSearchTerm(`${code}`)
          setShowSuggestions(false)
          setSelectedIndex(-1)
        }
      }
    }
  }

  const handleSelectStation = (station: Station) => {
    setSearchTerm(`${station.name} (${station.code})`)
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    onSelect(station)
  }

  const handleClear = () => {
    setSearchTerm('')
    setSuggestions([])
    setShowSuggestions(false)
    setSelectedIndex(-1)
    onClear?.()
    inputRef.current?.focus()
  }

  const handleFocus = () => {
    // Show suggestions if we already have them
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedIndex(-1)
    }, 300)
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Search size={16} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-lg border px-4 py-3 pl-10 text-sm outline-none transition-colors placeholder:text-slate-500 ${
            disabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              : 'border-slate-300 bg-white text-slate-900 focus:border-transparent focus:ring-2 focus:ring-blue-500'
          }`}
        />

        {searchTerm && !disabled && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 z-[60] mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && (
            <div className="p-3 text-center text-xs text-slate-500">Searching…</div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="p-3 text-center text-xs text-slate-500">No matches</div>
          )}
          {!loading &&
            suggestions.map((station, index) => (
              <div
                key={`${station.code}-${station.name}`}
                ref={(el) => {
                  suggestionRefs.current[index] = el
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelectStation(station)
                }}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  selectedIndex === index ? 'bg-slate-100' : 'bg-white'
                } ${index < suggestions.length - 1 ? 'border-b border-slate-100' : ''}`}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <MapPin size={14} className="text-slate-400" />
                <div className="flex-1">
                  <div className={`font-medium ${selectedIndex === index ? 'text-blue-600' : 'text-slate-900'}`}>
                    {station.name}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {station.code}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
