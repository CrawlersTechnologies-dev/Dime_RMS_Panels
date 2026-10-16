import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import Badge from '../../../components/ui/Badge'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { Drawer } from '../../../components/ui/Overlay'
import { SearchInput, Select } from '../../../components/ui/Form'
import { featureLabel } from '../../../config/permissions'
import { formatDateTime, timeAgo } from '../../../lib/format'
import { useAdminData } from '../data/AdminDataContext'
import { Dl, Section } from '../components/RegistrationReview'

const PERIODS = [
  { value: '24', label: 'Last 24 hours' },
  { value: '168', label: 'Last 7 days' },
  { value: '720', label: 'Last 30 days' },
  { value: 'ALL', label: 'All time' },
]

const show = (v) => (v === null || v === undefined ? '—' : typeof v === 'boolean' ? (v ? 'On' : 'Off') : String(v))

function toCsv(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const head = ['Time', 'Actor', 'Module', 'Action', 'Target', 'IP']
  return [head, ...rows.map((r) => [r.at, r.actor, r.module, r.action, r.target, r.ip])].map((r) => r.map(esc).join(',')).join('\n')
}

export default function AuditLog() {
  const { auditLog } = useAdminData()
  const [q, setQ] = useState('')
  const [module, setModule] = useState('ALL')
  const [actor, setActor] = useState('ALL')
  const [period, setPeriod] = useState('ALL')
  const [selectedId, setSelectedId] = useState(null)
  const selected = auditLog.find((e) => e.id === selectedId)

  const modules = [...new Set(auditLog.map((e) => e.module))].sort()
  const actors = [...new Set(auditLog.map((e) => e.actor))].sort()

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const since = period === 'ALL' ? 0 : Date.now() - Number(period) * 3600_000
    return auditLog
      .filter((e) => module === 'ALL' || e.module === module)
      .filter((e) => actor === 'ALL' || e.actor === actor)
      .filter((e) => new Date(e.at).getTime() >= since)
      .filter((e) => !needle || [e.action, e.target, e.actor, e.ip].some((v) => v?.toLowerCase().includes(needle)))
  }, [auditLog, q, module, actor, period])

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `dime-quest-audit-${new Date().toISOString().slice(0, 10)}.csv` })
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { key: 'at', header: 'When', render: (e) => <span className="whitespace-nowrap text-ink-700" title={formatDateTime(e.at)}>{timeAgo(e.at)}</span> },
    {
      key: 'actor', header: 'Who',
      render: (e) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          {e.actor === 'System' ? <span className="grid place-items-center size-7 rounded-full bg-warn-50 text-warn-600 text-[11px] font-bold">S</span> : <Avatar name={e.actor} size="sm" />}
          {e.actor}
        </span>
      ),
    },
    { key: 'action', header: 'Action', render: (e) => <div className="min-w-48"><div className="font-semibold">{e.action}</div><div className="text-[12px] text-ink-500">{e.target}</div></div> },
    { key: 'module', header: 'Module', render: (e) => <Badge>{e.module}</Badge> },
    { key: 'ip', header: 'IP address', render: (e) => <span className="tabular text-ink-500 whitespace-nowrap">{e.ip ?? 'System'}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every change made by the admin team and the system. Entries can’t be edited or deleted."
        actions={<Button variant="secondary" icon={Download} onClick={exportCsv}>Export CSV</Button>}
      />
      <Panel flush>
        <div className="pt-4" />
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search action, target, person or IP" className="flex-1 basis-56" />
          <Select aria-label="Module" className="w-auto" value={module} onChange={(e) => setModule(e.target.value)} options={[{ value: 'ALL', label: 'All modules' }, ...modules]} />
          <Select aria-label="Person" className="w-auto" value={actor} onChange={(e) => setActor(e.target.value)} options={[{ value: 'ALL', label: 'Everyone' }, ...actors]} />
          <Select aria-label="Period" className="w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} options={PERIODS} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(e) => setSelectedId(e.id)} pageSize={15} empty="No log entries match these filters." />
      </Panel>

      {selected && (
        <Drawer open onClose={() => setSelectedId(null)} title={selected.action} subtitle={`${selected.id}, ${formatDateTime(selected.at)}`}>
          <Section title="Details">
            <Dl rows={[['By', selected.actor], ['Module', selected.module], ['Target', selected.target], ['IP address', selected.ip ?? 'System action']]} />
          </Section>
          <Section title="What changed">
            {Object.keys(selected.changes ?? {}).length === 0 ? (
              <p className="text-sm text-ink-500">No field-level changes recorded.</p>
            ) : (
              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[12px] text-ink-500 bg-canvas/60 border-b border-line">
                      <th scope="col" className="font-medium px-4 py-2">Field</th>
                      <th scope="col" className="font-medium px-4 py-2">Before</th>
                      <th scope="col" className="font-medium px-4 py-2">After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {Object.entries(selected.changes).map(([field, [before, after]]) => (
                      <tr key={field}>
                        <th scope="row" className="text-left font-medium px-4 py-2.5">{featureLabel(field)}</th>
                        <td className="px-4 py-2.5 text-danger-600 break-words">{show(before)}</td>
                        <td className="px-4 py-2.5 text-ok-600 break-words">{show(after)}</td>
                      </tr>
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
