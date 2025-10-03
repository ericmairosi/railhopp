/**
 * Network Rail TPS (Train Planning System) Feed Client
 *
 * The TPS feed provides detailed network model information from the Integrated Train Planning System.
 * This includes timing point data, route sections, and network topology information.
 *
 * Data includes:
 * - Timing Point and Location data (TIPLOC)
 * - Route sections and timing information
 * - Network topology and connections
 * - Mileages and geographical references
 * - Signal box and control area information
 */

import { BaseNetworkRailClient } from './base-client'
import type { TPSMessage, TPSRecord, TimingPoint, RouteSection, TPSConfig } from './types'

export class TPSClient extends BaseNetworkRailClient<TPSMessage> {
  constructor(config: TPSConfig) {
    super({
      ...config,
      feedName: 'TPS',
      topics: ['TPS_ALL_TOC'],
    })
  }

  protected parseMessage(rawMessage: unknown): TPSMessage {
    try {
      const data = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid TPS message format')
      }

      return {
        messageType: this.determineMessageType(data),
        timestamp: new Date().toISOString(),
        data: data,
        sourceSystem: 'TPS',
        sequenceNumber: data.sequence_number || 0,
      }
    } catch (error) {
      throw new Error(
        `Failed to parse TPS message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private determineMessageType(
    data: unknown
  ): 'timing_point' | 'route_section' | 'network_topology' {
    const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
    if (isObj(data) && 'tiploc_code' in data) return 'timing_point'
    if (isObj(data) && 'route_code' in data) return 'route_section'
    return 'network_topology'
  }

  /**
   * Get timing point information by TIPLOC code
   */
  async getTimingPoint(tiplocsCode: string): Promise<TimingPoint | null> {
    // In a real implementation, this would query the TPS database
    // For now, return mock timing point data
    if (tiplocsCode === 'EUSTON') {
      return {
        tiploc: 'EUSTON',
        crs: 'EUS',
        stanox: '87701',
        nalco: '559700',
        description: 'London Euston',
        easting: 528777,
        northing: 182267,
        changeTime: 2,
        tpsDescription: 'LONDON EUSTON MAIN LINE PLATFORMS',
        subsidiaryLocation: '1',
        operatingCompany: 'NR',
        workingTimetableId: 'EUS',
      }
    }

    return null
  }

  /**
   * Search timing points by criteria
   */
  async searchTimingPoints(criteria: {
    name?: string
    crs?: string
    stanox?: string
    operatingCompany?: string
    limit?: number
  }): Promise<TimingPoint[]> {
    // Mock timing points for demonstration
    const allTimingPoints: TimingPoint[] = [
      {
        tiploc: 'EUSTON',
        crs: 'EUS',
        stanox: '87701',
        nalco: '559700',
        description: 'London Euston',
        easting: 528777,
        northing: 182267,
        changeTime: 2,
        tpsDescription: 'LONDON EUSTON MAIN LINE PLATFORMS',
        subsidiaryLocation: '1',
        operatingCompany: 'NR',
        workingTimetableId: 'EUS',
      },
      {
        tiploc: 'BHAMINT',
        crs: 'BHI',
        stanox: '68808',
        nalco: '684000',
        description: 'Birmingham International',
        easting: 418134,
        northing: 285088,
        changeTime: 2,
        tpsDescription: 'BIRMINGHAM INTERNATIONAL',
        subsidiaryLocation: '1',
        operatingCompany: 'NR',
        workingTimetableId: 'BHI',
      },
    ]

    return allTimingPoints
      .filter((tp) => {
        if (criteria.name && !tp.description.toLowerCase().includes(criteria.name.toLowerCase()))
          return false
        if (criteria.crs && tp.crs !== criteria.crs) return false
        if (criteria.stanox && tp.stanox !== criteria.stanox) return false
        if (criteria.operatingCompany && tp.operatingCompany !== criteria.operatingCompany)
          return false
        return true
      })
      .slice(0, criteria.limit || 100)
  }

  /**
   * Get route section information
   */
  async getRouteSection(routeCode: string): Promise<RouteSection | null> {
    // Mock route section data
    if (routeCode === 'WCL1') {
      return {
        routeCode: 'WCL1',
        description: 'West Coast Main Line - London to Birmingham',
        fromTiploc: 'EUSTON',
        toTiploc: 'BHAMINT',
        mileage: 112.5,
        electrified: true,
        maxSpeed: 125,
        routeType: 'Main Line',
        operatingCompany: 'NR',
        signallingSystem: 'ETCS Level 2',
        gradients: [
          { mileage: 0.0, gradient: 0.5 },
          { mileage: 15.2, gradient: -0.8 },
          { mileage: 45.6, gradient: 1.2 },
        ],
        speedRestrictions: [],
      }
    }

    return null
  }

  /**
   * Get network topology information
   */
  async getNetworkTopology(area?: string): Promise<{
    junctions: Array<{
      tiploc: string
      description: string
      connections: string[]
      coordinates: { easting: number; northing: number }
    }>
    routes: RouteSection[]
    signalBoxes: Array<{
      code: string
      name: string
      area: string
      controlledRoutes: string[]
    }>
  }> {
    return {
      junctions: [
        {
          tiploc: 'RUGBYJN',
          description: 'Rugby Junction',
          connections: ['WCL1', 'WCL2', 'CML1'],
          coordinates: { easting: 450123, northing: 275456 },
        },
      ],
      routes: [
        {
          routeCode: 'WCL1',
          description: 'West Coast Main Line - London to Birmingham',
          fromTiploc: 'EUSTON',
          toTiploc: 'BHAMINT',
          mileage: 112.5,
          electrified: true,
          maxSpeed: 125,
          routeType: 'Main Line',
          operatingCompany: 'NR',
          signallingSystem: 'ETCS Level 2',
          gradients: [],
          speedRestrictions: [],
        },
      ],
      signalBoxes: [
        {
          code: 'EUSPSB',
          name: 'Euston Power Signal Box',
          area: 'London North Western',
          controlledRoutes: ['WCL1', 'WCL2'],
        },
      ],
    }
  }

  /**
   * Get mileage information between locations
   */
  async getMileage(
    fromTiploc: string,
    toTiploc: string
  ): Promise<{
    mileage: number
    route: string
    electrified: boolean
    intermediatePoints?: TimingPoint[]
  } | null> {
    // Mock mileage calculation
    if (fromTiploc === 'EUSTON' && toTiploc === 'BHAMINT') {
      return {
        mileage: 112.5,
        route: 'WCL1',
        electrified: true,
        intermediatePoints: [
          {
            tiploc: 'WATFORD',
            crs: 'WFJ',
            stanox: '87650',
            nalco: '559800',
            description: 'Watford Junction',
            easting: 512345,
            northing: 198765,
            changeTime: 1,
            tpsDescription: 'WATFORD JUNCTION',
            subsidiaryLocation: '1',
            operatingCompany: 'NR',
            workingTimetableId: 'WFJ',
          },
        ],
      }
    }

    return null
  }

  /**
   * Get TPS records and updates
   */
  async getTPSUpdates(since?: string): Promise<TPSRecord[]> {
    const updates: TPSRecord[] = []

    this.messages.forEach((message) => {
      if (!since || message.timestamp > since) {
        updates.push({
          recordType: message.messageType,
          data: message.data,
          timestamp: message.timestamp,
          sequenceNumber: message.sequenceNumber,
        })
      }
    })

    return updates
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<{
    totalTimingPoints: number
    totalRoutes: number
    electrifiedMileage: number
    totalMileage: number
    signalBoxes: number
    lastUpdate: string
  }> {
    return {
      totalTimingPoints: 12500,
      totalRoutes: 850,
      electrifiedMileage: 5200,
      totalMileage: 15800,
      signalBoxes: 180,
      lastUpdate: new Date().toISOString(),
    }
  }

  /**
   * Find shortest path between two locations
   */
  async findPath(
    fromTiploc: string,
    toTiploc: string
  ): Promise<{
    path: TimingPoint[]
    totalMileage: number
    routes: string[]
    estimatedTime: number
  } | null> {
    // Mock pathfinding result
    if (fromTiploc === 'EUSTON' && toTiploc === 'BHAMINT') {
      return {
        path: [
          {
            tiploc: 'EUSTON',
            crs: 'EUS',
            stanox: '87701',
            nalco: '559700',
            description: 'London Euston',
            easting: 528777,
            northing: 182267,
            changeTime: 2,
            tpsDescription: 'LONDON EUSTON MAIN LINE PLATFORMS',
            subsidiaryLocation: '1',
            operatingCompany: 'NR',
            workingTimetableId: 'EUS',
          },
          {
            tiploc: 'BHAMINT',
            crs: 'BHI',
            stanox: '68808',
            nalco: '684000',
            description: 'Birmingham International',
            easting: 418134,
            northing: 285088,
            changeTime: 2,
            tpsDescription: 'BIRMINGHAM INTERNATIONAL',
            subsidiaryLocation: '1',
            operatingCompany: 'NR',
            workingTimetableId: 'BHI',
          },
        ],
        totalMileage: 112.5,
        routes: ['WCL1'],
        estimatedTime: 85, // minutes
      }
    }

    return null
  }
}
