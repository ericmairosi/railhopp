import React from 'react'
import { Clock, MapPin, AlertTriangle } from 'lucide-react'
import { Button } from './button'
import { cn, formatTime, formatDelay, getStatusColor } from '../lib/utils'

interface Departure {
  service: string
  destination: string
  scheduledTime: Date
  estimatedTime?: Date
  platform?: string
  status: 'on-time' | 'delayed' | 'cancelled' | 'diverted'
  operator: string
  coaches?: number
  delayMinutes?: number
}

interface DeparturesBoardProps {
  departures: Departure[]
  stationName: string
  lastUpdated: Date
  isLoading?: boolean
  className?: string
}

export function DeparturesBoard({ 
  departures, 
  stationName, 
  lastUpdated, 
  isLoading = false,
  className 
}: DeparturesBoardProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow-lg border", className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {stationName}
            </h2>
            <p className="text-blue-100 text-sm">Live Departures</p>
          </div>
          <div className="text-right text-sm">
            <div className="flex items-center gap-1 text-blue-100">
              <Clock className="h-4 w-4" />
              Updated: {formatTime(lastUpdated)}
            </div>
          </div>
        </div>
      </div>

      {/* Departures List */}
      <div className="divide-y divide-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            Loading departures...
          </div>
        ) : departures.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-gray-400" />
            No departures scheduled
          </div>
        ) : (
          departures.map((departure, index) => (
            <DepartureRow key={`${departure.service}-${index}`} departure={departure} />
          ))
        )}
      </div>
    </div>
  )
}

function DepartureRow({ departure }: { departure: Departure }) {
  const isDelayed = departure.status === 'delayed' && departure.delayMinutes && departure.delayMinutes > 0
  const isCancelled = departure.status === 'cancelled'
  
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
        {/* Time */}
        <div className="flex flex-col">
          <span className="font-mono text-lg font-semibold">
            {formatTime(departure.scheduledTime)}
          </span>
          {isDelayed && departure.estimatedTime && (
            <span className="font-mono text-sm text-amber-600">
              {formatTime(departure.estimatedTime)}
            </span>
          )}
        </div>

        {/* Destination */}
        <div className="md:col-span-2">
          <div className="font-medium">{departure.destination}</div>
          <div className="text-sm text-gray-600">{departure.operator}</div>
        </div>

        {/* Platform */}
        <div className="text-center">
          {departure.platform ? (
            <Button variant="platform" size="platform">
              {departure.platform}
            </Button>
          ) : (
            <span className="text-gray-400 text-sm">TBC</span>
          )}
        </div>

        {/* Status */}
        <div className="text-center">
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", 
            departure.status === 'on-time' && "bg-green-100 text-green-800",
            departure.status === 'delayed' && "bg-amber-100 text-amber-800",
            departure.status === 'cancelled' && "bg-red-100 text-red-800",
            departure.status === 'diverted' && "bg-blue-100 text-blue-800"
          )}>
            {departure.status === 'on-time' && 'On time'}
            {departure.status === 'delayed' && departure.delayMinutes && `${departure.delayMinutes}m late`}
            {departure.status === 'cancelled' && 'Cancelled'}
            {departure.status === 'diverted' && 'Diverted'}
          </span>
        </div>

        {/* Additional Info */}
        <div className="text-right text-sm text-gray-600">
          {departure.coaches && `${departure.coaches} coaches`}
        </div>
      </div>
    </div>
  )
}
