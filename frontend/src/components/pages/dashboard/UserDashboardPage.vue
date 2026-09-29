<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Compass,
  Heart,
  Star,
} from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";

const { store, destinations, go, openDetail, showToast, formattedDate } =
  useAppPageContext();
</script>

<template>
  <main class="content-page workspace-page dashboard-page">
    <div class="dashboard-welcome">
      <div>
        <p class="eyebrow">MONDAY, SEPTEMBER 28, 2026 · YOUR TRAVELMATE</p>
        <h1>
          Good morning, {{ store.user?.name.split(" ")[0] ?? "traveller" }}.
        </h1>
        <p>The island is still out there, waiting for you.</p>
      </div>
      <button class="button button-dark" @click="go('/planner')">
        Plan a new trip <ArrowRight :size="16" />
      </button>
    </div>
    <div class="stat-row">
      <button class="stat-block" @click="go('/planner')">
        <span class="stat-symbol"><Compass :size="19" /></span
        ><span class="stat-number">{{
          store.trips.length.toString().padStart(2, "0")
        }}</span
        ><span class="stat-caption">Trips planned</span
        ><ArrowUpRight :size="16" /></button
      ><button class="stat-block" @click="go('/bookings')">
        <span class="stat-symbol coral"><CalendarDays :size="19" /></span
        ><span class="stat-number">{{
          store.bookings.length.toString().padStart(2, "0")
        }}</span
        ><span class="stat-caption">Bookings</span
        ><ArrowUpRight :size="16" /></button
      ><button class="stat-block" @click="go('/wishlist')">
        <span class="stat-symbol yellow"><Heart :size="19" /></span
        ><span class="stat-number">{{
          store.wishlist.length.toString().padStart(2, "0")
        }}</span
        ><span class="stat-caption">Saved places</span
        ><ArrowUpRight :size="16" /></button
      ><button
        class="stat-block"
        @click="showToast('You have two traveller reviews')"
      >
        <span class="stat-symbol blue"><Star :size="19" /></span
        ><span class="stat-number">02</span
        ><span class="stat-caption">Your reviews</span
        ><ArrowUpRight :size="16" />
      </button>
    </div>
    <div class="dashboard-grid">
      <section class="dashboard-panel upcoming-panel">
        <div class="subsection-heading">
          <div>
            <p class="eyebrow">ON THE HORIZON</p>
            <h3>Coming up</h3>
          </div>
          <button class="text-link" @click="go('/bookings')">
            All bookings <ArrowRight :size="14" />
          </button>
        </div>
        <article
          v-for="trip in store.trips.slice(0, 2)"
          :key="trip.id"
          class="upcoming-item"
        >
          <img
            :src="
              destinations.find((item) => item.id === trip.destinationIds[0])
                ?.image ?? destinations[0].image
            "
            :alt="trip.name"
          />
          <div>
            <p class="eyebrow">
              {{ formattedDate(trip.startDate) }} —
              {{ formattedDate(trip.endDate) }}
            </p>
            <b>{{ trip.name }}</b
            ><small
              >{{ trip.destinationIds.length }} planned destinations</small
            >
          </div>
          <ArrowUpRight :size="17" />
        </article>
        <div v-if="!store.trips.length" class="empty-compact">
          Your next trip will appear here.
        </div>
      </section>
      <section class="dashboard-panel inspire-panel">
        <div class="inspire-visual">
          <img :src="destinations[5].image" alt="Wild elephants in Yala" />
          <div>
            <p class="eyebrow light">JUST FOR YOU</p>
            <h3>Wild things<br />are waiting.</h3>
            <button
              class="button button-lime"
              @click="openDetail('destination', 'yala')"
            >
              Explore Yala <ArrowRight :size="15" />
            </button>
          </div>
        </div>
        <p>Because you saved the outdoors, we think you might love this one.</p>
      </section>
    </div>
    <div class="dashboard-lower">
      <section class="dashboard-panel activity-log">
        <div class="subsection-heading">
          <div>
            <p class="eyebrow">A LITTLE RECAP</p>
            <h3>Recent activity</h3>
          </div>
        </div>
        <div class="activity-log-row">
          <span class="log-icon"><Heart :size="15" /></span>
          <p>
            You saved
            <b>{{
              destinations.find((item) => item.id === store.wishlist[0]?.itemId)
                ?.name ?? "a new place"
            }}</b>
            to your wishlist.
          </p>
          <small>Recently</small>
        </div>
        <div class="activity-log-row">
          <span class="log-icon coral"><Check :size="15" /></span>
          <p>
            Your booking for
            <b>{{ store.bookings[0]?.itemName ?? "a stay" }}</b> is
            {{ store.bookings[0]?.status.toLowerCase() ?? "pending" }}.
          </p>
          <small>{{ store.bookings[0]?.createdAt ?? "Recently" }}</small>
        </div>
      </section>
      <section class="dashboard-panel profile-card">
        <span class="avatar avatar-large">{{
          store.user?.name
            .split(" ")
            .map((name) => name[0])
            .join("")
            .slice(0, 2) ?? "TM"
        }}</span>
        <div>
          <p class="eyebrow">YOUR TRAVELMATE</p>
          <h3>{{ store.user?.name ?? "Traveller" }}</h3>
          <p>{{ store.user?.email }}</p>
        </div>
        <button
          class="quiet-button"
          aria-label="Sign out"
          title="Sign out"
          @click="
            store.user = null;
            showToast('You are signed out');
          "
        >
          <ArrowUpRight :size="17" />
        </button>
      </section>
    </div>
    <button v-if="store.isAdmin" class="admin-return" @click="go('/admin')">
      Open the admin workspace <ArrowRight :size="15" />
    </button>
  </main>
</template>
