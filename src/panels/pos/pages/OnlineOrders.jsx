import { useState } from 'react'
import clsx from 'clsx'
import { Bike, Check, X } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Select, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR } from '../../../lib/format'
import { usePos } from '../data/PosDataContext'
import { ORDER_TYPE, useTick } from './LiveView'

const ACCEPT_WITHIN = 180 // seconds before the delivery app auto-rejects
const REJECT_REASONS = ['An item is out of stock', 'Kitchen is too busy right now', 'Closing soon']
const secsLeft = (iso) => ACCEPT_WITHIN - Math.floor((Date.now() - new Date(iso).getTime()) / 1000)

export default function OnlineOrders() {
  useTick(1000)
  const pos = usePos()
  const toast = useToast()
  const [prep, setPrep] = useState({})
  const [rejecting, setRejecting] = useState(null)
  const [live, setLive] = useState({ SWIGGY: true, ZOMATO: true })
  const inKitchen = pos.running.filter((o) => o.type === 'SWIGGY' || o.type === 'ZOMATO')

  return (
    <>
      <PageHeader title="Online orders" description={`Swiggy and Zomato orders for ${pos.outlet.name}. Accept new orders within 3 minutes or the app cancels them.`} />

      <div className="flex flex-wrap gap-3 mb-6">
        {['SWIGGY', 'ZOMATO'].map((p) => (
          <div key={p} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
            <span className={clsx('size-2 rounded-full', live[p] ? 'bg-ok-600' : 'bg-ink-300')} aria-hidden />
            <span className="text-sm font-semibold">{ORDER_TYPE[p]}</span>
            <span className="text-[13px] text-ink-500">{live[p] ? 'Taking orders' : 'Paused'}</span>
            <Toggle size="sm" ariaLabel={`Take ${ORDER_TYPE[p]} orders`} checked={live[p]} onChange={(v) => { setLive((l) => ({ ...l, [p]: v })); toast(v ? `${ORDER_TYPE[p]} store is open again.` : `${ORDER_TYPE[p]} store paused. Customers can’t order until you turn it back on.`) }} />
          </div>
        ))}
      </div>

      <h2 className="font-bold mb-3">New <span className="text-ink-500 font-normal tabular">{pos.incoming.length}</span></h2>
      {pos.incoming.length === 0 ? (
        <Panel className="mb-8"><p className="text-sm text-ink-500 py-4 text-center">No new orders. New ones ring here and on the biller screen.</p></Panel>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 mb-8">
          {pos.incoming.map((inc) => {
            const left = secsLeft(inc.placedAt)
            const p = prep[inc.id] ?? 20
            return (
              <li key={inc.id} className="min-w-0 rounded-[var(--radius-panel)] border-2 border-brand-500 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand"><Bike className="size-3" aria-hidden />{ORDER_TYPE[inc.platform]}</Badge>
                  <span className="font-semibold">{inc.customer}</span>
                  <span className="text-[12px] text-ink-500 tabular">{inc.id}</span>
                  <span className={clsx('ml-auto text-sm font-bold tabular', left < 60 ? 'text-danger-600' : 'text-brand-700')} aria-live="off">
                    {left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} to accept` : 'Accept now'}
                  </span>
                </div>
                <ul className="mt-3 text-sm flex flex-col gap-1">
                  {inc.items.map((l) => <li key={l.itemId} className="flex gap-2"><span className="tabular text-ink-500 w-7">{l.qty} ×</span><span className="flex-1">{l.name}</span><span className="tabular">{formatINR(l.qty * l.price)}</span></li>)}
                </ul>
                {inc.note && <p className="text-[13px] text-brand-700 mt-2">Note: {inc.note}</p>}
                <div className="flex flex-wrap items-end gap-2 mt-4 pt-3 border-t border-line">
                  <span className="font-display text-xl font-semibold tabular mr-auto">{formatINR(inc.total)}</span>
                  <Field label="Ready in" className="w-32">{({ id }) => <Select id={id} value={p} onChange={(e) => setPrep((x) => ({ ...x, [inc.id]: Number(e.target.value) }))} options={[10, 15, 20, 25, 30, 40].map((m) => ({ value: m, label: `${m} min` }))} />}</Field>
                  <Button variant="secondary" icon={X} onClick={() => setRejecting(inc)}>Reject</Button>
                  <Button icon={Check} onClick={() => { pos.acceptOnline(inc, p); toast(`${inc.id} accepted. The rider is told it’s ready in ${p} min.`) }}>Accept</Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <h2 className="font-bold mb-3">Being prepared <span className="text-ink-500 font-normal tabular">{inKitchen.length}</span></h2>
      <Panel flush>
        {inKitchen.length === 0 ? <p className="text-sm text-ink-500 py-8 text-center">Nothing in the kitchen for delivery apps.</p> : (
          <ul className="divide-y divide-line">
            {inKitchen.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <Badge tone="brand"><Bike className="size-3" aria-hidden />{ORDER_TYPE[o.type]}</Badge>
                <div className="min-w-0 flex-1 basis-48">
                  <div className="font-semibold text-sm">{o.id}{o.customer ? `, ${o.customer}` : ''}</div>
                  <div className="text-[12px] text-ink-500 truncate">{o.items.map((l) => `${l.qty} × ${l.name}`).join(', ')}</div>
                </div>
                <span className="text-sm">{o.status === 'READY' ? 'Ready, rider on the way' : `Ready in about ${Math.max(0, o.prepMins - Math.floor((Date.now() - new Date(o.acceptedAt ?? o.placedAt)) / 60_000))} min`}</span>
                {o.status === 'PREPARING' && <Button size="sm" variant="secondary" onClick={() => { pos.setOrderStatus(o.id, 'READY'); toast(`${o.id} marked ready. ${ORDER_TYPE[o.type]} tells the rider.`) }}>Mark ready</Button>}
                {o.status === 'READY' && <Button size="sm" onClick={() => { pos.setOrderStatus(o.id, 'COMPLETED'); toast(`${o.id} handed to the rider.`) }}>Handed to rider</Button>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {rejecting && (
        <RejectModal inc={rejecting} onClose={() => setRejecting(null)} onReject={(reason) => { pos.rejectOnline(rejecting, reason); toast(`${rejecting.id} rejected. ${ORDER_TYPE[rejecting.platform]} refunds the customer.`); setRejecting(null) }} />
      )}
    </>
  )
}

function RejectModal({ inc, onClose, onReject }) {
  const [reason, setReason] = useState(REJECT_REASONS[0])
  return (
    <Modal open onClose={onClose} title={`Reject ${ORDER_TYPE[inc.platform]} order?`} description="Frequent rejections can hurt your ranking in the app. If an item has run out, ask the chef to switch it off instead."
      footer={<><Button variant="secondary" onClick={onClose}>Keep order</Button><Button variant="dark" onClick={() => onReject(reason)}>Reject order</Button></>}>
      <Field label="Reason">{({ id }) => <Select id={id} value={reason} onChange={(e) => setReason(e.target.value)} options={REJECT_REASONS} />}</Field>
    </Modal>
  )
}
