'use client';

import { useState } from 'react';
import { Train, Search, MapPin, Clock, Users, Zap, ArrowRight, Star, Calendar, Navigation2, Award, Shield, Sparkles } from 'lucide-react';
import Navigation from '@/components/Navigation';
import StationSearch from '@/components/StationSearch';


export default function ModernPage() {
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [fromStationData, setFromStationData] = useState<any>(null);
  const [toStationData, setToStationData] = useState<any>(null);
  
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
  
  const handleSearch = () => {
    if (fromStationData && toStationData) {
      const searchParams = new URLSearchParams({
        from: fromStationData.code,
        to: toStationData.code,
        fromName: fromStationData.name,
        toName: toStationData.name
      });
      window.location.href = `/journey?${searchParams.toString()}`;
    } else {
      window.location.href = '/journey';
    }
  };
  
  const todaysSchedule = [
    {
      from: 'KGX',
      fromName: 'Kings Cross',
      to: 'MAN', 
      toName: 'Manchester Piccadilly',
      departure: '19:15',
      arrival: '21:45',
      status: 'On Time',
      price: '£45.50',
      crowdLevel: 'Almost Empty',
      delay: 0,
      platform: '9'
    },
    {
      from: 'KGX',
      fromName: 'Kings Cross', 
      to: 'EDI',
      toName: 'Edinburgh Waverley',
      departure: '19:30',
      arrival: '23:45', 
      status: 'Usually Crowded',
      price: '£67.20',
      crowdLevel: 'Crowded',
      delay: 5,
      platform: '4'
    },
    {
      from: 'KGX',
      fromName: 'Kings Cross',
      to: 'YOR', 
      toName: 'York',
      departure: '20:15',
      arrival: '22:20',
      status: 'On Time',
      price: '£38.90',
      crowdLevel: 'Moderate',
      delay: 0,
      platform: '7'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="home" />

      <main className="px-4 sm:px-6 lg:px-8 py-12 max-w-7xl mx-auto">
        {/* Premium Hero Section - Heights Style */}
        <div className="text-center mb-16 bg-gradient-to-b from-slate-50 to-white py-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
          
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black mb-6 leading-tight max-w-4xl mx-auto">
            Everything you need,<br />nothing you don't
          </h1>
          <p className="text-xl text-gray-700 mb-12 max-w-2xl mx-auto leading-relaxed">
            Feel your best with science-backed rail journeys for your brain, body and gut.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button className="bg-black text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg">
              SHOP ALL →
            </button>
            <button className="border-2 border-gray-400 text-black px-8 py-4 rounded-2xl font-semibold text-lg hover:border-gray-500 transition-colors">
              BUNDLE & SAVE →
            </button>
          </div>
        </div>


        {/* Heights-Style Product Showcase - Train Product Cards */}
        <div className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Large Product Image */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-12 aspect-square flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-black rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-xl">
                    <Train className="w-16 h-16 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-2">HYDRATE+</h3>
                  <p className="text-gray-700">Premium Rail Experience</p>
                </div>
              </div>
            </div>
            
            {/* Right Side - Product Info */}
            <div>
              
              <h2 className="text-3xl lg:text-4xl font-bold text-black mb-6 leading-tight">
                Everything you need,<br />nothing you don't
              </h2>
              
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                Feel your best with science-backed rail journeys for your brain, body and gut.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-800">Real-time journey updates</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-800">Premium comfort seating</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-gray-800">Unmatched reliability</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-black text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-gray-800 transition-colors shadow-lg">
                  SHOP ALL →
                </button>
                <button className="border-2 border-gray-400 text-black px-8 py-4 rounded-2xl font-semibold text-lg hover:border-gray-500 transition-colors">
                  BUNDLE & SAVE →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Mobile Only */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 shadow-lg">
          <div className="flex justify-around max-w-md mx-auto">
            <button className="flex flex-col items-center gap-1 p-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <Train className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-blue-600">Home</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <Calendar className="w-6 h-6 text-slate-400" />
              <span className="text-xs text-slate-500">Schedule</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <Navigation2 className="w-6 h-6 text-slate-400" />
              <span className="text-xs text-slate-500">Routes</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-2">
              <Users className="w-6 h-6 text-slate-400" />
              <span className="text-xs text-slate-500">Account</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
