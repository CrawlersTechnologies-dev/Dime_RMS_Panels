import { useMemo, useState } from 'react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Avatar from '../../../components/ui/Avatar'
import Badge from '../../../components/ui/Badge'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { Drawer } from '../../../components/ui/Overlay'
import { SearchInput, Select } from '../../../components/ui/Form'
import { featureLabel } from '../../../config/permissions'
import { formatDateTime, timeAgo } from '../../../lib/format'
import { useOwnerData } from '../data/OwnerDataContext'
import { OutletTag, useScopeLabel } from '../components/common'
import { Dl, Section } from '../../admin/components/RegistrationReview'

const show = (v) => (v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'On' : 'Off') : String(v))
const SOURCE_TONE = { 'Owner panel': 'brand', 'Biller panel': 'info', 'Chef app': 'ok' }

export default function AuditLog() {
  const d = useOwnerData()
  const scope = useScopeLabel()
  const [q, setQ] = useState('')
  const [source, setSource] = useState('ALL')
  const [openId, setOpenId] = useState(null)
  const entries = d.scoped(d.audit)
  const open = d.audit.find((e) => e.id === openId)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter((e) => source === 'ALL' || e.source === source).filter((e) => !needle || [e.actor, e.action, e.target].some((v) => v?.toLowerCase().includes(needle)))
  }, [entries, q, source])

  const columns = [
    { key: 'at', header: 'When', render: (e) => <span className="whitespace-nowrap text-ink-700" title={formatDateTime(e.at)}>{timeAgo(e.at)}</span> },
    { key: 'actor', header: 'Who', render: (e) => <span className="flex items-center gap-2 whitespace-nowrap"><Avatar name={e.actor} size="sm" />{e.actor.replace(/ \(.*\)$/, '')}</span> },
    { key: 'action', header: 'What', render: (e) => <div className="min-w-48"><div className="font-semibold">{e.action}</div><div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">{e.target} <OutletTag id={e.outletId} /></div></div> },
    { key: 'source', header: 'From', render: (e) => <Badge tone={SOURCE_TONE[e.source] ?? 'neutral'}>{e.source}</Badge> },
  ]

  return (
    <>
      <PageHeader title="Audit logs" description={`Every change at ${scope}, from the owner panel, the biller panel and the chef app. Entries can’t be edited.`} />
      <Panel flush>
        <div className="pt-4" />
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search person, action or item" className="flex-1 basis-56" />
          <Select aria-label="Source" className="w-auto" value={source} onChange={(e) => setSource(e.target.value)} options={[{ value: 'ALL', label: 'Everywhere' }, 'Owner panel', 'Biller panel', 'Chef app']} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(e) => setOpenId(e.id)} pageSize={15} empty="No entries match these filters." />
      </Panel>
      {open && (
        <Drawer open onClose={() => setOpenId(null)} title={open.action} subtitle={formatDateTime(open.at)}>
          <Section title="Details">
            <Dl rows={[['By', open.actor], ['From', open.source], ['Item', open.target], ['Outlet', d.outletName(open.outletId)]]} />
          </Section>
          <Section title="What changed">
            {Object.keys(open.changes ?? {}).length === 0 ? <p className="text-sm text-ink-500">No field-level changes recorded.</p> : (
              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[12px] text-ink-500 bg-canvas/60 border-b border-line"><th scope="col" className="font-medium px-4 py-2">Field</th><th scope="col" className="font-medium px-4 py-2">Before</th><th scope="col" className="font-medium px-4 py-2">After</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {Object.entries(open.changes).map(([field, [before, after]]) => (
                      <tr key={field}><th scope="row" className="text-left font-medium px-4 py-2.5">{featureLabel(field)}</th><td className="px-4 py-2.5 text-danger-600">{show(before)}</td><td className="px-4 py-2.5 text-ok-600">{show(after)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </Drawer>
      )}
    </>
  )
}
