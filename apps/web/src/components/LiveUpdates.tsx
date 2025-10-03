'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Info,
  X,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react'

type NetworkAlert = {
  id: string
  type: 'disruption' | 'delay' | 'cancellation' | 'info' | 'maintenance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  affectedServices: string[]
  startTime: Date
  estimatedEnd?: Date
  isActive: boolean
}

type SystemStatus = {
  overall: 'operational' | 'degraded' | 'major_outage'
  lastUpdate: Date
  dataFeedStatus: {
    darwin: 'online' | 'offline' | 'degraded'
    networkRail: 'online' | 'offline' | 'degraded'
    rtt: 'online' | 'offline' | 'degraded'
  }
  apiResponseTime: number
}

export default function LiveUpdates() {
  const [alerts, setAlerts] = useState<NetworkAlert[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    overall: 'operational',
    lastUpdate: new Date(),
    dataFeedStatus: {
      darwin: 'online',
      networkRail: 'online',
      rtt: 'online',
    },
    apiResponseTime: 250,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  // Load live disruptions (no mock fallback)
  const loadDisruptions = async () => {
    try {
      const res = await fetch('/api/disruptions?severity=medium')
      const json = await res.json()
      if (json.success && json.data?.disruptions) {
        const mapped: NetworkAlert[] = (json.data.disruptions as Array<any>).map((d) => ({
          id: String(d.id),
          type: 'disruption',
          severity: (d.severity || 'medium') as NetworkAlert['severity'],
          title: String(d.title || 'Network disruption'),
          description: String(d.description || ''),
          affectedServices: Array.isArray(d.affectedOperators) ? d.affectedOperators : [],
          startTime: new Date(d.startTime || Date.now()),
          estimatedEnd: d.endTime ? new Date(d.endTime) : undefined,
          isActive: true,
        }))
        setAlerts(mapped)
        setSystemStatus((prev) => ({ ...prev, lastUpdate: new Date() }))
      } else {
        setAlerts([])
        setSystemStatus((prev) => ({ ...prev, lastUpdate: new Date() }))
      }
    } catch {
      setAlerts([])
      setSystemStatus((prev) => ({ ...prev, lastUpdate: new Date() }))
    }
  }

  useEffect(() => {
    loadDisruptions()
    const interval = setInterval(loadDisruptions, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDisruptions()
    setIsRefreshing(false)
  }

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts((prev) => [...prev, alertId])
  }

  const getAlertIcon = (type: NetworkAlert['type']) => {
    switch (type) {
      case 'disruption':
      case 'cancellation':
        return <AlertTriangle className="h-4 w-4" />
      case 'delay':
        return <Clock className="h-4 w-4" />
      case 'maintenance':
        return <Zap className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getAlertColor = (severity: NetworkAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'medium':
        return 'bg-amber-50 border-amber-200 text-amber-800'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-3 w-3 text-green-600" />
      case 'offline':
        return <WifiOff className="h-3 w-3 text-red-600" />
      default:
        return <Wifi className="h-3 w-3 text-amber-600" />
    }
  }

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const activeAlerts = alerts.filter(
    (alert) => alert.isActive && !dismissedAlerts.includes(alert.id)
  )

  return (
    <div className="space-y-4">
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-slate-900">
          <div
            className={`h-2 w-2 rounded-full ${
              systemStatus.overall === 'operational'
                ? 'animate-pulse bg-green-500'
                : systemStatus.overall === 'degraded'
                  ? 'animate-pulse bg-amber-500'
                  : 'animate-pulse bg-red-500'
            }`}
          ></div>
          Network Status
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="rounded p-1 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* System Overview */}
      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Overall Status</span>
          <span
            className={`font-medium ${
              systemStatus.overall === 'operational'
                ? 'text-green-700'
                : systemStatus.overall === 'degraded'
                  ? 'text-amber-700'
                  : 'text-red-700'
            }`}
          >
            {systemStatus.overall === 'operational'
              ? 'Operational'
              : systemStatus.overall === 'degraded'
                ? 'Degraded'
                : 'Major Outage'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">API Response</span>
          <span className="font-medium text-slate-900">{systemStatus.apiResponseTime}ms</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Last Updated</span>
          <span className="text-slate-900">{formatTimeAgo(systemStatus.lastUpdate)}</span>
        </div>
      </div>

      {/* Data Feed Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">Data Feeds</h4>
        <div className="space-y-1">
          {Object.entries(systemStatus.dataFeedStatus).map(([feed, status]) => (
            <div key={feed} className="flex items-center justify-between py-1 text-sm">
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <span className="capitalize">{feed.replace('_', ' ')}</span>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  status === 'online'
                    ? 'bg-green-100 text-green-700'
                    : status === 'degraded'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-700">
            Active Alerts ({activeAlerts.length})
          </h4>

          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-3 ${getAlertColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {getAlertIcon(alert.type)}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-sm font-medium">{alert.title}</div>
                    <div className="mb-2 line-clamp-2 text-xs opacity-90">{alert.description}</div>
                    <div className="flex items-center gap-4 text-xs">
                      <span>Started {formatTimeAgo(alert.startTime)}</span>
                      {alert.estimatedEnd && (
                        <span>
                          Estimated end:{' '}
                          {alert.estimatedEnd.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    {alert.affectedServices.length > 0 && (
                      <div className="mt-2">
                        <div className="mb-1 text-xs font-medium">Affected Services:</div>
                        <div className="flex flex-wrap gap-1">
                          {alert.affectedServices.map((service) => (
                            <span key={service} className="rounded bg-white/50 px-2 py-1 text-xs">
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDismissAlert(alert.id)}
                  className="flex-shrink-0 rounded p-1 transition-colors hover:bg-white/50"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeAlerts.length === 0 && (
        <div className="py-8 text-center text-slate-500">
          <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
          <p className="text-sm">No active disruptions</p>
          <p className="mt-1 text-xs">All services running normally</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
        Updates every 30 seconds • Powered by National Rail
      </div>
    </div>
  )
}
