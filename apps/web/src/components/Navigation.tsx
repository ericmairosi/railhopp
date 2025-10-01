'use client'

import { useState } from 'react'
import { Train, Menu, X, Home, Search, Clock, Star, Activity } from 'lucide-react'

interface NavigationProps {
  currentPage?: 'home' | 'journey' | 'departures' | 'service' | 'dashboard' | 'other'
}

export default function Navigation({ currentPage = 'other' }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { id: 'home', label: 'Home', href: '/modern', icon: Home },
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: Activity },
    { id: 'journey', label: 'Journey Planner', href: '/journey', icon: Search },
    { id: 'departures', label: 'Live Departures', href: '/departures', icon: Clock },
  ]

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <header className="shadow-soft sticky top-0 z-50 w-full border-b border-white/20 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a
            href="/modern"
            className="text-decoration-none flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="from-primary-500 to-railway-navy-600 shadow-glow flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r">
              <Train size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight text-black">RAILHOPP</h1>
              <div>
                <span className="text-xs font-medium text-gray-700">Premium Rail Experience</span>
              </div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id

              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-[1.02] ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-700'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </a>
              )
            })}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="bg-secondary-100 hover:bg-secondary-200 text-secondary-700 flex items-center justify-center rounded-lg p-2 transition-colors md:hidden"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="shadow-premium mt-4 rounded-2xl border border-white/40 bg-white/95 p-4 backdrop-blur-xl md:hidden">
            <nav className="grid gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = currentPage === item.id

                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'from-primary-500 to-primary-600 shadow-floating bg-gradient-to-r text-white'
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-700'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </a>
                )
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
