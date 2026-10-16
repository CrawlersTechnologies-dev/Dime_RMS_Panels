import clsx from 'clsx'
import { Store } from 'lucide-react'
import Badge from '../../../components/ui/Badge'
import { formatINR } from '../../../lib/format'
import { ALL, useOwnerData } from '../data/OwnerDataContext'

/** Outlet name chip, shown on rows only when the owner is looking at all outlets. */
export function OutletTag({ id }) {
  const { outletId, outletName, isFranchise } = useOwnerData()
  if (!isFranchise || outletId !== ALL || !id) return null
  return <Badge className="font-medium">{outletName(id)}</Badge>
}

/** "Gokul Road" / "All 5 outlets" for page descriptions. */
export function useScopeLabel() {
  const { outlet, outlets, isFranchise } = useOwnerData()
  if (!isFranchise) return outlets[0].name
  return outlet ? outlet.name : `all ${outlets.length} outlets`
}

/**
 * For pages that only make sense for one outlet (floor plan, outlet stock counts):
 * in All outlets mode, show a picker with a summary per outlet.
 */
export function PickOutlet({ title, summary, children }) {
  const { outletId, outlets, setOutletId } = useOwnerData()
  if (outletId !== ALL) return children
  return (
    <section>
      <p className="text-ink-500 mb-4">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {outlets.map((o) => (
          <button
            key={o.id}
            onClick={() => setOutletId(o.id)}
            className={clsx('min-w-0 text-left bg-surface border border-line rounded-[var(--radius-panel)] p-5 hover:border-brand-500 cursor-pointer', o.status !== 'ACTIVE' && 'opacity-70')}
          >
            <div className="flex items-center gap-2">
              <Store className="size-4 text-brand-600" aria-hidden />
              <span className="font-bold">{o.name}</span>
              <span className="text-[13px] text-ink-500">{o.city}</span>
            </div>
            <div className="mt-3">{o.status === 'ACTIVE' ? summary(o) : <span className="text-sm text-danger-600">Suspended by Dime Quest</span>}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

export const ORDER_TYPE_LABEL = { DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', SWIGGY: 'Swiggy', ZOMATO: 'Zomato' }
export const PAYMENT_LABEL = { CASH: 'Cash', UPI: 'UPI', CARD: 'Card', SWIGGY: 'Swiggy', ZOMATO: 'Zomato' }
export const STAFF_TYPE_LABEL = { MANAGER: 'Manager', BILLER: 'Biller', CHEF: 'Chef', CAPTAIN: 'Captain', HELPER: 'Kitchen helper' }
export const SHIFT_LABEL = { MORNING: 'Morning, 6:30 am to 2:30 pm', EVENING: 'Evening, 2:30 pm to 10:30 pm', GENERAL: 'General, 10 am to 7 pm' }
export const SHIFT_SHORT = { MORNING: 'Morning', EVENING: 'Evening', GENERAL: 'General' }

export const money = (v) => formatINR(v)
const qtyFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
export const qty = (v, unit) => `${qtyFmt.format(v)} ${unit}`
