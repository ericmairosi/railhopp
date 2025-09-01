-- Railway Application Seed Data (SIMPLIFIED VERSION)
-- Copy and paste this entire script into Supabase SQL Editor AFTER running the schema

-- Clear existing data if any
DELETE FROM live_status;
DELETE FROM bookings;
DELETE FROM route_amenities;
DELETE FROM pricing;
DELETE FROM schedules;
DELETE FROM routes;
DELETE FROM train_amenities;
DELETE FROM train_operators;
DELETE FROM stations;

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

-- Insert routes using direct subqueries (no PL/pgSQL)
INSERT INTO routes (origin_station_id, destination_station_id, operator_id, duration_minutes, distance_km, is_direct, co2_savings_kg)
SELECT 
    kgx.id, man.id, lner.id, 150, 300, true, 14.2
FROM 
    stations kgx, stations man, train_operators lner
WHERE 
    kgx.code = 'KGX' AND man.code = 'MAN' AND lner.short_name = 'LNER';

INSERT INTO routes (origin_station_id, destination_station_id, operator_id, duration_minutes, distance_km, is_direct, co2_savings_kg)
SELECT 
    kgx.id, edi.id, lner.id, 270, 650, true, 31.5
FROM 
    stations kgx, stations edi, train_operators lner
WHERE 
    kgx.code = 'KGX' AND edi.code = 'EDI' AND lner.short_name = 'LNER';

INSERT INTO routes (origin_station_id, destination_station_id, operator_id, duration_minutes, distance_km, is_direct, co2_savings_kg)
SELECT 
    kgx.id, yor.id, lner.id, 125, 280, true, 13.8
FROM 
    stations kgx, stations yor, train_operators lner
WHERE 
    kgx.code = 'KGX' AND yor.code = 'YOR' AND lner.short_name = 'LNER';

INSERT INTO routes (origin_station_id, destination_station_id, operator_id, duration_minutes, distance_km, is_direct, co2_savings_kg)
SELECT 
    kgx.id, man.id, cc.id, 170, 300, true, 12.0
FROM 
    stations kgx, stations man, train_operators cc
WHERE 
    kgx.code = 'KGX' AND man.code = 'MAN' AND cc.short_name = 'CrossCountry';

INSERT INTO routes (origin_station_id, destination_station_id, operator_id, duration_minutes, distance_km, is_direct, co2_savings_kg)
SELECT 
    kgx.id, man.id, nr.id, 210, 300, false, 18.0
FROM 
    stations kgx, stations man, train_operators nr
WHERE 
    kgx.code = 'KGX' AND man.code = 'MAN' AND nr.short_name = 'Northern';

INSERT INTO routes (origin_station_id, destination_station_id, operator_id, duration_minutes, distance_km, is_direct, co2_savings_kg)
SELECT 
    kgx.id, yor.id, tpe.id, 160, 280, true, 13.0
FROM 
    stations kgx, stations yor, train_operators tpe
WHERE 
    kgx.code = 'KGX' AND yor.code = 'YOR' AND tpe.short_name = 'TPE';

-- Insert schedules for each route manually
-- KGX to MAN LNER route schedules
INSERT INTO schedules (route_id, train_number, departure_time, arrival_time, platform, delay_minutes, status)
SELECT r.id, 'LNER401', '07:15', '09:45', '9', 0, 'on_time'
FROM routes r 
JOIN stations s1 ON r.origin_station_id = s1.id 
JOIN stations s2 ON r.destination_station_id = s2.id 
JOIN train_operators t ON r.operator_id = t.id
WHERE s1.code = 'KGX' AND s2.code = 'MAN' AND t.short_name = 'LNER';

INSERT INTO schedules (route_id, train_number, departure_time, arrival_time, platform, delay_minutes, status)
SELECT r.id, 'LNER403', '09:30', '12:00', '4', 5, 'delayed'
FROM routes r 
JOIN stations s1 ON r.origin_station_id = s1.id 
JOIN stations s2 ON r.destination_station_id = s2.id 
JOIN train_operators t ON r.operator_id = t.id
WHERE s1.code = 'KGX' AND s2.code = 'MAN' AND t.short_name = 'LNER';

INSERT INTO schedules (route_id, train_number, departure_time, arrival_time, platform, delay_minutes, status)
SELECT r.id, 'LNER405', '12:15', '14:45', '7', 0, 'on_time'
FROM routes r 
JOIN stations s1 ON r.origin_station_id = s1.id 
JOIN stations s2 ON r.destination_station_id = s2.id 
JOIN train_operators t ON r.operator_id = t.id
WHERE s1.code = 'KGX' AND s2.code = 'MAN' AND t.short_name = 'LNER';

-- KGX to EDI LNER route schedules
INSERT INTO schedules (route_id, train_number, departure_time, arrival_time, platform, delay_minutes, status)
SELECT r.id, 'LNER501', '08:00', '12:30', '10', 0, 'on_time'
FROM routes r 
JOIN stations s1 ON r.origin_station_id = s1.id 
JOIN stations s2 ON r.destination_station_id = s2.id 
JOIN train_operators t ON r.operator_id = t.id
WHERE s1.code = 'KGX' AND s2.code = 'EDI' AND t.short_name = 'LNER';

INSERT INTO schedules (route_id, train_number, departure_time, arrival_time, platform, delay_minutes, status)
SELECT r.id, 'LNER503', '14:30', '19:00', '10', 0, 'on_time'
FROM routes r 
JOIN stations s1 ON r.origin_station_id = s1.id 
JOIN stations s2 ON r.destination_station_id = s2.id 
JOIN train_operators t ON r.operator_id = t.id
WHERE s1.code = 'KGX' AND s2.code = 'EDI' AND t.short_name = 'LNER';

-- KGX to YOR LNER route schedules
INSERT INTO schedules (route_id, train_number, departure_time, arrival_time, platform, delay_minutes, status)
SELECT r.id, 'LNER301', '07:45', '09:50', '8', 0, 'on_time'
FROM routes r 
JOIN stations s1 ON r.origin_station_id = s1.id 
JOIN stations s2 ON r.destination_station_id = s2.id 
JOIN train_operators t ON r.operator_id = t.id
WHERE s1.code = 'KGX' AND s2.code = 'YOR' AND t.short_name = 'LNER';

-- Insert pricing for all routes
INSERT INTO pricing (route_id, ticket_type, base_price, advance_price, off_peak_price, peak_price, availability)
SELECT 
    r.id, 
    'standard',
    r.distance_km * 0.15, -- Base rate
    r.distance_km * 0.15 * 0.7, -- 30% discount for advance
    r.distance_km * 0.15 * 0.85, -- 15% discount for off-peak
    r.distance_km * 0.15 * 1.2, -- 20% premium for peak
    150
FROM routes r;

INSERT INTO pricing (route_id, ticket_type, base_price, advance_price, off_peak_price, peak_price, availability)
SELECT 
    r.id, 
    'first_class',
    r.distance_km * 0.15 * 2.0, -- Base rate * 2
    r.distance_km * 0.15 * 2.0 * 0.8, -- 20% discount for advance
    r.distance_km * 0.15 * 2.0 * 0.9, -- 10% discount for off-peak
    r.distance_km * 0.15 * 2.0 * 1.15, -- 15% premium for peak
    40
FROM routes r;

-- Insert route amenities (WiFi and power for all routes)
INSERT INTO route_amenities (route_id, amenity_id)
SELECT r.id, a.id
FROM routes r
CROSS JOIN train_amenities a
WHERE a.name IN ('wifi', 'power-outlets', 'air-conditioning');

-- Insert premium amenities for LNER routes only
INSERT INTO route_amenities (route_id, amenity_id)
SELECT r.id, a.id
FROM routes r
JOIN train_operators t ON r.operator_id = t.id
CROSS JOIN train_amenities a
WHERE t.short_name = 'LNER' 
AND a.name IN ('catering', 'quiet-coach', 'business-lounge', 'wheelchair-access');

-- Insert live status for all schedules
INSERT INTO live_status (schedule_id, current_delay_minutes, current_platform, status, passenger_count, capacity_utilization)
SELECT 
    s.id,
    s.delay_minutes,
    s.platform,
    s.status,
    FLOOR(RANDOM() * 250 + 50)::INTEGER, -- Random passenger count 50-300
    ROUND((RANDOM() * 0.7 + 0.2)::NUMERIC, 2) -- Random capacity 20-90%
FROM schedules s;

-- Insert sample bookings
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
    p.base_price + 1.50 + 4.00,
    'paid',
    CURRENT_DATE + INTERVAL '1 day'
FROM schedules s
JOIN routes r ON s.route_id = r.id
JOIN pricing p ON r.id = p.route_id
WHERE p.ticket_type = 'standard'
LIMIT 5;

-- Update statistics
ANALYZE;
