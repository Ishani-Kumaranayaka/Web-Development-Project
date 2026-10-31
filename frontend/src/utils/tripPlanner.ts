import type { Activity, Destination, Trip } from '../types'

// Illustrative LKR amounts, not live transport quotes. The traveller can edit them.
export const SAMPLE_TRANSPORT_FARES = { Train: 15, Bus: 10, 'Private car': 55 } as const

export function normalizeTripName(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function sameTripIdentity(
  trip: Pick<Trip, 'name' | 'startDate' | 'endDate'>,
  name: string,
  startDate: string,
  endDate: string,
): boolean {
  return normalizeTripName(trip.name) === normalizeTripName(name) &&
    trip.startDate === startDate && trip.endDate === endDate
}

export function tripDurationDays(start: string, end: string): number {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.NaN
    const date = new Date(value + 'T00:00:00Z')
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
      ? date.getTime() : Number.NaN
  }
  const first = parse(start)
  const last = parse(end)
  return Number.isFinite(first) && Number.isFinite(last) && last >= first
    ? Math.round((last - first) / 86400000) + 1 : 0
}

export function transportFare(trip: Trip): number {
  const custom = trip.transportCostPerTransfer
  if (typeof custom === 'number' && Number.isFinite(custom) && custom >= 0) return custom
  return SAMPLE_TRANSPORT_FARES[trip.transportMode ?? 'Train'] ?? 0
}

export function calculateTripCost(
  trip: Trip,
  destinations: ReadonlyArray<Pick<Destination, 'id' | 'averageCost'>>,
  activities: ReadonlyArray<Pick<Activity, 'id' | 'price'>>,
) {
  const days = tripDurationDays(trip.startDate, trip.endDate)
  const destinationIds = [...new Set(trip.destinationIds)]
  const activityIds = [...new Set(trip.activityIds ?? [])]
  const destinationCosts = destinationIds.map(id => destinations.find(item => item.id === id)?.averageCost)
    .filter((cost): cost is number => typeof cost === 'number' && Number.isFinite(cost) && cost >= 0)
  const activityCosts = activityIds.map(id => activities.find(item => item.id === id)?.price)
    .filter((cost): cost is number => typeof cost === 'number' && Number.isFinite(cost) && cost >= 0)
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
  const dailyBudget = destinationCosts.length
    ? destinationCosts.reduce((sum, cost) => sum + cost, 0) / destinationCosts.length : 0
  const destinationTotal = round(dailyBudget * days)
  const activityTotal = round(activityCosts.reduce((sum, cost) => sum + cost, 0))
  const transfers = Math.max(0, destinationIds.length - 1)
  const fare = transportFare(trip)
  const transportTotal = round(transfers * fare)
  const missingPrices = destinationIds.length - destinationCosts.length + activityIds.length - activityCosts.length
  return {
    days, dailyBudget: round(dailyBudget), destinationTotal, activityTotal,
    transfers, fare, transportTotal,
    total: round(destinationTotal + activityTotal + transportTotal),
    hasSelections: destinationIds.length + activityIds.length > 0,
    incomplete: days === 0 || missingPrices > 0,
  }
}
