<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
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
import { calculateTripCost, sameTripIdentity, transportFare } from "../../../utils/tripPlanner";

const {
  store,
  tripName,
  tripStart,
  tripEnd,
  tripError,
  price,
  destinations,
  activities,
  createTrip,
  formattedDate,
  showToast,
  go,
} = useAppPageContext();

const creatingTrip = ref(false);
let submitTimer: ReturnType<typeof setTimeout> | undefined;
onUnmounted(() => { if (submitTimer) clearTimeout(submitTimer); });

const tripCosts = computed(() => new Map(store.trips.map(trip => [
  trip.id, calculateTripCost(trip, destinations, activities),
])));
function costFor(trip: Trip) {
  return tripCosts.value.get(trip.id) ?? calculateTripCost(trip, destinations, activities);
}

function submitTrip(): void {
  if (creatingTrip.value) return;
  const duplicate = store.trips.some(trip => sameTripIdentity(
    trip, tripName.value, tripStart.value, tripEnd.value,
  ));
  if (duplicate) {
    tripError.value = 'A trip with this name and these dates already exists. Add stops to the existing trip or choose a different name.';
    showToast(tripError.value);
    return;
  }
  creatingTrip.value = true;
  try { createTrip(); }
  finally {
    submitTimer = setTimeout(() => { creatingTrip.value = false; }, 600);
  }
}

function setFare(trip: Trip, event: Event): void {
  const input = event.target as HTMLInputElement;
  const amount = Number(input.value);
  if (!input.value.trim() || !Number.isFinite(amount) || amount < 0) {
    input.value = String(transportFare(trip));
    showToast('Enter a transport fare of zero or more.');
    return;
  }
  trip.transportCostPerTransfer = Math.round(amount * 100) / 100;
}

function addActivity(tripId: string, event: Event) {
  const select = event.target as HTMLSelectElement;
  if (select.value) store.addActivityToTrip(tripId, select.value);
  select.value = "";
}

function setTransport(tripId: string, event: Event) {
  const mode = (event.target as HTMLSelectElement).value as NonNullable<Trip["transportMode"]>;
  store.setTripTransport(tripId, mode);
  const trip = store.trips.find(item => item.id === tripId);
  if (trip) delete trip.transportCostPerTransfer;
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
      <form class="trip-form" @submit.prevent.stop="submitTrip">
        <input
          v-model="tripName"
          required
          minlength="2"
          maxlength="150"
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
            :min="tripStart || undefined"
            type="date"
            required
            aria-label="Trip end date" /></label
        ><button class="button button-dark" type="submit" :disabled="creatingTrip">
          {{ creatingTrip ? "Creating..." : "Create trip" }} <ArrowRight :size="16" />
        </button>
      </form>
    </section>
    <p v-if="tripError" class="trip-form-error" role="alert">{{ tripError }}</p>
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
          <span class="trip-header-cost">{{ costFor(trip).hasSelections ? "Est. " + price(costFor(trip).total) : "Add stops for an estimate" }}</span
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
      <section class="trip-budget" :aria-label="'Cost estimate for ' + trip.name">
        <div class="trip-budget-heading">
          <div>
            <p class="eyebrow">TRIP BUDGET ESTIMATE</p>
            <h3>Estimated trip cost</h3>
          </div>
          <strong class="trip-budget-total" aria-live="polite">
            {{ costFor(trip).hasSelections ? price(costFor(trip).total) : 'Add destinations or activities' }}
          </strong>
        </div>
        <dl v-if="costFor(trip).hasSelections" class="trip-budget-lines">
          <div>
            <dt>Destination budget · {{ costFor(trip).days }} {{ costFor(trip).days === 1 ? 'day' : 'days' }}</dt>
            <dd>{{ price(costFor(trip).destinationTotal) }}</dd>
          </div>
          <div><dt>Selected activities</dt><dd>{{ price(costFor(trip).activityTotal) }}</dd></div>
          <div>
            <dt>Transport · {{ costFor(trip).transfers }} {{ costFor(trip).transfers === 1 ? 'transfer' : 'transfers' }}</dt>
            <dd>{{ price(costFor(trip).transportTotal) }}</dd>
          </div>
        </dl>
        <label class="trip-fare-field" :for="'trip-fare-' + trip.id">
          Transport fare per transfer (LKR)
          <input
            :id="'trip-fare-' + trip.id"
            type="number"
            min="0"
            step="0.01"
            :value="transportFare(trip)"
            @change="setFare(trip, $event)"
          />
        </label>
        <p class="trip-budget-note">
          Destination budget uses the average daily cost of your selected stops multiplied by trip days.
          Activities are counted once. Transport uses the fare above between consecutive stops.
          Default transport fares are sample values; edit them for your trip. Changing transport mode resets the sample fare.
          Hotel accommodation is excluded. This is a planning estimate, not a bill.
        </p>
        <p v-if="costFor(trip).hasSelections && costFor(trip).incomplete" class="trip-budget-warning" role="status">
          This estimate is incomplete: check the trip dates and any unavailable destination or activity prices.
        </p>
      </section>

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
              {{ activity.name }} · {{ price(activity.price) }}
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
              {{ price(activities.find((item) => item.id === activityId)?.price ?? 0) }} ·
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

<style scoped>
.trip-form-error { padding: 14px 18px; margin: 12px 0 20px; background: #fff0ec; color: #922b21; font-size: 14px; line-height: 1.6; }
.trip-header-cost { font-size: 13px; font-weight: 600; }
.trip-budget { padding: 22px; margin: 20px 0; background: #f3f6ec; border: 1px solid #d6dfc5; border-radius: 8px; }
.trip-budget-heading { display: flex; justify-content: space-between; align-items: center; gap: 18px; }
.trip-budget-heading .eyebrow { margin: 0 0 7px; }
.trip-budget-heading h3 { margin: 0; font-size: 22px; }
.trip-budget-total { font-size: 26px; line-height: 1.3; text-align: right; overflow-wrap: anywhere; }
.trip-budget-lines { margin: 18px 0; }
.trip-budget-lines > div { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #dce3d0; }
.trip-budget-lines dt, .trip-budget-lines dd { font-size: 14px; line-height: 1.5; margin: 0; }
.trip-budget-lines dd { font-weight: 600; text-align: right; }
.trip-fare-field { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin: 16px 0 12px; font-size: 14px; }
.trip-fare-field input { box-sizing: border-box; width: 145px; min-height: 44px; padding: 10px; border: 1px solid #bec9b0; border-radius: 4px; background: white; color: inherit; font: inherit; }
.trip-budget-note, .trip-budget-warning { font-size: 12px; line-height: 1.7; margin: 12px 0 0; }
.trip-budget-warning { color: #8c4a15; font-weight: 600; }
.trip-form button:disabled { opacity: .6; cursor: wait; }
@media (max-width: 640px) {
  .trip-budget { padding: 16px; }
  .trip-budget-heading { align-items: flex-start; flex-direction: column; gap: 12px; }
  .trip-budget-total { font-size: 25px; text-align: left; }
  .trip-budget-lines dt, .trip-budget-lines dd { font-size: 13px; }
  .trip-board-actions { flex-wrap: wrap; }
}
</style>
