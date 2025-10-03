import React from 'react'
import Link from 'next/link'

export type PopularStation = { code: string; name: string }

const DEFAULT_POPULAR: PopularStation[] = [
  { code: 'KGX', name: 'London Kings Cross' },
  { code: 'PAD', name: 'London Paddington' },
  { code: 'VIC', name: 'London Victoria' },
  { code: 'WAT', name: 'London Waterloo' },
  { code: 'EUS', name: 'London Euston' },
  { code: 'LIV', name: 'Liverpool Lime Street' },
  { code: 'MAN', name: 'Manchester Piccadilly' },
  { code: 'BHM', name: 'Birmingham New Street' },
  { code: 'LDS', name: 'Leeds' },
  { code: 'EDB', name: 'Edinburgh Waverley' },
]

export default function PopularStations({
  stations = DEFAULT_POPULAR,
  title = 'Popular stations',
}: {
  stations?: PopularStation[]
  title?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">Quick picks</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {stations.map((s) => (
          <Link
            key={s.code}
            href={`/departures?crs=${encodeURIComponent(s.code)}`}
            className="group rounded-lg border border-gray-200 px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
            prefetch={false}
          >
            <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">
              {s.name}
            </div>
            <div className="text-xs text-gray-500">{s.code}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
