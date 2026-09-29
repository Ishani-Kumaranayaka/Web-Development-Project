<script setup lang="ts">
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  X,
} from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";

const {
  store,
  tripName,
  tripStart,
  tripEnd,
  destinations,
  createTrip,
  formattedDate,
  showToast,
  go,
} = useAppPageContext();
</script>

<template>
  <main class="content-page workspace-page">
    <div class="workspace-heading">
      <div>
        <p class="eyebrow">YOUR TRAVELMATE / TRIP PLANNER</p>
        <h1>Make room for<br /><em>the moments.</em></h1>
      </div>
      <p>
        One good day at a time. Start with a rough plan; leave space for the
        things you find along the way.
      </p>
    </div>
    <section class="planner-create">
      <div class="planner-create-icon"><CalendarDays :size="22" /></div>
      <div class="planner-create-copy">
        <p class="eyebrow">A NEW ADVENTURE</p>
        <h3>Where shall we begin?</h3>
      </div>
      <form class="trip-form" @submit.prevent="createTrip">
        <input
          v-model="tripName"
          required
          placeholder="Give this trip a name"
          aria-label="Trip name"
        /><label
          ><span>FROM</span
          ><input
            v-model="tripStart"
            type="date"
            required
            aria-label="Trip start date" /></label
        ><label
          ><span>TO</span
          ><input
            v-model="tripEnd"
            type="date"
            required
            aria-label="Trip end date" /></label
        ><button class="button button-dark" type="submit">
          Create trip <ArrowRight :size="16" />
        </button>
      </form>
    </section>
    <section v-if="!store.trips.length" class="empty-state">
      <Compass :size="28" />
      <h3>Your next journey starts here</h3>
      <p>Create a trip to begin building your island itinerary.</p>
    </section>
    <section v-for="trip in store.trips" :key="trip.id" class="trip-board">
      <div class="trip-board-heading">
        <div>
          <p class="eyebrow">
            {{ formattedDate(trip.startDate) }} —
            {{ formattedDate(trip.endDate) }}
          </p>
          <h2>{{ trip.name }}</h2>
        </div>
        <div class="trip-board-actions">
          <span>{{ trip.destinationIds.length }} stops</span
          ><button
            class="quiet-button"
            aria-label="Delete trip"
            title="Delete trip"
            @click="
              store.trips = store.trips.filter((item) => item.id !== trip.id);
              showToast('Trip deleted');
            "
          >
            <X :size="16" />
          </button>
        </div>
      </div>
      <div v-if="!trip.destinationIds.length" class="trip-empty">
        <p>
          Your itinerary is taking shape. Add a destination to make the first
          stop.
        </p>
        <button class="text-link" @click="go('/destinations')">
          Explore destinations <ArrowRight :size="15" />
        </button>
      </div>
      <div v-else class="timeline">
        <article
          v-for="(id, index) in trip.destinationIds"
          :key="id"
          class="timeline-stop"
        >
          <div class="timeline-marker">
            <span>{{ String(index + 1).padStart(2, "0") }}</span
            ><i></i>
          </div>
          <img
            :src="destinations.find((item) => item.id === id)?.image"
            :alt="destinations.find((item) => item.id === id)?.name"
          />
          <div class="timeline-copy">
            <p class="eyebrow">STOP {{ String(index + 1).padStart(2, "0") }}</p>
            <h3>{{ destinations.find((item) => item.id === id)?.name }}</h3>
            <p>{{ destinations.find((item) => item.id === id)?.location }}</p>
          </div>
          <button
            class="round-arrow"
            aria-label="Remove destination"
            @click="
              trip.destinationIds = trip.destinationIds.filter(
                (item) => item !== id,
              )
            "
          >
            <X :size="17" />
          </button>
        </article>
      </div>
      <div class="add-destination-row">
        <label
          ><MapPin :size="16" /><select
            aria-label="Add destination"
            @change="
              (event) => {
                const id = (event.target as HTMLSelectElement).value;
                if (id) store.addDestinationToTrip(trip.id, id);
                (event.target as HTMLSelectElement).value = '';
              }
            "
          >
            <option value="">Add a destination to this trip</option>
            <option
              v-for="destination in destinations.filter(
                (item) => !trip.destinationIds.includes(item.id),
              )"
              :key="destination.id"
              :value="destination.id"
            >
              {{ destination.name }}
            </option></select
          ><ArrowDown :size="14" /></label
        ><button class="text-link" @click="go('/destinations')">
          Browse the island <ArrowRight :size="15" />
        </button>
      </div>
    </section>
  </main>
</template>
