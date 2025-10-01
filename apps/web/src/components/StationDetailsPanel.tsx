'use client'

import { useEffect, useState } from 'react'
import { X, MapPin, Phone, Globe, AlertTriangle } from 'lucide-react'

type Detail = {
  code: string
  name: string
  address?: string
  postcode?: string
  latitude?: number
  longitude?: number
  phone?: string
  website?: string
  facilities?: string[]
  accessibility?: string[]
  source?: 'knowledgebase' | 'summary'
}

export default function StationDetailsPanel({
  crs,
  open,
  onClose,
}: {
  crs: string | null
  open: boolean
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Detail | null>(null)

  useEffect(() => {
    if (!open || !crs) return
    let cancelled = false
    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/knowledgebase/station?crs=${encodeURIComponent(crs)}`)
        const json = await res.json()
        if (!cancelled) {
          if (json.success) {
            setData({ ...json.data, source: 'knowledgebase' })
          } else {
            // Fallback to summary via suggestions
            const sres = await fetch(`/api/stations/suggest?q=${encodeURIComponent(crs)}`)
            const sjson = await sres.json()
            const match = Array.isArray(sjson?.data)
              ? (sjson.data.find((s: any) => (s.code || '').toUpperCase() === crs.toUpperCase()) || sjson.data[0])
              : null
            if (match) {
              setData({ code: match.code, name: match.name, source: 'summary' })
            } else {
              setError(json.error?.message || 'Failed to load station info')
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDetails()
    return () => {
      cancelled = true
    }
  }, [open, crs])

  return (
    <div className={`fixed inset-0 z-[80] ${open ? '' : 'pointer-events-none'} `}>
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute right-0 top-0 h-full w-full max-w-md transform bg-white shadow-xl transition-transform ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b p-4">
          <div className="text-sm font-semibold text-slate-700">Station Information</div>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          {loading && <div className="text-sm text-slate-600">Loading…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {data && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-lg font-bold text-slate-900">{data.name}</div>
                  {data.source === 'summary' && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                      <AlertTriangle size={12} /> Limited info
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500">{data.code}</div>
              </div>
              {(data.address || data.postcode) && (
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin size={16} className="mt-0.5 text-slate-400" />
                  <div>
                    {data.address && <div>{data.address}</div>}
                    {data.postcode && <div className="text-slate-500">{data.postcode}</div>}
                    {data.latitude && data.longitude && (
                      <div className="text-xs text-slate-400">
                        {data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3 text-xs">
                {data.phone && (
                  <a href={`tel:${data.phone}`} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-slate-700">
                    <Phone size={14} /> {data.phone}
                  </a>
                )}
                {data.website && (
                  <a href={data.website} target="_blank" className="inline-flex items-center gap-1 rounded border px-2 py-1 text-slate-700">
                    <Globe size={14} /> Website
                  </a>
                )}
              </div>
              {data.facilities && data.facilities.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-semibold">Facilities</div>
                  <ul className="list-inside list-disc text-sm text-slate-700">
                    {data.facilities.map((f, i) => (
                      <li key={`fac-${i}`}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.accessibility && data.accessibility.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-semibold">Accessibility</div>
                  <ul className="list-inside list-disc text-sm text-slate-700">
                    {data.accessibility.map((f, i) => (
                      <li key={`acc-${i}`}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}