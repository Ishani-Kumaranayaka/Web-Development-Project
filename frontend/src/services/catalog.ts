import axios from 'axios'
import { reactive } from 'vue'
import type { ApiResponse, Destination, Hotel } from '../types'
import { api } from './api'

export type DestinationInput = Pick<Destination,
  'name' | 'description' | 'location' | 'province' | 'category' |
  'image' | 'bestTime' | 'averageCost'>
export type HotelInput = Pick<Hotel,
  'name' | 'description' | 'location' | 'image' | 'pricePerNight' |
  'facilities' | 'destinationId'>

// Keep these array identities stable for App.vue and its injected context.
export const destinations = reactive<Destination[]>([])
export const hotels = reactive<Hotel[]>([])
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
  ]).then(([places, stays]) => {
    destinations.splice(0, destinations.length,
      ...places.data.data.map(normalizeDestination))
    hotels.splice(0, hotels.length, ...stays.data.data)
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
