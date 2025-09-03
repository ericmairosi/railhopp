'use client';

import { Suspense } from 'react';
import JourneyPlannerContent from './JourneyPlannerContent';

export default function JourneyPlannerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">Loading Journey Planner...</div>
          <div className="text-gray-600">Preparing your travel search</div>
        </div>
      </div>
    }>
      <JourneyPlannerContent />
    </Suspense>
  );
}
