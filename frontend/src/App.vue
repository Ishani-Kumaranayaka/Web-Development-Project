<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  provide,
  ref,
  watch,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { activities, packages, reviews } from './data'
import './styles/catalog-notice.css'
import {
  destinations,
  hotels,
  catalogStatus,
  loadCatalog,
} from './services/catalog'

import AppHeader from './components/layout/AppHeader.vue'
import SiteFooter from './components/layout/SiteFooter.vue'
import AuthDialog from './components/auth/AuthDialog.vue'
import ToastNotification from './components/feedback/ToastNotification.vue'
import FloatingTripPlanner from './components/feedback/FloatingTripPlanner.vue'
import CatalogPage from './components/pages/catalog/CatalogPage.vue'
import DetailPage from './components/pages/catalog/DetailPage.vue'
import TripPlannerPage from './components/pages/trips/TripPlannerPage.vue'
import BookingsPage from './components/pages/bookings/BookingsPage.vue'
import UserDashboardPage from './components/pages/dashboard/UserDashboardPage.vue'
import AdminDashboardPage from './components/pages/admin/AdminDashboardPage.vue'
import AuthPage from './components/pages/auth/AuthPage.vue'
import MainPage from './components/pages/MainPage.vue'
import WishlistPage from './components/pages/WishlistPage.vue'

import { appPageContextKey } from './context/appPageContext'
import { api } from './services/api'
import { useTravelStore } from './stores/travel'
import type { CatalogKind } from './types'

const route = useRoute()
const router = useRouter()
const store = useTravelStore()

const detailKind = computed(() => String(route.params.kind ?? ''))
const detailId = computed(() => String(route.params.id ?? ''))

const page = computed(() =>
  detailKind.value
    ? 'detail'
    : String(route.params.page ?? route.meta.page ?? 'home'),
)

const mobileMenu = ref(false)
const searchText = ref('')
const provinceFilter = ref('All regions')
const categoryFilter = ref('All types')
const sortBy = ref('Recommended')

const modal = ref<'login' | 'register' | ''>('')
const loginEmail = ref('')
const loginName = ref('')
const loginPassword = ref('')
const signingIn = ref(false)

const tripName = ref('')
const tripStart = ref('')
const tripEnd = ref('')
const tripError = ref('')

const bookingItem = ref('')
const bookingType = ref<'Hotel' | 'Package'>('Hotel')
const bookingStart = ref('')
const bookingEnd = ref('')
const guests = ref(2)
const specialRequest = ref('')
const bookingError = ref('')

const toast = ref('')

let toastTimer: ReturnType<typeof window.setTimeout> | undefined

const navItems = [
  { label: 'Destinations', href: '/destinations' },
  { label: 'Stays', href: '/hotels' },
  { label: 'Experiences', href: '/activities' },
  { label: 'Journeys', href: '/packages' },
]

function reloadCatalog(): void {
  void loadCatalog().catch(() => {
    // The catalogue banner displays this error.
  })
}

onMounted(reloadCatalog)

onUnmounted(() => {
  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer)
  }
})

const destinationList = computed(() => {
  const search = searchText.value.trim().toLowerCase()

  const filtered = destinations.filter(item => {
    const matchesSearch =
      !search ||
      (
        item.name +
        ' ' +
        item.location +
        ' ' +
        item.description +
        ' ' +
        item.category
      )
        .toLowerCase()
        .includes(search)

    return (
      matchesSearch &&
      (
        provinceFilter.value === 'All regions' ||
        item.province === provinceFilter.value
      ) &&
      (
        categoryFilter.value === 'All types' ||
        item.category === categoryFilter.value
      )
    )
  })

  if (sortBy.value === 'Price: low to high') {
    return [...filtered].sort(
      (a, b) => a.averageCost - b.averageCost,
    )
  }

  if (sortBy.value === 'Top rated') {
    return [...filtered].sort(
      (a, b) => b.rating - a.rating,
    )
  }

  return filtered
})

const currentDetail = computed(() => {
  if (detailKind.value === 'destination') {
    return destinations.find(
      item => item.id === detailId.value,
    )
  }

  if (detailKind.value === 'hotel') {
    return hotels.find(
      item => item.id === detailId.value,
    )
  }

  if (detailKind.value === 'activity') {
    return activities.find(
      item => item.id === detailId.value,
    )
  }

  if (detailKind.value === 'package') {
    return packages.find(
      item => item.id === detailId.value,
    )
  }

  return undefined
})

// Only database package IDs can be submitted to the booking API.
const bookingOptions = computed(() =>
  bookingType.value === 'Hotel'
    ? hotels
    : packages.filter(
        item => /^[a-f\d]{24}$/i.test(item.id),
      ),
)

const selectedBooking = computed(() =>
  bookingOptions.value.find(
    item => item.id === bookingItem.value,
  ),
)

function validCalendarDate(value: string): boolean {
  const date = new Date(value + 'T00:00:00Z')

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  )
}

const bookingNights = computed(() => {
  if (
    !validCalendarDate(bookingStart.value) ||
    !validCalendarDate(bookingEnd.value) ||
    bookingEnd.value <= bookingStart.value
  ) {
    return 0
  }

  return Math.ceil(
    (
      new Date(bookingEnd.value).getTime() -
      new Date(bookingStart.value).getTime()
    ) / 86400000,
  )
})

const bookingTotal = computed(() => {
  const selected = selectedBooking.value

  if (!selected) return 0

  if (
    bookingType.value === 'Hotel' &&
    'pricePerNight' in selected
  ) {
    return selected.pricePerNight * bookingNights.value
  }

  if ('price' in selected) {
    return selected.price * guests.value
  }

  return 0
})

const detailReviews = computed(() =>
  [...reviews, ...store.userReviews].filter(
    review => review.itemId === detailId.value,
  ),
)

watch(bookingOptions, options => {
  if (
    !options.some(
      item => item.id === bookingItem.value,
    )
  ) {
    bookingItem.value = options[0]?.id ?? ''
  }
}, { immediate: true, deep: true })

watch([() => store.user?.id, page], () => {
  if (
    store.user &&
    ['bookings', 'dashboard', 'profile'].includes(page.value)
  ) {
    void store.loadBookings()
  }
}, { immediate: true })

watch(
  [
    bookingStart,
    bookingEnd,
    bookingItem,
    bookingType,
    guests,
    specialRequest,
  ],
  () => {
    bookingError.value = ''
  },
  { flush: 'sync' },
)

watch([tripName, tripStart, tripEnd], () => {
  tripError.value = ''
}, { flush: 'sync' })

watch(() => store.user?.id, () => {
  mobileMenu.value = false
  modal.value = ''

  loginName.value = ''
  loginEmail.value = ''
  loginPassword.value = ''

  tripName.value = ''
  tripStart.value = ''
  tripEnd.value = ''
  tripError.value = ''

  bookingStart.value = ''
  bookingEnd.value = ''
  specialRequest.value = ''
  bookingError.value = ''

  guests.value = 2
  bookingType.value = 'Hotel'
  bookingItem.value = bookingOptions.value[0]?.id ?? ''
}, { flush: 'sync' })

function go(path: string): void {
  mobileMenu.value = false
  void router.push(path)
}

function showToast(message: string): void {
  if (toastTimer !== undefined) {
    window.clearTimeout(toastTimer)
  }

  toast.value = message

  toastTimer = window.setTimeout(() => {
    toast.value = ''
    toastTimer = undefined
  }, 2600)
}

function requireAccount(): boolean {
  if (store.user) return true

  modal.value = 'login'
  showToast('Please sign in first.')
  return false
}

function toggleSave(
  kind: CatalogKind,
  id: string,
): void {
  if (!requireAccount()) return

  const exists = store.wishlist.some(
    item => item.kind === kind && item.itemId === id,
  )

  store.toggleWishlist(kind, id)

  showToast(
    exists
      ? 'Removed from your saved list'
      : 'Saved for later',
  )
}

function openDetail(
  kind: CatalogKind,
  id: string,
): void {
  void router.push('/' + kind + '/' + id)
}

function createTrip(): void {
  if (!requireAccount()) return

  tripError.value = ''

  if (tripName.value.trim().length < 2) {
    tripError.value =
      'Use at least 2 characters for the trip name.'
  } else if (
    !validCalendarDate(tripStart.value) ||
    !validCalendarDate(tripEnd.value)
  ) {
    tripError.value =
      'Choose valid trip start and end dates.'
  } else if (tripEnd.value < tripStart.value) {
    tripError.value =
      'Trip end date must be on or after the start date.'
  }

  if (tripError.value) {
    showToast(tripError.value)
    return
  }

  store.createTrip(
    tripName.value.trim(),
    tripStart.value,
    tripEnd.value,
  )

  tripName.value = ''
  showToast('Your new journey is ready')
}

async function bookStay(): Promise<void> {
  if (!requireAccount() || store.bookingSaving) return

  bookingError.value = ''

  const selected = selectedBooking.value

  if (!selected) {
    bookingError.value =
      bookingType.value === 'Package'
        ? 'No database packages are available yet. Choose Hotel.'
        : 'Choose a hotel.'
  } else if (!/^[a-f\d]{24}$/i.test(selected.id)) {
    bookingError.value =
      'Choose a listing connected to the database.'
  } else if (
    !validCalendarDate(bookingStart.value) ||
    !validCalendarDate(bookingEnd.value)
  ) {
    bookingError.value =
      'Choose valid check-in and check-out dates.'
  } else if (bookingEnd.value <= bookingStart.value) {
    bookingError.value =
      'Check-out must be after check-in.'
  } else if (
    !Number.isInteger(guests.value) ||
    guests.value < 1 ||
    guests.value > 30
  ) {
    bookingError.value =
      'Choose between 1 and 30 travellers.'
  } else if (specialRequest.value.trim().length > 1000) {
    bookingError.value =
      'Your note must contain at most 1000 characters.'
  }

  if (bookingError.value || !selected) {
    showToast(bookingError.value)
    return
  }

  const accountId = store.user!.id

  try {
    await store.createBooking({
      ...(bookingType.value === 'Hotel'
        ? { hotelId: selected.id }
        : { packageId: selected.id }),
      checkIn: bookingStart.value,
      checkOut: bookingEnd.value,
      guests: guests.value,
      specialRequests:
        specialRequest.value.trim() || undefined,
    })

    if (store.user?.id !== accountId) return

    specialRequest.value = ''

    showToast('Booking saved successfully')

    await router.push('/bookings')
  } catch (error: unknown) {
    if (store.user?.id !== accountId) return

    bookingError.value =
      error instanceof Error && !('isAxiosError' in error)
        ? error.message
        : api.getErrorMessage(error)

    showToast(bookingError.value)
  }
}

async function signIn(): Promise<void> {
  if (signingIn.value) return

  signingIn.value = true

  try {
    const email = loginEmail.value.trim().toLowerCase()

    const response =
      modal.value === 'register'
        ? await api.register({
            name: loginName.value.trim(),
            email,
            password: loginPassword.value,
          })
        : await api.login({
            email,
            password: loginPassword.value,
          })

    api.setToken(response.data.token)
    store.user = response.data.user

    modal.value = ''
    loginPassword.value = ''

    showToast('Welcome to TravelMate')

    await router.push(
      response.data.user.role === 'ADMIN'
        ? '/admin/dashboard'
        : '/dashboard',
    )
  } catch (error) {
    showToast(api.getErrorMessage(error))
  } finally {
    signingIn.value = false
  }
}

function signOut(): void {
  store.logout()

  modal.value = ''
  mobileMenu.value = false

  showToast('You are signed out')

  void router.replace('/')
}

function price(value: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formattedDate(value: string): string {
  if (!value) return '—'

  const date = new Date(
    value.slice(0, 10) + 'T12:00:00',
  )

  if (!Number.isFinite(date.getTime())) return '—'

  return date.toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

provide(appPageContextKey, {
  store,
  page,
  detailKind,
  detailId,
  mobileMenu,
  searchText,
  provinceFilter,
  categoryFilter,
  sortBy,
  modal,
  loginEmail,
  loginName,
  loginPassword,
  tripName,
  tripStart,
  tripEnd,
  tripError,
  bookingItem,
  bookingType,
  bookingStart,
  bookingEnd,
  guests,
  specialRequest,
  bookingError,
  toast,
  navItems,
  activities,
  destinations,
  hotels,
  packages,
  reviews,
  destinationList,
  currentDetail,
  bookingOptions,
  selectedBooking,
  bookingNights,
  bookingTotal,
  detailReviews,
  go,
  showToast,
  toggleSave,
  openDetail,
  createTrip,
  bookStay,
  signIn,
  signOut,
  price,
  formattedDate,
})
</script>

<template>
  <div class="app-shell">
    <AppHeader />

    <div
      v-if="store.sessionError"
      class="catalog-notice catalog-notice-error"
      role="alert"
    >
      {{ store.sessionError }}
    </div>

    <div
      v-if="catalogStatus.loading"
      class="catalog-notice"
      role="status"
    >
      Loading destinations and stays...
    </div>

    <div
      v-else-if="catalogStatus.error"
      class="catalog-notice catalog-notice-error"
      role="alert"
    >
      Could not load destinations and stays:
      {{ catalogStatus.error }}

      <button
        type="button"
        class="button button-outline button-small"
        @click="reloadCatalog"
      >
        Try again
      </button>
    </div>

    <MainPage
      v-if="page === 'home'"
      v-model:search-text="searchText"
      @navigate="go"
      @save="toggleSave"
      @detail="openDetail"
    />

    <CatalogPage
      v-else-if="
        ['destinations', 'hotels', 'activities', 'packages']
          .includes(page)
      "
    />

    <DetailPage v-else-if="detailKind" />

    <TripPlannerPage
      v-else-if="page === 'planner' && store.user"
    />

    <WishlistPage
      v-else-if="page === 'wishlist' && store.user"
      @toast="showToast"
    />

    <BookingsPage
      v-else-if="page === 'bookings' && store.user"
    />

    <UserDashboardPage
      v-else-if="
        (page === 'dashboard' || page === 'profile') &&
        store.user
      "
    />

    <AdminDashboardPage
      v-else-if="page === 'admin' && store.isAdmin"
    />

    <AuthPage v-else />

    <SiteFooter />
    <AuthDialog />
    <ToastNotification />

    <FloatingTripPlanner v-if="page === 'home'" />
  </div>
</template>