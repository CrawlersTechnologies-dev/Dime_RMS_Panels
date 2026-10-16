import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowUpRight, Check, Download, Eye, FileText } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import StatStrip from '../../../components/ui/StatStrip'
import LineChart from '../../../components/charts/LineChart'
import { useToast } from '../../../components/ui/Toast'
import { useAuth } from '../../../context/AuthContext'
import { formatINR, formatINRCompact, formatNumber, timeAgo } from '../../../lib/format'
import { kpis, mrrTrend, planMix, salesLeaders } from '../data/mock'
import { docProgress, useAdminData } from '../data/AdminDataContext'
import RegistrationReview from '../components/RegistrationReview'
import { SLA_HOURS } from './Approvals'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { registrations, approve } = useAdminData()
  const toast = useToast()
  const [reviewId, setReviewId] = useState(null)
  const queue = registrations
    .filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW')
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
  const reviewing = registrations.find((r) => r.id === reviewId)

  const onApprove = (reg) => {
    approve(reg)
    toast(`${reg.restaurant} approved. Login details sent to ${reg.email}.`)
  }

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user.name.split(' ')[0]}`}
        description="Here's what needs your attention across Dime Quest today."
        actions={<Button variant="secondary" icon={Download}>Export report</Button>}
      />

      <ApprovalQueue queue={queue} onApprove={onApprove} onReview={(r) => setReviewId(r.id)} />

      <StatStrip
        className="mt-6"
        items={[
          { label: 'Active restaurants', value: formatNumber(kpis.activeRestaurants), note: `+${kpis.activeRestaurantsDelta} this month` },
          { label: 'Franchises', value: formatNumber(kpis.franchises), note: `${formatNumber(kpis.outlets)} outlets in total` },
          { label: 'Monthly recurring revenue', value: formatINRCompact(kpis.mrr), note: `+${kpis.mrrDeltaPct}% vs last month` },
          { label: 'Incentives due', value: formatINR(kpis.incentivesDue), note: `${kpis.incentivesDueCount} sales people eligible` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-3 mt-6">
        <Panel
          className="xl:col-span-2"
          title="Subscription revenue"
          description="Monthly recurring revenue from all active plans"
          actions={<Badge tone="ok">+{kpis.mrrDeltaPct}% vs last month</Badge>}
        >
          <LineChart
            data={mrrTrend.map((d) => ({ label: d.month, value: d.value }))}
            formatValue={formatINR}
            formatTick={formatINRCompact}
            ariaLabel={`Monthly recurring revenue over 12 months, now ${formatINR(kpis.mrr)}`}
          />
        </Panel>
        <PlanMix />
      </div>

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start mt-6">
        <ReferralLeaders className="xl:col-span-2" />
        <RecentActivity />
      </div>

      {reviewing && <RegistrationReview reg={reviewing} onClose={() => setReviewId(null)} />}
    </>
  )
}

/* ------------------------------------------------------------------ */

function ApprovalQueue({ queue, onApprove, onReview }) {
  const { salesById } = useAdminData()
  const overdue = queue.filter((r) => hoursSince(r.submittedAt) > SLA_HOURS).length
  return (
    <section className="rounded-[var(--radius-panel)] bg-ink-900 text-white overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-4 px-6 pt-5 pb-4">
        <div className="flex items-end gap-4">
          <span className="font-display text-[56px] leading-[0.85] font-semibold text-brand-400 tabular">{queue.length}</span>
          <div className="pb-1">
            <h2 className="text-lg font-bold">Restaurant registrations waiting for approval</h2>
            <p className="text-[13px] text-ink-300">
              Owners get their login once you approve.{' '}
              {overdue > 0 && <span className="text-brand-200">{overdue} past the {SLA_HOURS}-hour target.</span>}
            </p>
          </div>
        </div>
        <Link to="/admin/approvals" className="text-sm font-semibold text-white/90 hover:text-white inline-flex items-center gap-1.5 rounded-full border border-white/20 hover:border-white/50 h-9 px-4">
          Open approvals <ArrowUpRight className="size-4" />
        </Link>
      </header>

      {queue.length === 0 ? (
        <p className="px-6 pb-6 text-ink-300">Queue cleared. New registrations will show up here.</p>
      ) : (
        <ul className="bg-surface text-ink-900 divide-y divide-line">
          {queue.map((r) => {
            const hrs = hoursSince(r.submittedAt)
            const docs = docProgress(r)
            return (
              <li key={r.id} className="grid gap-x-6 gap-y-2 px-6 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,0.6fr)_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{r.restaurant}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="text-[13px] text-ink-500 truncate">
                    {r.owner}, {r.city}. {r.type === 'FRANCHISE' ? `Franchise, ${r.outlets} outlets` : 'Single outlet'} on {r.plan}
                  </div>
                </div>

                <div className="text-[13px]">
                  <div className={clsx('inline-flex items-center gap-1.5 font-medium', docs.complete ? 'text-ink-700' : 'text-danger-600')}>
                    <FileText className="size-4" aria-hidden />
                    {docs.uploaded} of {docs.required} documents
                  </div>
                  <div className="text-ink-500">
                    {r.referral ? (
                      <>Referred by {salesById[r.referral.salesPersonId]?.name} <span className="text-ink-400 whitespace-nowrap">({r.referral.code})</span></>
                    ) : (
                      'No referral code'
                    )}
                  </div>
                </div>

                <div className={clsx('text-[13px] tabular', hrs > SLA_HOURS ? 'text-brand-700 font-semibold' : 'text-ink-500')}>
                  Waiting {timeAgo(r.submittedAt).replace(' ago', '')}
                </div>

                <div className="flex gap-2 md:justify-end">
                  <Button variant="secondary" size="sm" icon={Eye} onClick={() => onReview(r)}>Review</Button>
                  <Button
                    size="sm"
                    icon={Check}
                    disabled={!docs.complete}
                    title={docs.complete ? undefined : 'All required documents must be uploaded first'}
                    onClick={() => onApprove(r)}
                  >
                    Approve
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const hoursSince = (iso) => (Date.now() - new Date(iso).getTime()) / 3600_000

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */

function PlanMix() {
  const total = planMix.reduce((s, p) => s + p.restaurants, 0)
  const max = Math.max(...planMix.map((p) => p.restaurants))
  return (
    <Panel title="Restaurants by plan" description={`${formatNumber(total)} active subscriptions`}>
      <ul className="space-y-5 mt-1">
        {planMix.map((p) => (
          <li key={p.plan}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">{p.plan}</span>
              <span className="tabular text-ink-700">
                {formatNumber(p.restaurants)} <span className="text-ink-400">({Math.round((p.restaurants / total) * 100)}%)</span>
              </span>
            </div>
            <div className="mt-1.5 h-2.5 rounded-full bg-canvas" title={`${p.plan}: ${p.restaurants} restaurants`}>
              <div className="h-full rounded-full bg-ink-800" style={{ width: `${(p.restaurants / max) * 100}%` }} />
            </div>
            <div className="text-[12px] text-ink-500 mt-1 tabular">
              {formatINR(p.price)} per outlet per month, {formatINRCompact(p.price * p.restaurants)} monthly
            </div>
          </li>
        ))}
      </ul>
      <Link to="/admin/plans" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-600">
        Manage plans and features <ArrowUpRight className="size-4" />
      </Link>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

function ReferralLeaders({ className }) {
  return (
    <Panel
      flush
      className={className}
      title="Top sales people"
      description="Referrals this quarter and incentive status"
      actions={
        <Link to="/admin/referrals" className="text-sm font-semibold text-brand-700 hover:text-brand-600 inline-flex items-center gap-1">
          View all <ArrowUpRight className="size-4" />
        </Link>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[12px] text-ink-500 border-y border-line bg-canvas/60">
              <th scope="col" className="font-medium px-5 py-2.5">Sales person</th>
              <th scope="col" className="font-medium px-3 py-2.5 text-right">Referred</th>
              <th scope="col" className="font-medium px-3 py-2.5 text-right">Approved</th>
              <th scope="col" className="font-medium px-3 py-2.5 min-w-32">Conversion</th>
              <th scope="col" className="font-medium px-3 py-2.5">Incentive</th>
              <th scope="col" className="font-medium px-5 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {salesLeaders.map((s) => {
              const rate = Math.round((s.approved / s.referred) * 100)
              return (
                <tr key={s.code} className="hover:bg-canvas/60">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} size="sm" />
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-[12px] text-ink-500">{s.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular">{s.referred}</td>
                  <td className="px-3 py-3 text-right tabular">{s.approved}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-canvas">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="tabular text-[12px] text-ink-700 w-9 text-right">{rate}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={s.incentive} /></td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{formatINR(s.amount)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------------ */

function RecentActivity() {
  const { auditLog } = useAdminData()
  return (
    <Panel title="Recent activity" description="From the audit log">
      <ol className="relative mt-1 space-y-4 before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-px before:bg-line">
        {auditLog.slice(0, 5).map((e) => (
          <li key={e.id} className="relative flex gap-3">
            {e.actor === 'System' ? (
              <span className="relative z-10 grid place-items-center size-7 rounded-full bg-warn-50 text-warn-600 text-[11px] font-bold ring-4 ring-surface">!</span>
            ) : (
              <Avatar name={e.actor} size="sm" className="relative z-10 ring-4 ring-surface" />
            )}
            <div className="min-w-0 text-[13px]">
              <p>
                <span className="font-semibold">{e.actor}</span> {e.action.charAt(0).toLowerCase() + e.action.slice(1)}
              </p>
              <p className="text-ink-500 truncate">{e.target}</p>
              <p className="text-ink-400 text-[12px] mt-0.5">{timeAgo(e.at)}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link to="/admin/audit-log" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-600">
        Open audit log <ArrowUpRight className="size-4" />
      </Link>
    </Panel>
  )
}
