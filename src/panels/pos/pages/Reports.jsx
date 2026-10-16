import { useState } from 'react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import StatStrip from '../../../components/ui/StatStrip'
import ColumnChart from '../../../components/charts/ColumnChart'
import BarList from '../../../components/charts/BarList'
import { formatINR, formatINRCompact, formatNumber } from '../../../lib/format'
import { billable, hourly, itemTotals, salesOf } from '../../owner/lib/metrics'
import { usePos } from '../data/PosDataContext'
import { ORDER_TYPE } from './LiveView'

const PAY = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', SWIGGY: 'Swiggy', ZOMATO: 'Zomato' }

/** Today's shift numbers for this outlet, or just this person's bills. */
export default function Reports() {
  const pos = usePos()
  const [scope, setScope] = useState('OUTLET')
  const orders = scope === 'MINE' ? pos.orders.filter((o) => o.biller === pos.actor) : pos.orders
  const paid = orders.filter((o) => o.status === 'COMPLETED')
  const sales = salesOf(orders)
  const n = billable(orders).length
  const sum = (key, labels) => {
    const m = {}
    billable(orders).forEach((o) => { const k = o[key]; if (k) m[k] = (m[k] ?? 0) + o.total })
    return Object.entries(m).map(([k, v]) => ({ label: labels[k] ?? k, value: v })).sort((a, b) => b.value - a.value)
  }
  const opens = Number(pos.outlet.opens.slice(0, 2))

  return (
    <>
      <PageHeader title="Reports" description={`Today at ${pos.outlet.name}, live.`} />
      <Tabs className="mb-4" tabs={[{ value: 'OUTLET', label: 'Whole outlet' }, { value: 'MINE', label: 'My bills' }]} value={scope} onChange={setScope} label="Report scope" />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Sales', value: formatINR(sales), note: 'Including running bills' },
          { label: 'Orders', value: formatNumber(n), note: `${paid.length} paid` },
          { label: 'Average bill', value: n ? formatINR(Math.round(sales / n)) : '—' },
          { label: 'Discounts', value: formatINR(billable(orders).reduce((s, o) => s + o.discount, 0)), note: `${billable(orders).filter((o) => o.discount).length} bills` },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Sales by hour">
          <ColumnChart data={hourly(orders, new Date(), opens)} formatValue={formatINR} formatTick={formatINRCompact} labelEvery={2} ariaLabel="Sales by hour today" />
        </Panel>
        <Panel title="By payment">
          <BarList items={sum('payment', PAY)} formatValue={formatINR} showShare />
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2 mt-6">
        <Panel title="By order type"><BarList items={sum('type', ORDER_TYPE)} formatValue={formatINR} showShare tone="brand" /></Panel>
        <Panel title="Best sellers">
          <BarList items={itemTotals(orders).slice(0, 6).map((i) => ({ label: i.name, value: i.revenue, note: `${formatNumber(i.qty)} sold` }))} formatValue={formatINR} />
        </Panel>
      </div>
    </>
  )
}
