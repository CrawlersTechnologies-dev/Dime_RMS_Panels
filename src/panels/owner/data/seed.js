// Builds realistic, repeatable demo data for one restaurant. Same input → same output.
// Everything here is shaped like the API responses the owner panel will consume.
import { RESTAURANTS } from './restaurants'

/* ---------- helpers ---------- */

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)
const pick = (r, list) => list[Math.floor(r() * list.length)]
const weighted = (r, pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let x = r() * total
  for (const [v, w] of pairs) { if ((x -= w) <= 0) return v }
  return pairs[pairs.length - 1][0]
}
const round2 = (n) => Math.round(n * 100) / 100
/** YYYY-MM-DD in the browser's time zone (toISOString would shift IST dates back a day). */
export const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

/** Relative weight of orders by hour of day: breakfast, lunch and dinner peaks. */
export const HOUR_WEIGHT = [0, 0, 0, 0, 0, 0, 0, 0.6, 1.3, 1.4, 0.9, 0.5, 1.0, 1.5, 1.3, 0.6, 0.5, 0.8, 0.9, 1.1, 1.4, 1.2, 0.6, 0.1]
export const GST_RATE = 0.05

const FIRST = ['Lata', 'Venkatesh', 'Shivu', 'Manju', 'Basava', 'Prakash', 'Savita', 'Geeta', 'Iranna', 'Mallikarjun', 'Shankar', 'Rekha', 'Pavitra', 'Santosh', 'Vinod', 'Anand', 'Umesh', 'Shobha', 'Kiran', 'Nagaraj', 'Ravi', 'Suresh', 'Pooja', 'Asha', 'Deepa', 'Chandru', 'Girish', 'Mahantesh', 'Siddu', 'Yallappa', 'Hanumant', 'Akshata', 'Bhagya', 'Sangeeta', 'Veeresh', 'Ramesh', 'Shrikant', 'Praveen', 'Sunil', 'Laxmi']
const GUESTS = ['Ananya Rao', 'Mohit Jain', 'Sneha Patil', 'Rahul Desai', 'Priyanka Hiremath', 'Arjun Kulkarni', 'Neha Joshi', 'Vikas Shettar', 'Kavitha Murthy', 'Sameer Mulla', 'Divya Bhat', 'Rohit Naik']

/* ---------- builder ---------- */

export function buildSeed(restaurantId, now = new Date()) {
  const R = RESTAURANTS[restaurantId]
  // One random stream per section, so the number of orders (which grows through the day)
  // doesn't shift staff, bookings or stock between page loads.
  let r = rng(hash(restaurantId))
  const stream = (name) => { r = rng(hash(restaurantId + name)) }
  const nowMs = now.getTime()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  // Before 8 am "today" has barely started; show yesterday's trading day instead.
  if (now.getHours() < 8) dayStart.setDate(dayStart.getDate() - 1)
  const dayEnd = Math.min(nowMs, dayStart.getTime() + 23 * 3600_000)
  const at = (ms) => new Date(ms).toISOString()
  const ago = (min) => at(nowMs - min * 60_000)

  /* Menu */
  const categories = R.categories.map((c, i) => ({ ...c, sort: i }))
  const items = R.items.map(([name, categoryId, price, prepMins, bestseller], i) => ({
    id: `itm-${i + 1}`, name, categoryId, price, prepMins, bestseller: !!bestseller, veg: true, gst: 5,
    outlets: Object.fromEntries(R.outlets.map((o) => [o.id, true])),
  }))
  const itemsByCat = Object.groupBy ? Object.groupBy(items, (i) => i.categoryId) : items.reduce((m, i) => ((m[i.categoryId] ??= []).push(i), m), {})
  const servingAt = (minuteOfDay) => categories.filter((c) => minuteOfDay >= toMin(c.from) && minuteOfDay <= toMin(c.to)).flatMap((c) => itemsByCat[c.id] ?? [])

  /* Staff */
  const staff = []
  const usedNames = new Set()
  const freshName = () => {
    let n
    do n = `${pick(r, FIRST)} ${String.fromCharCode(65 + Math.floor(r() * 20))}` ; while (usedNames.has(n))
    usedNames.add(n)
    return n
  }
  const SHIFTS = ['MORNING', 'EVENING']
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  R.outlets.forEach((o, oi) => {
    const roster = R.type === 'SINGLE'
      ? [['MANAGER', R.managers[0]], ['BILLER'], ['CHEF'], ['CHEF'], ['CAPTAIN'], ['CAPTAIN'], ['HELPER']]
      : [['MANAGER', R.managers[oi]], ['BILLER', oi === 0 ? 'Lata S' : null], ['BILLER'], ['CHEF', oi === 0 ? 'Venkatesh H' : null], ['CHEF'], ['CAPTAIN'], ['CAPTAIN'], ['CAPTAIN'], ['HELPER']]
    roster.forEach(([type, fixed], i) => {
      const name = fixed ?? freshName()
      usedNames.add(name)
      staff.push({
        id: `STF-${o.code}-${i + 1}`,
        name,
        phone: `+91 9${Math.floor(r() * 9e8 + 1e8)}`.replace(/(\+91 \d{5})(\d{5})/, '$1 $2'),
        staffType: type,
        outletId: o.id,
        shift: type === 'MANAGER' ? 'GENERAL' : SHIFTS[i % 2],
        weeklyOff: DAYS[(i + oi) % 7],
        joinedOn: localDate(new Date(nowMs - (60 + Math.floor(r() * 900)) * 86400_000)),
        status: o.status === 'SUSPENDED' && type !== 'MANAGER' ? 'INACTIVE' : 'ACTIVE',
        granted: type === 'MANAGER' && oi === 0 ? ['pos.settings'] : [],
      })
    })
  })
  const staffAt = (outletId, type) => staff.filter((s) => s.outletId === outletId && s.staffType === type)

  stream('tables')
  /* Tables (layout) */
  const tables = {}
  R.outlets.forEach((o) => {
    tables[o.id] = o.tables.flatMap((sec) =>
      Array.from({ length: sec.count }, (_, i) => ({
        id: `${o.id}-${sec.prefix}${i + 1}`, name: `${sec.prefix}${i + 1}`, section: sec.section,
        seats: i === sec.count - 1 ? sec.seats + 2 : i === 0 ? 2 : sec.seats, status: 'FREE',
      })),
    )
  })

  stream('orders')
  // A chef switched this item off at the first outlet a little over two hours ago.
  const offItem = items.find((i) => i.name === 'Gadbad ice cream') ?? items.at(-2)
  const offSince = nowMs - 140 * 60_000

  /* Orders today */
  const orders = []
  const elapsedWeight = (fromMs, toMs) => {
    let w = 0
    for (let t = fromMs; t < toMs; t += 15 * 60_000) w += HOUR_WEIGHT[new Date(t).getHours()] / 4
    return w
  }
  const types = R.online
    ? [['DINE_IN', 0.55], ['TAKEAWAY', 0.14], ['SWIGGY', 0.16], ['ZOMATO', 0.15]]
    : [['DINE_IN', 0.75], ['TAKEAWAY', 0.25]]

  R.outlets.forEach((o) => {
    if (o.status !== 'ACTIVE') return
    const openMs = dayStart.getTime() + toMin(o.opens) * 60_000
    const closeMs = Math.min(dayEnd, dayStart.getTime() + toMin(o.closes) * 60_000)
    if (closeMs <= openMs) return
    const dow = dayStart.getDay()
    const todayFactor = dow === 0 || dow === 6 ? 1.25 : dow === 5 ? 1.1 : 1
    const count = Math.round(o.volume * 14 * elapsedWeight(openMs, closeMs) * todayFactor * 1.03)
    const times = []
    while (times.length < count) {
      const t = openMs + r() * (closeMs - openMs)
      if (r() < HOUR_WEIGHT[new Date(t).getHours()] / 1.5) times.push(t)
    }
    times.sort((a, b) => a - b)
    const billers = staffAt(o.id, 'BILLER')
    const dineTables = tables[o.id]
    times.forEach((t, n) => {
      const minute = new Date(t).getHours() * 60 + new Date(t).getMinutes()
      const menu = servingAt(minute).filter((i) => (i.categoryId !== 'c-ds' || r() < 0.5) && !(i === offItem && o.id === R.outlets[0].id && t > offSince))
      if (!menu.length) return
      const type = weighted(r, types)
      const lineCount = weighted(r, [[1, 0.3], [2, 0.38], [3, 0.22], [4, 0.1]])
      const lines = []
      for (let k = 0; k < lineCount; k++) {
        const it = pick(r, menu)
        const existing = lines.find((l) => l.itemId === it.id)
        if (existing) existing.qty += 1
        else lines.push({ itemId: it.id, name: it.name, categoryId: it.categoryId, qty: weighted(r, [[1, 0.7], [2, 0.25], [3, 0.05]]), price: it.price })
      }
      const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0)
      const discount = type !== 'SWIGGY' && type !== 'ZOMATO' && r() < 0.07 ? Math.round(subtotal * 0.1) : 0
      const taxable = subtotal - discount
      const gst = round2(taxable * GST_RATE)
      const ageMin = (nowMs - t) / 60_000
      let status = 'COMPLETED'
      if (ageMin < 12) status = 'PREPARING'
      else if (ageMin < 22) status = 'READY'
      else if (ageMin < 45 && type === 'DINE_IN') status = 'SERVED'
      if (status === 'COMPLETED' && r() < 0.02) status = 'CANCELLED'
      const online = type === 'SWIGGY' || type === 'ZOMATO'
      orders.push({
        id: `${o.code}-${String(412 + n).padStart(4, '0')}`,
        outletId: o.id,
        type,
        table: type === 'DINE_IN' ? pick(r, dineTables).name : null,
        guests: type === 'DINE_IN' ? weighted(r, [[1, 0.2], [2, 0.4], [3, 0.2], [4, 0.2]]) : null,
        items: lines,
        subtotal, discount, gst,
        total: Math.round(taxable + gst),
        payment: online ? type : ['PREPARING', 'READY', 'SERVED'].includes(status) && type === 'DINE_IN' ? null : weighted(r, [['UPI', 0.56], ['CASH', 0.33], ['CARD', 0.11]]),
        status,
        placedAt: at(t),
        biller: billers.length ? pick(r, billers).name : null,
        prepMins: Math.max(...lines.map((l) => items.find((i) => i.id === l.itemId).prepMins)) + Math.round(r() * 4),
      })
    })
  })
  orders.reverse() // newest first

  // Running dine-in orders occupy their tables (one order per table).
  orders.filter((o) => o.type === 'DINE_IN' && ['PREPARING', 'READY', 'SERVED'].includes(o.status)).forEach((o) => {
    const t = tables[o.outletId].find((x) => x.name === o.table)
    if (t && t.status === 'FREE') Object.assign(t, { status: 'OCCUPIED', orderId: o.id, since: o.placedAt, guests: o.guests })
    else {
      const free = tables[o.outletId].find((x) => x.status === 'FREE')
      if (free) { o.table = free.name; Object.assign(free, { status: 'OCCUPIED', orderId: o.id, since: o.placedAt, guests: o.guests }) }
    }
  })
  Object.values(tables).forEach((list) => list.forEach((t) => { if (t.status === 'FREE' && r() < 0.06) t.status = 'CLEANING' }))

  stream('reservations')
  /* Reservations */
  const reservations = []
  R.outlets.filter((o) => o.status === 'ACTIVE').forEach((o, oi) => {
    const n = 3 + Math.floor(r() * 3)
    for (let k = 0; k < n; k++) {
      const hoursAhead = k < 2 ? 0.5 + r() * 2 : 18 + r() * 24
      const slot = Math.round((nowMs + hoursAhead * 3600_000) / 1800_000) * 1800_000
      const source = weighted(r, [['CUSTOMER_APP', 0.5], ['PHONE', 0.4], ['WALK_IN', 0.1]])
      const status = source === 'CUSTOMER_APP' && (k === 0 || r() < 0.35) ? 'REQUESTED' : 'CONFIRMED'
      const guests = weighted(r, [[2, 0.35], [4, 0.4], [6, 0.15], [8, 0.1]])
      const table = tables[o.id].find((t) => t.seats >= guests && t.status === 'FREE' && !reservations.some((x) => x.tableId === t.id))
      reservations.push({
        id: `BK-${o.code}-${k + 1}`, outletId: o.id, name: GUESTS[(oi * 3 + k) % GUESTS.length],
        phone: `+91 98${Math.floor(r() * 1e8).toString().padStart(8, '0')}`.replace(/(\+91 \d{5})(\d{5})/, '$1 $2'),
        guests, at: at(slot), tableId: status === 'CONFIRMED' ? table?.id ?? null : null, source, status,
        note: k === 1 ? 'Birthday, needs a high chair' : null,
      })
      if (status === 'CONFIRMED' && table && hoursAhead < 1.5) table.status = 'RESERVED'
    }
  })

  stream('history')
  /* Daily history (last 30 days, before today) */
  const history = {}
  const avgBill = R.type === 'SINGLE' ? 150 : 195
  R.outlets.forEach((o) => {
    const openFrom = dayStart.getTime() + toMin(o.opens) * 60_000
    const fullDay = o.volume * 14 * elapsedWeight(openFrom, dayStart.getTime() + toMin(o.closes) * 60_000) * avgBill
    history[o.id] = Array.from({ length: 30 }, (_, d) => {
      const date = new Date(dayStart); date.setDate(date.getDate() - (30 - d))
      const dow = date.getDay()
      const factor = dow === 0 || dow === 6 ? 1.25 : dow === 5 ? 1.1 : 1
      const closed = o.status === 'SUSPENDED' && d >= 29
      const sales = closed ? 0 : Math.round(fullDay * factor * (0.88 + r() * 0.24))
      return { date: localDate(date), sales, orders: closed ? 0 : Math.round(sales / (avgBill * (0.95 + r() * 0.1))) }
    })
  })

  stream('inventory')
  /* Inventory */
  const inventory = R.inventory.map(([name, unit, cost, reorder, daily], i) => ({
    id: `inv-${i + 1}`, name, unit, cost, reorder, daily,
    stock: Object.fromEntries(R.outlets.map((o) => {
      let q = reorder * (0.9 + r() * 2.2)
      if ((i + o.id.length) % 7 === 0) q = reorder * (0.25 + r() * 0.5) // a few low
      if (i === 5 && o.id === R.outlets[0].id) q = reorder * 0.4 // counted item (milk) low at the first outlet
      return [o.id, unit === 'pcs' || unit === 'cyl' ? Math.round(q) : round2(q)]
    })),
  }))
  if (R.type === 'FRANCHISE') inventory.find((x) => x.name === 'Paneer').stock['OUT-4'] = 0

  const first = R.outlets[0].id
  offItem.outlets[first] = false
  const countedItem = inventory[5]
  const chefFirst = staffAt(first, 'CHEF')[0]?.name ?? 'Chef'
  const mgrFirst = staffAt(first, 'MANAGER')[0]?.name ?? 'Manager'
  const movements = [
    { id: 'MV-1', itemId: 'inv-6', outletId: first, kind: 'CHEF_UPDATE', qty: -12, by: chefFirst, source: 'Chef app', note: 'Morning count', at: ago(95) },
    { id: 'MV-2', itemId: 'inv-1', outletId: first, kind: 'PURCHASE', qty: 50, by: mgrFirst, source: 'Biller panel', note: 'Bill #4471, Sri Lakshmi Traders', at: ago(260) },
    { id: 'MV-3', itemId: 'inv-11', outletId: first, kind: 'WASTAGE', qty: -2.5, by: chefFirst, source: 'Chef app', note: 'Spoiled', at: ago(320) },
    { id: 'MV-4', itemId: 'inv-10', outletId: R.outlets.at(-1).id, kind: 'PURCHASE', qty: 30, by: staffAt(R.outlets.at(-1).id, 'MANAGER')[0]?.name, source: 'Biller panel', note: 'APMC market', at: ago(400) },
  ].filter((m) => inventory.some((i) => i.id === m.itemId))
  const wastage = [
    { id: 'WS-1', itemId: 'inv-11', outletId: first, qty: 2.5, reason: 'Spoiled', by: chefFirst, at: ago(320) },
    { id: 'WS-2', itemId: 'inv-6', outletId: first, qty: 3, reason: 'Curdled', by: chefFirst, at: ago(1500) },
    { id: 'WS-3', itemId: 'inv-12', outletId: R.outlets.at(-1).id, qty: 1.5, reason: 'Spoiled', by: staffAt(R.outlets.at(-1).id, 'CHEF')[0]?.name, at: ago(2900) },
    { id: 'WS-4', itemId: 'inv-2', outletId: first, qty: 1, reason: 'Over-soaked batter', by: chefFirst, at: ago(4300) },
  ].filter((w) => inventory.some((i) => i.id === w.itemId))

  stream('expenses')
  /* Expenses (this month + last few days of the previous) */
  const expenses = []
  let ex = 1
  const addExp = (o, daysAgo, category, description, amount, extra = {}) => expenses.push({
    id: `EXP-${String(ex++).padStart(4, '0')}`, outletId: o.id, category, description, amount: Math.round(amount),
    paidVia: extra.paidVia ?? (amount > 8000 ? 'Bank transfer' : weighted(r, [['Cash', 0.6], ['UPI', 0.4]])),
    by: extra.by ?? staffAt(o.id, 'MANAGER')[0]?.name, at: ago(daysAgo * 1440 + 60 + Math.floor(r() * 300)),
    status: extra.status ?? 'APPROVED', receipt: extra.receipt ?? r() < 0.85,
  })
  R.outlets.forEach((o) => {
    if (o.status !== 'ACTIVE') return
    const v = o.volume
    for (let d = 0; d < 21; d++) {
      addExp(o, d, 'Vegetables and groceries', d % 3 === 0 ? 'APMC vegetable market' : 'Daily vegetables', (1800 + r() * 1200) * v)
      if (d % 2 === 0) addExp(o, d, 'Dairy', 'Milk and curd, Nandini dealer', (2600 + r() * 600) * v)
      if (d % 4 === 1) addExp(o, d, 'Gas', `${Math.max(1, Math.round(3 * v))} commercial LPG cylinders`, 1765 * Math.max(1, Math.round(3 * v)), { paidVia: 'UPI' })
    }
    addExp(o, 9, 'Rent', 'Monthly rent', 85000 * v + 15000, { paidVia: 'Bank transfer' })
    addExp(o, 9, 'Salaries', 'Staff salaries, previous month', 160000 * v + 40000, { paidVia: 'Bank transfer', by: R.owner })
    addExp(o, 6, 'Electricity', 'HESCOM electricity bill', 21000 * v + 6000, { paidVia: 'UPI' })
    addExp(o, 4, 'Packaging', 'Parcel containers and bags', 4200 * v)
  })
  const pend = R.outlets.filter((o) => o.status === 'ACTIVE')
  const pendingList = [
    ['Maintenance', 'Wet grinder motor rewinding', 6800], ['Maintenance', 'Pest control, quarterly', 7500],
    ['Marketing', 'Swiggy ads top-up', 10000], ['Uniforms', 'Staff uniforms, 12 sets', 8400],
  ]
  pendingList.slice(0, R.type === 'SINGLE' ? 2 : 4).forEach(([cat, desc, amt], i) => addExp(pend[i % pend.length], i === 0 ? 0 : 1, cat, desc, amt, { status: 'PENDING', receipt: i !== 2 }))
  expenses.sort((a, b) => new Date(b.at) - new Date(a.at))

  /* Approval requests from managers and billers */
  const completed = orders.filter((o) => o.status === 'COMPLETED')
  const byOutlet = (oid) => completed.filter((o) => o.outletId === oid)
  const approvals = []
  const second = pend[1] ?? pend[0]
  const fo = byOutlet(first), so = byOutlet(second.id)
  const ord = (list, k) => list[Math.min(k, list.length - 1)]
  if (fo.length) {
    const o1 = ord(fo, 3), o2 = ord(fo, 9), o3 = ord(so.length ? so : fo, 5)
    approvals.push(
      { id: 'APR-301', type: 'CANCELLATION', outletId: o1.outletId, orderId: o1.id, amount: o1.total, reason: 'Customer left before the food was served', by: staffAt(o1.outletId, 'BILLER')[0]?.name, at: ago(18), status: 'PENDING' },
      { id: 'APR-302', type: 'DISCOUNT', outletId: o2.outletId, orderId: o2.id, amount: Math.round(o2.subtotal * 0.15), percent: 15, reason: 'Regular customer, family birthday lunch', by: staffAt(o2.outletId, 'MANAGER')[0]?.name, at: ago(42), status: 'PENDING' },
      { id: 'APR-303', type: 'REFUND', outletId: o3.outletId, orderId: o3.id, amount: o3.total, reason: 'Customer was charged twice on UPI', by: staffAt(o3.outletId, 'BILLER')[0]?.name, at: ago(75), status: 'PENDING', refundTo: 'UPI' },
    )
  }
  const milk = inventory.find((i) => i.name === 'Milk')
  if (milk) approvals.push({ id: 'APR-304', type: 'STOCK_ADJUSTMENT', outletId: first, itemId: milk.id, from: milk.stock[first], to: round2(milk.stock[first] - 6), reason: 'Curdled overnight, cold room was not cooling', by: mgrFirst, at: ago(130), status: 'PENDING' })
  const gas = inventory.find((i) => i.unit === 'cyl')
  if (gas && second) approvals.push({ id: 'APR-305', type: 'STOCK_ADJUSTMENT', outletId: second.id, itemId: gas.id, from: gas.stock[second.id], to: gas.stock[second.id] + 1, reason: 'Count was wrong, one full cylinder found in store room', by: staffAt(second.id, 'MANAGER')[0]?.name, at: ago(200), status: 'PENDING' })
  if (fo.length > 20) {
    const o4 = ord(fo, 20)
    approvals.push({ id: 'APR-298', type: 'DISCOUNT', outletId: o4.outletId, orderId: o4.id, amount: Math.round(o4.subtotal * 0.1), percent: 10, reason: 'Delay in serving', by: staffAt(o4.outletId, 'MANAGER')[0]?.name, at: ago(600), status: 'APPROVED', decidedBy: R.owner, decidedAt: ago(590) })
  }

  /* Notifications */
  const lowCount = inventory.reduce((n, i) => n + R.outlets.filter((o) => i.stock[o.id] < i.reorder && o.status === 'ACTIVE').length, 0)
  const notifications = [
    { id: 'NT-1', kind: 'APPROVAL', title: 'Cancellation needs approval', body: approvals[0] ? `${approvals[0].by} asked to cancel ${approvals[0].orderId}.` : 'A cancellation is waiting.', outletId: approvals[0]?.outletId ?? first, at: ago(18), read: false, link: '/owner/approvals' },
    { id: 'NT-2', kind: 'RESERVATION', title: 'New booking request from the customer app', body: 'Confirm or decline it in Tables and floor.', outletId: first, at: ago(26), read: false, link: '/owner/tables' },
    { id: 'NT-3', kind: 'LOW_STOCK', title: `${lowCount} items below reorder level`, body: `${countedItem.name} is low at ${R.outlets[0].name}.`, outletId: first, at: ago(95), read: false, link: '/owner/inventory' },
    { id: 'NT-4', kind: 'CHEF', title: `${chefFirst} marked ${offItem.name} unavailable`, body: 'Applied in the chef app. Customers no longer see it.', outletId: first, at: ago(140), read: true, link: '/owner/menu' },
    { id: 'NT-5', kind: 'CHEF', title: `${chefFirst} updated ${countedItem.name.toLowerCase()} stock`, body: `Morning count, 12 ${countedItem.unit} used.`, outletId: first, at: ago(95), read: true, link: '/owner/inventory' },
    ...(R.online ? [{ id: 'NT-6', kind: 'ONLINE', title: 'Zomato order cancelled by customer', body: 'Food was already being prepared. Raise a dispute on Zomato within 24 hours.', outletId: second.id, at: ago(210), read: true, link: '/owner/orders' }] : []),
    { id: 'NT-7', kind: 'DAY_END', title: 'Day end closed for yesterday', body: 'All outlets closed their day with cash matched.', outletId: null, at: ago(14 * 60), read: true, link: '/owner/reports' },
    { id: 'NT-8', kind: 'PLATFORM', title: `Your ${R.plan === 'starter' ? 'Starter' : 'Enterprise'} plan renews in ${R.renewsOn} days`, body: 'Renewal is automatic from your saved payment method.', outletId: null, at: ago(20 * 60), read: true, link: '/owner/settings' },
    ...(R.outlets.some((o) => o.status === 'SUSPENDED') ? [{ id: 'NT-9', kind: 'PLATFORM', title: 'Old Hubli outlet suspended by Dime Quest', body: 'The FSSAI licence has expired. Upload the renewed licence to reactivate.', outletId: 'OUT-3', at: ago(26 * 60), read: false, link: '/owner/settings' }] : []),
  ].filter((n) => n.outletId === null || R.outlets.some((o) => o.id === n.outletId))

  /* Audit */
  const audit = [
    { id: 'OA-1', actor: chefFirst, source: 'Chef app', action: 'Marked item unavailable', target: offItem.name, outletId: first, at: ago(140), changes: { available: [true, false] } },
    { id: 'OA-2', actor: chefFirst, source: 'Chef app', action: 'Updated stock', target: countedItem.name, outletId: first, at: ago(95), changes: { stock: [round2(countedItem.stock[first] + 12), countedItem.stock[first]] } },
    { id: 'OA-3', actor: mgrFirst, source: 'Biller panel', action: 'Recorded purchase', target: 'Rice, 50 kg', outletId: first, at: ago(260), changes: {} },
    { id: 'OA-4', actor: staffAt(first, 'BILLER')[0]?.name, source: 'Biller panel', action: 'Requested cancellation', target: approvals[0]?.orderId ?? 'Order', outletId: first, at: ago(18), changes: {} },
    { id: 'OA-5', actor: R.owner, source: 'Owner panel', action: 'Approved discount', target: approvals.find((a) => a.status === 'APPROVED')?.orderId ?? 'Order', outletId: first, at: ago(590), changes: { discount: [0, '10%'] } },
    { id: 'OA-6', actor: mgrFirst, source: 'Biller panel', action: 'Closed day end', target: 'Yesterday', outletId: first, at: ago(14 * 60), changes: { cashExpected: [null, 18420], cashCounted: [null, 18420] } },
    { id: 'OA-7', actor: R.owner, source: 'Owner panel', action: 'Changed item price', target: 'Masala dosa', outletId: null, at: ago(3 * 1440), changes: { price: [75, 80] } },
  ].filter((a) => a.actor)

  stream('settings')
  /* Settings */
  const settings = {
    billing: { prefix: `${R.outlets[0].code}/26-27/`, serviceCharge: false, serviceChargePct: 5, roundOff: true, showGstBreakup: true, footer: 'Thank you, visit again!', whatsappBill: true },
    payments: { CASH: true, UPI: true, CARD: true, SWIGGY: R.online, ZOMATO: R.online, upiId: `${R.name.toLowerCase().replace(/[^a-z]/g, '')}@okaxis` },
    limits: { expenseApproval: 5000, billerDiscountPct: 5, managerDiscountPct: 10 },
    printers: R.outlets.flatMap((o) => [
      { id: `${o.id}-bill`, outletId: o.id, name: 'Billing counter', kind: 'Bill', model: 'TVS RP 3160 Gold', connection: 'USB', status: o.status === 'ACTIVE' ? 'ONLINE' : 'OFFLINE' },
      { id: `${o.id}-kot`, outletId: o.id, name: 'Kitchen', kind: 'KOT', model: 'Epson TM-T82', connection: 'LAN 192.168.1.40', status: o.status !== 'ACTIVE' ? 'OFFLINE' : o.id === first ? 'ERROR' : 'ONLINE' },
    ]),
    integrations: R.outlets.map((o) => ({ outletId: o.id, swiggy: R.online && o.status === 'ACTIVE' ? `SWG${100000 + Math.floor(r() * 899999)}` : '', zomato: R.online && o.status === 'ACTIVE' ? `ZMT${100000 + Math.floor(r() * 899999)}` : '' })),
  }

  /* Biller panel: delivery orders waiting to be accepted, and each outlet's cash drawer */
  stream('pos')
  const nowMinute = now.getHours() * 60 + now.getMinutes()
  const incoming = []
  if (R.online) {
    R.outlets.filter((o) => o.status === 'ACTIVE').forEach((o, oi) => {
      const menu = servingAt(Math.min(nowMinute, 21 * 60)).filter((i) => i !== offItem || o.id !== first)
      const count = oi === 0 ? 2 : oi % 2
      for (let k = 0; k < count && menu.length; k++) {
        const platform = (oi + k) % 2 ? 'ZOMATO' : 'SWIGGY'
        const lines = []
        for (let n = 0; n < 1 + Math.floor(r() * 3); n++) {
          const it = pick(r, menu)
          const ex = lines.find((l) => l.itemId === it.id)
          ex ? (ex.qty += 1) : lines.push({ itemId: it.id, name: it.name, categoryId: it.categoryId, qty: 1 + Math.floor(r() * 2), price: it.price })
        }
        const subtotal = lines.reduce((t, l) => t + l.qty * l.price, 0)
        const gst = round2(subtotal * GST_RATE)
        incoming.push({
          id: `${platform === 'SWIGGY' ? 'SW' : 'ZO'}${Math.floor(r() * 9e7 + 1e7)}`, outletId: o.id, platform,
          customer: `${pick(r, GUESTS).split(' ')[0]} ${String.fromCharCode(65 + Math.floor(r() * 20))}.`,
          items: lines, subtotal, gst, total: Math.round(subtotal + gst),
          note: k === 0 ? 'Less spicy please' : null, placedAt: ago(0.5 + k * 1.5), status: 'NEW',
        })
      }
    })
  }
  const drawers = Object.fromEntries(R.outlets.filter((o) => o.status === 'ACTIVE').map((o) => {
    const mgr = staffAt(o.id, 'MANAGER')[0]?.name ?? R.owner
    const opened = dayStart.getTime() + toMin(o.opens) * 60_000 - 15 * 60_000
    return [o.id, {
      openingFloat: 5000, openedAt: at(Math.min(opened, nowMs)), openedBy: mgr,
      movements: [
        { id: `CM-${o.code}-1`, type: 'OUT', amount: 640, reason: 'Milk top-up from Nandini booth', by: mgr, at: ago(200) },
        { id: `CM-${o.code}-2`, type: 'IN', amount: 2000, reason: 'Change in ₹10 and ₹20 notes from bank', by: mgr, at: ago(420) },
      ],
      dayEnd: null,
    }]
  }))

  return {
    restaurant: { ...R, renewsOn: at(nowMs + R.renewsOn * 86400_000) },
    outlets: R.outlets,
    categories, items, staff, tables, orders, reservations, history, inventory, movements, wastage, expenses, approvals, notifications, audit, settings,
    incoming, drawers,
  }
}
