export { Button, type ButtonProps } from './Button'
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  type CardProps,
} from './Card'
// DepartureBoard functionality consolidated into EnhancedDepartureBoard
export { default as EnhancedDepartureBoard } from './EnhancedDepartureBoard'
export { default as EnhancedJourneyPlanner } from './EnhancedJourneyPlanner'

// Keep the Departure interface for backward compatibility
export interface Departure {
  id: string
  destination: string
  scheduledTime: Date
  expectedTime?: Date
  platform: string
  operator: string
  status: 'onTime' | 'delayed' | 'cancelled' | 'replacement'
  delayMinutes: number
  carriageCount?: number
  amenities?: {
    wifi: boolean
    powerSockets: boolean
    catering: boolean
    quietCars: boolean
  }
}
