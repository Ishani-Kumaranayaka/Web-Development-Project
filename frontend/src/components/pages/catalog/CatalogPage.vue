<script setup lang="ts">
import {
  ArrowDown,
  ArrowUpRight,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-vue-next";
import { useAppPageContext } from "../../../context/appPageContext";
import CatalogManager from "../../admin/CatalogManager.vue";

const {
  activities,
  destinations,
  hotels,
  packages,
  page,
  searchText,
  provinceFilter,
  categoryFilter,
  sortBy,
  destinationList,
  store,
  toggleSave,
  openDetail,
  price,
} = useAppPageContext();
</script>

<template>
  <main class="content-page">
    <div class="page-intro">
      <div>
        <p class="eyebrow">TRAVELMATE / {{ page.toUpperCase() }}</p>
        <h1 v-if="page === 'destinations'">
          Places that stay<br /><em>with you.</em>
        </h1>
        <h1 v-else-if="page === 'hotels'">
          Stay a little<br /><em>longer.</em>
        </h1>
        <h1 v-else-if="page === 'activities'">
          Find your<br /><em>outside.</em>
        </h1>
        <h1 v-else>Journeys, made<br /><em>meaningful.</em></h1>
      </div>
      <p class="page-intro-note">
        {{
          page === "destinations"
            ? "Small islands. Big feelings. Find the corner of Sri Lanka that feels like it was waiting for you."
            : "Locally rooted, thoughtfully paced and full of moments you could never plan."
        }}
      </p>
    </div>
    <CatalogManager v-if="page === 'destinations' || page === 'hotels'" />
    <div class="catalog-tools">
      <label class="catalog-search"
        ><Search :size="18" /><input
          v-model="searchText"
          placeholder="Search places, stays, experiences..."
          aria-label="Search catalog" /></label
      ><label v-if="page === 'destinations'" class="select-tool"
        ><MapPin :size="15" /><select
          v-model="provinceFilter"
          aria-label="Filter by province"
        >
          <option>All regions</option>
          <option v-for="province in [...new Set(destinations.map(item => item.province))].sort()" :key="province">{{ province }}</option>
        </select></label
      ><label v-if="page === 'destinations'" class="select-tool"
        ><SlidersHorizontal :size="15" /><select
          v-model="categoryFilter"
          aria-label="Filter by category"
        >
          <option>All types</option>
          <option>Mountains</option>
          <option>Culture</option>
          <option>Heritage</option>
          <option>Beach</option>
          <option>Wildlife</option>
        </select></label
      ><label class="select-tool sort-tool"
        ><ArrowDown :size="15" /><select
          v-model="sortBy"
          aria-label="Sort results"
        >
          <option>Recommended</option>
          <option>Top rated</option>
          <option>Price: low to high</option>
        </select></label
      >
    </div>
    <p class="result-count">
      {{
        page === "destinations"
          ? destinationList.length
          : page === "hotels"
            ? hotels.length
            : page === "activities"
              ? activities.length
              : packages.length
      }}
      {{ page }} <span>curated for your next trip</span>
    </p>
    <div
      v-if="page === 'destinations'"
      class="catalog-grid destination-catalog"
    >
      <article
        v-for="item in destinationList"
        :key="item.id"
        class="catalog-card"
        @click="openDetail('destination', item.id)"
      >
        <div class="catalog-image">
          <img :src="item.image" :alt="item.name" /><span class="catalog-tag">{{
            item.category
          }}</span
          ><button
            class="save-button"
            :aria-label="`Save ${item.name}`"
            @click.stop="toggleSave('destination', item.id)"
          >
            <Heart
              :size="17"
              :fill="
                store.wishlist.some(
                  (saved) =>
                    saved.kind === 'destination' && saved.itemId === item.id,
                )
                  ? 'currentColor'
                  : 'none'
              "
            />
          </button>
        </div>
        <div class="catalog-card-copy">
          <div class="catalog-location">
            <MapPin :size="13" /> {{ item.location }}
          </div>
          <div class="catalog-title-row">
            <h3>{{ item.name }}</h3>
            <span
              ><Star :size="14" fill="currentColor" /> {{ item.rating }}</span
            >
          </div>
          <p>{{ item.description }}</p>
          <div class="catalog-footer">
            <span
              >From <b>{{ price(item.averageCost) }}</b> / day</span
            ><button class="round-arrow" aria-label="View details">
              <ArrowUpRight :size="18" />
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-else-if="page === 'hotels'" class="catalog-grid">
      <article
        v-for="item in hotels.filter(
          (hotel) =>
            hotel.name.toLowerCase().includes(searchText.toLowerCase()) ||
            hotel.location.toLowerCase().includes(searchText.toLowerCase()),
        )"
        :key="item.id"
        class="catalog-card"
        @click="openDetail('hotel', item.id)"
      >
        <div class="catalog-image">
          <img :src="item.image" :alt="item.name" /><span class="catalog-tag"
            >BOUTIQUE STAY</span
          ><button
            class="save-button"
            aria-label="Save hotel"
            @click.stop="toggleSave('hotel', item.id)"
          >
            <Heart :size="17" />
          </button>
        </div>
        <div class="catalog-card-copy">
          <div class="catalog-location">
            <MapPin :size="13" /> {{ item.location }}
          </div>
          <div class="catalog-title-row">
            <h3>{{ item.name }}</h3>
            <span
              ><Star :size="14" fill="currentColor" /> {{ item.rating }}</span
            >
          </div>
          <p>{{ item.description }}</p>
          <div class="facility-list">
            {{ item.facilities.slice(0, 3).join(" · ") }}
          </div>
          <div class="catalog-footer">
            <span
              >From <b>{{ price(item.pricePerNight) }}</b> / night</span
            ><button class="round-arrow" aria-label="View hotel details">
              <ArrowUpRight :size="18" />
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-else-if="page === 'activities'" class="catalog-grid">
      <article
        v-for="item in activities.filter(
          (activity) =>
            activity.name.toLowerCase().includes(searchText.toLowerCase()) ||
            activity.category.toLowerCase().includes(searchText.toLowerCase()),
        )"
        :key="item.id"
        class="catalog-card"
        @click="openDetail('activity', item.id)"
      >
        <div class="catalog-image">
          <img :src="item.image" :alt="item.name" /><span class="catalog-tag">{{
            item.category
          }}</span
          ><button
            class="save-button"
            aria-label="Save activity"
            @click.stop="toggleSave('activity', item.id)"
          >
            <Heart :size="17" />
          </button>
        </div>
        <div class="catalog-card-copy">
          <div class="catalog-location">
            <MapPin :size="13" />
            {{
              destinations.find((place) => place.id === item.destinationId)
                ?.name
            }}
            · {{ item.duration }}
          </div>
          <div class="catalog-title-row">
            <h3>{{ item.name }}</h3>
            <span
              ><Star :size="14" fill="currentColor" /> {{ item.rating }}</span
            >
          </div>
          <p>{{ item.description }}</p>
          <div class="catalog-footer">
            <span
              >From <b>{{ price(item.price) }}</b> / person</span
            ><button class="round-arrow" aria-label="View activity details">
              <ArrowUpRight :size="18" />
            </button>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="catalog-grid package-grid">
      <article
        v-for="item in packages.filter((tour) =>
          tour.name.toLowerCase().includes(searchText.toLowerCase()),
        )"
        :key="item.id"
        class="tour-card"
        @click="openDetail('package', item.id)"
      >
        <div class="tour-image">
          <img :src="item.image" :alt="item.name" /><span class="catalog-tag">{{
            item.duration
          }}</span
          ><button
            class="save-button"
            aria-label="Save package"
            @click.stop="toggleSave('package', item.id)"
          >
            <Heart :size="17" />
          </button>
        </div>
        <div class="tour-copy">
          <p class="eyebrow">THE TRAVELMATE COLLECTION</p>
          <h3>{{ item.name }}</h3>
          <p>{{ item.description }}</p>
          <div class="tour-route">
            {{
              item.destinationIds
                .map(
                  (id) => destinations.find((place) => place.id === id)?.name,
                )
                .join(" / ")
            }}
          </div>
          <div class="catalog-footer">
            <span
              >From <b>{{ price(item.price) }}</b> / person</span
            ><button class="round-arrow" aria-label="View package details">
              <ArrowUpRight :size="18" />
            </button>
          </div>
        </div>
      </article>
    </div>
    <div
      v-if="page === 'destinations' && !destinationList.length"
      class="empty-state"
    >
      <Search :size="24" />
      <h3>No places found</h3>
      <p>Try another search or clear your filters.</p>
      <button
        class="text-link"
        @click="
          searchText = '';
          provinceFilter = 'All regions';
          categoryFilter = 'All types';
        "
      >
        Clear filters <X :size="15" />
      </button>
    </div>
  </main>
</template>
