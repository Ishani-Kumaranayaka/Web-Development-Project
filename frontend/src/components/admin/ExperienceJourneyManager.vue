<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { useAppPageContext } from '../../context/appPageContext'
import {
  activities, packages, destinations, catalogStatus,
  saveExperience, saveJourney, deleteExperience, deleteJourney,
} from '../../services/catalog'
import { api } from '../../services/api'
import type { Activity, TourPackage } from '../../types'

const props = defineProps<{ kind: 'activity' | 'package' }>()
const { store, openDetail, price } = useAppPageContext()
const isExperience = computed(() => props.kind === 'activity')
const label = computed(() => isExperience.value ? 'experience' : 'journey')
const rows = computed(() => isExperience.value ? activities : packages)
const opened = ref(false)
const editingId = ref('')
const saving = ref(false)
const error = ref('')
const message = ref('')
const formElement = ref<HTMLFormElement | null>(null)
const dialog = ref<HTMLDialogElement | null>(null)
const deleteTarget = ref<{ id: string; name: string } | null>(null)
const deleting = ref(false)
const deleteError = ref('')
const unavailable = computed(() => saving.value || deleting.value || catalogStatus.loading || !!catalogStatus.error)
const form = reactive({
  name: '', description: '', image: '', duration: '', price: 0,
  category: '', destinationId: '', rating: 0, hotelInformation: '',
  includedActivities: '', destinationIds: [] as string[],
  itinerary: [{ day: 1, place: '', detail: '' }],
})

function reset(): void {
  editingId.value = ''
  Object.assign(form, {
    name: '', description: '', image: '', duration: '', price: 0,
    category: '', destinationId: '', rating: 0, hotelInformation: '',
    includedActivities: '', destinationIds: [], itinerary: [{ day: 1, place: '', detail: '' }],
  })
}
async function openForm(item?: Activity | TourPackage): Promise<void> {
  if (!store.isAdmin || unavailable.value) return
  reset()
  if (item) {
    editingId.value = item.id
    Object.assign(form, {
      name: item.name, description: item.description, image: item.image,
      duration: item.duration, price: item.price,
    })
    if ('category' in item) {
      Object.assign(form, { category: item.category, destinationId: item.destinationId, rating: item.rating })
    } else {
      Object.assign(form, {
        hotelInformation: item.hotel,
        includedActivities: item.includedActivities.join('\n'),
        destinationIds: [...item.destinationIds],
        itinerary: item.itinerary.map(day => ({ ...day })),
      })
    }
  }
  message.value = ''
  error.value = ''
  opened.value = true
  await nextTick()
  formElement.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  formElement.value?.querySelector('input')?.focus({ preventScroll: true })
}
function cancel(): void {
  if (saving.value) return
  opened.value = false
  error.value = ''
  reset()
}
function addDay(): void {
  const nextDay = Math.max(0, ...form.itinerary.map(day => Number(day.day) || 0)) + 1
  if (nextDay <= 365) form.itinerary.push({ day: nextDay, place: '', detail: '' })
}
function moveDestination(index: number, step: number): void {
  const other = index + step
  if (other < 0 || other >= form.destinationIds.length) return
  const ids = [...form.destinationIds]
  ;[ids[index], ids[other]] = [ids[other]!, ids[index]!]
  form.destinationIds = ids
}
async function save(): Promise<void> {
  if (!store.isAdmin || unavailable.value) return
  saving.value = true
  error.value = ''
  message.value = ''
  const id = editingId.value
  try {
    const common = {
      name: form.name.trim(), description: form.description.trim(),
      image: form.image.trim(), duration: form.duration.trim(), price: Number(form.price),
    }
    if (common.name.length < 2 || common.description.length < 10 || !common.duration) {
      throw new Error('Enter a name, a description of at least 10 characters and a duration.')
    }
    if (!Number.isFinite(common.price) || common.price < 0) throw new Error('Enter a valid price of zero or more.')
    if (!/^https?:\/\//i.test(common.image)) throw new Error('Enter an HTTP or HTTPS image URL.')
    if (isExperience.value) {
      if (!destinations.some(item => item.id === form.destinationId)) throw new Error('Select an existing destination.')
      if (form.category.trim().length < 2) throw new Error('Enter a category of at least two characters.')
      await saveExperience({ ...common, category: form.category.trim(),
        destinationId: form.destinationId, rating: Number(form.rating),
      }, id || undefined)
    } else {
      if (!form.destinationIds.length) throw new Error('Choose at least one destination.')
      if (!form.itinerary.length || form.itinerary.some(day => !day.place.trim() || !day.detail.trim())) {
        throw new Error('Add at least one itinerary day with a place and description.')
      }
      if (new Set(form.itinerary.map(day => day.day)).size !== form.itinerary.length) {
        throw new Error('Give every itinerary day a different day number.')
      }
      if (form.hotelInformation.trim().length < 2) throw new Error('Enter hotel information, or state that accommodation is not included.')
      await saveJourney({ ...common, destinationIds: [...form.destinationIds],
        hotelInformation: form.hotelInformation.trim(),
        includedActivities: form.includedActivities.split('\n').map(line => line.trim()).filter(Boolean),
        itinerary: form.itinerary.map(day => ({ day: Number(day.day), place: day.place.trim(), detail: day.detail.trim() })),
      }, id || undefined)
    }
    opened.value = false
    reset()
    message.value = `${isExperience.value ? 'Experience' : 'Journey'} ${id ? 'updated' : 'created'} successfully.`
  } catch (cause: unknown) {
    error.value = cause instanceof Error && !('isAxiosError' in cause) ? cause.message : api.getErrorMessage(cause)
  } finally { saving.value = false }
}
async function requestDelete(item: Activity | TourPackage): Promise<void> {
  if (!store.isAdmin || unavailable.value) return
  deleteTarget.value = { id: item.id, name: item.name }
  deleteError.value = ''
  message.value = ''
  await nextTick()
  dialog.value?.showModal()
}
function closeDelete(): void {
  if (deleting.value) return
  dialog.value?.close()
  deleteTarget.value = null
  deleteError.value = ''
}
async function confirmDelete(): Promise<void> {
  const target = deleteTarget.value
  if (!target || deleting.value || !store.isAdmin) return
  deleting.value = true
  deleteError.value = ''
  try {
    if (isExperience.value) await deleteExperience(target.id)
    else await deleteJourney(target.id)
    if (editingId.value === target.id) cancel()
    dialog.value?.close()
    deleteTarget.value = null
    message.value = `“${target.name}” was deleted.`
  } catch (cause: unknown) { deleteError.value = api.getErrorMessage(cause) }
  finally { deleting.value = false }
}
</script>

<template>
  <section v-if="store.isAdmin" class="journey-manager" :aria-label="`Manage ${label}s`">
    <div class="manager-heading">
      <div><p class="eyebrow">ADMINISTRATION</p><h2>Manage {{ isExperience ? 'experiences' : 'journeys' }}</h2></div>
      <button type="button" class="button button-dark" :disabled="unavailable" @click="openForm()">+ Add {{ label }}</button>
    </div>
    <p v-if="message" class="manager-success" role="status">{{ message }}</p>
    <p v-if="!destinations.length && !catalogStatus.loading" class="manager-note">Add a destination first, then link your {{ label }} to it.</p>

    <form v-if="opened" ref="formElement" @submit.prevent="save">
      <h3>{{ editingId ? 'Edit' : 'New' }} {{ label }}</h3>
      <p v-if="error" class="manager-error" role="alert">{{ error }}</p>
      <fieldset :disabled="saving || deleting" class="manager-fields">
        <legend class="sr-only">{{ editingId ? 'Edit' : 'Create' }} {{ label }}</legend>
        <label>Name<input v-model="form.name" required minlength="2" maxlength="150" /></label>
        <label>Duration<input v-model="form.duration" required maxlength="150" :placeholder="isExperience ? '2 hours' : '3 days / 2 nights'" /></label>
        <label class="full">Description<textarea v-model="form.description" required minlength="10" maxlength="3000" rows="3"></textarea></label>
        <label class="full">Image URL<input v-model="form.image" type="url" required placeholder="https://example.com/photo.jpg" /></label>
        <label>Price per person (LKR)<input v-model.number="form.price" type="number" required min="0" max="1000000000" step="0.01" /></label>
        <template v-if="isExperience">
          <label>Category<input v-model="form.category" required minlength="2" maxlength="100" placeholder="Nature, Cultural, Wildlife..." /></label>
          <label>Destination<select v-model="form.destinationId" required><option disabled value="">Select a destination</option><option v-for="item in destinations" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
          <label>Rating (0–5)<input v-model.number="form.rating" type="number" required min="0" max="5" step="0.1" /></label>
        </template>
        <template v-else>
          <label>Hotel information<input v-model="form.hotelInformation" required minlength="2" maxlength="1000" placeholder="Accommodation included, or not included" /></label>
          <label class="full">Included activities — one per line<textarea v-model="form.includedActivities" rows="3" placeholder="Guided walking tour&#10;Safari"></textarea></label>
          <fieldset class="full destination-picker"><legend>Destinations</legend>
            <label v-for="item in destinations" :key="item.id" class="check-label"><input v-model="form.destinationIds" type="checkbox" :value="item.id" />{{ item.name }}</label>
          </fieldset>
          <div v-if="form.destinationIds.length" class="full route-order">
            <p>Route order</p>
            <div v-for="(id, index) in form.destinationIds" :key="id" class="route-row">
              <span>{{ index + 1 }}. {{ destinations.find(item => item.id === id)?.name ?? 'Unavailable destination' }}</span>
              <button type="button" class="button button-outline button-small" :disabled="index === 0" :aria-label="`Move stop ${index + 1} earlier`" @click="moveDestination(index, -1)">↑</button>
              <button type="button" class="button button-outline button-small" :disabled="index === form.destinationIds.length - 1" :aria-label="`Move stop ${index + 1} later`" @click="moveDestination(index, 1)">↓</button>
            </div>
          </div>
          <fieldset class="full itinerary-editor"><legend>Daily itinerary</legend>
            <div v-for="(day, index) in form.itinerary" :key="index" class="itinerary-day">
              <label>Day<input v-model.number="day.day" type="number" min="1" max="365" required /></label>
              <label>Place<input v-model="day.place" required maxlength="150" /></label>
              <label class="full">Plan<textarea v-model="day.detail" required maxlength="1500" rows="2"></textarea></label>
              <button type="button" class="text-link" :disabled="form.itinerary.length === 1" @click="form.itinerary.splice(index, 1)">Remove day</button>
            </div>
            <button type="button" class="button button-outline button-small" :disabled="form.itinerary.length >= 365" @click="addDay">+ Add day</button>
          </fieldset>
        </template>
        <div class="full manager-actions">
          <button type="submit" class="button button-dark" :disabled="saving || !destinations.length">{{ saving ? 'Saving…' : editingId ? 'Save changes' : `Create ${label}` }}</button>
          <button type="button" class="button button-outline" :disabled="saving" @click="cancel">Cancel</button>
        </div>
      </fieldset>
    </form>

    <div v-if="rows.length" class="manager-table-wrap">
      <table><caption>{{ isExperience ? 'Experiences' : 'Journeys' }} — {{ rows.length }} total</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">Duration</th><th scope="col">Price / person</th><th scope="col">Actions</th></tr></thead>
        <tbody><tr v-for="item in rows" :key="item.id">
          <th scope="row">{{ item.name }}</th><td>{{ item.duration }}</td><td>{{ price(item.price) }}</td>
          <td><div class="manager-actions">
            <button type="button" class="button button-outline button-small" :disabled="unavailable" @click="openDetail(props.kind, item.id)">View</button>
            <button type="button" class="button button-outline button-small" :disabled="unavailable" @click="openForm(item)">Edit</button>
            <button type="button" class="button button-outline button-small delete-button" :disabled="unavailable" @click="requestDelete(item)">Delete</button>
          </div></td>
        </tr></tbody>
      </table>
    </div>
    <p v-else-if="!catalogStatus.loading && !catalogStatus.error" class="manager-note">No {{ isExperience ? 'experiences' : 'journeys' }} yet. Add your first one above.</p>

    <dialog ref="dialog" class="manager-dialog" aria-labelledby="journey-delete-title" @cancel.prevent="closeDelete">
      <h2 id="journey-delete-title">Delete {{ label }}?</h2>
      <p>Delete “{{ deleteTarget?.name }}”? This action cannot be undone.</p>
      <p>Records with linked bookings, reviews or saved places are protected.</p>
      <p v-if="deleteError" class="manager-error" role="alert">{{ deleteError }}</p>
      <div class="manager-actions"><button type="button" class="button button-outline" :disabled="deleting" autofocus @click="closeDelete">Keep {{ label }}</button><button type="button" class="button button-dark" :disabled="deleting" @click="confirmDelete">{{ deleting ? 'Deleting…' : 'Delete' }}</button></div>
    </dialog>
  </section>
</template>

<style scoped>
.journey-manager { margin: 0 0 28px; padding: 24px; border: 1px solid #d9dfd2; background: #f2f5ed; }
.manager-heading, .manager-actions, .route-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.manager-heading { justify-content: space-between; }
h2, h3 { margin: 0 0 12px; }
form { margin: 24px 0; }
.manager-fields, .itinerary-day { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border: 0; margin: 0; padding: 0; min-width: 0; }
.manager-fields label { display: grid; gap: 8px; font-size: 13px; font-weight: 600; min-width: 0; }
.manager-fields input, .manager-fields textarea, .manager-fields select { box-sizing: border-box; width: 100%; padding: 12px; min-height: 44px; border: 1px solid #bac5b3; background: white; color: #1f302c; border-radius: 4px; font: inherit; }
.manager-fields textarea { resize: vertical; }
.full { grid-column: 1 / -1; }
.destination-picker, .itinerary-editor { border: 1px solid #bac5b3; padding: 16px; min-width: 0; }
.destination-picker { display: flex; gap: 14px; flex-wrap: wrap; }
.manager-fields .check-label { display: flex; align-items: center; gap: 8px; }
.manager-fields .check-label input { width: 18px; min-height: 18px; }
.route-row { margin: 8px 0; }
.route-row span { flex: 1; min-width: 120px; }
.itinerary-day { padding: 12px 0 20px; margin-bottom: 12px; border-bottom: 1px solid #d9dfd2; }
.manager-table-wrap { max-width: 100%; overflow-x: auto; margin-top: 20px; }
table { border-collapse: collapse; width: 100%; font-size: 14px; text-align: left; }
caption { text-align: left; padding: 10px 0; font-weight: 600; }
th, td { padding: 14px 10px; border-bottom: 1px solid #d9dfd2; vertical-align: top; }
td:last-child { min-width: 220px; }
.delete-button { color: #922b21; }
.manager-error { color: #922b21; padding: 12px; background: #fff0ec; }
.manager-success { color: #245034; }
.manager-note { margin-top: 18px; }
.manager-dialog { max-width: 500px; width: calc(100% - 40px); padding: 28px; box-sizing: border-box; border: 1px solid #bac5b3; color: #1f302c; }
.manager-dialog::backdrop { background: rgb(0 0 0 / 40%); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
button:disabled { opacity: .55; cursor: not-allowed; }
@media (max-width: 640px) { .journey-manager { padding: 16px; } .manager-heading { align-items: flex-start; flex-direction: column; } .manager-fields, .itinerary-day { grid-template-columns: 1fr; } }
</style>
