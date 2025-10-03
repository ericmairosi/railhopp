'use client'

import { useEffect, useRef, useState } from 'react'

export default function LiveIndicator({ className = '' }: { className?: string }) {
  const [status, setStatus] = useState<'connecting' | 'live' | 'idle'>('connecting')
  const lastEventAt = useRef<number>(0)
  const refES = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/darwin/kafka/stream')
    refES.current = es

    const touch = () => {
      lastEventAt.current = Date.now()
      setStatus('live')
    }

    es.addEventListener('bootstrap', touch)
    es.addEventListener('service_update', touch)
    es.onopen = () => setStatus('live')
    es.onerror = () => setStatus('connecting')

    const iv = setInterval(() => {
      if (!lastEventAt.current) return
      const diff = Date.now() - lastEventAt.current
      if (diff > 45000) setStatus('idle')
    }, 10000)

    return () => {
      clearInterval(iv)
      es.close()
    }
  }, [])

  const color =
    status === 'live' ? 'bg-green-500' : status === 'idle' ? 'bg-amber-500' : 'bg-slate-400'
  const label = status === 'live' ? 'Live' : status === 'idle' ? 'Idle' : 'Connecting'

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${className}`}>
      <span className={`h-2 w-2 animate-pulse rounded-full ${color}`}></span>
      <span className="text-slate-600">{label} data</span>
    </span>
  )
}
