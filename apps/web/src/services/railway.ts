import { supabase, type Station, type TrainOperator, type Route, type Schedule, type Pricing, type Booking, type TrainAmenity, type ScheduleWithDetails } from '@/lib/supabase'

export interface SearchFilters {
  originStationCode: string
  destinationStationCode: string
  travelDate: string
  passengers: number
  departureTimeAfter?: string
  departureTimeBefore?: string
  maxPrice?: number
  directOnly?: boolean
  operators?: string[]
  amenities?: string[]
}

export interface TrainSearchResult {
  id: string
  operator: {
    name: string
    short_name: string
    logo_emoji: string
    primary_color: string
  }
  train_number: string
  departure_time: string
  arrival_time: string
  duration_minutes: number
  is_direct: boolean
  intermediate_stations?: string[]
  from_station: {
    code: string
    name: string
    city: string
  }
  to_station: {
    code: string
    name: string
    city: string
  }
  pricing: {
    standard?: {
      price: number
      availability: number
    }
    first_class?: {
      price: number
      availability: number
    }
  }
  amenities: TrainAmenity[]
  delay_minutes: number
  status: string
  platform?: string
  co2_savings_kg: number
  capacity_utilization?: number
}

/**
 * Search for train schedules based on filters
 */
export async function searchTrains(filters: SearchFilters): Promise<TrainSearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        train_number,
        departure_time,
        arrival_time,
        platform,
        delay_minutes,
        status,
        route:routes!inner (
          id,
          duration_minutes,
          is_direct,
          intermediate_stations,
          co2_savings_kg,
          origin_station:stations!routes_origin_station_id_fkey (
            code,
            name,
            city
          ),
          destination_station:stations!routes_destination_station_id_fkey (
            code,
            name,
            city
          ),
          operator:train_operators!inner (
            name,
            short_name,
            logo_emoji,
            primary_color
          ),
          pricing (
            ticket_type,
            base_price,
            advance_price,
            off_peak_price,
            peak_price,
            availability
          ),
          route_amenities (
            amenity:train_amenities (
              id,
              name,
              display_name,
              icon,
              category
            )
          )
        ),
        live_status (
          capacity_utilization
        )
      `)
      .eq('route.origin_station.code', filters.originStationCode)
      .eq('route.destination_station.code', filters.destinationStationCode)
      .eq('is_active', true)
      .eq('status', 'on_time') // Only show available trains
      .gte('departure_time', filters.departureTimeAfter || '00:00')
      .order('departure_time', { ascending: true })
      .limit(20)

    if (error) {
      console.error('Error searching trains:', error)
      throw new Error('Failed to search trains')
    }

    // Transform the data to match our interface
    const results: TrainSearchResult[] = (data || []).map((item: any) => ({
      id: item.id,
      operator: item.route.operator,
      train_number: item.train_number,
      departure_time: item.departure_time,
      arrival_time: item.arrival_time,
      duration_minutes: item.route.duration_minutes,
      is_direct: item.route.is_direct,
      intermediate_stations: item.route.intermediate_stations,
      from_station: item.route.origin_station,
      to_station: item.route.destination_station,
      pricing: {
        standard: item.route.pricing?.find((p: any) => p.ticket_type === 'standard') ? {
          price: item.route.pricing.find((p: any) => p.ticket_type === 'standard')?.base_price || 0,
          availability: item.route.pricing.find((p: any) => p.ticket_type === 'standard')?.availability || 0
        } : undefined,
        first_class: item.route.pricing?.find((p: any) => p.ticket_type === 'first_class') ? {
          price: item.route.pricing.find((p: any) => p.ticket_type === 'first_class')?.base_price || 0,
          availability: item.route.pricing.find((p: any) => p.ticket_type === 'first_class')?.availability || 0
        } : undefined
      },
      amenities: item.route.route_amenities?.map((ra: any) => ra.amenity).filter(Boolean) || [],
      delay_minutes: item.delay_minutes,
      status: item.status,
      platform: item.platform,
      co2_savings_kg: item.route.co2_savings_kg,
      capacity_utilization: item.live_status?.[0]?.capacity_utilization
    }))

    // Apply client-side filters
    let filteredResults = results

    if (filters.maxPrice) {
      filteredResults = filteredResults.filter(result => 
        (result.pricing.standard?.price || 0) <= filters.maxPrice!
      )
    }

    if (filters.directOnly) {
      filteredResults = filteredResults.filter(result => result.is_direct)
    }

    if (filters.operators?.length) {
      filteredResults = filteredResults.filter(result =>
        filters.operators!.includes(result.operator.short_name)
      )
    }

    return filteredResults
  } catch (error) {
    console.error('Error in searchTrains:', error)
    throw error
  }
}

/**
 * Get all stations
 */
export async function getStations(): Promise<Station[]> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching stations:', error)
      throw new Error('Failed to fetch stations')
    }

    return data || []
  } catch (error) {
    console.error('Error in getStations:', error)
    throw error
  }
}

/**
 * Search stations by name or code
 */
export async function searchStations(query: string): Promise<Station[]> {
  try {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,city.ilike.%${query}%,code.ilike.%${query}%`)
      .order('name')
      .limit(10)

    if (error) {
      console.error('Error searching stations:', error)
      throw new Error('Failed to search stations')
    }

    return data || []
  } catch (error) {
    console.error('Error in searchStations:', error)
    throw error
  }
}

/**
 * Get train operators
 */
export async function getTrainOperators(): Promise<TrainOperator[]> {
  try {
    const { data, error } = await supabase
      .from('train_operators')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching operators:', error)
      throw new Error('Failed to fetch train operators')
    }

    return data || []
  } catch (error) {
    console.error('Error in getTrainOperators:', error)
    throw error
  }
}

/**
 * Get live departures for a specific station
 */
export async function getLiveDepartures(stationCode: string, limit: number = 10): Promise<TrainSearchResult[]> {
  try {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 8) // HH:MM:SS format

    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        train_number,
        departure_time,
        arrival_time,
        platform,
        delay_minutes,
        status,
        route:routes!inner (
          id,
          duration_minutes,
          is_direct,
          co2_savings_kg,
          origin_station:stations!routes_origin_station_id_fkey (
            code,
            name,
            city
          ),
          destination_station:stations!routes_destination_station_id_fkey (
            code,
            name,
            city
          ),
          operator:train_operators (
            name,
            short_name,
            logo_emoji,
            primary_color
          ),
          pricing (
            ticket_type,
            base_price,
            availability
          )
        ),
        live_status (
          capacity_utilization,
          passenger_count
        )
      `)
      .eq('route.origin_station.code', stationCode)
      .gte('departure_time', currentTime)
      .eq('is_active', true)
      .order('departure_time', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Error fetching live departures:', error)
      throw new Error('Failed to fetch live departures')
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      operator: item.route.operator,
      train_number: item.train_number,
      departure_time: item.departure_time,
      arrival_time: item.arrival_time,
      duration_minutes: item.route.duration_minutes,
      is_direct: item.route.is_direct,
      from_station: item.route.origin_station,
      to_station: item.route.destination_station,
      pricing: {
        standard: item.route.pricing?.find((p: any) => p.ticket_type === 'standard') ? {
          price: item.route.pricing.find((p: any) => p.ticket_type === 'standard')?.base_price || 0,
          availability: item.route.pricing.find((p: any) => p.ticket_type === 'standard')?.availability || 0
        } : undefined,
        first_class: item.route.pricing?.find((p: any) => p.ticket_type === 'first_class') ? {
          price: item.route.pricing.find((p: any) => p.ticket_type === 'first_class')?.base_price || 0,
          availability: item.route.pricing.find((p: any) => p.ticket_type === 'first_class')?.availability || 0
        } : undefined
      },
      amenities: [],
      delay_minutes: item.delay_minutes,
      status: item.status,
      platform: item.platform,
      co2_savings_kg: item.route.co2_savings_kg,
      capacity_utilization: item.live_status?.[0]?.capacity_utilization
    }))
  } catch (error) {
    console.error('Error in getLiveDepartures:', error)
    throw error
  }
}

/**
 * Create a booking
 */
export async function createBooking(bookingData: {
  schedule_id: string
  pricing_id: string
  passenger_name: string
  passenger_email: string
  seat_number?: string
  ticket_type: 'standard' | 'first_class'
  travel_date: string
  total_price: number
}): Promise<Booking> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...bookingData,
        booking_reference: await generateBookingReference(),
        coach: 'A', // Default coach
        base_price: bookingData.total_price - 5.50, // Subtract fees
        booking_fee: 1.50,
        seat_reservation_fee: 4.00,
        payment_status: 'pending',
        booking_status: 'confirmed'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      throw new Error('Failed to create booking')
    }

    return data
  } catch (error) {
    console.error('Error in createBooking:', error)
    throw error
  }
}

/**
 * Get bookings for a user
 */
export async function getUserBookings(email: string): Promise<Booking[]> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        schedule:schedules (
          train_number,
          departure_time,
          arrival_time,
          route:routes (
            origin_station:stations!routes_origin_station_id_fkey (
              code,
              name,
              city
            ),
            destination_station:stations!routes_destination_station_id_fkey (
              code,
              name,
              city
            ),
            operator:train_operators (
              name,
              short_name,
              logo_emoji
            )
          )
        )
      `)
      .eq('passenger_email', email)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user bookings:', error)
      throw new Error('Failed to fetch bookings')
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserBookings:', error)
    throw error
  }
}

/**
 * Generate a unique booking reference
 */
async function generateBookingReference(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Subscribe to live updates for a specific station
 */
export function subscribeToLiveUpdates(
  stationCode: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`live-updates-${stationCode}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_status'
      },
      callback
    )
    .subscribe()
}

/**
 * Get network statistics
 */
export async function getNetworkStats(): Promise<{
  totalTrains: number
  onTimePercentage: number
  averageDelay: number
  activeOperators: number
}> {
  try {
    // Get total schedules for today
    const { count: totalTrains } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get on-time percentage
    const { count: onTimeTrains } = await supabase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('status', 'on_time')

    // Get average delay
    const { data: delayData } = await supabase
      .from('schedules')
      .select('delay_minutes')
      .eq('is_active', true)
      .gt('delay_minutes', 0)

    const averageDelay = delayData?.length 
      ? delayData.reduce((sum: any, item: any) => sum + item.delay_minutes, 0) / delayData.length
      : 0

    // Get active operators
    const { count: activeOperators } = await supabase
      .from('train_operators')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    return {
      totalTrains: totalTrains || 0,
      onTimePercentage: totalTrains ? Math.round(((onTimeTrains || 0) / totalTrains) * 100) : 0,
      averageDelay: Math.round(averageDelay * 10) / 10, // Round to 1 decimal place
      activeOperators: activeOperators || 0
    }
  } catch (error) {
    console.error('Error getting network stats:', error)
    return {
      totalTrains: 0,
      onTimePercentage: 0,
      averageDelay: 0,
      activeOperators: 0
    }
  }
}
