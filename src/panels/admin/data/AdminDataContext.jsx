import { createContext, useCallback, useContext, useState } from 'react'
import { PLAN_FEATURES } from '../../../config/plans'
import { usePlatform } from '../../../context/PlatformContext'
import { useAuth } from '../../../context/AuthContext'
import * as seed from './records'

/**
 * In-memory store for the Global Admin panel while the API is being built.
 * Every action mirrors an endpoint the backend will need (noted on each one),
 * and writes an audit entry the same way the server should.
 */
const Ctx = createContext(null)

const nextId = (prefix) => `${prefix}-${Math.floor(Date.now() / 1000) % 100000}`

export function AdminDataProvider({ children }) {
  const { user } = useAuth()
  // Plan access, registrations, sales people and incentives are shared with other panels (see PlatformContext).
  const {
    planFeatures, setPlanFeatures, roleAccess, setRoleAccess, registrations, setRegistrations,
    salesPeople, salesById, referrals, setIncentiveStatus: setIncentives, incentiveRule, setIncentiveRule,
  } = usePlatform()
  const [restaurants, setRestaurants] = useState(seed.restaurants)
  const [franchises, setFranchises] = useState(seed.franchises)
  const [users, setUsers] = useState(seed.users)
  const [plans, setPlans] = useState(seed.plans)
  const [auditLog, setAuditLog] = useState(seed.auditLog)

  const log = useCallback(
    (module, action, target, changes = {}) =>
      setAuditLog((l) => [{ id: nextId('AL'), at: new Date().toISOString(), actor: user.name, module, action, target, ip: '103.211.18.40', changes }, ...l]),
    [user.name],
  )

  /* Approvals ------------------------------------------------------ */

  // PATCH /registrations/:id { status: 'UNDER_REVIEW' }
  const startReview = (reg) => {
    setRegistrations((rs) => rs.map((r) => (r.id === reg.id ? { ...r, status: 'UNDER_REVIEW' } : r)))
    log('Approvals', 'Started review', `${reg.restaurant} (${reg.id})`, { status: [reg.status, 'UNDER_REVIEW'] })
  }

  // POST /registrations/:id/approve → creates owner account, emails credentials, makes referral eligible
  const approve = (reg) => {
    const now = new Date().toISOString()
    setRegistrations((rs) => rs.map((r) => (r.id === reg.id ? { ...r, status: 'APPROVED', decidedAt: now, decidedBy: user.name } : r)))
    setRestaurants((rs) => [
      { id: nextId('RST'), name: reg.restaurant, owner: reg.owner, city: reg.city, type: reg.type, outlets: reg.outlets, plan: reg.plan, status: 'ACTIVE', renewsOn: new Date(Date.now() + 30 * 86400_000).toISOString(), ordersThisMonth: 0, joinedOn: now.slice(0, 10) },
      ...rs,
    ])
    setUsers((us) => [{ id: nextId('U'), name: reg.owner, email: reg.email, phone: reg.phone, role: 'OWNER_ADMIN', org: reg.restaurant, status: 'INVITED', lastActive: null }, ...us])
    log('Approvals', 'Approved registration', `${reg.restaurant} (${reg.id})`, { status: [reg.status, 'APPROVED'] })
  }

  // POST /registrations/:id/reject { reason }
  const reject = (reg, reason) => {
    setRegistrations((rs) => rs.map((r) => (r.id === reg.id ? { ...r, status: 'REJECTED', rejectionReason: reason, decidedAt: new Date().toISOString(), decidedBy: user.name } : r)))
    log('Approvals', 'Rejected registration', `${reg.restaurant} (${reg.id})`, { status: [reg.status, 'REJECTED'], reason: [null, reason] })
  }

  /* Restaurants and franchises -------------------------------------- */

  // PATCH /restaurants/:id { status, reason? }
  const setRestaurantStatus = (r, status, reason) => {
    setRestaurants((rs) => rs.map((x) => (x.id === r.id ? { ...x, status, suspendReason: reason ?? null } : x)))
    log('RMS', status === 'SUSPENDED' ? 'Suspended restaurant' : 'Reactivated restaurant', r.name, { status: [r.status, status], ...(reason ? { reason: [null, reason] } : {}) })
  }

  // PATCH /restaurants/:id { plan }
  const changeRestaurantPlan = (r, plan) => {
    setRestaurants((rs) => rs.map((x) => (x.id === r.id ? { ...x, plan } : x)))
    log('RMS', 'Changed plan', r.name, { plan: [r.plan, plan] })
  }

  // PATCH /outlets/:id { status }
  const setOutletStatus = (franchise, outlet, status) => {
    setFranchises((fs) => fs.map((f) => (f.id !== franchise.id ? f : { ...f, outlets: f.outlets.map((o) => (o.id === outlet.id ? { ...o, status } : o)) })))
    log('RMS', status === 'SUSPENDED' ? 'Suspended outlet' : 'Reactivated outlet', outlet.name, { status: [outlet.status, status] })
  }

  /* Users and roles ------------------------------------------------- */

  // POST /admin-users/invite
  const inviteAdmin = ({ name, email, phone, teamRole }) => {
    setUsers((us) => [{ id: nextId('U'), name, email, phone, role: 'GLOBAL_ADMIN', teamRole, org: 'Dime Quest', status: 'INVITED', lastActive: null }, ...us])
    log('Users', 'Invited admin user', `${name} (${teamRole})`, { status: [null, 'INVITED'] })
  }

  // PATCH /users/:id { status }
  const setUserStatus = (u, status) => {
    setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, status } : x)))
    log('Users', status === 'SUSPENDED' ? 'Suspended user' : 'Reactivated user', u.name, { status: [u.status, status] })
  }

  // PUT /roles/:role/features
  const saveRoleAccess = (role, features) => {
    const before = new Set(roleAccess[role])
    const after = new Set(features)
    const changes = {}
    for (const f of new Set([...before, ...after])) if (before.has(f) !== after.has(f)) changes[f] = [before.has(f), after.has(f)]
    setRoleAccess((r) => ({ ...r, [role]: features }))
    log('Roles', 'Changed role defaults', role, changes)
  }

  /* Plans ----------------------------------------------------------- */

  // PATCH /plans/:id/features { feature, enabled }
  const togglePlanFeature = (plan, feature, enabled) => {
    setPlanFeatures((pf) => ({ ...pf, [plan.id]: enabled ? [...pf[plan.id], feature] : pf[plan.id].filter((f) => f !== feature) }))
    log('Plans', 'Changed plan features', `${plan.name} plan`, { [feature]: [!enabled, enabled] })
  }

  // PUT /plans/:id  or POST /plans
  const savePlan = (plan) => {
    const exists = plans.some((p) => p.id === plan.id)
    setPlans((ps) => (exists ? ps.map((p) => (p.id === plan.id ? plan : p)) : [...ps, plan]))
    if (!exists) setPlanFeatures((pf) => ({ ...pf, [plan.id]: [...PLAN_FEATURES.starter] }))
    log('Plans', exists ? 'Edited plan' : 'Created plan', `${plan.name} plan`, { monthly: [null, plan.monthly] })
  }

  /* Referrals and incentives ---------------------------------------- */

  // PATCH /incentives { ids, status }
  const setIncentiveStatus = (refs, status) => {
    setIncentives(refs, status)
    const total = refs.reduce((s, r) => s + r.amount, 0)
    log('Referrals', status === 'PAID' ? 'Marked incentives paid' : 'Approved incentives', `${refs.length} referral${refs.length > 1 ? 's' : ''}`, { amount: [null, total] })
  }

  const saveIncentiveRule = (rule) => {
    log('Referrals', 'Changed incentive rule', 'Incentive rule', { perOutlet: [incentiveRule.perOutlet, rule.perOutlet], maxPerReferral: [incentiveRule.maxPerReferral, rule.maxPerReferral] })
    setIncentiveRule(rule)
  }

  const value = {
    registrations, restaurants, franchises, users, plans, planFeatures, roleAccess, referrals, incentiveRule, auditLog,
    salesPeople, salesById,
    startReview, approve, reject, setRestaurantStatus, changeRestaurantPlan, setOutletStatus,
    inviteAdmin, setUserStatus, saveRoleAccess, togglePlanFeature, savePlan, setIncentiveStatus, saveIncentiveRule, log,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAdminData = () => {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAdminData must be used inside <AdminDataProvider>')
  return ctx
}

/** Uploaded vs required documents for a registration. */
export const docProgress = (reg) => ({
  uploaded: reg.docs.filter((d) => d.file).length,
  required: reg.docs.length,
  complete: reg.docs.every((d) => d.file),
})
