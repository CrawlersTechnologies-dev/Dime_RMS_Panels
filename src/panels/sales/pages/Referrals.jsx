import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Check, Copy, X } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Badge from '../../../components/ui/Badge'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { Drawer } from '../../../components/ui/Overlay'
import { SearchInput } from '../../../components/ui/Form'
import { formatDate, formatINR, ordinal } from '../../../lib/format'
import { STAGE, inviteLink, useSales } from '../useSales'
import { useCopy } from './Dashboard'

const TABS = [
  { value: 'ALL', label: 'All', match: () => true },
  { value: 'WAITING', label: 'Waiting for approval', match: (r) => r.stage === 'WAITING' },
  { value: 'APPROVED', label: 'Approved', match: (r) => ['CHECKING', 'IN_PAYOUT', 'PAID'].includes(r.stage) },
  { value: 'REJECTED', label: 'Not approved', match: (r) => r.stage === 'REJECTED' },
]

export default function Referrals() {
  const { me, mine } = useSales()
  const copy = useCopy()
  const [tab, setTab] = useState('ALL')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState(null)
  const open = mine.find((r) => r.id === openId)

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.value === tab)
    const needle = q.trim().toLowerCase()
    return mine.filter(t.match).filter((r) => !needle || [r.restaurant, r.owner, r.city].some((v) => v?.toLowerCase().includes(needle)))
  }, [mine, tab, q])

  const columns = [
    { key: 'restaurant', header: 'Restaurant', render: (r) => <div className="min-w-44"><div className="font-semibold">{r.restaurant}</div><div className="text-[12px] text-ink-500">{r.owner}{r.city ? `, ${r.city}` : ''}</div></div> },
    { key: 'outlets', header: 'Outlets', align: 'right', render: (r) => r.outlets ?? Math.max(1, Math.round(r.amount / 500)) },
    { key: 'at', header: 'Registered', render: (r) => <span className="whitespace-nowrap text-ink-700">{formatDate(r.at)}</span> },
    { key: 'stage', header: 'Status', render: (r) => <Badge tone={STAGE[r.stage].tone} dot>{STAGE[r.stage].label}</Badge> },
    { key: 'amount', header: 'Incentive', align: 'right', render: (r) => <span className={r.stage === 'REJECTED' ? 'text-ink-400 line-through' : 'font-semibold'}>{formatINR(r.amount)}</span> },
  ]

  return (
    <>
      <PageHeader title="My referrals" description="Every restaurant that registered with your code, and where its incentive is." />
      <Panel flush>
        <div className="px-5 pt-4 pb-3">
          <Tabs tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: mine.filter(t.match).length }))} value={tab} onChange={setTab} label="Referral status" />
        </div>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search restaurant, owner or city" className="flex-1 basis-60" />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(r) => setOpenId(r.id)}
          empty={
            <span>
              No referrals here yet.{' '}
              <button className="font-semibold text-brand-700 cursor-pointer" onClick={() => copy(inviteLink(me.code), 'Invite link')}>Copy your invite link</button> and send it to an owner.
            </span>
          }
        />
      </Panel>
      {open && <ReferralDrawer r={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

function ReferralDrawer({ r, onClose }) {
  const { rule, payoutOn } = useSales()
  const copy = useCopy()
  const rejected = r.stage === 'REJECTED'
  const steps = [
    { label: 'Registered with your code', at: r.at, done: true },
    rejected
      ? { label: 'Not approved by Dime Quest', at: r.decidedAt, done: true, failed: true }
      : { label: 'Approved by Dime Quest', at: r.decidedAt, done: r.registration === 'APPROVED', sub: r.registration === 'APPROVED' ? 'Incentive earned' : 'Documents are being checked, usually within 48 hours' },
    ...(rejected ? [] : [
      { label: 'Approved for payout', at: r.approvedAt, done: ['IN_PAYOUT', 'PAID'].includes(r.stage), sub: r.stage === 'CHECKING' ? `After a ${rule.holdDays}-day check by finance` : null },
      { label: 'Paid', at: r.paidAt, done: r.stage === 'PAID', sub: r.stage === 'PAID' ? `Reference ${r.utr}` : r.stage === 'IN_PAYOUT' ? `On ${formatDate(payoutOn)}` : `On the ${ordinal(rule.payoutDay)} after approval` },
    ]),
  ]
  return (
    <Drawer open onClose={onClose} title={r.restaurant} subtitle={`${r.owner}${r.city ? `, ${r.city}` : ''}${r.plan ? `. ${r.plan} plan` : ''}`}>
      <div className="rounded-xl bg-canvas px-4 py-3 flex items-center justify-between gap-3 mb-6">
        <span className="text-sm text-ink-500">Your incentive</span>
        <span className={clsx('font-display text-2xl font-semibold tabular', rejected && 'line-through text-ink-400')}>{formatINR(r.amount)}</span>
      </div>
      <ol className="relative flex flex-col gap-5 before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-px before:bg-line">
        {steps.map((s) => (
          <li key={s.label} className="relative flex gap-3">
            <span className={clsx('relative z-10 grid place-items-center size-7 rounded-full ring-4 ring-surface shrink-0', s.failed ? 'bg-danger-600 text-white' : s.done ? 'bg-ok-600 text-white' : 'bg-canvas border border-line-strong')}>
              {s.failed ? <X className="size-3.5" strokeWidth={3} /> : s.done ? <Check className="size-3.5" strokeWidth={3} /> : null}
            </span>
            <div className="pt-0.5 min-w-0">
              <div className={clsx('text-sm font-semibold', !s.done && 'text-ink-500')}>{s.label}</div>
              <div className="text-[12px] text-ink-500">{[s.done && s.at ? formatDate(s.at) : null, s.sub].filter(Boolean).join('. ')}</div>
              {s.sub?.startsWith('Reference') && (
                <button className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 cursor-pointer" onClick={() => copy(r.utr, 'Reference')}><Copy className="size-3" aria-hidden />Copy reference</button>
              )}
            </div>
          </li>
        ))}
      </ol>
      {rejected && (
        <div className="mt-6 rounded-xl bg-danger-50 text-danger-600 text-[13px] px-4 py-3">
          <p className="font-semibold">Reason: {r.rejectionReason}</p>
          <p className="mt-1">Help the owner fix this and register again with your code. You’ll earn once the new registration is approved.</p>
        </div>
      )}
    </Drawer>
  )
}
