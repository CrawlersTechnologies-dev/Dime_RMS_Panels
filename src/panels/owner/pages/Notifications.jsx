import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Armchair, Bike, CalendarCheck, ChefHat, ClipboardCheck, Megaphone, Package } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import { Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { timeAgo } from '../../../lib/format'
import { useOwnerData } from '../data/OwnerDataContext'
import { OutletTag, useScopeLabel } from '../components/common'

const KINDS = {
  APPROVAL: [ClipboardCheck, 'bg-brand-50 text-brand-700'],
  RESERVATION: [Armchair, 'bg-info-50 text-info-600'],
  LOW_STOCK: [Package, 'bg-warn-50 text-warn-600'],
  CHEF: [ChefHat, 'bg-ink-900/6 text-ink-800'],
  ONLINE: [Bike, 'bg-danger-50 text-danger-600'],
  DAY_END: [CalendarCheck, 'bg-ok-50 text-ok-600'],
  PLATFORM: [Megaphone, 'bg-ink-900 text-white'],
}

const PREFS = [
  ['APPROVAL', 'Requests waiting for approval', 'Cancellations, discounts, refunds, stock corrections and expenses above the limit'],
  ['RESERVATION', 'Booking requests', 'From the customer app'],
  ['LOW_STOCK', 'Low stock', 'Once a day at 9 pm, with the list of items to order'],
  ['CHEF', 'Chef app changes', 'Items switched off, timings changed, stock counts'],
  ['ONLINE', 'Delivery app problems', 'Swiggy or Zomato cancellations and rider delays'],
  ['DAY_END', 'Day end summary', 'Sales, cash and UPI totals after each outlet closes'],
]

export default function Notifications() {
  const d = useOwnerData()
  const scope = useScopeLabel()
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState('ALL')
  const [prefs, setPrefs] = useState(() => Object.fromEntries(PREFS.map(([k]) => [k, { app: true, whatsapp: k === 'APPROVAL' || k === 'DAY_END' }])))

  const list = d.scoped(d.notifications).filter((n) => tab === 'ALL' || !n.read).sort((a, b) => new Date(b.at) - new Date(a.at))
  const today = list.filter((n) => Date.now() - new Date(n.at) < 12 * 3600_000)
  const earlier = list.filter((n) => !today.includes(n))

  const open = (n) => { d.markRead(n.id); if (n.link) navigate(n.link) }

  const Group = ({ title, items }) => items.length > 0 && (
    <section>
      <h2 className="text-[13px] font-bold text-ink-500 px-5 pt-4 pb-2">{title}</h2>
      <ul className="divide-y divide-line">
        {items.map((n) => {
          const [Icon, tone] = KINDS[n.kind] ?? KINDS.PLATFORM
          return (
            <li key={n.id}>
              <button onClick={() => open(n)} className={clsx('w-full text-left flex gap-4 px-5 py-3.5 cursor-pointer hover:bg-canvas', !n.read && 'bg-brand-50/40')}>
                <span className={clsx('grid place-items-center size-9 shrink-0 rounded-full', tone)}><Icon className="size-4" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-2">
                    <span className={clsx('text-sm flex-1', !n.read ? 'font-bold' : 'font-medium')}>{n.title}</span>
                    {!n.read && <span className="size-2 rounded-full bg-brand-500 mt-1.5 shrink-0" aria-label="Unread" />}
                  </span>
                  <span className="block text-[13px] text-ink-500">{n.body}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-400 mt-1">{timeAgo(n.at)} <OutletTag id={n.outletId} /></span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )

  return (
    <>
      <PageHeader title="Notifications" description={`Important activity at ${scope}.`} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <Panel flush>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
            <Tabs tabs={[{ value: 'ALL', label: 'All' }, { value: 'UNREAD', label: 'Unread', count: d.unread }]} value={tab} onChange={setTab} label="Notification filter" />
            <Button size="sm" variant="ghost" disabled={!d.unread} onClick={() => { d.markAllRead(); toast('All notifications marked as read.') }}>Mark all as read</Button>
          </div>
          {list.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink-500">You’re all caught up.</p>
          ) : (
            <div className="pb-2"><Group title="Today" items={today} /><Group title="Earlier" items={earlier} /></div>
          )}
        </Panel>
        <Panel title="What you get alerted about" description="In the app, and on WhatsApp for the things that can’t wait.">
          <ul className="divide-y divide-line">
            {PREFS.map(([k, label, desc]) => (
              <li key={k} className="py-3 first:pt-0">
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-[12px] text-ink-500 mb-2">{desc}</div>
                <div className="flex gap-6">
                  {[['app', 'In app'], ['whatsapp', 'WhatsApp']].map(([ch, chLabel]) => (
                    <label key={ch} className="inline-flex items-center gap-2 text-[13px]">
                      <Toggle size="sm" ariaLabel={`${label} by ${chLabel}`} checked={prefs[k][ch]} onChange={(v) => setPrefs((p) => ({ ...p, [k]: { ...p[k], [ch]: v } }))} />
                      {chLabel}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  )
}
