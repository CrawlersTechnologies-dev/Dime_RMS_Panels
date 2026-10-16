import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { ROLE_DEFAULTS } from '../config/permissions'
import { PLAN_FEATURES } from '../config/plans'
import * as seed from '../panels/admin/data/records'
import { buildSeed } from '../panels/owner/data/seed'

/**
 * Platform-wide state that more than one panel reads. In production each piece is an API:
 *   planFeatures   plan id → feature keys            GET /platform/access     (Admin › Plans)
 *   roleAccess     role key → default feature keys   GET /platform/access     (Admin › Roles and access)
 *   registrations  owner self-registrations          /registrations           (Register → Admin › Approvals)
 *   salesPeople    self-registered sales people      /sales-people            (Sales signup → Admin, Sales panel)
 *   incentives     incentive status per referral     /incentives              (Admin › Sales and referrals → Sales panel)
 *   accounts       sign-in accounts created here     /auth                    (Sales signup)
 *   restaurant db  one restaurant's orders, menu,    /restaurants/:id/…       (Owner panel ⇄ Manager/Biller panel)
 *                  tables, stock, staff, approvals…
 *                  Built lazily per restaurant; both the owner and the biller read and write it.
 * Keeping them here means an approval or payout in the admin panel shows up in the
 * owner's or sales person's panel straight away, the way it will with the real API.
 */
const PlatformContext = createContext(null)

const daysAfter = (iso, d) => new Date(new Date(iso).getTime() + d * 86400_000).toISOString()

export function PlatformProvider({ children }) {
  const [planFeatures, setPlanFeatures] = useState(PLAN_FEATURES)
  const [roleAccess, setRoleAccess] = useState(ROLE_DEFAULTS)
  const [registrations, setRegistrations] = useState(seed.registrations)
  const [salesPeople, setSalesPeople] = useState(seed.salesPeople)
  const [incentiveRule, setIncentiveRule] = useState(seed.incentiveRule)
  const [incentiveState, setIncentiveState] = useState({}) // regId → { status, approvedAt?, paidAt?, utr? }
  const [pastReferrals, setPastReferrals] = useState(() =>
    seed.pastReferrals.map((p) => ({
      ...p,
      approvedAt: p.incentive !== 'PENDING' ? daysAfter(p.at, 20) : null,
      paidAt: p.incentive === 'PAID' ? daysAfter(p.at, 36) : null,
      utr: p.incentive === 'PAID' ? `CFP2${String(p.id).replace(/\D/g, '')}${p.amount}` : null,
    })),
  )
  const [accounts, setAccounts] = useState([])

  // Restaurant data, keyed by restaurant id. Seeded on first use.
  const [dbs, setDbs] = useState({})
  const seedCache = useRef({})
  const seeded = (rid) => (seedCache.current[rid] ??= buildSeed(rid))
  const dbFor = useCallback((rid) => dbs[rid] ?? seeded(rid), [dbs])
  /** Apply fn(db) → partial db to one restaurant. */
  const updateDb = useCallback((rid, fn) => setDbs((all) => {
    const cur = all[rid] ?? seeded(rid)
    return { ...all, [rid]: { ...cur, ...fn(cur) } }
  }), [])

  const salesById = useMemo(() => Object.fromEntries(salesPeople.map((s) => [s.id, s])), [salesPeople])

  /** Every referral with its registration and incentive state, newest first. */
  const referrals = useMemo(() => {
    const live = registrations
      .filter((r) => r.referral)
      .map((r) => {
        const approved = r.status === 'APPROVED'
        const inc = incentiveState[r.id]
        return {
          id: `REF-${r.id.slice(4)}`,
          regId: r.id,
          salesPersonId: r.referral.salesPersonId,
          restaurant: r.restaurant,
          owner: r.owner,
          city: r.city,
          outlets: r.outlets,
          plan: r.plan,
          registration: r.status,
          rejectionReason: r.rejectionReason ?? null,
          decidedAt: r.decidedAt ?? null,
          eligibility: approved ? 'ELIGIBLE' : r.status === 'REJECTED' ? 'NOT_ELIGIBLE' : 'AWAITING_APPROVAL',
          incentive: approved ? inc?.status ?? 'PENDING' : null,
          approvedAt: inc?.approvedAt ?? null,
          paidAt: inc?.paidAt ?? null,
          utr: inc?.utr ?? null,
          amount: Math.min(incentiveRule.perOutlet * r.outlets, incentiveRule.maxPerReferral),
          at: r.submittedAt,
        }
      })
    const past = pastReferrals.map((p) => ({ ...p, eligibility: 'ELIGIBLE', registration: 'APPROVED', decidedAt: p.at }))
    return [...live, ...past]
      .map((x) => ({ ...x, salesPerson: salesById[x.salesPersonId] }))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [registrations, incentiveState, pastReferrals, incentiveRule, salesById])

  /** PATCH /incentives { ids, status } — APPROVED or PAID, with timestamps and a payout reference. */
  const setIncentiveStatus = useCallback((refs, status) => {
    const now = new Date().toISOString()
    const utr = `CFP${Date.now().toString().slice(-9)}`
    const stamp = (prev = {}) => ({
      approvedAt: status === 'APPROVED' ? now : prev.approvedAt ?? (status === 'PAID' ? now : null),
      paidAt: status === 'PAID' ? now : prev.paidAt ?? null,
      utr: status === 'PAID' ? utr : prev.utr ?? null,
    })
    const live = refs.filter((r) => r.regId).map((r) => r.regId)
    const past = refs.filter((r) => !r.regId).map((r) => r.id)
    if (live.length) setIncentiveState((s) => ({ ...s, ...Object.fromEntries(live.map((id) => [id, { status, ...stamp(s[id]) }])) }))
    if (past.length) setPastReferrals((ps) => ps.map((p) => (past.includes(p.id) ? { ...p, incentive: status, ...stamp(p) } : p)))
  }, [])

  /** POST /sales-people — self-registration, active straight away. Returns the person with their new code. */
  const addSalesPerson = useCallback((person) => {
    const base = `DQ-${person.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'PARTNER'}`
    let code
    do code = `${base}${10 + Math.floor(Math.random() * 90)}`
    while (salesPeople.some((s) => s.code === code))
    const created = { ...person, id: `SP-${Date.now().toString().slice(-5)}`, code, joinedOn: new Date().toISOString().slice(0, 10), status: 'ACTIVE', payout: null }
    setSalesPeople((list) => [...list, created])
    return created
  }, [salesPeople])

  /** PATCH /sales-people/:id */
  const updateSalesPerson = useCallback((id, patch) => setSalesPeople((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s))), [])

  const value = useMemo(
    () => ({
      planFeatures, setPlanFeatures, roleAccess, setRoleAccess,
      registrations, setRegistrations, submitRegistration: (r) => setRegistrations((rs) => [r, ...rs]),
      salesPeople, salesById, addSalesPerson, updateSalesPerson,
      incentiveRule, setIncentiveRule, referrals, setIncentiveStatus,
      accounts, addAccount: (a) => setAccounts((as) => [...as, a]),
      dbFor, updateDb,
    }),
    [planFeatures, roleAccess, registrations, salesPeople, salesById, addSalesPerson, updateSalesPerson, incentiveRule, referrals, setIncentiveStatus, accounts, dbFor, updateDb],
  )
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}

export const usePlatform = () => {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error('usePlatform must be used inside <PlatformProvider>')
  return ctx
}
