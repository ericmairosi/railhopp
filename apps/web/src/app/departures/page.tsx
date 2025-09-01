'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import Navigation from '@/components/Navigation';
import StationSearch from '@/components/StationSearch';

interface Departure {
  serviceId: string;
  operator: string;
  operatorCode: string;
  trainNumber?: string;
  platform?: string;
  scheduledDeparture: string;
  estimatedDeparture?: string;
  destination: { name: string; crs: string; }[];
  origin: { name: string; crs: string; }[];
  status: string;
  delayMinutes?: number;
  isCancelled: boolean;
  cancelReason?: string;
  delayReason?: string;
  length?: number;
  formation?: string;
  serviceType: string;
}

interface StationBoard {
  stationName: string;
  stationCode: string;
  generatedAt: string;
  departures: Departure[];
  messages: {
    severity: 'info' | 'warning' | 'severe';
    message: string;
    category?: string;
  }[];
  platformsAvailable: boolean;
}

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

export default function DeparturesPage() {
  const [stationCode, setStationCode] = useState('KGX');
  const [stationSearchValue, setStationSearchValue] = useState('London Kings Cross (KGX)');
  const [stationBoard, setStationBoard] = useState<StationBoard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDepartures = async (crs: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/darwin/departures?crs=${crs}&numRows=15`);
      const result = await response.json();
      
      if (result.success) {
        setStationBoard(result.data);
        setLastUpdated(new Date());
      } else {
        setError(result.error?.message || 'Failed to fetch departures');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartures(stationCode);
  }, [stationCode]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchDepartures(stationCode);
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [stationCode, autoRefresh]);

  const getStatusColor = (departure: Departure) => {
    if (departure.isCancelled) return 'text-red-600';
    if (departure.delayMinutes && departure.delayMinutes > 0) return 'text-amber-600';
    return 'text-green-600';
  };

  const getStatusBg = (departure: Departure) => {
    if (departure.isCancelled) return 'bg-red-100';
    if (departure.delayMinutes && departure.delayMinutes > 0) return 'bg-amber-100';
    return 'bg-green-100';
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="departures" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Station Selection */}
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-2">
            <MapPin size={24} className="text-blue-600" />
            Select Station
          </h2>
          
          {/* Station Search */}
          <div className="mb-8">
            <StationSearch
              placeholder="Search for a station..."
              value={stationSearchValue}
              onSelect={(station) => {
                setStationCode(station.code);
                setStationSearchValue(`${station.name} (${station.code})`);
              }}
              onClear={() => {
                setStationSearchValue('');
              }}
            />
          </div>
          
          {/* Popular Station Buttons */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Popular Stations</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {popularStations.map(station => (
                <button
                  key={station.code}
                  onClick={() => {
                    setStationCode(station.code);
                    setStationSearchValue(`${station.name} (${station.code})`);
                  }}
                  className={`p-3 rounded-xl text-left text-sm transition-all duration-200 hover:scale-[1.02] ${
                    stationCode === station.code 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  <div className="font-bold">{station.code}</div>
                  <div className="text-xs opacity-80">{station.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Station Board */}
        {stationBoard && (
          <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-black">
                  {stationBoard.stationName} ({stationBoard.stationCode})
                </h3>
                <p className="text-sm text-gray-600">
                  Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  Auto refresh
                </label>
                <button
                  onClick={() => fetchDepartures(stationCode)}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors ${
                    loading ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Service Messages */}
            {stationBoard.messages.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                {stationBoard.messages.map((message, index) => (
                  <div key={index} style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    marginBottom: '0.5rem',
                    background: message.severity === 'severe' ? 'rgba(239, 68, 68, 0.1)' : 
                               message.severity === 'warning' ? 'rgba(251, 191, 36, 0.1)' : 
                               'rgba(59, 130, 246, 0.1)',
                    border: `1px solid ${message.severity === 'severe' ? '#ef4444' : 
                                        message.severity === 'warning' ? '#fbbf24' : '#3b82f6'}`,
                    fontSize: '0.875rem'
                  }}>
                    <strong style={{ textTransform: 'uppercase' }}>{message.severity}:</strong> {message.message}
                  </div>
                ))}
              </div>
            )}

            {/* Departures Table */}
            {loading && (
              <div className="text-center py-8 text-lg text-gray-700">
                <RefreshCw size={24} className="animate-spin inline mr-2" />
                Loading departures...
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                <AlertCircle size={24} className="inline mr-2 text-red-600" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {!loading && !error && stationBoard.departures.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No departures found for this station.
              </div>
            )}

            {!loading && !error && stationBoard.departures.length > 0 && (
              <div className="bg-blue-50 rounded-2xl overflow-hidden border border-blue-200">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-4 p-4 bg-blue-100 text-sm font-bold text-blue-900">
                  <div>TIME</div>
                  <div>DESTINATION</div>
                  <div>PLATFORM</div>
                  <div>OPERATOR</div>
                  <div>STATUS</div>
                  <div>DETAILS</div>
                </div>

                {/* Departures */}
                {stationBoard.departures.map((departure, index) => (
                  <div key={departure.serviceId} className={`grid grid-cols-6 gap-4 p-4 text-sm items-center text-gray-900 ${
                    index < stationBoard.departures.length - 1 ? 'border-b border-blue-200' : ''
                  }`}>
                    {/* Time */}
                    <div>
                      <div className="font-bold text-base text-black">
                        {departure.scheduledDeparture}
                      </div>
                      {departure.estimatedDeparture && departure.estimatedDeparture !== departure.scheduledDeparture && (
                        <div className="text-xs text-amber-600">
                          ({departure.estimatedDeparture})
                        </div>
                      )}
                    </div>

                    {/* Destination */}
                    <div>
                      <div className="font-bold text-black">
                        {departure.destination.map(dest => dest.name).join(', ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        via {departure.destination.map(dest => dest.crs).join(', ')}
                      </div>
                    </div>

                    {/* Platform */}
                    <div className="text-center">
                      {departure.platform ? (
                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                          {departure.platform}
                        </span>
                      ) : (
                        <span className="text-gray-500">TBA</span>
                      )}
                    </div>

                    {/* Operator */}
                    <div className="text-xs">
                      <div className="font-medium">{departure.operatorCode}</div>
                      {departure.trainNumber && (
                        <div className="text-gray-500">{departure.trainNumber}</div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        departure.isCancelled ? 'bg-red-100 text-red-600' :
                        departure.delayMinutes && departure.delayMinutes > 0 ? 'bg-amber-100 text-amber-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {departure.status}
                      </span>
                      {departure.delayMinutes && departure.delayMinutes > 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                          +{departure.delayMinutes}min
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="text-center">
                      <a 
                        href={`/service/${encodeURIComponent(departure.serviceId)}`} 
                        className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium transition-colors"
                      >
                        More
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
