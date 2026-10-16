import { FEATURE_GROUPS } from './permissions'

const allOf = (group) => Object.keys(FEATURE_GROUPS.find((g) => g.id === group).features)

const STARTER = [
  'owner.dashboard', 'owner.orders', 'owner.menu', 'owner.tables', 'owner.staff', 'owner.reports', 'owner.notifications', 'owner.settings',
  'pos.billing', 'pos.orders', 'pos.live_view', 'pos.day_end',
  'chef.orders', 'chef.order_status', 'chef.alerts',
]
const GROWTH = [
  ...STARTER,
  'owner.inventory', 'owner.expenses', 'owner.approvals', 'owner.access',
  'pos.online_orders', 'pos.operations', 'pos.reports', 'pos.check_update',
  'chef.menu', 'chef.inventory',
]

/** Starting feature list per plan id. The Global Admin edits these under Plans. */
export const PLAN_FEATURES = {
  starter: STARTER,
  growth: GROWTH,
  enterprise: [...allOf('owner'), ...allOf('pos'), ...allOf('chef')],
}

export const PLAN_NAMES = { starter: 'Starter', growth: 'Growth', enterprise: 'Enterprise' }

/** Shown to owners choosing a plan at registration. Admin › Plans is the source of truth once the API exists. */
export const PLAN_OFFERS = [
  { id: 'starter', name: 'Starter', monthly: 1499, outletLimit: 1, staffLimit: 5, pitch: 'Billing, menu, tables and daily reports for one outlet.' },
  { id: 'growth', name: 'Growth', monthly: 3999, outletLimit: 3, staffLimit: 20, pitch: 'Adds inventory, expenses, approvals, staff access and Swiggy/Zomato orders.' },
  { id: 'enterprise', name: 'Enterprise', monthly: 9999, outletLimit: null, staffLimit: null, pitch: 'Everything, for franchises with any number of outlets.' },
]
