import { Train, Clock, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { cn, formatTime, getStatusColor } from '@/lib/utils';

export interface Departure {
  id: string;
  destination: string;
  scheduledTime: Date;
  expectedTime?: Date;
  platform: string;
  operator: string;
  status: 'onTime' | 'delayed' | 'cancelled' | 'replacement';
  delayMinutes: number;
  carriageCount?: number;
  amenities?: {
    wifi: boolean;
    powerSockets: boolean;
    catering: boolean;
    quietCars: boolean;
  };
}

interface DepartureBoardProps {
  departures: Departure[];
  stationName: string;
  className?: string;
  showAmenities?: boolean;
}

const StatusIcon = ({ status }: { status: Departure['status'] }) => {
  const icons = {
    onTime: <CheckCircle className="w-4 h-4 text-railway-status-onTime" />,
    delayed: <Clock className="w-4 h-4 text-railway-status-delayed" />,
    cancelled: <AlertCircle className="w-4 h-4 text-railway-status-cancelled" />,
    replacement: <Zap className="w-4 h-4 text-railway-status-replacement" />,
  };
  return icons[status];
};

const AmenityIndicator = ({ amenities }: { amenities?: Departure['amenities'] }) => {
  if (!amenities) return null;
  
  return (
    <div className="flex items-center gap-1 text-xs text-slate-500">
      {amenities.wifi && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">WiFi</span>}
      {amenities.powerSockets && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Power</span>}
      {amenities.catering && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">Café</span>}
      {amenities.quietCars && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Quiet</span>}
    </div>
  );
};

export function DepartureBoard({ departures, stationName, className, showAmenities = true }: DepartureBoardProps) {
  return (
    <div className={cn('bg-blue-50 text-railway-terminal-green border-2 border-blue-300 rounded-lg overflow-hidden shadow-terminal', className)}>
      {/* Header */}
      <div className="bg-blue-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Train className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold font-mono tracking-wider uppercase">{stationName}</h2>
              <p className="text-sm opacity-80">LIVE DEPARTURES</p>
            </div>
          </div>
          <div className="text-right font-mono text-sm">
            <div className="text-lg font-bold">{formatTime(new Date())}</div>
            <div className="opacity-80">LAST UPDATED</div>
          </div>
        </div>
      </div>
      
      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-blue-100 text-blue-900 font-mono text-sm uppercase tracking-wider border-b border-blue-300">
        <div className="col-span-2">Time</div>
        <div className="col-span-4">Destination</div>
        <div className="col-span-2">Platform</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Operator</div>
      </div>
      
      {/* Departures */}
      <div className="max-h-96 overflow-y-auto">
        {departures.map((departure, index) => (
          <div
            key={departure.id}
            className={cn(
              'grid grid-cols-12 gap-4 px-6 py-4 border-b border-blue-200 transition-colors hover:bg-blue-100',
              departure.status === 'cancelled' && 'opacity-60',
              index % 2 === 0 && 'bg-white/50'
            )}
          >
            {/* Time */}
            <div className="col-span-2 font-mono text-lg font-bold">
              <div className="text-blue-900">
                {formatTime(departure.expectedTime || departure.scheduledTime)}
              </div>
              {departure.expectedTime && departure.delayMinutes > 0 && (
                <div className="text-railway-status-delayed text-xs line-through">
                  {formatTime(departure.scheduledTime)}
                </div>
              )}
            </div>
            
            {/* Destination */}
            <div className="col-span-4">
              <div className="font-bold text-railway-terminal-green uppercase tracking-wide">
                {departure.destination}
              </div>
              {showAmenities && departure.amenities && (
                <AmenityIndicator amenities={departure.amenities} />
              )}
              {departure.carriageCount && (
                <div className="text-xs text-railway-terminal-amber mt-1">
                  {departure.carriageCount} car train
                </div>
              )}
            </div>
            
            {/* Platform */}
            <div className="col-span-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-railway-terminal-green text-railway-terminal-background font-bold text-lg rounded">
                {departure.platform}
              </div>
            </div>
            
            {/* Status */}
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <StatusIcon status={departure.status} />
                <span className={cn('font-mono text-sm uppercase tracking-wide', getStatusColor(departure.status))}>
                  {departure.status === 'onTime' && 'ON TIME'}
                  {departure.status === 'delayed' && `${departure.delayMinutes}M LATE`}
                  {departure.status === 'cancelled' && 'CANCELLED'}
                  {departure.status === 'replacement' && 'BUS SERVICE'}
                </span>
              </div>
            </div>
            
            {/* Operator */}
            <div className="col-span-2 text-railway-terminal-amber font-mono text-sm uppercase tracking-wide">
              {departure.operator}
            </div>
          </div>
        ))}
      </div>
      
      {departures.length === 0 && (
        <div className="px-6 py-12 text-center">
          <Train className="w-16 h-16 mx-auto mb-4 text-railway-terminal-amber opacity-50" />
          <p className="font-mono text-railway-terminal-amber uppercase tracking-wide">
            No departures scheduled
          </p>
        </div>
      )}
      
      {/* Footer */}
      <div className="px-6 py-3 bg-slate-900 border-t border-railway-terminal-green">
        <div className="flex items-center justify-between text-xs text-railway-terminal-amber font-mono">
          <div>LIVE DATA FROM NATIONAL RAIL</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-railway-terminal-green rounded-full animate-pulse"></div>
            UPDATES EVERY 30 SECONDS
          </div>
        </div>
      </div>
    </div>
  );
}
