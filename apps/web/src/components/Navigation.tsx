'use client';

import { useState } from 'react';
import { Train, Menu, X, Home, Search, Clock, Star } from 'lucide-react';

interface NavigationProps {
  currentPage?: 'home' | 'journey' | 'departures' | 'service' | 'other';
}

export default function Navigation({ currentPage = 'other' }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', href: '/modern', icon: Home },
    { id: 'journey', label: 'Journey Planner', href: '/journey', icon: Search },
    { id: 'departures', label: 'Live Departures', href: '/departures', icon: Clock },
  ];

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="bg-white/95 backdrop-blur-xl border-b border-white/20 shadow-soft sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/modern" className="flex items-center gap-3 text-decoration-none hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-railway-navy-600 rounded-xl flex items-center justify-center shadow-glow">
              <Train size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black leading-tight">
                RAILHOPP
              </h1>
              <div>
                <span className="text-xs text-gray-700 font-medium">Premium Rail Experience</span>
              </div>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <a 
                  key={item.id}
                  href={item.href} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-blue-100 text-blue-800 hover:text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden flex items-center justify-center p-2 rounded-lg bg-secondary-100 hover:bg-secondary-200 text-secondary-700 transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl rounded-2xl mt-4 p-4 shadow-premium border border-white/40">
            <nav className="grid gap-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <a 
                    key={item.id}
                    href={item.href} 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-floating' 
                        : 'bg-blue-100 text-blue-800 hover:text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </a>
                );
              })}
            </nav>
          </div>
        )}
      </div>


    </header>
  );
}
