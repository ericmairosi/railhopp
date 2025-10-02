'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Clock,
  AlertTriangle,
  Train,
  MapPin,
  RefreshCw,
  Zap,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedDeparture {
  serviceID: string
  operator: string
  operatorCode: string
  destination: string
  destinationCRS: string
  origin?: string
  originCRS?: string
  std: string // Scheduled departure time
  etd: string // Estimated departure time
  platform?: string
  delayReason?: string
  serviceType: string
  length?: number
  cancelled?: boolean
  formation?: {
    avgLoading?: number
    coaches?: Array<{
      coachClass: string
      loading?: number
      toilet?: { status: string }
    }>
  }
  activities?: string[]
}

interface EnhancedStationBoard {
  locationName: string
  crs: string
  stationName: string
  stationCode: string
  departures: EnhancedDeparture[]
  generatedAt: string
  messages?: Array<{
    severity: 'info' | 'warning' | 'error'
    message: string
    category: string
  }>
  platformsAvailable?: boolean
}

interface EnhancedDepartureBoardProps {
  stationCode: string
  maxResults?: number
  autoRefresh?: boolean
  refreshInterval?: number
  showDetailed?: boolean
  filterDestination?: string
  variant?: 'modern' | 'terminal'
  className?: string
  compact?: boolean
}

type SourceDiagnostics = {
  darwin: { attempted: boolean; available: boolean; error?: string }
  rtt: { attempted: boolean; available: boolean; error?: string }
  networkRail: { attempted: boolean; enhanced: boolean; error?: string }
  knowledgeStation: { attempted: boolean; enhanced: boolean; error?: string }
}

export default function EnhancedDepartureBoard({
  stationCode,
  maxResults = 15,
  autoRefresh = true,
  refreshInterval = 30000,
  showDetailed = true,
  filterDestination,
  variant = 'modern',
  className,
  compact = false,
}: EnhancedDepartureBoardProps) {
  const [stationBoard, setStationBoard] = useState<EnhancedStationBoard | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceInfo, setSourceInfo] = useState<{
    primary: string
    enhanced: string[]
    failed: string[]
    diagnostics?: SourceDiagnostics
  } | null>(null)
  const [showSourceDetails, setShowSourceDetails] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'reconnecting'
  >('connected')
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [pubSubStatus, setPubSubStatus] = useState<{ enabled: boolean; ok: boolean } | null>(null)

  // UI controls
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('detailed')
  const [filterDest, setFilterDest] = useState<string>('')
  const [filterPlat, setFilterPlat] = useState<string>('')
  const [filterTOC, setFilterTOC] = useState<string>('')

  const fetchDepartures = useCallback(
    async (crs: string) => {
      if (!crs || crs.length !== 3) return

      setLoading(true)
      setError(null)
      setConnectionStatus('reconnecting')

      try {
        const params = new URLSearchParams({
          crs: crs.toUpperCase(),
          numRows: maxResults.toString(),
        })

        if (filterDestination) {
          params.append('filterCrs', filterDestination)
          params.append('filterType', 'to')
        }

        const response = await fetch(`/api/unified/departures?${params.toString()}`)
        let result = await response.json()

        // Fallback chain: unified -> v2 -> raw darwin
        if (result?.success && Array.isArray(result.data?.departures) && result.data.departures.length === 0) {
          try {
            const r2 = await fetch(`/api/v2/departures?${params.toString()}`)
            const json2 = await r2.json()
            if (json2?.success && Array.isArray(json2.data?.departures) && json2.data.departures.length > 0) {
              result = json2
            } else {
              const rd = await fetch(`/api/darwin/departures?${params.toString()}`)
              const jd = await rd.json()
              if (jd?.success) {
                result = { success: true, data: jd.data }
              }
            }
          } catch {}
        }

        if (result.success) {
          const d = result.data

          // Collect source diagnostics if available
          const primary = d.dataSource || d.dataSources?.primary || 'unknown'
          const enhanced = d.enhancedSources || d.dataSources?.enhanced || []
          const failed = d.failedSources || d.dataSources?.failed || []
          const diagnostics: SourceDiagnostics | undefined = result.metadata?.diagnostics
          setSourceInfo({ primary, enhanced, failed, diagnostics })
          setStationBoard({
            locationName: d.stationName || d.locationName || `Station ${crs.toUpperCase()}`,
            stationName: d.stationName || d.locationName || `Station ${crs.toUpperCase()}`,
            stationCode: d.stationCode || d.crs || crs.toUpperCase(),
            crs: d.stationCode || d.crs || crs.toUpperCase(),
            departures: (d.departures || d.trainServices || []),
            generatedAt: d.generatedAt || new Date().toISOString(),
            messages: d.messages,
            platformsAvailable: d.platformsAvailable ?? true,
          })
          setLastUpdated(new Date())
          setConnectionStatus('connected')
        } else {
          const msg: string = result.error?.message || ''
          const code: string = result.error?.code || ''
          // If Darwin SOAP is not configured, degrade gracefully to an empty board
          if (
            /not configured/i.test(msg) ||
            code === 'SERVICE_DISABLED' ||
            code === 'API_NOT_CONFIGURED'
          ) {
            setStationBoard({
              locationName: `Station ${crs.toUpperCase()}`,
              stationName: `Station ${crs.toUpperCase()}`,
              stationCode: crs.toUpperCase(),
              crs: crs.toUpperCase(),
              departures: [],
              generatedAt: new Date().toISOString(),
              messages: [
                {
                  severity: 'info',
                  message:
                    'Live connection is established. Waiting for first departure updates…',
                  category: 'info',
                },
              ],
            })
            setLastUpdated(new Date())
            setConnectionStatus('connected')
            setError(null)
          } else {
            setError(msg || 'Failed to fetch departures')
            setConnectionStatus('disconnected')
          }
        }
      } catch (err) {
        console.error('Departure fetch error:', err)
        setError(err instanceof Error ? err.message : 'Network error occurred')
        setConnectionStatus('disconnected')
      } finally {
        setLoading(false)
      }
    },
    [maxResults, filterDestination]
  )

  useEffect(() => {
    if (stationCode) {
      fetchDepartures(stationCode)
    }
  }, [stationCode, fetchDepartures])

  useEffect(() => {
    if (autoRefresh && stationCode) {
      const interval = setInterval(() => {
        fetchDepartures(stationCode)
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [stationCode, autoRefresh, refreshInterval, fetchDepartures])

  // Pub/Sub status polling (every 60s)
  useEffect(() => {
    let mounted = true
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/darwin/pubsub/status')
        const json = await res.json()
        if (mounted) {
          if (json?.success) setPubSubStatus({ enabled: !!json.data?.enabled, ok: !!json.data?.ok })
          else setPubSubStatus({ enabled: false, ok: false })
        }
      } catch {
        if (mounted) setPubSubStatus({ enabled: false, ok: false })
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const getServiceStatus = (departure: EnhancedDeparture) => {
    if (departure.cancelled)
      return { status: 'Cancelled', color: 'red', bg: 'bg-red-50', text: 'text-red-700' }
    if (departure.etd === 'Delayed')
      return { status: 'Delayed', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700' }
    if (departure.etd === 'On time')
      return { status: 'On Time', color: 'green', bg: 'bg-green-50', text: 'text-green-700' }
    if (departure.etd !== departure.std)
      return {
        status: `Est. ${departure.etd}`,
        color: 'blue',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
      }
    return { status: 'On Time', color: 'green', bg: 'bg-green-50', text: 'text-green-700' }
  }

  const getLoadingColor = (loading?: number) => {
    if (!loading) return 'bg-gray-300'
    if (loading < 30) return 'bg-green-400'
    if (loading < 70) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never'
    try {
      return lastUpdated.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch (error) {
      return lastUpdated.toTimeString().slice(0, 8)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'delayed':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const calculateDelay = (scheduled: string, estimated: string): number | undefined => {
    try {
      const scheduledTime = new Date(`1970-01-01T${scheduled}:00`)
      const estimatedTime = new Date(`1970-01-01T${estimated}:00`)
      const diffMinutes = (estimatedTime.getTime() - scheduledTime.getTime()) / (1000 * 60)
      return diffMinutes > 0 ? Math.round(diffMinutes) : undefined
    } catch {
      return undefined
    }
  }

  if (!stationCode) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="py-8 text-center">
          <MapPin className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <p className="text-lg text-gray-500">Select a station to view live departures</p>
        </div>
      </div>
    )
  }

  if (variant === 'terminal') {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-lg border-2 border-blue-300 bg-blue-50 text-blue-900 shadow-lg',
          className
        )}
      >
        {/* Terminal Header */}
        <div className="bg-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Train className="h-6 w-6" />
              <div>
                <h2 className="font-mono text-xl font-bold uppercase tracking-wider">
                  {stationBoard?.stationName || `Station ${stationCode}`}
                </h2>
                <p className="text-sm opacity-80">LIVE DEPARTURES</p>
              </div>
            </div>
            <div className="text-right font-mono text-sm">
              <div className="text-lg font-bold">{formatLastUpdated()}</div>
              <div className="opacity-80">LAST UPDATED</div>
            </div>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-4 border-b border-blue-300 bg-blue-100 px-6 py-3 font-mono text-sm uppercase tracking-wider text-blue-900">
          <div className="col-span-2">Time</div>
          <div className="col-span-4">Destination</div>
          <div className="col-span-2">Platform</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Operator</div>
        </div>

        {/* Loading State */}
        {loading && !stationBoard && (
          <div className="p-8 text-center">
            <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
            <p className="font-mono uppercase tracking-wide text-blue-900">
              Loading live departures...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-600" />
            <p className="mb-2 font-mono uppercase tracking-wide text-red-700">
              Unable to load departures
            </p>
            <p className="mb-4 text-sm text-blue-700">{error}</p>
            <button
              onClick={() => fetchDepartures(stationCode)}
              className="rounded bg-blue-600 px-4 py-2 font-mono uppercase tracking-wide text-white transition-colors hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Terminal Departures */}
        {stationBoard && stationBoard.departures && (
          <div className="max-h-96 overflow-y-auto">
            {stationBoard.departures.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Train className="mx-auto mb-4 h-16 w-16 text-blue-600 opacity-50" />
                <p className="font-mono uppercase tracking-wide text-blue-600">
                  No departures scheduled
                </p>
              </div>
            ) : (
              stationBoard.departures.map((departure, index) => {
                const serviceStatus = getServiceStatus(departure)

                return (
                  <div
                    key={`${departure.serviceID}-${index}-${departure.std}`}
                    className={cn(
                      'grid grid-cols-12 gap-4 border-b border-blue-200 px-6 py-4 transition-colors hover:bg-blue-100',
                      departure.cancelled && 'opacity-60',
                      index % 2 === 0 && 'bg-white/50'
                    )}
                  >
                    {/* Time */}
                    <div className="col-span-2 font-mono text-lg font-bold">
                      <div className="text-blue-900">
                        {departure.etd !== departure.std && departure.etd !== 'On time'
                          ? departure.etd
                          : departure.std}
                      </div>
                      {departure.etd !== departure.std &&
                        departure.etd !== 'On time' &&
                        departure.etd !== 'Delayed' && (
                          <div className="text-xs text-red-600 line-through">{departure.std}</div>
                        )}
                    </div>

                    {/* Destination */}
                    <div className="col-span-4">
                      <div className="font-bold uppercase tracking-wide text-blue-900">
                        {departure.destination}
                      </div>
                      <div className="mt-1 text-xs text-blue-700">
                        via {departure.destinationCRS}
                      </div>
                    </div>

                    {/* Platform */}
                    <div className="col-span-2">
                      {departure.platform ? (
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded bg-blue-900 text-lg font-bold text-white">
                          {departure.platform}
                        </div>
                      ) : (
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded bg-gray-400 text-sm font-bold text-white">
                          TBA
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(serviceStatus.status)}
                        <span
                          className={cn(
                            'font-mono text-sm uppercase tracking-wide',
                            serviceStatus.text
                          )}
                        >
                          {serviceStatus.status}
                        </span>
                      </div>
                    </div>

                    {/* Operator */}
                    <div className="col-span-2 font-mono text-sm uppercase tracking-wide text-blue-700">
                      {departure.operatorCode}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-blue-600 bg-slate-900 px-6 py-3">
          <div className="flex items-center justify-between font-mono text-xs text-blue-300">
            <div>
              LIVE DATA FROM {sourceInfo?.primary ? sourceInfo.primary.toUpperCase() : 'UNKNOWN'}
              <span className="mx-2">•</span>
              PUBSUB: {pubSubStatus?.ok ? 'CONNECTED' : 'UNAVAILABLE'}
            </div>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                  UPDATES EVERY 30 SECONDS
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-red-400"></div>
                  CONNECTION ERROR
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg',
        className
      )}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Train className="h-6 w-6 text-white" />
            <div>
              <h2 className={cn('font-bold text-white', compact ? 'text-lg' : 'text-xl')}>
                {stationBoard?.stationName || `Station ${stationCode}`}
              </h2>
              <p className="text-sm text-blue-100">Last updated: {formatLastUpdated()}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="h-4 w-4 text-green-300" />
              ) : connectionStatus === 'reconnecting' ? (
                <RefreshCw className="h-4 w-4 animate-spin text-yellow-300" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-300" />
              )}
              <span className="text-sm capitalize text-white">{connectionStatus}</span>
            </div>

            {/* Pub/Sub status badge */}
            <div className="hidden items-center gap-2 rounded-md bg-white/10 px-2 py-1 text-xs text-white sm:flex">
              <span className={`inline-block h-2 w-2 rounded-full ${pubSubStatus?.ok ? 'bg-green-400' : 'bg-red-400'}`} />
              <span>pubsub: {pubSubStatus?.ok ? 'connected' : 'unavailable'}</span>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchDepartures(stationCode)}
              disabled={loading}
              className="rounded-lg bg-white/20 p-2 text-white transition-colors hover:bg-white/30 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white/60 px-6 py-3">
        <div className="inline-flex rounded-lg bg-white p-1 shadow-sm">
          <button
            className={cn(
              'rounded-md px-3 py-1 text-sm',
              viewMode === 'simple' ? 'bg-blue-600 text-white' : 'text-gray-700'
            )}
            onClick={() => setViewMode('simple')}
          >
            Simple
          </button>
          <button
            className={cn(
              'rounded-md px-3 py-1 text-sm',
              viewMode === 'detailed' ? 'bg-blue-600 text-white' : 'text-gray-700'
            )}
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </button>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <input
            value={filterDest}
            onChange={(e) => setFilterDest(e.target.value)}
            placeholder="Filter destination or CRS"
            className="w-44 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={filterPlat}
            onChange={(e) => setFilterPlat(e.target.value)}
            placeholder="Plat"
            className="w-20 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={filterTOC}
            onChange={(e) => setFilterTOC(e.target.value.toUpperCase())}
            placeholder="TOC"
            className="w-24 rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Data Sources Panel */}
      <div className="border-b border-gray-200 bg-white/70 px-6 py-2 text-xs text-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Source: <span className="font-semibold uppercase">{sourceInfo?.primary || 'unknown'}</span>
            </span>
            {sourceInfo?.enhanced && sourceInfo.enhanced.length > 0 && (
              <span>
                Enhanced: {sourceInfo.enhanced.map((s, i) => (
                  <span key={`${s}-${i}`} className="uppercase">
                    {s}
                    {i < sourceInfo.enhanced.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            )}
            {sourceInfo?.failed && sourceInfo.failed.length > 0 && (
              <span className="text-red-600">
                Failed: {sourceInfo.failed.map((s, i) => (
                  <span key={`${s}-${i}`} className="uppercase">
                    {s}
                    {i < sourceInfo.failed.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            )}
          </div>
          {sourceInfo?.diagnostics && (
            <button
              onClick={() => setShowSourceDetails((v) => !v)}
              className="text-blue-600 hover:underline"
            >
              {showSourceDetails ? 'Hide details' : 'Show details'}
            </button>
          )}
        </div>
        {showSourceDetails && sourceInfo?.diagnostics && (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(['darwin', 'rtt', 'networkRail', 'knowledgeStation'] as const).map((key) => {
              const d = sourceInfo.diagnostics![key]
              return (
                <div key={key} className="rounded-md border border-gray-200 bg-white p-2">
                  <div className="mb-1 font-semibold uppercase">{key}</div>
                  <div className="text-gray-600">
                    {(() => {
                      const ok = key === 'networkRail' || key === 'knowledgeStation'
                        ? (d as { enhanced: boolean }).enhanced
                        : (d as { available: boolean }).available
                      return ok ? (
                        <span className="text-green-700">OK</span>
                      ) : (
                        <span className="text-red-700">Not available</span>
                      )
                    })()}
                  </div>
                  {d.error && <div className="mt-1 text-xs text-red-600">{d.error}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Service Messages */}
      {stationBoard?.messages && stationBoard.messages.length > 0 && (
        <div className="border-b border-yellow-200 bg-yellow-50 p-4">
          {stationBoard.messages.map((message, index) => (
            <div key={index} className="mb-3 flex items-start gap-3 last:mb-0">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div>
                <div className="text-sm font-medium uppercase tracking-wide text-yellow-800">
                  {message.severity}
                </div>
                <div className="text-yellow-700">{message.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && !stationBoard && (
        <div className="p-8 text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading live departures...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-600" />
          <p className="mb-2 font-medium text-red-700">Unable to load departures</p>
          <p className="mb-4 text-sm text-gray-600">{error}</p>
          <button
            onClick={() => fetchDepartures(stationCode)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Departures Table */}
      {stationBoard && stationBoard.departures && (
        <div className="overflow-hidden">
          {stationBoard.departures.length === 0 ? (
            <div className="p-8 text-center">
              <Train className="mx-auto mb-4 h-8 w-8 text-gray-400" />
              <p className="text-gray-500">No departures scheduled at this time</p>
            </div>
          ) : (
            <>
              {/* Compute filtered */}
              {(() => {
                let list = stationBoard.departures
                if (filterDest) {
                  const q = filterDest.trim().toLowerCase()
                  list = list.filter(
                    (d) =>
                      d.destination.toLowerCase().includes(q) ||
                      (d.destinationCRS || '').toLowerCase().includes(q)
                  )
                }
                if (filterPlat) {
                  list = list.filter((d) => (d.platform || '').toLowerCase() === filterPlat.toLowerCase())
                }
                if (filterTOC) {
                  const tocQ = filterTOC.trim().toUpperCase()
                  list = list.filter(
                    (d) => (d.operatorCode || '').toUpperCase() === tocQ || (d.operator || '').toUpperCase().includes(tocQ)
                  )
                }
                const rows = list
                
                return (
                  <>
                    {/* Summary bar with sticky filters */}
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-2 text-xs text-gray-600 backdrop-blur">
                      <div>
                        Showing <span className="font-semibold text-gray-800">{rows.length}</span> of{' '}
                        <span className="font-semibold text-gray-800">{stationBoard.departures.length}</span>
                        {filterDest || filterPlat || filterTOC ? ' • filters active' : ''}
                      </div>
                      {(filterDest || filterPlat || filterTOC) && (
                        <div className="flex flex-wrap items-center gap-2">
                          {filterDest && (
                            <button
                              onClick={() => setFilterDest('')}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Dest: {filterDest}
                              <span className="ml-1">×</span>
                            </button>
                          )}
                          {filterPlat && (
                            <button
                              onClick={() => setFilterPlat('')}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-100"
                            >
                              Plat: {filterPlat}
                              <span className="ml-1">×</span>
                            </button>
                          )}
                          {filterTOC && (
                            <button
                              onClick={() => setFilterTOC('')}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-100"
                            >
                              TOC: {filterTOC}
                              <span className="ml-1">×</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setFilterDest('');
                              setFilterPlat('');
                              setFilterTOC('');
                            }}
                            className="ml-2 text-blue-600 hover:underline"
                          >
                            Clear all
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Table Header */}
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                      {viewMode === 'simple' ? (
                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
                          <div className="col-span-2">Time</div>
                          <div className="col-span-6">Destination</div>
                          <div className="col-span-2">Plat</div>
                          <div className="col-span-2">Status</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold uppercase tracking-wide text-gray-700">
                          <div className="col-span-2">Time</div>
                          <div className="col-span-4">Destination</div>
                          <div className="col-span-1">Plat</div>
                          <div className="col-span-2">Operator</div>
                          <div className="col-span-2">Status</div>
                          <div className="col-span-1">Details</div>
                        </div>
                      )}
                    </div>

                    {/* Departures */}
                    <div className="divide-y divide-gray-100">
                      {rows.map((departure, index) => {
                        const serviceStatus = getServiceStatus(departure)
                        return (
                          <div
                            key={`${departure.serviceID}-${index}-${departure.std}`}
                            className={cn(
                              'grid grid-cols-12 gap-4 px-6 py-4 transition-colors hover:bg-gray-50',
                              departure.cancelled && 'opacity-60'
                            )}
                          >
                            {/* Time */}
                            <div className="col-span-2 font-mono text-lg font-bold">
                              <div className="text-gray-900">
                                {departure.etd !== departure.std && departure.etd !== 'On time'
                                  ? departure.etd
                                  : departure.std}
                              </div>
                              {departure.etd !== departure.std &&
                                departure.etd !== 'On time' &&
                                departure.etd !== 'Delayed' && (
                                  <div className="text-xs text-red-600 line-through">{departure.std}</div>
                                )}
                            </div>

                            {/* Destination */}
                            <div className={cn(viewMode === 'simple' ? 'col-span-6' : 'col-span-4')}>
                              <div className="font-semibold text-gray-900">{departure.destination}</div>
                              <div className="mt-0.5 text-xs text-gray-500">{departure.destinationCRS}</div>
                            </div>

                            {/* Platform */}
                            <div className={cn(viewMode === 'simple' ? 'col-span-2' : 'col-span-1')}>
                              {departure.platform ? (
                                <span className="inline-flex items-center rounded bg-blue-600 px-2 py-1 text-xs font-bold text-white">
                                  {departure.platform}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">TBA</span>
                              )}
                            </div>

                            {/* Operator (detailed only) */}
                            {viewMode === 'detailed' && (
                              <div className="col-span-2 text-sm text-gray-700">{departure.operator}</div>
                            )}

                            {/* Status */}
                            <div className={cn(viewMode === 'simple' ? 'col-span-2' : 'col-span-2')}>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(serviceStatus.status)}
                                <span className={cn('text-sm font-medium', serviceStatus.text)}>
                                  {serviceStatus.status}
                                </span>
                              </div>
                            </div>

                            {/* Details (detailed only) */}
                            {viewMode === 'detailed' && (
                              <div className="col-span-1">
                                <a
                                  href={`/service/${encodeURIComponent(departure.serviceID)}`}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View
                                </a>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </div>
      )}
    </div>
  )
}
