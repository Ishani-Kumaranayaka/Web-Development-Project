<script setup lang="ts">
import { ref } from "vue";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Heart,
  MapPin,
  Sparkles,
  Star,
} from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";
import type { CatalogKind, Destination } from "../../../types";

const {
  detailKind,
  detailId,
  currentDetail,
  hotels,
  activities,
  detailReviews,
  packages,
  toggleSave,
  price,
  go,
  openDetail,
  store,
  bookingType,
  bookingItem,
  showToast,
} = useAppPageContext();
const reviewRating = ref(5);
const reviewComment = ref("");

function submitReview() {
  const comment = reviewComment.value.trim();
  if (comment.length < 10) {
    showToast("Reviews need at least 10 characters");
    return;
  }
  if (!store.user) {
    go("/login");
    return;
  }
  store.addReview(
    detailKind.value as CatalogKind,
    detailId.value,
    reviewRating.value,
    comment,
  );
  reviewComment.value = "";
  showToast("Your review has been added");
}

function addDetailToTrip() {
  const trip = store.trips[0];
  if (!trip) {
    go("/planner");
    return;
  }
  if (detailKind.value === "activity") {
    store.addActivityToTrip(trip.id, detailId.value);
  } else {
    store.addDestinationToTrip(trip.id, detailId.value);
  }
  showToast("Added to your trip planner");
}
</script>

<template>
  <main class="detail-page">
    <template v-if="currentDetail"
      ><div class="detail-hero">
        <img :src="currentDetail.image" :alt="currentDetail.name" />
        <div class="detail-hero-shade"></div>
        <div class="detail-hero-copy">
          <p class="eyebrow light">
            TRAVELMATE / {{ detailKind.toUpperCase() }}
          </p>
          <h1>{{ currentDetail.name }}</h1>
          <p v-if="'location' in currentDetail" class="detail-location">
            <MapPin :size="16" /> {{ currentDetail.location }}
          </p>
          <p v-else class="detail-location">
            <CalendarDays :size="16" /> {{ currentDetail.duration }}
          </p>
        </div>
        <button
          v-if="!store.isAdmin"
          class="detail-save"
          @click="toggleSave(detailKind as CatalogKind, detailId)"
        >
          <Heart :size="17" /> Save
        </button>
      </div>
      <div class="detail-layout">
        <section class="detail-main">
          <div class="detail-facts">
            <span v-if="'rating' in currentDetail"
              ><Star :size="15" fill="currentColor" />
              {{ currentDetail.rating }} <small>guest rating</small></span
            ><span v-if="'bestTime' in currentDetail"
              ><CalendarDays :size="15" /> Best time:
              {{ currentDetail.bestTime }}</span
            ><span v-if="'averageCost' in currentDetail"
              >From {{ price(currentDetail.averageCost) }} / day</span
            ><span v-if="'pricePerNight' in currentDetail"
              >From {{ price(currentDetail.pricePerNight) }} / night</span
            ><span v-if="'price' in currentDetail"
              >From {{ price(currentDetail.price) }} / person</span
            >
          </div>
          <h2>A place to <em>feel something.</em></h2>
          <p class="detail-description">{{ currentDetail.description }}</p>
          <div v-if="detailKind === 'destination'" class="detail-tags">
            <span
              v-for="tag in (currentDetail as Destination).tags"
              :key="tag"
              >{{ tag }}</span
            >
          </div>
          <template v-if="detailKind === 'destination'"
            ><section class="detail-subsection">
              <div class="subsection-heading">
                <div>
                  <p class="eyebrow">MAKE YOURSELF AT HOME</p>
                  <h3>Stays nearby</h3>
                </div>
                <button class="text-link" @click="go('/hotels')">
                  All stays <ArrowRight :size="15" />
                </button>
              </div>
              <div class="mini-list">
                <button
                  v-for="hotel in hotels.filter(
                    (item) => item.destinationId === detailId,
                  )"
                  :key="hotel.id"
                  class="mini-row"
                  @click="openDetail('hotel', hotel.id)"
                >
                  <img :src="hotel.image" :alt="hotel.name" /><span
                    ><b>{{ hotel.name }}</b
                    ><small>{{ hotel.location }}</small></span
                  ><strong
                    >{{ price(hotel.pricePerNight)
                    }}<small> / night</small></strong
                  ><ArrowUpRight :size="16" />
                </button>
              </div>
            </section>
            <section class="detail-subsection">
              <div class="subsection-heading">
                <div>
                  <p class="eyebrow">GET OUT THERE</p>
                  <h3>Things to do</h3>
                </div>
                <button class="text-link" @click="go('/activities')">
                  All experiences <ArrowRight :size="15" />
                </button>
              </div>
              <div class="mini-list">
                <button
                  v-for="activity in activities.filter(
                    (item) => item.destinationId === detailId,
                  )"
                  :key="activity.id"
                  class="mini-row"
                  @click="openDetail('activity', activity.id)"
                >
                  <img :src="activity.image" :alt="activity.name" /><span
                    ><b>{{ activity.name }}</b
                    ><small
                      >{{ activity.category }} · {{ activity.duration }}</small
                    ></span
                  ><strong
                    >{{ price(activity.price) }}<small> / person</small></strong
                  ><ArrowUpRight :size="16" />
                </button>
              </div></section
          ></template>
          <template v-if="detailKind === 'package'"
            ><section class="detail-subsection">
              <div class="subsection-heading">
                <div>
                  <p class="eyebrow">THE ROUTE</p>
                  <h3>Your itinerary</h3>
                </div>
              </div>
              <div class="itinerary-list">
                <div
                  v-for="day in (currentDetail as (typeof packages)[number])
                    .itinerary"
                  :key="day.day"
                  class="itinerary-row"
                >
                  <span class="day-number">0{{ day.day }}</span>
                  <div>
                    <b>{{ day.place }}</b>
                    <p>{{ day.detail }}</p>
                  </div>
                </div>
              </div>
            </section>
            <section class="detail-subsection included-block">
              <p class="eyebrow">ALONG THE WAY</p>
              <h3>Included experiences</h3>
              <div class="detail-tags">
                <span
                  v-for="activity in (
                    currentDetail as (typeof packages)[number]
                  ).includedActivities"
                  :key="activity"
                  >{{ activity }}</span
                >
              </div>
              <p class="hotel-included">
                <Check :size="16" />
                {{ (currentDetail as (typeof packages)[number]).hotel }}
              </p>
            </section></template
          >
          <section class="detail-subsection">
            <div class="subsection-heading">
              <div>
                <p class="eyebrow">TRAVELLER NOTES</p>
                <h3>Stories from here</h3>
              </div>
            </div>
            <article
              v-for="review in detailReviews"
              :key="review.id"
              class="detail-review"
            >
              <div>
                <b>{{ review.userName }}</b
                ><span class="stars">{{ "★".repeat(review.rating) }}</span>
              </div>
              <p>{{ review.comment }}</p>
            </article>
            <p v-if="!detailReviews.length">Be the first to leave a traveler note.</p>
            <form class="review-form" @submit.prevent="submitReview">
              <label class="field-label"
                >YOUR RATING
                <select v-model.number="reviewRating" aria-label="Your rating">
                  <option
                    v-for="rating in [5, 4, 3, 2, 1]"
                    :key="rating"
                    :value="rating"
                  >
                    {{ rating }} {{ rating === 1 ? "star" : "stars" }}
                  </option>
                </select>
              </label>
              <label class="field-label"
                >YOUR NOTE
                <textarea
                  v-model="reviewComment"
                  rows="3"
                  minlength="10"
                  maxlength="1200"
                  required
                  placeholder="What should another traveler know?"
                ></textarea>
              </label>
              <button class="button button-outline" type="submit">
                Add your review <ArrowRight :size="15" />
              </button>
            </form>
          </section>
          <section class="map-block">
            <div>
              <p class="eyebrow">FIND YOUR WAY</p>
              <h3>Somewhere on the island</h3>
              <p>Local places, thoughtfully connected.</p>
            </div>
            <a
              :href="`https://www.openstreetmap.org/search?query=${encodeURIComponent('location' in currentDetail ? currentDetail.location : currentDetail.name)}`"
              target="_blank"
              rel="noreferrer"
              class="map-link"
              ><MapPin :size="16" /> Open map <ArrowUpRight :size="15"
            /></a>
          </section>
        </section>
        <aside class="detail-aside">
          <p class="eyebrow">MAKE IT YOURS</p>
          <h3>Ready when<br />you <em>are.</em></h3>
          <p>
            {{ store.isAdmin ? "Explore the details of this place or journey." : "Save this for later or make it the first stop in your trip plan." }}
          </p>
          <button
            class="button button-dark wide-button"
            @click="
              detailKind === 'hotel' || detailKind === 'package'
                ? ((bookingType = detailKind === 'hotel' ? 'Hotel' : 'Package'),
                  (bookingItem = detailId),
                  go('/bookings'))
                : addDetailToTrip()
            "
          >
            {{
              detailKind === "hotel" || detailKind === "package"
                ? "Check availability"
                : "Add to my trip"
            }}
            <ArrowRight :size="16" /></button
          ><button
            v-if="!store.isAdmin"
            class="button button-outline wide-button"
            @click="toggleSave(detailKind as CatalogKind, detailId)"
          >
            <Heart :size="16" /> Save to wishlist
          </button>
          <div class="aside-note">
            <Sparkles :size="16" /><span
              >Good journeys leave room for the unexpected.</span
            >
          </div>
        </aside>
      </div></template
    >
    <div v-else class="empty-state">
      <h2>We couldn't find that place.</h2>
      <button class="text-link" @click="go('/destinations')">
        Browse destinations <ArrowRight :size="15" />
      </button>
    </div>
  </main>
</template>
