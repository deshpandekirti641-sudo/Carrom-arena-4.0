// Arena Building Map Type Definitions

export interface ArenaCoordinates {
  x: number
  y: number
  width: number
  height: number
}

export interface ArenaFacility {
  id: string
  name: string
  type: 'gaming' | 'vip' | 'training' | 'tournament' | 'service' | 'amenity' | 'admin'
  description: string
  capacity: number
  tables: number
  coordinates: ArenaCoordinates
  amenities: string[]
  operatingHours: string
  bookingRequired: boolean
  prizePool: string
  status: 'active' | 'maintenance' | 'closed'
}

export interface PlayerLocation {
  x: number
  y: number
  facilityId?: string
  timestamp?: Date
}

export interface ArenaSection {
  id: string
  name: string
  facilities: string[] // facility IDs
  floor: number
  accessLevel: 'public' | 'member' | 'vip' | 'staff'
}

export interface WaypointDirection {
  step: number
  instruction: string
  distance: number
  landmark: string
  coordinates?: ArenaCoordinates
}

export interface NavigationRoute {
  from: string
  to: string
  distance: number // in meters
  estimatedTime: number // in minutes
  difficulty: 'easy' | 'medium' | 'hard'
  directions: WaypointDirection[]
  accessibilityNotes?: string[]
}

export interface ArenaStats {
  totalCapacity: number
  totalTables: number
  activeZones: number
  dailyMatches: number
  totalPrizePool: string
  averageWaitTime: string
  currentOccupancy: number
  peakHours: string
}

export interface FloorPlan {
  floor: number
  name: string
  facilities: ArenaFacility[]
  dimensions: {
    width: number
    height: number
  }
  emergencyExits: ArenaCoordinates[]
  accessibility: {
    elevators: ArenaCoordinates[]
    ramps: ArenaCoordinates[]
    restrooms: ArenaCoordinates[]
  }
}

export interface ArenaEvent {
  id: string
  name: string
  type: 'tournament' | 'training' | 'special' | 'maintenance'
  facilityId: string
  startTime: Date
  endTime: Date
  maxParticipants: number
  currentParticipants: number
  prizePool?: string
  registrationRequired: boolean
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled'
}

export interface SecurityZone {
  id: string
  name: string
  level: 'low' | 'medium' | 'high' | 'restricted'
  coordinates: ArenaCoordinates
  accessRequirements: string[]
  cameras: number
  guards: number
}

export interface EmergencyInfo {
  emergencyExits: ArenaCoordinates[]
  assemblyPoints: ArenaCoordinates[]
  medicalStations: ArenaCoordinates[]
  fireExtinguishers: ArenaCoordinates[]
  emergencyContacts: {
    security: string
    medical: string
    fire: string
    management: string
  }
}

export interface AmenityDetails {
  id: string
  name: string
  type: 'food' | 'restroom' | 'parking' | 'wifi' | 'atm' | 'storage' | 'charging'
  location: ArenaCoordinates
  availability: '24/7' | 'business-hours' | 'event-only'
  features: string[]
  cost?: string
}

export interface DigitalSignage {
  id: string
  location: ArenaCoordinates
  type: 'directory' | 'announcements' | 'scores' | 'advertising' | 'emergency'
  content: string[]
  isInteractive: boolean
  lastUpdated: Date
}

export interface ArenaEnvironment {
  temperature: number
  humidity: number
  noiseLevel: number
  lighting: 'dim' | 'normal' | 'bright'
  crowdDensity: 'low' | 'medium' | 'high'
  airQuality: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface AccessibilityFeatures {
  wheelchairAccessible: boolean
  brailleSignage: boolean
  audioAnnouncements: boolean
  elevatorAccess: boolean
  assistanceAvailable: boolean
  specialParking: boolean
  adaptiveEquipment: string[]
}

export interface ArenaConfiguration {
  name: string
  address: string
  totalFloors: number
  totalArea: number // square meters
  maxOccupancy: number
  operatingHours: {
    open: string
    close: string
  }
  contactInfo: {
    phone: string
    email: string
    website: string
    emergencyLine: string
  }
  regulations: {
    ageRestriction: number
    dressCode: string[]
    prohibitedItems: string[]
    gamingLimits: {
      minimum: number
      maximum: number
    }
  }
}

export interface LiveData {
  facilityId: string
  currentOccupancy: number
  activeMatches: number
  averageWaitTime: number
  prizePoolActive: number
  lastUpdated: Date
  systemStatus: 'online' | 'offline' | 'maintenance'
}

export interface UserPreferences {
  userId: string
  favoriteZones: string[]
  accessibilityNeeds: string[]
  notificationSettings: {
    waitTime: boolean
    events: boolean
    promotions: boolean
    system: boolean
  }
  gamePreferences: {
    stakes: 'low' | 'medium' | 'high'
    tableType: string[]
    opponentLevel: string[]
  }
}

// Utility types for building map operations
export type ZoneFilter = 'all' | 'gaming' | 'vip' | 'training' | 'tournament' | 'service' | 'amenity' | 'admin'
export type StatusFilter = 'all' | 'active' | 'maintenance' | 'closed'
export type ViewMode = 'floor-plan' | '3d' | 'interactive' | 'accessibility'

export interface MapInteraction {
  type: 'click' | 'hover' | 'select' | 'navigate'
  facilityId: string
  coordinates: { x: number; y: number }
  timestamp: Date
  userId?: string
}

export interface BuildingMapProps {
  facilities: ArenaFacility[]
  playerLocation?: PlayerLocation
  selectedFacility?: string
  showNavigation?: boolean
  viewMode?: ViewMode
  onFacilitySelect?: (facilityId: string) => void
  onLocationUpdate?: (location: PlayerLocation) => void
  onInteraction?: (interaction: MapInteraction) => void
}