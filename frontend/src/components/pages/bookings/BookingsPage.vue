<script setup lang="ts">
import { ArrowRight, CalendarDays, Users } from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";

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
  price,
  bookStay,
  formattedDate,
  showToast,
} = useAppPageContext();
</script>

<template>
  <main class="content-page workspace-page">
    <div class="workspace-heading">
      <div>
        <p class="eyebrow">YOUR TRAVELMATE / BOOKINGS</p>
        <h1>Consider it<br /><em>taken care of.</em></h1>
      </div>
      <p>
        Every reservation, all in one place. Your next journey is getting
        closer.
      </p>
    </div>
    <div class="booking-layout">
      <section class="booking-form-panel">
        <p class="eyebrow">MAKE A RESERVATION</p>
        <h2>Somewhere to <em>stay.</em></h2>
        <form class="booking-form" @submit.prevent="bookStay">
          <label class="field-label"
            >WHAT ARE YOU BOOKING?<select v-model="bookingType">
              <option>Hotel</option>
              <option>Package</option>
            </select></label
          ><label class="field-label"
            >CHOOSE YOUR {{ bookingType.toUpperCase()
            }}<select v-model="bookingItem">
              <option
                v-for="item in bookingOptions"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </option>
            </select></label
          >
          <div class="field-row">
            <label class="field-label"
              >CHECK IN<input
                v-model="bookingStart"
                type="date"
                required /></label
            ><label class="field-label"
              >CHECK OUT<input v-model="bookingEnd" type="date" required
            /></label>
          </div>
          <label class="field-label"
            >TRAVELLERS
            <div class="stepper">
              <button
                type="button"
                aria-label="Remove traveller"
                @click="guests = Math.max(1, guests - 1)"
              >
                −</button
              ><span
                ><Users :size="16" /> {{ guests }}
                {{ guests === 1 ? "guest" : "guests" }}</span
              ><button
                type="button"
                aria-label="Add traveller"
                @click="guests = Math.min(12, guests + 1)"
              >
                +
              </button>
            </div></label
          ><label class="field-label"
            >A NOTE FOR YOUR HOST
            <textarea
              v-model="specialRequest"
              rows="3"
              placeholder="Anything that would make your stay more comfortable?"
            ></textarea>
          </label>
          <div class="price-summary">
            <div>
              <span>{{ selectedBooking?.name ?? "Your selection" }}</span
              ><b>{{ price(bookingTotal) }}</b>
            </div>
            <small
              >{{
                bookingType === "Hotel"
                  ? `${bookingNights} nights · ${guests} guests`
                  : `${guests} travellers`
              }}
              · no hidden fees</small
            >
          </div>
          <button class="button button-dark wide-button" type="submit">
            Request booking <ArrowRight :size="16" />
          </button>
        </form>
      </section>
      <section class="booking-history">
        <div class="subsection-heading">
          <div>
            <p class="eyebrow">YOUR TRAVEL RECORD</p>
            <h3>Booking history</h3>
          </div>
          <span class="booking-count">{{ store.bookings.length }} total</span>
        </div>
        <div v-if="store.bookings.length" class="history-list">
          <article
            v-for="booking in store.bookings"
            :key="booking.id"
            class="history-row"
          >
            <div class="booking-icon"><CalendarDays :size="18" /></div>
            <div class="history-copy">
              <span>{{ booking.id }} · {{ booking.itemType }}</span
              ><b>{{ booking.itemName }}</b
              ><small
                >{{ formattedDate(booking.checkIn) }} —
                {{ formattedDate(booking.checkOut) }} ·
                {{ booking.guests }} guests</small
              >
            </div>
            <div class="history-end">
              <span class="status-pill" :class="booking.status.toLowerCase()">{{
                booking.status
              }}</span
              ><b>{{ price(booking.totalPrice) }}</b
              ><button
                v-if="
                  booking.status === 'Pending' || booking.status === 'Confirmed'
                "
                class="cancel-link"
                @click="
                  booking.status = 'Cancelled';
                  showToast('Booking cancelled');
                "
              >
                Cancel
              </button>
            </div>
          </article>
        </div>
        <div v-else class="empty-compact"><p>No bookings yet.</p></div>
      </section>
    </div>
  </main>
</template>
