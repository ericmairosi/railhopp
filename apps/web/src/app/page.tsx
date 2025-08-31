import { Metadata } from 'next'
import { Train, Search, Clock, MapPin, Zap } from 'lucide-react'
import { generateOrganizationStructuredData, generateWebApplicationStructuredData } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: 'Live UK Train Times & Real-time Departures',
  description: 'Get real-time UK train times, live departures, arrivals and delays. Plan your journey with up-to-the-minute information from National Rail.',
  openGraph: {
    title: 'Railhopp - Live UK Train Times & Journey Planning',
    description: 'Real-time UK train departures, arrivals, and delays. Plan your journey with live updates from National Rail.',
  },
}

export default function Home() {
  const organizationData = generateOrganizationStructuredData()
  const webAppData = generateWebApplicationStructuredData()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppData) }}
      />
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Train className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Railhopp</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="/stations" className="text-gray-600 hover:text-blue-600 transition-colors">Stations</a>
              <a href="/journey-planner" className="text-gray-600 hover:text-blue-600 transition-colors">Journey Planner</a>
              <a href="/disruptions" className="text-gray-600 hover:text-blue-600 transition-colors">Disruptions</a>
              <a href="/map" className="text-gray-600 hover:text-blue-600 transition-colors">Live Map</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Live UK Train Times
            <span className="block text-blue-600">Always Up-to-Date</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Get real-time departures, arrivals, and delays from over 2,500 UK railway stations. 
            Plan your journey with confidence using live data from National Rail.
          </p>
        </div>

        {/* Quick Station Search */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Find Live Departures</h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-6 w-6" />
              <input
                type="text"
                placeholder="Search for a station (e.g., London King's Cross, Manchester, Birmingham)"
                className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="text-sm text-gray-500">Popular:</span>
              {['London King\'s Cross', 'Manchester Piccadilly', 'Birmingham New Street', 'Leeds', 'Edinburgh'].map((station) => (
                <button key={station} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  {station}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-8 w-8 text-blue-600" />
              <h3 className="text-xl font-semibold">Real-time Updates</h3>
            </div>
            <p className="text-gray-600">
              Live departure and arrival times updated every 30 seconds from National Rail data feeds.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="h-8 w-8 text-green-600" />
              <h3 className="text-xl font-semibold">All UK Stations</h3>
            </div>
            <p className="text-gray-600">
              Coverage of over 2,500 railway stations across England, Scotland, and Wales.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="h-8 w-8 text-yellow-600" />
              <h3 className="text-xl font-semibold">Lightning Fast</h3>
            </div>
            <p className="text-gray-600">
              Optimized for speed with advanced caching. Get your train times in under 2 seconds.
            </p>
          </div>
        </div>

        {/* Current Disruptions Preview */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Current Service Updates</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium text-amber-800">Engineering Works - West Coast Main Line</h4>
                <p className="text-amber-700 text-sm">Reduced services between London Euston and Birmingham New Street this weekend.</p>
                <a href="/disruptions" className="text-amber-600 hover:text-amber-800 text-sm font-medium">View details →</a>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-medium text-green-800">Good Service - Most Routes</h4>
                <p className="text-green-700 text-sm">Services running normally on most routes across the UK rail network.</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <a href="/disruptions" className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              View All Service Updates
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Train className="h-6 w-6" />
                <span className="text-xl font-bold">Railhopp</span>
              </div>
              <p className="text-gray-400 text-sm">
                Real-time UK train information and journey planning made simple.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/stations" className="hover:text-white transition-colors">All Stations</a></li>
                <li><a href="/journey-planner" className="hover:text-white transition-colors">Plan Journey</a></li>
                <li><a href="/disruptions" className="hover:text-white transition-colors">Service Updates</a></li>
                <li><a href="/map" className="hover:text-white transition-colors">Live Map</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="/api" className="hover:text-white transition-colors">API Documentation</a></li>
                <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Data Sources</h4>
              <p className="text-xs text-gray-400">
                Powered by National Rail Enquiries and Network Rail open data feeds. 
                Train times are provided in real-time and are subject to change.
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Railhopp. All rights reserved. Data provided by National Rail Enquiries.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
