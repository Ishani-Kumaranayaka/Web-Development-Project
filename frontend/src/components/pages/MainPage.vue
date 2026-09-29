<script setup lang="ts">
import { computed } from "vue";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Heart,
  MapPin,
  Search,
  Sparkles,
} from "lucide-vue-next";
import { activities, destinations, hotels, packages } from "../../data";
import { useTravelStore } from "../../stores/travel";
import type { CatalogKind } from "../../types";
import HeroBanner from "../home/HeroBanner.vue";

const props = defineProps<{ searchText: string }>();
const emit = defineEmits<{
  (event: "update:searchText", value: string): void;
  (event: "navigate", path: string): void;
  (event: "save", kind: CatalogKind, id: string): void;
  (event: "detail", kind: CatalogKind, id: string): void;
}>();

const store = useTravelStore();
const recommendedDestinations = computed(() =>
  destinations.filter((item) => item.id !== "yala").slice(0, 3),
);

function price(value: number): string {
  return `$${value.toLocaleString()}`;
}
</script>

<template>
  <div class="home-page">
    <HeroBanner @explore="emit('navigate', '/destinations')" />

    <section id="travel-search" class="search-band">
      <div class="search-intro">
        <span class="search-icon"><Search :size="20" /></span>
        <div>
          <strong>Where to next?</strong
          ><small>Start with a place, feeling or experience</small>
        </div>
      </div>
      <label class="search-input">
        <span>DESTINATION</span>
        <input
          :value="props.searchText"
          aria-label="Search destinations"
          placeholder="Try ‘tea country’"
          @input="
            emit('update:searchText', ($event.target as HTMLInputElement).value)
          "
          @keyup.enter="emit('navigate', '/destinations')"
        />
      </label>
      <label class="search-input"
        ><span>WHEN</span><input aria-label="Travel dates" type="date"
      /></label>
      <label class="search-input search-guests">
        <span>TRAVELLERS</span>
        <select aria-label="Travellers">
          <option>2 travellers</option>
          <option>1 traveller</option>
          <option>3 travellers</option>
          <option>4+ travellers</option>
        </select>
      </label>
      <button
        class="search-submit"
        aria-label="Search destinations"
        @click="emit('navigate', '/destinations')"
      >
        <ArrowRight :size="21" />
      </button>
    </section>

    <section class="section section-discover">
      <div class="section-heading">
        <div>
          <p class="eyebrow">A LITTLE INSPIRATION</p>
          <h2>Find your kind of <em>island.</em></h2>
        </div>
        <button class="text-link" @click="emit('navigate', '/destinations')">
          All destinations <ArrowUpRight :size="17" />
        </button>
      </div>
      <div class="destination-grid">
        <article
          v-for="(destination, index) in recommendedDestinations"
          :key="destination.id"
          class="destination-tile"
          :class="`tile-${index + 1}`"
          @click="emit('detail', 'destination', destination.id)"
        >
          <img :src="destination.image" :alt="destination.name" />
          <div class="tile-shade"></div>
          <div class="tile-top">
            <span>{{ destination.category }}</span
            ><button
              class="save-button"
              :aria-label="`Save ${destination.name}`"
              @click.stop="emit('save', 'destination', destination.id)"
            >
              <Heart
                :size="17"
                :fill="
                  store.wishlist.some(
                    (saved) =>
                      saved.kind === 'destination' &&
                      saved.itemId === destination.id,
                  )
                    ? 'currentColor'
                    : 'none'
                "
              />
            </button>
          </div>
          <div class="tile-bottom">
            <div>
              <p>{{ destination.location.split(",")[0] }}</p>
              <h3>{{ destination.name }}</h3>
            </div>
            <span class="tile-arrow"><ArrowUpRight :size="20" /></span>
          </div>
        </article>
        <article
          class="destination-tile tile-4"
          @click="emit('detail', 'destination', 'mirissa')"
        >
          <img :src="destinations[3].image" alt="Mirissa beach" />
          <div class="tile-shade"></div>
          <div class="tile-top">
            <span>Coastal days</span
            ><button
              class="save-button"
              aria-label="Save Mirissa"
              @click.stop="emit('save', 'destination', 'mirissa')"
            >
              <Heart :size="17" />
            </button>
          </div>
          <div class="tile-bottom">
            <div>
              <p>Southern Province</p>
              <h3>Mirissa</h3>
            </div>
            <span class="tile-arrow"><ArrowUpRight :size="20" /></span>
          </div>
        </article>
      </div>
    </section>

    <section class="editorial-strip">
      <div class="editorial-photo">
        <img
          :src="hotels[0].image"
          alt="A quiet boutique hotel in the tea country"
        /><span>THE ART OF STAYING AWHILE</span>
      </div>
      <div class="editorial-copy">
        <p class="eyebrow">STAYS WITH A SENSE OF PLACE</p>
        <h2>Not just a bed.<br /><em>A feeling.</em></h2>
        <p>
          Treehouse mornings, fort-town courtyards and hideaways where the view
          does all the talking. Stay somewhere that becomes part of the story.
        </p>
        <button
          class="button button-outline"
          @click="emit('navigate', '/hotels')"
        >
          Browse considered stays <ArrowRight :size="17" /></button
        ><span class="editorial-index">02 — 04</span>
      </div>
    </section>

    <section class="section experience-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">DO MORE THAN SEE IT</p>
          <h2>Come back with a <em>story.</em></h2>
        </div>
        <button class="text-link" @click="emit('navigate', '/activities')">
          Explore experiences <ArrowUpRight :size="17" />
        </button>
      </div>
      <div class="activity-grid">
        <article
          v-for="activity in activities"
          :key="activity.id"
          class="activity-card"
          @click="emit('detail', 'activity', activity.id)"
        >
          <div class="activity-photo">
            <img :src="activity.image" :alt="activity.name" /><button
              class="save-button"
              :aria-label="`Save ${activity.name}`"
              @click.stop="emit('save', 'activity', activity.id)"
            >
              <Heart :size="17" /></button
            ><span class="photo-label">{{ activity.category }}</span>
          </div>
          <div class="activity-info">
            <div>
              <h3>{{ activity.name }}</h3>
              <p>
                <MapPin :size="13" />
                {{
                  destinations.find(
                    (item) => item.id === activity.destinationId,
                  )?.name
                }}
                <span>· {{ activity.duration }}</span>
              </p>
            </div>
            <strong>{{ price(activity.price) }}<small> / person</small></strong>
          </div>
        </article>
      </div>
    </section>

    <section class="package-feature">
      <div class="package-visual">
        <img :src="packages[0].image" alt="Sri Lankan mountain scenery" /><span
          class="package-stamp"
          ><Sparkles :size="15" /> THE SIGNATURE ROUTE</span
        >
      </div>
      <div class="package-copy">
        <p class="eyebrow">MADE FOR THE IN-BETWEEN MOMENTS</p>
        <h2>
          One island.<br /><em>A hundred ways<br />to feel it.</em>
        </h2>
        <p>
          Five days, thoughtfully paced. From the first cup of Ceylon tea to the
          last light on the southern coast.
        </p>
        <div class="package-meta">
          <span><CalendarDays :size="16" /> 5 days / 4 nights</span
          ><span><MapPin :size="16" /> 4 regions</span>
        </div>
        <div class="package-action">
          <button
            class="button button-dark"
            @click="emit('detail', 'package', packages[0].id)"
          >
            Discover the journey <ArrowRight :size="17" /></button
          ><span
            >From <b>{{ price(packages[0].price) }}</b> / person</span
          >
        </div>
      </div>
    </section>

    <section class="quote-section">
      <div class="quote-mark">“</div>
      <p class="eyebrow">NOT OUR WORDS. THEIRS.</p>
      <blockquote>
        “Sri Lanka gave us the space to slow down. TravelMate gave us the
        confidence to just <em>go.</em>”
      </blockquote>
      <div class="quote-author">
        <span class="review-avatar">AR</span
        ><span
          ><b>Amelia R.</b
          ><small>Travelled the island · February 2026</small></span
        ><span class="quote-stars">★★★★★</span>
      </div>
      <div class="quote-counter">01 <span>/</span> 08</div>
    </section>
    <section class="home-cta">
      <div>
        <p class="eyebrow light">THE ISLAND IS CALLING</p>
        <h2>Your next chapter<br />starts <em>somewhere.</em></h2>
      </div>
      <button class="button button-lime" @click="emit('navigate', '/planner')">
        Build your trip <ArrowRight :size="17" />
      </button>
      <div class="cta-ornament">T</div>
    </section>
  </div>
</template>
