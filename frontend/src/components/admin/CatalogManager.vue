<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAppPageContext } from '../../context/appPageContext'
import {
  addDestination, addHotel, catalogStatus, destinations,
} from '../../services/catalog'
import { api } from '../../services/api'

const { store, page, go, searchText, provinceFilter, categoryFilter } = useAppPageContext()
const isHotel = computed(() => page.value === 'hotels')
const opened = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')
const form = reactive({
  name: '', description: '', location: '', image: '',
  province: '', category: '', bestTime: '', averageCost: 0,
  pricePerNight: 0, facilities: '', destinationId: '',
})
const provinces = ['Western', 'Central', 'Southern', 'Northern', 'Eastern',
  'North Western', 'North Central', 'Uva', 'Sabaragamuwa']
const categories = ['Mountains', 'Culture', 'Heritage', 'Beach', 'Wildlife']

function resetForm(): void {
  Object.assign(form, {
    name: '', description: '', location: '', image: '',
    province: '', category: '', bestTime: '', averageCost: 0,
    pricePerNight: 0, facilities: '', destinationId: '',
  })
}

function openForm(): void {
  resetForm()
  error.value = ''
  success.value = ''
  opened.value = true
}

watch(page, () => {
  opened.value = false
  error.value = ''
  success.value = ''
})

async function save(): Promise<void> {
  if (saving.value || !store.isAdmin) return
  saving.value = true
  error.value = ''
  success.value = ''
  const hotelMode = isHotel.value
  try {
    const common = {
      name: form.name.trim(), description: form.description.trim(),
      location: form.location.trim(), image: form.image.trim(),
    }
    if (common.name.length < 2 || common.location.length < 2 ||
        common.description.length < 10) {
      throw new Error('Use at least 2 characters for the name and location, and 10 for the description.')
    }
    const amount = Number(hotelMode ? form.pricePerNight : form.averageCost)
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error('Enter a valid price of zero or more.')
    }
    if (hotelMode) {
      if (!destinations.some(item => item.id === form.destinationId)) {
        throw new Error('Select a destination from the list.')
      }
      await addHotel({
        ...common, pricePerNight: amount, destinationId: form.destinationId,
        facilities: form.facilities.split(',').map(item => item.trim()).filter(Boolean),
      })
    } else {
      await addDestination({
        ...common, province: form.province, category: form.category,
        bestTime: form.bestTime.trim(), averageCost: amount,
      })
    }
    searchText.value = ''
    if (!hotelMode) {
      provinceFilter.value = 'All regions'
      categoryFilter.value = 'All types'
    }
    success.value = hotelMode ? 'Hotel added successfully.' : 'Destination added successfully.'
    resetForm()
    opened.value = false
  } catch (cause) {
    error.value = cause instanceof Error && !('isAxiosError' in cause)
      ? cause.message : api.getErrorMessage(cause)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section v-if="store.isAdmin" class="catalog-manager" aria-label="Manage catalog">
    <div class="manager-heading">
      <div>
        <p class="eyebrow">ADMINISTRATION</p>
        <h2>{{ isHotel ? 'Manage stays' : 'Manage destinations' }}</h2>
      </div>
      <button v-if="!opened" type="button" class="button button-dark"
        :disabled="catalogStatus.loading || Boolean(catalogStatus.error)"
        @click="openForm">
        {{ isHotel ? '+ Add hotel' : '+ Add destination' }}
      </button>
      <button v-else type="button" class="button button-outline" :disabled="saving"
        @click="opened = false; error = ''">Cancel</button>
    </div>

    <p v-if="success" class="manager-success" role="status">{{ success }}</p>

    <form v-if="opened" @submit.prevent="save">
      <p v-if="isHotel && !destinations.length" class="manager-message">
        Create a destination before adding a hotel.
        <button type="button" class="text-link" @click="go('/destinations')">Go to destinations</button>
      </p>
      <p v-if="error" class="manager-error" role="alert">{{ error }}</p>
      <fieldset :disabled="saving" class="manager-fields">
        <legend class="sr-label">{{ isHotel ? 'New hotel' : 'New destination' }}</legend>
        <label>Name<input v-model="form.name" required minlength="2" maxlength="150" /></label>
        <label>Location<input v-model="form.location" required minlength="2" maxlength="150" placeholder="City or area" /></label>
        <label class="full">Description<textarea v-model="form.description" required minlength="10" maxlength="3000" rows="3"></textarea></label>
        <label class="full">Image URL<input v-model="form.image" type="url" required placeholder="https://example.com/photo.jpg" /></label>

        <template v-if="!isHotel">
          <label>Province<select v-model="form.province" required>
            <option disabled value="">Select a province</option>
            <option v-for="province in provinces" :key="province">{{ province }}</option>
          </select></label>
          <label>Category<select v-model="form.category" required>
            <option disabled value="">Select a category</option>
            <option v-for="category in categories" :key="category">{{ category }}</option>
          </select></label>
          <label>Best time to visit<input v-model="form.bestTime" required placeholder="December to April" /></label>
          <label>Average cost per day (USD)<input v-model.number="form.averageCost" type="number" required min="0" step="0.01" /></label>
        </template>

        <template v-else>
          <label>Destination<select v-model="form.destinationId" required>
            <option disabled value="">Select a destination</option>
            <option v-for="destination in destinations" :key="destination.id" :value="destination.id">{{ destination.name }}</option>
          </select></label>
          <label>Price per night (USD)<input v-model.number="form.pricePerNight" type="number" required min="0" step="0.01" /></label>
          <label class="full">Facilities, separated by commas<input v-model="form.facilities" placeholder="Wi-Fi, Pool, Breakfast" /></label>
        </template>

        <div class="full">
          <button type="submit" class="button button-dark"
            :disabled="saving || (isHotel && !destinations.length)">
            {{ saving ? 'Saving...' : isHotel ? 'Save hotel' : 'Save destination' }}
          </button>
        </div>
      </fieldset>
    </form>
  </section>
</template>

<style scoped>
.catalog-manager { margin: 0 0 28px; padding: 24px; border: 1px solid #d9dfd2; background: #f2f5ed; }
.manager-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.manager-heading .eyebrow { margin-bottom: 6px; }
.manager-heading h2 { margin: 0; font-size: 22px; }
.manager-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; border: 0; padding: 24px 0 0; margin: 0; min-width: 0; }
.manager-fields label { display: grid; gap: 8px; font-size: 13px; font-weight: 600; min-width: 0; }
.manager-fields input, .manager-fields textarea, .manager-fields select { width: 100%; padding: 12px; min-height: 44px; border: 1px solid #bac5b3; background: white; color: #1f302c; border-radius: 4px; font: inherit; }
.manager-fields textarea { resize: vertical; }
.manager-fields .full { grid-column: 1 / -1; }
.manager-error { color: #922b21; padding: 12px; background: #fff0ec; }
.manager-success { color: #245034; margin-bottom: 0; }
.manager-message { font-size: 14px; }
.sr-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
button:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 640px) { .catalog-manager { padding: 18px; } .manager-heading { align-items: flex-start; flex-direction: column; } .manager-fields { grid-template-columns: 1fr; } }
</style>
