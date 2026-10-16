import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Armchair, Minus, Percent, Plus, Search, ShoppingBag, Trash2, Users, X } from 'lucide-react'
import Button from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Input } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, timeAgo } from '../../../lib/format'
import { VegMark } from '../../owner/pages/Menu'
import { billOf, RUNNING, usePos } from '../data/PosDataContext'

const fmtTime = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(); d.setHours(h, m); return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: m ? '2-digit' : undefined }) }
const rupees = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const emptyBill = { type: 'DINE_IN', tableId: null, guests: 2, orderId: null, cart: [], discountPct: 0 }

export default function Billing() {
  const pos = usePos()
  const toast = useToast()
  const [bill, setBill] = useState(emptyBill)
  const [cat, setCat] = useState('ALL')
  const [q, setQ] = useState('')
  const [picking, setPicking] = useState(false)
  const [settling, setSettling] = useState(null) // order id
  const [discounting, setDiscounting] = useState(false)
  const [afterHours, setAfterHours] = useState(false) // biller chose to sell items outside their category timings
  const isServing = (categoryId) => afterHours || pos.servingNow.has(categoryId)
  const someClosed = pos.categories.some((c) => !pos.servingNow.has(c.id))

  const order = bill.orderId ? pos.orders.find((o) => o.id === bill.orderId) : null
  const table = bill.tableId ? pos.tables.find((t) => t.id === bill.tableId) : null
  const lines = [...(order?.items ?? []), ...bill.cart]
  const merged = lines.reduce((acc, l) => { const ex = acc.find((x) => x.itemId === l.itemId); ex ? (ex.qty += l.qty) : acc.push({ ...l }); return acc }, [])
  const discount = bill.discountPct ? Math.round((billOf(merged).subtotal * bill.discountPct) / 100) : order?.discount ?? 0
  const totals = billOf(merged, discount)

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return pos.items.filter((i) => (cat === 'ALL' || i.categoryId === cat) && (!needle || i.name.toLowerCase().includes(needle)))
  }, [pos.items, cat, q])

  const add = (item) => setBill((b) => {
    const ex = b.cart.find((l) => l.itemId === item.id)
    return { ...b, cart: ex ? b.cart.map((l) => (l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l)) : [...b.cart, { itemId: item.id, name: item.name, categoryId: item.categoryId, price: item.price, qty: 1 }] }
  })
  const setQty = (itemId, qty) => setBill((b) => ({ ...b, cart: qty <= 0 ? b.cart.filter((l) => l.itemId !== itemId) : b.cart.map((l) => (l.itemId === itemId ? { ...l, qty } : l)) }))

  const loadTable = (t) => {
    setPicking(false)
    setBill({ ...emptyBill, type: 'DINE_IN', tableId: t.id, guests: t.guests ?? Math.min(2, t.seats), orderId: t.orderId ?? null })
  }

  const kotNote = () => (pos.kotPrinter?.status === 'ERROR' ? ' Kitchen printer isn’t responding, so the chef app has it but nothing printed.' : ' Printed in the kitchen.')

  const sendKot = () => {
    if (order) {
      pos.addToOrder(order.id, bill.cart)
      toast(`KOT ${(order.kots?.length ?? 1) + 1} sent for table ${table?.name}.${kotNote()}`)
      setBill((b) => ({ ...b, cart: [] }))
    } else {
      const id = pos.placeOrder({ type: bill.type, tableId: bill.tableId, guests: bill.guests, lines: bill.cart })
      toast(`${id} sent to the kitchen.${kotNote()}`)
      if (bill.type === 'TAKEAWAY') setSettling(id)
      setBill((b) => ({ ...b, orderId: b.type === 'DINE_IN' ? id : null, cart: [] }))
    }
  }

  const reset = () => setBill(emptyBill)
  const openBills = pos.running.filter((o) => o.type === 'DINE_IN')

  if (pos.dayClosed) {
    return (
      <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-10 text-center">
        <h1 className="font-display text-2xl font-semibold">Day closed</h1>
        <p className="text-ink-500 mt-1">{pos.drawer.dayEnd.by} closed today’s billing at {new Date(pos.drawer.dayEnd.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}. Billing opens again tomorrow.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
      {/* Menu */}
      <section className="min-w-0">
        <h1 className="sr-only">Billing</h1>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label className="relative flex-1 basis-56 min-w-0">
            <span className="sr-only">Search items</span>
            <Search className="size-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" className="w-full h-11 rounded-xl border border-line-strong bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-500" />
          </label>
        </div>
        {pos.servingNow.size === 0 && !afterHours && (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-warn-600/30 bg-warn-50 px-4 py-3 text-sm">
            <span className="flex-1 min-w-0"><span className="font-semibold">All menu timings have ended for today.</span> Items are hidden from billing and the customer app until tomorrow.</span>
            <Button size="sm" variant="secondary" onClick={() => setAfterHours(true)}>Bill anyway</Button>
          </div>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" role="group" aria-label="Categories">
          {[{ id: 'ALL', name: 'All' }, ...pos.categories].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id}
              className={clsx('shrink-0 h-9 px-4 rounded-full text-sm font-semibold cursor-pointer border', cat === c.id ? 'bg-ink-900 text-white border-ink-900' : 'bg-surface border-line text-ink-700 hover:border-ink-400', c.id !== 'ALL' && !isServing(c.id) && cat !== c.id && 'text-ink-400')}>
              {c.name}
            </button>
          ))}
          {someClosed && (
            <button onClick={() => setAfterHours((v) => !v)} aria-pressed={afterHours}
              className={clsx('shrink-0 h-9 px-4 rounded-full text-sm font-semibold cursor-pointer border border-dashed ml-auto', afterHours ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line-strong text-ink-500 hover:border-ink-400')}>
              {afterHours ? 'Outside hours: on' : 'Allow outside hours'}
            </button>
          )}
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2.5 mt-2">
          {items.map((i) => {
            const available = pos.available(i)
            const serving = isServing(i.categoryId)
            const inCart = bill.cart.find((l) => l.itemId === i.id)?.qty
            const c = pos.categories.find((x) => x.id === i.categoryId)
            return (
              <li key={i.id}>
                <button
                  onClick={() => add(i)}
                  disabled={!available || !serving}
                  className={clsx('relative w-full h-24 rounded-xl border bg-surface p-3 text-left flex flex-col justify-between cursor-pointer transition-colors', inCart ? 'border-brand-500 shadow-[0_0_0_2px_var(--color-brand-100)]' : 'border-line hover:border-ink-400', (!available || !serving) && 'opacity-50 cursor-not-allowed hover:border-line')}
                >
                  <span className="flex items-start gap-1.5"><VegMark /><span className="text-sm font-semibold leading-tight line-clamp-2">{i.name}</span></span>
                  <span className="flex items-end justify-between gap-2">
                    <span className="tabular font-semibold">{formatINR(i.price)}</span>
                    <span className="text-[11px] text-ink-500 text-right leading-tight">{!available ? 'Switched off' : !serving ? `From ${fmtTime(c.from)}` : ''}</span>
                  </span>
                  {inCart && <span className="absolute -top-2 -right-2 grid place-items-center min-w-6 h-6 px-1.5 rounded-full bg-brand-500 text-white text-[12px] font-bold tabular">{inCart}</span>}
                </button>
              </li>
            )
          })}
        </ul>
        {items.length === 0 && <p className="text-sm text-ink-500 py-10 text-center">No items match “{q}”.</p>}
      </section>

      {/* On narrow screens the bill sits below the menu: keep a jump-to-bill bar in view. */}
      {(bill.cart.length > 0 || order) && (
        <a href="#current-bill" onClick={(e) => { e.preventDefault(); document.getElementById('current-bill')?.scrollIntoView({ behavior: 'smooth' }) }}
          className="xl:hidden fixed bottom-4 inset-x-4 z-30 flex items-center justify-between gap-3 rounded-full bg-ink-900 text-white pl-5 pr-2 h-14 shadow-xl">
          <span className="text-sm"><span className="font-semibold tabular">{merged.reduce((s, l) => s + l.qty, 0)} items</span>{table ? `, table ${table.name}` : bill.type === 'TAKEAWAY' ? ', takeaway' : ''}</span>
          <span className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-brand-500 font-semibold tabular">{formatINR(totals.total)}, view bill</span>
        </a>
      )}

      {/* Bill */}
      <aside id="current-bill" className="min-w-0 scroll-mt-20 xl:sticky xl:top-20 rounded-[var(--radius-panel)] border border-line bg-surface flex flex-col xl:max-h-[calc(100dvh-6.5rem)]">
        <div className="p-4 border-b border-line flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-ink-900/5 p-1" role="group" aria-label="Order type">
            {[['DINE_IN', 'Dine-in', Armchair], ['TAKEAWAY', 'Takeaway', ShoppingBag]].map(([v, label, Icon]) => (
              <button key={v} onClick={() => !order && setBill((b) => ({ ...b, type: v, tableId: v === 'TAKEAWAY' ? null : b.tableId }))} aria-pressed={bill.type === v} disabled={!!order && bill.type !== v}
                className={clsx('h-9 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed', bill.type === v ? 'bg-surface shadow-[0_1px_2px_rgba(18,32,41,.12)]' : 'text-ink-500')}>
                <Icon className="size-4" aria-hidden />{label}
              </button>
            ))}
          </div>
          {bill.type === 'DINE_IN' && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPicking(true)} className={clsx('flex-1 h-10 rounded-xl border px-3 text-left text-sm font-semibold cursor-pointer', table ? 'border-line-strong' : 'border-dashed border-brand-500 text-brand-700')}>
                {table ? `Table ${table.name}, ${table.section}` : 'Choose a table'}
              </button>
              <div className="flex items-center gap-1 rounded-xl border border-line-strong h-10 px-1" aria-label="Guests">
                <Users className="size-4 text-ink-500 ml-1.5" aria-hidden />
                <button className="p-1.5 rounded-lg hover:bg-ink-900/5 disabled:opacity-40" disabled={bill.guests <= 1} onClick={() => setBill((b) => ({ ...b, guests: b.guests - 1 }))} aria-label="Fewer guests"><Minus className="size-3.5" /></button>
                <span className="w-5 text-center text-sm font-semibold tabular">{bill.guests}</span>
                <button className="p-1.5 rounded-lg hover:bg-ink-900/5" onClick={() => setBill((b) => ({ ...b, guests: b.guests + 1 }))} aria-label="More guests"><Plus className="size-3.5" /></button>
              </div>
            </div>
          )}
          {!table && bill.type === 'DINE_IN' && openBills.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Open tables">
              <span className="text-[12px] text-ink-500 w-full">Open tables</span>
              {openBills.slice(0, 10).map((o) => (
                <button key={o.id} onClick={() => loadTable(pos.tables.find((t) => t.orderId === o.id) ?? { id: null })} className="h-7 px-2.5 rounded-full bg-canvas text-[12px] font-semibold hover:bg-ink-900/10 cursor-pointer">{o.table} <span className="text-ink-500 font-normal tabular">{formatINR(o.total)}</span></button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-40">
          {order && (
            <div className="mb-3">
              <div className="text-[12px] text-ink-500 mb-1.5">{order.id}, sent to kitchen {timeAgo(order.placedAt)}</div>
              <ul className="flex flex-col gap-1.5">
                {order.items.map((l) => (
                  <li key={l.itemId} className="flex items-baseline gap-2 text-sm text-ink-500">
                    <span className="tabular w-7">{l.qty} ×</span><span className="flex-1 min-w-0 truncate">{l.name}</span><span className="tabular">{formatINR(l.qty * l.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {bill.cart.length > 0 && (
            <div>
              {order && <div className="text-[12px] font-semibold text-brand-700 mb-1.5">New items, not sent yet</div>}
              <ul className="flex flex-col gap-2">
                {bill.cart.map((l) => (
                  <li key={l.itemId} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 min-w-0 truncate font-medium">{l.name}</span>
                    <span className="flex items-center rounded-lg border border-line-strong">
                      <button className="p-1.5 hover:bg-ink-900/5" onClick={() => setQty(l.itemId, l.qty - 1)} aria-label={`One less ${l.name}`}>{l.qty === 1 ? <Trash2 className="size-3.5 text-danger-600" /> : <Minus className="size-3.5" />}</button>
                      <span className="w-6 text-center tabular font-semibold">{l.qty}</span>
                      <button className="p-1.5 hover:bg-ink-900/5" onClick={() => setQty(l.itemId, l.qty + 1)} aria-label={`One more ${l.name}`}><Plus className="size-3.5" /></button>
                    </span>
                    <span className="tabular w-16 text-right">{formatINR(l.qty * l.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!order && bill.cart.length === 0 && <p className="text-sm text-ink-500 py-8 text-center">Tap items to add them to the bill.</p>}
        </div>

        <div className="border-t border-line p-4 flex flex-col gap-3">
          <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm tabular">
            <dt className="text-ink-500">Subtotal</dt><dd className="text-right">{rupees(totals.subtotal)}</dd>
            {totals.discount > 0 && <><dt className="text-ink-500">Discount {bill.discountPct ? `${bill.discountPct}%` : 'approved by owner'}</dt><dd className="text-right text-ok-600">−{rupees(totals.discount)}</dd></>}
            <dt className="text-ink-500">CGST 2.5% + SGST 2.5%</dt><dd className="text-right">{rupees(totals.gst)}</dd>
            {totals.roundOff !== 0 && <><dt className="text-ink-500">Round off</dt><dd className="text-right">{totals.roundOff > 0 ? '+' : '−'}{rupees(Math.abs(totals.roundOff))}</dd></>}
            <dt className="font-bold text-base pt-1">Total</dt><dd className="text-right font-display text-2xl font-semibold">{formatINR(totals.total)}</dd>
          </dl>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={Percent} disabled={!merged.length} onClick={() => setDiscounting(true)}>Discount</Button>
            {(order || bill.cart.length > 0) && <Button variant="ghost" size="sm" icon={X} onClick={reset} className="ml-auto">Clear</Button>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="dark" disabled={!bill.cart.length || (bill.type === 'DINE_IN' && !table)} onClick={sendKot} className={bill.type === 'TAKEAWAY' ? 'col-span-2' : undefined}>
              {bill.type === 'TAKEAWAY' ? 'Send KOT and take payment' : order ? 'Send new items' : 'Send KOT'}
            </Button>
            {bill.type === 'DINE_IN' && (
              <Button disabled={!order || bill.cart.length > 0} title={bill.cart.length ? 'Send the new items to the kitchen first' : undefined} onClick={() => setSettling(order.id)}>Settle bill</Button>
            )}
          </div>
          {bill.type === 'DINE_IN' && !table && bill.cart.length > 0 && <p className="text-[12px] text-brand-700 -mt-1">Choose a table to send this order.</p>}
        </div>
      </aside>

      {picking && <TablePicker onPick={loadTable} onClose={() => setPicking(false)} />}
      {settling && <SettleModal orderId={settling} discountPct={bill.discountPct} onClose={() => setSettling(null)} onDone={() => { setSettling(null); reset() }} />}
      {discounting && <DiscountModal pct={bill.discountPct} orderId={order?.id} onApply={(pct) => { setBill((b) => ({ ...b, discountPct: pct })); setDiscounting(false) }} onClose={() => setDiscounting(false)} />}
    </div>
  )
}

/* ------------------------------------------------------------------ */

const TILE = {
  FREE: 'bg-surface border-line-strong',
  OCCUPIED: 'bg-ink-900 border-ink-900 text-white',
  RESERVED: 'bg-brand-50 border-brand-200',
  CLEANING: 'bg-warn-50 border-warn-600/30',
}

function TablePicker({ onPick, onClose }) {
  const pos = usePos()
  const sections = [...new Set(pos.tables.map((t) => t.section))]
  return (
    <Modal open onClose={onClose} title="Choose a table" description="Occupied tables open their running bill." width="max-w-3xl">
      <div className="flex flex-col gap-5">
        {sections.map((sec) => (
          <section key={sec}>
            <h3 className="text-[13px] font-bold text-ink-500 mb-2">{sec}</h3>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
              {pos.tables.filter((t) => t.section === sec).map((t) => {
                const o = t.orderId ? pos.orders.find((x) => x.id === t.orderId) : null
                return (
                  <li key={t.id}>
                    <button onClick={() => onPick(t)} disabled={t.status === 'CLEANING'} className={clsx('w-full h-20 rounded-xl border-2 p-2.5 text-left flex flex-col justify-between cursor-pointer disabled:cursor-not-allowed disabled:opacity-60', TILE[t.status])}>
                      <span className="flex justify-between"><span className="font-display text-lg font-semibold">{t.name}</span><span className={clsx('text-[11px]', t.status === 'OCCUPIED' ? 'text-ink-300' : 'text-ink-500')}>{t.seats} seats</span></span>
                      <span className="text-[11px] font-semibold">{t.status === 'OCCUPIED' ? (o ? formatINR(o.total) : 'Seated') : t.status === 'FREE' ? <span className="text-ok-600">Free</span> : t.status === 'RESERVED' ? <span className="text-brand-700">Reserved</span> : <span className="text-warn-600">Being cleaned</span>}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}

function DiscountModal({ pct, orderId, onApply, onClose }) {
  const pos = usePos()
  const toast = useToast()
  const [value, setValue] = useState(pct || '')
  const n = Number(value)
  const over = n > pos.discountLimit
  const order = orderId ? pos.orders.find((o) => o.id === orderId) : null
  const [reason, setReason] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title="Discount"
      description={`You can give up to ${pos.discountLimit}% yourself. Anything more goes to the owner for approval.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {over ? (
            <Button disabled={!order || !reason.trim()} onClick={() => {
              pos.requestApproval({ type: 'DISCOUNT', orderId: order.id, percent: n, amount: Math.round((order.subtotal * n) / 100), reason: reason.trim() })
              toast(`Asked the owner to approve ${n}% on ${order.id}. The answer shows on this order in Orders.`)
              onClose()
            }}>Ask owner to approve</Button>
          ) : (
            <Button disabled={!(n >= 0)} onClick={() => onApply(n)}>Apply {n || 0}%</Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {[0, 5, 10, 15].map((p) => <button key={p} onClick={() => setValue(p)} className={clsx('h-9 px-4 rounded-full border text-sm font-semibold cursor-pointer', n === p ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line-strong')}>{p ? `${p}%` : 'None'}</button>)}
        </div>
        <Field label="Discount (%)" error={over && !order ? 'Send the KOT first. Approval requests need an order number.' : null}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="0" max="100" value={value} onChange={(e) => setValue(e.target.value)} />}</Field>
        {over && order && <Field label="Reason for the owner">{({ id }) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Regular customer, birthday group" />}</Field>}
      </div>
    </Modal>
  )
}

const QUICK_CASH = (total) => [...new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 500) * 500 + 500])].slice(0, 4)

function SettleModal({ orderId, discountPct, onClose, onDone }) {
  const pos = usePos()
  const toast = useToast()
  const order = pos.orders.find((o) => o.id === orderId)
  const modes = [['UPI', 'UPI'], ['CASH', 'Cash'], ['CARD', 'Card']].filter(([k]) => pos.settings.payments[k])
  const [payment, setPayment] = useState(modes[0][0])
  const [tendered, setTendered] = useState('')
  const [phone, setPhone] = useState('')
  if (!order) return null
  const b = billOf(order.items, discountPct ? Math.round((order.subtotal * discountPct) / 100) : order.discount ?? 0)
  const change = Number(tendered) - b.total
  const canSettle = payment !== 'CASH' || Number(tendered) >= b.total

  return (
    <Modal
      open
      onClose={onClose}
      title={`Settle ${order.id}`}
      description={`${order.table ? `Table ${order.table}` : 'Takeaway'}, ${order.items.reduce((s, l) => s + l.qty, 0)} items${discountPct ? `, ${discountPct}% discount` : ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{order.type === 'TAKEAWAY' ? 'Pay later' : 'Cancel'}</Button>
          <Button disabled={!canSettle} onClick={() => {
            pos.settle(order.id, { payment, discountPct, tendered: payment === 'CASH' ? Number(tendered) : null })
            toast(`${formatINR(b.total)} received by ${payment === 'CASH' ? 'cash' : payment}.${phone ? ' Bill sent on WhatsApp.' : ' Bill printed.'}`)
            onDone()
          }}>Mark paid, {formatINR(b.total)}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="font-display text-[40px] leading-none font-semibold tabular text-center py-2">{formatINR(b.total)}</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
          {modes.map(([k, label]) => (
            <button key={k} role="radio" aria-checked={payment === k} onClick={() => setPayment(k)} className={clsx('h-11 rounded-xl border-2 text-sm font-semibold cursor-pointer', payment === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line-strong')}>{label}</button>
          ))}
        </div>
        {payment === 'CASH' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">{QUICK_CASH(b.total).map((v) => <button key={v} onClick={() => setTendered(String(v))} className="h-9 px-3.5 rounded-full border border-line-strong text-sm font-semibold tabular cursor-pointer hover:border-ink-400">{formatINR(v)}</button>)}</div>
            <Field label="Cash received">{({ id }) => <Input id={id} type="number" inputMode="numeric" min="0" value={tendered} onChange={(e) => setTendered(e.target.value)} />}</Field>
            {tendered !== '' && <p className={clsx('text-sm font-semibold', change < 0 ? 'text-danger-600' : 'text-ok-600')}>{change < 0 ? `${formatINR(-change)} still to collect` : `Give back ${formatINR(change)}`}</p>}
          </div>
        )}
        {payment === 'UPI' && <p className="rounded-xl bg-canvas px-4 py-3 text-sm">Show the UPI QR on the counter stand, or the one printed on the bill. Pays to <span className="font-semibold">{pos.settings.payments.upiId}</span>. Mark paid once the customer shows the success screen.</p>}
        {payment === 'CARD' && <p className="rounded-xl bg-canvas px-4 py-3 text-sm">Enter {formatINR(b.total)} on the card machine. Mark paid when the charge slip prints.</p>}
        <Field label="Customer mobile for WhatsApp bill" hint="Optional">{({ id }) => <Input id={id} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98450 12345" />}</Field>
      </div>
    </Modal>
  )
}

export { RUNNING }
