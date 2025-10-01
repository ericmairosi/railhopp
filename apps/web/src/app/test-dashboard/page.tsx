'use client'

import React from 'react'
import { Train } from 'lucide-react'
import Navigation from '@/components/Navigation'

export default function TestDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Navigation currentPage="dashboard" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Test Dashboard</h1>
          <p className="text-gray-600">Testing basic functionality without hydration issues</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-6 flex items-center gap-4">
            <Train className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dashboard Test</h2>
              <p className="text-gray-600">
                This is a simple test to verify the dashboard route works
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900">Test 1</h3>
              <p className="text-blue-700">Basic rendering works</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <h3 className="font-semibold text-green-900">Test 2</h3>
              <p className="text-green-700">Navigation integration works</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <h3 className="font-semibold text-purple-900">Test 3</h3>
              <p className="text-purple-700">Styling is applied correctly</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
