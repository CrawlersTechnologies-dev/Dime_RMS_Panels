import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { ROLE_LABELS } from '../../../config/permissions'
import { GST_RATE } from './seed'
import { usePlatform } from '../../../context/PlatformContext'
import { ownerModules } from '../nav'

const featureOfLink = Object.fromEntries(ownerModules.map((m) => [m.to, m.feature]))

/**
 * In-memory store for the owner panel while the API is being built.
 * Each action notes the endpoint it stands in for and writes an audit entry the way the
 * server should. All data is per restaurant; `outletId` scopes what pages show.
 */
const Ctx = createContext(null)

export const ALL = 'ALL'
const outletKey = (rid) => `dq.outlet.${rid}`
const readOutlet = (rid) => { try { return localStorage.getItem(outletKey(rid)) } catch { return null } }
const writeOutlet = (rid, v) => { try { localStorage.setItem(outletKey(rid), v) } catch { /* storage unavailable */ } }

let seq = 1000
const nextId = (prefix) => `${prefix}-${++seq}`
const nowIso = () => new Date().toISOString()

export function OwnerDataProvider({ children }) {
  const { user, can } = useAuth()
  // Shared with the Manager/Biller panel through PlatformContext.
  const { dbFor, updateDb } = usePlatform()
  const db = dbFor(user.restaurantId)
  const { restaurant, outlets } = db
  const isFranchise = outlets.length > 1

  const [outletId, setOutletIdState] = useState(() => {
    if (!isFranchise) return outlets[0].id
    const saved = readOutlet(restaurant.id)
    return saved === ALL || outlets.some((o) => o.id === saved) ? saved : ALL
  })
  const setOutletId = (id) => { setOutletIdState(id); writeOutlet(restaurant.id, id) }

  const outlet = outlets.find((o) => o.id === outletId) ?? null
  const outletName = (id) => (id ? outlets.find((o) => o.id === id)?.name ?? id : 'All outlets')
  const inScope = useCallback((oid) => outletId === ALL || !oid || oid === outletId, [outletId])
  const scoped = useCallback((list, key = 'outletId') => list.filter((x) => inScope(x[key])), [inScope])
  const actor = `${user.name} (${ROLE_LABELS[user.role].replace('Restaurant ', '')})`

  const patch = (fn) => updateDb(user.restaurantId, fn)
  const log = (action, target, oid = null, changes = {}) =>
    patch((d) => ({ audit: [{ id: nextId('OA'), actor, source: 'Owner panel', action, target, outletId: oid, at: nowIso(), changes }, ...d.audit] }))

  /* ---------- Menu ---------- */

  // POST /menu/items  or  PUT /menu/items/:id
  const saveItem = (item) => {
    const exists = db.items.some((i) => i.id === item.id)
    const before = db.items.find((i) => i.id === item.id)
    const next = exists ? item : { ...item, id: nextId('itm'), outlets: Object.fromEntries(outlets.map((o) => [o.id, true])) }
    patch((d) => ({ items: exists ? d.items.map((i) => (i.id === item.id ? next : i)) : [...d.items, next] }))
    log(exists ? 'Edited menu item' : 'Added menu item', next.name, null, before && before.price !== next.price ? { price: [before.price, next.price] } : {})
    return next
  }

  // PATCH /outlets/:outletId/menu/items/:id { available }
  const setItemAvailable = (item, oids, available) => {
    patch((d) => ({ items: d.items.map((i) => (i.id === item.id ? { ...i, outlets: { ...i.outlets, ...Object.fromEntries(oids.map((o) => [o, available])) } } : i)) }))
    log(available ? 'Marked item available' : 'Marked item unavailable', item.name, oids.length === 1 ? oids[0] : null, { available: [!available, available] })
  }

  // PUT /menu/categories/:id
  const saveCategory = (cat) => {
    const exists = db.categories.some((c) => c.id === cat.id)
    patch((d) => ({ categories: exists ? d.categories.map((c) => (c.id === cat.id ? cat : c)) : [...d.categories, { ...cat, id: nextId('cat'), sort: d.categories.length }] }))
    log(exists ? 'Changed category timing' : 'Added category', cat.name, null, { timing: [null, `${cat.from} to ${cat.to}`] })
  }

  /* ---------- Inventory ---------- */

  const changeStock = (itemId, oid, delta, movement) =>
    patch((d) => ({
      inventory: d.inventory.map((i) => (i.id === itemId ? { ...i, stock: { ...i.stock, [oid]: Math.max(0, Math.round((i.stock[oid] + delta) * 100) / 100) } } : i)),
      movements: [{ id: nextId('MV'), itemId, outletId: oid, qty: delta, by: actor, source: 'Owner panel', at: nowIso(), ...movement }, ...d.movements],
    }))

  // POST /inventory/purchases
  const recordPurchase = ({ itemId, outletId: oid, qty, note }) => {
    const item = db.inventory.find((i) => i.id === itemId)
    changeStock(itemId, oid, qty, { kind: 'PURCHASE', note })
    log('Recorded purchase', `${item.name}, ${qty} ${item.unit}`, oid)
  }

  // POST /inventory/wastage
  const recordWastage = ({ itemId, outletId: oid, qty, reason }) => {
    const item = db.inventory.find((i) => i.id === itemId)
    changeStock(itemId, oid, -qty, { kind: 'WASTAGE', note: reason })
    patch((d) => ({ wastage: [{ id: nextId('WS'), itemId, outletId: oid, qty, reason, by: actor, at: nowIso() }, ...d.wastage] }))
    log('Recorded wastage', `${item.name}, ${qty} ${item.unit}`, oid, { reason: [null, reason] })
  }

  // PUT /inventory/:id/stock  (owner adjustments apply directly; staff ones go to approvals)
  const setStock = (item, oid, qty, reason) => {
    const before = item.stock[oid]
    changeStock(item.id, oid, qty - before, { kind: 'ADJUSTMENT', note: reason })
    log('Adjusted stock', item.name, oid, { stock: [before, qty] })
  }

  // PATCH /inventory/:id { reorder }
  const setReorder = (item, reorder) => {
    patch((d) => ({ inventory: d.inventory.map((i) => (i.id === item.id ? { ...i, reorder } : i)) }))
    log('Changed reorder level', item.name, null, { reorder: [item.reorder, reorder] })
  }

  /* ---------- Staff and access ---------- */

  // POST /staff  or  PUT /staff/:id
  const saveStaff = (s) => {
    const exists = db.staff.some((x) => x.id === s.id)
    const next = exists ? s : { ...s, id: nextId('STF'), status: 'ACTIVE', granted: [], joinedOn: nowIso().slice(0, 10) }
    patch((d) => ({ staff: exists ? d.staff.map((x) => (x.id === s.id ? next : x)) : [...d.staff, next] }))
    log(exists ? 'Edited staff member' : 'Added staff member', next.name, next.outletId)
    return next
  }

  // PATCH /staff/:id { status }
  const setStaffStatus = (s, status) => {
    patch((d) => ({ staff: d.staff.map((x) => (x.id === s.id ? { ...x, status } : x)) }))
    log(status === 'ACTIVE' ? 'Reactivated staff member' : 'Deactivated staff member', s.name, s.outletId, { status: [s.status, status] })
  }

  // PUT /staff/:id/permissions { granted }
  const setStaffAccess = (s, granted) => {
    const before = new Set(s.granted)
    const after = new Set(granted)
    const changes = {}
    for (const f of new Set([...before, ...after])) if (before.has(f) !== after.has(f)) changes[f] = [before.has(f), after.has(f)]
    patch((d) => ({ staff: d.staff.map((x) => (x.id === s.id ? { ...x, granted } : x)) }))
    log('Changed staff access', s.name, s.outletId, changes)
  }

  /* ---------- Tables and reservations ---------- */

  const updateTable = (oid, tableId, fields) =>
    patch((d) => ({ tables: { ...d.tables, [oid]: d.tables[oid].map((t) => (t.id === tableId ? { ...t, ...fields } : t)) } }))

  // PATCH /tables/:id { status }
  const setTableStatus = (oid, table, status) => {
    updateTable(oid, table.id, status === 'FREE' ? { status, orderId: null, since: null, guests: null } : { status })
    log('Changed table status', `Table ${table.name}`, oid, { status: [table.status, status] })
  }

  // POST /tables
  const addTable = (oid, { name, section, seats }) => {
    patch((d) => ({ tables: { ...d.tables, [oid]: [...d.tables[oid], { id: `${oid}-${name}`, name, section, seats, status: 'FREE' }] } }))
    log('Added table', `Table ${name} (${seats} seats)`, oid)
  }

  const setReservation = (res, fields) => patch((d) => ({ reservations: d.reservations.map((r) => (r.id === res.id ? { ...r, ...fields } : r)) }))

  // POST /reservations/:id/confirm { tableId }
  const confirmReservation = (res, tableId) => {
    setReservation(res, { status: 'CONFIRMED', tableId })
    log('Confirmed booking', `${res.name}, ${res.guests} guests`, res.outletId)
  }
  // POST /reservations/:id/decline { reason }
  const declineReservation = (res, reason) => {
    setReservation(res, { status: 'DECLINED', declineReason: reason })
    log('Declined booking', `${res.name}, ${res.guests} guests`, res.outletId, { reason: [null, reason] })
  }
  // POST /reservations/:id/seat
  const seatReservation = (res) => {
    setReservation(res, { status: 'SEATED' })
    const t = db.tables[res.outletId].find((x) => x.id === res.tableId)
    if (t) updateTable(res.outletId, t.id, { status: 'OCCUPIED', since: nowIso(), guests: res.guests, orderId: null })
    log('Seated booking', `${res.name} at ${t?.name ?? 'table'}`, res.outletId)
  }
  // POST /reservations
  const addReservation = (res) => {
    patch((d) => ({ reservations: [...d.reservations, { ...res, id: nextId('BK'), status: 'CONFIRMED', source: 'PHONE' }] }))
    log('Added booking', `${res.name}, ${res.guests} guests`, res.outletId)
  }

  /* ---------- Expenses ---------- */

  // POST /expenses
  const addExpense = (e) => {
    patch((d) => ({ expenses: [{ ...e, id: nextId('EXP'), by: actor, at: nowIso(), status: 'APPROVED' }, ...d.expenses] }))
    log('Added expense', `${e.description}, ₹${e.amount}`, e.outletId)
  }
  // POST /expenses/:id/decision
  const decideExpense = (e, status, note) => {
    patch((d) => ({ expenses: d.expenses.map((x) => (x.id === e.id ? { ...x, status, decisionNote: note, decidedAt: nowIso() } : x)) }))
    log(status === 'APPROVED' ? 'Approved expense' : 'Rejected expense', `${e.description}, ₹${e.amount}`, e.outletId, { status: [e.status, status] })
  }

  /* ---------- Approvals ---------- */

  // POST /approvals/:id/decision — approving also applies the change
  const decideApproval = (a, status, note) => {
    patch((d) => {
      const out = { approvals: d.approvals.map((x) => (x.id === a.id ? { ...x, status, decisionNote: note, decidedBy: actor, decidedAt: nowIso() } : x)) }
      if (status !== 'APPROVED') return out
      if (a.type === 'CANCELLATION') out.orders = d.orders.map((o) => (o.id === a.orderId ? { ...o, status: 'CANCELLED' } : o))
      if (a.type === 'REFUND') out.orders = d.orders.map((o) => (o.id === a.orderId ? { ...o, refunded: a.amount } : o))
      if (a.type === 'DISCOUNT') {
        out.orders = d.orders.map((o) => {
          if (o.id !== a.orderId) return o
          const discount = a.amount
          const gst = Math.round((o.subtotal - discount) * GST_RATE * 100) / 100
          return { ...o, discount, gst, total: Math.round(o.subtotal - discount + gst) }
        })
      }
      if (a.type === 'STOCK_ADJUSTMENT') {
        out.inventory = d.inventory.map((i) => (i.id === a.itemId ? { ...i, stock: { ...i.stock, [a.outletId]: a.to } } : i))
        out.movements = [{ id: nextId('MV'), itemId: a.itemId, outletId: a.outletId, kind: 'ADJUSTMENT', qty: a.to - a.from, by: a.by, source: 'Approved by owner', note: a.reason, at: nowIso() }, ...d.movements]
      }
      return out
    })
    const label = { CANCELLATION: 'cancellation', DISCOUNT: 'discount', REFUND: 'refund', STOCK_ADJUSTMENT: 'stock adjustment' }[a.type]
    log(`${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${label}`, a.orderId ?? db.inventory.find((i) => i.id === a.itemId)?.name, a.outletId, note ? { note: [null, note] } : {})
  }

  /* ---------- Notifications ---------- */

  const markRead = (id) => patch((d) => ({ notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
  const markAllRead = () => patch((d) => ({ notifications: d.notifications.map((n) => (inScope(n.outletId) ? { ...n, read: true } : n)) }))

  /* ---------- Settings ---------- */

  // PUT /restaurants/:id/settings/:section
  const saveSettings = (section, values, label) => {
    patch((d) => ({ settings: { ...d.settings, [section]: values } }))
    log(`Changed ${label} settings`, restaurant.name)
  }

  // Only alerts for modules this person can open.
  const notifications = useMemo(() => db.notifications.filter((n) => !n.link || can(featureOfLink[n.link])), [db.notifications, can])

  const derived = useMemo(() => {
    const pendingApprovals = db.approvals.filter((a) => a.status === 'PENDING' && inScope(a.outletId)).length
    const pendingExpenses = db.expenses.filter((e) => e.status === 'PENDING' && inScope(e.outletId)).length
    const unread = notifications.filter((n) => !n.read && inScope(n.outletId)).length
    const bookingRequests = db.reservations.filter((r) => r.status === 'REQUESTED' && inScope(r.outletId)).length
    const activeOutlets = outlets.filter((o) => o.status === 'ACTIVE')
    const scopeOutlets = outletId === ALL ? outlets : outlets.filter((o) => o.id === outletId)
    return { pendingApprovals, pendingExpenses, unread, bookingRequests, activeOutlets, scopeOutlets }
  }, [db, notifications, inScope, outlets, outletId])

  const value = {
    ...db, notifications, ...derived, isFranchise, outletId, setOutletId, outlet, outletName, inScope, scoped, actor,
    saveItem, setItemAvailable, saveCategory,
    recordPurchase, recordWastage, setStock, setReorder,
    saveStaff, setStaffStatus, setStaffAccess,
    setTableStatus, addTable, confirmReservation, declineReservation, seatReservation, addReservation,
    addExpense, decideExpense, decideApproval, markRead, markAllRead, saveSettings, log,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useOwnerData = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOwnerData must be used inside <OwnerDataProvider>')
  return ctx
}

/** Stock state for one item at one outlet. */
export const stockState = (item, oid) => {
  const q = item.stock[oid] ?? 0
  return q <= 0 ? 'OUT' : q < item.reorder ? 'LOW' : 'OK'
}

/** Orders that are still open (kitchen or table). */
export const RUNNING = ['PREPARING', 'READY', 'SERVED']
