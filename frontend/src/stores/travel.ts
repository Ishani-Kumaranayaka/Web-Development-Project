import axios from 'axios'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { destinations } from '../data'
import { api } from '../services/api'
import type {
  Booking,
  CatalogKind,
  Review,
  Trip,
  User,
  WishlistItem,
} from '../types'

type PersonalData = {
  wishlist: WishlistItem[]
  trips: Trip[]
  bookings: Booking[]
  userReviews: Review[]
}

function restore<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

export const useTravelStore = defineStore('travel', () => {
  const user = ref<User | null>(null)
  const wishlist = ref<WishlistItem[]>([])
  const trips = ref<Trip[]>([])
  const bookings = ref<Booking[]>([])
  const userReviews = ref<Review[]>([])
  const sessionError = ref('')

  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  // Remove the old shared browser cache.
  for (const key of [
    'tm-user',
    'tm-wishlist',
    'tm-trips',
    'tm-bookings',
    'tm-reviews',
  ]) {
    localStorage.removeItem(key)
  }

  let switchingAccount = false
  let sessionChecked = false
  let sessionRequest: Promise<void> | null = null

  // Load only the current account's saved browser data.
  watch(user, (current, previous) => {
    sessionError.value = ''

    if (current?.id === previous?.id) return

    switchingAccount = true

    try {
      const saved = current
        ? restore<Partial<PersonalData>>(
            'tm-personal:' + current.id,
            {},
          )
        : {}

      wishlist.value = Array.isArray(saved?.wishlist)
        ? saved.wishlist
        : []

      trips.value = Array.isArray(saved?.trips)
        ? saved.trips
        : []

      bookings.value = Array.isArray(saved?.bookings)
        ? saved.bookings
        : []

      userReviews.value = Array.isArray(saved?.userReviews)
        ? saved.userReviews
        : []
    } finally {
      switchingAccount = false
    }

    if (!current) api.setToken(null)
  }, { flush: 'sync' })

  // Save each account's browser data under its own key.
  watch([wishlist, trips, bookings, userReviews], () => {
    if (switchingAccount || !user.value) return

    const data: PersonalData = {
      wishlist: wishlist.value,
      trips: trips.value,
      bookings: bookings.value,
      userReviews: userReviews.value,
    }

    localStorage.setItem(
      'tm-personal:' + user.value.id,
      JSON.stringify(data),
    )
  }, { deep: true, flush: 'sync' })

  function logout(): void {
    api.setToken(null)
    user.value = null
    sessionError.value = ''
  }

  function restoreSession(): Promise<void> {
    if (sessionChecked) return Promise.resolve()
    if (sessionRequest) return sessionRequest

    const token = localStorage.getItem('tm-token')

    if (!token) {
      sessionChecked = true
      return Promise.resolve()
    }

    sessionRequest = api.me()
      .then(response => {
        // Ignore an old response if the token changed meanwhile.
        if (localStorage.getItem('tm-token') === token) {
          user.value = response.data
          sessionError.value = ''
        }
      })
      .catch((error: unknown) => {
        if (localStorage.getItem('tm-token') !== token) return

        const status = axios.isAxiosError(error)
          ? error.response?.status
          : undefined

        if (status === 401 || status === 403 || status === 404) {
          logout()
          sessionError.value = 'Please sign in again.'
        } else {
          // Keep the token when the server is temporarily unreachable.
          sessionError.value = api.getErrorMessage(error)
        }
      })
      .finally(() => {
        sessionChecked = true
        sessionRequest = null
      })

    return sessionRequest
  }

  function toggleWishlist(kind: CatalogKind, itemId: string): void {
    if (!user.value) return

    const index = wishlist.value.findIndex(
      item => item.kind === kind && item.itemId === itemId,
    )

    if (index >= 0) {
      wishlist.value.splice(index, 1)
    } else {
      wishlist.value.push({
        id: crypto.randomUUID(),
        kind,
        itemId,
      })
    }
  }

  function createTrip(
    name: string,
    startDate: string,
    endDate: string,
  ): void {
    if (!user.value) return

    trips.value.push({
      id: crypto.randomUUID(),
      name,
      startDate,
      endDate,
      destinationIds: [],
      activityIds: [],
      transportMode: 'Train',
    })
  }

  function addDestinationToTrip(
    tripId: string,
    destinationId: string,
  ): void {
    if (!user.value) return

    const trip = trips.value.find(item => item.id === tripId)

    if (trip && !trip.destinationIds.includes(destinationId)) {
      trip.destinationIds.push(destinationId)
    }
  }

  function addActivityToTrip(
    tripId: string,
    activityId: string,
  ): void {
    if (!user.value) return

    const trip = trips.value.find(item => item.id === tripId)

    if (trip) {
      trip.activityIds ??= []

      if (!trip.activityIds.includes(activityId)) {
        trip.activityIds.push(activityId)
      }
    }
  }

  function removeActivityFromTrip(
    tripId: string,
    activityId: string,
  ): void {
    if (!user.value) return

    const trip = trips.value.find(item => item.id === tripId)

    if (trip) {
      trip.activityIds = (trip.activityIds ?? []).filter(
        id => id !== activityId,
      )
    }
  }

  function setTripTransport(
    tripId: string,
    transportMode: NonNullable<Trip['transportMode']>,
  ): void {
    if (!user.value) return

    const trip = trips.value.find(item => item.id === tripId)

    if (trip) trip.transportMode = transportMode
  }

  function createBooking(
    input: Omit<Booking, 'id' | 'userId' | 'status' | 'createdAt'>,
  ): void {
    if (!user.value) return

    bookings.value.unshift({
      ...input,
      id: 'BK-' + crypto.randomUUID(),
      userId: user.value.id,
      status: 'Pending',
      paymentStatus: 'Unpaid',
      createdAt: new Date().toISOString().slice(0, 10),
    })
  }

  function setPaymentStatus(
    bookingId: string,
    paymentStatus: Booking['paymentStatus'],
  ): void {
    if (!user.value) return

    const booking = bookings.value.find(
      item => item.id === bookingId,
    )

    if (booking) booking.paymentStatus = paymentStatus
  }

  function addReview(
    itemType: CatalogKind,
    itemId: string,
    rating: number,
    comment: string,
  ): void {
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

  return {
    user,
    wishlist,
    trips,
    bookings,
    userReviews,
    sessionError,
    isAdmin,
    restoreSession,
    logout,
    toggleWishlist,
    createTrip,
    addDestinationToTrip,
    addActivityToTrip,
    removeActivityFromTrip,
    setTripTransport,
    createBooking,
    setPaymentStatus,
    addReview,
    destinations,
  }
})