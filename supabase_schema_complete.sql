-- Railway Application Database Schema
-- Copy and paste this entire script into Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Stations table
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL, -- Station code like "KGX", "MAN"
    name VARCHAR(100) NOT NULL, -- Full station name
    city VARCHAR(50) NOT NULL, -- City name
    latitude DECIMAL(10, 8), -- GPS latitude
    longitude DECIMAL(11, 8), -- GPS longitude
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Train operators table
CREATE TABLE train_operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL, -- Full name like "London North Eastern Railway"
    short_name VARCHAR(20) NOT NULL, -- Short name like "LNER"
    logo_emoji VARCHAR(10) DEFAULT '🚄', -- Emoji for logo
    primary_color VARCHAR(7) DEFAULT '#0066CC', -- Hex color code
    website_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routes table (defines possible connections between stations)
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    destination_station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    operator_id UUID REFERENCES train_operators(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL, -- Typical journey duration
    distance_km DECIMAL(6, 2), -- Distance in kilometers
    is_direct BOOLEAN DEFAULT true, -- Direct service or requires changes
    intermediate_stations UUID[], -- Array of station IDs for non-direct routes
    co2_savings_kg DECIMAL(5, 2), -- CO2 savings vs driving
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(origin_station_id, destination_station_id, operator_id)
);

-- Schedules table (defines when trains run)
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    train_number VARCHAR(20) NOT NULL, -- Train service number like "LN401"
    departure_time TIME NOT NULL, -- Scheduled departure time
    arrival_time TIME NOT NULL, -- Scheduled arrival time
    days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}', -- 1=Mon, 7=Sun
    platform VARCHAR(10), -- Platform number/letter
    delay_minutes INTEGER DEFAULT 0, -- Current delay in minutes
    status VARCHAR(20) DEFAULT 'on_time', -- on_time, delayed, cancelled
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE DEFAULT CURRENT_DATE + INTERVAL '1 year',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (status IN ('on_time', 'delayed', 'cancelled')),
    CHECK (departure_time < arrival_time OR arrival_time < departure_time) -- Handle overnight journeys
);

-- Pricing table (ticket prices for different classes and times)
CREATE TABLE pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    ticket_type VARCHAR(20) NOT NULL DEFAULT 'standard', -- standard, first_class
    base_price DECIMAL(8, 2) NOT NULL, -- Base price in pounds
    advance_price DECIMAL(8, 2), -- Advance purchase price
    off_peak_price DECIMAL(8, 2), -- Off-peak price
    peak_price DECIMAL(8, 2), -- Peak time price
    availability INTEGER DEFAULT 100, -- Available seats
    max_capacity INTEGER DEFAULT 400, -- Total capacity
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE DEFAULT CURRENT_DATE + INTERVAL '3 months',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (ticket_type IN ('standard', 'first_class')),
    CHECK (base_price > 0)
);

-- Train amenities table
CREATE TABLE train_amenities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL, -- wifi, catering, quiet-coach, etc.
    display_name VARCHAR(100) NOT NULL, -- User-friendly name
    icon VARCHAR(20) NOT NULL, -- Icon identifier
    category VARCHAR(20) NOT NULL DEFAULT 'comfort', -- connectivity, catering, comfort, accessibility
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (category IN ('connectivity', 'catering', 'comfort', 'accessibility'))
);

-- Route amenities junction table
CREATE TABLE route_amenities (
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    amenity_id UUID REFERENCES train_amenities(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT true,
    additional_cost DECIMAL(6, 2) DEFAULT 0, -- Extra cost for premium amenities
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (route_id, amenity_id)
);

-- Bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    pricing_id UUID REFERENCES pricing(id) ON DELETE CASCADE,
    booking_reference VARCHAR(10) UNIQUE NOT NULL, -- 6-8 character booking ref
    passenger_name VARCHAR(200) NOT NULL,
    passenger_email VARCHAR(255) NOT NULL,
    passenger_phone VARCHAR(20),
    seat_number VARCHAR(10), -- Seat assignment like "A1", "12F"
    coach VARCHAR(5), -- Coach letter/number
    ticket_type VARCHAR(20) NOT NULL,
    quantity INTEGER DEFAULT 1,
    base_price DECIMAL(8, 2) NOT NULL,
    booking_fee DECIMAL(6, 2) DEFAULT 1.50,
    seat_reservation_fee DECIMAL(6, 2) DEFAULT 4.00,
    total_price DECIMAL(8, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, refunded
    booking_status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled, completed, used
    travel_date DATE NOT NULL,
    special_requirements TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (ticket_type IN ('standard', 'first_class')),
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    CHECK (booking_status IN ('confirmed', 'cancelled', 'completed', 'used')),
    CHECK (quantity > 0),
    CHECK (total_price > 0)
);

-- Live status table for real-time updates
CREATE TABLE live_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    current_delay_minutes INTEGER DEFAULT 0,
    current_platform VARCHAR(10),
    status VARCHAR(20) DEFAULT 'on_time',
    last_station VARCHAR(10), -- Last station code passed
    next_station VARCHAR(10), -- Next station code
    estimated_arrival TIME,
    passenger_count INTEGER DEFAULT 0,
    capacity_utilization DECIMAL(5, 2) DEFAULT 0, -- Percentage full
    weather_impact VARCHAR(50),
    service_updates TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (status IN ('on_time', 'delayed', 'cancelled', 'boarding', 'departed'))
);

-- Indexes for performance
CREATE INDEX idx_stations_code ON stations(code);
CREATE INDEX idx_stations_city ON stations(city);
CREATE INDEX idx_routes_origin_dest ON routes(origin_station_id, destination_station_id);
CREATE INDEX idx_routes_operator ON routes(operator_id);
CREATE INDEX idx_schedules_route ON schedules(route_id);
CREATE INDEX idx_schedules_departure ON schedules(departure_time);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_pricing_route_type ON pricing(route_id, ticket_type);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_email ON bookings(passenger_email);
CREATE INDEX idx_bookings_travel_date ON bookings(travel_date);
CREATE INDEX idx_live_status_schedule ON live_status(schedule_id);

-- Full text search indexes
CREATE INDEX idx_stations_search ON stations USING gin(to_tsvector('english', name || ' ' || city));
CREATE INDEX idx_operators_search ON train_operators USING gin(to_tsvector('english', name || ' ' || short_name));

-- Functions for updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON train_operators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_updated_at BEFORE UPDATE ON pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
    ref TEXT;
BEGIN
    SELECT UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6)) INTO ref;
    RETURN ref;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE train_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE train_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_status ENABLE ROW LEVEL SECURITY;

-- Public read access for operational data
CREATE POLICY "Public read access on stations" ON stations FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access on operators" ON train_operators FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access on routes" ON routes FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access on schedules" ON schedules FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access on pricing" ON pricing FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access on amenities" ON train_amenities FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access on route amenities" ON route_amenities FOR SELECT USING (true);
CREATE POLICY "Public read access on live status" ON live_status FOR SELECT USING (true);

-- Booking policies (users can only see their own bookings)
CREATE POLICY "Users can insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (passenger_email = auth.jwt() ->> 'email');
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE USING (passenger_email = auth.jwt() ->> 'email');
