import clsx from 'clsx'

const tones = {
  neutral: 'bg-ink-900/6 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  ok: 'bg-ok-50 text-ok-600',
  warn: 'bg-warn-50 text-warn-600',
  danger: 'bg-danger-50 text-danger-600',
  info: 'bg-info-50 text-info-600',
}

/** Maps backend statuses to a tone so every panel colors them the same way. */
export const STATUS_TONE = {
  PENDING: 'warn',
  UNDER_REVIEW: 'info',
  APPROVED: 'ok',
  ACTIVE: 'ok',
  PAID: 'ok',
  ELIGIBLE: 'brand',
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  NOT_ELIGIBLE: 'neutral',
  EXPIRED: 'neutral',
  AWAITING_APPROVAL: 'neutral',
  INVITED: 'info',
  CONNECTED: 'ok',
  NOT_CONNECTED: 'neutral',
  ERROR: 'danger',
  SENT: 'ok',
  SCHEDULED: 'info',
  NEEDS_AGENT: 'warn',
  BOT: 'info',
  RESOLVED: 'ok',
  LIVE: 'ok',
  TEST: 'warn',
  PREPARING: 'warn',
  READY: 'info',
  SERVED: 'brand',
  COMPLETED: 'ok',
  CANCELLED: 'danger',
  REQUESTED: 'warn',
  CONFIRMED: 'ok',
  SEATED: 'info',
  DECLINED: 'danger',
  ONLINE: 'ok',
  OFFLINE: 'neutral',
  INACTIVE: 'neutral',
  OUT: 'danger',
  LOW: 'warn',
  OK: 'ok',
}

/** Labels that read better than the raw enum. */
const LABELS = {
  NEEDS_AGENT: 'Needs agent',
  BOT: 'Bot handling',
  AWAITING_APPROVAL: 'Awaiting approval',
  LIVE: 'Live mode',
  TEST: 'Test mode',
  REQUESTED: 'Needs confirming',
  OUT: 'Out of stock',
  LOW: 'Low',
  OK: 'In stock',
  ERROR: 'Not responding',
}

export default function Badge({ tone = 'neutral', dot = false, className, children }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

const pretty = (s) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'} dot>{LABELS[status] ?? pretty(status)}</Badge>
}
