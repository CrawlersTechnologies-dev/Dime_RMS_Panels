import { Link } from 'react-router-dom'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import StatStrip from '../../../components/ui/StatStrip'
import Badge from '../../../components/ui/Badge'
import DataTable from '../../../components/ui/DataTable'
import { formatDate, formatINR, ordinal } from '../../../lib/format'
import { STAGE, useSales } from '../useSales'
import { maskPayout } from './Profile'

export default function Earnings() {
  const { me, mine, totals, rule, payoutOn } = useSales()
  const upcoming = mine.filter((r) => r.stage === 'IN_PAYOUT' || r.stage === 'CHECKING')

  // Paid incentives grouped by the month they were paid.
  const months = {}
  mine.filter((r) => r.stage === 'PAID').forEach((r) => {
    const d = new Date(r.paidAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const m = (months[key] ??= { id: key, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), paidAt: r.paidAt, amount: 0, count: 0, refs: new Set() })
    m.amount += r.amount; m.count += 1; m.refs.add(r.utr)
  })
  const payouts = Object.values(months).sort((a, b) => b.id.localeCompare(a.id))

  return (
    <>
      <PageHeader title="Earnings" description={`Incentives are paid on the ${ordinal(rule.payoutDay)} of every month.`} />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Paid to you', value: formatINR(totals.paid), note: `${payouts.length} payout${payouts.length === 1 ? '' : 's'}` },
          { label: `In the ${formatDate(payoutOn).replace(/ \d{4}$/, '')} payout`, value: formatINR(totals.inPayout), note: 'Approved by finance' },
          { label: 'Being checked', value: formatINR(totals.checking), note: `${rule.holdDays}-day check after approval` },
          { label: 'Total earned', value: formatINR(totals.earned), note: 'Paid, approved and being checked' },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        <Panel flush className="xl:col-span-2" title="Coming up" description="Earned incentives that haven’t been paid yet">
          <DataTable
            rows={upcoming}
            empty="Nothing waiting. New incentives appear here once Dime Quest approves a restaurant you referred."
            columns={[
              { key: 'restaurant', header: 'Restaurant', render: (r) => <div><div className="font-semibold">{r.restaurant}</div><div className="text-[12px] text-ink-500">Approved {formatDate(r.decidedAt ?? r.at)}</div></div> },
              { key: 'stage', header: 'Status', render: (r) => <Badge tone={STAGE[r.stage].tone} dot>{STAGE[r.stage].label}</Badge> },
              { key: 'when', header: 'Expected', render: (r) => <span className="whitespace-nowrap text-ink-700">{r.stage === 'IN_PAYOUT' ? formatDate(payoutOn) : 'Next month'}</span> },
              { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className="font-semibold">{formatINR(r.amount)}</span> },
            ]}
          />
        </Panel>

        <Panel title="Paid to">
          {me.payout ? (
            <div className="text-sm">
              <p className="font-semibold">{me.payout.holder}</p>
              <p className="text-ink-500 tabular">{maskPayout(me.payout)}</p>
              <Link to="/sales/profile" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-600">Change payout details</Link>
            </div>
          ) : (
            <div className="text-sm">
              <p className="text-ink-700">You haven’t added payout details yet, so we can’t pay you.</p>
              <Link to="/sales/profile" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:text-brand-600">Add UPI or bank details</Link>
            </div>
          )}
          <p className="text-[12px] text-ink-500 mt-4 pt-4 border-t border-line">Tax may be deducted at source as per income tax rules. Finance emails your TDS certificate every quarter.</p>
        </Panel>
      </div>

      <Panel flush className="mt-6" title="Payout history">
        <DataTable
          rows={payouts}
          empty="No payouts yet."
          columns={[
            { key: 'label', header: 'Month', render: (p) => <span className="font-semibold">{p.label}</span> },
            { key: 'paidAt', header: 'Paid on', render: (p) => formatDate(p.paidAt) },
            { key: 'count', header: 'Restaurants', align: 'right' },
            { key: 'refs', header: 'Bank reference', render: (p) => <span className="tabular text-ink-700 select-all">{[...p.refs].join(', ')}</span> },
            { key: 'amount', header: 'Amount', align: 'right', render: (p) => <span className="font-semibold">{formatINR(p.amount)}</span> },
          ]}
        />
      </Panel>
    </>
  )
}
