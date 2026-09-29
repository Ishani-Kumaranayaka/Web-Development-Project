export type Role = 'USER' | 'ADMIN'
export type CatalogKind = 'destination' | 'hotel' | 'activity' | 'package'
export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  profileImage?: string
  createdAt: string
}

export interface Destination {
  id: string
  name: string
  location: string
  province: string
  category: string
  description: string
  image: string
  bestTime: string
  averageCost: number
  rating: number
  latitude: number
  longitude: number
  tags: string[]
}

export interface Hotel {
  id: string
  name: string
  location: string
  description: string
  image: string
  pricePerNight: number
  rating: number
  facilities: string[]
  destinationId: string
}

export interface Activity {
  id: string
  name: string
  description: string
  destinationId: string
  category: string
  price: number
  duration: string
  image: string
  rating: number
}

export interface TourPackage {
  id: string
  name: string
  description: string
  duration: string
  price: number
  image: string
  destinationIds: string[]
  includedActivities: string[]
  hotel: string
  itinerary: { day: number; place: string; detail: string }[]
}

export interface Booking {
  id: string
  userId: string
  itemName: string
  itemType: 'Hotel' | 'Package'
  checkIn: string
  checkOut: string
  guests: number
  totalPrice: number
  status: BookingStatus
  createdAt: string
}

export interface Trip {
  id: string
  name: string
  startDate: string
  endDate: string
  destinationIds: string[]
}

export interface Review {
  id: string
  userId: string
  userName: string
  itemId: string
  itemType: CatalogKind
  rating: number
  comment: string
  createdAt: string
}

export interface WishlistItem {
  id: string
  kind: CatalogKind
  itemId: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
}