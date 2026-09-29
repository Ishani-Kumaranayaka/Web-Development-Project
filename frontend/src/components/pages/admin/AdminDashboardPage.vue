<script setup lang="ts">
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  Search,
  Users,
} from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";

const { store, go } = useAppPageContext();
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
        <span>Total travellers</span><b>1,284</b
        ><small class="growth">↑ 12.8% this month</small>
      </div>
      <div>
        <span>Destinations</span><b>42</b><small>Across 9 provinces</small>
      </div>
      <div>
        <span>Bookings</span><b>{{ 836 + store.bookings.length }}</b
        ><small class="growth">↑ 8.2% this month</small>
      </div>
      <div>
        <span>Revenue this month</span><b>$48,290</b
        ><small>+ 6.4% vs last month</small>
      </div>
    </div>
    <div class="admin-main-grid">
      <section class="admin-panel analytics-panel">
        <div class="subsection-heading">
          <div>
            <p class="eyebrow">THE LAST SIX MONTHS</p>
            <h3>Booking activity</h3>
          </div>
          <button class="period-button">2026 <ChevronDown :size="14" /></button>
        </div>
        <div class="chart-legend">
          <span><i></i> Bookings</span><b>684 <small>total</small></b>
        </div>
        <div class="bar-chart">
          <div
            v-for="(bar, index) in [42, 57, 48, 75, 64, 92]"
            :key="index"
            class="bar-column"
          >
            <span class="bar-value">{{ Math.round(bar * 6.84) }}</span>
            <div class="bar-track">
              <i :style="{ height: `${bar}%` }"></i>
            </div>
            <small>{{
              ["Apr", "May", "Jun", "Jul", "Aug", "Sep"][index]
            }}</small>
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
          <div class="donut-chart">
            <span>836<small>bookings</small></span>
          </div>
          <div class="status-legend">
            <span><i class="status-confirmed"></i> Confirmed <b>62%</b></span
            ><span><i class="status-pending"></i> Pending <b>21%</b></span
            ><span><i class="status-cancelled"></i> Cancelled <b>11%</b></span
            ><span><i class="status-complete"></i> Completed <b>6%</b></span>
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
              <th>TRAVELLER</th>
              <th>EXPERIENCE</th>
              <th>DATE</th>
              <th>VALUE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>TM-00842</td>
              <td>Amelia Roberts</td>
              <td>5-Day Sri Lanka Adventure</td>
              <td>Sep 24, 2026</td>
              <td>$1,780</td>
              <td><span class="status-pill confirmed">Confirmed</span></td>
            </tr>
            <tr>
              <td>TM-00841</td>
              <td>Lucas Chen</td>
              <td>Fort Bazaar · 3 nights</td>
              <td>Sep 23, 2026</td>
              <td>$654</td>
              <td><span class="status-pill pending">Pending</span></td>
            </tr>
            <tr>
              <td>TM-00840</td>
              <td>Nadia Perera</td>
              <td>Yala dawn safari</td>
              <td>Sep 22, 2026</td>
              <td>$190</td>
              <td><span class="status-pill completed">Completed</span></td>
            </tr>
            <tr>
              <td>TM-00839</td>
              <td>Oliver James</td>
              <td>The Southern Slowdown</td>
              <td>Sep 21, 2026</td>
              <td>$1,240</td>
              <td><span class="status-pill cancelled">Cancelled</span></td>
            </tr>
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
