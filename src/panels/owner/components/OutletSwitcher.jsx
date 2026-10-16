import clsx from 'clsx'
import { Check, ChevronsUpDown, Store } from 'lucide-react'
import Popover from '../../../components/ui/Popover'
import { formatINRCompact } from '../../../lib/format'
import { ALL, useOwnerData } from '../data/OwnerDataContext'

/**
 * Franchise owners pick one outlet or "All outlets". Every page reads the choice
 * from the owner store, so lists, numbers and reports follow it.
 */
export default function OutletSwitcher() {
  const { outlets, outletId, setOutletId, orders } = useOwnerData()
  const salesToday = (oid) => orders.filter((o) => o.outletId === oid && o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)
  const current = outlets.find((o) => o.id === outletId)

  return (
    <Popover
      label="Choose outlet"
      panelClassName="w-[min(20rem,calc(100vw-2rem))]"
      trigger={(open) => (
        <span className={clsx('flex items-center gap-2 h-10 pl-3 pr-2.5 rounded-full border bg-surface text-sm max-w-[13rem] sm:max-w-[16rem]', open ? 'border-brand-500' : 'border-line-strong hover:border-ink-400')}>
          <Store className="size-4 text-brand-600 shrink-0" aria-hidden />
          <span className="font-semibold truncate">{current ? current.name : 'All outlets'}</span>
          <ChevronsUpDown className="size-4 text-ink-400 shrink-0" aria-hidden />
        </span>
      )}
    >
      {({ close }) => (
        <div role="listbox" aria-label="Outlets">
          {[{ id: ALL, name: 'All outlets', city: `${outlets.length} outlets, combined`, status: 'ACTIVE' }, ...outlets].map((o) => {
            const selected = o.id === outletId
            return (
              <button
                key={o.id}
                role="option"
                aria-selected={selected}
                onClick={() => { setOutletId(o.id); close() }}
                className={clsx('w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer', selected ? 'bg-brand-50' : 'hover:bg-canvas', o.id === ALL && 'mb-1')}
              >
                <span className={clsx('size-2 rounded-full shrink-0', o.status === 'ACTIVE' ? 'bg-ok-600' : 'bg-danger-600')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate">{o.name}</span>
                  <span className="block text-[12px] text-ink-500 truncate">
                    {o.status === 'SUSPENDED' ? 'Suspended by Dime Quest' : o.id === ALL ? o.city : o.city}
                  </span>
                </span>
                {o.id !== ALL && o.status === 'ACTIVE' && <span className="text-[12px] text-ink-500 tabular">{formatINRCompact(salesToday(o.id))}</span>}
                {selected && <Check className="size-4 text-brand-600 shrink-0" aria-hidden />}
              </button>
            )
          })}
        </div>
      )}
    </Popover>
  )
}
