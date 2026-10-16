import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { ArrowUpRight, Ban, RotateCcw } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import StatStrip from '../../../components/ui/StatStrip'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { StatusBadge } from '../../../components/ui/Badge'
import { Drawer, Modal } from '../../../components/ui/Overlay'
import { Field, SearchInput, Select, Textarea } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { daysUntil, formatDate, formatNumber } from '../../../lib/format'
import { useAdminData } from '../data/AdminDataContext'
import { Dl, Section } from '../components/RegistrationReview'

const RENEW_SOON_DAYS = 7

const TABS = [
  { value: 'ALL', label: 'All', match: () => true },
  { value: 'ACTIVE', label: 'Active', match: (r) => r.status === 'ACTIVE' },
  { value: 'RENEWING', label: `Renewing in ${RENEW_SOON_DAYS} days`, match: (r) => r.status === 'ACTIVE' && daysUntil(r.renewsOn) <= RENEW_SOON_DAYS },
  { value: 'SUSPENDED', label: 'Suspended', match: (r) => r.status === 'SUSPENDED' },
  { value: 'EXPIRED', label: 'Expired', match: (r) => r.status === 'EXPIRED' },
]

export function RenewsCell({ date, status }) {
  const d = daysUntil(date)
  if (status === 'EXPIRED') return <span className="text-danger-600 whitespace-nowrap">Expired {formatDate(date)}</span>
  return (
    <span className={clsx('whitespace-nowrap', d <= RENEW_SOON_DAYS ? 'text-brand-700 font-semibold' : 'text-ink-700')}>
      {formatDate(date)} {d <= RENEW_SOON_DAYS && <span className="font-normal">({d === 0 ? 'today' : `in ${d} d`})</span>}
    </span>
  )
}

export default function Restaurants() {
  const { restaurants, plans } = useAdminData()
  const [tab, setTab] = useState('ALL')
  const [q, setQ] = useState('')
  const [plan, setPlan] = useState('ALL')
  const [type, setType] = useState('ALL')
  const [selectedId, setSelectedId] = useState(null)
  const selected = restaurants.find((r) => r.id === selectedId)

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.value === tab)
    const needle = q.trim().toLowerCase()
    return restaurants
      .filter(t.match)
      .filter((r) => plan === 'ALL' || r.plan === plan)
      .filter((r) => type === 'ALL' || r.type === type)
      .filter((r) => !needle || [r.name, r.owner, r.city, r.id].some((v) => v.toLowerCase().includes(needle)))
  }, [restaurants, tab, q, plan, type])

  const active = restaurants.filter((r) => r.status === 'ACTIVE')
  const columns = [
    {
      key: 'name', header: 'Restaurant',
      render: (r) => (
        <div className="min-w-44">
          <div className="font-semibold">{r.name}</div>
          <div className="text-[12px] text-ink-500">{r.owner}</div>
        </div>
      ),
    },
    { key: 'city', header: 'City' },
    { key: 'type', header: 'Outlets', render: (r) => (r.type === 'FRANCHISE' ? `${r.outlets} (franchise)` : '1'), className: 'whitespace-nowrap' },
    { key: 'plan', header: 'Plan' },
    { key: 'orders', header: 'Orders this month', align: 'right', render: (r) => formatNumber(r.ordersThisMonth) },
    { key: 'renews', header: 'Renews', render: (r) => <RenewsCell date={r.renewsOn} status={r.status} /> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <>
      <PageHeader title="RMS management" description="Every restaurant on Dime Quest, its plan and its subscription status." />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Active restaurants', value: formatNumber(active.length), note: `${formatNumber(active.reduce((s, r) => s + r.outlets, 0))} outlets` },
          { label: `Renewing in ${RENEW_SOON_DAYS} days`, value: active.filter((r) => daysUntil(r.renewsOn) <= RENEW_SOON_DAYS).length, note: 'Owners get a reminder 7 days before', tone: 'warn' },
          { label: 'Suspended', value: restaurants.filter((r) => r.status === 'SUSPENDED').length, note: 'Staff can’t log in' },
          { label: 'Expired', value: restaurants.filter((r) => r.status === 'EXPIRED').length, note: 'Read-only until renewed' },
        ]}
      />
      <Panel flush>
        <div className="px-5 pt-4 pb-3">
          <Tabs tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: restaurants.filter(t.match).length }))} value={tab} onChange={setTab} label="Restaurant status" />
        </div>
        <FilterBar>
          <SearchInput value={q} onChange={setQ} placeholder="Search restaurant, owner, city or ID" className="flex-1 basis-64" />
          <Select aria-label="Plan" className="w-auto" value={plan} onChange={(e) => setPlan(e.target.value)} options={[{ value: 'ALL', label: 'All plans' }, ...plans.map((p) => p.name)]} />
          <Select aria-label="Type" className="w-auto" value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'ALL', label: 'All types' }, { value: 'SINGLE', label: 'Single outlet' }, { value: 'FRANCHISE', label: 'Franchise' }]} />
        </FilterBar>
        <DataTable columns={columns} rows={rows} onRowClick={(r) => setSelectedId(r.id)} empty="No restaurants match these filters." />
      </Panel>
      {selected && <RestaurantDrawer r={selected} onClose={() => setSelectedId(null)} />}
    </>
  )
}

function RestaurantDrawer({ r, onClose }) {
  const { plans, changeRestaurantPlan, setRestaurantStatus } = useAdminData()
  const toast = useToast()
  const [suspending, setSuspending] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={r.name}
        subtitle={<span className="inline-flex items-center gap-2">{r.id} <StatusBadge status={r.status} /></span>}
        footer={
          r.status === 'SUSPENDED' ? (
            <Button icon={RotateCcw} onClick={() => { setRestaurantStatus(r, 'ACTIVE'); toast(`${r.name} reactivated.`) }}>Reactivate</Button>
          ) : (
            <Button variant="danger" icon={Ban} onClick={() => setSuspending(true)}>Suspend restaurant</Button>
          )
        }
      >
        {r.status === 'SUSPENDED' && (
          <p className="mb-5 rounded-xl bg-danger-50 text-danger-600 text-[13px] px-4 py-3">Suspended: {r.suspendReason}</p>
        )}
        <Section title="Details">
          <Dl rows={[['Owner', r.owner], ['City', r.city], ['Outlets', r.outlets], ['Joined', formatDate(r.joinedOn)], ['Orders this month', formatNumber(r.ordersThisMonth)]]} />
        </Section>
        <Section title="Subscription">
          <div className="flex flex-col gap-4">
            <Field label="Plan" hint="Feature access changes for the owner and all staff as soon as you switch.">
              {({ id }) => (
                <Select
                  id={id}
                  value={r.plan}
                  onChange={(e) => { changeRestaurantPlan(r, e.target.value); toast(`${r.name} moved to ${e.target.value}.`) }}
                  options={plans.map((p) => p.name)}
                />
              )}
            </Field>
            <Dl rows={[['Renews', <RenewsCell key="r" date={r.renewsOn} status={r.status} />]]} />
          </div>
        </Section>
        {r.type === 'FRANCHISE' && (
          <Section title="Franchise">
            <Link to="/admin/franchises" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-600">
              See all {r.outlets} outlets <ArrowUpRight className="size-4" />
            </Link>
          </Section>
        )}
      </Drawer>
      <Modal
        open={suspending}
        onClose={() => setSuspending(false)}
        title={`Suspend ${r.name}?`}
        description="The owner and all staff are signed out and can’t log in. Customer app listings are hidden. You can reactivate any time."
        footer={
          <>
            <Button variant="secondary" onClick={() => setSuspending(false)}>Cancel</Button>
            <Button
              variant="dark"
              onClick={() => {
                if (!reason.trim()) return setError('Add a reason. The owner sees it by email.')
                setRestaurantStatus(r, 'SUSPENDED', reason.trim())
                toast(`${r.name} suspended.`)
                setSuspending(false)
              }}
            >
              Suspend
            </Button>
          </>
        }
      >
        <Field label="Reason" error={error}>
          {({ id, invalid }) => <Textarea id={id} invalid={invalid} value={reason} onChange={(e) => { setReason(e.target.value); setError('') }} placeholder="For example: subscription payment failed three times" />}
        </Field>
      </Modal>
    </>
  )
}
