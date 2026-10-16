import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CalendarPlus, Plus, Smartphone, Phone, Footprints, Users } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Input, Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, timeAgo } from '../../../lib/format'
import { useOwnerData } from '../data/OwnerDataContext'
import { PickOutlet, useScopeLabel } from '../components/common'

const STATUS = {
  FREE: { label: 'Free', tile: 'bg-surface border-line-strong text-ink-900', dot: 'bg-ok-600' },
  OCCUPIED: { label: 'Occupied', tile: 'bg-ink-900 border-ink-900 text-white', dot: 'bg-ink-900' },
  RESERVED: { label: 'Reserved', tile: 'bg-brand-50 border-brand-200 text-ink-900', dot: 'bg-brand-500' },
  CLEANING: { label: 'Being cleaned', tile: 'bg-warn-50 border-warn-600/30 text-ink-900', dot: 'bg-warn-600' },
}
const SOURCE = { CUSTOMER_APP: ['Customer app', Smartphone], PHONE: ['Phone', Phone], WALK_IN: ['Walk-in', Footprints] }
const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
const dayOf = (iso) => {
  const d = new Date(iso); const t = new Date()
  const diff = Math.round((new Date(d.toDateString()) - new Date(t.toDateString())) / 86400_000)
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function Tables() {
  const d = useOwnerData()
  const scope = useScopeLabel()
  const [tab, setTab] = useState('FLOOR')

  return (
    <>
      <PageHeader title="Tables and floor" description={`Live table status and bookings at ${scope}.`} />
      <PickOutlet
        title="Tables and bookings are managed per outlet. Choose one."
        summary={(o) => {
          const ts = d.tables[o.id]
          const used = ts.filter((t) => t.status === 'OCCUPIED').length
          const req = d.reservations.filter((r) => r.outletId === o.id && r.status === 'REQUESTED').length
          return (
            <div className="text-sm">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 rounded-full bg-canvas"><div className="h-full rounded-full bg-ink-800" style={{ width: `${(used / ts.length) * 100}%` }} /></div>
                <span className="tabular text-ink-700">{used} of {ts.length} in use</span>
              </div>
              {req > 0 && <p className="text-brand-700 font-semibold mt-2">{req} booking request{req > 1 ? 's' : ''} to confirm</p>}
            </div>
          )
        }}
      >
        <Tabs
          className="mb-4"
          tabs={[{ value: 'FLOOR', label: 'Floor' }, { value: 'BOOKINGS', label: 'Bookings', count: d.bookingRequests || undefined }]}
          value={tab}
          onChange={setTab}
          label="Tables sections"
        />
        {tab === 'FLOOR' ? <Floor /> : <Bookings />}
      </PickOutlet>
    </>
  )
}

/* ------------------------------------------------------------------ */

function Floor() {
  const d = useOwnerData()
  const toast = useToast()
  const tables = d.tables[d.outletId] ?? []
  const sections = [...new Set(tables.map((t) => t.section))]
  const [selectedId, setSelectedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const selected = tables.find((t) => t.id === selectedId)
  const order = selected?.orderId ? d.orders.find((o) => o.id === selected.orderId) : null
  const booking = selected ? d.reservations.find((r) => r.tableId === selected.id && r.status === 'CONFIRMED') : null
  const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, tables.filter((t) => t.status === k).length]))

  if (d.outlet?.status === 'SUSPENDED') return <Panel><p className="text-sm text-ink-500 py-6 text-center">This outlet is suspended, so tables can’t be used right now.</p></Panel>

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Table status counts">
          {Object.entries(STATUS).map(([k, s]) => (
            <li key={k} className="flex items-center gap-2"><span className={clsx('size-2.5 rounded-full', s.dot)} aria-hidden />{s.label} <span className="font-semibold tabular">{counts[k]}</span></li>
          ))}
        </ul>
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => setAdding(true)}>Add table</Button>
      </div>

      <div className="flex flex-col gap-6">
        {sections.map((sec) => (
          <Panel key={sec} title={sec} description={`${tables.filter((t) => t.section === sec).length} tables`}>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
              {tables.filter((t) => t.section === sec).map((t) => {
                const o = t.orderId ? d.orders.find((x) => x.id === t.orderId) : null
                const b = t.status === 'RESERVED' ? d.reservations.find((r) => r.tableId === t.id && r.status === 'CONFIRMED') : null
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelectedId(t.id)}
                      className={clsx('w-full aspect-[5/4] max-w-full rounded-2xl border-2 p-3 flex flex-col justify-between text-left cursor-pointer hover:shadow-md transition-shadow', STATUS[t.status].tile)}
                      aria-label={`Table ${t.name}, ${t.seats} seats, ${STATUS[t.status].label}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-display text-xl font-semibold">{t.name}</span>
                        <span className={clsx('inline-flex items-center gap-1 text-[12px]', t.status === 'OCCUPIED' ? 'text-ink-300' : 'text-ink-500')}><Users className="size-3.5" aria-hidden />{t.guests ?? t.seats}</span>
                      </span>
                      <span className="text-[12px] leading-tight">
                        {t.status === 'OCCUPIED' && (
                          <>
                            <span className="block font-semibold tabular">{o ? formatINR(o.total) : 'Seated'}</span>
                            <span className="block text-ink-300">{timeAgo(t.since).replace(' ago', '')}</span>
                          </>
                        )}
                        {t.status === 'RESERVED' && <span className="block text-brand-700 font-semibold">{b ? `${timeOf(b.at)}, ${b.name.split(' ')[0]}` : 'Reserved'}</span>}
                        {t.status === 'CLEANING' && <span className="block text-warn-600 font-semibold">Being cleaned</span>}
                        {t.status === 'FREE' && <span className="block text-ok-600 font-semibold">Free</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>
        ))}
      </div>

      {selected && (
        <Modal
          open
          onClose={() => setSelectedId(null)}
          title={`Table ${selected.name}`}
          description={`${selected.section}, ${selected.seats} seats. ${STATUS[selected.status].label}.`}
          footer={
            <>
              {selected.status !== 'FREE' && <Button onClick={() => { d.setTableStatus(d.outletId, selected, 'FREE'); toast(`Table ${selected.name} is free.`); setSelectedId(null) }}>Mark free</Button>}
              {selected.status === 'FREE' && <Button variant="secondary" onClick={() => { d.setTableStatus(d.outletId, selected, 'CLEANING'); toast(`Table ${selected.name} marked for cleaning.`); setSelectedId(null) }}>Mark being cleaned</Button>}
              <Button variant="dark" onClick={() => setSelectedId(null)}>Done</Button>
            </>
          }
        >
          {order && (
            <div className="rounded-xl border border-line p-4 text-sm">
              <div className="flex justify-between gap-3"><span className="font-semibold">Order {order.id}</span><StatusBadge status={order.status} /></div>
              <p className="text-ink-500 mt-1">{order.items.map((l) => `${l.qty} × ${l.name}`).join(', ')}</p>
              <p className="mt-2 font-semibold tabular">{formatINR(order.total)}<span className="font-normal text-ink-500">, seated {timeAgo(selected.since)}</span></p>
            </div>
          )}
          {selected.status === 'OCCUPIED' && !order && <p className="text-sm text-ink-500">Guests seated {timeAgo(selected.since)}. No order yet.</p>}
          {booking && <p className="text-sm">Booked for <span className="font-semibold">{booking.name}</span>, {booking.guests} guests at {timeOf(booking.at)}.</p>}
          {selected.status === 'OCCUPIED' && <p className="text-[13px] text-ink-500 mt-3">Usually the biller frees the table when the bill is paid. Use Mark free only if that didn’t happen.</p>}
        </Modal>
      )}
      {adding && <AddTable sections={sections} onClose={() => setAdding(false)} />}
    </>
  )
}

function AddTable({ sections, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', section: sections[0] ?? 'Hall', newSection: '', seats: 4 })
  const [error, setError] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const name = form.name.trim().toUpperCase()
    if (!name) return setError('Give the table a name, like A9.')
    if (d.tables[d.outletId].some((t) => t.name === name)) return setError(`Table ${name} already exists.`)
    const section = form.section === '__new' ? form.newSection.trim() || 'New section' : form.section
    d.addTable(d.outletId, { name, section, seats: Number(form.seats) })
    toast(`Table ${name} added to ${section}.`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Add table" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="add-table">Add table</Button></>}>
      <form id="add-table" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Table name" error={error}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError('') }} placeholder="A9" />}</Field>
        <Field label="Seats">{({ id }) => <Select id={id} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} options={[2, 4, 6, 8, 10].map((n) => ({ value: n, label: `${n} seats` }))} />}</Field>
        <Field label="Section" className="sm:col-span-2">{({ id }) => <Select id={id} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} options={[...sections, { value: '__new', label: 'New section…' }]} />}</Field>
        {form.section === '__new' && <Field label="New section name" className="sm:col-span-2">{({ id }) => <Input id={id} value={form.newSection} onChange={(e) => setForm({ ...form, newSection: e.target.value })} placeholder="Terrace" />}</Field>}
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */

function Bookings() {
  const d = useOwnerData()
  const toast = useToast()
  const [confirming, setConfirming] = useState(null)
  const [declining, setDeclining] = useState(null)
  const [adding, setAdding] = useState(false)
  const list = useMemo(
    // Requests first, then by time.
    () => d.reservations.filter((r) => r.outletId === d.outletId).sort((a, b) => (b.status === 'REQUESTED') - (a.status === 'REQUESTED') || new Date(a.at) - new Date(b.at)),
    [d.reservations, d.outletId],
  )
  const tableName = (id) => d.tables[d.outletId].find((t) => t.id === id)?.name

  return (
    <>
      <Panel
        flush
        title="Bookings"
        description="Requests from the customer app need confirming. Customers get a notification either way."
        actions={<Button size="sm" icon={CalendarPlus} onClick={() => setAdding(true)}>Add booking</Button>}
      >
        <ul className="divide-y divide-line border-t border-line">
          {list.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-500">No bookings yet. Phone bookings you add and customer app requests show up here.</li>}
          {list.map((r) => {
            const [src, SrcIcon] = SOURCE[r.source]
            const soon = (new Date(r.at) - Date.now()) / 60_000 < 60
            return (
              <li key={r.id} className={clsx('px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3', r.status === 'REQUESTED' && 'bg-brand-50/50')}>
                <div className="w-24 shrink-0">
                  <div className="font-display text-lg font-semibold tabular leading-tight">{timeOf(r.at)}</div>
                  <div className="text-[12px] text-ink-500">{dayOf(r.at)}</div>
                </div>
                <div className="min-w-0 flex-1 basis-48">
                  <div className="font-semibold">{r.name}<span className="font-normal text-ink-500">, {r.guests} guests</span></div>
                  <div className="text-[12px] text-ink-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="select-all">{r.phone}</span>
                    <span className="inline-flex items-center gap-1"><SrcIcon className="size-3.5" aria-hidden />{src}</span>
                    {r.note && <span className="text-ink-700">{r.note}</span>}
                  </div>
                </div>
                <div className="text-sm text-ink-700 w-24">{r.tableId ? `Table ${tableName(r.tableId)}` : <span className="text-ink-400">No table</span>}</div>
                <StatusBadge status={r.status} />
                <div className="flex gap-2 ml-auto">
                  {r.status === 'REQUESTED' && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setDeclining(r)}>Decline</Button>
                      <Button size="sm" onClick={() => setConfirming(r)}>Confirm</Button>
                    </>
                  )}
                  {r.status === 'CONFIRMED' && soon && r.tableId && <Button size="sm" variant="secondary" onClick={() => { d.seatReservation(r); toast(`${r.name} seated at table ${tableName(r.tableId)}.`) }}>Seat now</Button>}
                </div>
              </li>
            )
          })}
        </ul>
      </Panel>
      {confirming && <ConfirmBooking res={confirming} onClose={() => setConfirming(null)} />}
      {declining && <DeclineBooking res={declining} onClose={() => setDeclining(null)} />}
      {adding && <AddBooking onClose={() => setAdding(false)} />}
    </>
  )
}

function useTableOptions(guests) {
  const d = useOwnerData()
  const booked = new Set(d.reservations.filter((r) => r.status === 'CONFIRMED').map((r) => r.tableId))
  return d.tables[d.outletId].filter((t) => t.seats >= guests && !booked.has(t.id)).map((t) => ({ value: t.id, label: `${t.name}, ${t.section} (${t.seats} seats)${t.status !== 'FREE' ? `, ${STATUS[t.status].label.toLowerCase()} now` : ''}` }))
}

function ConfirmBooking({ res, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const options = useTableOptions(res.guests)
  const [tableId, setTableId] = useState(options[0]?.value ?? '')
  return (
    <Modal
      open
      onClose={onClose}
      title={`Confirm ${res.name}’s booking`}
      description={`${res.guests} guests, ${dayOf(res.at).toLowerCase()} at ${timeOf(res.at)}. The customer gets a confirmation in the app.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!tableId} onClick={() => { d.confirmReservation(res, tableId); toast(`Booking confirmed. ${res.name} has been notified.`); onClose() }}>Confirm booking</Button></>}
    >
      {options.length ? (
        <Field label="Table">{({ id }) => <Select id={id} value={tableId} onChange={(e) => setTableId(e.target.value)} options={options} />}</Field>
      ) : (
        <p className="text-sm text-danger-600">No table with {res.guests} or more seats is free at that time. Decline the request or add a table first.</p>
      )}
    </Modal>
  )
}

function DeclineBooking({ res, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const reasons = ['Fully booked at that time', 'Restaurant closed at that time', 'Group too large for our tables']
  const [reason, setReason] = useState(reasons[0])
  return (
    <Modal
      open
      onClose={onClose}
      title={`Decline ${res.name}’s request?`}
      description="The customer sees this reason in the app and can pick another time."
      footer={<><Button variant="secondary" onClick={onClose}>Keep request</Button><Button variant="dark" onClick={() => { d.declineReservation(res, reason); toast('Request declined. The customer has been notified.'); onClose() }}>Decline request</Button></>}
    >
      <Field label="Reason">{({ id }) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)} options={reasons} />}</Field>
    </Modal>
  )
}

function AddBooking({ onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const pad = (n) => String(n).padStart(2, '0')
  const soon = new Date(Math.ceil((Date.now() + 3600_000) / 1800_000) * 1800_000)
  const local = `${soon.getFullYear()}-${pad(soon.getMonth() + 1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`
  const [form, setForm] = useState({ name: '', phone: '', guests: 2, at: local, tableId: '' })
  const [errors, setErrors] = useState({})
  const options = useTableOptions(Number(form.guests))
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: null }) }
  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Enter the guest’s name.'
    if (!/^\+?[\d\s]{10,14}$/.test(form.phone.trim())) errs.phone = 'Enter a 10-digit mobile number.'
    if (!form.at) errs.at = 'Pick a date and time.'
    if (Object.keys(errs).length) return setErrors(errs)
    d.addReservation({ outletId: d.outletId, name: form.name.trim(), phone: form.phone.trim(), guests: Number(form.guests), at: new Date(form.at).toISOString(), tableId: form.tableId || options[0]?.value || null, note: null })
    toast(`Booking added for ${form.name.trim()}.`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Add booking" description="For phone and walk-in bookings." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="add-booking">Add booking</Button></>}>
      <form id="add-booking" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Guest name" error={errors.name}>{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.name} onChange={set('name')} />}</Field>
        <Field label="Mobile number" error={errors.phone}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="tel" value={form.phone} onChange={set('phone')} placeholder="98450 12345" />}</Field>
        <Field label="Guests">{({ id }) => <Select id={id} value={form.guests} onChange={set('guests')} options={[1, 2, 3, 4, 5, 6, 8, 10].map((n) => ({ value: n, label: String(n) }))} />}</Field>
        <Field label="Date and time" error={errors.at}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="datetime-local" value={form.at} onChange={set('at')} />}</Field>
        <Field label="Table" className="sm:col-span-2" hint={options.length ? undefined : 'No free table fits this group. The booking is saved without a table.'}>
          {({ id }) => <Select id={id} value={form.tableId} onChange={set('tableId')} options={[{ value: '', label: options.length ? 'Pick the best fit for me' : 'No table' }, ...options]} />}
        </Field>
      </form>
    </Modal>
  )
}
