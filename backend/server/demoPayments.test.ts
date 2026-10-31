import assert from 'node:assert/strict'
import test from 'node:test'
import type { PrismaClient } from '@prisma/client'
import type { Request, Response } from 'express'
import { createDemoPaymentHandler, isDemoPaymentEnabled } from './demoPayments.js'

const accountId = '111111111111111111111111'
const bookingId = '222222222222222222222222'

function fixture(overrides: Record<string, unknown> = {}) {
  let row = {
    id: bookingId, userId: accountId, status: 'PENDING',
    paymentStatus: 'UNPAID', totalPrice: 12500,
    ...overrides,
  }
  let writes = 0
  const database = {
    booking: {
      async findFirst(args: { where: { id: string; userId: string } }) {
        return row.id === args.where.id && row.userId === args.where.userId ? { ...row } : null
      },
      async update(args: {
        where: { id: string; userId: string; paymentStatus: string; status: { in: string[] } }
        data: { paymentStatus: string }
      }) {
        const w = args.where
        if (row.id !== w.id || row.userId !== w.userId || row.paymentStatus !== w.paymentStatus || !w.status.in.includes(String(row.status))) {
          throw Object.assign(new Error('Changed record'), { code: 'P2025' })
        }
        writes++
        row = { ...row, ...args.data }
        return { ...row }
      },
    },
  }
  const handler = createDemoPaymentHandler(database as unknown as Pick<PrismaClient, 'booking'>, {}, () => true)
  async function call(options: { id?: string; userId?: string; role?: 'USER' | 'ADMIN'; signedOut?: boolean; body?: unknown } = {}) {
    let status = 200
    let body: any
    let failure: unknown
    const request = {
      params: { id: options.id ?? bookingId },
      authUser: options.signedOut ? undefined : { id: options.userId ?? accountId, role: options.role ?? 'USER' },
      body: options.body,
    }
    const response = {
      status(value: number) { status = value; return this },
      json(value: unknown) { body = value; return this },
    }
    await handler(request as unknown as Request, response as unknown as Response, error => { failure = error })
    assert.equal(failure, undefined)
    return { status, body }
  }
  return { call, database, row: () => row, writes: () => writes }
}

test('simulation requires an explicit flag and is disabled in production', () => {
  assert.equal(isDemoPaymentEnabled({}), false)
  assert.equal(isDemoPaymentEnabled({ DEMO_PAYMENTS_ENABLED: 'true', NODE_ENV: 'development' }), true)
  assert.equal(isDemoPaymentEnabled({ DEMO_PAYMENTS_ENABLED: 'true', NODE_ENV: 'production' }), false)
})

test('another account cannot pay a booking; admins and signed-out requests are rejected', async () => {
  const f = fixture()
  assert.equal((await f.call({ userId: '333333333333333333333333' })).status, 404)
  assert.equal((await f.call({ signedOut: true })).status, 401)
  assert.equal((await f.call({ role: 'ADMIN' })).status, 403)
  assert.equal(f.writes(), 0)
})

test('invalid identifiers, cancelled/completed bookings and nonpayable totals cannot be paid', async () => {
  assert.equal((await fixture().call({ id: 'bad-id' })).status, 400)
  for (const values of [
    { status: 'CANCELLED' }, { status: 'COMPLETED' },
    { paymentStatus: 'PAID' }, { paymentStatus: 'REFUNDED' },
    { totalPrice: 0 }, { totalPrice: -10 }, { totalPrice: Number.NaN },
  ]) {
    const f = fixture(values)
    assert.equal((await f.call()).status, 409)
    assert.equal(f.writes(), 0)
  }
})

test('successful simulation saves DEMO_PAID and never trusts a submitted amount', async () => {
  const f = fixture()
  const result = await f.call({ body: { totalPrice: 1, paymentStatus: 'PAID' } })
  assert.equal(result.status, 200)
  assert.equal(f.row().paymentStatus, 'DEMO_PAID')
  assert.equal(f.row().totalPrice, 12500)
  assert.match(result.body.message, /No money was charged/)
})

test('repeated and concurrent submissions record only one payment change', async () => {
  const f = fixture()
  const results = await Promise.all([f.call(), f.call(), f.call()])
  assert.ok(results.every(result => result.status === 200))
  assert.equal(f.writes(), 1)
  assert.equal((await f.call()).status, 200)
  assert.equal(f.writes(), 1)
})

test('a cancellation between read and update returns a conflict, not success', async () => {
  const f = fixture()
  const originalRead = f.database.booking.findFirst
  let calls = 0
  f.database.booking.findFirst = async args => {
    calls++
    if (calls > 1) return { ...(await originalRead(args))!, status: 'CANCELLED' }
    return originalRead(args)
  }
  f.database.booking.update = async () => { throw Object.assign(new Error('Changed'), { code: 'P2025' }) }
  assert.equal((await f.call()).status, 409)
  assert.equal(f.row().paymentStatus, 'UNPAID')
})

test('disabled handler returns 403 without writing', async () => {
  const f = fixture()
  const handler = createDemoPaymentHandler(f.database as unknown as Pick<PrismaClient, 'booking'>, {}, () => false)
  let status = 200
  const response = { status(n: number) { status = n; return this }, json() { return this } }
  await handler({} as Request, response as unknown as Response, () => assert.fail('Unexpected error'))
  assert.equal(status, 403)
  assert.equal(f.writes(), 0)
})
