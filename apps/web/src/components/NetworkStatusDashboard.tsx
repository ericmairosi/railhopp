'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  ExternalLink,
  Filter,
  RefreshCw,
  Zap,
  CloudRain,
  Wrench,
  Users,
  Signal,
} from 'lucide-react'

interface Disruption {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'severe'
  category: 'planned' | 'unplanned' | 'weather' | 'industrial' | 'technical'
  affectedRoutes: string[]
  affectedOperators: string[]
  startTime: string
  endTime?: string
  lastUpdated: string
  source: 'darwin' | 'networkrail' | 'knowledge-station'
  externalUrl?: string
}

interface NetworkStatus {
  overall: 'good' | 'minor' | 'major' | 'severe'
  disruptions: Disruption[]
  lastUpdated: string
  summary: {
    total: number
    planned: number
    unplanned: number
    severe: number
  }
}

interface NetworkStatusDashboardProps {
  autoRefresh?: boolean
  refreshInterval?: number
  showFilters?: boolean
  compact?: boolean
}

export default function NetworkStatusDashboard({
  autoRefresh = true,
  refreshInterval = 120000, // 2 minutes
  showFilters = true,
  compact = false,
}: NetworkStatusDashboardProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Filters
  const [selectedSeverity, setSelectedSeverity] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedOperator, setSelectedOperator] = useState<string>('')
  const [showResolved, setShowResolved] = useState(false)

  const fetchNetworkStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (selectedSeverity) params.append('severity', selectedSeverity)
      if (selectedOperator) params.append('operator', selectedOperator)
      if (showResolved) params.append('includeResolved', 'true')

      const response = await fetch(`/api/disruptions?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setNetworkStatus(result.data)
        setLastUpdated(new Date())
      } else {
        setError(result.error?.message || 'Failed to fetch network status')
      }
    } catch (err) {
      console.error('Network status fetch error:', err)
      setError(err instanceof Error ? err.message : 'Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNetworkStatus()
  }, [selectedSeverity, selectedCategory, selectedOperator, showResolved])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchNetworkStatus, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: 'text-green-600' }
      case 'minor':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'text-yellow-600' }
      case 'major':
        return { bg: 'bg-orange-100', text: 'text-orange-800', icon: 'text-orange-600' }
      case 'severe':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: 'text-red-600' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'text-gray-600' }
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'severe':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'planned':
        return <Wrench className="h-4 w-4" />
      case 'weather':
        return <CloudRain className="h-4 w-4" />
      case 'industrial':
        return <Users className="h-4 w-4" />
      case 'technical':
        return <Signal className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const filteredDisruptions =
    networkStatus?.disruptions.filter((disruption) => {
      if (selectedCategory && disruption.category !== selectedCategory) return false
      return true
    }) || []

  const formatTime = (timeString: string) => {
    try {
      return new Date(timeString).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (error) {
      return new Date(timeString).toDateString()
    }
  }

  const getUniqueOperators = () => {
    const operators = new Set<string>()
    networkStatus?.disruptions.forEach((d) => {
      d.affectedOperators.forEach((op) => operators.add(op))
    })
    return Array.from(operators).sort()
  }

  if (loading && !networkStatus) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading network status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-red-600" />
          <p className="mb-2 font-medium text-red-700">Unable to load network status</p>
          <p className="mb-4 text-sm text-gray-600">{error}</p>
          <button
            onClick={fetchNetworkStatus}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const statusColors = networkStatus
    ? getStatusColor(networkStatus.overall)
    : getStatusColor('good')

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className={`p-6 ${statusColors.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-full bg-white p-3 shadow-sm ${statusColors.icon}`}>
                {networkStatus?.overall === 'good' ? (
                  <CheckCircle className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${statusColors.text}`}>
                  Network Status:{' '}
                  {networkStatus?.overall
                    ? networkStatus.overall.charAt(0).toUpperCase() + networkStatus.overall.slice(1)
                    : 'Unknown'}
                </h2>
                <p className={`${statusColors.text} opacity-80`}>
                  {networkStatus?.summary.total || 0} active disruptions • Last updated:{' '}
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>

            <button
              onClick={fetchNetworkStatus}
              disabled={loading}
              className="rounded-lg bg-white/20 p-2 text-gray-700 transition-colors hover:bg-white/30 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {networkStatus && !compact && (
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{networkStatus.summary.total}</div>
              <div className="text-sm text-gray-600">Total Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {networkStatus.summary.planned}
              </div>
              <div className="text-sm text-gray-600">Planned Work</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {networkStatus.summary.unplanned}
              </div>
              <div className="text-sm text-gray-600">Incidents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{networkStatus.summary.severe}</div>
              <div className="text-sm text-gray-600">Severe</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && !compact && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filter Disruptions</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="severe">Severe</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="planned">Planned Work</option>
                <option value="unplanned">Incidents</option>
                <option value="weather">Weather</option>
                <option value="industrial">Industrial</option>
                <option value="technical">Technical</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Operator</label>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Operators</option>
                {getUniqueOperators().map((operator) => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showResolved}
                  onChange={(e) => setShowResolved(e.target.checked)}
                  className="rounded"
                />
                Show resolved
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Disruptions List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="border-b border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Current Disruptions ({filteredDisruptions.length})
          </h3>
        </div>

        {filteredDisruptions.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
            <h4 className="mb-2 text-lg font-semibold text-gray-900">No disruptions found</h4>
            <p className="text-gray-600">
              {networkStatus?.summary.total === 0
                ? 'All services are running normally'
                : 'No disruptions match your current filters'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDisruptions.map((disruption) => (
              <div key={disruption.id} className="p-6 transition-colors hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="mb-3 flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${getSeverityColor(disruption.severity)}`}>
                        {getCategoryIcon(disruption.category)}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{disruption.title}</h4>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${getSeverityColor(disruption.severity)}`}
                          >
                            {disruption.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="mb-2 text-sm text-gray-600">{disruption.description}</p>

                        {/* Timing */}
                        <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Started: {formatTime(disruption.startTime)}
                          </div>
                          {disruption.endTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expected end: {formatTime(disruption.endTime)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Affected Services */}
                    <div className="mb-3 grid gap-4 md:grid-cols-2">
                      {disruption.affectedRoutes.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-700">
                            <MapPin className="h-3 w-3" />
                            Affected Routes
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {disruption.affectedRoutes.slice(0, 3).map((route, idx) => (
                              <span
                                key={`route-${disruption.id}-${idx}`}
                                className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                              >
                                {route}
                              </span>
                            ))}
                            {disruption.affectedRoutes.length > 3 && (
                              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                +{disruption.affectedRoutes.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {disruption.affectedOperators.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-700">
                            <Zap className="h-3 w-3" />
                            Operators
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {disruption.affectedOperators.slice(0, 3).map((operator, idx) => (
                              <span
                                key={`operator-${disruption.id}-${idx}`}
                                className="rounded bg-purple-100 px-2 py-1 text-xs text-purple-800"
                              >
                                {operator}
                              </span>
                            ))}
                            {disruption.affectedOperators.length > 3 && (
                              <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                +{disruption.affectedOperators.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Source and External Link */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Source: {disruption.source} • Updated: {formatTime(disruption.lastUpdated)}
                      </div>
                      {disruption.externalUrl && (
                        <a
                          href={disruption.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          More details
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
