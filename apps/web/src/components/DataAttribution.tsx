'use client'

export default function DataAttribution({ className = '' }: { className?: string }) {
  return (
    <div className={`mt-6 text-center text-xs text-slate-500 ${className}`}>
      Data sources: Darwin (Rail Data Marketplace), Knowledgebase Stations (RDM), optional Knowledge
      Station. Not for safety-critical use. Check official sources before travel.
    </div>
  )
}
