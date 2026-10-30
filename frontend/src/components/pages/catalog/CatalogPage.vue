<script setup lang="ts">
import { nextTick, ref } from 'vue'
import {
  ArrowDown,
  ArrowUpRight,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-vue-next'

import { useAppPageContext } from '../../../context/appPageContext'
import CatalogManager from '../../admin/CatalogManager.vue'
import type { Destination } from '../../../types'
import {
  deleteDestination,
  deleteHotel,
} from '../../../services/catalog'
import { api } from '../../../services/api'

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
} = useAppPageContext()

const catalogManager = ref<InstanceType<typeof CatalogManager> | null>(null)
const deleteDialog = ref<HTMLDialogElement | null>(null)

type DeleteTarget = {
  id: string
  name: string
  kind: 'destination' | 'hotel'
}

const deleteTarget = ref<DeleteTarget | null>(null)
const deleting = ref(false)
const deleteError = ref('')
const catalogMessage = ref('')

async function editDestination(id: string): Promise<void> {
  if (
    !store.isAdmin ||
    deleting.value ||
    catalogManager.value?.saving
  ) {
    return
  }

  catalogMessage.value = ''
  catalogManager.value?.openEdit(id)

  await nextTick()

  const element = catalogManager.value?.$el

  if (element instanceof HTMLElement) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
}

async function requestDelete(
  item: Pick<Destination, 'id' | 'name'>,
  kind: DeleteTarget['kind'] = 'destination',
): Promise<void> {
  if (
    !store.isAdmin ||
    deleting.value ||
    catalogManager.value?.saving
  ) {
    return
  }

  deleteTarget.value = {
    id: item.id,
    name: item.name,
    kind,
  }

  deleteError.value = ''
  catalogMessage.value = ''

  await nextTick()

  if (deleteDialog.value && !deleteDialog.value.open) {
    deleteDialog.value.showModal()
  }
}

function closeDelete(): void {
  if (deleting.value) return

  deleteDialog.value?.close()
  deleteTarget.value = null
  deleteError.value = ''
}

async function confirmDelete(): Promise<void> {
  const target = deleteTarget.value

  if (!target || deleting.value || !store.isAdmin) return

  deleting.value = true
  deleteError.value = ''

  try {
    if (target.kind === 'hotel') {
      await deleteHotel(target.id)
    } else {
      await deleteDestination(target.id)

      if (catalogManager.value?.editingId === target.id) {
        catalogManager.value.cancelForm()
      }
    }

    deleteDialog.value?.close()
    deleteTarget.value = null

    catalogMessage.value = `"${target.name}" was deleted successfully.`
  } catch (cause: unknown) {
    deleteError.value = api.getErrorMessage(cause)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <main class="content-page">
    <div class="page-intro">
      <div>
        <p class="eyebrow">
          TRAVELMATE / {{ page.toUpperCase() }}
        </p>

        <h1 v-if="page === 'destinations'">
          Places that stay<br />
          <em>with you.</em>
        </h1>

        <h1 v-else-if="page === 'hotels'">
          Stay a little<br />
          <em>longer.</em>
        </h1>

        <h1 v-else-if="page === 'activities'">
          Find your<br />
          <em>outside.</em>
        </h1>

        <h1 v-else>
          Journeys, made<br />
          <em>meaningful.</em>
        </h1>
      </div>

      <p class="page-intro-note">
        {{
          page === 'destinations'
            ? 'Small islands. Big feelings. Find the corner of Sri Lanka that feels like it was waiting for you.'
            : 'Locally rooted, thoughtfully paced and full of moments you could never plan.'
        }}
      </p>
    </div>

    <CatalogManager
      v-if="page === 'destinations' || page === 'hotels'"
      ref="catalogManager"
    />

    <p
      v-if="
        store.isAdmin &&
        (page === 'destinations' || page === 'hotels') &&
        catalogMessage
      "
      class="catalog-admin-success"
      role="status"
    >
      {{ catalogMessage }}
    </p>

    <div class="catalog-tools">
      <label class="catalog-search">
        <Search :size="18" />
        <input
          v-model="searchText"
          placeholder="Search places, stays, experiences..."
          aria-label="Search catalog"
        />
      </label>

      <label v-if="page === 'destinations'" class="select-tool">
        <MapPin :size="15" />
        <select
          v-model="provinceFilter"
          aria-label="Filter by province"
        >
          <option>All regions</option>
          <option
            v-for="province in [
              ...new Set(destinations.map(item => item.province)),
            ].sort()"
            :key="province"
          >
            {{ province }}
          </option>
        </select>
      </label>

      <label v-if="page === 'destinations'" class="select-tool">
        <SlidersHorizontal :size="15" />
        <select
          v-model="categoryFilter"
          aria-label="Filter by category"
        >
          <option>All types</option>
          <option>Mountains</option>
          <option>Culture</option>
          <option>Heritage</option>
          <option>Beach</option>
          <option>Wildlife</option>
        </select>
      </label>

      <label class="select-tool sort-tool">
        <ArrowDown :size="15" />
        <select v-model="sortBy" aria-label="Sort results">
          <option>Recommended</option>
          <option>Top rated</option>
          <option>Price: low to high</option>
        </select>
      </label>
    </div>

    <p class="result-count">
      {{
        page === 'destinations'
          ? destinationList.length
          : page === 'hotels'
            ? hotels.length
            : page === 'activities'
              ? activities.length
              : packages.length
      }}
      {{ page }}
      <span>curated for your next trip</span>
    </p>

    <!-- Destinations -->
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
          <img :src="item.image" :alt="item.name" />
          <span class="catalog-tag">{{ item.category }}</span>

          <button
            type="button"
            class="save-button"
            :aria-label="`Save ${item.name}`"
            @click.stop="toggleSave('destination', item.id)"
          >
            <Heart
              :size="17"
              :fill="
                store.wishlist.some(
                  saved =>
                    saved.kind === 'destination' &&
                    saved.itemId === item.id,
                )
                  ? 'currentColor'
                  : 'none'
              "
            />
          </button>
        </div>

        <div class="catalog-card-copy">
          <div class="catalog-location">
            <MapPin :size="13" />
            {{ item.location }}
          </div>

          <div class="catalog-title-row">
            <h3>{{ item.name }}</h3>
            <span>
              <Star :size="14" fill="currentColor" />
              {{ item.rating }}
            </span>
          </div>

          <p>{{ item.description }}</p>

          <div class="catalog-footer">
            <span>
              From <b>{{ price(item.averageCost) }}</b> / day
            </span>
            <button
              type="button"
              class="round-arrow"
              aria-label="View details"
            >
              <ArrowUpRight :size="18" />
            </button>
          </div>

          <div v-if="store.isAdmin" class="catalog-admin-actions">
            <button
              type="button"
              class="catalog-admin-button"
              :disabled="deleting || catalogManager?.saving"
              :aria-label="`Edit ${item.name}`"
              @click.stop="editDestination(item.id)"
            >
              Edit
            </button>

            <button
              type="button"
              class="catalog-admin-button catalog-admin-delete"
              :disabled="deleting || catalogManager?.saving"
              :aria-label="`Delete ${item.name}`"
              @click.stop="requestDelete(item, 'destination')"
            >
              Delete
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Hotels / Stays -->
    <div v-else-if="page === 'hotels'" class="catalog-grid">
      <article
        v-for="item in hotels.filter(
          hotel =>
            hotel.name.toLowerCase().includes(searchText.toLowerCase()) ||
            hotel.location.toLowerCase().includes(searchText.toLowerCase()),
        )"
        :key="item.id"
        class="catalog-card"
        @click="openDetail('hotel', item.id)"
      >
        <div class="catalog-image">
          <img :src="item.image" :alt="item.name" />
          <span class="catalog-tag">BOUTIQUE STAY</span>

          <button
            type="button"
            class="save-button"
            aria-label="Save hotel"
            @click.stop="toggleSave('hotel', item.id)"
          >
            <Heart :size="17" />
          </button>
        </div>

        <div class="catalog-card-copy">
          <div class="catalog-location">
            <MapPin :size="13" />
            {{ item.location }}
          </div>

          <div class="catalog-title-row">
            <h3>{{ item.name }}</h3>
            <span>
              <Star :size="14" fill="currentColor" />
              {{ item.rating }}
            </span>
          </div>

          <p>{{ item.description }}</p>

          <div class="facility-list">
            {{ item.facilities.slice(0, 3).join(' · ') }}
          </div>

          <div class="catalog-footer">
            <span>
              From <b>{{ price(item.pricePerNight) }}</b> / night
            </span>
            <button
              type="button"
              class="round-arrow"
              aria-label="View hotel details"
            >
              <ArrowUpRight :size="18" />
            </button>
          </div>

          <div v-if="store.isAdmin" class="catalog-admin-actions">
            <button
              type="button"
              class="catalog-admin-button catalog-admin-delete"
              :disabled="deleting || catalogManager?.saving"
              :aria-label="`Delete ${item.name}`"
              @click.stop="requestDelete(item, 'hotel')"
            >
              Delete hotel
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Activities -->
    <div v-else-if="page === 'activities'" class="catalog-grid">
      <article
        v-for="item in activities.filter(
          activity =>
            activity.name.toLowerCase().includes(searchText.toLowerCase()) ||
            activity.category.toLowerCase().includes(searchText.toLowerCase()),
        )"
        :key="item.id"
        class="catalog-card"
        @click="openDetail('activity', item.id)"
      >
        <div class="catalog-image">
          <img :src="item.image" :alt="item.name" />
          <span class="catalog-tag">{{ item.category }}</span>

          <button
            type="button"
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
              destinations.find(
                place => place.id === item.destinationId,
              )?.name
            }}
            · {{ item.duration }}
          </div>

          <div class="catalog-title-row">
            <h3>{{ item.name }}</h3>
            <span>
              <Star :size="14" fill="currentColor" />
              {{ item.rating }}
            </span>
          </div>

          <p>{{ item.description }}</p>

          <div class="catalog-footer">
            <span>
              From <b>{{ price(item.price) }}</b> / person
            </span>
            <button
              type="button"
              class="round-arrow"
              aria-label="View activity details"
            >
              <ArrowUpRight :size="18" />
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- Packages -->
    <div v-else class="catalog-grid package-grid">
      <article
        v-for="item in packages.filter(
          tour => tour.name.toLowerCase().includes(searchText.toLowerCase()),
        )"
        :key="item.id"
        class="tour-card"
        @click="openDetail('package', item.id)"
      >
        <div class="tour-image">
          <img :src="item.image" :alt="item.name" />
          <span class="catalog-tag">{{ item.duration }}</span>

          <button
            type="button"
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
                  id => destinations.find(
                    place => place.id === id,
                  )?.name,
                )
                .join(' / ')
            }}
          </div>

          <div class="catalog-footer">
            <span>
              From <b>{{ price(item.price) }}</b> / person
            </span>
            <button
              type="button"
              class="round-arrow"
              aria-label="View package details"
            >
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
        type="button"
        class="text-link"
        @click="
          searchText = '';
          provinceFilter = 'All regions';
          categoryFilter = 'All types';
        "
      >
        Clear filters
        <X :size="15" />
      </button>
    </div>

    <!-- Shared delete confirmation -->
    <dialog
      v-if="store.isAdmin"
      ref="deleteDialog"
      class="destination-delete-dialog"
      aria-labelledby="catalog-delete-title"
      aria-describedby="catalog-delete-description"
      @cancel.prevent="closeDelete"
    >
      <h2 id="catalog-delete-title">
        Delete {{ deleteTarget?.kind === 'hotel' ? 'hotel' : 'destination' }}?
      </h2>

      <p id="catalog-delete-description">
        Are you sure you want to delete
        <strong>{{ deleteTarget?.name }}</strong>?
        This action cannot be undone.
      </p>

      <p
        v-if="deleteError"
        class="catalog-admin-error"
        role="alert"
      >
        {{ deleteError }}
      </p>

      <div class="delete-dialog-actions">
        <button
          type="button"
          class="catalog-admin-button"
          :disabled="deleting"
          autofocus
          @click="closeDelete"
        >
          Cancel
        </button>

        <button
          type="button"
          class="catalog-admin-button catalog-admin-delete"
          :disabled="deleting"
          @click="confirmDelete"
        >
          {{
            deleting
              ? 'Deleting...'
              : deleteTarget?.kind === 'hotel'
                ? 'Delete hotel'
                : 'Delete destination'
          }}
        </button>
      </div>
    </dialog>
  </main>
</template>

<style scoped>
.catalog-admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #d9dfd2;
}

.catalog-admin-button {
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid #bac5b3;
  border-radius: 4px;
  background: white;
  color: #1f302c;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.catalog-admin-button:hover:not(:disabled) {
  background: #edf2e8;
}

.catalog-admin-delete {
  border-color: #b6372b;
  color: #a12c22;
}

.catalog-admin-delete:hover:not(:disabled) {
  background: #fff0ec;
}

.catalog-admin-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.catalog-admin-success {
  margin: 0 0 20px;
  padding: 14px;
  background: #edf7ee;
  color: #245034;
}

.catalog-admin-error {
  padding: 12px;
  background: #fff0ec;
  color: #922b21;
}

.destination-delete-dialog {
  box-sizing: border-box;
  width: min(480px, calc(100% - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  padding: 24px;
  border: 1px solid #d9dfd2;
  border-radius: 8px;
  background: white;
  color: #1f302c;
}

.destination-delete-dialog::backdrop {
  background: rgb(0 0 0 / 45%);
}

.destination-delete-dialog h2 {
  margin: 0 0 14px;
  font-size: 22px;
}

.destination-delete-dialog p {
  line-height: 1.6;
}

.delete-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}
</style>