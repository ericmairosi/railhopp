// Best-effort Darwin Push-Port JSON parser to normalized service updates
// The RDM Darwin JSON may vary; we extract only safe, present fields.

import type { ServiceUpdate } from '@/lib/realtime/realtime-cache'

export function extractServiceUpdates(msg: any): ServiceUpdate[] {
  const updates: ServiceUpdate[] = []

  // Common shapes (best-effort):
  // - { rid, etd, std, plat, isCancelled, reason }
  // - { serviceId, estimatedDeparture, scheduledDeparture, platform, cancelled }
  // - { TS: { rid, ... }, Location: { ptd/etd, plat } }

  const maybePush = (u: Partial<ServiceUpdate>) => {
    if (!u.serviceId) return
    updates.push({ ...u, lastUpdated: new Date().toISOString() } as ServiceUpdate)
  }

  // Flat service-like message
  if (msg && typeof msg === 'object') {
    const serviceId = msg.serviceId || msg.serviceID || msg.rid || msg.train_id || msg.trainId
    const std = msg.std || msg.scheduledDeparture
    const etd = msg.etd || msg.estimatedDeparture
    const platform = msg.platform || msg.plat
    const cancelled = Boolean(msg.cancelled || msg.isCancelled)
    const delayReason = msg.delayReason || msg.reason
    const operator = msg.operator || msg.operatorName

    if (serviceId) {
      maybePush({ serviceId, scheduledDeparture: std, estimatedDeparture: etd, platform, cancelled, delayReason, operator })
    }

    // Nested TS or Location forms
    if (msg.TS) {
      const ts = msg.TS
      const rid = ts.rid || ts.serviceId
      const loc = ts.Location || msg.Location || msg.loc
      const ptd = loc?.ptd || loc?.wtd || loc?.dep || loc?.departureTime
      const etd2 = loc?.etd || loc?.atd || loc?.estimatedDeparture
      const plat2 = loc?.plat || loc?.platform
      if (rid) {
        maybePush({ serviceId: rid, scheduledDeparture: ptd, estimatedDeparture: etd2, platform: plat2 })
      }
    }
  }

  return updates
}