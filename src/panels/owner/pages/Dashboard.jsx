import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowUpRight, Armchair, ClipboardCheck, Package, Printer, CalendarClock, Wallet, CircleCheck } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import StatStrip from '../../../components/ui/StatStrip'
import ColumnChart from '../../../components/charts/ColumnChart'
import BarList from '../../../components/charts/BarList'
import Avatar from '../../../components/ui/Avatar'
import { useAuth } from '../../../context/AuthContext'
import { FEATURES } from '../../../config/permissions'
import { daysUntil, formatINR, formatINRCompact, formatNumber, timeAgo } from '../../../lib/format'
import { ALL, RUNNING, useOwnerData } from '../data/OwnerDataContext'
import { billable, hourly, isThisMonth, itemTotals, monthToDate, pctChange, salesOf, sameTimeLastWeek } from '../lib/metrics'
import { OutletTag, useScopeLabel } from '../components/common'

const F = FEATURES.owner
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const d = useOwnerData()
  const scope = useScopeLabel()
  const oids = d.scopeOutlets.map((o) => o.id)
  const orders = d.scoped(d.orders)
  const sales = salesOf(orders)
  const count = billable(orders).length
  const lastWeek = sameTimeLastWeek(d.history, d.scopeOutlets.filter((o) => o.status === 'ACTIVE'))
  const change = pctChange(sales, lastWeek)
  const running = orders.filter((o) => RUNNING.includes(o.status))
  const tables = oids.flatMap((id) => d.tables[id] ?? [])
  const occupied = tables.filter((t) => t.status === 'OCCUPIED').length
  const earliest = Math.min(...d.scopeOutlets.map((o) => Number(o.opens.slice(0, 2))))

  const mtd = monthToDate(d.history, oids, orders)
  const expensesMtd = d.scoped(d.expenses).filter((e) => e.status === 'APPROVED' && isThisMonth(e.at)).reduce((s, e) => s + e.amount, 0)
  const profit = mtd.sales - expensesMtd

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(' ')[0]}`} description={`Here’s how ${d.isFranchise ? scope : d.restaurant.name} is doing today.`} />

      {/* Today */}
      <section className="rounded-[var(--radius-panel)] bg-ink-900 text-white px-6 py-5 grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-end">
        <div>
          <h2 className="text-[13px] text-ink-300">Sales today</h2>
          <p className="font-display text-[52px] leading-none font-semibold text-brand-400 tabular mt-1">{formatINR(sales)}</p>
          <p className="text-[13px] text-ink-300 mt-2">
            {change === null ? 'No sales at this time last week to compare.' : (
              <>
                <span className={clsx('font-semibold', change >= 0 ? 'text-ok-300' : 'text-brand-200')}>{change >= 0 ? '+' : ''}{change}%</span> vs {formatINR(Math.round(lastWeek))} by this time last week
              </>
            )}
          </p>
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4 lg:justify-self-end">
          {[
            ['Orders', formatNumber(count)],
            ['Average bill', count ? formatINR(Math.round(sales / count)) : '—'],
            ['Being prepared or served', formatNumber(running.length)],
            ['Tables occupied', `${occupied} of ${tables.length}`],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[12px] text-ink-300">{k}</dt>
              <dd className="font-display text-2xl font-semibold tabular">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-3 mt-6">
        <Panel className="xl:col-span-2" title="Sales by hour" description="Today, all order types. The current hour is still filling up.">
          <ColumnChart data={hourly(orders, new Date(), earliest)} formatValue={formatINR} formatTick={formatINRCompact} labelEvery={2} ariaLabel="Sales by hour today" />
        </Panel>
        <Attention />
      </div>

      <StatStrip
        className="mt-6"
        items={[
          { label: 'Sales this month', value: formatINRCompact(mtd.sales), note: `${formatNumber(mtd.orders)} orders` },
          { label: 'Expenses this month', value: formatINRCompact(expensesMtd), note: 'Approved expenses only' },
          { label: 'Gross profit', value: formatINRCompact(profit), note: 'Sales minus expenses', tone: profit < 0 ? 'warn' : undefined },
          { label: 'Margin', value: mtd.sales ? `${Math.round((profit / mtd.sales) * 100)}%` : '—', note: 'Of sales this month' },
        ]}
      />

      {d.isFranchise && d.outletId === ALL && <OutletComparison />}

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start mt-6">
        <Panel className="xl:col-span-2" title="Best sellers today" description="By revenue">
          <BarList items={itemTotals(orders).slice(0, 6).map((i) => ({ label: i.name, value: i.revenue, note: `${formatNumber(i.qty)} sold` }))} formatValue={formatINR} />
        </Panel>
        <RecentActivity />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */

function Attention() {
  const { can } = useAuth()
  const d = useOwnerData()
  const low = d.inventory.reduce((n, i) => n + d.scopeOutlets.filter((o) => o.status === 'ACTIVE' && i.stock[o.id] < i.reorder).length, 0)
  const printers = d.scoped(d.settings.printers).filter((p) => p.status === 'ERROR')
  const renewIn = daysUntil(d.restaurant.renewsOn)

  const rows = [
    can(F.APPROVALS) && d.pendingApprovals > 0 && { icon: ClipboardCheck, to: '/owner/approvals', text: `${d.pendingApprovals} request${d.pendingApprovals > 1 ? 's' : ''} to approve`, sub: 'Cancellations, discounts, refunds, stock' },
    can(F.TABLES) && d.bookingRequests > 0 && { icon: Armchair, to: '/owner/tables', text: `${d.bookingRequests} booking request${d.bookingRequests > 1 ? 's' : ''} to confirm`, sub: 'From the customer app' },
    can(F.EXPENSES) && d.pendingExpenses > 0 && { icon: Wallet, to: '/owner/expenses', text: `${d.pendingExpenses} expense${d.pendingExpenses > 1 ? 's' : ''} above your limit`, sub: 'Submitted by managers' },
    can(F.INVENTORY) && low > 0 && { icon: Package, to: '/owner/inventory', text: `${low} stock item${low > 1 ? 's' : ''} below reorder level`, sub: 'Order before tomorrow’s breakfast rush' },
    can(F.SETTINGS) && printers.length > 0 && { icon: Printer, to: '/owner/settings', text: `${printers[0].name} printer not responding`, sub: `${d.outletName(printers[0].outletId)}. KOTs aren’t printing` },
    renewIn <= 7 && { icon: CalendarClock, to: '/owner/settings', text: `Plan renews in ${renewIn} day${renewIn === 1 ? '' : 's'}`, sub: 'Renews automatically' },
  ].filter(Boolean)

  return (
    <Panel title="Needs your attention">
      {rows.length === 0 ? (
        <div className="flex items-center gap-3 text-sm text-ink-500 py-6">
          <CircleCheck className="size-5 text-ok-600" aria-hidden /> All clear. Nothing is waiting on you.
        </div>
      ) : (
        <ul className="flex flex-col -mx-2">
          {rows.map((r) => (
            <li key={r.text}>
              <Link to={r.to} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-canvas">
                <span className="grid place-items-center size-9 shrink-0 rounded-full bg-brand-50 text-brand-700"><r.icon className="size-4" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{r.text}</span>
                  <span className="block text-[12px] text-ink-500 truncate">{r.sub}</span>
                </span>
                <ArrowUpRight className="size-4 text-ink-400 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function OutletComparison() {
  const d = useOwnerData()
  const rows = d.outlets.map((o) => {
    const os = d.orders.filter((x) => x.outletId === o.id)
    const sales = salesOf(os)
    const n = billable(os).length
    const tables = d.tables[o.id] ?? []
    return {
      o, sales, n, avg: n ? Math.round(sales / n) : 0,
      change: o.status === 'ACTIVE' ? pctChange(sales, sameTimeLastWeek(d.history, [o])) : null,
      occupied: tables.filter((t) => t.status === 'OCCUPIED').length, tables: tables.length,
      low: d.inventory.filter((i) => i.stock[o.id] < i.reorder).length,
    }
  })
  const max = Math.max(1, ...rows.map((r) => r.sales))
  return (
    <Panel flush className="mt-6" title="Outlets today" description="Open an outlet to see only its numbers across the panel.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[12px] text-ink-500 border-y border-line bg-canvas/60">
              <th scope="col" className="font-medium pl-5 pr-3 py-2.5">Outlet</th>
              <th scope="col" className="font-medium px-3 py-2.5 min-w-56">Sales</th>
              <th scope="col" className="font-medium px-3 py-2.5 text-right">vs last week</th>
              <th scope="col" className="font-medium px-3 py-2.5 text-right">Orders</th>
              <th scope="col" className="font-medium px-3 py-2.5 text-right">Avg. bill</th>
              <th scope="col" className="font-medium px-3 py-2.5 text-right">Tables in use</th>
              <th scope="col" className="font-medium pl-3 pr-5 py-2.5 text-right">Low stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ o, sales, n, avg, change, occupied, tables, low }) => (
              <tr key={o.id} tabIndex={0} onClick={() => d.setOutletId(o.id)} onKeyDown={(e) => e.key === 'Enter' && d.setOutletId(o.id)} className="cursor-pointer hover:bg-canvas/70">
                <td className="pl-5 pr-3 py-3">
                  <div className="font-semibold">{o.name}</div>
                  <div className="text-[12px] text-ink-500">{o.status === 'ACTIVE' ? o.city : <span className="text-danger-600">Suspended</span>}</div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-canvas"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(sales / max) * 100}%` }} /></div>
                    <span className="tabular font-semibold w-20 text-right">{formatINR(sales)}</span>
                  </div>
                </td>
                <td className={clsx('px-3 py-3 text-right tabular', change === null ? 'text-ink-400' : change >= 0 ? 'text-ok-600' : 'text-brand-700')}>{change === null ? '—' : `${change >= 0 ? '+' : ''}${change}%`}</td>
                <td className="px-3 py-3 text-right tabular">{n}</td>
                <td className="px-3 py-3 text-right tabular">{avg ? formatINR(avg) : '—'}</td>
                <td className="px-3 py-3 text-right tabular">{o.status === 'ACTIVE' ? `${occupied} of ${tables}` : '—'}</td>
                <td className={clsx('pl-3 pr-5 py-3 text-right tabular', low && o.status === 'ACTIVE' ? 'text-brand-700 font-semibold' : 'text-ink-500')}>{o.status === 'ACTIVE' ? low : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function RecentActivity() {
  const d = useOwnerData()
  const { can } = useAuth()
  const events = d.scoped(d.audit).slice(0, 6)
  return (
    <Panel title="Recent activity" description="Staff, chef app and owner changes">
      <ol className="relative mt-1 space-y-4 before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-px before:bg-line">
        {events.map((e) => (
          <li key={e.id} className="relative flex gap-3">
            <Avatar name={e.actor} size="sm" className="relative z-10 ring-4 ring-surface" />
            <div className="min-w-0 text-[13px]">
              <p><span className="font-semibold">{e.actor.replace(/ \(.*\)$/, '')}</span> {e.action.charAt(0).toLowerCase() + e.action.slice(1)}</p>
              <p className="text-ink-500 truncate">{e.target}</p>
              <p className="text-ink-400 text-[12px] mt-0.5 flex flex-wrap items-center gap-1.5">{timeAgo(e.at)}, {e.source} <OutletTag id={e.outletId} /></p>
            </div>
          </li>
        ))}
      </ol>
      {can(F.AUDIT) && (
        <Link to="/owner/audit-log" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-600">
          Open audit logs <ArrowUpRight className="size-4" />
        </Link>
      )}
    </Panel>
  )
}
