import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import StatStrip from '../../../components/ui/StatStrip'
import LineChart from '../../../components/charts/LineChart'
import ColumnChart from '../../../components/charts/ColumnChart'
import BarList from '../../../components/charts/BarList'
import DataTable from '../../../components/ui/DataTable'
import { Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, formatINRCompact, formatNumber } from '../../../lib/format'
import { ALL, useOwnerData } from '../data/OwnerDataContext'
import { billable, hourly, itemTotals, salesOf } from '../lib/metrics'
import { ORDER_TYPE_LABEL, PAYMENT_LABEL, STAFF_TYPE_LABEL, useScopeLabel } from '../components/common'

const RANGES = [{ value: '1', label: 'Today' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }]
const TABS = [
  { value: 'SALES', label: 'Sales' }, { value: 'GST', label: 'GST' }, { value: 'ITEMS', label: 'Items' },
  { value: 'INVENTORY', label: 'Inventory' }, { value: 'STAFF', label: 'Staff' }, { value: 'EXPENSES', label: 'Expenses' },
]
const dayLabel = (date) => new Date(`${date}T00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })
const rupees = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Reports read from daily history (closed days) plus today's live orders.
 * Mixes (order type, payment, items, staff) come from order-level data; in this demo
 * they're taken from today's orders and scaled to the range. The API will return exact figures.
 */
function useReport(range) {
  const d = useOwnerData()
  return useMemo(() => {
    const n = Number(range)
    const outlets = d.scopeOutlets
    const today = d.scoped(d.orders)
    const todaySales = salesOf(today)
    const pastLen = n - 1
    const days = []
    const histLen = d.history[outlets[0].id].length
    for (let i = histLen - pastLen; i < histLen; i++) {
      const date = d.history[outlets[0].id][i].date
      days.push({ date, sales: outlets.reduce((s, o) => s + d.history[o.id][i].sales, 0), orders: outlets.reduce((s, o) => s + d.history[o.id][i].orders, 0) })
    }
    const now = new Date()
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    days.push({ date: todayDate, sales: todaySales, orders: billable(today).length, partial: true })
    const sales = days.reduce((s, x) => s + x.sales, 0)
    const orders = days.reduce((s, x) => s + x.orders, 0)
    const scale = todaySales ? sales / todaySales : 0
    const since = Date.now() - n * 86400_000
    return { n, days, sales, orders, scale, today, todaySales, outlets, since }
  }, [d, range])
}

export default function Reports() {
  const scope = useScopeLabel()
  const toast = useToast()
  const [range, setRange] = useState('7')
  const [tab, setTab] = useState('SALES')
  const r = useReport(range)
  const [exportRows, setExportRows] = useState(null)

  const exportCsv = () => {
    if (!exportRows?.length) return toast('Nothing to export for this view.', 'error')
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [Object.keys(exportRows[0]), ...exportRows.map((x) => Object.values(x))].map((row) => row.map(esc).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    Object.assign(document.createElement('a'), { href: url, download: `${tab.toLowerCase()}-report-${range}d.csv` }).click()
    URL.revokeObjectURL(url)
  }

  const label = RANGES.find((x) => x.value === range).label.toLowerCase()
  return (
    <>
      <PageHeader
        title="Reports"
        description={`Sales, GST, stock, staff and spending at ${scope}, ${label}.`}
        actions={
          <>
            <Select aria-label="Date range" className="w-auto" value={range} onChange={(e) => setRange(e.target.value)} options={RANGES} />
            <Button variant="secondary" icon={Download} onClick={exportCsv}>Export CSV</Button>
          </>
        }
      />
      <Tabs className="mb-4" tabs={TABS} value={tab} onChange={setTab} label="Report" />
      {tab === 'SALES' && <SalesReport r={r} setExport={setExportRows} />}
      {tab === 'GST' && <GstReport r={r} setExport={setExportRows} />}
      {tab === 'ITEMS' && <ItemsReport r={r} setExport={setExportRows} />}
      {tab === 'INVENTORY' && <InventoryReport r={r} setExport={setExportRows} />}
      {tab === 'STAFF' && <StaffReport r={r} setExport={setExportRows} />}
      {tab === 'EXPENSES' && <ExpenseReport r={r} setExport={setExportRows} />}
    </>
  )
}

/** Registers the rows the Export button should download for the current tab. */
function useExport(setExport, rows) {
  useEffect(() => setExport(rows), [rows, setExport])
}

function mix(orders, key, labels, scale) {
  const m = {}
  billable(orders).forEach((o) => { const k = o[key]; if (k) m[k] = (m[k] ?? 0) + o.total })
  return Object.entries(m).map(([k, v]) => ({ label: labels[k] ?? k, value: Math.round(v * scale) })).sort((a, b) => b.value - a.value)
}

function SalesReport({ r, setExport }) {
  const d = useOwnerData()
  const discount = billable(r.today).reduce((s, o) => s + o.discount, 0) * r.scale
  const earliest = Math.min(...r.outlets.map((o) => Number(o.opens.slice(0, 2))))
  useExport(setExport, useMemo(() => r.days.map((x) => ({ Date: x.date, Sales: x.sales, Orders: x.orders, 'Average bill': x.orders ? Math.round(x.sales / x.orders) : 0 })), [r]))
  const outletRows = d.outletId === ALL && d.isFranchise
    ? d.outlets.map((o) => ({ label: o.name, value: r.days.slice(0, -1).length ? d.history[o.id].slice(-(r.n - 1)).reduce((s, x) => s + x.sales, 0) + salesOf(r.today.filter((x) => x.outletId === o.id)) : salesOf(r.today.filter((x) => x.outletId === o.id)) }))
        .sort((a, b) => b.value - a.value)
    : null
  return (
    <>
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Sales', value: formatINRCompact(r.sales), note: 'After discounts, including GST' },
          { label: 'Orders', value: formatNumber(r.orders) },
          { label: 'Average bill', value: r.orders ? formatINR(Math.round(r.sales / r.orders)) : '—' },
          { label: 'Discounts given', value: formatINR(Math.round(discount)), note: 'Approved discounts only' },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={r.n === 1 ? 'Sales by hour' : 'Sales by day'} description={r.n === 1 ? 'Today so far' : 'Today is still in progress'}>
          {r.n === 1
            ? <ColumnChart data={hourly(r.today, new Date(), earliest)} formatValue={formatINR} formatTick={formatINRCompact} labelEvery={2} ariaLabel="Sales by hour today" />
            : <LineChart data={r.days.map((x) => ({ label: dayLabel(x.date), value: x.sales }))} formatValue={formatINR} formatTick={formatINRCompact} ariaLabel={`Daily sales, ${r.n} days`} />}
        </Panel>
        <Panel title="By order type">
          <BarList items={mix(r.today, 'type', ORDER_TYPE_LABEL, r.scale)} formatValue={formatINRCompact} showShare />
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2 mt-6">
        <Panel title="By payment">
          <BarList items={mix(r.today, 'payment', PAYMENT_LABEL, r.scale)} formatValue={formatINRCompact} showShare />
        </Panel>
        {outletRows ? (
          <Panel title="By outlet"><BarList items={outletRows} formatValue={formatINRCompact} showShare tone="brand" /></Panel>
        ) : (
          <Panel title="By category">
            <BarList items={categoryMix(d, r)} formatValue={formatINRCompact} showShare tone="brand" />
          </Panel>
        )}
      </div>
    </>
  )
}

function categoryMix(d, r) {
  const m = {}
  itemTotals(r.today).forEach((i) => { m[i.categoryId] = (m[i.categoryId] ?? 0) + i.revenue })
  return Object.entries(m).map(([k, v]) => ({ label: d.categories.find((c) => c.id === k)?.name ?? k, value: Math.round(v * r.scale) })).sort((a, b) => b.value - a.value)
}

function GstReport({ r, setExport }) {
  const d = useOwnerData()
  const aggShare = r.todaySales ? salesOf(r.today.filter((o) => o.type === 'SWIGGY' || o.type === 'ZOMATO')) / r.todaySales : 0
  const rows = useMemo(() => r.days.map((x) => {
    const agg = Math.round(x.sales * aggShare)
    const own = x.sales - agg
    const taxable = own / 1.05
    const half = taxable * 0.025
    return { id: x.date, date: x.date, own, agg, taxable, cgst: half, sgst: half, partial: x.partial }
  }).reverse(), [r, aggShare])
  const t = rows.reduce((s, x) => ({ own: s.own + x.own, agg: s.agg + x.agg, taxable: s.taxable + x.taxable, gst: s.gst + x.cgst * 2 }), { own: 0, agg: 0, taxable: 0, gst: 0 })
  useExport(setExport, useMemo(() => rows.map((x) => ({ Date: x.date, 'Invoice value': x.own.toFixed(2), 'Taxable value': x.taxable.toFixed(2), CGST: x.cgst.toFixed(2), SGST: x.sgst.toFixed(2), 'Aggregator sales (GST under 9(5))': x.agg })), [rows]))

  const columns = [
    { key: 'date', header: 'Date', render: (x) => <span className="whitespace-nowrap">{dayLabel(x.date)}{x.partial ? ', so far' : ''}</span> },
    { key: 'own', header: 'Invoice value', align: 'right', render: (x) => rupees(x.own) },
    { key: 'taxable', header: 'Taxable value', align: 'right', render: (x) => rupees(x.taxable) },
    { key: 'cgst', header: 'CGST 2.5%', align: 'right', render: (x) => rupees(x.cgst) },
    { key: 'sgst', header: 'SGST 2.5%', align: 'right', render: (x) => rupees(x.sgst) },
    ...(d.restaurant.online ? [{ key: 'agg', header: 'Swiggy and Zomato', align: 'right', render: (x) => <span className="text-ink-500">{rupees(x.agg)}</span> }] : []),
  ]
  return (
    <>
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Taxable value', value: formatINRCompact(t.taxable), note: 'Your dine-in and takeaway bills' },
          { label: 'GST you collected', value: formatINR(Math.round(t.gst)), note: `CGST ${formatINR(Math.round(t.gst / 2))} + SGST ${formatINR(Math.round(t.gst / 2))}` },
          ...(d.restaurant.online ? [{ label: 'Delivery app sales', value: formatINRCompact(t.agg), note: 'GST paid by the aggregator' }] : []),
          { label: 'GSTIN', value: d.restaurant.gstin.slice(0, 2) + '…' + d.restaurant.gstin.slice(-4), note: 'Karnataka (29)' },
        ]}
      />
      <Panel flush title="Daily GST summary" description="5% restaurant service rate, no input tax credit. Use this for GSTR-1 and GSTR-3B.">
        <DataTable columns={columns} rows={rows} pageSize={31} />
        {d.restaurant.online && (
          <p className="px-5 py-3 border-t border-line text-[12px] text-ink-500">
            Swiggy and Zomato collect and pay GST on delivery orders under Section 9(5) of the CGST Act, so those sales aren’t part of your GST liability. Report them as aggregator supplies when you file.
          </p>
        )}
      </Panel>
    </>
  )
}

function ItemsReport({ r, setExport }) {
  const d = useOwnerData()
  const rows = useMemo(() => {
    const items = itemTotals(r.today)
    const total = items.reduce((s, i) => s + i.revenue, 0) || 1
    return items.map((i) => ({ ...i, id: i.itemId, qty: Math.round(i.qty * r.scale), revenue: Math.round(i.revenue * r.scale), share: i.revenue / total }))
  }, [r])
  useExport(setExport, useMemo(() => rows.map((i) => ({ Item: i.name, Category: d.categories.find((c) => c.id === i.categoryId)?.name, Sold: i.qty, Revenue: i.revenue })), [rows, d.categories]))
  const columns = [
    { key: 'name', header: 'Item', render: (i) => <span className="font-semibold">{i.name}</span> },
    { key: 'cat', header: 'Category', render: (i) => d.categories.find((c) => c.id === i.categoryId)?.name },
    { key: 'qty', header: 'Sold', align: 'right', render: (i) => formatNumber(i.qty) },
    { key: 'revenue', header: 'Revenue', align: 'right', render: (i) => formatINR(i.revenue) },
    { key: 'share', header: 'Share', render: (i) => <div className="flex items-center gap-2 min-w-32"><div className="h-1.5 flex-1 rounded-full bg-canvas"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(i.share / rows[0].share) * 100}%` }} /></div><span className="tabular text-[12px] w-10 text-right">{(i.share * 100).toFixed(1)}%</span></div> },
  ]
  const slow = d.items.filter((i) => !rows.some((x) => x.itemId === i.id))
  return (
    <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
      <Panel flush className="xl:col-span-2" title="Item sales" description="Before GST. Discounts aren’t split per item.">
        <DataTable columns={columns} rows={rows} pageSize={15} />
      </Panel>
      <Panel title="Not selling" description="No orders in this period">
        {slow.length ? (
          <ul className="flex flex-col gap-2 text-sm">{slow.map((i) => <li key={i.id} className="flex justify-between gap-3"><span>{i.name}</span><span className="text-ink-500 tabular">{formatINR(i.price)}</span></li>)}</ul>
        ) : <p className="text-sm text-ink-500">Every item sold at least once.</p>}
      </Panel>
    </div>
  )
}

function InventoryReport({ r, setExport }) {
  const d = useOwnerData()
  const active = r.outlets.filter((o) => o.status === 'ACTIVE')
  const used = d.inventory.map((i) => ({ id: i.id, name: i.name, unit: i.unit, qty: i.daily * active.length * r.n, value: Math.round(i.daily * active.length * r.n * i.cost) })).sort((a, b) => b.value - a.value)
  const waste = d.scoped(d.wastage).filter((w) => new Date(w.at) >= r.since)
  const wasteValue = waste.reduce((s, w) => s + w.qty * (d.inventory.find((i) => i.id === w.itemId)?.cost ?? 0), 0)
  const stockValue = d.inventory.reduce((s, i) => s + active.reduce((t, o) => t + i.stock[o.id] * i.cost, 0), 0)
  const consumed = used.reduce((s, i) => s + i.value, 0)
  const reasons = {}
  waste.forEach((w) => { reasons[w.reason] = (reasons[w.reason] ?? 0) + w.qty * (d.inventory.find((i) => i.id === w.itemId)?.cost ?? 0) })
  useExport(setExport, useMemo(() => used.map((i) => ({ Item: i.name, Used: `${i.qty.toFixed(1)} ${i.unit}`, Value: i.value })), [r, d.inventory]))
  return (
    <>
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Stock used', value: formatINRCompact(consumed), note: 'At purchase cost' },
          { label: 'Food cost', value: r.sales ? `${Math.round((consumed / r.sales) * 100)}%` : '—', note: 'Of sales. 28 to 35% is typical' },
          { label: 'Wastage', value: formatINR(Math.round(wasteValue)), note: `${waste.length} entries` },
          { label: 'Stock on hand', value: formatINRCompact(stockValue), note: 'Right now' },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        <Panel className="xl:col-span-2" title="Most used items" description="By value">
          <BarList items={used.slice(0, 8).map((i) => ({ label: i.name, value: i.value, note: `${formatNumber(Math.round(i.qty))} ${i.unit}` }))} formatValue={formatINRCompact} />
        </Panel>
        <Panel title="Wastage by reason">
          {waste.length ? <BarList items={Object.entries(reasons).map(([label, value]) => ({ label, value: Math.round(value) }))} formatValue={formatINR} tone="brand" /> : <p className="text-sm text-ink-500">No wastage recorded in this period.</p>}
        </Panel>
      </div>
    </>
  )
}

function StaffReport({ r, setExport }) {
  const d = useOwnerData()
  const billers = useMemo(() => {
    const m = {}
    billable(r.today).filter((o) => o.biller).forEach((o) => {
      const row = (m[o.biller] ??= { id: o.biller, name: o.biller, outletId: o.outletId, orders: 0, sales: 0 })
      row.orders += 1; row.sales += o.total
    })
    const requests = (name) => d.approvals.filter((a) => a.by === name && (a.type === 'CANCELLATION' || a.type === 'DISCOUNT')).length
    return Object.values(m).map((x) => ({ ...x, orders: Math.round(x.orders * r.scale), sales: Math.round(x.sales * r.scale), requests: requests(x.name) })).sort((a, b) => b.sales - a.sales)
  }, [r, d.approvals])
  const chefs = d.scoped(d.staff).filter((s) => s.staffType === 'CHEF' && s.status === 'ACTIVE').map((c, i) => {
    const outletOrders = billable(r.today).filter((o) => o.outletId === c.outletId)
    const team = d.staff.filter((s) => s.outletId === c.outletId && s.staffType === 'CHEF' && s.status === 'ACTIVE').length || 1
    const avg = outletOrders.length ? outletOrders.reduce((s, o) => s + o.prepMins, 0) / outletOrders.length : 0
    return { id: c.id, name: c.name, outletId: c.outletId, orders: Math.round((outletOrders.length / team) * r.scale * (i % 2 ? 0.94 : 1.06)), avg: avg + (i % 3) - 1 }
  })
  useExport(setExport, useMemo(() => billers.map((b) => ({ Biller: b.name, Outlet: d.outletName(b.outletId), Orders: b.orders, Sales: b.sales, 'Cancellation and discount requests': b.requests })), [billers]))
  return (
    <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
      <Panel flush title="Billers" description="Orders billed at the counter. Online orders aren’t billed by staff.">
        <DataTable
          rows={billers}
          columns={[
            { key: 'name', header: 'Name', render: (b) => <div><div className="font-semibold">{b.name}</div><div className="text-[12px] text-ink-500">{d.outletName(b.outletId)}</div></div> },
            { key: 'orders', header: 'Orders', align: 'right', render: (b) => formatNumber(b.orders) },
            { key: 'sales', header: 'Sales', align: 'right', render: (b) => formatINRCompact(b.sales) },
            { key: 'requests', header: 'Cancel or discount requests', align: 'right' },
          ]}
        />
      </Panel>
      <Panel flush title="Kitchen" description="Orders shared across the chefs on duty at each outlet">
        <DataTable
          rows={chefs}
          columns={[
            { key: 'name', header: 'Chef', render: (c) => <div><div className="font-semibold">{c.name}</div><div className="text-[12px] text-ink-500">{d.outletName(c.outletId)}</div></div> },
            { key: 'orders', header: 'Orders prepared', align: 'right', render: (c) => formatNumber(c.orders) },
            { key: 'avg', header: 'Average time to ready', align: 'right', render: (c) => (c.avg ? `${Math.round(c.avg)} min` : '—') },
          ]}
        />
        <p className="px-5 py-3 border-t border-line text-[12px] text-ink-500">{STAFF_TYPE_LABEL.CHEF}s mark orders ready in the chef app; time is from KOT to ready.</p>
      </Panel>
    </div>
  )
}

function ExpenseReport({ r, setExport }) {
  const d = useOwnerData()
  const list = d.scoped(d.expenses).filter((e) => e.status === 'APPROVED' && new Date(e.at) >= r.since)
  const total = list.reduce((s, e) => s + e.amount, 0)
  const byCat = {}
  list.forEach((e) => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount })
  const items = Object.entries(byCat).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  useExport(setExport, useMemo(() => list.map((e) => ({ Date: e.at.slice(0, 10), Outlet: d.outletName(e.outletId), Category: e.category, Description: e.description, Amount: e.amount, 'Paid by': e.paidVia })), [r, d.expenses]))
  return (
    <>
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Expenses', value: formatINRCompact(total), note: `${list.length} approved` },
          { label: 'Sales', value: formatINRCompact(r.sales) },
          { label: 'Sales minus expenses', value: formatINRCompact(r.sales - total), tone: r.sales - total < 0 ? 'warn' : undefined },
          { label: 'Expenses to sales', value: r.sales ? `${Math.round((total / r.sales) * 100)}%` : '—', note: r.n < 30 ? 'Rent and salaries are paid monthly' : undefined },
        ]}
      />
      <Panel title="By category">
        {items.length ? <BarList items={items} formatValue={formatINRCompact} showShare /> : <p className="text-sm text-ink-500">No expenses in this period.</p>}
      </Panel>
    </>
  )
}
