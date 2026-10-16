import {
  LayoutDashboard, Store, Network, ClipboardCheck, Users, ShieldCheck, Gift, Layers,
  Plug, Landmark, Bell, Bot, ScrollText, Settings,
} from 'lucide-react'
import { FEATURES } from '../../config/permissions'

const F = FEATURES.admin

/**
 * Global Admin navigation. `slug` doubles as the route path.
 * Add `badge` at render time for live counts (see AdminPanel).
 */
export const adminNav = [
  {
    label: 'Overview',
    items: [{ to: '/admin', end: true, label: 'Dashboard', icon: LayoutDashboard, feature: F.DASHBOARD }],
  },
  {
    label: 'Restaurants',
    items: [
      { to: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck, feature: F.APPROVALS },
      { to: '/admin/restaurants', label: 'RMS management', icon: Store, feature: F.RMS },
      { to: '/admin/franchises', label: 'Franchises', icon: Network, feature: F.FRANCHISE },
    ],
  },
  {
    label: 'People and access',
    items: [
      { to: '/admin/users', label: 'User management', icon: Users, feature: F.USERS },
      { to: '/admin/roles', label: 'Roles and access', icon: ShieldCheck, feature: F.ROLES },
      { to: '/admin/plans', label: 'Plans', icon: Layers, feature: F.PLANS },
      { to: '/admin/referrals', label: 'Sales and referrals', icon: Gift, feature: F.REFERRALS },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/admin/payments-tax', label: 'Payments, tax and GST', icon: Landmark, feature: F.PAYMENTS_TAX },
      { to: '/admin/integrations', label: 'Third-party integrations', icon: Plug, feature: F.THIRD_PARTY },
      { to: '/admin/notifications', label: 'Notifications', icon: Bell, feature: F.NOTIFICATIONS },
      { to: '/admin/support-bot', label: 'Support chatbot', icon: Bot, feature: F.SUPPORT_BOT },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/audit-log', label: 'Audit log', icon: ScrollText, feature: F.AUDIT },
      { to: '/admin/settings', label: 'Settings', icon: Settings, feature: F.SETTINGS },
    ],
  },
]

/** Flat list used to generate routes for modules that are still placeholders. */
export const adminModules = adminNav.flatMap((s) => s.items)
