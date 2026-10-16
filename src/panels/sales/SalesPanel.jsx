import { Route, Routes } from 'react-router-dom'
import { Gift, LayoutDashboard, UserRound, Wallet } from 'lucide-react'
import AppShell from '../../components/layout/AppShell'
import RequirePermission from '../../components/guards/RequirePermission'
import { FEATURES } from '../../config/permissions'
import { useSales } from './useSales'
import Dashboard from './pages/Dashboard'
import Referrals from './pages/Referrals'
import Earnings from './pages/Earnings'
import Profile from './pages/Profile'

const F = FEATURES.sales
const modules = [
  { to: '/sales', end: true, label: 'Dashboard', icon: LayoutDashboard, feature: F.DASHBOARD, page: Dashboard },
  { to: '/sales/referrals', label: 'My referrals', icon: Gift, feature: F.REFERRALS, page: Referrals },
  { to: '/sales/earnings', label: 'Earnings', icon: Wallet, feature: F.INCENTIVES, page: Earnings },
  { to: '/sales/profile', label: 'Profile and payout', icon: UserRound, feature: F.PROFILE, page: Profile },
]

export default function SalesPanel() {
  const { me, totals } = useSales()
  const nav = [{
    label: 'Sales partner',
    items: modules.map((m) => ({ ...m, badge: m.to === '/sales/profile' && !me.payout ? '!' : m.to === '/sales/referrals' && totals.waiting ? totals.waiting : undefined })),
  }]
  return (
    <Routes>
      <Route element={<AppShell nav={nav} panelName="Sales partner" searchPlaceholder="Search your referrals" />}>
        {modules.map(({ to, feature, page: Page }) => {
          const path = to.replace(/^\/sales\/?/, '')
          const element = <RequirePermission feature={feature}><Page /></RequirePermission>
          return path ? <Route key={to} path={path} element={element} /> : <Route key={to} index element={element} />
        })}
      </Route>
    </Routes>
  )
}
