import axios from 'axios'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { destinations } from '../data'
import {
  api,
  type CreateBookingInput,
  type DatabaseBooking,
} from '../services/api'
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
  const userReviews = ref<Review[]>([])

  const bookings = ref<DatabaseBooking[]>([])
  const bookingsLoading = ref(false)
  const bookingsError = ref('')
  const bookingSaving = ref(false)

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

  // Restore browser data belonging to the current account.
  // Bookings are loaded separately from the backend.
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

      userReviews.value = Array.isArray(saved?.userReviews)
        ? saved.userReviews
        : []
    } finally {
      switchingAccount = false
    }

    if (!current) {
      api.setToken(null)
    }
  }, { flush: 'sync' })

  // Bookings are excluded from browser persistence.
  watch([wishlist, trips, userReviews], () => {
    if (switchingAccount || !user.value) return

    const data: PersonalData = {
      wishlist: wishlist.value,
      trips: trips.value,
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
        // Ignore a response belonging to an earlier session.
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

        if (
          status === 401 ||
          status === 403 ||
          status === 404
        ) {
          logout()
          sessionError.value = 'Please sign in again.'
        } else {
          // Preserve the token during temporary connection failures.
          sessionError.value = api.getErrorMessage(error)
        }
      })
      .finally(() => {
        sessionChecked = true
        sessionRequest = null
      })

    return sessionRequest
  }

  // Database bookings

  let bookingVersion = 0

  function isBookingSessionCurrent(
    accountId: string,
    token: string | null,
    version: number,
  ): boolean {
    return (
      user.value?.id === accountId &&
      localStorage.getItem('tm-token') === token &&
      bookingVersion === version
    )
  }

  async function loadBookings(): Promise<void> {
    if (
      !user.value ||
      bookingsLoading.value ||
      bookingSaving.value
    ) {
      return
    }

    const accountId = user.value.id
    const token = localStorage.getItem('tm-token')
    const version = ++bookingVersion

    bookingsLoading.value = true
    bookingsError.value = ''

    try {
      const response = await api.getBookings('mine')

      if (isBookingSessionCurrent(accountId, token, version)) {
        bookings.value = response.data
      }
    } catch (error) {
      if (isBookingSessionCurrent(accountId, token, version)) {
        bookingsError.value = api.getErrorMessage(error)
      }
    } finally {
      if (isBookingSessionCurrent(accountId, token, version)) {
        bookingsLoading.value = false
      }
    }
  }

  async function runBookingChange(
    request: () => Promise<{ data: DatabaseBooking }>,
    apply: (booking: DatabaseBooking) => void,
  ): Promise<void> {
    if (!user.value) {
      throw new Error('Please sign in first.')
    }

    if (bookingSaving.value) {
      throw new Error('Please wait for the current request.')
    }

    const accountId = user.value.id
    const token = localStorage.getItem('tm-token')
    const version = ++bookingVersion

    bookingsLoading.value = false
    bookingsError.value = ''
    bookingSaving.value = true

    try {
      const response = await request()

      if (isBookingSessionCurrent(accountId, token, version)) {
        apply(response.data)
      }
    } finally {
      if (isBookingSessionCurrent(accountId, token, version)) {
        bookingSaving.value = false
      }
    }
  }

  async function createBooking(
    input: CreateBookingInput,
  ): Promise<void> {
    await runBookingChange(
      () => api.createBooking(input),
      saved => {
        bookings.value.unshift(saved)
      },
    )
  }

  async function cancelBooking(id: string): Promise<void> {
    await runBookingChange(
      () => api.cancelBooking(id),
      saved => {
        const index = bookings.value.findIndex(
          item => item.id === id,
        )

        if (index !== -1) {
          bookings.value.splice(index, 1, saved)
        }
      },
    )
  }

  // Clear the previous account's bookings and ignore its late responses.
  watch(() => user.value?.id, () => {
    bookingVersion++

    bookings.value = []
    bookingsLoading.value = false
    bookingsError.value = ''
    bookingSaving.value = false

    if (user.value) {
      void loadBookings()
    }
  }, { immediate: true, flush: 'sync' })

  // Wishlist

  function toggleWishlist(
    kind: CatalogKind,
    itemId: string,
  ): void {
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

  // Trips

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

    const trip = trips.value.find(
      item => item.id === tripId,
    )

    if (
      trip &&
      !trip.destinationIds.includes(destinationId)
    ) {
      trip.destinationIds.push(destinationId)
    }
  }

  function addActivityToTrip(
    tripId: string,
    activityId: string,
  ): void {
    if (!user.value) return

    const trip = trips.value.find(
      item => item.id === tripId,
    )

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

    const trip = trips.value.find(
      item => item.id === tripId,
    )

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

    const trip = trips.value.find(
      item => item.id === tripId,
    )

    if (trip) {
      trip.transportMode = transportMode
    }
  }

  // Update the cached row after the admin page saves through the API.
  function setPaymentStatus(
    bookingId: string,
    paymentStatus: Booking['paymentStatus'],
  ): void {
    if (!user.value) return

    const booking = bookings.value.find(
      item => item.id === bookingId,
    )

    if (booking) {
      booking.paymentStatus = paymentStatus
    }
  }

  // Reviews

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
    bookingsLoading,
    bookingsError,
    bookingSaving,
    userReviews,
    sessionError,
    isAdmin,
    restoreSession,
    logout,
    loadBookings,
    createBooking,
    cancelBooking,
    toggleWishlist,
    createTrip,
    addDestinationToTrip,
    addActivityToTrip,
    removeActivityFromTrip,
    setTripTransport,
    setPaymentStatus,
    addReview,
    destinations,
  }
})