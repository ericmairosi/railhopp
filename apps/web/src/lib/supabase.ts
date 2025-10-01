import { createClient } from '@supabase/supabase-js'

// Function to validate URL format
function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

// Get environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Validate the URL before creating client
if (!isValidUrl(supabaseUrl)) {
  console.warn(
    'Invalid Supabase URL detected. Please update your .env.local file with a valid Supabase project URL.'
  )
}

// Create client with fallback to prevent crashes
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey.length > 10 ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

// Helper function to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return !!(
    url &&
    key &&
    !url.includes('placeholder') &&
    !url.includes('your_supabase') &&
    !key.includes('placeholder') &&
    !key.includes('your_supabase') &&
    isValidUrl(url) &&
    key.length > 20
  )
}

// Database Types
export interface Station {
  id: string
  code: string
  name: string
  city: string
  latitude?: number
  longitude?: number
  created_at?: string
}

export interface TrainOperator {
  id: string
  name: string
  short_name: string
  logo_emoji: string
  primary_color: string
  created_at?: string
}

export interface Route {
  id: string
  origin_station_id: string
  destination_station_id: string
  operator_id: string
  duration_minutes: number
  distance_km: number
  is_direct: boolean
  created_at?: string
}

export interface Schedule {
  id: string
  route_id: string
  train_number: string
  departure_time: string
  arrival_time: string
  days_of_week: number[]
  platform?: string
  delay_minutes: number
  status: 'on_time' | 'delayed' | 'cancelled'
  created_at?: string
}

export interface Pricing {
  id: string
  route_id: string
  ticket_type: 'standard' | 'first_class'
  price: number
  advance_price?: number
  off_peak_price?: number
  availability: number
  created_at?: string
}

export interface Booking {
  id: string
  schedule_id: string
  pricing_id: string
  passenger_name: string
  passenger_email: string
  seat_number?: string
  ticket_type: 'standard' | 'first_class'
  total_price: number
  booking_reference: string
  status: 'confirmed' | 'cancelled' | 'completed'
  created_at?: string
}

export interface TrainAmenity {
  id: string
  name: string
  icon: string
  category: 'connectivity' | 'catering' | 'comfort' | 'accessibility'
}

export interface RouteAmenity {
  route_id: string
  amenity_id: string
}

// Extended types with relationships
export interface ScheduleWithDetails extends Schedule {
  route: Route & {
    origin_station: Station
    destination_station: Station
    operator: TrainOperator
  }
  pricing: Pricing[]
  amenities: TrainAmenity[]
}
