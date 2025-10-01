'use client'

import { useState } from 'react'
import {
  Train,
  Search,
  MapPin,
  Clock,
  Users,
  Zap,
  ArrowRight,
  Star,
  Calendar,
  Navigation2,
  Award,
  Shield,
  Sparkles,
} from 'lucide-react'
import Navigation from '@/components/Navigation'
import StationSearch from '@/components/StationSearch'

export default function ModernPage() {
  const [fromStation, setFromStation] = useState('')
  const [toStation, setToStation] = useState('')
  const [fromStationData, setFromStationData] = useState<any>(null)
  const [toStationData, setToStationData] = useState<any>(null)

  const handleStationSelect = (station: any, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromStation(`${station.name} (${station.code})`)
      setFromStationData(station)
    } else {
      setToStation(`${station.name} (${station.code})`)
      setToStationData(station)
    }
  }

  const handleStationClear = (type: 'from' | 'to') => {
    if (type === 'from') {
      setFromStation('')
      setFromStationData(null)
    } else {
      setToStation('')
      setToStationData(null)
    }
  }

  const handleSearch = () => {
    if (fromStationData && toStationData) {
      const searchParams = new URLSearchParams({
        from: fromStationData.code,
        to: toStationData.code,
        fromName: fromStationData.name,
        toName: toStationData.name,
      })
      window.location.href = `/journey?${searchParams.toString()}`
    } else {
      window.location.href = '/journey'
    }
  }

  const todaysSchedule = [
    {
      from: 'KGX',
      fromName: 'Kings Cross',
      to: 'MAN',
      toName: 'Manchester Piccadilly',
      departure: '19:15',
      arrival: '21:45',
      status: 'On Time',
      price: '£45.50',
      crowdLevel: 'Almost Empty',
      delay: 0,
      platform: '9',
    },
    {
      from: 'KGX',
      fromName: 'Kings Cross',
      to: 'EDI',
      toName: 'Edinburgh Waverley',
      departure: '19:30',
      arrival: '23:45',
      status: 'Usually Crowded',
      price: '£67.20',
      crowdLevel: 'Crowded',
      delay: 5,
      platform: '4',
    },
    {
      from: 'KGX',
      fromName: 'Kings Cross',
      to: 'YOR',
      toName: 'York',
      departure: '20:15',
      arrival: '22:20',
      status: 'On Time',
      price: '£38.90',
      crowdLevel: 'Moderate',
      delay: 0,
      platform: '7',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="home" />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Premium Hero Section - Heights Style */}
        <div className="-mx-4 mb-16 bg-gradient-to-b from-slate-50 to-white px-4 py-20 text-center sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {/* Main Headline */}
          <h1 className="mx-auto mb-6 max-w-4xl text-4xl font-bold leading-tight text-black sm:text-5xl lg:text-6xl">
            Everything you need,
            <br />
            nothing you don't
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-gray-700">
            Feel your best with science-backed rail journeys for your brain, body and gut.
          </p>

          {/* CTA Buttons */}
          <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button className="rounded-2xl bg-black px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-gray-800">
              SHOP ALL →
            </button>
            <button className="rounded-2xl border-2 border-gray-400 px-8 py-4 text-lg font-semibold text-black transition-colors hover:border-gray-500">
              BUNDLE & SAVE →
            </button>
          </div>
        </div>

        {/* Heights-Style Product Showcase - Train Product Cards */}
        <div className="mb-20">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Left Side - Large Product Image */}
            <div className="relative">
              <div className="flex aspect-square items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 p-12">
                <div className="text-center">
                  <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-2xl bg-black shadow-xl">
                    <Train className="h-16 w-16 text-white" />
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-black">HYDRATE+</h3>
                  <p className="text-gray-700">Premium Rail Experience</p>
                </div>
              </div>
            </div>

            {/* Right Side - Product Info */}
            <div>
              <h2 className="mb-6 text-3xl font-bold leading-tight text-black lg:text-4xl">
                Everything you need,
                <br />
                nothing you don't
              </h2>

              <p className="mb-8 text-xl leading-relaxed text-gray-700">
                Feel your best with science-backed rail journeys for your brain, body and gut.
              </p>

              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-gray-800">Real-time journey updates</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-gray-800">Premium comfort seating</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-gray-800">Unmatched reliability</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <button className="rounded-2xl bg-black px-8 py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-gray-800">
                  SHOP ALL →
                </button>
                <button className="rounded-2xl border-2 border-gray-400 px-8 py-4 text-lg font-semibold text-black transition-colors hover:border-gray-500">
                  BUNDLE & SAVE →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 p-4 shadow-lg backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-md justify-around">
            <button className="flex flex-col items-center gap-1 p-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                <Train className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-600">Home</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <Calendar className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">Schedule</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <Navigation2 className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">Routes</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <Users className="h-6 w-6 text-slate-400" />
              <span className="text-xs text-slate-500">Account</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
