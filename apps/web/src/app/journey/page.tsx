'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Clock, MapPin, Search, Calendar, Users, Navigation as NavigationIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import StationSearch from '@/components/StationSearch';
import { useSearchParams } from 'next/navigation';

const popularStations = [
  { code: 'KGX', name: 'London Kings Cross' },
  { code: 'LIV', name: 'Liverpool Lime Street' },
  { code: 'MAN', name: 'Manchester Piccadilly' },
  { code: 'BHM', name: 'Birmingham New Street' },
  { code: 'LDS', name: 'Leeds' },
  { code: 'EDB', name: 'Edinburgh' },
  { code: 'GLA', name: 'Glasgow Central' },
  { code: 'YOR', name: 'York' },
  { code: 'NCL', name: 'Newcastle' },
  { code: 'BRI', name: 'Bristol Temple Meads' }
];

export default function JourneyPlannerPage() {
  const searchParams = useSearchParams();
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [fromStationData, setFromStationData] = useState<any>(null);
  const [toStationData, setToStationData] = useState<any>(null);
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [departureTime, setDepartureTime] = useState('09:00');
  const [passengers, setPassengers] = useState(1);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Handle URL parameters from modern page
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const fromName = searchParams.get('fromName');
    const toName = searchParams.get('toName');
    
    if (from && fromName) {
      setFromStation(`${fromName} (${from})`);
      setFromStationData({ code: from, name: fromName });
    }
    
    if (to && toName) {
      setToStation(`${toName} (${to})`);
      setToStationData({ code: to, name: toName });
    }
  }, [searchParams]);

  const handleQuickSelect = (station: any, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromStation(`${station.name} (${station.code})`);
      setFromStationData(station);
    } else {
      setToStation(`${station.name} (${station.code})`);
      setToStationData(station);
    }
  };
  
  const handleStationSelect = (station: any, type: 'from' | 'to') => {
    if (type === 'from') {
      setFromStation(`${station.name} (${station.code})`);
      setFromStationData(station);
    } else {
      setToStation(`${station.name} (${station.code})`);
      setToStationData(station);
    }
  };
  
  const handleStationClear = (type: 'from' | 'to') => {
    if (type === 'from') {
      setFromStation('');
      setFromStationData(null);
    } else {
      setToStation('');
      setToStationData(null);
    }
  };

  const handleSwapStations = () => {
    const tempStation = fromStation;
    const tempData = fromStationData;
    setFromStation(toStation);
    setFromStationData(toStationData);
    setToStation(tempStation);
    setToStationData(tempData);
  };

  const handleSearch = async () => {
    if (!fromStation || !toStation) return;
    
    setIsSearching(true);
    setSearchResults(null);
    
    try {
      // Use station data if available, otherwise extract CRS codes
      const fromCRS = fromStationData ? fromStationData.code : extractCRS(fromStation);
      const toCRS = toStationData ? toStationData.code : extractCRS(toStation);
      
      if (!fromCRS || !toCRS) {
        alert('Please select valid stations from the dropdown');
        setIsSearching(false);
        return;
      }
      
      // For now, we'll show departures from the origin station that go toward the destination
      // In a full journey planner, you'd use a routing API or Darwin's journey planning service
      const response = await fetch(`/api/darwin/departures?crs=${fromCRS}&numRows=10&filterCrs=${toCRS}&filterType=to`);
      const result = await response.json();
      
      if (result.success && result.data.departures.length > 0) {
        // Transform Darwin departures into journey results
        const journeys = result.data.departures.map((dep: any, index: number) => {
          // Calculate estimated duration (this would normally come from a journey planning service)
          const estimatedDuration = calculateEstimatedDuration(fromCRS, toCRS);
          const arrivalTime = calculateArrivalTime(dep.scheduledDeparture, estimatedDuration);
          
          return {
            id: index + 1,
            departureTime: dep.scheduledDeparture,
            arrivalTime: arrivalTime,
            duration: formatDuration(estimatedDuration),
            changes: 0, // Simplified - would need routing data for real changes
            operator: dep.operatorCode,
            price: generateEstimatedPrice(fromCRS, toCRS),
            platform: dep.platform || 'TBA',
            serviceId: dep.serviceId,
            status: dep.status,
            delayMinutes: dep.delayMinutes || 0
          };
        });
        
        setSearchResults(journeys);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Journey search failed:', error);
      alert('Failed to search for journeys. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const extractCRS = (stationString: string): string | null => {
    const match = stationString.match(/\(([A-Z]{3})\)/);
    return match ? match[1] : null;
  };
  
  const calculateEstimatedDuration = (fromCRS: string, toCRS: string): number => {
    // Simplified duration calculation - in reality this would use routing data
    const distances: { [key: string]: { [key: string]: number } } = {
      'KGX': { 'MAN': 150, 'BHM': 120, 'LDS': 140, 'EDB': 240, 'YOR': 120 },
      'MAN': { 'KGX': 150, 'BHM': 90, 'LDS': 60, 'LIV': 45 },
      'BHM': { 'KGX': 120, 'MAN': 90, 'LDS': 120, 'BRI': 60 },
      // Add more routes as needed
    };
    
    const duration = distances[fromCRS]?.[toCRS] || 120; // Default 2 hours
    return duration;
  };
  
  const calculateArrivalTime = (departureTime: string, durationMinutes: number): string => {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const depDate = new Date();
    depDate.setHours(hours, minutes, 0, 0);
    
    const arrivalDate = new Date(depDate.getTime() + durationMinutes * 60000);
    return arrivalDate.toTimeString().slice(0, 5);
  };
  
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };
  
  const generateEstimatedPrice = (fromCRS: string, toCRS: string): number => {
    // Simplified pricing - would normally come from a fares API
    const basePrices: { [key: string]: { [key: string]: number } } = {
      'KGX': { 'MAN': 45.50, 'BHM': 35.90, 'LDS': 42.00, 'EDB': 89.50, 'YOR': 38.50 },
      'MAN': { 'KGX': 45.50, 'BHM': 28.90, 'LDS': 22.50, 'LIV': 18.90 },
      'BHM': { 'KGX': 35.90, 'MAN': 28.90, 'LDS': 32.50, 'BRI': 24.90 },
    };
    
    return basePrices[fromCRS]?.[toCRS] || 29.90; // Default price
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="journey" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 mb-8">
          <h2 className="text-3xl font-bold text-black mb-8 text-center flex items-center justify-center gap-2">
            <MapPin size={28} className="text-blue-600" />
            Plan Your Journey
          </h2>

          {/* Station Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
            {/* From Station */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                <MapPin size={16} className="inline mr-2 text-blue-600" />
                From
              </label>
              <StationSearch
                placeholder="Enter departure station"
                value={fromStation}
                onSelect={(station) => handleStationSelect(station, 'from')}
                onClear={() => handleStationClear('from')}
              />
            </div>

            {/* Swap Button */}
            <div className="flex justify-center md:block">
              <button
                onClick={handleSwapStations}
                className="p-3 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 cursor-pointer flex items-center justify-center transition-colors shadow-sm"
              >
                <ArrowRight size={20} />
              </button>
            </div>

            {/* To Station */}
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                <NavigationIcon size={16} className="inline mr-2 text-blue-600" />
                To
              </label>
              <StationSearch
                placeholder="Enter destination station"
                value={toStation}
                onSelect={(station) => handleStationSelect(station, 'to')}
                onClear={() => handleStationClear('to')}
              />
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Popular Stations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              {popularStations.map(station => (
                <div key={station.code} className="flex flex-col gap-1">
                  <button
                    onClick={() => handleQuickSelect(station, 'from')}
                    className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-medium cursor-pointer transition-colors"
                  >
                    From {station.code}
                  </button>
                  <button
                    onClick={() => handleQuickSelect(station, 'to')}
                    className="p-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-medium cursor-pointer transition-colors"
                  >
                    To {station.code}
                  </button>
                  <div className="text-xs text-gray-500 text-center mt-1">{station.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Date/Time/Passengers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                <Calendar size={16} className="inline mr-2 text-blue-600" />
                Departure Date
              </label>
              <input
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white text-gray-900 text-base focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                <Clock size={16} className="inline mr-2 text-blue-600" />
                Departure Time
              </label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white text-gray-900 text-base focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                <Users size={16} className="inline mr-2 text-blue-600" />
                Passengers
              </label>
              <select
                value={passengers}
                onChange={(e) => setPassengers(parseInt(e.target.value))}
                className="w-full p-3 rounded-xl border-2 border-gray-300 bg-white text-gray-900 text-base focus:border-blue-500 focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Adult' : 'Adults'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Button */}
          <div className="text-center">
            <button
              onClick={handleSearch}
              disabled={!fromStation || !toStation || isSearching}
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white text-lg font-bold transition-colors ${
                (!fromStation || !toStation || isSearching) 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              }`}
            >
              <Search size={20} />
              {isSearching ? 'Searching...' : 'Find Trains'}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {isSearching && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 text-center">
            <div className="text-lg text-gray-900">🔍 Searching for trains...</div>
            <div className="text-sm text-gray-600 mt-2">
              Finding the best routes from {fromStation} to {toStation}
            </div>
          </div>
        )}

        {searchResults && !isSearching && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
            <h3 className="text-2xl font-bold text-black mb-4">
              Journey Options
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {fromStation} → {toStation} on {new Date(departureDate).toLocaleDateString()}
            </p>

            <div className="space-y-4">
              {searchResults.map((journey: any) => (
                <div key={journey.id} className="bg-blue-50 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center hover:bg-blue-100 transition-colors border border-blue-200">
                  {/* Times */}
                  <div className="text-center">
                    <div className="text-xl font-bold text-black">{journey.departureTime}</div>
                    <div className="text-xs text-gray-500">Depart</div>
                  </div>

                  {/* Journey Info */}
                  <div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-xl font-bold text-black">{journey.arrivalTime}</div>
                      <div className="text-sm text-gray-700">
                        {journey.duration} • {journey.changes === 0 ? 'Direct' : `${journey.changes} change${journey.changes > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {journey.operator} • Platform {journey.platform}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">
                      £{journey.price}
                    </div>
                    <div className="text-xs text-gray-500">per adult</div>
                  </div>

                  {/* Book Button */}
                  <div className="text-center">
                    <button className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors">
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
