<script setup lang="ts">
import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Compass,
  MapPin,
  Sparkles,
  X,
} from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";
import type { Trip } from "../../../types";

const {
  store,
  tripName,
  tripStart,
  tripEnd,
  destinations,
  activities,
  createTrip,
  formattedDate,
  showToast,
  go,
} = useAppPageContext();

function estimateTripCost(trip: Trip): number {
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        86400000,
    ) + 1,
  );
  const dailyCosts = trip.destinationIds
    .map((id) => destinations.find((destination) => destination.id === id)?.averageCost)
    .filter((cost): cost is number => cost !== undefined);
  const dailyDestinationCost = dailyCosts.length
    ? dailyCosts.reduce((total, cost) => total + cost, 0) / dailyCosts.length
    : 0;
  const activityCost = (trip.activityIds ?? []).reduce(
    (total, id) => total + (activities.find((activity) => activity.id === id)?.price ?? 0),
    0,
  );
  const farePerTransfer = { Train: 15, Bus: 10, "Private car": 55 };
  const transferCost =
    Math.max(0, trip.destinationIds.length - 1) *
    farePerTransfer[trip.transportMode ?? "Train"];
  return Math.round(dailyDestinationCost * days + activityCost + transferCost);
}

function addActivity(tripId: string, event: Event) {
  const select = event.target as HTMLSelectElement;
  if (select.value) store.addActivityToTrip(tripId, select.value);
  select.value = "";
}

function setTransport(tripId: string, event: Event) {
  const mode = (event.target as HTMLSelectElement).value as NonNullable<Trip["transportMode"]>;
  store.setTripTransport(tripId, mode);
}
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
          <span>{{ trip.destinationIds.length }} stops</span>
          <span>Est. ${{ estimateTripCost(trip).toLocaleString() }}</span
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
          ><Sparkles :size="16" /><select
            aria-label="Add activity"
            @change="addActivity(trip.id, $event)"
          >
            <option value="">Add an activity</option>
            <option
              v-for="activity in activities.filter(
                (item) => !(trip.activityIds ?? []).includes(item.id),
              )"
              :key="activity.id"
              :value="activity.id"
            >
              {{ activity.name }} · ${{ activity.price }}
            </option></select
          ><ArrowDown :size="14" /></label
        ><label
          >TRANSPORT
          <select
            :value="trip.transportMode ?? 'Train'"
            aria-label="Transport mode"
            @change="setTransport(trip.id, $event)"
          >
            <option>Train</option>
            <option>Bus</option>
            <option>Private car</option>
          </select>
        </label>
      </div>
      <div v-if="trip.activityIds?.length" class="timeline">
        <article
          v-for="activityId in trip.activityIds"
          :key="activityId"
          class="timeline-stop"
        >
          <div class="timeline-marker"><Sparkles :size="14" /></div>
          <img
            :src="activities.find((item) => item.id === activityId)?.image"
            :alt="activities.find((item) => item.id === activityId)?.name"
          />
          <div class="timeline-copy">
            <p class="eyebrow">ACTIVITY</p>
            <h3>{{ activities.find((item) => item.id === activityId)?.name }}</h3>
            <p>
              ${{ activities.find((item) => item.id === activityId)?.price }} ·
              {{ activities.find((item) => item.id === activityId)?.duration }}
            </p>
          </div>
          <button
            class="round-arrow"
            aria-label="Remove activity"
            @click="store.removeActivityFromTrip(trip.id, activityId)"
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
