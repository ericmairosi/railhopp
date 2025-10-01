'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

// Simple live viewer for Darwin broker
// - Fetches recent events for a station (CRS)
// - Subscribes to WebSocket and appends matching events

const DEFAULT_BROKER = process.env.NEXT_PUBLIC_DARWIN_BROKER_URL || 'http://localhost:4001'

function toWsUrl(httpUrl: string): string {
  try {
    const u = new URL(httpUrl)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.pathname = '/ws'
    u.search = ''
    return u.toString()
  } catch {
    return 'ws://localhost:4001/ws'
  }
}

type BrokerEvent = {
  type: string
  crs: string
  body: any
}

export default function LivePage() {
  const [brokerBase, setBrokerBase] = useState<string>(DEFAULT_BROKER)
  const [crs, setCrs] = useState<string>('KGX')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [connected, setConnected] = useState<boolean>(false)
  const [events, setEvents] = useState<BrokerEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const recentUrl = useMemo(() => {
    try {
      const u = new URL(brokerBase)
      u.pathname = `/station/${crs.toUpperCase()}/recent`
      u.search = ''
      return u.toString()
    } catch {
      return `http://localhost:4001/station/${crs.toUpperCase()}/recent`
    }
  }, [brokerBase, crs])

  const wsUrl = useMemo(() => toWsUrl(brokerBase), [brokerBase])

  useEffect(() => {
    setLoading(true)
    setError('')

    fetch(recentUrl)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = await r.json()
        const list: any[] = Array.isArray(data?.data) ? data.data : []
        // Normalize into BrokerEvent shape
        const normalized: BrokerEvent[] = list.map((body) => ({
          type: 'movement',
          crs: crs.toUpperCase(),
          body,
        }))
        setEvents(normalized)
      })
      .catch((e) => setError(`Failed to fetch recent: ${String(e)}`))
      .finally(() => setLoading(false))
  }, [recentUrl, crs])

  useEffect(() => {
    // Reconnect WS when broker changes
    try {
      wsRef.current?.close()
    } catch {}

    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data?.type === 'movement') {
          const evt: BrokerEvent = {
            type: 'movement',
            crs: (data.crs || '').toUpperCase(),
            body: data.body,
          }
          // Only show the selected CRS
          if (evt.crs === crs.toUpperCase()) {
            setEvents((prev) => [evt, ...prev].slice(0, 200))
          }
        }
      } catch {
        // ignore
      }
    }

    return () => {
      try {
        ws.close()
      } catch {}
    }
  }, [wsUrl, crs])

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Darwin Live Viewer (Broker)</h1>

      <div className="grid items-end gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Station CRS</label>
          <input
            value={crs}
            onChange={(e) => setCrs(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="KGX"
            className="rounded border px-3 py-2"
            maxLength={3}
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-sm font-medium">Broker Base URL</label>
          <input
            value={brokerBase}
            onChange={(e) => setBrokerBase(e.target.value)}
            placeholder="http://localhost:4001"
            className="rounded border px-3 py-2"
          />
          <p className="text-xs text-gray-500">WebSocket: {wsUrl}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <span>Status: {connected ? 'Connected' : 'Disconnected'}</span>
        {loading && <span>Loading recent…</span>}
        {error && <span className="text-red-600">{error}</span>}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent + Live Events for {crs.toUpperCase()}</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gray-600">No events yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.slice(0, 50).map((evt, i) => (
              <li key={i} className="rounded border bg-white p-3">
                <div className="mb-1 text-xs text-gray-500">
                  {evt.type} • CRS: {evt.crs}
                </div>
                <pre className="overflow-auto text-xs">{JSON.stringify(evt.body, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
