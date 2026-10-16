// Dashboard aggregates (would come from a /dashboard/summary endpoint). Records live in records.js.

export const kpis = {
  activeRestaurants: 412,
  activeRestaurantsDelta: 18, // this month
  franchises: 37,
  outlets: 586,
  mrr: 1874500,
  mrrDeltaPct: 6.4,
  pendingApprovals: 9,
  oldestPendingHours: 52,
  incentivesDue: 46500,
  incentivesDueCount: 11,
}

/** Monthly recurring revenue from subscriptions, last 12 months (₹). */
export const mrrTrend = [
  { month: 'Nov', value: 1120000 }, { month: 'Dec', value: 1185000 }, { month: 'Jan', value: 1236000 },
  { month: 'Feb', value: 1298000 }, { month: 'Mar', value: 1342000 }, { month: 'Apr', value: 1405000 },
  { month: 'May', value: 1468000 }, { month: 'Jun', value: 1512000 }, { month: 'Jul', value: 1590000 },
  { month: 'Aug', value: 1655000 }, { month: 'Sep', value: 1761700 }, { month: 'Oct', value: 1874500 },
]

/** Active subscriptions by plan. */
export const planMix = [
  { plan: 'Starter', restaurants: 168, price: 1499 },
  { plan: 'Growth', restaurants: 197, price: 3999 },
  { plan: 'Enterprise', restaurants: 47, price: 9999 },
]

/** Sales person leaderboard: referral → approval funnel and incentive state. */
export const salesLeaders = [
  { name: 'Sneha Kulkarni', code: 'DQ-SNEHA24', referred: 31, approved: 26, incentive: 'ELIGIBLE', amount: 13000 },
  { name: 'Irfan Shaikh', code: 'DQ-IRFAN09', referred: 24, approved: 19, incentive: 'PAID', amount: 9500 },
  { name: 'Vikram Joshi', code: 'DQ-VIKRAM11', referred: 18, approved: 15, incentive: 'ELIGIBLE', amount: 7500 },
  { name: 'Ayesha Nadaf', code: 'DQ-AYESHA03', referred: 12, approved: 8, incentive: 'PENDING', amount: 4000 },
]
