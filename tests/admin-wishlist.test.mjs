import assert from 'node:assert/strict'
import test from 'node:test'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { useTravelStore } from '../frontend/src/stores/travel.ts'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
}
axios.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { data: [] } })
function account(role) {
  values.clear()
  setActivePinia(createPinia())
  const store = useTravelStore()
  store.user = { id: '111111111111111111111111', role, name: 'Test', email: 'test@example.com', createdAt: '2026-10-31' }
  return store
}

test('travellers can add and remove saved items', () => {
  const store = account('USER')
  store.toggleWishlist('destination', 'ella')
  assert.equal(store.wishlist.length, 1)
  assert.equal(store.wishlist[0].itemId, 'ella')
  store.toggleWishlist('destination', 'ella')
  assert.equal(store.wishlist.length, 0)
})

test('administrators cannot add or remove wishlist items', () => {
  const store = account('ADMIN')
  store.toggleWishlist('destination', 'ella')
  assert.equal(store.wishlist.length, 0)
  store.wishlist.push({ id: 'saved1', kind: 'destination', itemId: 'ella' })
  store.toggleWishlist('destination', 'ella')
  store.toggleWishlist('hotel', 'hotel1')
  assert.deepEqual(store.wishlist.map(item => item.itemId), ['ella'])
})

test('signed-out visitors cannot save wishlist items', () => {
  const store = account('USER')
  store.logout()
  store.toggleWishlist('destination', 'ella')
  assert.equal(store.wishlist.length, 0)
})
