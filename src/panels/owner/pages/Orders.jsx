import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Printer } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import StatStrip from '../../../components/ui/StatStrip'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { StatusBadge } from '../../../components/ui/Badge'
import { Drawer } from '../../../components/ui/Overlay'
import { SearchInput, Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatDateTime, formatINR, formatNumber, timeAgo } from '../../../lib/format'
import { RUNNING, useOwnerData } from '../data/OwnerDataContext'
import { billable, salesOf } from '../lib/metrics'
import { ORDER_TYPE_LABEL, OutletTag, PAYMENT_LABEL, useScopeLabel } from '../components/common'
import { Dl, Section } from '../../admin/components/RegistrationReview'

const TABS = [
  { value: 'RUNNING', label: 'Running', match: (o) => RUNNING.includes(o.status) },
  { value: 'COMPLETED', label: 'Completed', match: (o) => o.status === 'COMPLETED' },
  { value: 'CANCELLED', label: 'Cancelled', match: (o) => o.status === 'CANCELLED' },
  { value: 'ALL', label: 'All today', match: () => true },
]

const itemSummary = (o) => o.items.map((l) => (l.qty > 1 ? `${l.qty} × ${l.name}` : l.name)).join(', ')

export default function Orders() {
  const d = useOwnerData()
  const scope = useScopeLabel()
  const [tab, setTab] = useState('RUNNING')
  const [q, setQ] = useState('')
  const [type, setType] = useState('ALL')
  const [payment, setPayment] = useState('ALL')
  const [openId, setOpenId] = useState(null)

  const orders = d.scoped(d.orders)
  const open = d.orders.find((o) => o.id === openId)
  const online = billable(orders).filter((o) => o.type === 'SWIGGY' || o.type === 'ZOMATO')

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.value === tab)
    const needle = q.trim().toLowerCase()
    return orders
      .filter(t.match)
      .filter((o) => type === 'ALL' || o.type === type)
      .filter((o) => payment === 'ALL' || (payment === 'UNPAID' ? !o.payment : o.payment === payment))
      .filter((o) => !needle || o.id.toLowerCase().includes(needle) || o.table?.toLowerCase() === needle || o.items.some((l) => l.name.toLowerCase().includes(needle)))
  }, [orders, tab, q, type, payment])

  const columns = [
    {
      key: 'id', header: 'Order',
      render: (o) => (
        <div className="whitespace-nowrap">
          <div className="font-semibold tabular">{o.id}</div>
          <div className="text-[12px] text-ink-500">{timeAgo(o.placedAt)}</div>
        </div>
      ),
    },
    {
      key: 'type', header: 'Type',
      render: (o) => (
        <div className="flex flex-col items-start gap-1">
          <span className="whitespace-nowrap">{ORDER_TYPE_LABEL[o.type]}{o.table ? `, table ${o.table}` : ''}</span>
          <OutletTag id={o.outletId} />
        </div>
      ),
    },
    { key: 'items', header: 'Items', render: (o) => <span className="block max-w-72 truncate text-ink-700" title={itemSummary(o)}>{itemSummary(o)}</span> },
    { key: 'total', header: 'Amount', align: 'right', render: (o) => <span className={clsx('font-semibold', o.status === 'CANCELLED' && 'line-through text-ink-400')}>{formatINR(o.total)}</span> },
    { key: 'payment', header: 'Payment', render: (o) => (o.payment ? PAYMENT_LABEL[o.payment] : <span className="text-brand-700 font-medium whitespace-nowrap">Not paid yet</span>) },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
  ]

  return (
    <>
      <PageHeader title="Orders" description={`Every order today at ${scope}, from the counter, tables and delivery apps.`} />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Orders today', value: formatNumber(billable(orders).length), note: `${formatINR(salesOf(orders))} in sales` },
          { label: 'Running now', value: orders.filter((o) => RUNNING.includes(o.status)).length, note: 'In the kitchen or at tables' },
          ...(d.restaurant.online ? [{ label: 'Swiggy and Zomato', value: online.length, note: `${Math.round((online.length / Math.max(1, billable(orders).length)) * 100)}% of orders` }] : []),
          { label: 'Cancelled', value: orders.filter((o) => o.status === 'CANCELLED').length, note: 'Approved cancellations' },
        ]}
      />
      <Panel flush>
        <div className="px-5 pt-4 pb-3">
          <Tabs tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: orders.filter(t.match).length }))} value={tab} onChange={setTab} label="Order status" />
        </div>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search order number, table or item" className="flex-1 basis-60" />
          <Select aria-label="Order type" className="w-auto" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'ALL', label: 'All types' }, ...Object.entries(ORDER_TYPE_LABEL).filter(([k]) => d.restaurant.online || (k !== 'SWIGGY' && k !== 'ZOMATO')).map(([value, label]) => ({ value, label }))]} />
          <Select aria-label="Payment" className="w-auto" value={payment} onChange={(e) => setPayment(e.target.value)} options={[{ value: 'ALL', label: 'Any payment' }, { value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'CARD', label: 'Card' }, { value: 'UNPAID', label: 'Not paid yet' }]} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(o) => setOpenId(o.id)} pageSize={15} empty={tab === 'RUNNING' ? 'No orders running right now.' : 'No orders match these filters.'} />
      </Panel>
      {open && <OrderDrawer order={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

function OrderDrawer({ order: o, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const taxable = o.subtotal - o.discount
  const roundOff = Math.round((o.total - taxable - o.gst) * 100) / 100
  const placed = new Date(o.placedAt).getTime()
  const steps = [
    ['Order placed', placed, true],
    ['KOT sent to kitchen', placed + 60_000, true],
    ['Ready', placed + o.prepMins * 60_000, ['READY', 'SERVED', 'COMPLETED'].includes(o.status)],
    [o.type === 'DINE_IN' ? 'Served' : o.type === 'TAKEAWAY' ? 'Handed over' : 'Picked up by rider', placed + (o.prepMins + 3) * 60_000, ['SERVED', 'COMPLETED'].includes(o.status)],
    ['Paid', placed + (o.prepMins + 25) * 60_000, o.status === 'COMPLETED'],
  ]
  return (
    <Drawer
      open
      onClose={onClose}
      title={`Order ${o.id}`}
      subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={o.status} /> {ORDER_TYPE_LABEL[o.type]}{o.table ? `, table ${o.table}` : ''}, {formatDateTime(o.placedAt)}</span>}
      footer={<Button variant="secondary" icon={Printer} onClick={() => toast(`Duplicate bill for ${o.id} sent to the billing printer.`)}>Print duplicate bill</Button>}
    >
      {o.status === 'CANCELLED' && <p className="mb-5 rounded-xl bg-danger-50 text-danger-600 text-[13px] px-4 py-3">This order was cancelled after your approval. It isn’t counted in sales.</p>}
      {o.refunded > 0 && <p className="mb-5 rounded-xl bg-info-50 text-info-600 text-[13px] px-4 py-3">{formatINR(o.refunded)} refunded to the customer.</p>}

      <Section title="Items">
        <ul className="divide-y divide-line border-y border-line">
          {o.items.map((l) => (
            <li key={l.itemId} className="flex items-baseline gap-3 py-2.5 text-sm">
              <span className="tabular text-ink-500 w-8">{l.qty} ×</span>
              <span className="flex-1 min-w-0">{l.name}</span>
              <span className="tabular">{formatINR(l.qty * l.price)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 text-sm grid grid-cols-[1fr_auto] gap-y-1.5 tabular">
          <dt className="text-ink-500">Subtotal</dt><dd className="text-right">{formatINR(o.subtotal)}</dd>
          {o.discount > 0 && <><dt className="text-ink-500">Discount</dt><dd className="text-right text-ok-600">−{formatINR(o.discount)}</dd></>}
          <dt className="text-ink-500">CGST 2.5%</dt><dd className="text-right">₹{(o.gst / 2).toFixed(2)}</dd>
          <dt className="text-ink-500">SGST 2.5%</dt><dd className="text-right">₹{(o.gst / 2).toFixed(2)}</dd>
          {roundOff !== 0 && <><dt className="text-ink-500">Round off</dt><dd className="text-right">{roundOff > 0 ? '+' : '−'}₹{Math.abs(roundOff).toFixed(2)}</dd></>}
          <dt className="font-bold pt-1.5 border-t border-line">Total</dt><dd className="text-right font-bold pt-1.5 border-t border-line">{formatINR(o.total)}</dd>
        </dl>
        {(o.type === 'SWIGGY' || o.type === 'ZOMATO') && <p className="text-[12px] text-ink-500 mt-2">GST on this order is paid by {ORDER_TYPE_LABEL[o.type]} under Section 9(5).</p>}
      </Section>

      <Section title="Progress">
        <ol className="flex flex-col gap-3">
          {steps.map(([label, t, done]) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className={clsx('size-2.5 rounded-full shrink-0', done ? 'bg-ok-600' : 'bg-line-strong')} aria-hidden />
              <span className={clsx('flex-1', !done && 'text-ink-400')}>{label}</span>
              <span className="text-[12px] text-ink-500 tabular">{done ? new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'Waiting'}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Details">
        <Dl
          rows={[
            ['Outlet', d.outletName(o.outletId)],
            ['Billed by', o.biller ?? 'Online order'],
            ['Payment', o.payment ? PAYMENT_LABEL[o.payment] : 'Not paid yet'],
            ...(o.guests ? [['Guests', o.guests]] : []),
          ]}
        />
      </Section>
      <p className="text-[13px] text-ink-500">Cancellations, discounts and refunds are raised from the biller panel and come to you in Approvals.</p>
    </Drawer>
  )
}
