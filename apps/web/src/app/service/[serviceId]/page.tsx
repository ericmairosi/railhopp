'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Clock, MapPin, AlertCircle, ArrowRight, Users } from 'lucide-react'
import Navigation from '@/components/Navigation'

interface CallingPoint {
  stationName: string
  stationCode: string
  scheduledTime?: string
  estimatedTime?: string
  actualTime?: string
  departed: boolean
  isCancelled?: boolean
}

interface ServiceDetails {
  serviceId: string
  operator: string
  operatorCode: string
  trainNumber?: string
  platform?: string
  length?: number
  formation?: string
  status: string
  delayMinutes?: number
  isCancelled: boolean
  cancelReason?: string
  delayReason?: string
  previousCallingPoints: CallingPoint[]
  subsequentCallingPoints: CallingPoint[]
}

export default function ServiceDetailsPage() {
  const params = useParams()
  const serviceId = params.serviceId as string
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (serviceId) {
      fetchServiceDetails(serviceId)
    }
  }, [serviceId])

  const fetchServiceDetails = async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/darwin/service/${encodeURIComponent(id)}`)
      const result = await response.json()

      if (result.success) {
        setServiceDetails(result.data)
      } else {
        setError(result.error?.message || 'Failed to fetch service details')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Cancelled':
        return 'text-red-600'
      case 'Delayed':
        return 'text-amber-600'
      default:
        return 'text-green-600'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Cancelled':
        return 'bg-red-100'
      case 'Delayed':
        return 'bg-amber-100'
      default:
        return 'bg-green-100'
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #1e293b, #334155)',
        color: 'white',
      }}
    >
      <Navigation currentPage="service" />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <a
            href="/departures"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            ← Back to Departures
          </a>
        </div>

        {loading && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '1rem',
              padding: '3rem',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Loading service details...
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
              Fetching live information from National Rail
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '1rem',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Unable to load service details
            </div>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{error}</div>
          </div>
        )}

        {serviceDetails && !loading && (
          <>
            {/* Service Overview */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '2rem',
                marginBottom: '2rem',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '2rem',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    {serviceDetails.operator}
                  </h2>
                  <p style={{ fontSize: '1rem', color: '#94a3b8' }}>
                    Service {serviceDetails.trainNumber || serviceDetails.serviceId}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div
                      style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}
                    >
                      Status
                    </div>
                    <span
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        background: getStatusBg(serviceDetails.status),
                        color: getStatusColor(serviceDetails.status),
                      }}
                    >
                      {serviceDetails.status}
                    </span>
                    {serviceDetails.delayMinutes && serviceDetails.delayMinutes > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                        {serviceDetails.delayMinutes} minutes late
                      </div>
                    )}
                  </div>
                </div>

                {serviceDetails.platform && (
                  <div>
                    <div
                      style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}
                    >
                      Platform
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        background: '#dc2626',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        fontWeight: 'bold',
                        fontSize: '1.25rem',
                      }}
                    >
                      {serviceDetails.platform}
                    </div>
                  </div>
                )}

                {serviceDetails.formation && (
                  <div>
                    <div
                      style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}
                    >
                      Train Length
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={16} />
                      <span>{serviceDetails.formation}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reasons */}
              {(serviceDetails.delayReason || serviceDetails.cancelReason) && (
                <div
                  style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderRadius: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} color="#fbbf24" />
                    <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                      Service Information
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem' }}>
                    {serviceDetails.delayReason || serviceDetails.cancelReason}
                  </p>
                </div>
              )}
            </div>

            {/* Calling Points */}
            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
              {/* Previous Calling Points */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '1rem',
                  padding: '2rem',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <MapPin size={20} />
                  Previous Stops
                </h3>

                {serviceDetails.previousCallingPoints.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    No previous stops available
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {serviceDetails.previousCallingPoints.map((point, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '60px 1fr auto',
                          gap: '1rem',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '0.5rem',
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                            {point.actualTime || point.scheduledTime}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                            {point.actualTime ? 'Actual' : 'Scheduled'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 'bold' }}>{point.stationName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {point.stationCode}
                          </div>
                        </div>

                        <div>
                          {point.departed ? (
                            <span
                              style={{
                                background: 'rgba(34, 197, 94, 0.2)',
                                color: '#22c55e',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                              }}
                            >
                              ✓ Departed
                            </span>
                          ) : (
                            <span
                              style={{
                                background: 'rgba(156, 163, 175, 0.2)',
                                color: '#9ca3af',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                              }}
                            >
                              Not yet
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Calling Points */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '1rem',
                  padding: '2rem',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 'bold',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <ArrowRight size={20} />
                  Upcoming Stops
                </h3>

                {serviceDetails.subsequentCallingPoints.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                    No upcoming stops available
                  </p>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {serviceDetails.subsequentCallingPoints.map((point, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '60px 1fr auto',
                          gap: '1rem',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '0.5rem',
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
                            {point.estimatedTime || point.scheduledTime}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#94a3b8' }}>
                            {point.estimatedTime && point.estimatedTime !== point.scheduledTime
                              ? 'Estimated'
                              : 'Scheduled'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 'bold' }}>{point.stationName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {point.stationCode}
                          </div>
                        </div>

                        <div>
                          {point.isCancelled ? (
                            <span
                              style={{
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                              }}
                            >
                              Cancelled
                            </span>
                          ) : index === 0 ? (
                            <span
                              style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                              }}
                            >
                              Next
                            </span>
                          ) : (
                            <span
                              style={{
                                background: 'rgba(156, 163, 175, 0.2)',
                                color: '#9ca3af',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                              }}
                            >
                              Due
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
