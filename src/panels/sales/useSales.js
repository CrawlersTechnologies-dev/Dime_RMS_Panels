import { useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePlatform } from '../../context/PlatformContext'

/** Where an incentive is in its life, in the order a sales person experiences it. */
export const STAGE = {
  WAITING: { label: 'Owner not approved yet', tone: 'neutral' },
  REJECTED: { label: 'Not approved', tone: 'danger' },
  CHECKING: { label: 'Earned, being checked', tone: 'warn' },
  IN_PAYOUT: { label: 'In next payout', tone: 'info' },
  PAID: { label: 'Paid', tone: 'ok' },
}

export const stageOf = (r) =>
  r.registration === 'REJECTED' ? 'REJECTED'
    : r.registration !== 'APPROVED' ? 'WAITING'
      : r.incentive === 'PAID' ? 'PAID'
        : r.incentive === 'APPROVED' ? 'IN_PAYOUT'
          : 'CHECKING'

/** Next payout date: the payout day this month if it hasn't passed, else next month. */
export function nextPayoutDate(day, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), day)
  if (d <= now) d.setMonth(d.getMonth() + 1)
  return d
}

/** Link owners open to register with the code already filled in. */
export function inviteLink(code) {
  const hash = import.meta.env.VITE_ROUTER === 'hash'
  const base = `${window.location.origin}${hash ? window.location.pathname : ''}`
  return hash ? `${base}#/register?ref=${code}` : `${base}/register?ref=${code}`
}

/** The signed-in sales person, their referrals and earnings. */
export function useSales() {
  const { user } = useAuth()
  const { salesById, referrals, incentiveRule, updateSalesPerson } = usePlatform()
  const me = salesById[user.salesPersonId]
  return useMemo(() => {
    const mine = referrals.filter((r) => r.salesPersonId === me.id).map((r) => ({ ...r, stage: stageOf(r) }))
    const sum = (stages) => mine.filter((r) => stages.includes(r.stage)).reduce((s, r) => s + r.amount, 0)
    const payoutOn = nextPayoutDate(incentiveRule.payoutDay)
    return {
      me, mine, rule: incentiveRule, payoutOn,
      totals: {
        referred: mine.length,
        approved: mine.filter((r) => r.registration === 'APPROVED').length,
        waiting: mine.filter((r) => r.stage === 'WAITING').length,
        paid: sum(['PAID']),
        inPayout: sum(['IN_PAYOUT']),
        checking: sum(['CHECKING']),
        earned: sum(['PAID', 'IN_PAYOUT', 'CHECKING']),
      },
      update: (patch) => updateSalesPerson(me.id, patch),
    }
  }, [me, referrals, incentiveRule, updateSalesPerson])
}
