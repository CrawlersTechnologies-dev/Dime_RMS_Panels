import { useState } from 'react'
import clsx from 'clsx'
import { Ban, Check, Percent, RotateCcw, Scale, X } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Textarea } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, timeAgo } from '../../../lib/format'
import { useOwnerData } from '../data/OwnerDataContext'
import { OutletTag, PAYMENT_LABEL, qty, useScopeLabel } from '../components/common'

export const APPROVAL_TYPES = {
  CANCELLATION: { label: 'Cancellation', icon: Ban, tone: 'danger' },
  DISCOUNT: { label: 'Discount', icon: Percent, tone: 'brand' },
  REFUND: { label: 'Refund', icon: RotateCcw, tone: 'info' },
  STOCK_ADJUSTMENT: { label: 'Stock adjustment', icon: Scale, tone: 'warn' },
}

export default function Approvals() {
  const d = useOwnerData()
  const scope = useScopeLabel()
  const [tab, setTab] = useState('PENDING')
  const [type, setType] = useState('ALL')
  const [rejecting, setRejecting] = useState(null)
  const toast = useToast()

  const all = d.scoped(d.approvals)
  const list = all
    .filter((a) => (tab === 'PENDING' ? a.status === 'PENDING' : a.status !== 'PENDING'))
    .filter((a) => type === 'ALL' || a.type === type)
    .sort((a, b) => new Date(b.at) - new Date(a.at))

  const approve = (a) => {
    d.decideApproval(a, 'APPROVED')
    const msg = {
      CANCELLATION: `Order ${a.orderId} cancelled. It’s removed from sales.`,
      DISCOUNT: `${a.percent}% discount applied to ${a.orderId}.`,
      REFUND: `Refund of ${formatINR(a.amount)} approved. The biller completes it on ${a.refundTo}.`,
      STOCK_ADJUSTMENT: 'Stock count updated.',
    }[a.type]
    toast(msg)
  }

  return (
    <>
      <PageHeader title="Approvals" description={`Requests from managers and billers at ${scope}. Nothing changes until you approve.`} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Tabs
          tabs={[{ value: 'PENDING', label: 'Waiting', count: all.filter((a) => a.status === 'PENDING').length }, { value: 'DONE', label: 'Decided', count: all.filter((a) => a.status !== 'PENDING').length }]}
          value={tab}
          onChange={setTab}
          label="Approval status"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Request type">
          {[['ALL', 'All types'], ...Object.entries(APPROVAL_TYPES).map(([k, v]) => [k, v.label])].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setType(k)}
              aria-pressed={type === k}
              className={clsx('h-8 px-3 rounded-full text-[13px] font-semibold cursor-pointer border', type === k ? 'bg-ink-900 text-white border-ink-900' : 'bg-surface text-ink-700 border-line hover:border-ink-400')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Panel><p className="text-sm text-ink-500 py-8 text-center">{tab === 'PENDING' ? 'Nothing waiting. Requests from your staff show up here as soon as they’re raised.' : 'No decided requests yet.'}</p></Panel>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((a) => <Request key={a.id} a={a} onApprove={() => approve(a)} onReject={() => setRejecting(a)} />)}
        </ul>
      )}

      {rejecting && <RejectModal a={rejecting} onClose={() => setRejecting(null)} />}
    </>
  )
}

function Request({ a, onApprove, onReject }) {
  const d = useOwnerData()
  const t = APPROVAL_TYPES[a.type]
  const order = a.orderId ? d.orders.find((o) => o.id === a.orderId) : null
  const item = a.itemId ? d.inventory.find((i) => i.id === a.itemId) : null
  const title = {
    CANCELLATION: `Cancel order ${a.orderId}`,
    DISCOUNT: `${a.percent}% discount on ${a.orderId}`,
    REFUND: `Refund for ${a.orderId}`,
    STOCK_ADJUSTMENT: `Correct ${item?.name.toLowerCase()} count`,
  }[a.type]
  const amount = a.type === 'STOCK_ADJUSTMENT' ? null : a.amount
  const stockValue = item ? Math.round((a.to - a.from) * item.cost) : 0

  return (
    <li className="min-w-0 bg-surface border border-line rounded-[var(--radius-panel)] p-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="flex gap-4 min-w-0">
        <span className={clsx('grid place-items-center size-10 shrink-0 rounded-full', { danger: 'bg-danger-50 text-danger-600', brand: 'bg-brand-50 text-brand-700', info: 'bg-info-50 text-info-600', warn: 'bg-warn-50 text-warn-600' }[t.tone])}>
          <t.icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold">{title}</h2>
            {amount !== null && <span className="font-display text-lg font-semibold tabular">{formatINR(amount)}</span>}
            {a.status !== 'PENDING' && <StatusBadge status={a.status} />}
          </div>
          <p className="text-sm mt-1">“{a.reason}”</p>
          <p className="text-[12px] text-ink-500 mt-1.5 flex flex-wrap items-center gap-1.5">
            {a.by}, {timeAgo(a.at)} <OutletTag id={a.outletId} />
          </p>
          {order && (
            <p className="text-[13px] text-ink-700 mt-2 rounded-lg bg-canvas px-3 py-2">
              {order.items.map((l) => `${l.qty} × ${l.name}`).join(', ')}. Bill {formatINR(order.total)}{order.table ? `, table ${order.table}` : ''}, {order.payment ? `paid by ${PAYMENT_LABEL[order.payment]}` : 'not paid yet'}.
            </p>
          )}
          {item && (
            <p className="text-[13px] text-ink-700 mt-2 rounded-lg bg-canvas px-3 py-2 tabular">
              {qty(a.from, item.unit)} on record → {qty(a.to, item.unit)} counted. {stockValue < 0 ? `Writes off ${formatINR(-stockValue)}` : `Adds ${formatINR(stockValue)}`} of stock.
            </p>
          )}
          {a.status !== 'PENDING' && (
            <p className="text-[12px] text-ink-500 mt-2">{a.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {a.decidedBy?.replace(/ \(.*\)$/, '')} {timeAgo(a.decidedAt)}{a.decisionNote ? `: ${a.decisionNote}` : ''}</p>
          )}
        </div>
      </div>
      {a.status === 'PENDING' && (
        <div className="flex gap-2 md:flex-col md:items-stretch md:w-36">
          <Button icon={Check} onClick={onApprove}>Approve</Button>
          <Button variant="secondary" icon={X} onClick={onReject}>Reject</Button>
        </div>
      )}
    </li>
  )
}

function RejectModal({ a, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const [note, setNote] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={`Reject this ${APPROVAL_TYPES[a.type].label.toLowerCase()}?`}
      description={`${a.by} sees your note in the biller panel. Nothing changes on the order or stock.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="dark" onClick={() => { d.decideApproval(a, 'REJECTED', note.trim()); toast('Request rejected.'); onClose() }}>Reject request</Button></>}
    >
      <Field label="Note" hint="Optional">{({ id }) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Offer a free dessert instead" />}</Field>
    </Modal>
  )
}
