const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
const num = new Intl.NumberFormat('en-IN')

export const formatINR = (v) => inr.format(v)
/** ₹4.2L style — Indian compact notation */
export const formatINRCompact = (v) => '₹' + compact.format(v).replace('T', 'K')
export const formatNumber = (v) => num.format(v)

const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
/** 12 Oct 2026 */
export const formatDate = (d) => dateFmt.format(new Date(d))
/** 12 Oct, 2:05 pm */
export const formatDateTime = (d) => dateTimeFmt.format(new Date(d))
/** Whole days from today; negative when in the past. */
export const daysUntil = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400_000)

export function timeAgo(date) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  const days = Math.round(hrs / 24)
  return `${days} d ago`
}

/** 1st, 2nd, 3rd, 4th… */
export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
