import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { PackagePlus, SlidersHorizontal, Trash2 } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import StatStrip from '../../../components/ui/StatStrip'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { Drawer, Modal } from '../../../components/ui/Overlay'
import { Field, Input, SearchInput, Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, formatINRCompact, timeAgo } from '../../../lib/format'
import { ALL, stockState, useOwnerData } from '../data/OwnerDataContext'
import { OutletTag, qty, useScopeLabel } from '../components/common'
import { Section } from '../../admin/components/RegistrationReview'

const KIND = { PURCHASE: ['Purchase', 'ok'], WASTAGE: ['Wastage', 'danger'], ADJUSTMENT: ['Count corrected', 'info'], CHEF_UPDATE: ['Chef update', 'brand'] }
const WASTE_REASONS = ['Spoiled', 'Expired', 'Over-cooked', 'Spilled or dropped', 'Customer returned']

export default function Inventory() {
  const d = useOwnerData()
  const scope = useScopeLabel()
  const [tab, setTab] = useState('STOCK')
  const [form, setForm] = useState(null) // { mode, item? }
  const active = d.activeOutlets.filter((o) => d.outletId === ALL || o.id === d.outletId)

  const value = d.inventory.reduce((s, i) => s + active.reduce((t, o) => t + i.stock[o.id] * i.cost, 0), 0)
  const low = d.inventory.reduce((n, i) => n + active.filter((o) => stockState(i, o.id) === 'LOW').length, 0)
  const out = d.inventory.reduce((n, i) => n + active.filter((o) => stockState(i, o.id) === 'OUT').length, 0)
  const weekAgo = Date.now() - 7 * 86400_000
  const wasteValue = d.scoped(d.wastage).filter((w) => new Date(w.at) > weekAgo).reduce((s, w) => s + w.qty * (d.inventory.find((i) => i.id === w.itemId)?.cost ?? 0), 0)

  return (
    <>
      <PageHeader
        title="Inventory"
        description={`Stock, low-stock alerts and wastage at ${scope}.`}
        actions={
          <>
            <Button variant="secondary" icon={Trash2} onClick={() => setForm({ mode: 'WASTAGE' })}>Record wastage</Button>
            <Button icon={PackagePlus} onClick={() => setForm({ mode: 'PURCHASE' })}>Record purchase</Button>
          </>
        }
      />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Stock value', value: formatINRCompact(value), note: 'At purchase cost' },
          { label: 'Below reorder level', value: low, note: d.outletId === ALL ? 'Item and outlet pairs' : 'Items', tone: low ? 'warn' : undefined },
          { label: 'Out of stock', value: out, note: 'Order these today', tone: out ? 'warn' : undefined },
          { label: 'Wastage, last 7 days', value: formatINR(Math.round(wasteValue)), note: `${d.scoped(d.wastage).filter((w) => new Date(w.at) > weekAgo).length} entries` },
        ]}
      />
      <Tabs className="mb-4" tabs={[{ value: 'STOCK', label: 'Stock' }, { value: 'WASTAGE', label: 'Wastage' }, { value: 'HISTORY', label: 'Stock history' }]} value={tab} onChange={setTab} label="Inventory sections" />
      {tab === 'STOCK' && <StockTable onAction={setForm} />}
      {tab === 'WASTAGE' && <WastageTable />}
      {tab === 'HISTORY' && <HistoryTable />}
      {form && <StockForm {...form} onClose={() => setForm(null)} />}
    </>
  )
}

/* ------------------------------------------------------------------ */

function StockTable({ onAction }) {
  const d = useOwnerData()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [openId, setOpenId] = useState(null)
  const all = d.outletId === ALL
  const active = d.activeOutlets.filter((o) => all || o.id === d.outletId)
  const open = d.inventory.find((i) => i.id === openId)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return d.inventory
      .map((i) => {
        const states = active.map((o) => stockState(i, o.id))
        const worst = states.includes('OUT') ? 'OUT' : states.includes('LOW') ? 'LOW' : 'OK'
        const total = active.reduce((s, o) => s + i.stock[o.id], 0)
        return { ...i, worst, total, lowAt: active.filter((o) => stockState(i, o.id) !== 'OK') }
      })
      .filter((i) => status === 'ALL' || (status === 'ATTENTION' ? i.worst !== 'OK' : i.worst === status))
      .filter((i) => !needle || i.name.toLowerCase().includes(needle))
      .sort((a, b) => ({ OUT: 0, LOW: 1, OK: 2 })[a.worst] - ({ OUT: 0, LOW: 1, OK: 2 })[b.worst])
  }, [d.inventory, q, status, d.outletId])

  if (d.outlet?.status === 'SUSPENDED') return <Panel><p className="text-sm text-ink-500 py-6 text-center">This outlet is suspended. Stock counts resume when it’s reactivated.</p></Panel>

  const columns = all
    ? [
        { key: 'name', header: 'Item', render: (i) => <span className="font-semibold">{i.name}</span> },
        { key: 'total', header: 'Total stock', align: 'right', render: (i) => qty(i.total, i.unit) },
        { key: 'lowAt', header: 'Low or out at', render: (i) => (i.lowAt.length ? <span className="text-brand-700">{i.lowAt.map((o) => o.name).join(', ')}</span> : <span className="text-ink-400">None</span>) },
        { key: 'value', header: 'Value', align: 'right', render: (i) => formatINR(Math.round(i.total * i.cost)) },
        { key: 'worst', header: 'Status', render: (i) => <StatusBadge status={i.worst} /> },
      ]
    : [
        { key: 'name', header: 'Item', render: (i) => <span className="font-semibold">{i.name}</span> },
        { key: 'stock', header: 'In stock', align: 'right', render: (i) => <span className={clsx(i.worst !== 'OK' && 'text-brand-700 font-semibold')}>{qty(i.stock[d.outletId], i.unit)}</span> },
        { key: 'reorder', header: 'Reorder at', align: 'right', render: (i) => qty(i.reorder, i.unit) },
        { key: 'days', header: 'Lasts about', align: 'right', render: (i) => { const days = i.stock[d.outletId] / i.daily; return <span className={clsx(days < 1 && 'text-brand-700 font-semibold')}>{days < 1 ? 'Less than a day' : `${Math.floor(days)} day${Math.floor(days) > 1 ? 's' : ''}`}</span> } },
        { key: 'value', header: 'Value', align: 'right', render: (i) => formatINR(Math.round(i.stock[d.outletId] * i.cost)) },
        { key: 'worst', header: 'Status', render: (i) => <StatusBadge status={i.worst} /> },
      ]

  return (
    <>
      <Panel flush>
        <div className="pt-4" />
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search stock items" className="flex-1 basis-56" />
          <Select aria-label="Stock status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'ALL', label: 'All items' }, { value: 'ATTENTION', label: 'Low or out' }, { value: 'OUT', label: 'Out of stock' }]} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(i) => setOpenId(i.id)} pageSize={25} empty="No stock items match these filters." />
      </Panel>
      {open && <ItemDrawer item={open} onClose={() => setOpenId(null)} onAction={onAction} />}
    </>
  )
}

function ItemDrawer({ item, onClose, onAction }) {
  const d = useOwnerData()
  const toast = useToast()
  const [reorder, setReorder] = useState(item.reorder)
  const outlets = d.activeOutlets.filter((o) => d.outletId === ALL || o.id === d.outletId)
  const moves = d.movements.filter((m) => m.itemId === item.id && d.inScope(m.outletId)).slice(0, 8)
  return (
    <Drawer
      open
      onClose={onClose}
      title={item.name}
      subtitle={`Bought at ${formatINR(item.cost)} per ${item.unit}. Each outlet uses about ${qty(item.daily, item.unit)} a day.`}
      footer={
        <>
          <Button variant="secondary" icon={SlidersHorizontal} onClick={() => onAction({ mode: 'ADJUST', item })}>Correct count</Button>
          <Button variant="secondary" icon={Trash2} onClick={() => onAction({ mode: 'WASTAGE', item })}>Wastage</Button>
          <Button icon={PackagePlus} onClick={() => onAction({ mode: 'PURCHASE', item })}>Purchase</Button>
        </>
      }
    >
      <Section title={outlets.length > 1 ? 'Stock by outlet' : 'Stock'}>
        <ul className="divide-y divide-line border-y border-line">
          {outlets.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex-1">{o.name}</span>
              <span className="tabular font-semibold">{qty(item.stock[o.id], item.unit)}</span>
              <StatusBadge status={stockState(item, o.id)} />
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Reorder level">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); d.setReorder(item, Number(reorder)); toast(`${item.name} alerts below ${qty(reorder, item.unit)}.`) }}
        >
          <Field label={`Alert when stock drops below (${item.unit})`} className="flex-1">{({ id }) => <Input id={id} type="number" min="0" step="any" value={reorder} onChange={(e) => setReorder(e.target.value)} />}</Field>
          <Button type="submit" variant="secondary" disabled={Number(reorder) === item.reorder}>Save</Button>
        </form>
      </Section>
      <Section title="Recent changes">
        {moves.length === 0 ? <p className="text-sm text-ink-500">No changes recorded yet.</p> : (
          <ul className="flex flex-col gap-3">
            {moves.map((m) => (
              <li key={m.id} className="flex items-start gap-3 text-sm">
                <Badge tone={KIND[m.kind][1]}>{KIND[m.kind][0]}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="tabular font-semibold">{m.qty > 0 ? '+' : '−'}{qty(Math.abs(m.qty), item.unit)}</div>
                  <div className="text-[12px] text-ink-500">{m.by?.replace(/ \(.*\)$/, '')}, {m.source}{m.note ? `. ${m.note}` : ''}</div>
                </div>
                <span className="text-[12px] text-ink-400 whitespace-nowrap">{timeAgo(m.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Drawer>
  )
}

/* ------------------------------------------------------------------ */

function StockForm({ mode, item, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const outlets = d.activeOutlets
  const [form, setForm] = useState({
    itemId: item?.id ?? d.inventory[0].id,
    outletId: d.outletId !== ALL ? d.outletId : outlets[0].id,
    qty: '',
    note: mode === 'WASTAGE' ? WASTE_REASONS[0] : '',
  })
  const [error, setError] = useState('')
  const it = d.inventory.find((i) => i.id === form.itemId)
  const current = it.stock[form.outletId]
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setError('') }
  const title = { PURCHASE: 'Record purchase', WASTAGE: 'Record wastage', ADJUST: 'Correct stock count' }[mode]

  const submit = (e) => {
    e.preventDefault()
    const n = Number(form.qty)
    if (form.qty === '' || n < 0 || (mode !== 'ADJUST' && n === 0)) return setError('Enter a quantity above zero.')
    if (mode === 'WASTAGE' && n > current) return setError(`Only ${qty(current, it.unit)} is in stock.`)
    if (mode === 'ADJUST' && !form.note.trim()) return setError('Add a reason for the correction.')
    if (mode === 'PURCHASE') d.recordPurchase({ itemId: it.id, outletId: form.outletId, qty: n, note: form.note.trim() || 'Purchase' })
    if (mode === 'WASTAGE') d.recordWastage({ itemId: it.id, outletId: form.outletId, qty: n, reason: form.note })
    if (mode === 'ADJUST') d.setStock(it, form.outletId, n, form.note.trim())
    toast(mode === 'PURCHASE' ? `${qty(n, it.unit)} of ${it.name} added.` : mode === 'WASTAGE' ? `Wastage of ${qty(n, it.unit)} ${it.name} recorded.` : `${it.name} count set to ${qty(n, it.unit)}.`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={mode === 'ADJUST' ? 'Your corrections apply straight away. Corrections by managers come to Approvals.' : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="stock-form">{title}</Button></>}
    >
      <form id="stock-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Item" className={outlets.length > 1 ? undefined : 'sm:col-span-2'}>{({ id }) => <Select id={id} value={form.itemId} onChange={set('itemId')} options={d.inventory.map((i) => ({ value: i.id, label: i.name }))} />}</Field>
        {outlets.length > 1 && <Field label="Outlet">{({ id }) => <Select id={id} value={form.outletId} onChange={set('outletId')} options={outlets.map((o) => ({ value: o.id, label: o.name }))} />}</Field>}
        <Field label={mode === 'ADJUST' ? `Counted quantity (${it.unit})` : `Quantity (${it.unit})`} error={error} hint={`In stock now: ${qty(current, it.unit)}`}>
          {({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="0" step="any" inputMode="decimal" value={form.qty} onChange={set('qty')} />}
        </Field>
        {mode === 'WASTAGE' ? (
          <Field label="Reason">{({ id }) => <Select id={id} value={form.note} onChange={set('note')} options={WASTE_REASONS} />}</Field>
        ) : (
          <Field label={mode === 'ADJUST' ? 'Reason' : 'Supplier or bill number'}>{({ id }) => <Input id={id} value={form.note} onChange={set('note')} placeholder={mode === 'ADJUST' ? 'Monthly stock count' : 'Sri Lakshmi Traders, bill 4471'} />}</Field>
        )}
        {mode === 'PURCHASE' && Number(form.qty) > 0 && <p className="sm:col-span-2 text-[13px] text-ink-500">Approximate cost {formatINR(Math.round(Number(form.qty) * it.cost))} at the usual rate.</p>}
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */

function WastageTable() {
  const d = useOwnerData()
  const rows = d.scoped(d.wastage).map((w) => ({ ...w, item: d.inventory.find((i) => i.id === w.itemId) })).filter((w) => w.item)
  const columns = [
    { key: 'item', header: 'Item', render: (w) => <div className="flex flex-col items-start gap-1"><span className="font-semibold">{w.item.name}</span><OutletTag id={w.outletId} /></div> },
    { key: 'qty', header: 'Quantity', align: 'right', render: (w) => qty(w.qty, w.item.unit) },
    { key: 'value', header: 'Value', align: 'right', render: (w) => formatINR(Math.round(w.qty * w.item.cost)) },
    { key: 'reason', header: 'Reason' },
    { key: 'by', header: 'Recorded by', render: (w) => <span className="whitespace-nowrap">{w.by?.replace(/ \(.*\)$/, '')}</span> },
    { key: 'at', header: 'When', render: (w) => <span className="text-ink-500 whitespace-nowrap">{timeAgo(w.at)}</span> },
  ]
  return <Panel flush><div className="pt-1" /><DataTable columns={columns} rows={rows} empty="No wastage recorded. Chefs record it from the chef app; you can add it here too." /></Panel>
}

function HistoryTable() {
  const d = useOwnerData()
  const rows = d.scoped(d.movements).map((m) => ({ ...m, item: d.inventory.find((i) => i.id === m.itemId) })).filter((m) => m.item)
  const columns = [
    { key: 'kind', header: 'Change', render: (m) => <Badge tone={KIND[m.kind][1]}>{KIND[m.kind][0]}</Badge> },
    { key: 'item', header: 'Item', render: (m) => <div className="flex flex-col items-start gap-1"><span className="font-semibold">{m.item.name}</span><OutletTag id={m.outletId} /></div> },
    { key: 'qty', header: 'Quantity', align: 'right', render: (m) => <span className={m.qty > 0 ? 'text-ok-600' : 'text-ink-700'}>{m.qty > 0 ? '+' : '−'}{qty(Math.abs(m.qty), m.item.unit)}</span> },
    { key: 'by', header: 'By', render: (m) => <div><div className="whitespace-nowrap">{m.by?.replace(/ \(.*\)$/, '')}</div><div className="text-[12px] text-ink-500">{m.source}</div></div> },
    { key: 'note', header: 'Note', render: (m) => <span className="text-ink-700">{m.note}</span> },
    { key: 'at', header: 'When', render: (m) => <span className="text-ink-500 whitespace-nowrap">{timeAgo(m.at)}</span> },
  ]
  return <Panel flush><div className="pt-1" /><DataTable columns={columns} rows={rows} pageSize={15} empty="No stock changes yet." /></Panel>
}
