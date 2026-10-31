import axios from 'axios'
import { reactive } from 'vue'
import type { Activity, ApiResponse, Destination, Hotel, TourPackage } from '../types'
import { api } from './api'

export type DestinationInput = Pick<Destination,
  'name' | 'description' | 'location' | 'province' | 'category' |
  'image' | 'bestTime' | 'averageCost'>
export type HotelInput = Pick<Hotel,
  'name' | 'description' | 'location' | 'image' | 'pricePerNight' |
  'facilities' | 'destinationId'>

export type ExperienceInput = Pick<Activity,
  'name' | 'description' | 'category' | 'price' | 'duration' | 'image' | 'destinationId' | 'rating'>
export type JourneyInput = Pick<TourPackage,
  'name' | 'description' | 'duration' | 'price' | 'image' | 'includedActivities' | 'itinerary'> & {
  hotelInformation: string
  destinationIds: string[]
}
type JourneyResponse = Omit<TourPackage, 'destinationIds' | 'hotel'> & {
  hotelInformation: string
  destinations: { destinationId: string; order: number }[]
}
export function normalizeJourney(item: JourneyResponse): TourPackage {
  return {
    id: item.id, name: item.name, description: item.description,
    duration: item.duration, price: item.price, image: item.image,
    includedActivities: item.includedActivities ?? [],
    hotel: item.hotelInformation,
    itinerary: Array.isArray(item.itinerary) ? item.itinerary : [],
    destinationIds: [...(item.destinations ?? [])]
      .sort((a, b) => a.order - b.order).map(link => link.destinationId),
  }
}

// Keep these array identities stable for App.vue and its injected context.
export const destinations = reactive<Destination[]>([])
export const hotels = reactive<Hotel[]>([])
export const activities = reactive<Activity[]>([])
export const packages = reactive<TourPackage[]>([])
export const catalogStatus = reactive({ loading: false, error: '' })

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15000,
})

client.interceptors.request.use(config => {
  const token = localStorage.getItem('tm-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

function normalizeDestination(item: Destination): Destination {
  // The MongoDB schema does not store demo-only tags.
  return { ...item, tags: Array.isArray(item.tags) ? item.tags : [] }
}

let pending: Promise<void> | null = null

export function loadCatalog(): Promise<void> {
  if (pending) return pending
  catalogStatus.loading = true
  catalogStatus.error = ''
  pending = Promise.all([
    client.get<ApiResponse<Destination[]>>('/destinations'),
    client.get<ApiResponse<Hotel[]>>('/hotels'),
    client.get<ApiResponse<Activity[]>>('/activities'),
    client.get<ApiResponse<JourneyResponse[]>>('/packages'),
  ]).then(([places, stays, experiences, journeys]) => {
    destinations.splice(0, destinations.length,
      ...places.data.data.map(normalizeDestination))
    hotels.splice(0, hotels.length, ...stays.data.data)
    activities.splice(0, activities.length, ...experiences.data.data)
    packages.splice(0, packages.length, ...journeys.data.data.map(normalizeJourney))
  }).catch((error: unknown) => {
    catalogStatus.error = api.getErrorMessage(error)
    throw error
  }).finally(() => {
    catalogStatus.loading = false
    pending = null
  })
  return pending
}

export async function addDestination(input: DestinationInput): Promise<void> {
  const response = await client.post<ApiResponse<Destination>>('/destinations', input)
  destinations.push(normalizeDestination(response.data.data))
  destinations.sort((a, b) => a.name.localeCompare(b.name))
}

export async function addHotel(input: HotelInput): Promise<void> {
  const response = await client.post<ApiResponse<Hotel>>('/hotels', input)
  hotels.push(response.data.data)
  hotels.sort((a, b) => a.name.localeCompare(b.name))
}

export async function updateDestination(
  id: string,
  input: Partial<DestinationInput>,
): Promise<void> {
  const response = await client.patch<ApiResponse<Destination>>(
    `/destinations/${id}`,
    input,
  )

  const updated = normalizeDestination(response.data.data)

  const index = destinations.findIndex(item => item.id === id)

  if (index !== -1) {
    destinations.splice(index, 1, updated)
  }

  destinations.sort((a, b) => a.name.localeCompare(b.name))
}

export async function deleteDestination(id: string): Promise<void> {
  await client.delete(`/destinations/${id}`)

  const index = destinations.findIndex(item => item.id === id)

  if (index !== -1) {
    destinations.splice(index, 1)
  }
}
export async function deleteHotel(id: string): Promise<void> {
  await client.delete(`/hotels/${id}`)

  const index = hotels.findIndex(item => item.id === id)

  if (index !== -1) {
    hotels.splice(index, 1)
  }
}

function upsert<T extends { id: string; name: string }>(items: T[], item: T): void {
  const index = items.findIndex(existing => existing.id === item.id)
  if (index < 0) items.push(item)
  else items.splice(index, 1, item)
  items.sort((a, b) => a.name.localeCompare(b.name))
}
export async function saveExperience(input: ExperienceInput, id?: string): Promise<void> {
  const response = id
    ? await client.patch<ApiResponse<Activity>>(`/activities/${id}`, input)
    : await client.post<ApiResponse<Activity>>('/activities', input)
  upsert(activities, response.data.data)
}
export async function saveJourney(input: JourneyInput, id?: string): Promise<void> {
  const response = id
    ? await client.patch<ApiResponse<JourneyResponse>>(`/packages/${id}`, input)
    : await client.post<ApiResponse<JourneyResponse>>('/packages', input)
  upsert(packages, normalizeJourney(response.data.data))
}
export async function deleteExperience(id: string): Promise<void> {
  await client.delete(`/activities/${id}`)
  const index = activities.findIndex(item => item.id === id)
  if (index >= 0) activities.splice(index, 1)
}
export async function deleteJourney(id: string): Promise<void> {
  await client.delete(`/packages/${id}`)
  const index = packages.findIndex(item => item.id === id)
  if (index >= 0) packages.splice(index, 1)
}
