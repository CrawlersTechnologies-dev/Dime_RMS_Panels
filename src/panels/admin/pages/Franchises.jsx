import { useState } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import StatStrip from '../../../components/ui/StatStrip'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { SearchInput } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, formatINRCompact } from '../../../lib/format'
import { useAdminData } from '../data/AdminDataContext'

export default function Franchises() {
  const { franchises, setOutletStatus } = useAdminData()
  const toast = useToast()
  const [open, setOpen] = useState(() => new Set([franchises[0]?.id]))
  const [q, setQ] = useState('')

  const outlets = franchises.flatMap((f) => f.outlets)
  const salesToday = outlets.reduce((s, o) => s + o.salesToday, 0)
  const needle = q.trim().toLowerCase()
  const list = franchises.filter(
    (f) => !needle || [f.brand, f.owner, f.hq].some((v) => v.toLowerCase().includes(needle)) || f.outlets.some((o) => o.name.toLowerCase().includes(needle) || o.city.toLowerCase().includes(needle)),
  )

  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <>
      <PageHeader title="Franchises" description="Multi-outlet brands, their outlets and outlet managers. Suspend a single outlet without affecting the rest." />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Franchise brands', value: franchises.length },
          { label: 'Outlets', value: outlets.length, note: `${outlets.filter((o) => o.status === 'SUSPENDED').length} suspended` },
          { label: 'Outlets per brand', value: (outlets.length / franchises.length).toFixed(1), note: 'Average' },
          { label: 'Sales today', value: formatINRCompact(salesToday), note: 'All franchise outlets' },
        ]}
      />

      <SearchInput value={q} onChange={setQ} placeholder="Search brand, owner, outlet or city" className="mb-4 max-w-md" />

      <div className="flex flex-col gap-4">
        {list.map((f) => {
          const expanded = open.has(f.id)
          const activeCount = f.outlets.filter((o) => o.status === 'ACTIVE').length
          const brandSales = f.outlets.reduce((s, o) => s + o.salesToday, 0)
          return (
            <section key={f.id} className="min-w-0 bg-surface border border-line rounded-[var(--radius-panel)] overflow-hidden">
              <button
                onClick={() => toggle(f.id)}
                aria-expanded={expanded}
                className="w-full text-left flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 hover:bg-canvas/60 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 basis-60">
                  <Avatar name={f.brand} />
                  <div className="min-w-0">
                    <div className="font-bold">{f.brand}</div>
                    <div className="text-[13px] text-ink-500 truncate">
                      {f.owner}{f.partner ? ` with partner ${f.partner}` : ''}, based in {f.hq}
                    </div>
                  </div>
                </div>
                <Badge tone="brand">{f.plan}</Badge>
                <div className="text-sm tabular"><span className="font-semibold">{activeCount}</span><span className="text-ink-500"> of {f.outlets.length} outlets active</span></div>
                <div className="text-sm tabular"><span className="font-semibold">{formatINR(brandSales)}</span><span className="text-ink-500"> today</span></div>
                <ChevronDown className={clsx('size-5 text-ink-500 transition-transform ml-auto', expanded && 'rotate-180')} aria-hidden />
              </button>

              {expanded && (
                <div className="overflow-x-auto border-t border-line">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[12px] text-ink-500 bg-canvas/60 border-b border-line">
                        <th scope="col" className="font-medium pl-5 pr-3 py-2.5">Outlet</th>
                        <th scope="col" className="font-medium px-3 py-2.5">City</th>
                        <th scope="col" className="font-medium px-3 py-2.5">Manager</th>
                        <th scope="col" className="font-medium px-3 py-2.5 text-right">Sales today</th>
                        <th scope="col" className="font-medium px-3 py-2.5">Status</th>
                        <th scope="col" className="pl-3 pr-5 py-2.5"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {f.outlets.map((o) => (
                        <tr key={o.id}>
                          <td className="pl-5 pr-3 py-3 font-semibold whitespace-nowrap">{o.name}</td>
                          <td className="px-3 py-3">{o.city}</td>
                          <td className="px-3 py-3 whitespace-nowrap">{o.manager}</td>
                          <td className="px-3 py-3 text-right tabular">{o.status === 'ACTIVE' ? formatINR(o.salesToday) : <span className="text-ink-400">None</span>}</td>
                          <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                          <td className="pl-3 pr-5 py-3 text-right">
                            {o.status === 'ACTIVE' ? (
                              <Button size="sm" variant="ghost" onClick={() => { setOutletStatus(f, o, 'SUSPENDED'); toast(`${o.name} suspended.`) }}>Suspend</Button>
                            ) : (
                              <Button size="sm" variant="secondary" onClick={() => { setOutletStatus(f, o, 'ACTIVE'); toast(`${o.name} reactivated.`) }}>Reactivate</Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )
        })}
        {list.length === 0 && <p className="text-ink-500 py-10 text-center">No franchise or outlet matches “{q}”.</p>}
      </div>
    </>
  )
}
