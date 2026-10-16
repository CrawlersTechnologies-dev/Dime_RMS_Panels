import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Bike, Clock } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import StatStrip from '../../../components/ui/StatStrip'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import { useToast } from '../../../components/ui/Toast'
import { formatINR } from '../../../lib/format'
import { usePos } from '../data/PosDataContext'

export const ORDER_TYPE = { DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', SWIGGY: 'Swiggy', ZOMATO: 'Zomato' }
const minsSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000))

/** Re-render every 30 seconds so timers stay current. */
export function useTick(ms = 30_000) {
  const [, set] = useState(0)
  useEffect(() => { const t = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(t) }, [ms])
}

export default function LiveView() {
  useTick()
  const pos = usePos()
  const toast = useToast()
  const kitchen = pos.running
  const late = (o) => o.status === 'PREPARING' && minsSince(o.kots?.at(-1)?.at ?? o.placedAt) > o.prepMins
  const used = pos.tables.filter((t) => t.status === 'OCCUPIED').length

  const columns = [
    { status: 'PREPARING', title: 'In the kitchen', hint: 'Chefs mark these ready in the chef app' },
    { status: 'READY', title: 'Ready to serve', hint: 'Waiting at the pass' },
    { status: 'SERVED', title: 'Served, bill pending', hint: 'Settle from Billing' },
  ]
  const next = (o) => {
    if (o.status === 'READY') {
      if (o.type === 'DINE_IN') { pos.setOrderStatus(o.id, 'SERVED'); toast(`${o.id} served at table ${o.table}.`) }
      else { pos.setOrderStatus(o.id, o.payment ? 'COMPLETED' : 'SERVED'); toast(o.type === 'TAKEAWAY' ? `${o.id} handed to the customer.` : `${o.id} handed to the ${ORDER_TYPE[o.type]} rider.`) }
    }
  }

  return (
    <>
      <PageHeader title="Live view" description={`Tables and kitchen at ${pos.outlet.name}, right now. Updates every 30 seconds.`} />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Tables in use', value: `${used} of ${pos.tables.length}`, note: `${pos.tables.filter((t) => t.status === 'CLEANING').length} being cleaned` },
          { label: 'In the kitchen', value: kitchen.filter((o) => o.status === 'PREPARING').length, note: `${kitchen.filter(late).length} taking longer than usual`, tone: kitchen.some(late) ? 'warn' : undefined },
          { label: 'Ready to serve', value: kitchen.filter((o) => o.status === 'READY').length, tone: kitchen.some((o) => o.status === 'READY') ? 'warn' : undefined },
          { label: 'Bills pending', value: kitchen.filter((o) => o.status === 'SERVED').length, note: formatINR(kitchen.filter((o) => o.status === 'SERVED').reduce((s, o) => s + o.total, 0)) },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {columns.map((col) => {
          const list = kitchen.filter((o) => o.status === col.status).sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt))
          return (
            <section key={col.status} className="min-w-0 rounded-[var(--radius-panel)] bg-ink-900/[0.04] p-3">
              <header className="flex items-baseline justify-between px-1.5 pb-2.5">
                <h2 className="font-bold">{col.title} <span className="text-ink-500 font-normal tabular">{list.length}</span></h2>
                <span className="text-[12px] text-ink-500">{col.hint}</span>
              </header>
              <ul className="flex flex-col gap-2">
                {list.length === 0 && <li className="text-sm text-ink-500 px-1.5 py-6 text-center">Nothing here.</li>}
                {list.map((o) => {
                  const m = minsSince(o.kots?.at(-1)?.at ?? o.placedAt)
                  const isLate = late(o)
                  return (
                    <li key={o.id} className={clsx('rounded-xl bg-surface border p-3', isLate ? 'border-danger-600/50' : 'border-line')}>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-semibold">{o.table ? `Table ${o.table}` : ORDER_TYPE[o.type]}</span>
                        {(o.type === 'SWIGGY' || o.type === 'ZOMATO') && <Badge tone="brand"><Bike className="size-3" aria-hidden />{ORDER_TYPE[o.type]}</Badge>}
                        <span className={clsx('ml-auto inline-flex items-center gap-1 text-[12px] tabular', isLate ? 'text-danger-600 font-semibold' : 'text-ink-500')}><Clock className="size-3.5" aria-hidden />{m} min{isLate ? `, usually ${o.prepMins}` : ''}</span>
                      </div>
                      <div className="text-[12px] text-ink-500">{o.id}{o.customer ? `, ${o.customer}` : ''}</div>
                      <p className="text-sm mt-1.5">{o.items.map((l) => `${l.qty} × ${l.name}`).join(', ')}</p>
                      {o.note && <p className="text-[12px] text-brand-700 mt-1">Note: {o.note}</p>}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="tabular font-semibold text-sm">{formatINR(o.total)}</span>
                        {o.status === 'READY' && <Button size="sm" variant="secondary" onClick={() => next(o)}>{o.type === 'DINE_IN' ? 'Mark served' : o.type === 'TAKEAWAY' ? 'Handed over' : 'Handed to rider'}</Button>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
