import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Ban, Printer, RotateCcw } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { Drawer, Modal } from '../../../components/ui/Overlay'
import { Field, Input, SearchInput, Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, timeAgo } from '../../../lib/format'
import { RUNNING, usePos } from '../data/PosDataContext'
import { ORDER_TYPE } from './LiveView'

const PAY = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', SWIGGY: 'Swiggy', ZOMATO: 'Zomato' }
const TABS = [
  { value: 'RUNNING', label: 'Running', match: (o) => RUNNING.includes(o.status) },
  { value: 'COMPLETED', label: 'Paid', match: (o) => o.status === 'COMPLETED' },
  { value: 'CANCELLED', label: 'Cancelled', match: (o) => o.status === 'CANCELLED' },
  { value: 'ALL', label: 'All today', match: () => true },
]

/** Pending or decided owner request for an order, if any. */
export const requestFor = (pos, orderId) => pos.db.approvals.find((a) => a.orderId === orderId && a.outletId === pos.outlet.id)

export default function Orders() {
  const pos = usePos()
  const [tab, setTab] = useState('RUNNING')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const open = pos.orders.find((o) => o.id === openId)

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.value === tab)
    const needle = q.trim().toLowerCase()
    return pos.orders.filter(t.match).filter((o) => !needle || o.id.toLowerCase().includes(needle) || o.table?.toLowerCase() === needle)
  }, [pos.orders, tab, q])

  const columns = [
    { key: 'id', header: 'Order', render: (o) => <div className="whitespace-nowrap"><div className="font-semibold tabular">{o.id}</div><div className="text-[12px] text-ink-500">{timeAgo(o.placedAt)}</div></div> },
    { key: 'type', header: 'Type', render: (o) => <span className="whitespace-nowrap">{ORDER_TYPE[o.type]}{o.table ? `, table ${o.table}` : ''}</span> },
    { key: 'items', header: 'Items', render: (o) => <span className="block max-w-64 truncate text-ink-700">{o.items.map((l) => `${l.qty} × ${l.name}`).join(', ')}</span> },
    { key: 'total', header: 'Amount', align: 'right', render: (o) => <span className={clsx('font-semibold', o.status === 'CANCELLED' && 'line-through text-ink-400')}>{formatINR(o.total)}</span> },
    { key: 'payment', header: 'Paid by', render: (o) => (o.payment ? PAY[o.payment] : <span className="text-brand-700">Not paid</span>) },
    {
      key: 'status', header: 'Status',
      render: (o) => {
        const req = requestFor(pos, o.id)
        return <div className="flex flex-col items-start gap-1"><StatusBadge status={o.status} />{req?.status === 'PENDING' && <Badge tone="warn">Waiting for owner</Badge>}</div>
      },
    },
  ]

  return (
    <>
      <PageHeader title="Orders" description={`Today at ${pos.outlet.name}. Cancellations and refunds go to the owner for approval.`} />
      <Panel flush>
        <div className="px-5 pt-4 pb-3">
          <Tabs tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: pos.orders.filter(t.match).length }))} value={tab} onChange={setTab} label="Order status" />
        </div>
        <FilterBar><SearchInput value={q} onChange={setQ} placeholder="Order number or table" className="flex-1 basis-56" /></FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(o) => setOpenId(o.id)} pageSize={15} empty="No orders here." />
      </Panel>
      {open && <OrderDrawer order={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

const CANCEL_REASONS = ['Customer left before food was served', 'Ordered by mistake', 'Item not available after KOT', 'Kitchen delay, customer walked out']
const REFUND_REASONS = ['Charged twice on UPI', 'Wrong item served', 'Food quality complaint', 'Card charged but bill unpaid']

function OrderDrawer({ order: o, onClose }) {
  const pos = usePos()
  const toast = useToast()
  const [asking, setAsking] = useState(null) // 'CANCELLATION' | 'REFUND'
  const req = requestFor(pos, o.id)
  const pending = req?.status === 'PENDING'

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={`Order ${o.id}`}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2"><StatusBadge status={o.status} />{ORDER_TYPE[o.type]}{o.table ? `, table ${o.table}` : ''}, {timeAgo(o.placedAt)}</span>}
        footer={
          <>
            {RUNNING.includes(o.status) && !pending && <Button variant="danger" icon={Ban} className="mr-auto" onClick={() => setAsking('CANCELLATION')}>Request cancellation</Button>}
            {o.status === 'COMPLETED' && !pending && !o.refunded && o.payment && !['SWIGGY', 'ZOMATO'].includes(o.payment) && <Button variant="danger" icon={RotateCcw} className="mr-auto" onClick={() => setAsking('REFUND')}>Request refund</Button>}
            <Button variant="secondary" icon={Printer} onClick={() => toast(`${o.status === 'COMPLETED' ? 'Bill' : 'KOT'} for ${o.id} reprinted.`)}>Reprint {o.status === 'COMPLETED' ? 'bill' : 'KOT'}</Button>
          </>
        }
      >
        {req && (
          <p className={clsx('mb-5 rounded-xl text-[13px] px-4 py-3', req.status === 'PENDING' ? 'bg-warn-50 text-warn-600' : req.status === 'APPROVED' ? 'bg-ok-50 text-ok-600' : 'bg-danger-50 text-danger-600')}>
            {req.status === 'PENDING' ? `Your ${req.type.toLowerCase()} request is waiting for the owner.` : `The owner ${req.status.toLowerCase()} the ${req.type.toLowerCase()}${req.decisionNote ? `: ${req.decisionNote}` : '.'}`}
          </p>
        )}
        {o.kots?.length > 1 && <p className="text-[12px] text-ink-500 mb-2">{o.kots.length} KOTs sent</p>}
        <ul className="divide-y divide-line border-y border-line">
          {o.items.map((l) => (
            <li key={l.itemId} className="flex items-baseline gap-3 py-2.5 text-sm"><span className="tabular text-ink-500 w-8">{l.qty} ×</span><span className="flex-1">{l.name}</span><span className="tabular">{formatINR(l.qty * l.price)}</span></li>
          ))}
        </ul>
        <dl className="mt-3 text-sm grid grid-cols-[1fr_auto] gap-y-1.5 tabular">
          <dt className="text-ink-500">Subtotal</dt><dd className="text-right">{formatINR(o.subtotal)}</dd>
          {o.discount > 0 && <><dt className="text-ink-500">Discount</dt><dd className="text-right text-ok-600">−{formatINR(o.discount)}</dd></>}
          <dt className="text-ink-500">GST 5%</dt><dd className="text-right">₹{o.gst.toFixed(2)}</dd>
          <dt className="font-bold">Total</dt><dd className="text-right font-bold">{formatINR(o.total)}</dd>
          {o.payment && <><dt className="text-ink-500">Paid by</dt><dd className="text-right">{PAY[o.payment]}</dd></>}
          {o.refunded > 0 && <><dt className="text-ink-500">Refunded</dt><dd className="text-right">{formatINR(o.refunded)}</dd></>}
        </dl>
      </Drawer>
      {asking && <RequestModal order={o} type={asking} onClose={() => setAsking(null)} />}
    </>
  )
}

function RequestModal({ order: o, type, onClose }) {
  const pos = usePos()
  const toast = useToast()
  const reasons = type === 'CANCELLATION' ? CANCEL_REASONS : REFUND_REASONS
  const [reason, setReason] = useState(reasons[0])
  const [amount, setAmount] = useState(String(o.total))
  const amt = Number(amount)
  const valid = type === 'CANCELLATION' || (amt > 0 && amt <= o.total)
  return (
    <Modal
      open
      onClose={onClose}
      title={type === 'CANCELLATION' ? `Ask to cancel ${o.id}?` : `Ask to refund ${o.id}?`}
      description="The owner gets a notification and decides in their panel. You’ll see the answer here and in Check update."
      footer={<><Button variant="secondary" onClick={onClose}>Back</Button><Button disabled={!valid} onClick={() => {
        pos.requestApproval(type === 'CANCELLATION' ? { type, orderId: o.id, amount: o.total, reason } : { type, orderId: o.id, amount: amt, reason, refundTo: o.payment })
        toast(`${type === 'CANCELLATION' ? 'Cancellation' : 'Refund'} request sent to the owner.`)
        onClose()
      }}>Send request</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Field label="Reason">{({ id }) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)} options={reasons} />}</Field>
        {type === 'REFUND' && <Field label="Refund amount (₹)" error={valid ? null : `Between ₹1 and ${formatINR(o.total)}.`} hint={`Goes back by ${PAY[o.payment]}`}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="1" max={o.total} value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>}
      </div>
    </Modal>
  )
}
