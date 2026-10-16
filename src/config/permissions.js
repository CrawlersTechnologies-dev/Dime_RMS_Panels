/**
 * Roles and feature access.
 *
 * Mirrors the backend `Role` TextChoices. Access cascades top-down:
 *   plan features (set by Global Admin)
 *     ∩ ( role defaults ∪ extras granted by the owner )
 *     → effective permissions, scoped to the user's outlet(s).
 *
 * In production the backend should return `effectivePermissions` on login;
 * `resolvePermissions` below is the same rule, used for the UI and mocks.
 */

export const ROLES = {
  GLOBAL_ADMIN: 'GLOBAL_ADMIN',
  OWNER_ADMIN: 'OWNER_ADMIN',
  OWNER_PARTNER: 'OWNER_PARTNER',
  RMS_STAFF: 'RMS_STAFF',
  CUSTOMER: 'CUSTOMER',
  SALES_PERSON: 'SALES_PERSON',
}

export const ROLE_LABELS = {
  GLOBAL_ADMIN: 'Global Admin',
  OWNER_ADMIN: 'Restaurant Owner',
  OWNER_PARTNER: 'Owner Partner',
  RMS_STAFF: 'RMS Staff',
  CUSTOMER: 'Customer',
  SALES_PERSON: 'Sales Person',
}

/** Display label for any user: staff show their staff type. */
export const userRoleLabel = (u) => (u?.staffType ? { MANAGER: 'Manager', BILLER: 'Biller', CHEF: 'Chef' }[u.staffType] : ROLE_LABELS[u?.role])

/** Staff sub-types inside RMS_STAFF. Chef uses the Flutter app. */
export const STAFF_TYPES = { MANAGER: 'MANAGER', BILLER: 'BILLER', CHEF: 'CHEF' }

/** Feature keys, grouped by panel. Keys are what nav items and guards check. */
export const FEATURES = {
  admin: {
    DASHBOARD: 'admin.dashboard',
    RMS: 'admin.rms',
    FRANCHISE: 'admin.franchise',
    USERS: 'admin.users',
    ROLES: 'admin.roles',
    PLANS: 'admin.plans',
    THIRD_PARTY: 'admin.third_party',
    APPROVALS: 'admin.approvals',
    REFERRALS: 'admin.referrals',
    NOTIFICATIONS: 'admin.notifications',
    AUDIT: 'admin.audit',
    SETTINGS: 'admin.settings',
    PAYMENTS_TAX: 'admin.payments_tax',
    SUPPORT_BOT: 'admin.support_bot',
  },
  owner: {
    DASHBOARD: 'owner.dashboard',
    ORDERS: 'owner.orders',
    MENU: 'owner.menu',
    INVENTORY: 'owner.inventory',
    STAFF: 'owner.staff',
    TABLES: 'owner.tables',
    CUSTOMERS: 'owner.customers',
    EXPENSES: 'owner.expenses',
    REPORTS: 'owner.reports',
    APPROVALS: 'owner.approvals',
    NOTIFICATIONS: 'owner.notifications',
    SETTINGS: 'owner.settings',
    AUDIT: 'owner.audit',
    ACCESS: 'owner.access',
  },
  pos: {
    BILLING: 'pos.billing',
    OPERATIONS: 'pos.operations',
    LIVE_VIEW: 'pos.live_view',
    REPORTS: 'pos.reports',
    CHECK_UPDATE: 'pos.check_update',
    DAY_END: 'pos.day_end',
    SETTINGS: 'pos.settings',
    ORDERS: 'pos.orders',
    ONLINE_ORDERS: 'pos.online_orders',
  },
  chef: {
    ORDERS: 'chef.orders',
    ORDER_STATUS: 'chef.order_status',
    ALERTS: 'chef.alerts',
    MENU: 'chef.menu',
    INVENTORY: 'chef.inventory',
  },
  sales: {
    DASHBOARD: 'sales.dashboard',
    REFERRALS: 'sales.referrals',
    INCENTIVES: 'sales.incentives',
    PROFILE: 'sales.profile',
  },
}

/** Display names for every feature key, grouped the way Plans and Roles screens show them. */
export const FEATURE_GROUPS = [
  {
    id: 'owner', label: 'Owner panel', features: {
      'owner.dashboard': 'Dashboard', 'owner.orders': 'Orders', 'owner.menu': 'Menu management', 'owner.inventory': 'Inventory',
      'owner.staff': 'Staff management', 'owner.tables': 'Tables and floor', 'owner.customers': 'Customers', 'owner.expenses': 'Expenses',
      'owner.reports': 'Reports and analytics', 'owner.approvals': 'Approvals', 'owner.notifications': 'Notifications',
      'owner.settings': 'Settings', 'owner.audit': 'Audit logs', 'owner.access': 'Access management',
    },
  },
  {
    id: 'pos', label: 'Manager and biller panel', features: {
      'pos.billing': 'Billing', 'pos.orders': 'Orders', 'pos.online_orders': 'Online orders', 'pos.live_view': 'Live view',
      'pos.operations': 'Operations', 'pos.reports': 'Reports', 'pos.check_update': 'Check update', 'pos.day_end': 'Day end',
      'pos.settings': 'Settings',
    },
  },
  {
    id: 'chef', label: 'Chef app', features: {
      'chef.orders': 'Receive orders', 'chef.order_status': 'Update order status', 'chef.alerts': 'Alerts',
      'chef.menu': 'Menu and timings', 'chef.inventory': 'Inventory updates',
    },
  },
  {
    id: 'admin', label: 'Global Admin panel', features: {
      'admin.dashboard': 'Dashboard', 'admin.approvals': 'Approvals', 'admin.rms': 'RMS management', 'admin.franchise': 'Franchises',
      'admin.users': 'User management', 'admin.roles': 'Roles and access', 'admin.plans': 'Plans', 'admin.referrals': 'Sales and referrals',
      'admin.payments_tax': 'Payments, tax and GST', 'admin.third_party': 'Third-party integrations', 'admin.notifications': 'Notifications',
      'admin.support_bot': 'Support chatbot', 'admin.audit': 'Audit log', 'admin.settings': 'Settings',
    },
  },
]

export const featureLabel = (key) => {
  for (const g of FEATURE_GROUPS) if (g.features[key]) return g.features[key]
  return key
}

const all = (group) => Object.values(FEATURES[group])
const A = FEATURES.admin

/**
 * What each role, staff type or admin team role gets before any extra grants.
 * These are the starting values; the Global Admin edits them under Roles and access.
 */
export const ROLE_DEFAULTS = {
  SALES_PERSON: all('sales'),
  OWNER_ADMIN: all('owner'),
  OWNER_PARTNER: all('owner').filter((f) => f !== FEATURES.owner.ACCESS),
  MANAGER: [
    FEATURES.pos.BILLING, FEATURES.pos.OPERATIONS, FEATURES.pos.LIVE_VIEW,
    FEATURES.pos.REPORTS, FEATURES.pos.CHECK_UPDATE, FEATURES.pos.DAY_END,
    FEATURES.pos.ORDERS, FEATURES.pos.ONLINE_ORDERS,
  ],
  BILLER: [FEATURES.pos.BILLING, FEATURES.pos.LIVE_VIEW, FEATURES.pos.ORDERS, FEATURES.pos.ONLINE_ORDERS],
  CHEF: all('chef'),
  // Admin team roles (Global Admin panel)
  'Super Admin': all('admin'),
  Operations: [A.DASHBOARD, A.APPROVALS, A.RMS, A.FRANCHISE, A.USERS, A.PLANS, A.NOTIFICATIONS, A.AUDIT],
  Support: [A.DASHBOARD, A.RMS, A.FRANCHISE, A.USERS, A.SUPPORT_BOT],
  Finance: [A.DASHBOARD, A.REFERRALS, A.PAYMENTS_TAX, A.PLANS, A.AUDIT],
}

/** Panels that are not limited by a restaurant's purchased plan. */
const PLAN_EXEMPT = [ROLES.GLOBAL_ADMIN, ROLES.SALES_PERSON]

/** Which ROLE_DEFAULTS key applies to a user. */
export const roleKeyOf = (user) =>
  user.role === ROLES.RMS_STAFF ? user.staffType : user.role === ROLES.GLOBAL_ADMIN ? user.teamRole ?? 'Super Admin' : user.role

/**
 * effective = planFeatures[user.plan] ∩ (roleAccess[roleKey] ∪ user.granted)
 * @param {{role: string, staffType?: string, teamRole?: string, plan?: string, granted?: string[]}} user
 * @param {{planFeatures?: Record<string,string[]>, roleAccess?: Record<string,string[]>}} platform
 * @returns {Set<string>}
 */
export function resolvePermissions(user, { planFeatures = {}, roleAccess = ROLE_DEFAULTS } = {}) {
  if (!user) return new Set()
  const key = roleKeyOf(user)
  const base = new Set([...(roleAccess[key] ?? ROLE_DEFAULTS[key] ?? []), ...(user.granted ?? [])])
  if (PLAN_EXEMPT.includes(user.role)) return base
  const plan = new Set(planFeatures[user.plan] ?? [])
  return new Set([...base].filter((f) => plan.has(f)))
}

export const can = (perms, feature) => !feature || perms.has(feature)
