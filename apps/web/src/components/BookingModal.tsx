'use client'

import { useState } from 'react'
import { X, User, CreditCard, MapPin, Train, Check } from 'lucide-react'
import { Button } from './Button'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  trainDetails: {
    operator: string
    trainNumber: string
    departure: string
    arrival: string
    from: string
    to: string
    price: number
    ticketType: string
  }
}

export function BookingModal({ isOpen, onClose, trainDetails }: BookingModalProps) {
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null)
  const [step, setStep] = useState<'seats' | 'payment' | 'confirmation'>('seats')

  if (!isOpen) return null

  const seats = [
    { id: 'A1', available: true, type: 'window' },
    { id: 'A2', available: true, type: 'aisle' },
    { id: 'B1', available: false, type: 'window' },
    { id: 'B2', available: true, type: 'aisle' },
    { id: 'C1', available: true, type: 'window' },
    { id: 'C2', available: true, type: 'aisle' },
    { id: 'D1', available: true, type: 'window' },
    { id: 'D2', available: false, type: 'aisle' },
  ]

  const handleSeatSelect = (seatId: string) => {
    setSelectedSeat(seatId)
  }

  const handleContinue = () => {
    if (step === 'seats') {
      setStep('payment')
    } else if (step === 'payment') {
      setStep('confirmation')
    }
  }

  const renderSeatSelection = () => (
    <div>
      <h3 className="mb-4 text-xl font-bold text-slate-900">Select Your Seat</h3>

      {/* Train Journey Summary */}
      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
              <Train className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                {trainDetails.operator} {trainDetails.trainNumber}
              </div>
              <div className="text-sm text-slate-600">
                {trainDetails.from} → {trainDetails.to}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">£{trainDetails.price.toFixed(2)}</div>
            <div className="text-sm text-slate-600">{trainDetails.ticketType}</div>
          </div>
        </div>
      </div>

      {/* Seat Map */}
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-medium text-slate-700">Coach A - Standard Class</h4>
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="grid max-w-sm grid-cols-4 gap-3">
            {seats.map((seat) => (
              <button
                key={seat.id}
                onClick={() => seat.available && handleSeatSelect(seat.id)}
                className={`flex h-12 items-center justify-center rounded-lg border-2 text-sm font-medium ${
                  seat.available
                    ? selectedSeat === seat.id
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                    : 'cursor-not-allowed border-slate-200 bg-slate-200 text-slate-400'
                } `}
                disabled={!seat.available}
              >
                {seat.id}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-slate-200 bg-white"></div>
              <span className="text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-blue-600"></div>
              <span className="text-slate-600">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-slate-200"></div>
              <span className="text-slate-600">Occupied</span>
            </div>
          </div>
        </div>
      </div>

      {selectedSeat && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600" />
            <span className="font-medium text-emerald-800">Seat {selectedSeat} selected</span>
          </div>
        </div>
      )}
    </div>
  )

  const renderPayment = () => (
    <div>
      <h3 className="mb-6 text-xl font-bold text-slate-900">Payment Details</h3>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Card Number</label>
          <input
            type="text"
            placeholder="1234 5678 9012 3456"
            className="w-full rounded-lg border border-slate-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Expiry Date</label>
            <input
              type="text"
              placeholder="MM/YY"
              className="w-full rounded-lg border border-slate-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">CVV</label>
            <input
              type="text"
              placeholder="123"
              className="w-full rounded-lg border border-slate-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Name on Card</label>
          <input
            type="text"
            placeholder="John Smith"
            className="w-full rounded-lg border border-slate-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 p-4">
        <h4 className="mb-2 font-medium text-slate-900">Booking Summary</h4>
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
            <span>£{(trainDetails.price + 4.0 + 1.5).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderConfirmation = () => (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <Check className="h-8 w-8 text-emerald-600" />
      </div>

      <h3 className="mb-2 text-2xl font-bold text-slate-900">Booking Confirmed!</h3>
      <p className="mb-6 text-slate-600">Your tickets have been sent to your email</p>

      <div className="rounded-lg bg-slate-50 p-6 text-left">
        <h4 className="mb-4 font-semibold text-slate-900">Your Journey</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-600">Train</span>
            <span className="font-medium">
              {trainDetails.operator} {trainDetails.trainNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Route</span>
            <span className="font-medium">
              {trainDetails.from} → {trainDetails.to}
            </span>
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
            <span className="font-medium">£{(trainDetails.price + 4.0 + 1.5).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold text-slate-900">
            {step === 'seats' && 'Book Your Journey'}
            {step === 'payment' && 'Payment'}
            {step === 'confirmation' && 'Confirmation'}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          {step === 'seats' && renderSeatSelection()}
          {step === 'payment' && renderPayment()}
          {step === 'confirmation' && renderConfirmation()}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-6">
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
  )
}
