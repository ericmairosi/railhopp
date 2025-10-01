import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDelay(minutes: number): string {
  if (minutes === 0) return 'On time'
  if (minutes > 0) return `${minutes}m late`
  return `${Math.abs(minutes)}m early`
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'on-time':
      return 'text-green-600'
    case 'delayed':
      return 'text-amber-600'
    case 'cancelled':
      return 'text-red-600'
    case 'diverted':
      return 'text-blue-600'
    default:
      return 'text-gray-600'
  }
}

export function getStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'on-time':
      return 'default'
    case 'delayed':
      return 'secondary'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}
