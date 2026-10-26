import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { destinations } from '../data'
import type { Booking, CatalogKind, Review, Trip, User, WishlistItem } from '../types'

function restore<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

export const useTravelStore = defineStore('travel', () => {
  const user = ref<User | null>(restore<User | null>('tm-user', { id: 'demo-user', name: 'Alex Morgan', email: 'alex@example.com', role: 'USER', createdAt: '2026-01-15' }))
  const wishlist = ref<WishlistItem[]>(restore('tm-wishlist', [{ id: 'w1', kind: 'destination', itemId: 'ella' }, { id: 'w2', kind: 'package', itemId: 'island-adventure' }]))
  const trips = ref<Trip[]>(restore('tm-trips', [{ id: 't1', name: 'Highlands & Coast', startDate: '2026-11-04', endDate: '2026-11-12', destinationIds: ['kandy', 'ella', 'galle'] }]))
  const bookings = ref<Booking[]>(restore('tm-bookings', [{ id: 'BK-2048', userId: 'demo-user', itemName: 'The Tea Garden House', itemType: 'Hotel', checkIn: '2026-11-06', checkOut: '2026-11-09', guests: 2, totalPrice: 426, status: 'Confirmed', paymentStatus: 'Paid', createdAt: '2026-08-21' }]))
  const userReviews = ref<Review[]>(restore('tm-reviews', []))
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  watch(user, value => localStorage.setItem('tm-user', JSON.stringify(value)))
  watch(wishlist, value => localStorage.setItem('tm-wishlist', JSON.stringify(value)), { deep: true })
  watch(trips, value => localStorage.setItem('tm-trips', JSON.stringify(value)), { deep: true })
  watch(bookings, value => localStorage.setItem('tm-bookings', JSON.stringify(value)), { deep: true })
  watch(userReviews, value => localStorage.setItem('tm-reviews', JSON.stringify(value)), { deep: true })

  function toggleWishlist(kind: CatalogKind, itemId: string): void {
    const index = wishlist.value.findIndex(item => item.kind === kind && item.itemId === itemId)
    if (index >= 0) wishlist.value.splice(index, 1)
    else wishlist.value.push({ id: crypto.randomUUID(), kind, itemId })
  }

  function createTrip(name: string, startDate: string, endDate: string): void {
    trips.value.push({ id: crypto.randomUUID(), name, startDate, endDate, destinationIds: [], activityIds: [], transportMode: 'Train' })
  }

  function addDestinationToTrip(tripId: string, destinationId: string): void {
    const trip = trips.value.find(item => item.id === tripId)
    if (trip && !trip.destinationIds.includes(destinationId)) trip.destinationIds.push(destinationId)
  }

  function addActivityToTrip(tripId: string, activityId: string): void {
    const trip = trips.value.find(item => item.id === tripId)
    if (trip) {
      trip.activityIds ??= []
      if (!trip.activityIds.includes(activityId)) trip.activityIds.push(activityId)
    }
  }

  function removeActivityFromTrip(tripId: string, activityId: string): void {
    const trip = trips.value.find(item => item.id === tripId)
    if (trip) trip.activityIds = (trip.activityIds ?? []).filter(id => id !== activityId)
  }

  function setTripTransport(tripId: string, transportMode: NonNullable<Trip['transportMode']>): void {
    const trip = trips.value.find(item => item.id === tripId)
    if (trip) trip.transportMode = transportMode
  }

  function createBooking(input: Omit<Booking, 'id' | 'userId' | 'status' | 'createdAt'>): void {
    bookings.value.unshift({ ...input, id: `BK-${Math.floor(1000 + Math.random() * 9000)}`, userId: user.value?.id ?? 'demo-user', status: 'Pending', paymentStatus: 'Unpaid', createdAt: new Date().toISOString().slice(0, 10) })
  }

  function setPaymentStatus(bookingId: string, paymentStatus: Booking['paymentStatus']): void {
    const booking = bookings.value.find(item => item.id === bookingId)
    if (booking) booking.paymentStatus = paymentStatus
  }

  function addReview(itemType: CatalogKind, itemId: string, rating: number, comment: string): void {
    if (!user.value) return
    userReviews.value.unshift({
      id: crypto.randomUUID(),
      userId: user.value.id,
      userName: user.value.name,
      itemId,
      itemType,
      rating,
      comment,
      createdAt: new Date().toISOString().slice(0, 10),
    })
  }

  function login(name: string, email: string, role: 'USER' | 'ADMIN' = 'USER'): void {
    user.value = { id: 'demo-user', name, email, role, createdAt: new Date().toISOString().slice(0, 10) }
  }

  return { user, wishlist, trips, bookings, userReviews, isAdmin, toggleWishlist, createTrip, addDestinationToTrip, addActivityToTrip, removeActivityFromTrip, setTripTransport, createBooking, setPaymentStatus, addReview, login, destinations }
})