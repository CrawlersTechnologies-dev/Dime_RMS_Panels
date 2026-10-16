import { Route, Routes } from 'react-router-dom'
import AppShell from '../../components/layout/AppShell'
import RequirePermission from '../../components/guards/RequirePermission'
import { adminModules, adminNav } from './nav'
import { AdminDataProvider, useAdminData } from './data/AdminDataContext'
import Dashboard from './pages/Dashboard'
import Approvals from './pages/Approvals'
import Restaurants from './pages/Restaurants'
import Franchises from './pages/Franchises'
import Users from './pages/Users'
import Roles from './pages/Roles'
import Plans from './pages/Plans'
import Referrals from './pages/Referrals'
import PaymentsTax from './pages/PaymentsTax'
import Integrations from './pages/Integrations'
import Notifications from './pages/Notifications'
import SupportBot from './pages/SupportBot'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'
import ModulePlaceholder from './pages/ModulePlaceholder'

/** Page component per route. Anything not listed renders the placeholder. */
const pages = {
  '/admin': Dashboard,
  '/admin/approvals': Approvals,
  '/admin/restaurants': Restaurants,
  '/admin/franchises': Franchises,
  '/admin/users': Users,
  '/admin/roles': Roles,
  '/admin/plans': Plans,
  '/admin/referrals': Referrals,
  '/admin/payments-tax': PaymentsTax,
  '/admin/integrations': Integrations,
  '/admin/notifications': Notifications,
  '/admin/support-bot': SupportBot,
  '/admin/audit-log': AuditLog,
  '/admin/settings': Settings,
}

export default function AdminPanel() {
  return (
    <AdminDataProvider>
      <AdminRoutes />
    </AdminDataProvider>
  )
}

function AdminRoutes() {
  const { registrations } = useAdminData()
  const waiting = registrations.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length

  // Live counts on nav items.
  const nav = adminNav.map((s) => ({
    ...s,
    items: s.items.map((i) => (i.to === '/admin/approvals' ? { ...i, badge: waiting } : i)),
  }))

  return (
    <Routes>
      <Route element={<AppShell nav={nav} panelName="Global Admin" unread={3} searchPlaceholder="Search restaurants, owners, sales people" />}>
        {adminModules.map(({ to, label, feature }) => {
          const Page = pages[to]
          const path = to.replace(/^\/admin\/?/, '')
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
