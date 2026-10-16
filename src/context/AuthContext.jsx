import { createContext, useContext, useMemo, useState } from 'react'
import { ROLES, resolvePermissions, can } from '../config/permissions'
import { usePlatform } from './PlatformContext'

const AuthContext = createContext(null)

/**
 * Demo accounts until the login API is wired up. The real login should return the
 * same shape: role, plan (for restaurant users), restaurantId and the outlets they can see.
 */
export const DEMO_ACCOUNTS = [
  {
    id: 'U-001', name: 'Ankit Desai', email: 'admin@dimequest.in', role: ROLES.GLOBAL_ADMIN, teamRole: 'Super Admin',
    home: '/admin', blurb: 'Runs the platform: approvals, plans, referrals',
  },
  {
    id: 'U-011', name: 'Gururaj Kulkarni', email: 'gururaj@annapurna.in', role: ROLES.OWNER_ADMIN, plan: 'enterprise',
    restaurantId: 'RST-0398', home: '/owner', blurb: 'Hotel Annapurna, franchise with 5 outlets, Enterprise plan',
  },
  {
    id: 'U-012', name: 'Sunita Kulkarni', email: 'sunita@annapurna.in', role: ROLES.OWNER_PARTNER, plan: 'enterprise',
    restaurantId: 'RST-0398', home: '/owner', blurb: 'Partner at Hotel Annapurna. Everything except access management',
  },
  {
    id: 'U-024', name: 'Basavaraj Angadi', email: 'basavaraj@khanavali.in', role: ROLES.OWNER_ADMIN, plan: 'starter',
    restaurantId: 'RST-0377', home: '/owner', blurb: 'Basavaraj Khanavali, single outlet, Starter plan',
  },
  {
    id: 'U-013', name: 'Raghu N', email: 'raghu@annapurna.in', role: ROLES.RMS_STAFF, staffType: 'MANAGER', plan: 'enterprise',
    restaurantId: 'RST-0398', outletId: 'OUT-1', staffId: 'STF-GKR-1', home: '/pos', blurb: 'Manager, Hotel Annapurna Gokul Road',
  },
  {
    id: 'U-014', name: 'Lata S', email: 'lata@annapurna.in', role: ROLES.RMS_STAFF, staffType: 'BILLER', plan: 'enterprise',
    restaurantId: 'RST-0398', outletId: 'OUT-1', staffId: 'STF-GKR-2', home: '/pos', blurb: 'Biller, Hotel Annapurna Gokul Road',
  },
  {
    id: 'U-031', name: 'Sneha Kulkarni', email: 'sneha.k@gmail.com', role: ROLES.SALES_PERSON, salesPersonId: 'SP-01',
    home: '/sales', blurb: 'Sales partner in Hubballi, referral code DQ-SNEHA24',
  },
]

const STORAGE_KEY = 'dq.session'
const readSession = () => {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}
const writeSession = (id) => {
  try { id ? localStorage.setItem(STORAGE_KEY, id) : localStorage.removeItem(STORAGE_KEY) } catch { /* storage unavailable */ }
}

export function AuthProvider({ children }) {
  const { planFeatures, roleAccess, accounts, dbFor } = usePlatform()
  const [userId, setUserId] = useState(() => readSession())
  // Accounts created in this session (sales signups) sign in the same way as the demo ones.
  const account = [...DEMO_ACCOUNTS, ...accounts].find((a) => a.id === userId) ?? null
  // Staff: extra features and active status come from the owner's staff record (Owner › Access management).
  const staff = account?.staffId ? dbFor(account.restaurantId).staff.find((s) => s.id === account.staffId) : null
  const user = useMemo(() => (!account ? null : staff ? (staff.status === 'ACTIVE' ? { ...account, granted: staff.granted } : null) : account), [account, staff])

  const value = useMemo(() => {
    const permissions = resolvePermissions(user, { planFeatures, roleAccess })
    return {
      user,
      permissions,
      can: (feature) => can(permissions, feature),
      login: (id) => { writeSession(id); setUserId(id) },
      logout: () => { writeSession(null); setUserId(null) },
    }
  }, [user, planFeatures, roleAccess])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
