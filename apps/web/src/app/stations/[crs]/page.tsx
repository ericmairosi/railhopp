import { Suspense } from 'react'
import EnhancedDepartureBoard from '@/components/EnhancedDepartureBoard'
import StationDetailsPanel from '@/components/StationDetailsPanel'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function StationPage({ params }: { params: { crs: string } }) {
  const crs = (params.crs || '').toUpperCase()
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Station: {crs}</h1>
        <p className="text-slate-600">Live departures and station information</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Live departures</h2>
          <ErrorBoundary
            fallback={<div className="p-4 text-gray-500">Unable to load departures</div>}
          >
            <Suspense fallback={<div className="p-4 text-gray-500">Loading…</div>}>
              <EnhancedDepartureBoard stationCode={crs} maxResults={20} showDetailed={false} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Station information</h2>
          <ErrorBoundary
            fallback={<div className="p-4 text-gray-500">Unable to load station info</div>}
          >
            <Suspense fallback={<div className="p-4 text-gray-500">Loading…</div>}>
              <StationDetailsPanel crs={crs} open={true} onClose={() => {}} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </main>
  )
}
