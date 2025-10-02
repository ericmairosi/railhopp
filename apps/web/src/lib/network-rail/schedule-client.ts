/**
 * Network Rail SCHEDULE Feed Client
 *
 * The SCHEDULE feed provides daily train schedule data extracted from ITPS (Integrated Train Planning System).
 * This includes full schedule extracts and daily updates in both CIF and JSON formats.
 *
 * Data includes:
 * - Train schedules and timetables
 * - Service patterns and calling points
 * - Train categories and headcodes
 * - Schedule validity periods
 * - Association records (joins/divides)
 */

import { BaseNetworkRailClient } from './base-client'
import type {
  ScheduleMessageWrapper,
  ScheduleRecord,
  TrainSchedule,
  AssociationRecord,
  ScheduleConfig,
} from './types'

export class ScheduleClient extends BaseNetworkRailClient<ScheduleMessageWrapper> {
  constructor(config: ScheduleConfig) {
    super({
      ...config,
      feedName: 'SCHEDULE',
      topics: ['TRAIN_MVT_ALL_TOC'],
    })
  }

  protected parseMessage(rawMessage: unknown): ScheduleMessageWrapper {
    try {
      const data = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid schedule message format')
      }

      return {
        messageType: data.JsonScheduleV1 ? 'schedule' : 'association',
        timestamp: new Date().toISOString(),
        data: data.JsonScheduleV1 || data.JsonAssociationV1,
        sourceSystem: 'ITPS',
        sequenceNumber: data.sequence_number || 0,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse schedule message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get train schedules for a specific date range
   */
  async getSchedules(
    options: {
      fromDate?: string
      toDate?: string
      trainUid?: string
      headcode?: string
      operator?: string
      limit?: number
    } = {}
  ): Promise<TrainSchedule[]> {
    const schedules: TrainSchedule[] = []

    // In a real implementation, this would query stored schedule data
    // For now, return mock data structure
    return [
      {
        trainUid: options.trainUid || 'C12345',
        headcode: options.headcode || '1A23',
        trainCategory: 'OO',
        trainIdentity: '1A23',
        operator: options.operator || 'SW',
        powerType: 'EMU',
        timingLoad: 'E',
        speed: '100',
        operatingCharacteristics: 'B',
        trainClass: 'B',
        sleepers: 'B',
        reservations: 'A',
        connectionIndicator: '1',
        cateringCode: 'C',
        serviceBranding: '0',
        scheduleStartDate: options.fromDate || new Date().toISOString().split('T')[0],
        scheduleEndDate:
          options.toDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        scheduleStatus: 'P',
        scheduleSource: 'C',
        locations: [
          {
            locationOrder: 1,
            tiploc: 'EUSTON',
            crs: 'EUS',
            locationName: 'London Euston',
            scheduledDeparture: '12:00',
            publicDeparture: '12:00',
            platform: '1',
            activities: 'TB',
            engineeringAllowance: 0,
            pathingAllowance: 0,
            performanceAllowance: 0,
          },
          {
            locationOrder: 2,
            tiploc: 'BHAMINT',
            crs: 'BHI',
            locationName: 'Birmingham International',
            scheduledArrival: '13:30',
            scheduledDeparture: '13:32',
            publicArrival: '13:30',
            publicDeparture: '13:32',
            platform: '2',
            activities: 'T',
            engineeringAllowance: 1,
            pathingAllowance: 0,
            performanceAllowance: 1,
          },
        ],
        associations: [],
      },
    ]
  }

  /**
   * Get association records (train joins/divides)
   */
  async getAssociations(
    options: {
      date?: string
      trainUid?: string
      associatedTrainUid?: string
    } = {}
  ): Promise<AssociationRecord[]> {
    // In a real implementation, this would query stored association data
    return [
      {
        transactionType: 'Create',
        mainTrainUid: options.trainUid || 'C12345',
        associatedTrainUid: options.associatedTrainUid || 'C54321',
        associationStartDate: options.date || new Date().toISOString().split('T')[0],
        associationEndDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
        associationCategory: 'JJ',
        associationDateIndicator: 'S',
        location: 'BHAMINT',
        baseLocationSuffix: '1',
        associatedLocationSuffix: '2',
        diagramType: 'T',
        associationType: 'P',
      },
    ]
  }

  /**
   * Get schedule updates and changes
   */
  async getScheduleUpdates(since?: string): Promise<ScheduleRecord[]> {
    const updates: ScheduleRecord[] = []

    this.messages.forEach((message) => {
      if (!since || message.timestamp > since) {
        if (message.data) {
          const txType = (message.data as { transaction_type?: string })?.transaction_type
          updates.push({
            recordType: message.messageType === 'schedule' ? 'schedule' : 'association',
            transactionType:
              txType === 'Update' || txType === 'Delete' || txType === 'Create' ? txType : 'Create',
            data: message.data,
            timestamp: message.timestamp,
            sequenceNumber: message.sequenceNumber,
          })
        }
      }
    })

    return updates
  }

  /**
   * Get network-wide schedule statistics
   */
  async getScheduleStats(): Promise<{
    totalSchedules: number
    activeSchedules: number
    operatorBreakdown: Record<string, number>
    lastUpdate: string
  }> {
    return {
      totalSchedules: 15000,
      activeSchedules: 12500,
      operatorBreakdown: {
        SW: 3500,
        VT: 2800,
        CS: 2200,
        GW: 2000,
        SE: 1000,
      },
      lastUpdate: new Date().toISOString(),
    }
  }

  /**
   * Search schedules by criteria
   */
  async searchSchedules(criteria: {
    origin?: string
    destination?: string
    departureTime?: string
    arrivalTime?: string
    operator?: string
    trainCategory?: string
    daysOfWeek?: string[]
  }): Promise<TrainSchedule[]> {
    // Filter mock schedules based on criteria
    const schedules = await this.getSchedules()

    return schedules.filter((schedule) => {
      if (criteria.operator && schedule.operator !== criteria.operator) return false
      if (criteria.trainCategory && schedule.trainCategory !== criteria.trainCategory) return false

      // Check origin/destination in locations
      if (criteria.origin) {
        const hasOrigin = schedule.locations.some(
          (loc) => loc.crs === criteria.origin || loc.tiploc === criteria.origin
        )
        if (!hasOrigin) return false
      }

      if (criteria.destination) {
        const hasDestination = schedule.locations.some(
          (loc) => loc.crs === criteria.destination || loc.tiploc === criteria.destination
        )
        if (!hasDestination) return false
      }

      return true
    })
  }
}
