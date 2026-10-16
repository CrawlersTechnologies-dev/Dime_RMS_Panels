import {
  LayoutDashboard, ReceiptText, Armchair, UtensilsCrossed, Package, Users, KeyRound, Contact,
  Wallet, ClipboardCheck, ChartColumn, Bell, Settings, ScrollText,
} from 'lucide-react'
import { FEATURES } from '../../config/permissions'

const F = FEATURES.owner

/** Owner panel navigation. Items the plan or role doesn't include are hidden by the sidebar. */
export const ownerNav = [
  {
    label: 'Overview',
    items: [{ to: '/owner', end: true, label: 'Dashboard', icon: LayoutDashboard, feature: F.DASHBOARD }],
  },
  {
    label: 'Daily operations',
    items: [
      { to: '/owner/orders', label: 'Orders', icon: ReceiptText, feature: F.ORDERS },
      { to: '/owner/tables', label: 'Tables and floor', icon: Armchair, feature: F.TABLES },
      { to: '/owner/menu', label: 'Menu', icon: UtensilsCrossed, feature: F.MENU },
      { to: '/owner/inventory', label: 'Inventory', icon: Package, feature: F.INVENTORY },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/owner/staff', label: 'Staff', icon: Users, feature: F.STAFF },
      { to: '/owner/access', label: 'Access management', icon: KeyRound, feature: F.ACCESS },
      { to: '/owner/customers', label: 'Customers', icon: Contact, feature: F.CUSTOMERS },
    ],
  },
  {
    label: 'Money',
    items: [
      { to: '/owner/expenses', label: 'Expenses', icon: Wallet, feature: F.EXPENSES },
      { to: '/owner/approvals', label: 'Approvals', icon: ClipboardCheck, feature: F.APPROVALS },
      { to: '/owner/reports', label: 'Reports', icon: ChartColumn, feature: F.REPORTS },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/owner/notifications', label: 'Notifications', icon: Bell, feature: F.NOTIFICATIONS },
      { to: '/owner/settings', label: 'Settings', icon: Settings, feature: F.SETTINGS },
      { to: '/owner/audit-log', label: 'Audit logs', icon: ScrollText, feature: F.AUDIT },
    ],
  },
]

export const ownerModules = ownerNav.flatMap((s) => s.items)
