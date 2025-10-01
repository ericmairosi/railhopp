'use client'

import { Suspense } from 'react'
import EnhancedJourneyPlanner from '@/components/EnhancedJourneyPlanner'

export default function JourneyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <div className="text-center">
            <div className="mb-2 text-2xl font-bold text-gray-900">Loading Journey Planner...</div>
            <div className="text-gray-600">Preparing your travel search</div>
          </div>
        </div>
      }
    >
      <EnhancedJourneyPlanner mode="page" showNavigation={true} />
    </Suspense>
  )
}
