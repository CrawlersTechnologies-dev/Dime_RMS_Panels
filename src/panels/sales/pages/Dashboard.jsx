import { Link } from 'react-router-dom'
import { ArrowUpRight, CircleAlert, Copy, Link2, MessageCircle } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import StatStrip from '../../../components/ui/StatStrip'
import Badge from '../../../components/ui/Badge'
import { useToast } from '../../../components/ui/Toast'
import { formatDate, formatINR, ordinal } from '../../../lib/format'
import { STAGE, inviteLink, useSales } from '../useSales'

export function useCopy() {
  const toast = useToast()
  return async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast(`${label} copied.`) } catch { toast('Copy isn’t available here. Select the text to copy it.', 'error') }
  }
}

export default function Dashboard() {
  const { me, mine, totals, rule, payoutOn } = useSales()
  const copy = useCopy()
  const link = inviteLink(me.code)
  const message = `Run your restaurant on Dime Quest: billing, kitchen, stock and outlets in one app. Register with my code ${me.code} here: ${link}`
  const conversion = totals.referred ? Math.round((totals.approved / totals.referred) * 100) : 0

  return (
    <>
      <PageHeader title={`Hi, ${me.name.split(' ')[0]}`} description="Share your code with restaurant owners. You earn when Dime Quest approves them." />

      {!me.payout && (
        <Link to="/sales/profile" className="mb-6 flex items-center gap-3 rounded-[var(--radius-panel)] border border-warn-600/30 bg-warn-50 px-5 py-3.5 text-sm hover:border-warn-600">
          <CircleAlert className="size-5 text-warn-600 shrink-0" aria-hidden />
          <span className="flex-1"><span className="font-semibold">Add your UPI or bank details</span> so we can pay you on the {ordinal(rule.payoutDay)}.</span>
          <ArrowUpRight className="size-4 text-ink-500" aria-hidden />
        </Link>
      )}

      <section className="rounded-[var(--radius-panel)] bg-ink-900 text-white px-6 py-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h2 className="text-[13px] text-ink-300">Your referral code</h2>
          <p className="font-display text-[clamp(2rem,10vw,3rem)] leading-none font-semibold text-brand-400 tracking-wide mt-1 select-all whitespace-nowrap">{me.code}</p>
          <p className="text-[13px] text-ink-300 mt-3 max-w-lg">
            Owners enter it on step 2 of registration, or open your invite link and it’s filled in for them. You earn {formatINR(rule.perOutlet)} per outlet, up to {formatINR(rule.maxPerReferral)} a restaurant.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch lg:w-52">
          <button onClick={() => copy(me.code, 'Code')} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-brand-500 hover:bg-brand-600 text-sm font-semibold cursor-pointer"><Copy className="size-4" aria-hidden />Copy code</button>
          <button onClick={() => copy(link, 'Invite link')} className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-white/25 hover:border-white/60 text-sm font-semibold cursor-pointer"><Link2 className="size-4" aria-hidden />Copy invite link</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full border border-white/25 hover:border-white/60 text-sm font-semibold"><MessageCircle className="size-4" aria-hidden />Share on WhatsApp</a>
        </div>
      </section>

      <StatStrip
        className="mt-6"
        items={[
          { label: 'Restaurants referred', value: totals.referred, note: `${totals.waiting} waiting for approval` },
          { label: 'Approved', value: totals.approved, note: `${conversion}% of your referrals` },
          { label: 'Total earned', value: formatINR(totals.earned), note: `${formatINR(totals.paid)} paid so far` },
          { label: `Payout on ${formatDate(payoutOn).replace(/ \d{4}$/, '')}`, value: formatINR(totals.inPayout), note: totals.checking ? `${formatINR(totals.checking)} more being checked` : 'Approved incentives' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start mt-6">
        <Panel
          flush
          className="xl:col-span-2"
          title="Latest referrals"
          actions={<Link to="/sales/referrals" className="text-sm font-semibold text-brand-700 hover:text-brand-600 inline-flex items-center gap-1">View all <ArrowUpRight className="size-4" /></Link>}
        >
          {mine.length === 0 ? (
            <p className="px-5 pb-8 pt-2 text-sm text-ink-500">No referrals yet. Share your invite link with a restaurant owner to get started.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {mine.slice(0, 6).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                  <div className="min-w-0 flex-1 basis-48">
                    <div className="font-semibold truncate">{r.restaurant}</div>
                    <div className="text-[12px] text-ink-500">{r.owner}{r.city ? `, ${r.city}` : ''}. Registered {formatDate(r.at)}</div>
                  </div>
                  <Badge tone={STAGE[r.stage].tone} dot>{STAGE[r.stage].label}</Badge>
                  <span className={r.stage === 'REJECTED' ? 'tabular text-ink-400 line-through w-20 text-right' : 'tabular font-semibold w-20 text-right'}>{formatINR(r.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="How you get paid">
          <ol className="flex flex-col gap-4">
            {[
              'The owner registers with your code.',
              'Dime Quest checks their documents and approves the restaurant. Your incentive is now earned.',
              `After a ${rule.holdDays}-day check, finance approves it for payout.`,
              `It’s paid to your UPI or bank account on the ${ordinal(rule.payoutDay)} of the month.`,
            ].map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="grid place-items-center size-7 shrink-0 rounded-full bg-brand-50 text-brand-700 font-bold tabular text-[13px]">{i + 1}</span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  )
}
