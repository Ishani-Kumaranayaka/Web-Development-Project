<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  ArrowRight,
  CalendarDays,
  Users,
} from 'lucide-vue-next'
import { useAppPageContext } from '../../../context/appPageContext'
import { api } from '../../../services/api'

const {
  store,
  bookingType,
  bookingItem,
  bookingOptions,
  bookingStart,
  bookingEnd,
  guests,
  specialRequest,
  selectedBooking,
  bookingTotal,
  bookingNights,
  bookingError,
  price,
  bookStay,
  formattedDate,
  showToast,
} = useAppPageContext()

const cancellingId = ref('')
const cancellationError = ref('')

let cancellationVersion = 0

watch(() => store.user?.id, () => {
  cancellationVersion++
  cancellingId.value = ''
  cancellationError.value = ''
}, { flush: 'sync' })

async function cancelReservation(
  id: string,
  name: string,
): Promise<void> {
  if (
    !store.user ||
    store.bookingSaving ||
    cancellingId.value
  ) {
    return
  }

  if (
    !window.confirm(
      'Cancel your booking for "' + name + '"?',
    )
  ) {
    return
  }

  const accountId = store.user.id
  const version = ++cancellationVersion

  cancellingId.value = id
  cancellationError.value = ''

  try {
    await store.cancelBooking(id)

    if (
      store.user?.id !== accountId ||
      version !== cancellationVersion
    ) {
      return
    }

    showToast('Booking cancelled')
  } catch (error: unknown) {
    if (
      store.user?.id !== accountId ||
      version !== cancellationVersion
    ) {
      return
    }

    cancellationError.value =
      error instanceof Error && !('isAxiosError' in error)
        ? error.message
        : api.getErrorMessage(error)
  } finally {
    if (version === cancellationVersion) {
      cancellingId.value = ''
    }
  }
}

function refreshHistory(): void {
  if (
    store.bookingsLoading ||
    store.bookingSaving
  ) {
    return
  }

  cancellationError.value = ''
  void store.loadBookings()
}
</script>

<template>
  <main class="content-page workspace-page">
    <div class="workspace-heading">
      <div>
        <p class="eyebrow">YOUR TRAVELMATE / BOOKINGS</p>
        <h1>
          Consider it<br />
          <em>taken care of.</em>
        </h1>
      </div>

      <p>
        Every reservation, all in one place.
        Your next journey is getting closer.
      </p>
    </div>

    <div class="booking-layout">
      <section
        class="booking-form-panel"
        :aria-busy="store.bookingSaving"
      >
        <p class="eyebrow">MAKE A RESERVATION</p>
        <h2>Somewhere to <em>stay.</em></h2>

        <form
          class="booking-form"
          @submit.prevent="bookStay"
        >
          <fieldset
            class="booking-fields"
            :disabled="store.bookingSaving"
          >
            <legend class="booking-sr-only">
              Reservation details
            </legend>

            <label class="field-label">
              WHAT ARE YOU BOOKING?

              <select v-model="bookingType">
                <option>Hotel</option>
                <option>Package</option>
              </select>
            </label>

            <label class="field-label">
              CHOOSE YOUR {{ bookingType.toUpperCase() }}

              <select v-model="bookingItem" required>
                <option disabled value="">
                  Select a listing
                </option>

                <option
                  v-for="item in bookingOptions"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.name }}
                </option>
              </select>
            </label>

            <p
              v-if="!bookingOptions.length"
              class="booking-message"
              role="status"
            >
              {{
                bookingType === 'Package'
                  ? 'No packages are available for booking. Choose Hotel to continue.'
                  : 'No hotels are available for booking at the moment.'
              }}
            </p>

            <div class="field-row">
              <label class="field-label">
                CHECK IN

                <input
                  v-model="bookingStart"
                  type="date"
                  required
                />
              </label>

              <label class="field-label">
                CHECK OUT

                <input
                  v-model="bookingEnd"
                  type="date"
                  :min="bookingStart || undefined"
                  required
                />
              </label>
            </div>

            <div class="field-label">
              <span id="booking-guests-label">
                TRAVELLERS
              </span>

              <div
                class="stepper"
                role="group"
                aria-labelledby="booking-guests-label"
              >
                <button
                  type="button"
                  aria-label="Remove traveller"
                  :disabled="
                    store.bookingSaving || guests <= 1
                  "
                  @click="guests = Math.max(1, guests - 1)"
                >
                  −
                </button>

                <span>
                  <Users :size="16" />
                  {{ guests }}
                  {{ guests === 1 ? 'guest' : 'guests' }}
                </span>

                <button
                  type="button"
                  aria-label="Add traveller"
                  :disabled="
                    store.bookingSaving || guests >= 30
                  "
                  @click="guests = Math.min(30, guests + 1)"
                >
                  +
                </button>
              </div>
            </div>

            <label class="field-label">
              A NOTE FOR YOUR HOST

              <textarea
                v-model="specialRequest"
                rows="3"
                maxlength="1000"
                placeholder="Anything that would make your stay more comfortable?"
              ></textarea>
            </label>

            <div class="price-summary">
              <div>
                <span>
                  {{ selectedBooking?.name ?? 'Your selection' }}
                </span>

                <b>{{ price(bookingTotal) }}</b>
              </div>

              <small>
                {{
                  bookingType === 'Hotel'
                    ? bookingNights + ' nights · ' + guests + ' guests'
                    : guests + ' travellers'
                }}
                · estimated total in LKR
              </small>
            </div>

            <p
              v-if="bookingError"
              class="booking-error"
              role="alert"
            >
              {{ bookingError }}
            </p>

            <button
              class="button button-dark wide-button"
              type="submit"
              :disabled="
                store.bookingSaving ||
                !bookingOptions.length
              "
            >
              {{
                store.bookingSaving && !cancellingId
                  ? 'Saving booking...'
                  : 'Request booking'
              }}

              <ArrowRight :size="16" />
            </button>
          </fieldset>
        </form>
      </section>

      <section
        class="booking-history"
        :aria-busy="store.bookingsLoading"
      >
        <div class="subsection-heading history-heading">
          <div>
            <p class="eyebrow">YOUR TRAVEL RECORD</p>
            <h3>Booking history</h3>
          </div>

          <div class="history-heading-actions">
            <span
              v-if="
                !store.bookingsLoading &&
                !store.bookingsError
              "
              class="booking-count"
            >
              {{ store.bookings.length }} total
            </span>

            <button
              type="button"
              class="text-link"
              aria-label="Refresh booking history"
              :disabled="
                store.bookingsLoading ||
                store.bookingSaving
              "
              @click="refreshHistory"
            >
              {{
                store.bookingsLoading
                  ? 'Loading...'
                  : 'Refresh'
              }}
            </button>
          </div>
        </div>

        <p
          v-if="store.bookingsLoading"
          class="booking-message"
          role="status"
        >
          Loading your bookings...
        </p>

        <div
          v-if="store.bookingsError"
          class="booking-error"
          role="alert"
        >
          <p>{{ store.bookingsError }}</p>

          <button
            type="button"
            class="text-link"
            :disabled="
              store.bookingsLoading ||
              store.bookingSaving
            "
            @click="refreshHistory"
          >
            Try again
          </button>
        </div>

        <p
          v-if="cancellationError"
          class="booking-error"
          role="alert"
        >
          {{ cancellationError }}
        </p>

        <div
          v-if="store.bookings.length"
          class="history-list"
        >
          <article
            v-for="booking in store.bookings"
            :key="booking.id"
            class="history-row"
          >
            <div class="booking-icon">
              <CalendarDays :size="18" />
            </div>

            <div class="history-copy">
              <span>
                {{ booking.id }} · {{ booking.itemType }}
              </span>

              <b>{{ booking.itemName }}</b>

              <small>
                {{ formattedDate(booking.checkIn) }} —
                {{ formattedDate(booking.checkOut) }} ·
                {{ booking.guests }}
                {{ booking.guests === 1 ? 'guest' : 'guests' }}
              </small>

              <small>
                Payment: {{ booking.paymentStatus ?? 'Unpaid' }}
              </small>

              <small v-if="booking.specialRequests">
                Your note: {{ booking.specialRequests }}
              </small>
            </div>

            <div class="history-end">
              <span
                class="status-pill"
                :class="booking.status.toLowerCase()"
              >
                {{ booking.status }}
              </span>

              <b>{{ price(booking.totalPrice) }}</b>

              <button
                v-if="
                  booking.status === 'Pending' ||
                  booking.status === 'Confirmed'
                "
                type="button"
                class="cancel-link"
                :aria-label="
                  'Cancel booking for ' + booking.itemName
                "
                :disabled="
                  store.bookingSaving ||
                  Boolean(cancellingId)
                "
                @click="
                  cancelReservation(
                    booking.id,
                    booking.itemName,
                  )
                "
              >
                {{
                  cancellingId === booking.id
                    ? 'Cancelling...'
                    : 'Cancel booking'
                }}
              </button>
            </div>
          </article>
        </div>

        <div
          v-else-if="
            !store.bookingsLoading &&
            !store.bookingsError
          "
          class="empty-compact"
        >
          <p>
            No bookings yet.
            Make a reservation to start your travel record.
          </p>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.booking-layout {
  grid-template-columns: minmax(0, 390px) minmax(0, 1fr);
  gap: 32px;
}

.booking-form-panel,
.booking-history {
  min-width: 0;
}

.booking-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.booking-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.field-label {
  font-size: 11px;
  line-height: 1.5;
}

.field-label > input,
.field-label > select,
.field-label > textarea {
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  min-height: 44px;
  font-size: 14px;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.stepper button,
.cancel-link {
  min-width: 44px;
  min-height: 44px;
}

.booking-message {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.booking-error {
  margin: 0;
  padding: 12px;
  background: #fff0ec;
  color: #922b21;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.booking-error p {
  margin: 0 0 8px;
}

.history-heading {
  flex-wrap: wrap;
  gap: 12px;
}

.history-heading-actions {
  display: flex;
  align-items: center;
  gap: 14px;
}

.history-heading-actions .text-link {
  min-height: 44px;
}

.history-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}

.history-copy > span,
.history-copy > small {
  font-size: 12px;
  line-height: 1.6;
}

.history-copy > b,
.history-end > b {
  font-size: 14px;
}

.price-summary small {
  line-height: 1.6;
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .booking-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
}

@media (max-width: 600px) {
  .field-label > input,
  .field-label > select,
  .field-label > textarea {
    font-size: 16px;
  }

  .history-row {
    grid-template-columns: 31px minmax(0, 1fr);
  }

  .history-end {
    grid-column: 2;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
  }
}

@media (max-width: 420px) {
  .field-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>