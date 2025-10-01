'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Train,
  Clock,
  MapPin,
  Users,
  Construction,
  TrendingUp,
  Route,
  AlertTriangle,
  CheckCircle,
  Zap,
  Navigation,
  BarChart3,
  Calendar,
  Timer,
  Activity,
} from 'lucide-react'

interface ServiceDetailModalProps {
  serviceId: string
  isOpen: boolean
  onClose: () => void
}

interface ServiceDetails {
  serviceId: string
  trainId: string
  operator: string
  operatorName: string
  origin: string
  destination: string
  scheduledDeparture: string
  estimatedDeparture: string
  platform?: string
  formation?: {
    length: number
    coaches: Array<{
      type: 'First' | 'Standard'
      loading: number
      facilities: string[]
    }>
  }
  callingPoints: Array<{
    station: string
    crs: string
    scheduledTime: string
    estimatedTime?: string
    platform?: string
    status: 'On Time' | 'Delayed' | 'Cancelled'
    delayMinutes: number
  }>
  networkRailData?: {
    tsrImpacts: Array<{
      location: string
      reason: string
      delayMinutes: number
      severity: 'LOW' | 'MEDIUM' | 'HIGH'
    }>
    performance: {
      reliability: number
      punctuality: number
      avgDelay: number
      historicalData: Array<{
        date: string
        onTime: boolean
        delayMinutes: number
      }>
    }
    routeInfo: {
      distance: number
      electrified: boolean
      maxSpeed: number
      signallingSystem: string
    }
  }
}

export default function ServiceDetailModal({
  serviceId,
  isOpen,
  onClose,
}: ServiceDetailModalProps) {
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'journey' | 'performance' | 'network'>('journey')

  useEffect(() => {
    if (isOpen && serviceId) {
      fetchServiceDetails()
    }
  }, [isOpen, serviceId])

  const fetchServiceDetails = async () => {
    setLoading(true)
    try {
      // Fetch comprehensive service data from multiple Network Rail endpoints
      const [darwinResponse, scheduleResponse, performanceResponse, tsrResponse, tpsResponse] =
        await Promise.all([
          fetch(`/api/darwin/service/${serviceId}`),
          fetch(`/api/network-rail/schedule?trainUid=${serviceId}`),
          fetch(`/api/network-rail/rtppm?service=${serviceId}`),
          fetch(`/api/network-rail/tsr?service=${serviceId}`),
          fetch(`/api/network-rail/tps?service=${serviceId}`),
        ])

      const [darwinData, scheduleData, performanceData, tsrData, tpsData] = await Promise.all([
        darwinResponse.json().catch(() => null),
        scheduleResponse.json().catch(() => null),
        performanceResponse.json().catch(() => null),
        tsrResponse.json().catch(() => null),
        tpsResponse.json().catch(() => null),
      ])

      // Combine all data sources
      const combinedDetails = combineServiceData(
        darwinData,
        scheduleData,
        performanceData,
        tsrData,
        tpsData
      )
      setServiceDetails(combinedDetails)
    } catch (error) {
      console.error('Failed to fetch service details:', error)
      // Do not create mock data - let the error be shown to the user
      setServiceDetails(null)
    } finally {
      setLoading(false)
    }
  }

  const combineServiceData = (
    darwin: any,
    schedule: any,
    performance: any,
    tsr: any,
    tps: any
  ): ServiceDetails => {
    // In a real implementation, this would intelligently merge data from all sources
    throw new Error('Service data combination not implemented - no mock data fallback')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'On Time':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'Delayed':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'Cancelled':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getLoadingColor = (loading: number) => {
    if (loading < 40) return 'bg-green-400'
    if (loading < 70) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-3 text-2xl font-bold">
                <Train className="h-8 w-8" />
                {serviceDetails ? `${serviceDetails.trainId} Service` : 'Loading...'}
              </h2>
              {serviceDetails && (
                <p className="mt-1 text-blue-100">
                  {serviceDetails.origin} → {serviceDetails.destination}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Loading comprehensive service data...</p>
          </div>
        ) : serviceDetails ? (
          <div className="max-h-[calc(90vh-80px)] overflow-y-auto">
            {/* Quick Info Bar */}
            <div className="border-b bg-gray-50 px-6 py-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Departure</p>
                  <p className="text-lg font-bold">{serviceDetails.scheduledDeparture}</p>
                  {serviceDetails.estimatedDeparture !== serviceDetails.scheduledDeparture && (
                    <p className="text-sm text-amber-600">
                      Est: {serviceDetails.estimatedDeparture}
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Platform</p>
                  <p className="text-lg font-bold">{serviceDetails.platform || 'TBA'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Operator</p>
                  <p className="text-lg font-bold">{serviceDetails.operator}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Length</p>
                  <p className="text-lg font-bold">
                    {serviceDetails.formation?.length || 'N/A'} coaches
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex px-6">
                {[
                  { key: 'journey', label: 'Journey', icon: Route },
                  { key: 'performance', label: 'Performance', icon: BarChart3 },
                  { key: 'network', label: 'Network Rail', icon: Activity },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
                      activeTab === key
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'journey' && (
                <div className="space-y-6">
                  {/* Calling Points */}
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">Calling Points</h3>
                    <div className="space-y-3">
                      {serviceDetails.callingPoints.map((point, index) => (
                        <div
                          key={point.crs}
                          className="flex items-center gap-4 rounded-lg bg-gray-50 p-3"
                        >
                          <div className="w-12 text-center">
                            <div className="mx-auto h-3 w-3 rounded-full bg-blue-600"></div>
                            {index < serviceDetails.callingPoints.length - 1 && (
                              <div className="mx-auto mt-2 h-8 w-0.5 bg-blue-200"></div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{point.station}</p>
                                <p className="text-sm text-gray-500">{point.crs}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{point.scheduledTime}</p>
                                {point.estimatedTime &&
                                  point.estimatedTime !== point.scheduledTime && (
                                    <p className="text-sm text-amber-600">
                                      Est: {point.estimatedTime}
                                    </p>
                                  )}
                              </div>
                              <div className="ml-4 flex items-center gap-2">
                                {getStatusIcon(point.status)}
                                <span className="text-sm">{point.status}</span>
                                {point.platform && (
                                  <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                    Plat {point.platform}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Train Formation */}
                  {serviceDetails.formation && (
                    <div>
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">Train Formation</h3>
                      <div className="mb-4 flex gap-2">
                        {serviceDetails.formation.coaches.map((coach, index) => (
                          <div
                            key={index}
                            className={`flex-1 rounded-lg border-2 p-3 ${
                              coach.type === 'First'
                                ? 'border-purple-200 bg-purple-50'
                                : 'border-blue-200 bg-blue-50'
                            }`}
                          >
                            <div className="text-center">
                              <p className="text-sm font-medium">Coach {index + 1}</p>
                              <p className="text-xs text-gray-600">{coach.type}</p>
                              <div className="mt-2">
                                <div className={`h-2 w-full rounded-full bg-gray-200`}>
                                  <div
                                    className={`h-2 rounded-full ${getLoadingColor(coach.loading)}`}
                                    style={{ width: `${coach.loading}%` }}
                                  ></div>
                                </div>
                                <p className="mt-1 text-xs">{coach.loading}% full</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'performance' && serviceDetails.networkRailData && (
                <div className="space-y-6">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-700">Reliability</p>
                          <p className="text-2xl font-bold text-green-800">
                            {serviceDetails.networkRailData.performance.reliability.toFixed(1)}%
                          </p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-green-600" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Punctuality</p>
                          <p className="text-2xl font-bold text-blue-800">
                            {serviceDetails.networkRailData.performance.punctuality.toFixed(1)}%
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-amber-700">Avg Delay</p>
                          <p className="text-2xl font-bold text-amber-800">
                            {serviceDetails.networkRailData.performance.avgDelay.toFixed(1)}min
                          </p>
                        </div>
                        <Timer className="h-8 w-8 text-amber-600" />
                      </div>
                    </div>
                  </div>

                  {/* Recent Performance */}
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Performance</h3>
                    <div className="space-y-2">
                      {serviceDetails.networkRailData.performance.historicalData
                        .slice(-7)
                        .map((day, index) => (
                          <div
                            key={day.date}
                            className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                          >
                            <span className="text-sm text-gray-600">
                              {new Date(day.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              {day.onTime ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-600" />
                              )}
                              <span className="text-sm font-medium">
                                {day.onTime ? 'On Time' : `${day.delayMinutes}min late`}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'network' && serviceDetails.networkRailData && (
                <div className="space-y-6">
                  {/* Route Information */}
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">Route Information</h3>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded-lg bg-blue-50 p-4 text-center">
                        <Navigation className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                        <p className="text-sm font-medium text-blue-700">Distance</p>
                        <p className="text-lg font-bold text-blue-800">
                          {serviceDetails.networkRailData.routeInfo.distance} miles
                        </p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-4 text-center">
                        <Zap className="mx-auto mb-2 h-6 w-6 text-green-600" />
                        <p className="text-sm font-medium text-green-700">Electrified</p>
                        <p className="text-lg font-bold text-green-800">
                          {serviceDetails.networkRailData.routeInfo.electrified ? 'Yes' : 'No'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-purple-50 p-4 text-center">
                        <Activity className="mx-auto mb-2 h-6 w-6 text-purple-600" />
                        <p className="text-sm font-medium text-purple-700">Max Speed</p>
                        <p className="text-lg font-bold text-purple-800">
                          {serviceDetails.networkRailData.routeInfo.maxSpeed} mph
                        </p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-4 text-center">
                        <BarChart3 className="mx-auto mb-2 h-6 w-6 text-gray-600" />
                        <p className="text-sm font-medium text-gray-700">Signalling</p>
                        <p className="text-sm font-bold text-gray-800">
                          {serviceDetails.networkRailData.routeInfo.signallingSystem}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* TSR Impacts */}
                  {serviceDetails.networkRailData.tsrImpacts.length > 0 && (
                    <div>
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <Construction className="h-5 w-5 text-orange-600" />
                        Speed Restrictions Affecting This Service
                      </h3>
                      <div className="space-y-3">
                        {serviceDetails.networkRailData.tsrImpacts.map((impact, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-orange-200 bg-orange-50 p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-orange-900">{impact.location}</p>
                                <p className="mt-1 text-sm text-orange-700">{impact.reason}</p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                                    impact.severity === 'HIGH'
                                      ? 'bg-red-100 text-red-800'
                                      : impact.severity === 'MEDIUM'
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {impact.severity}
                                </span>
                                <p className="mt-1 text-sm font-medium text-orange-800">
                                  +{impact.delayMinutes}min delay
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <p className="text-gray-600">Unable to load service details</p>
          </div>
        )}
      </div>
    </div>
  )
}
