'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';

interface Station {
  code: string;
  name: string;
  group?: string;
}

interface StationSearchProps {
  placeholder?: string;
  value?: string;
  onSelect: (station: Station) => void;
  onClear?: () => void;
  disabled?: boolean;
}

// Comprehensive UK railway stations database
const ukStations: Station[] = [
  // Major London terminals
  { code: 'PAD', name: 'London Paddington', group: 'London' },
  { code: 'KGX', name: 'London Kings Cross', group: 'London' },
  { code: 'EUS', name: 'London Euston', group: 'London' },
  { code: 'STP', name: 'London St Pancras International', group: 'London' },
  { code: 'VIC', name: 'London Victoria', group: 'London' },
  { code: 'WAT', name: 'London Waterloo', group: 'London' },
  { code: 'CHX', name: 'London Charing Cross', group: 'London' },
  { code: 'LST', name: 'London Liverpool Street', group: 'London' },
  { code: 'MYB', name: 'London Marylebone', group: 'London' },
  { code: 'LBG', name: 'London Bridge', group: 'London' },
  
  // Major UK cities
  { code: 'MAN', name: 'Manchester Piccadilly', group: 'North West' },
  { code: 'LIV', name: 'Liverpool Lime Street', group: 'North West' },
  { code: 'BHM', name: 'Birmingham New Street', group: 'West Midlands' },
  { code: 'LDS', name: 'Leeds', group: 'Yorkshire' },
  { code: 'EDB', name: 'Edinburgh Waverley', group: 'Scotland' },
  { code: 'GLC', name: 'Glasgow Central', group: 'Scotland' },
  { code: 'GLQ', name: 'Glasgow Queen Street', group: 'Scotland' },
  { code: 'NCL', name: 'Newcastle Central', group: 'North East' },
  { code: 'YOR', name: 'York', group: 'Yorkshire' },
  { code: 'SHF', name: 'Sheffield', group: 'Yorkshire' },
  { code: 'NTG', name: 'Nottingham', group: 'East Midlands' },
  { code: 'DRB', name: 'Derby', group: 'East Midlands' },
  { code: 'LEI', name: 'Leicester', group: 'East Midlands' },
  
  // South West
  { code: 'BRI', name: 'Bristol Temple Meads', group: 'South West' },
  { code: 'BTH', name: 'Bath Spa', group: 'South West' },
  { code: 'EXC', name: 'Exeter Central', group: 'South West' },
  { code: 'EXD', name: 'Exeter St Davids', group: 'South West' },
  { code: 'PLY', name: 'Plymouth', group: 'South West' },
  { code: 'TRU', name: 'Truro', group: 'South West' },
  { code: 'PNZ', name: 'Penzance', group: 'South West' },
  
  // South East
  { code: 'BTN', name: 'Brighton', group: 'South East' },
  { code: 'DOV', name: 'Dover Priory', group: 'South East' },
  { code: 'CTK', name: 'Canterbury East', group: 'South East' },
  { code: 'ASH', name: 'Ashford International', group: 'South East' },
  { code: 'MHS', name: 'Margate', group: 'South East' },
  { code: 'RDG', name: 'Reading', group: 'South East' },
  { code: 'SOU', name: 'Southampton Central', group: 'South East' },
  { code: 'PMH', name: 'Portsmouth Harbour', group: 'South East' },
  
  // Wales
  { code: 'CDF', name: 'Cardiff Central', group: 'Wales' },
  { code: 'SWA', name: 'Swansea', group: 'Wales' },
  { code: 'NWP', name: 'Newport (South Wales)', group: 'Wales' },
  { code: 'WRX', name: 'Wrexham General', group: 'Wales' },
  { code: 'BAN', name: 'Bangor (Gwynedd)', group: 'Wales' },
  
  // North West
  { code: 'PRE', name: 'Preston', group: 'North West' },
  { code: 'LAN', name: 'Lancaster', group: 'North West' },
  { code: 'CAR', name: 'Carlisle', group: 'North West' },
  { code: 'BLK', name: 'Blackpool North', group: 'North West' },
  
  // Yorkshire
  { code: 'HUD', name: 'Huddersfield', group: 'Yorkshire' },
  { code: 'BFD', name: 'Bradford Interchange', group: 'Yorkshire' },
  { code: 'HUL', name: 'Hull', group: 'Yorkshire' },
  { code: 'SCU', name: 'Scunthorpe', group: 'Yorkshire' },
  
  // East of England
  { code: 'CAM', name: 'Cambridge', group: 'East of England' },
  { code: 'NRW', name: 'Norwich', group: 'East of England' },
  { code: 'IPS', name: 'Ipswich', group: 'East of England' },
  { code: 'COL', name: 'Colchester', group: 'East of England' },
  { code: 'PET', name: 'Peterborough', group: 'East of England' },
  
  // Scotland
  { code: 'ABD', name: 'Aberdeen', group: 'Scotland' },
  { code: 'DND', name: 'Dundee', group: 'Scotland' },
  { code: 'STG', name: 'Stirling', group: 'Scotland' },
  { code: 'PER', name: 'Perth', group: 'Scotland' },
  { code: 'INV', name: 'Inverness', group: 'Scotland' },
  
  // More regional stations
  { code: 'OXF', name: 'Oxford', group: 'South East' },
  { code: 'CVT', name: 'Coventry', group: 'West Midlands' },
  { code: 'WOL', name: 'Wolverhampton', group: 'West Midlands' },
  { code: 'STA', name: 'Stafford', group: 'West Midlands' },
  { code: 'CHE', name: 'Chester', group: 'North West' },
  { code: 'SHR', name: 'Shrewsbury', group: 'West Midlands' },
  
  // Additional major stations
  { code: 'CRW', name: 'Crewe', group: 'North West' },
  { code: 'DUR', name: 'Durham', group: 'North East' },
  { code: 'DFR', name: 'Darlington', group: 'North East' },
  { code: 'MBR', name: 'Middlesbrough', group: 'North East' },
  { code: 'SCR', name: 'Scarborough', group: 'Yorkshire' },
  { code: 'HRG', name: 'Harrogate', group: 'Yorkshire' },
  { code: 'WAK', name: 'Wakefield Westgate', group: 'Yorkshire' },
  { code: 'DFD', name: 'Doncaster', group: 'Yorkshire' },
  { code: 'RTF', name: 'Retford', group: 'East Midlands' },
  { code: 'NEW', name: 'Newark North Gate', group: 'East Midlands' },
  { code: 'GRT', name: 'Grantham', group: 'East Midlands' },
  { code: 'STE', name: 'Stevenage', group: 'East of England' },
  { code: 'HHT', name: 'Hitchin', group: 'East of England' },
  { code: 'LTN', name: 'Luton Airport Parkway', group: 'East of England' },
  { code: 'MKC', name: 'Milton Keynes Central', group: 'South East' },
  { code: 'WAT', name: 'Watford Junction', group: 'South East' },
  { code: 'HAR', name: 'Harrow & Wealdstone', group: 'London' },
  { code: 'UXB', name: 'Uxbridge', group: 'London' },
  { code: 'HEA', name: 'Heathrow Airport', group: 'London' },
  { code: 'GTW', name: 'Gatwick Airport', group: 'South East' },
  { code: 'STN', name: 'Stansted Airport', group: 'East of England' },
  { code: 'LTN', name: 'Luton Airport Parkway', group: 'East of England' },
  { code: 'EDG', name: 'East Didsbury', group: 'North West' },
  { code: 'MAC', name: 'Macclesfield', group: 'North West' },
  { code: 'STK', name: 'Stockport', group: 'North West' },
  { code: 'WGN', name: 'Wigan North Western', group: 'North West' },
  { code: 'BOL', name: 'Bolton', group: 'North West' },
  { code: 'BUR', name: 'Burnley Manchester Road', group: 'North West' },
  { code: 'BLB', name: 'Blackburn', group: 'North West' },
  { code: 'PRN', name: 'Preston', group: 'North West' },
  { code: 'OXN', name: 'Oxenholme Lake District', group: 'North West' },
  { code: 'PEN', name: 'Penrith North Lakes', group: 'North West' },
  { code: 'LOC', name: 'Lockerbie', group: 'Scotland' },
  { code: 'DUM', name: 'Dumfries', group: 'Scotland' },
  { code: 'KLM', name: 'Kilmarnock', group: 'Scotland' },
  { code: 'AYR', name: 'Ayr', group: 'Scotland' },
  { code: 'FAL', name: 'Falkirk High', group: 'Scotland' },
  { code: 'KIR', name: 'Kirkcaldy', group: 'Scotland' },
  { code: 'LEU', name: 'Leuchars', group: 'Scotland' },
  { code: 'ARB', name: 'Arbroath', group: 'Scotland' },
  { code: 'MON', name: 'Montrose', group: 'Scotland' },
  { code: 'STN', name: 'Stonehaven', group: 'Scotland' },
];

export default function StationSearch({ 
  placeholder = "Enter station name or code", 
  value = "", 
  onSelect, 
  onClear,
  disabled = false 
}: StationSearchProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<Station[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const filterStations = (term: string): Station[] => {
    if (!term.trim()) return [];
    
    const normalizedTerm = term.toLowerCase().trim();
    
    return ukStations
      .filter(station => 
        station.name.toLowerCase().includes(normalizedTerm) ||
        station.code.toLowerCase().includes(normalizedTerm) ||
        (station.group && station.group.toLowerCase().includes(normalizedTerm))
      )
      .slice(0, 10); // Limit to 10 results for performance
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    const filtered = filterStations(newValue);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectStation(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectStation = (station: Station) => {
    setSearchTerm(`${station.name} (${station.code})`);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onSelect(station);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (searchTerm) {
      const filtered = filterStations(searchTerm);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 300);
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          left: '1rem',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          zIndex: 1
        }}>
          <Search size={16} color="#94a3b8" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            padding: '0.75rem 3rem 0.75rem 2.5rem',
            borderRadius: '0.5rem',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            background: disabled ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)',
            color: disabled ? '#6b7280' : 'white',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s',
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            if (!disabled) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }
          }}
        />
        
        {searchTerm && !disabled && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'white',
          borderRadius: '0.5rem',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          marginTop: '0.25rem',
          maxHeight: '300px',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          {suggestions.map((station, index) => (
            <div
              key={`${station.code}-${station.name}`}
              ref={el => { suggestionRefs.current[index] = el; }}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectStation(station);
              }}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid rgba(0, 0, 0, 0.1)' : 'none',
                background: selectedIndex === index ? '#f3f4f6' : 'white',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MapPin size={14} color="#6b7280" />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: selectedIndex === index ? '#dc2626' : '#1f2937',
                    fontSize: '0.875rem'
                  }}>
                    {station.name}
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280',
                    marginTop: '0.125rem'
                  }}>
                    {station.code} • {station.group}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
