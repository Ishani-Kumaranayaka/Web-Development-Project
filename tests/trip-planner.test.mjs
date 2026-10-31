import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { useTravelStore } from '../frontend/src/stores/travel.ts'
import { calculateTripCost, tripDurationDays } from '../frontend/src/utils/tripPlanner.ts'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
}
axios.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { data: [] } })

function traveller() {
  setActivePinia(createPinia())
  const store = useTravelStore()
  store.user = { id: '111111111111111111111111', role: 'USER', name: 'Test', email: 'test@example.com', createdAt: '2026-10-31' }
  return store
}

test('repeated creation adds one trip and remains protected after browser-data restoration', () => {
  values.clear()
  const store = traveller()
  store.createTrip('Hello', '2026-11-03', '2026-11-06')
  store.createTrip(' hello ', '2026-11-03', '2026-11-06')
  store.createTrip('HELLO', '2026-11-03', '2026-11-06')
  assert.equal(store.trips.length, 1)
  store.addDestinationToTrip(store.trips[0].id, 'ella')
  const reloaded = traveller()
  reloaded.createTrip('Hello', '2026-11-03', '2026-11-06')
  assert.equal(reloaded.trips.length, 1)
  assert.deepEqual([...reloaded.trips[0].destinationIds], ['ella'])
})

test('different trip names or dates remain allowed and invalid inputs are rejected', () => {
  values.clear()
  const store = traveller()
  store.createTrip('Holiday', '2026-11-03', '2026-11-06')
  store.createTrip('Holiday', '2026-12-03', '2026-12-06')
  store.createTrip('Beach break', '2026-11-03', '2026-11-06')
  store.createTrip('', '2026-11-03', '2026-11-06')
  store.createTrip('Invalid', '2026-11-07', '2026-11-06')
  assert.equal(store.trips.length, 3)
})

const trip = {
  id: 'trip1', name: 'Hello', startDate: '2026-11-03', endDate: '2026-11-06',
  destinationIds: ['adams', 'ella', 'kandy'], activityIds: ['galle', 'yala'], transportMode: 'Train',
}
const destinations = [{ id: 'adams', averageCost: 1000 }, { id: 'ella', averageCost: 85 }, { id: 'kandy', averageCost: 70 }]
const activities = [{ id: 'galle', price: 32 }, { id: 'yala', price: 95 }]

test('screenshot example has a correct 1697 breakdown in the existing stored amounts', () => {
  const cost = calculateTripCost(trip, destinations, activities)
  assert.equal(cost.days, 4)
  assert.equal(cost.destinationTotal, 1540)
  assert.equal(cost.activityTotal, 127)
  assert.equal(cost.transportTotal, 30)
  assert.equal(cost.total, 1697)
  assert.equal(cost.incomplete, false)
})

test('changing transport or an entered fare updates the total', () => {
  assert.equal(calculateTripCost({ ...trip, transportMode: 'Bus' }, destinations, activities).total, 1687)
  assert.equal(calculateTripCost({ ...trip, transportCostPerTransfer: 200 }, destinations, activities).total, 2067)
  assert.equal(calculateTripCost({ ...trip, transportCostPerTransfer: 0 }, destinations, activities).transportTotal, 0)
})

test('empty plans have no estimate and unavailable prices are flagged', () => {
  const empty = calculateTripCost({ ...trip, destinationIds: [], activityIds: [] }, [], [])
  assert.equal(empty.hasSelections, false)
  assert.equal(empty.total, 0)
  const missing = calculateTripCost(trip, [], [])
  assert.equal(missing.incomplete, true)
  assert.equal(Number.isFinite(missing.total), true)
})

test('inclusive day counts handle one-day trips, leap years and invalid dates', () => {
  assert.equal(tripDurationDays('2026-11-03', '2026-11-03'), 1)
  assert.equal(tripDurationDays('2024-02-28', '2024-03-01'), 3)
  assert.equal(tripDurationDays('2026-02-30', '2026-03-01'), 0)
  assert.equal(tripDurationDays('2026-11-06', '2026-11-03'), 0)
})
