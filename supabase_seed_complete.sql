-- Railway Application Seed Data
-- Copy and paste this entire script into Supabase SQL Editor AFTER running the schema

-- Insert major UK stations
INSERT INTO stations (code, name, city, latitude, longitude) VALUES
('KGX', 'London Kings Cross', 'London', 51.5308, -0.1238),
('MAN', 'Manchester Piccadilly', 'Manchester', 53.4773, -2.2309),
('EDI', 'Edinburgh Waverley', 'Edinburgh', 55.9521, -3.1907),
('YOR', 'York', 'York', 53.9583, -1.0933),
('BIR', 'Birmingham New Street', 'Birmingham', 52.4777, -1.8996),
('LIV', 'Liverpool Lime Street', 'Liverpool', 53.4078, -2.9771),
('NCL', 'Newcastle Central', 'Newcastle', 54.9688, -1.6174),
('LEE', 'Leeds', 'Leeds', 53.7948, -1.5491),
('SHF', 'Sheffield', 'Sheffield', 53.3781, -1.4621),
('NOT', 'Nottingham', 'Nottingham', 52.9476, -1.1465),
('GLA', 'Glasgow Central', 'Glasgow', 55.8587, -4.2573),
('BRI', 'Bristol Temple Meads', 'Bristol', 51.4492, -2.5815),
('CAR', 'Cardiff Central', 'Cardiff', 51.4761, -3.1794),
('PLY', 'Plymouth', 'Plymouth', 50.3778, -4.1433),
('EXE', 'Exeter St Davids', 'Exeter', 50.7340, -3.5437);

-- Insert train operators
INSERT INTO train_operators (name, short_name, logo_emoji, primary_color, website_url) VALUES
('London North Eastern Railway', 'LNER', '🚄', '#C41E3A', 'https://www.lner.co.uk'),
('CrossCountry', 'CrossCountry', '🚂', '#7B2D8E', 'https://www.crosscountrytrains.co.uk'),
('Northern Rail', 'Northern', '🚈', '#00A8E6', 'https://www.northernrailway.co.uk'),
('TransPennine Express', 'TPE', '⚡', '#FF6900', 'https://www.tpexpress.co.uk'),
('Virgin Trains', 'Virgin', '🚅', '#FF0000', 'https://www.virgintrains.co.uk'),
('Great Western Railway', 'GWR', '🚃', '#003C71', 'https://www.gwr.com'),
('ScotRail', 'ScotRail', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '#0065BD', 'https://www.scotrail.co.uk'),
('Avanti West Coast', 'Avanti', '🚄', '#E30613', 'https://www.avantiwestcoast.co.uk');

-- Insert train amenities
INSERT INTO train_amenities (name, display_name, icon, category, description) VALUES
('wifi', 'Free WiFi', 'wifi', 'connectivity', 'Complimentary wireless internet throughout the journey'),
('catering', 'Catering Service', 'coffee', 'catering', 'On-board refreshments and meal service'),
('quiet-coach', 'Quiet Coach', '🤫', 'comfort', 'Designated quiet areas for peaceful travel'),
('business-lounge', 'Business Lounge Access', '💼', 'comfort', 'Access to station business lounges'),
('power-outlets', 'Power Outlets', 'zap', 'connectivity', 'Electrical outlets at every seat'),
('air-conditioning', 'Air Conditioning', '❄️', 'comfort', 'Climate controlled environment'),
('wheelchair-access', 'Wheelchair Access', '♿', 'accessibility', 'Full wheelchair accessibility'),
('bike-storage', 'Bike Storage', '🚲', 'comfort', 'Secure bicycle storage areas');

-- Insert routes (sample major routes)
DO $$
DECLARE
    kgx_id UUID;
    man_id UUID;
    edi_id UUID;
    yor_id UUID;
    bir_id UUID;
    lner_id UUID;
    cc_id UUID;
    nr_id UUID;
    tpe_id UUID;
    route_id UUID;
BEGIN
    -- Get station IDs
    SELECT id INTO kgx_id FROM stations WHERE code = 'KGX';
    SELECT id INTO man_id FROM stations WHERE code = 'MAN';
    SELECT id INTO edi_id FROM stations WHERE code = 'EDI';
    SELECT id INTO yor_id FROM stations WHERE code = 'YOR';
    SELECT id INTO bir_id FROM stations WHERE code = 'BIR';
    
    -- Get operator IDs
    SELECT id INTO lner_id FROM train_operators WHERE short_name = 'LNER';
    SELECT id INTO cc_id FROM train_operators WHERE short_name = 'CrossCountry';
    SELECT id INTO nr_id FROM train_operators WHERE short_name = 'Northern';
    SELECT id INTO tpe_id FROM train_operators WHERE short_name = 'TPE';
    
    -- Insert routes
    INSERT INTO routes (origin_station_id, destination_station_id, operator_id, duration_minutes, distance_km, is_direct, co2_savings_kg)
    VALUES 
    (kgx_id, man_id, lner_id, 150, 300, true, 14.2),
    (kgx_id, edi_id, lner_id, 270, 650, true, 31.5),
    (kgx_id, yor_id, lner_id, 125, 280, true, 13.8),
    (kgx_id, man_id, cc_id, 170, 300, true, 12.0),
    (kgx_id, man_id, nr_id, 210, 300, false, 18.0),
    (kgx_id, yor_id, tpe_id, 160, 280, true, 13.0)
    RETURNING id INTO route_id;
END $$;

-- Insert schedules for routes
DO $$
DECLARE
    route_rec RECORD;
    operator_name TEXT;
BEGIN
    FOR route_rec IN 
        SELECT r.id as route_id, r.duration_minutes, to1.short_name as operator_name,
               s1.code as origin_code, s2.code as dest_code
        FROM routes r
        JOIN stations s1 ON r.origin_station_id = s1.id
        JOIN stations s2 ON r.destination_station_id = s2.id
        JOIN train_operators to1 ON r.operator_id = to1.id
    LOOP
        -- Insert multiple schedules per route for different times of day
        INSERT INTO schedules (route_id, train_number, departure_time, arrival_time, platform, delay_minutes, status)
        VALUES
        (route_rec.route_id, 
         route_rec.operator_name || '401', 
         '07:15', 
         ('07:15'::TIME + (route_rec.duration_minutes || ' minutes')::INTERVAL)::TIME, 
         '9', 0, 'on_time'),
        (route_rec.route_id, 
         route_rec.operator_name || '403', 
         '09:30', 
         ('09:30'::TIME + (route_rec.duration_minutes || ' minutes')::INTERVAL)::TIME, 
         '4', 5, 'delayed'),
        (route_rec.route_id, 
         route_rec.operator_name || '405', 
         '12:15', 
         ('12:15'::TIME + (route_rec.duration_minutes || ' minutes')::INTERVAL)::TIME, 
         '7', 0, 'on_time'),
        (route_rec.route_id, 
         route_rec.operator_name || '407', 
         '15:30', 
         ('15:30'::TIME + (route_rec.duration_minutes || ' minutes')::INTERVAL)::TIME, 
         '9', 0, 'on_time'),
        (route_rec.route_id, 
         route_rec.operator_name || '409', 
         '19:15', 
         ('19:15'::TIME + (route_rec.duration_minutes || ' minutes')::INTERVAL)::TIME, 
         '9', 0, 'on_time');
    END LOOP;
END $$;

-- Insert pricing for routes
DO $$
DECLARE
    route_rec RECORD;
    base_rate DECIMAL;
BEGIN
    FOR route_rec IN SELECT id, distance_km FROM routes LOOP
        -- Calculate base rate based on distance (roughly £0.15 per km)
        base_rate := route_rec.distance_km * 0.15;
        
        -- Standard class pricing
        INSERT INTO pricing (route_id, ticket_type, base_price, advance_price, off_peak_price, peak_price, availability)
        VALUES (
            route_rec.id,
            'standard',
            base_rate,
            base_rate * 0.7,  -- 30% discount for advance
            base_rate * 0.85, -- 15% discount for off-peak
            base_rate * 1.2,  -- 20% premium for peak
            150
        );
        
        -- First class pricing (roughly 2x standard)
        INSERT INTO pricing (route_id, ticket_type, base_price, advance_price, off_peak_price, peak_price, availability)
        VALUES (
            route_rec.id,
            'first_class',
            base_rate * 2.0,
            base_rate * 2.0 * 0.8,  -- 20% discount for advance
            base_rate * 2.0 * 0.9,  -- 10% discount for off-peak
            base_rate * 2.0 * 1.15, -- 15% premium for peak
            40
        );
    END LOOP;
END $$;

-- Insert route amenities
DO $$
DECLARE
    route_rec RECORD;
    amenity_rec RECORD;
BEGIN
    -- Add common amenities to all routes
    FOR route_rec IN SELECT id FROM routes LOOP
        -- Add WiFi and power outlets to all routes
        INSERT INTO route_amenities (route_id, amenity_id)
        SELECT route_rec.id, ta.id
        FROM train_amenities ta 
        WHERE ta.name IN ('wifi', 'power-outlets', 'air-conditioning');
        
        -- Add premium amenities to some routes (LNER routes)
        IF route_rec.id IN (
            SELECT r.id FROM routes r 
            JOIN train_operators to1 ON r.operator_id = to1.id 
            WHERE to1.short_name = 'LNER'
        ) THEN
            INSERT INTO route_amenities (route_id, amenity_id)
            SELECT route_rec.id, ta.id
            FROM train_amenities ta 
            WHERE ta.name IN ('catering', 'quiet-coach', 'business-lounge', 'wheelchair-access');
        END IF;
    END LOOP;
END $$;

-- Insert live status for current schedules
INSERT INTO live_status (schedule_id, current_delay_minutes, current_platform, status, passenger_count, capacity_utilization)
SELECT 
    s.id,
    s.delay_minutes,
    s.platform,
    s.status,
    FLOOR(RANDOM() * 300 + 50)::INTEGER, -- Random passenger count
    ROUND((RANDOM() * 0.8 + 0.1)::NUMERIC, 2) -- Random capacity 10-90%
FROM schedules s;

-- Insert some sample bookings
INSERT INTO bookings (
    schedule_id, 
    pricing_id, 
    booking_reference, 
    passenger_name, 
    passenger_email, 
    seat_number, 
    coach,
    ticket_type, 
    base_price, 
    total_price, 
    payment_status, 
    travel_date
)
SELECT 
    s.id,
    p.id,
    generate_booking_reference(),
    'John Smith',
    'john.smith@example.com',
    'A' || (FLOOR(RANDOM() * 20) + 1)::TEXT,
    'A',
    p.ticket_type,
    p.base_price,
    p.base_price + 1.50 + 4.00, -- Add booking and seat reservation fees
    'paid',
    CURRENT_DATE + INTERVAL '1 day'
FROM schedules s
JOIN routes r ON s.route_id = r.id
JOIN pricing p ON r.id = p.route_id
WHERE p.ticket_type = 'standard'
LIMIT 5;

-- Update statistics
ANALYZE;
