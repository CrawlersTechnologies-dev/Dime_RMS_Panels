import { createContext, useContext, useMemo } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { usePlatform } from '../../../context/PlatformContext'
import { GST_RATE } from '../../owner/data/seed'

/**
 * Manager/Biller panel store. Reads and writes the same restaurant data as the owner panel
 * (PlatformContext), scoped to the signed-in staff member's outlet. Requests that need the
 * owner (cancellations, discounts above the limit, refunds, stock corrections, large expenses)
 * land in the owner's Approvals and Expenses. Each action notes the endpoint it stands in for.
 */
const Ctx = createContext(null)
export const RUNNING = ['PREPARING', 'READY', 'SERVED']
const nowIso = () => new Date().toISOString()
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
let seq = 0
const uid = (p) => `${p}-${Date.now().toString(36)}${(++seq).toString(36)}`

/** Bill maths shared by the bill panel, settle dialog and orders. */
export function billOf(lines, discount = 0) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0)
  const taxable = Math.max(0, subtotal - discount)
  const gst = Math.round(taxable * GST_RATE * 100) / 100
  const exact = taxable + gst
  const total = Math.round(exact)
  return { subtotal, discount, taxable, gst, cgst: gst / 2, sgst: gst / 2, roundOff: Math.round((total - exact) * 100) / 100, total }
}

export function PosDataProvider({ children }) {
  const { user } = useAuth()
  const { dbFor, updateDb } = usePlatform()
  const rid = user.restaurantId
  const oid = user.outletId
  const db = dbFor(rid)
  const outlet = db.outlets.find((o) => o.id === oid)
  const patch = (fn) => updateDb(rid, fn)
  const actor = user.name
  const role = user.staffType === 'MANAGER' ? 'Manager' : 'Biller'

  const audit = (d, action, target, changes = {}) => [{ id: uid('OA'), actor: `${actor} (${role})`, source: 'Biller panel', action, target, outletId: oid, at: nowIso(), changes }, ...d.audit]
  const notify = (d, n) => [{ id: uid('NT'), outletId: oid, at: nowIso(), read: false, ...n }, ...d.notifications]

  const nextOrderId = (d) => {
    const nums = d.orders.filter((o) => o.outletId === oid).map((o) => Number(o.id.split('-')[1]) || 0)
    return `${outlet.code}-${String(Math.max(411, ...nums) + 1).padStart(4, '0')}`
  }
  const itemPrep = (d, lines) => Math.max(5, ...lines.map((l) => d.items.find((i) => i.id === l.itemId)?.prepMins ?? 5))

  /* ---------- Orders and bills ---------- */

  // POST /orders  (creates the order and sends the first KOT)
  const placeOrder = ({ type, tableId, guests, lines, phone }) => {
    const id = nextOrderId(db)
    patch((d) => {
      const table = tableId ? d.tables[oid].find((t) => t.id === tableId) : null
      const b = billOf(lines)
      const order = {
        id, outletId: oid, type, table: table?.name ?? null, guests: table ? guests : null, items: lines, subtotal: b.subtotal, discount: 0, gst: b.gst, total: b.total,
        payment: null, status: 'PREPARING', placedAt: nowIso(), biller: actor, prepMins: itemPrep(d, lines), phone: phone || null,
        kots: [{ no: 1, at: nowIso(), lines }],
      }
      return {
        orders: [order, ...d.orders],
        tables: table ? { ...d.tables, [oid]: d.tables[oid].map((t) => (t.id === table.id ? { ...t, status: 'OCCUPIED', orderId: id, since: nowIso(), guests } : t)) } : d.tables,
        audit: audit(d, 'Sent KOT', `${id}${table ? `, table ${table.name}` : ''}`),
      }
    })
    return id
  }

  // POST /orders/:id/kots  (adds items to a running order)
  const addToOrder = (orderId, lines) => patch((d) => ({
    orders: d.orders.map((o) => {
      if (o.id !== orderId) return o
      const items = o.items.map((x) => ({ ...x }))
      lines.forEach((l) => { const ex = items.find((x) => x.itemId === l.itemId); if (ex) ex.qty += l.qty; else items.push({ ...l }) })
      const b = billOf(items, o.discount)
      return { ...o, items, subtotal: b.subtotal, gst: b.gst, total: b.total, status: 'PREPARING', kots: [...(o.kots ?? [{ no: 1, at: o.placedAt, lines: o.items }]), { no: (o.kots?.length ?? 1) + 1, at: nowIso(), lines }] }
    }),
    audit: audit(d, 'Sent KOT', `${orderId}, ${lines.reduce((s, l) => s + l.qty, 0)} more items`),
  }))

  // POST /orders/:id/settle { payment, discountPct, tendered }
  const settle = (orderId, { payment, discountPct = 0, tendered = null }) => patch((d) => {
    const o = d.orders.find((x) => x.id === orderId)
    // An owner-approved discount on this order stays unless the biller applies one now.
    const discount = discountPct ? Math.round((o.subtotal * discountPct) / 100) : o.discount ?? 0
    const b = billOf(o.items, discount)
    return {
      orders: d.orders.map((x) => (x.id === orderId ? { ...x, discount, gst: b.gst, total: b.total, payment, tendered, status: 'COMPLETED', paidAt: nowIso() } : x)),
      tables: o.table ? { ...d.tables, [oid]: d.tables[oid].map((t) => (t.orderId === orderId ? { ...t, status: 'CLEANING', orderId: null, since: null, guests: null } : t)) } : d.tables,
      audit: audit(d, 'Settled bill', `${orderId}, ₹${b.total} by ${payment}`, discount ? { discount: [0, `${discountPct}%`] } : {}),
    }
  })

  // PATCH /orders/:id { status }
  const setOrderStatus = (orderId, status) => patch((d) => ({ orders: d.orders.map((o) => (o.id === orderId ? { ...o, status } : o)) }))

  // PATCH /tables/:id { status }
  const setTableStatus = (tableId, status) => patch((d) => ({ tables: { ...d.tables, [oid]: d.tables[oid].map((t) => (t.id === tableId ? { ...t, status, ...(status === 'FREE' ? { orderId: null, since: null, guests: null } : {}) } : t)) } }))

  /* ---------- Requests to the owner ---------- */

  // POST /approvals  → Owner › Approvals
  const requestApproval = (req) => patch((d) => {
    const label = { CANCELLATION: 'Cancellation', DISCOUNT: 'Discount', REFUND: 'Refund', STOCK_ADJUSTMENT: 'Stock correction' }[req.type]
    return {
      approvals: [{ id: uid('APR'), outletId: oid, by: actor, at: nowIso(), status: 'PENDING', ...req }, ...d.approvals],
      notifications: notify(d, { kind: 'APPROVAL', title: `${label} needs approval`, body: `${actor} asked at ${outlet.name}${req.orderId ? ` for ${req.orderId}` : ''}.`, link: '/owner/approvals' }),
      audit: audit(d, `Requested ${label.toLowerCase()}`, req.orderId ?? d.inventory.find((i) => i.id === req.itemId)?.name),
    }
  })

  /* ---------- Delivery apps ---------- */

  // POST /online-orders/:id/accept
  const acceptOnline = (inc, prepMins) => patch((d) => ({
    incoming: d.incoming.filter((x) => x.id !== inc.id),
    orders: [{
      id: inc.id, outletId: oid, type: inc.platform, table: null, guests: null, items: inc.items, subtotal: inc.subtotal, discount: 0, gst: inc.gst, total: inc.total,
      payment: inc.platform, status: 'PREPARING', placedAt: inc.placedAt, acceptedAt: nowIso(), biller: null, prepMins, customer: inc.customer, note: inc.note,
      kots: [{ no: 1, at: nowIso(), lines: inc.items }],
    }, ...d.orders],
    audit: audit(d, `Accepted ${inc.platform === 'SWIGGY' ? 'Swiggy' : 'Zomato'} order`, `${inc.id}, ready in ${prepMins} min`),
  }))

  // POST /online-orders/:id/reject { reason }
  const rejectOnline = (inc, reason) => patch((d) => ({
    incoming: d.incoming.filter((x) => x.id !== inc.id),
    audit: audit(d, `Rejected ${inc.platform === 'SWIGGY' ? 'Swiggy' : 'Zomato'} order`, inc.id, { reason: [null, reason] }),
  }))

  /* ---------- Cash drawer, expenses, stock ---------- */

  // POST /outlets/:id/cash-movements
  const addCashMovement = (type, amount, reason) => patch((d) => ({
    drawers: { ...d.drawers, [oid]: { ...d.drawers[oid], movements: [{ id: uid('CM'), type, amount, reason, by: actor, at: nowIso() }, ...d.drawers[oid].movements] } },
    audit: audit(d, type === 'IN' ? 'Cash added to drawer' : 'Cash taken from drawer', `₹${amount}, ${reason}`),
  }))

  // POST /expenses  (auto-approved up to the owner's limit, otherwise pending)
  const addExpense = (e) => {
    const auto = e.amount <= db.settings.limits.expenseApproval
    patch((d) => ({
      expenses: [{ ...e, id: uid('EXP'), outletId: oid, by: actor, at: nowIso(), status: auto ? 'APPROVED' : 'PENDING' }, ...d.expenses],
      ...(auto ? {} : { notifications: notify(d, { kind: 'APPROVAL', title: 'Expense above your limit', body: `${actor}: ${e.description}, ₹${e.amount}.`, link: '/owner/expenses' }) }),
      audit: audit(d, 'Recorded expense', `${e.description}, ₹${e.amount}`),
    }))
    return auto
  }

  // POST /outlets/:id/day-end
  const closeDay = (summary) => patch((d) => ({
    drawers: { ...d.drawers, [oid]: { ...d.drawers[oid], dayEnd: { ...summary, at: nowIso(), by: actor } } },
    notifications: notify(d, { kind: 'DAY_END', title: `Day closed at ${outlet.name}`, body: `${actor} closed the day. Cash ${summary.difference === 0 ? 'matched' : `${summary.difference > 0 ? 'over' : 'short'} by ₹${Math.abs(summary.difference)}`}.`, link: '/owner/reports' }),
    audit: audit(d, 'Closed day end', 'Today', { cashExpected: [null, summary.expected], cashCounted: [null, summary.counted] }),
  }))
  const reopenDay = () => patch((d) => ({
    drawers: { ...d.drawers, [oid]: { ...d.drawers[oid], dayEnd: null } },
    audit: audit(d, 'Reopened day', 'Today'),
  }))

  const saveSettings = (section, values) => patch((d) => ({ settings: { ...d.settings, [section]: values }, audit: audit(d, 'Changed biller settings', section) }))

  /* ---------- Derived ---------- */

  const derived = useMemo(() => {
    const orders = db.orders.filter((o) => o.outletId === oid)
    const drawer = db.drawers?.[oid]
    const since = drawer ? new Date(drawer.openedAt) : new Date(0)
    const paidSince = orders.filter((o) => o.status === 'COMPLETED' && new Date(o.paidAt ?? o.placedAt) >= since)
    const by = (p) => paidSince.filter((o) => o.payment === p).reduce((s, o) => s + o.total - (o.refunded ?? 0), 0)
    const cashIn = drawer?.movements.filter((m) => m.type === 'IN').reduce((s, m) => s + m.amount, 0) ?? 0
    const cashOut = drawer?.movements.filter((m) => m.type === 'OUT').reduce((s, m) => s + m.amount, 0) ?? 0
    const now = new Date()
    const minute = now.getHours() * 60 + now.getMinutes()
    const servingNow = new Set(db.categories.filter((c) => minute >= toMin(c.from) && minute <= toMin(c.to)).map((c) => c.id))
    return {
      orders,
      running: orders.filter((o) => RUNNING.includes(o.status)),
      tables: db.tables[oid] ?? [],
      incoming: (db.incoming ?? []).filter((x) => x.outletId === oid),
      drawer,
      cash: { float: drawer?.openingFloat ?? 0, sales: by('CASH'), upi: by('UPI'), card: by('CARD'), online: by('SWIGGY') + by('ZOMATO'), in: cashIn, out: cashOut, expected: (drawer?.openingFloat ?? 0) + by('CASH') + cashIn - cashOut },
      dayClosed: !!drawer?.dayEnd,
      servingNow,
      available: (item) => item.outlets[oid] !== false,
      limits: db.settings.limits,
      discountLimit: user.staffType === 'MANAGER' ? db.settings.limits.managerDiscountPct : db.settings.limits.billerDiscountPct,
      kotPrinter: db.settings.printers.find((p) => p.outletId === oid && p.kind === 'KOT'),
      myRequests: db.approvals.filter((a) => a.outletId === oid && a.by === actor),
    }
  }, [db, oid, actor, user.staffType])

  const value = {
    ...derived, db, outlet, restaurant: db.restaurant, items: db.items, categories: db.categories, inventory: db.inventory, settings: db.settings, actor, role,
    placeOrder, addToOrder, settle, setOrderStatus, setTableStatus, requestApproval, acceptOnline, rejectOnline,
    addCashMovement, addExpense, closeDay, reopenDay, saveSettings,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const usePos = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePos must be used inside <PosDataProvider>')
  return ctx
}
