<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Search,
  Users,
} from 'lucide-vue-next'
import { useAppPageContext } from '../../../context/appPageContext'
import {
  api,
  type AdminStats,
  type DatabaseBooking,
} from '../../../services/api'
import type {
  BookingStatus,
  PaymentStatus,
} from '../../../types'

const {
  store,
  go,
  signOut,
  price,
  formattedDate,
  showToast,
} = useAppPageContext()

const stats = ref<AdminStats | null>(null)
const adminBookings = ref<DatabaseBooking[]>([])

const loading = ref(false)
const updating = ref(false)
const loadError = ref('')
const updateError = ref('')

const bookingSearch = ref('')
const monthsToShow = ref(6)

const statusOptions: BookingStatus[] = [
  'Pending',
  'Confirmed',
  'Cancelled',
  'Completed',
]

const paymentOptions: PaymentStatus[] = [
  'Unpaid',
  'Paid',
  'Refunded',
  'Demo paid',
]

let readVersion = 0
let updateVersion = 0

function sameAccount(
  accountId: string,
  token: string | null,
): boolean {
  return (
    store.isAdmin &&
    store.user?.id === accountId &&
    localStorage.getItem('tm-token') === token
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error && !('isAxiosError' in error)
    ? error.message
    : api.getErrorMessage(error)
}

async function loadDashboard(): Promise<boolean> {
  if (
    !store.isAdmin ||
    !store.user ||
    loading.value
  ) {
    return false
  }

  const accountId = store.user.id
  const token = localStorage.getItem('tm-token')
  const version = ++readVersion

  loading.value = true
  loadError.value = ''
  updateError.value = ''

  try {
    const [
      statsResponse,
      bookingsResponse,
    ] = await Promise.all([
      api.getAdminStats(),
      api.getBookings('all'),
    ])

    if (
      !sameAccount(accountId, token) ||
      version !== readVersion
    ) {
      return false
    }

    stats.value = statsResponse.data
    adminBookings.value = bookingsResponse.data

    return true
  } catch (error) {
    if (
      sameAccount(accountId, token) &&
      version === readVersion
    ) {
      loadError.value = stats.value
        ? 'Could not refresh. The displayed figures are from the last successful load. ' +
          errorMessage(error)
        : 'Could not load the dashboard. ' +
          errorMessage(error)
    }

    return false
  } finally {
    if (version === readVersion) {
      loading.value = false
    }
  }
}

async function saveChange(
  request: () => Promise<void>,
  apply: () => void,
  message: string,
): Promise<void> {
  if (
    !store.isAdmin ||
    !store.user ||
    loading.value ||
    updating.value
  ) {
    return
  }

  const accountId = store.user.id
  const token = localStorage.getItem('tm-token')
  const version = ++updateVersion

  updating.value = true
  updateError.value = ''

  try {
    await request()

    if (
      !sameAccount(accountId, token) ||
      version !== updateVersion
    ) {
      return
    }

    apply()

    // Reload totals after the server confirms the change.
    stats.value = null

    const refreshed = await loadDashboard()

    if (
      !sameAccount(accountId, token) ||
      version !== updateVersion
    ) {
      return
    }

    if (!refreshed) {
      loadError.value =
        'Your change was saved, but the dashboard could not be refreshed. ' +
        'Use Refresh dashboard to load the latest figures.'
    }

    showToast(message)
  } catch (error) {
    if (
      sameAccount(accountId, token) &&
      version === updateVersion
    ) {
      updateError.value = errorMessage(error)
    }
  } finally {
    if (version === updateVersion) {
      updating.value = false
    }
  }
}

async function changeBookingStatus(
  booking: DatabaseBooking,
  event: Event,
): Promise<void> {
  const select = event.target

  if (!(select instanceof HTMLSelectElement)) return

  const accountId = store.user?.id
  const token = localStorage.getItem('tm-token')
  const nextStatus = select.value as BookingStatus

  if (!statusOptions.includes(nextStatus)) {
    select.value = booking.status
    return
  }

  await saveChange(
    () => api.updateBookingStatus(
      booking.id,
      nextStatus,
    ),
    () => {
      const row = adminBookings.value.find(
        item => item.id === booking.id,
      )

      if (row) {
        row.status = nextStatus
      }

      const ownBooking = store.bookings.find(
        item => item.id === booking.id,
      )

      if (ownBooking) {
        ownBooking.status = nextStatus
      }
    },
    'Booking status saved',
  )

  if (
    store.user?.id === accountId &&
    localStorage.getItem('tm-token') === token
  ) {
    select.value =
      adminBookings.value.find(
        item => item.id === booking.id,
      )?.status ?? booking.status
  }
}

async function changePaymentStatus(
  booking: DatabaseBooking,
  event: Event,
): Promise<void> {
  const select = event.target

  if (!(select instanceof HTMLSelectElement)) return

  const accountId = store.user?.id
  const token = localStorage.getItem('tm-token')
  const nextStatus = select.value as PaymentStatus

  if (!paymentOptions.includes(nextStatus)) {
    select.value = booking.paymentStatus ?? 'Unpaid'
    return
  }

  await saveChange(
    () => api.updateBookingPaymentStatus(
      booking.id,
      nextStatus,
    ),
    () => {
      const row = adminBookings.value.find(
        item => item.id === booking.id,
      )

      if (row) {
        row.paymentStatus = nextStatus
      }

      store.setPaymentStatus(
        booking.id,
        nextStatus,
      )
    },
    'Payment status saved',
  )

  if (
    store.user?.id === accountId &&
    localStorage.getItem('tm-token') === token
  ) {
    select.value =
      adminBookings.value.find(
        item => item.id === booking.id,
      )?.paymentStatus ??
      booking.paymentStatus ??
      'Unpaid'
  }
}

const filteredBookings = computed(() => {
  const query = bookingSearch.value
    .trim()
    .toLowerCase()

  if (!query) return adminBookings.value

  return adminBookings.value.filter(booking =>
    [
      booking.id,
      booking.itemName,
      booking.itemType,
      booking.userName,
      booking.userEmail,
      booking.checkIn,
      booking.checkOut,
      booking.status,
      booking.paymentStatus ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(query),
  )
})

const bookingStatuses = computed(() => {
  const definitions = [
    { status: 'Confirmed', color: '#758e6a' },
    { status: 'Pending', color: '#ddc581' },
    { status: 'Cancelled', color: '#d38a70' },
    { status: 'Completed', color: '#b8c8a0' },
  ] as const

  return definitions.map(item => {
    const count = adminBookings.value.filter(
      booking => booking.status === item.status,
    ).length

    return {
      ...item,
      count,
      percentage: adminBookings.value.length
        ? count / adminBookings.value.length * 100
        : 0,
    }
  })
})

const bookingStatusGradient = computed(() => {
  if (!adminBookings.value.length) {
    return '#e8eae4'
  }

  let offset = 0

  const segments = bookingStatuses.value.map(item => {
    const start = offset

    offset += item.percentage

    return (
      item.color +
      ' ' +
      start +
      '% ' +
      offset +
      '%'
    )
  })

  return 'conic-gradient(' + segments.join(', ') + ')'
})

const bookingBars = computed(() => {
  const now = new Date()

  const months = Array.from(
    { length: monthsToShow.value },
    (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - monthsToShow.value + 1 + index,
        1,
      )

      const count = adminBookings.value.filter(booking => {
        const created = new Date(
          booking.createdAt + 'T12:00:00',
        )

        return (
          created.getFullYear() === date.getFullYear() &&
          created.getMonth() === date.getMonth()
        )
      }).length

      return {
        key: date.getFullYear() + '-' + date.getMonth(),
        label: date.toLocaleDateString('en', {
          month: 'short',
          year: '2-digit',
        }),
        count,
      }
    },
  )

  const maximum = Math.max(
    1,
    ...months.map(month => month.count),
  )

  return months.map(month => ({
    ...month,
    height: month.count
      ? Math.max(6, month.count / maximum * 100)
      : 0,
  }))
})

const bookingsInPeriod = computed(() =>
  bookingBars.value.reduce(
    (total, month) => total + month.count,
    0,
  ),
)

function openBookingTable(): void {
  document
    .getElementById('admin-booking-table')
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
}

watch(
  [
    () => store.user,
    () => store.isAdmin,
  ],
  () => {
    readVersion++
    updateVersion++

    stats.value = null
    adminBookings.value = []
    loading.value = false
    updating.value = false
    loadError.value = ''
    updateError.value = ''
    bookingSearch.value = ''

    if (store.isAdmin && store.user) {
      void loadDashboard()
    }
  },
  { immediate: true, flush: 'sync' },
)

onUnmounted(() => {
  readVersion++
  updateVersion++
})
</script>

<template>
  <main
    v-if="store.isAdmin"
    class="content-page admin-page"
  >
    <div class="admin-header">
      <div>
        <p class="eyebrow">
          TRAVELMATE / ADMINISTRATION
        </p>

        <h1>Island operations.</h1>

        <p>
          One overview for the people, places and plans
          that make it all happen.
        </p>
      </div>

      <div class="admin-user">
        <span class="avatar">AD</span>

        <span>
          <b>{{ store.user?.name ?? 'Administrator' }}</b>
          <small>Administrator</small>
        </span>

        <button
          type="button"
          class="quiet-button"
          aria-label="Sign out"
          @click="signOut"
        >
          <ArrowUpRight :size="17" />
        </button>
      </div>
    </div>

    <div class="dashboard-toolbar">
      <p v-if="loading" role="status">
        Loading dashboard figures...
      </p>

      <p v-else-if="updating" role="status">
        Saving your change...
      </p>

      <p v-else>
        Booking overview for all travellers.
      </p>

      <button
        type="button"
        class="button button-outline button-small"
        :disabled="loading || updating"
        @click="loadDashboard"
      >
        {{
          loading
            ? 'Refreshing...'
            : 'Refresh dashboard'
        }}
      </button>
    </div>

    <div
      v-if="loadError"
      class="admin-error"
      role="alert"
    >
      <p>{{ loadError }}</p>

      <button
        type="button"
        class="text-link"
        :disabled="loading || updating"
        @click="loadDashboard"
      >
        Try again
      </button>
    </div>

    <p
      v-if="updateError"
      class="admin-error"
      role="alert"
    >
      {{ updateError }}
    </p>

    <div
      class="admin-stats"
      :aria-busy="loading"
    >
      <div>
        <span>Total bookings</span>
        <b>{{ stats?.bookings ?? '—' }}</b>
        <small>Across all reservations</small>
      </div>

      <div>
        <span>Destinations</span>
        <b>{{ stats?.destinations ?? '—' }}</b>
        <small>Available places</small>
      </div>

      <div>
        <span>Tour packages</span>
        <b>{{ stats?.packages ?? '—' }}</b>
        <small>
          {{ stats?.hotels ?? '—' }} listed stays
        </small>
      </div>

      <div>
        <span>Payments received</span>
        <b>{{ stats ? price(stats.revenue) : '—' }}</b>
        <small>Marked Paid; demo payments excluded</small>
      </div>
    </div>

    <div v-if="stats" class="admin-main-grid">
      <section class="admin-panel analytics-panel">
        <div class="subsection-heading chart-heading">
          <div>
            <p class="eyebrow">BOOKINGS BY MONTH</p>
            <h3>Booking activity</h3>
          </div>

          <label class="period-picker">
            Period

            <select
              v-model.number="monthsToShow"
              aria-label="Booking activity period"
            >
              <option :value="3">Last 3 months</option>
              <option :value="6">Last 6 months</option>
              <option :value="12">Last 12 months</option>
            </select>
          </label>
        </div>

        <div class="chart-legend">
          <span><i></i> Bookings</span>

          <b>
            {{ bookingsInPeriod }}
            <small>in this period</small>
          </b>
        </div>

        <div class="chart-scroll">
          <div
            class="bar-chart"
            :style="{
              gridTemplateColumns:
                'repeat(' + monthsToShow + ', minmax(38px, 1fr))',
              minWidth: monthsToShow * 50 + 'px',
            }"
          >
            <div
              v-for="bar in bookingBars"
              :key="bar.key"
              class="bar-column"
            >
              <span class="bar-value">
                {{ bar.count }}
              </span>

              <div class="bar-track">
                <i
                  v-if="bar.count"
                  :style="{ height: bar.height + '%' }"
                ></i>
              </div>

              <small>{{ bar.label }}</small>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-panel split-admin">
        <div class="subsection-heading">
          <div>
            <p class="eyebrow">CURRENT SNAPSHOT</p>
            <h3>Booking status</h3>
          </div>
        </div>

        <div class="status-chart">
          <div
            class="donut-chart"
            :style="{ background: bookingStatusGradient }"
          >
            <span>
              {{ adminBookings.length }}
              <small>bookings</small>
            </span>
          </div>

          <div class="status-legend">
            <span
              v-for="item in bookingStatuses"
              :key="item.status"
            >
              <i
                :style="{ background: item.color }"
              ></i>

              {{ item.status }}

              <b>
                {{ item.count }} ·
                {{ item.percentage.toFixed(0) }}%
              </b>
            </span>
          </div>
        </div>
      </section>
    </div>

    <section
      id="admin-booking-table"
      class="admin-panel admin-bookings"
      :aria-busy="loading || updating"
    >
      <div class="subsection-heading table-heading">
        <div>
          <p class="eyebrow">ALL TRAVELLERS</p>
          <h3>Bookings</h3>
        </div>

        <label class="admin-search">
          <Search :size="16" />

          <input
            v-model="bookingSearch"
            type="search"
            placeholder="Search reference, name, email or status"
            aria-label="Search bookings"
          />
        </label>
      </div>

      <p
        v-if="!loading && !loadError"
        class="table-count"
        role="status"
      >
        {{ filteredBookings.length }}
        of {{ adminBookings.length }} bookings
      </p>

      <div
        class="admin-table-wrap"
        role="region"
        aria-label="Traveller bookings table"
        tabindex="0"
      >
        <table class="admin-table">
          <thead>
            <tr>
              <th scope="col">REFERENCE</th>
              <th scope="col">LISTING / TRAVELLER</th>
              <th scope="col">DATES</th>
              <th scope="col">VALUE</th>
              <th scope="col">STATUS</th>
              <th scope="col">PAYMENT</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="booking in filteredBookings"
              :key="booking.id"
            >
              <td class="reference-cell">
                {{ booking.id }}
              </td>

              <td class="traveller-cell">
                <b>{{ booking.itemName }}</b>
                <small>
                  {{ booking.userName || 'Traveller' }}
                </small>
                <small>{{ booking.userEmail }}</small>
              </td>

              <td>
                {{ formattedDate(booking.checkIn) }}
                <br />
                {{ formattedDate(booking.checkOut) }}
              </td>

              <td>
                {{ price(booking.totalPrice) }}
              </td>

              <td>
                <select
                  :value="booking.status"
                  :disabled="loading || updating"
                  :aria-label="
                    'Booking status for ' + booking.id
                  "
                  @change="
                    changeBookingStatus(booking, $event)
                  "
                >
                  <option
                    v-for="status in statusOptions"
                    :key="status"
                    :value="status"
                  >
                    {{ status }}
                  </option>
                </select>
              </td>

              <td>
                <select
                  :value="booking.paymentStatus ?? 'Unpaid'"
                  :disabled="loading || updating"
                  :aria-label="
                    'Payment status for ' + booking.id
                  "
                  @change="
                    changePaymentStatus(booking, $event)
                  "
                >
                  <option
                    v-for="status in paymentOptions"
                    :key="status"
                    :value="status"
                    :disabled="status === 'Demo paid'"
                  >
                    {{ status }}
                  </option>
                </select>
              </td>
            </tr>

            <tr
              v-if="loading && !adminBookings.length"
            >
              <td colspan="6">
                Loading bookings...
              </td>
            </tr>

            <tr
              v-else-if="
                loadError && !adminBookings.length
              "
            >
              <td colspan="6">
                Bookings could not be loaded.
                Use Try again above.
              </td>
            </tr>

            <tr
              v-else-if="
                !loading &&
                !loadError &&
                !filteredBookings.length
              "
            >
              <td colspan="6">
                {{
                  bookingSearch.trim()
                    ? 'No matching bookings.'
                    : 'No bookings recorded yet.'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="admin-module-row">
      <button
        type="button"
        @click="go('/destinations')"
      >
        <MapPin :size="18" />
        <span>
          <b>Destinations</b>
          <small>Manage island listings</small>
        </span>
        <ArrowUpRight :size="16" />
      </button>

      <button
        type="button"
        @click="go('/hotels')"
      >
        <CalendarDays :size="18" />
        <span>
          <b>Stays</b>
          <small>Manage the hotel collection</small>
        </span>
        <ArrowUpRight :size="16" />
      </button>

      <button
        type="button"
        @click="openBookingTable"
      >
        <Users :size="18" />
        <span>
          <b>Traveller bookings</b>
          <small>Review and update reservations</small>
        </span>
        <ArrowUpRight :size="16" />
      </button>
    </div>
  </main>
</template>

<style scoped>
.admin-page,
.admin-panel,
.admin-main-grid > * {
  min-width: 0;
}

.dashboard-toolbar,
.chart-heading,
.table-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.dashboard-toolbar {
  margin-bottom: 18px;
}

.dashboard-toolbar p,
.table-count {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.admin-error {
  margin: 0 0 18px;
  padding: 14px;
  background: #fff0ec;
  color: #922b21;
  font-size: 14px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.admin-error p {
  margin: 0 0 8px;
}

.admin-stats {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.admin-stats > div {
  min-width: 0;
}

.admin-stats span,
.admin-stats small {
  font-size: 12px;
  line-height: 1.5;
}

.admin-stats b {
  font-size: clamp(20px, 2.2vw, 29px);
  overflow-wrap: anywhere;
}

.admin-user > span:nth-child(2) b {
  font-size: 13px;
}

.admin-user > span:nth-child(2) small {
  font-size: 11px;
}

.admin-user button {
  min-width: 44px;
  min-height: 44px;
}

.period-picker {
  display: grid;
  gap: 4px;
  font-size: 12px;
}

.period-picker select,
.admin-table select {
  min-height: 44px;
  padding: 8px;
  border: 1px solid #d9ddd2;
  border-radius: 4px;
  background: white;
  color: #1f302c;
  font: inherit;
  font-size: 13px;
}

.chart-scroll,
.admin-table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.bar-column small,
.bar-value {
  font-size: 11px;
}

.status-chart {
  flex-wrap: wrap;
  gap: 20px;
}

.status-legend span {
  font-size: 12px;
}

.admin-search {
  width: min(100%, 360px);
  height: auto;
  min-height: 44px;
  min-width: 0;
}

.admin-search input {
  flex: 1;
  width: 100%;
  min-width: 0;
  min-height: 42px;
  font-size: 13px;
}

.table-count {
  margin-bottom: 10px;
  color: #727c6c;
}

.admin-table {
  min-width: 960px;
}

.admin-table th {
  font-size: 11px;
}

.admin-table td {
  font-size: 13px;
  line-height: 1.6;
}

.reference-cell {
  max-width: 180px;
  white-space: normal;
  overflow-wrap: anywhere;
}

.traveller-cell {
  min-width: 200px;
  max-width: 280px;
  white-space: normal;
  overflow-wrap: anywhere;
}

.traveller-cell b,
.traveller-cell small {
  display: block;
}

.traveller-cell small {
  font-size: 12px;
}

.admin-module-row b {
  font-size: 13px;
}

.admin-module-row small {
  font-size: 12px;
}

button:disabled,
select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .admin-main-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .admin-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .admin-search {
    width: 100%;
  }

  .admin-search input,
  .period-picker select,
  .admin-table select {
    font-size: 16px;
  }

  .admin-module-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>