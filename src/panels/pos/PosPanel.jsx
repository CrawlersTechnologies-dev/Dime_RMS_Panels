import { Route, Routes } from 'react-router-dom'
import { Bike, ClipboardList, Gauge, ChartColumn, MonitorSmartphone, ReceiptText, RefreshCw, Settings as SettingsIcon, Store, Wallet } from 'lucide-react'
import clsx from 'clsx'
import AppShell from '../../components/layout/AppShell'
import RequirePermission from '../../components/guards/RequirePermission'
import { FEATURES } from '../../config/permissions'
import { PosDataProvider, usePos } from './data/PosDataContext'
import Billing from './pages/Billing'
import LiveView from './pages/LiveView'
import Orders from './pages/Orders'
import OnlineOrders from './pages/OnlineOrders'
import Operations from './pages/Operations'
import CheckUpdate from './pages/CheckUpdate'
import Reports from './pages/Reports'
import DayEnd from './pages/DayEnd'
import Settings from './pages/Settings'

const F = FEATURES.pos
const NAV = [
  {
    label: 'Counter',
    items: [
      { to: '/pos', end: true, label: 'Billing', icon: ReceiptText, feature: F.BILLING, page: Billing },
      { to: '/pos/live-view', label: 'Live view', icon: MonitorSmartphone, feature: F.LIVE_VIEW, page: LiveView },
      { to: '/pos/orders', label: 'Orders', icon: ClipboardList, feature: F.ORDERS, page: Orders },
      { to: '/pos/online-orders', label: 'Online orders', icon: Bike, feature: F.ONLINE_ORDERS, page: OnlineOrders },
    ],
  },
  {
    label: 'Shift',
    items: [
      { to: '/pos/operations', label: 'Operations', icon: Wallet, feature: F.OPERATIONS, page: Operations },
      { to: '/pos/reports', label: 'Reports', icon: ChartColumn, feature: F.REPORTS, page: Reports },
      { to: '/pos/check-update', label: 'Check update', icon: RefreshCw, feature: F.CHECK_UPDATE, page: CheckUpdate },
      { to: '/pos/day-end', label: 'Day end', icon: Gauge, feature: F.DAY_END, page: DayEnd },
    ],
  },
  { label: 'Setup', items: [{ to: '/pos/settings', label: 'Settings', icon: SettingsIcon, feature: F.SETTINGS, page: Settings }] },
]

export default function PosPanel() {
  return (
    <PosDataProvider>
      <PosRoutes />
    </PosDataProvider>
  )
}

function PosRoutes() {
  const pos = usePos()
  const answered = pos.myRequests.filter((a) => a.status !== 'PENDING' && Date.now() - new Date(a.decidedAt) < 6 * 3600_000).length
  const badges = { '/pos/online-orders': pos.incoming.length, '/pos/live-view': pos.running.filter((o) => o.status === 'READY').length, '/pos/check-update': answered }
  const nav = NAV.map((s) => ({ ...s, items: s.items.map((i) => (badges[i.to] ? { ...i, badge: badges[i.to] } : i)) }))

  const slot = (
    <span className="flex items-center gap-2 h-10 pl-3 pr-3.5 rounded-full border border-line-strong bg-surface text-sm max-w-[15rem]">
      <Store className="size-4 text-brand-600 shrink-0" aria-hidden />
      <span className="font-semibold truncate">{pos.outlet.name}</span>
      <span className={clsx('size-2 rounded-full shrink-0', pos.dayClosed ? 'bg-ink-300' : 'bg-ok-600')} aria-hidden />
      <span className="text-ink-500 whitespace-nowrap max-sm:sr-only">{pos.dayClosed ? 'Day closed' : 'Day open'}</span>
    </span>
  )

  return (
    <Routes>
      <Route element={<AppShell nav={nav} panelName={`${pos.restaurant.name}, ${pos.role.toLowerCase()}`} topbarSlot={slot} searchPlaceholder="Search orders or tables" />}>
        {NAV.flatMap((s) => s.items).map(({ to, feature, page: Page }) => {
          const path = to.replace(/^\/pos\/?/, '')
          const element = <RequirePermission feature={feature}><Page /></RequirePermission>
          return path ? <Route key={to} path={path} element={element} /> : <Route key={to} index element={element} />
        })}
      </Route>
    </Routes>
  )
}
