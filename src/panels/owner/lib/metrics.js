// Shared calculations for the owner panel. Once the API exists most of these become
// server-side aggregates (GET /reports/summary), but the definitions stay the same.
import { HOUR_WEIGHT, localDate } from '../data/seed'

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

/** Orders that count towards sales (not cancelled). */
export const billable = (orders) => orders.filter((o) => o.status !== 'CANCELLED')
export const salesOf = (orders) => billable(orders).reduce((s, o) => s + o.total - (o.refunded ?? 0), 0)

/** Share of an outlet's normal trading day that has passed by `now` (by order volume, not clock time). */
export function dayFraction(outlet, now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const open = start.getTime() + toMin(outlet.opens) * 60_000
  const close = start.getTime() + toMin(outlet.closes) * 60_000
  const weight = (a, b) => { let w = 0; for (let t = a; t < b; t += 15 * 60_000) w += HOUR_WEIGHT[new Date(t).getHours()]; return w }
  const total = weight(open, close)
  return total ? Math.min(1, weight(open, Math.min(now.getTime(), close)) / total) : 1
}

/** Sales at this time on the same weekday last week, for the given outlets. */
export function sameTimeLastWeek(history, outlets, now = new Date()) {
  return outlets.reduce((s, o) => {
    const day = history[o.id]?.[history[o.id].length - 7]
    return s + (day ? day.sales * dayFraction(o, now) : 0)
  }, 0)
}

/** Sales and orders from the 1st of this month to yesterday, plus today's live orders. */
export function monthToDate(history, outletIds, todaysOrders, now = new Date()) {
  const first = localDate(new Date(now.getFullYear(), now.getMonth(), 1))
  let sales = salesOf(todaysOrders)
  let orders = billable(todaysOrders).length
  outletIds.forEach((id) => (history[id] ?? []).forEach((d) => { if (d.date >= first) { sales += d.sales; orders += d.orders } }))
  return { sales, orders }
}

export const isThisMonth = (iso, now = new Date()) => {
  const d = new Date(iso)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

/** Sales per hour from opening to now. The current hour is marked partial. */
export function hourly(orders, now = new Date(), fromHour = 7) {
  const lastHour = now.getHours() < 8 ? 22 : now.getHours()
  const rows = []
  for (let h = fromHour; h <= lastHour; h++) {
    const value = billable(orders).filter((o) => new Date(o.placedAt).getHours() === h).reduce((s, o) => s + o.total, 0)
    rows.push({ label: h === 12 ? '12 pm' : h > 12 ? `${h - 12} pm` : `${h} am`, value, partial: h === now.getHours() })
  }
  return rows
}

/** Quantity and revenue per menu item from a list of orders. */
export function itemTotals(orders) {
  const m = new Map()
  billable(orders).forEach((o) => o.items.forEach((l) => {
    const row = m.get(l.itemId) ?? { itemId: l.itemId, name: l.name, categoryId: l.categoryId, qty: 0, revenue: 0 }
    row.qty += l.qty
    row.revenue += l.qty * l.price
    m.set(l.itemId, row)
  }))
  return [...m.values()].sort((a, b) => b.revenue - a.revenue)
}

export const pctChange = (now, before) => (before ? Math.round(((now - before) / before) * 100) : null)
