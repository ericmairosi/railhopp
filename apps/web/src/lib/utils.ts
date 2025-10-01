import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatDelay(minutes: number): string {
  if (minutes === 0) return 'On time'
  if (minutes > 0) return `${minutes}m late`
  return `${Math.abs(minutes)}m early`
}

export function getStatusColor(status: 'onTime' | 'delayed' | 'cancelled' | 'replacement'): string {
  const colors = {
    onTime: 'text-railway-status-onTime',
    delayed: 'text-railway-status-delayed',
    cancelled: 'text-railway-status-cancelled',
    replacement: 'text-railway-status-replacement',
  }
  return colors[status]
}
