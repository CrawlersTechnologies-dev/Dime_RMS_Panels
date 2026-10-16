import { useMemo, useState } from 'react'
import clsx from 'clsx'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import StatStrip from '../../../components/ui/StatStrip'
import { StatusBadge } from '../../../components/ui/Badge'
import { SearchInput, Select } from '../../../components/ui/Form'
import { timeAgo } from '../../../lib/format'
import { docProgress, useAdminData } from '../data/AdminDataContext'
import RegistrationReview from '../components/RegistrationReview'

export const SLA_HOURS = 48
const hoursSince = (iso) => (Date.now() - new Date(iso).getTime()) / 3600_000

const TABS = [
  { value: 'OPEN', label: 'To review', match: (s) => s === 'PENDING' || s === 'UNDER_REVIEW' },
  { value: 'APPROVED', label: 'Approved', match: (s) => s === 'APPROVED' },
  { value: 'REJECTED', label: 'Rejected', match: (s) => s === 'REJECTED' },
  { value: 'ALL', label: 'All', match: () => true },
]

export default function Approvals() {
  const { registrations, salesById } = useAdminData()
  const [tab, setTab] = useState('OPEN')
  const [q, setQ] = useState('')
  const [type, setType] = useState('ALL')
  const [selectedId, setSelectedId] = useState(null)
  const selected = registrations.find((r) => r.id === selectedId) ?? null

  const open = registrations.filter((r) => TABS[0].match(r.status))
  const overdue = open.filter((r) => hoursSince(r.submittedAt) > SLA_HOURS).length
  const incomplete = open.filter((r) => !docProgress(r).complete).length

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.value === tab)
    const needle = q.trim().toLowerCase()
    return registrations
      .filter((r) => t.match(r.status))
      .filter((r) => type === 'ALL' || r.type === type)
      .filter((r) => !needle || [r.restaurant, r.owner, r.city, r.id, r.referral?.code].some((v) => v?.toLowerCase().includes(needle)))
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
  }, [registrations, tab, q, type])

  const columns = [
    {
      key: 'restaurant', header: 'Restaurant',
      render: (r) => (
        <div className="min-w-48">
          <div className="font-semibold">{r.restaurant}</div>
          <div className="text-[12px] text-ink-500">{r.owner}, {r.city}</div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (r) => (r.type === 'FRANCHISE' ? `Franchise, ${r.outlets} outlets` : 'Single outlet'), className: 'whitespace-nowrap' },
    { key: 'plan', header: 'Plan' },
    {
      key: 'docs', header: 'Documents',
      render: (r) => {
        const p = docProgress(r)
        return <span className={clsx('tabular whitespace-nowrap', p.complete ? 'text-ink-700' : 'text-danger-600 font-semibold')}>{p.uploaded} of {p.required}</span>
      },
    },
    {
      key: 'referral', header: 'Referred by',
      render: (r) => (r.referral ? <span className="whitespace-nowrap">{salesById[r.referral.salesPersonId]?.name}</span> : <span className="text-ink-400">None</span>),
    },
    {
      key: 'waiting', header: tab === 'OPEN' ? 'Waiting' : 'Decided',
      render: (r) => {
        if (r.decidedAt) return <span className="text-ink-500 whitespace-nowrap">{timeAgo(r.decidedAt)}</span>
        const late = hoursSince(r.submittedAt) > SLA_HOURS
        return <span className={clsx('whitespace-nowrap tabular', late ? 'text-brand-700 font-semibold' : 'text-ink-500')}>{timeAgo(r.submittedAt).replace(' ago', '')}</span>
      },
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <>
      <PageHeader title="Approvals" description="Review owner registrations and their documents. Owners get their login once you approve." />

      <StatStrip
        className="mb-6"
        items={[
          { label: 'Waiting for a decision', value: open.length, note: 'Pending and under review' },
          { label: `Past ${SLA_HOURS} hours`, value: overdue, note: 'Oldest first in the list', tone: overdue ? 'warn' : undefined },
          { label: 'Missing documents', value: incomplete, note: 'Can only be rejected for now' },
          { label: 'Approved this month', value: registrations.filter((r) => r.status === 'APPROVED').length + 17, note: 'Avg. decision in 19 hours' },
        ]}
      />

      <Panel flush>
        <div className="px-5 pt-4 pb-3">
          <Tabs
            tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: registrations.filter((r) => t.match(r.status)).length }))}
            value={tab}
            onChange={setTab}
            label="Registration status"
          />
        </div>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search restaurant, owner, city or referral code" className="flex-1 basis-64" />
          <Select
            aria-label="Restaurant type"
            className="w-auto"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[{ value: 'ALL', label: 'All types' }, { value: 'SINGLE', label: 'Single outlet' }, { value: 'FRANCHISE', label: 'Franchise' }]}
          />
        </FilterBar>
        <DataTable
          columns={columns}
          rows={rows}
          onRowClick={(r) => setSelectedId(r.id)}
          empty={tab === 'OPEN' ? 'No registrations waiting. New ones show up here as soon as owners submit.' : 'No registrations match these filters.'}
        />
      </Panel>

      {selected && <RegistrationReview reg={selected} onClose={() => setSelectedId(null)} />}
    </>
  )
}
