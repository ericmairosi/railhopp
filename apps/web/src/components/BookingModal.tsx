'use client';

import { useState } from 'react';
import { X, User, CreditCard, MapPin, Train, Check } from 'lucide-react';
import { Button } from './Button';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainDetails: {
    operator: string;
    trainNumber: string;
    departure: string;
    arrival: string;
    from: string;
    to: string;
    price: number;
    ticketType: string;
  };
}

export function BookingModal({ isOpen, onClose, trainDetails }: BookingModalProps) {
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [step, setStep] = useState<'seats' | 'payment' | 'confirmation'>('seats');

  if (!isOpen) return null;

  const seats = [
    { id: 'A1', available: true, type: 'window' },
    { id: 'A2', available: true, type: 'aisle' },
    { id: 'B1', available: false, type: 'window' },
    { id: 'B2', available: true, type: 'aisle' },
    { id: 'C1', available: true, type: 'window' },
    { id: 'C2', available: true, type: 'aisle' },
    { id: 'D1', available: true, type: 'window' },
    { id: 'D2', available: false, type: 'aisle' },
  ];

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeat(seatId);
  };

  const handleContinue = () => {
    if (step === 'seats') {
      setStep('payment');
    } else if (step === 'payment') {
      setStep('confirmation');
    }
  };

  const renderSeatSelection = () => (
    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-4">Select Your Seat</h3>
      
      {/* Train Journey Summary */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Train className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">{trainDetails.operator} {trainDetails.trainNumber}</div>
              <div className="text-sm text-slate-600">{trainDetails.from} → {trainDetails.to}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg text-blue-600">£{trainDetails.price.toFixed(2)}</div>
            <div className="text-sm text-slate-600">{trainDetails.ticketType}</div>
          </div>
        </div>
      </div>

      {/* Seat Map */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Coach A - Standard Class</h4>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="grid grid-cols-4 gap-3 max-w-sm">
            {seats.map((seat) => (
              <button
                key={seat.id}
                onClick={() => seat.available && handleSeatSelect(seat.id)}
                className={`
                  h-12 rounded-lg border-2 flex items-center justify-center font-medium text-sm
                  ${seat.available 
                    ? selectedSeat === seat.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                    : 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed'
                  }
                `}
                disabled={!seat.available}
              >
                {seat.id}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-slate-200 rounded"></div>
              <span className="text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-slate-600">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-slate-200 rounded"></div>
              <span className="text-slate-600">Occupied</span>
            </div>
          </div>
        </div>
      </div>

      {selectedSeat && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-800 font-medium">Seat {selectedSeat} selected</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderPayment = () => (
    <div>
      <h3 className="text-xl font-bold text-slate-900 mb-6">Payment Details</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Card Number</label>
          <input 
            type="text" 
            placeholder="1234 5678 9012 3456"
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Expiry Date</label>
            <input 
              type="text" 
              placeholder="MM/YY"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">CVV</label>
            <input 
              type="text" 
              placeholder="123"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Name on Card</label>
          <input 
            type="text" 
            placeholder="John Smith"
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-slate-900 mb-2">Booking Summary</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Train Ticket ({trainDetails.ticketType})</span>
            <span>£{trainDetails.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Seat Reservation (Seat {selectedSeat})</span>
            <span>£4.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Booking Fee</span>
            <span>£1.50</span>
          </div>
          <hr className="my-2" />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>£{(trainDetails.price + 4.00 + 1.50).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Check className="w-8 h-8 text-emerald-600" />
      </div>
      
      <h3 className="text-2xl font-bold text-slate-900 mb-2">Booking Confirmed!</h3>
      <p className="text-slate-600 mb-6">Your tickets have been sent to your email</p>
      
      <div className="bg-slate-50 rounded-lg p-6 text-left">
        <h4 className="font-semibold text-slate-900 mb-4">Your Journey</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-600">Train</span>
            <span className="font-medium">{trainDetails.operator} {trainDetails.trainNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Route</span>
            <span className="font-medium">{trainDetails.from} → {trainDetails.to}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Departure</span>
            <span className="font-medium">{trainDetails.departure}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Seat</span>
            <span className="font-medium">{selectedSeat}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Total Paid</span>
            <span className="font-medium">£{(trainDetails.price + 4.00 + 1.50).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {step === 'seats' && 'Book Your Journey'}
            {step === 'payment' && 'Payment'}
            {step === 'confirmation' && 'Confirmation'}
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6">
          {step === 'seats' && renderSeatSelection()}
          {step === 'payment' && renderPayment()}
          {step === 'confirmation' && renderConfirmation()}
        </div>
        
        <div className="flex items-center justify-between p-6 border-t border-slate-200">
          {step !== 'confirmation' ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleContinue}
                disabled={step === 'seats' && !selectedSeat}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {step === 'seats' ? 'Continue to Payment' : 'Complete Booking'}
              </Button>
            </>
          ) : (
            <Button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
