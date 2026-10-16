import { Route, Routes, useNavigate } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import RequirePermission from '../../components/guards/RequirePermission'
import ModulePlaceholder from '../admin/pages/ModulePlaceholder'
import { ownerModules, ownerNav } from './nav'
import { OwnerDataProvider, useOwnerData } from './data/OwnerDataContext'
import OutletSwitcher from './components/OutletSwitcher'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Tables from './pages/Tables'
import Menu from './pages/Menu'
import Inventory from './pages/Inventory'
import Staff from './pages/Staff'
import Access from './pages/Access'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import Approvals from './pages/Approvals'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Settings from './pages/Settings'
import AuditLog from './pages/AuditLog'

const pages = {
  '/owner': Dashboard,
  '/owner/orders': Orders,
  '/owner/tables': Tables,
  '/owner/menu': Menu,
  '/owner/inventory': Inventory,
  '/owner/staff': Staff,
  '/owner/access': Access,
  '/owner/customers': Customers,
  '/owner/expenses': Expenses,
  '/owner/approvals': Approvals,
  '/owner/reports': Reports,
  '/owner/notifications': Notifications,
  '/owner/settings': Settings,
  '/owner/audit-log': AuditLog,
}

export default function OwnerPanel() {
  return (
    <OwnerDataProvider>
      <OwnerRoutes />
    </OwnerDataProvider>
  )
}

function OwnerRoutes() {
  const navigate = useNavigate()
  const { restaurant, isFranchise, outlet, pendingApprovals, pendingExpenses, unread, bookingRequests } = useOwnerData()
  const badges = { '/owner/approvals': pendingApprovals, '/owner/expenses': pendingExpenses, '/owner/notifications': unread, '/owner/tables': bookingRequests }
  const nav = ownerNav.map((s) => ({ ...s, items: s.items.map((i) => (badges[i.to] ? { ...i, badge: badges[i.to] } : i)) }))

  const banner = outlet?.status === 'SUSPENDED' && (
    <div role="alert" className="flex items-start gap-3 bg-danger-50 text-danger-600 border-b border-danger-600/20 px-4 lg:px-8 py-3 text-sm">
      <CircleAlert className="size-5 shrink-0 mt-px" aria-hidden />
      <p className="min-w-0"><span className="font-semibold">{outlet.name} is suspended.</span> {outlet.suspendedNote.replace(/^Suspended by Dime Quest: /, '')}</p>
    </div>
  )

  return (
    <Routes>
      <Route
        element={
          <AppShell
            nav={nav}
            panelName={restaurant.name}
            unread={unread}
            onBell={() => navigate('/owner/notifications')}
            searchPlaceholder="Search orders, items, staff"
            topbarSlot={isFranchise ? <OutletSwitcher /> : null}
            banner={banner}
          />
        }
      >
        {ownerModules.map(({ to, label, feature }) => {
          const Page = pages[to]
          const path = to.replace(/^\/owner\/?/, '')
          const element = (
            <RequirePermission feature={feature}>
              {Page ? <Page /> : <ModulePlaceholder title={label} />}
            </RequirePermission>
          )
          return path ? <Route key={to} path={path} element={element} /> : <Route key={to} index element={element} />
        })}
      </Route>
    </Routes>
  )
}
