import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Clock, Pencil, Plus, Star } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Overlay'
import { Checkbox, Field, Input, SearchInput, Select, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR } from '../../../lib/format'
import { ALL, useOwnerData } from '../data/OwnerDataContext'
import { useScopeLabel } from '../components/common'

const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(); d.setHours(h, m)
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: m ? '2-digit' : undefined })
}

/** The FSSAI vegetarian mark: green square with a green dot. */
export function VegMark({ veg = true }) {
  return (
    <span className={clsx('inline-grid place-items-center size-3.5 border-[1.5px] rounded-[3px] shrink-0', veg ? 'border-ok-600' : 'border-danger-600')} title={veg ? 'Vegetarian' : 'Non-vegetarian'}>
      <span className={clsx('size-1.5 rounded-full', veg ? 'bg-ok-600' : 'bg-danger-600')} />
    </span>
  )
}

export default function Menu() {
  const d = useOwnerData()
  const toast = useToast()
  const scope = useScopeLabel()
  const [cat, setCat] = useState('ALL')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // item or {}
  const [timing, setTiming] = useState(null) // category
  const active = d.activeOutlets.filter((o) => d.outletId === ALL || o.id === d.outletId)
  const oids = active.map((o) => o.id)
  const suspended = d.outlet?.status === 'SUSPENDED'

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return d.items.filter((i) => (cat === 'ALL' || i.categoryId === cat) && (!needle || i.name.toLowerCase().includes(needle)))
  }, [d.items, cat, q])
  const availableAt = (i) => oids.filter((o) => i.outlets[o])
  const offCount = d.items.filter((i) => availableAt(i).length < oids.length).length

  const toggle = (i, on) => {
    d.setItemAvailable(i, oids, on)
    toast(`${i.name} ${on ? 'available' : 'unavailable'} ${d.outletId === ALL ? 'at all outlets' : `at ${d.outlet.name}`}.`)
  }

  return (
    <>
      <PageHeader
        title="Menu"
        description={`Prices and items are shared by every outlet. Availability is set per outlet. Showing availability at ${scope}.`}
        actions={<Button icon={Plus} onClick={() => setEditing({})}>Add item</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Menu categories" className="flex lg:flex-col gap-1 overflow-x-auto -mx-1 px-1 pb-1 lg:pb-0">
          {[{ id: 'ALL', name: 'All items' }, ...d.categories].map((c) => {
            const n = c.id === 'ALL' ? d.items.length : d.items.filter((i) => i.categoryId === c.id).length
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                aria-current={cat === c.id ? 'true' : undefined}
                className={clsx('shrink-0 lg:w-full text-left rounded-xl px-3.5 py-2.5 cursor-pointer border', cat === c.id ? 'bg-surface border-brand-500 shadow-[0_0_0_3px_var(--color-brand-100)]' : 'border-transparent hover:bg-surface hover:border-line')}
              >
                <span className="flex items-center justify-between gap-3 text-sm font-semibold whitespace-nowrap">{c.name}<span className="text-[12px] font-normal text-ink-500 tabular">{n}</span></span>
                {c.from && <span className="hidden lg:block text-[12px] text-ink-500">{fmtTime(c.from)} to {fmtTime(c.to)}</span>}
              </button>
            )
          })}
        </nav>

        <Panel
          flush
          title={cat === 'ALL' ? 'All items' : d.categories.find((c) => c.id === cat).name}
          description={
            cat === 'ALL'
              ? offCount ? `${offCount} item${offCount > 1 ? 's are' : ' is'} off at one or more outlets` : 'Everything is available'
              : (() => { const c = d.categories.find((x) => x.id === cat); return `Served ${fmtTime(c.from)} to ${fmtTime(c.to)}. Outside these hours billers and customers don’t see these items.` })()
          }
          actions={cat !== 'ALL' && <Button variant="secondary" size="sm" icon={Clock} onClick={() => setTiming(d.categories.find((c) => c.id === cat))}>Change timing</Button>}
        >
          <div className="px-5 pb-3"><SearchInput value={q} onChange={setQ} placeholder="Search items" className="max-w-sm" /></div>
          <ul className="divide-y divide-line border-t border-line">
            {items.length === 0 && <li className="px-5 py-10 text-center text-sm text-ink-500">No items match “{q}”.</li>}
            {items.map((i) => {
              const at = availableAt(i)
              const all = at.length === oids.length
              const offAt = active.filter((o) => !i.outlets[o.id])
              return (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                  <VegMark />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={clsx('font-semibold', !at.length && 'text-ink-400')}>{i.name}</span>
                      {i.bestseller && <Badge tone="brand"><Star className="size-3" aria-hidden /> Bestseller</Badge>}
                    </div>
                    <div className="text-[12px] text-ink-500">
                      {d.categories.find((c) => c.id === i.categoryId)?.name}, ready in about {i.prepMins} min
                      {!all && offAt.length > 0 && <span className="text-brand-700 font-medium">. Off at {offAt.map((o) => o.name).join(', ')}</span>}
                    </div>
                  </div>
                  <span className="font-semibold tabular">{formatINR(i.price)}</span>
                  <button className="p-2 rounded-full hover:bg-ink-900/5 text-ink-500" onClick={() => setEditing(i)} aria-label={`Edit ${i.name}`}><Pencil className="size-4" /></button>
                  <Toggle size="sm" ariaLabel={`${i.name} available`} checked={all && oids.length > 0} disabled={suspended || !oids.length} onChange={(on) => toggle(i, on)} />
                </li>
              )
            })}
          </ul>
          <p className="px-5 py-3 border-t border-line text-[12px] text-ink-500">Chefs can switch items off and change timings from the chef app. Those changes apply straight away and show in Audit logs.</p>
        </Panel>
      </div>

      {editing && <ItemModal item={editing} defaultCategory={cat === 'ALL' ? d.categories[0].id : cat} onClose={() => setEditing(null)} />}
      {timing && <TimingModal category={timing} onClose={() => setTiming(null)} />}
    </>
  )
}

function ItemModal({ item, defaultCategory, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const isNew = !item.id
  const [form, setForm] = useState({ name: item.name ?? '', categoryId: item.categoryId ?? defaultCategory, price: item.price ?? '', prepMins: item.prepMins ?? 8, bestseller: item.bestseller ?? false })
  const [errors, setErrors] = useState({})
  const set = (k, v) => { setForm({ ...form, [k]: v }); setErrors({ ...errors, [k]: null }) }
  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Enter the item name.'
    if (!(Number(form.price) > 0)) errs.price = 'Enter a price above zero.'
    if (Object.keys(errs).length) return setErrors(errs)
    d.saveItem({ ...item, veg: true, gst: 5, name: form.name.trim(), categoryId: form.categoryId, price: Number(form.price), prepMins: Number(form.prepMins), bestseller: form.bestseller })
    toast(isNew ? `${form.name.trim()} added to the menu at every outlet.` : `${form.name.trim()} saved.`)
    onClose()
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Add menu item' : `Edit ${item.name}`}
      description={isNew ? 'New items are available at every outlet. Switch them off per outlet afterwards.' : 'Price changes reach every outlet’s billing screen right away.'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="item-form">{isNew ? 'Add item' : 'Save item'}</Button></>}
    >
      <form id="item-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Item name" error={errors.name} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="Category">{({ id }) => <Select id={id} value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} options={d.categories.map((c) => ({ value: c.id, label: c.name }))} />}</Field>
        <Field label="Price (₹)" error={errors.price} hint="Before GST">{({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="0" inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value)} />}</Field>
        <Field label="Ready in (minutes)" hint="Used for kitchen timing alerts">{({ id }) => <Input id={id} type="number" min="1" value={form.prepMins} onChange={(e) => set('prepMins', e.target.value)} />}</Field>
        <Field label="GST" hint="Restaurant service rate set by Dime Quest">{({ id }) => <Input id={id} value="5% (2.5% CGST + 2.5% SGST)" disabled />}</Field>
        <Checkbox className="sm:col-span-2" label="Mark as bestseller in the customer app" checked={form.bestseller} onChange={(v) => set('bestseller', v)} />
      </form>
    </Modal>
  )
}

function TimingModal({ category, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const [from, setFrom] = useState(category.from)
  const [to, setTo] = useState(category.to)
  const valid = from < to
  return (
    <Modal
      open
      onClose={onClose}
      title={`${category.name} timing`}
      description="Applies at every outlet. Items in this category are hidden from billing and the customer app outside these hours."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={() => { d.saveCategory({ ...category, from, to }); toast(`${category.name} now served ${fmtTime(from)} to ${fmtTime(to)}.`); onClose() }}>Save timing</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From">{({ id }) => <Input id={id} type="time" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
        <Field label="To" error={valid ? null : 'End time must be after the start time.'}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="time" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
      </div>
    </Modal>
  )
}
