import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, timeAgo } from '../../../lib/format'
import { usePos } from '../data/PosDataContext'

const LABEL = { CANCELLATION: 'Cancellation', DISCOUNT: 'Discount', REFUND: 'Refund', STOCK_ADJUSTMENT: 'Stock correction' }
const MENU_ACTIONS = /item|price|timing|category|menu|available/i

/**
 * "Check update": pulls the latest menu, prices, timings and settings to this counter
 * (GET /outlets/:id/sync?since=…) and shows what changed, plus answers to this person's requests.
 */
export default function CheckUpdate() {
  const pos = usePos()
  const toast = useToast()
  const [checkedAt, setCheckedAt] = useState(() => new Date(Date.now() - 18 * 60_000).toISOString())
  const [checking, setChecking] = useState(false)

  const changes = pos.db.audit
    .filter((e) => (e.outletId === pos.outlet.id || !e.outletId) && e.source !== 'Biller panel' && MENU_ACTIONS.test(e.action))
    .slice(0, 8)
  const requests = [...pos.myRequests].sort((a, b) => new Date(b.decidedAt ?? b.at) - new Date(a.decidedAt ?? a.at))
  const notices = pos.db.notifications.filter((n) => (n.outletId === pos.outlet.id || !n.outletId) && ['PLATFORM', 'CHEF'].includes(n.kind)).slice(0, 5)

  const check = () => {
    setChecking(true)
    setTimeout(() => {
      setChecking(false)
      setCheckedAt(new Date().toISOString())
      toast(`Up to date. ${pos.items.length} menu items, prices and timings synced.`)
    }, 700)
  }

  return (
    <>
      <PageHeader
        title="Check update"
        description="Get the latest menu, prices and settings on this counter, and see answers to your requests."
        actions={<Button icon={RefreshCw} onClick={check} disabled={checking}>{checking ? 'Checking…' : 'Check for updates'}</Button>}
      />
      <p className="text-[13px] text-ink-500 -mt-3 mb-6">Last checked {timeAgo(checkedAt)}. This counter also checks by itself every 15 minutes.</p>

      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Panel flush title="Your requests to the owner">
          {requests.length === 0 ? <p className="px-5 pb-6 text-sm text-ink-500">You haven’t sent any requests today.</p> : (
            <ul className="divide-y divide-line border-t border-line">
              {requests.map((a) => (
                <li key={a.id} className="px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <div className="min-w-0 flex-1 basis-48">
                    <div className="text-sm font-semibold">{LABEL[a.type]}{a.orderId ? ` for ${a.orderId}` : a.itemId ? `, ${pos.inventory.find((i) => i.id === a.itemId)?.name}` : ''}{a.amount ? `, ${formatINR(a.amount)}` : ''}</div>
                    <div className="text-[12px] text-ink-500">{a.status === 'PENDING' ? `Sent ${timeAgo(a.at)}` : `${a.status === 'APPROVED' ? 'Approved' : 'Rejected'} ${timeAgo(a.decidedAt)}${a.decisionNote ? `: ${a.decisionNote}` : ''}`}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel flush title="Menu and price changes" description="Made by the owner or the chef">
          {changes.length === 0 ? <p className="px-5 pb-6 text-sm text-ink-500">No changes since your last check.</p> : (
            <ul className="divide-y divide-line border-t border-line">
              {changes.map((e) => (
                <li key={e.id} className="px-5 py-3 flex items-start gap-3">
                  <Badge tone={e.source === 'Chef app' ? 'ok' : 'brand'}>{e.source === 'Chef app' ? 'Chef' : 'Owner'}</Badge>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{e.action}</span>: {e.target}
                    {e.changes?.price && <span className="text-ink-500">, ₹{e.changes.price[0]} → ₹{e.changes.price[1]}</span>}
                  </div>
                  <span className="text-[12px] text-ink-500 whitespace-nowrap">{timeAgo(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {notices.length > 0 && (
          <Panel title="Notices" className="xl:col-span-2">
            <ul className="flex flex-col gap-3">
              {notices.map((n) => (
                <li key={n.id} className="text-sm"><span className="font-semibold">{n.title}.</span> <span className="text-ink-500">{n.body}</span></li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </>
  )
}
