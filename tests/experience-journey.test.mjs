import assert from 'node:assert/strict'
import test from 'node:test'
import express from 'express'
import { Prisma } from '@prisma/client'
import { createExperienceJourneyRouter } from '../backend/server/experienceJourneys.ts'

const destination1 = '111111111111111111111111'
const destination2 = '222222222222222222222222'
const missing = '999999999999999999999999'
const experience = { name: 'Forest walk', description: 'A guided walk through the forest.', category: 'Nature', duration: '2 hours', price: 2500, image: 'https://example.com/walk.jpg', destinationId: destination1, rating: 4.5 }
const journey = { name: 'Hill country escape', description: 'A three day escape through the hills.', duration: '3 days', price: 45000, image: 'https://example.com/hills.jpg', destinationIds: [destination2, destination1], includedActivities: ['Guided walk'], hotelInformation: 'Two nights in a guesthouse', itinerary: [{ day: 2, place: 'Ella', detail: 'A guided walk.' }, { day: 1, place: 'Kandy', detail: 'Explore the lake.' }] }

function fakeDatabase() {
  let state = { activities: [], packages: [], links: [], reviews: [], wishlist: [], bookings: [] }
  let sequence = 100
  const id = () => (++sequence).toString(16).padStart(24, '0')
  const matches = (item, where) => Object.entries(where).every(([key, value]) => item[key] === value)
  const missingRecord = () => new Prisma.PrismaClientKnownRequestError('Missing', { code: 'P2025', clientVersion: 'test' })
  const find = (key, where) => {
    const item = state[key].find(item => matches(item, where))
    if (!item) throw missingRecord()
    return item
  }
  const withLinks = item => ({ ...structuredClone(item), destinations: state.links.filter(link => link.packageId === item.id).sort((a, b) => a.order - b.order) })
  const linksFor = (packageId, data) => {
    if (data.deleteMany) state.links = state.links.filter(link => link.packageId !== packageId)
    for (const link of data.create ?? []) state.links.push({ id: id(), packageId, destinationId: link.destination.connect.id, order: link.order })
  }
  const db = {
    destination: { count: async ({ where }) => where.id.in.filter(id => [destination1, destination2].includes(id)).length },
    activity: {
      findMany: async () => structuredClone(state.activities),
      findUniqueOrThrow: async ({ where }) => structuredClone(find('activities', where)),
      create: async ({ data }) => { const item = { id: id(), rating: 0, ...data }; state.activities.push(item); return structuredClone(item) },
      update: async ({ where, data }) => { const item = find('activities', where); Object.assign(item, data); return structuredClone(item) },
      delete: async ({ where }) => { find('activities', where); state.activities = state.activities.filter(item => !matches(item, where)) },
    },
    tourPackage: {
      findMany: async () => state.packages.map(withLinks),
      findUniqueOrThrow: async ({ where }) => withLinks(find('packages', where)),
      create: async ({ data }) => { const { destinations, ...fields } = data; const item = { id: id(), ...fields }; state.packages.push(item); linksFor(item.id, destinations); return withLinks(item) },
      update: async ({ where, data }) => { const item = find('packages', where); const { destinations, ...fields } = data; Object.assign(item, fields); if (destinations) linksFor(item.id, destinations); return withLinks(item) },
      delete: async ({ where }) => { find('packages', where); state.packages = state.packages.filter(item => !matches(item, where)) },
    },
    packageDestination: { deleteMany: async ({ where }) => { state.links = state.links.filter(item => !matches(item, where)) } },
    review: { count: async ({ where }) => state.reviews.filter(item => matches(item, where)).length },
    wishlist: { count: async ({ where }) => state.wishlist.filter(item => matches(item, where)).length },
    booking: { count: async ({ where }) => state.bookings.filter(item => matches(item, where)).length },
    $transaction: async callback => {
      const before = structuredClone(state)
      try { return await callback(db) } catch (error) { state = before; throw error }
    },
  }
  return { db, get state() { return state } }
}

async function fixture(t) {
  const fake = fakeDatabase()
  const app = express()
  app.use(express.json())
  // Test middleware exercises the router's authentication hooks without live accounts.
  const auth = (req, res, next) => req.headers['x-test-role'] ? next() : res.status(401).json({ message: 'Authentication required' })
  const admin = (req, res, next) => req.headers['x-test-role'] === 'ADMIN' ? next() : res.status(403).json({ message: 'Administrator access required' })
  app.use('/api', createExperienceJourneyRouter(fake.db, auth, admin))
  app.use((error, _req, res, _next) => res.status(error.code === 'P2025' ? 404 : 500).json({ message: error.message }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections() }))
  const request = async (method, path, body, role = 'ADMIN') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'content-type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    return { status: response.status, body: response.status === 204 ? null : await response.json() }
  }
  return { fake, request }
}

test('public catalogues support empty lists; all mutations require administrator middleware', async t => {
  const { fake, request } = await fixture(t)
  for (const route of ['/activities', '/packages']) {
    assert.deepEqual((await request('GET', route, undefined, null)).body.data, [])
    for (const [method, path] of [['POST', route], ['PATCH', `${route}/${missing}`], ['DELETE', `${route}/${missing}`]]) {
      assert.equal((await request(method, path, {}, null)).status, 401)
      assert.equal((await request(method, path, {}, 'USER')).status, 403)
    }
  }
  assert.equal(fake.state.activities.length + fake.state.packages.length, 0)
})

test('admin creates, reads, edits and deletes an experience through HTTP', async t => {
  const { fake, request } = await fixture(t)
  const created = await request('POST', '/activities', experience)
  assert.equal(created.status, 201)
  const id = created.body.data.id
  assert.equal((await request('GET', `/activities/${id}`, undefined, null)).body.data.name, experience.name)
  assert.equal((await request('PATCH', `/activities/${id}`, { name: 'Sunset forest walk', price: 3000 })).status, 200)
  const listed = (await request('GET', '/activities')).body.data[0]
  assert.equal(listed.name, 'Sunset forest walk')
  assert.equal(listed.price, 3000)
  assert.equal((await request('DELETE', `/activities/${id}`)).status, 204)
  assert.equal(fake.state.activities.length, 0)
  assert.equal((await request('GET', `/activities/${id}`)).status, 404)
})

test('experience validation rejects bad prices, ratings, URLs, parents, blank durations and empty edits', async t => {
  const { request, fake } = await fixture(t)
  for (const changes of [{ price: -1 }, { rating: 6 }, { image: 'javascript:alert(1)' }, { destinationId: missing }, { duration: ' ' }, { unknownField: true }]) {
    const response = await request('POST', '/activities', { ...experience, ...changes })
    assert.equal(response.status, 400, JSON.stringify(changes))
    assert.equal(typeof response.body.message, 'string')
  }
  assert.equal((await request('PATCH', `/activities/${missing}`, {})).status, 400)
  assert.equal((await request('DELETE', '/activities/invalid')).status, 400)
  assert.equal(fake.state.activities.length, 0)
})

test('journey CRUD preserves route order, maps itinerary days and removes owned links on delete', async t => {
  const { request, fake } = await fixture(t)
  const response = await request('POST', '/packages', journey)
  assert.equal(response.status, 201)
  const id = response.body.data.id
  assert.deepEqual(response.body.data.destinations.map(link => link.destinationId), [destination2, destination1])
  assert.deepEqual(response.body.data.itinerary.map(day => day.day), [1, 2])
  const updated = await request('PATCH', `/packages/${id}`, { name: 'Updated escape', destinationIds: [destination1] })
  assert.equal(updated.status, 200)
  assert.deepEqual(updated.body.data.destinations.map(link => link.destinationId), [destination1])
  assert.equal((await request('GET', `/packages/${id}`)).body.data.name, 'Updated escape')
  assert.equal((await request('DELETE', `/packages/${id}`)).status, 204)
  assert.equal(fake.state.links.length, 0)
  assert.deepEqual((await request('GET', '/packages')).body.data, [])
})

test('journey invalid edits preserve the original record and destination links', async t => {
  const { request } = await fixture(t)
  const id = (await request('POST', '/packages', journey)).body.data.id
  const before = (await request('GET', `/packages/${id}`)).body.data
  for (const changes of [{ destinationIds: [] }, { destinationIds: [missing] }, { destinationIds: [destination1, destination1] }, { itinerary: [] }, { itinerary: [journey.itinerary[0], journey.itinerary[0]] }, { price: -10 }, { hotelInformation: '' }]) {
    assert.equal((await request('PATCH', `/packages/${id}`, changes)).status, 400)
    assert.deepEqual((await request('GET', `/packages/${id}`)).body.data, before)
  }
})

test('linked experience reviews and server wishlists block deletion', async t => {
  const { request, fake } = await fixture(t)
  const id = (await request('POST', '/activities', experience)).body.data.id
  for (const [key, link] of [['reviews', { activityId: id }], ['wishlist', { kind: 'ACTIVITY', itemId: id }]]) {
    fake.state[key].push(link)
    assert.equal((await request('DELETE', `/activities/${id}`)).status, 409)
    assert.equal((await request('GET', `/activities/${id}`)).status, 200)
    fake.state[key].pop()
  }
})

test('linked journey bookings, reviews and server wishlists block deletion without losing route links', async t => {
  const { request, fake } = await fixture(t)
  const id = (await request('POST', '/packages', journey)).body.data.id
  for (const [key, link] of [['bookings', { packageId: id }], ['reviews', { packageId: id }], ['wishlist', { kind: 'PACKAGE', itemId: id }]]) {
    fake.state[key].push(link)
    assert.equal((await request('DELETE', `/packages/${id}`)).status, 409)
    assert.equal(fake.state.links.length, 2)
    assert.equal((await request('GET', `/packages/${id}`)).status, 200)
    fake.state[key].pop()
  }
})

test('live frontend catalogue loads all four resources and reflects create, edit and delete responses', async () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
  const { default: axios } = await import('axios')
  const calls = []
  const packageDto = { id: '333333333333333333333333', ...journey, destinations: [{ destinationId: destination1, order: 1 }, { destinationId: destination2, order: 0 }] }
  let activityRows = []
  let packageRows = [packageDto]
  let failDelete = false
  axios.defaults.adapter = async config => {
    calls.push(`${config.method} ${config.url}`)
    const body = config.data ? JSON.parse(config.data) : undefined
    let data
    if (config.method === 'get') {
      data = config.url === '/destinations' ? [{ id: destination1, name: 'Ella' }]
        : config.url === '/hotels' ? [] : config.url === '/activities' ? activityRows : packageRows
    } else if (config.method === 'post' && config.url === '/activities') {
      data = { id: '444444444444444444444444', ...body }; activityRows = [data]
    } else if (config.method === 'patch' && config.url.startsWith('/activities/')) {
      data = { ...activityRows[0], ...body }; activityRows = [data]
    } else if (config.method === 'patch' && config.url.startsWith('/packages/')) {
      data = { ...packageDto, ...body }; packageRows = [data]
    } else if (config.method === 'delete') {
      if (failDelete) throw new Error('Linked record')
      data = undefined
    } else throw new Error(`Unexpected request ${config.method} ${config.url}`)
    return { config, status: config.method === 'delete' ? 204 : 200, statusText: 'OK', headers: {}, data: { data } }
  }
  // Dynamic import lets the test adapter be configured before axios.create().
  const catalogue = await import('../frontend/src/services/catalog.ts')
  const activityIdentity = catalogue.activities
  const packageIdentity = catalogue.packages
  await Promise.all([catalogue.loadCatalog(), catalogue.loadCatalog()])
  assert.equal(calls.length, 4)
  assert.equal(catalogue.activities.length, 0)
  assert.deepEqual([...catalogue.packages[0].destinationIds], [destination2, destination1])
  assert.equal(catalogue.packages[0].hotel, journey.hotelInformation)
  await catalogue.saveExperience(experience)
  assert.equal(catalogue.activities.length, 1)
  await catalogue.saveExperience({ ...experience, price: 9999 }, catalogue.activities[0].id)
  assert.equal(catalogue.activities.length, 1)
  assert.equal(catalogue.activities[0].price, 9999)
  await catalogue.saveJourney({ ...journey, name: 'Edited journey' }, packageDto.id)
  assert.equal(catalogue.packages[0].name, 'Edited journey')
  failDelete = true
  await assert.rejects(catalogue.deleteJourney(packageDto.id))
  assert.equal(catalogue.packages.length, 1)
  failDelete = false
  await catalogue.deleteJourney(packageDto.id)
  await catalogue.deleteExperience(catalogue.activities[0].id)
  assert.equal(catalogue.packages.length + catalogue.activities.length, 0)
  assert.equal(catalogue.activities, activityIdentity)
  assert.equal(catalogue.packages, packageIdentity)
})
