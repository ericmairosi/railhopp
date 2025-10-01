'use client'

import { useEffect, useState } from 'react'
import StationSearch from '@/components/StationSearch'
import { MapPin } from 'lucide-react'

export default function StationSummaryCard() {
  const [crs, setCrs] = useState<string>('KGX')
  const [display, setDisplay] = useState<string>('London Kings Cross (KGX)')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      setData(null)
      try {
        const res = await fetch(`/api/knowledgebase/station?crs=${encodeURIComponent(crs)}`)
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          // Fallback to suggestions to avoid blank panel
          try {
            const sres = await fetch(`/api/stations/suggest?q=${encodeURIComponent(crs)}`)
            const sjson = await sres.json()
            const match = Array.isArray(sjson?.data)
              ? (sjson.data.find((s: any) => (s.code || '').toUpperCase() === crs.toUpperCase()) || sjson.data[0])
              : null
            if (match) {
              setData({ code: match.code, name: match.name })
            } else {
              setError(json.error?.message || 'Failed to load station info')
            }
          } catch (e) {
            setError(json.error?.message || 'Failed to load station info')
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error')
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [crs])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900">
          <MapPin className="h-5 w-5 text-blue-600" />
          <div className="text-lg font-semibold">Station summary</div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1">
          <StationSearch
            placeholder="Search station"
            value={display}
            onSelect={(s) => {
              setCrs(s.code)
              setDisplay(`${s.name} (${s.code})`)
            }}
            onClear={() => setDisplay('')}
          />
        </div>
        <button
          className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => setCrs(crs)}
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm text-slate-600">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {data && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold text-slate-500">STATION</div>
            <div className="text-base font-bold text-slate-900">{data.name}</div>
            <div className="text-xs text-slate-500">{data.code}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">FACILITIES</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {(data.facilities || []).slice(0, 4).map((f: string, i: number) => (
                <span key={`sf-${i}`} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                  {f}
                </span>
              ))}
              {(!data.facilities || data.facilities.length === 0) && (
                <span className="text-xs text-slate-400">No data</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">ACCESSIBILITY</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {(data.accessibility || []).slice(0, 4).map((f: string, i: number) => (
                <span key={`sa-${i}`} className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                  {f}
                </span>
              ))}
              {(!data.accessibility || data.accessibility.length === 0) && (
                <span className="text-xs text-slate-400">No data</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}