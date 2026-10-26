<script setup lang="ts">
import { computed } from "vue";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  Search,
  Users,
} from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";
import { api } from "../../../services/api";
import type { BookingStatus, PaymentStatus } from "../../../types";

const { store, go, destinations, hotels, packages, showToast } =
  useAppPageContext();
const paidRevenue = computed(() =>
  store.bookings
    .filter((booking) => booking.paymentStatus === "Paid")
    .reduce((total, booking) => total + booking.totalPrice, 0),
);
const bookingStatuses = computed(() => {
  const statuses = ["Confirmed", "Pending", "Cancelled", "Completed"] as const;
  return statuses.map((status) => ({
    status,
    count: store.bookings.filter((booking) => booking.status === status).length,
    percentage: store.bookings.length
      ? Math.round(
          (store.bookings.filter((booking) => booking.status === status).length /
            store.bookings.length) *
            100,
        )
      : 0,
  }));
});
const bookingStatusGradient = computed(() => {
  const colors = ["#758e6a", "#ddc581", "#d38a70", "#b8c8a0"];
  let offset = 0;
  const segments = bookingStatuses.value.map((item, index) => {
    const start = offset;
    offset += item.percentage;
    return `${colors[index]} ${start}% ${offset}%`;
  });
  return offset ? `conic-gradient(${segments.join(", ")})` : "#e8eae4";
});
const bookingBars = computed(() => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const count = store.bookings.filter((booking) => {
      const createdAt = new Date(`${booking.createdAt}T12:00:00`);
      return (
        createdAt.getMonth() === date.getMonth() &&
        createdAt.getFullYear() === date.getFullYear()
      );
    }).length;
    return { label: date.toLocaleDateString("en", { month: "short" }), count };
  });
  const maximum = Math.max(1, ...months.map((month) => month.count));
  return months.map((month) => ({
    ...month,
    height: Math.max(4, (month.count / maximum) * 100),
  }));
});

async function updatePaymentStatus(id: string, status: PaymentStatus) {
  const booking = store.bookings.find((item) => item.id === id);
  if (!booking) return;
  if (/^[a-f\d]{24}$/i.test(id) && localStorage.getItem("tm-token")) {
    try {
      await api.updateBookingPaymentStatus(id, status);
    } catch (error) {
      showToast(api.getErrorMessage(error));
      return;
    }
  }
  store.setPaymentStatus(id, status);
  showToast("Payment status updated");
}

async function updateBookingStatus(id: string, status: BookingStatus) {
  const booking = store.bookings.find((item) => item.id === id);
  if (!booking) return;
  if (/^[a-f\d]{24}$/i.test(id) && localStorage.getItem("tm-token")) {
    try {
      await api.updateBookingStatus(id, status);
    } catch (error) {
      showToast(api.getErrorMessage(error));
      return;
    }
  }
  booking.status = status;
  showToast("Booking status updated");
}
</script>

<template>
  <main class="content-page admin-page">
    <div class="admin-header">
      <div>
        <p class="eyebrow">TRAVELMATE / ADMINISTRATION</p>
        <h1>Island operations.</h1>
        <p>
          One overview for the people, places and plans that make it all happen.
        </p>
      </div>
      <div class="admin-user">
        <span class="avatar">AD</span
        ><span><b>Administrator</b><small>System access</small></span
        ><button
          class="quiet-button"
          aria-label="Sign out"
          @click="
            store.user = null;
            go('/');
          "
        >
          <ArrowUpRight :size="17" />
        </button>
      </div>
    </div>
    <div class="admin-stats">
      <div>
        <span>Total bookings</span><b>{{ store.bookings.length }}</b
        ><small>Across all reservations</small>
      </div>
      <div>
        <span>Destinations</span><b>{{ destinations.length }}</b
        ><small>Available places</small>
      </div>
      <div>
        <span>Tour packages</span><b>{{ packages.length }}</b
        ><small>{{ hotels.length }} listed stays</small>
      </div>
      <div>
        <span>Payments received</span><b>{{ `$${paidRevenue.toLocaleString()}` }}</b
        ><small>Based on bookings marked paid</small>
      </div>
    </div>
    <div class="admin-main-grid">
      <section class="admin-panel analytics-panel">
        <div class="subsection-heading">
          <div>
            <p class="eyebrow">BOOKINGS BY MONTH</p>
            <h3>Booking activity</h3>
          </div>
          <span class="period-button">Last six months <ChevronDown :size="14" /></span>
        </div>
        <div class="chart-legend">
          <span><i></i> Bookings</span><b>{{ store.bookings.length }} <small>total</small></b>
        </div>
        <div class="bar-chart">
          <div
            v-for="bar in bookingBars"
            :key="bar.label"
            class="bar-column"
          >
            <span class="bar-value">{{ bar.count }}</span>
            <div class="bar-track">
              <i :style="{ height: `${bar.height}%` }"></i>
            </div>
            <small>{{ bar.label }}</small>
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
          <div class="donut-chart" :style="{ background: bookingStatusGradient }">
            <span>{{ store.bookings.length }}<small>bookings</small></span>
          </div>
          <div class="status-legend">
            <span v-for="item in bookingStatuses" :key="item.status">
              <i :class="`status-${item.status === 'Completed' ? 'complete' : item.status.toLowerCase()}`"></i>
              {{ item.status }} <b>{{ item.percentage }}%</b>
            </span>
          </div>
        </div>
      </section>
    </div>
    <section class="admin-panel admin-bookings">
      <div class="subsection-heading">
        <div>
          <p class="eyebrow">LATEST ACTIVITY</p>
          <h3>Recent bookings</h3>
        </div>
        <label class="admin-search"
          ><Search :size="15" /><input
            placeholder="Search bookings"
            aria-label="Search bookings"
        /></label>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>REFERENCE</th>
              <th>EXPERIENCE</th>
              <th>DATE</th>
              <th>VALUE</th>
              <th>STATUS</th>
              <th>PAYMENT</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="booking in store.bookings" :key="booking.id">
              <td>{{ booking.id }}</td>
              <td>{{ booking.itemName }}</td>
              <td>{{ booking.checkIn }}</td>
              <td>{{ `$${booking.totalPrice.toLocaleString()}` }}</td>
              <td>
                <select
                  :value="booking.status"
                  aria-label="Booking status"
                  @change="updateBookingStatus(booking.id, ($event.target as HTMLSelectElement).value as BookingStatus)"
                >
                  <option>Pending</option>
                  <option>Confirmed</option>
                  <option>Cancelled</option>
                  <option>Completed</option>
                </select>
              </td>
              <td>
                <select
                  :value="booking.paymentStatus ?? 'Unpaid'"
                  aria-label="Payment status"
                  @change="updatePaymentStatus(booking.id, ($event.target as HTMLSelectElement).value as PaymentStatus)"
                >
                  <option>Unpaid</option>
                  <option>Paid</option>
                  <option>Refunded</option>
                </select>
              </td>
            </tr>
            <tr v-if="!store.bookings.length"><td colspan="6">No bookings recorded yet.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    <div class="admin-module-row">
      <button @click="go('/destinations')">
        <MapPin :size="18" /><span
          ><b>Destinations</b><small>Manage island listings</small></span
        ><ArrowUpRight :size="16" /></button
      ><button @click="go('/hotels')">
        <CalendarDays :size="18" /><span
          ><b>Stays & experiences</b><small>Manage the collection</small></span
        ><ArrowUpRight :size="16" /></button
      ><button @click="go('/bookings')">
        <Users :size="18" /><span
          ><b>Traveller bookings</b
          ><small>Review and update status</small></span
        ><ArrowUpRight :size="16" />
      </button>
    </div>
  </main>
</template>
