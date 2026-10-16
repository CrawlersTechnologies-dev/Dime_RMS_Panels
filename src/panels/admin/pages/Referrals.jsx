import { useMemo, useState } from 'react'
import { BadgeCheck, Copy, Wallet } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import Avatar from '../../../components/ui/Avatar'
import StatStrip from '../../../components/ui/StatStrip'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { StatusBadge } from '../../../components/ui/Badge'
import { Checkbox, Field, Input, SearchInput, Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatDate, formatINR } from '../../../lib/format'
import { useAdminData } from '../data/AdminDataContext'

const TABS = [
  { value: 'REFERRALS', label: 'Referrals' },
  { value: 'PEOPLE', label: 'Sales people' },
  { value: 'RULE', label: 'Incentive rule' },
]

export default function Referrals() {
  const { referrals, salesPeople } = useAdminData()
  const [tab, setTab] = useState('REFERRALS')

  const awaiting = referrals.filter((r) => r.eligibility === 'AWAITING_APPROVAL')
  const toApprove = referrals.filter((r) => r.incentive === 'PENDING')
  const toPay = referrals.filter((r) => r.incentive === 'APPROVED')

  return (
    <>
      <PageHeader
        title="Sales and referrals"
        description="Sales people sign up on their own and get a referral code. When an owner registers with that code and you approve them, the incentive becomes eligible."
      />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Sales people', value: salesPeople.length, note: 'Self-registered' },
          { label: 'Waiting on owner approval', value: awaiting.length, note: 'Not eligible yet' },
          { label: 'Incentives to approve', value: formatINR(toApprove.reduce((s, r) => s + r.amount, 0)), note: `${toApprove.length} referrals`, tone: toApprove.length ? 'warn' : undefined },
          { label: 'Approved, not yet paid', value: formatINR(toPay.reduce((s, r) => s + r.amount, 0)), note: `${toPay.length} referrals` },
        ]}
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-4" label="Referral views" />
      {tab === 'REFERRALS' && <ReferralTable />}
      {tab === 'PEOPLE' && <SalesPeopleTable />}
      {tab === 'RULE' && <IncentiveRule />}
    </>
  )
}

function ReferralTable() {
  const { referrals, salesPeople, setIncentiveStatus } = useAdminData()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [person, setPerson] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [selected, setSelected] = useState(new Set())

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return referrals
      .filter((r) => person === 'ALL' || r.salesPersonId === person)
      .filter((r) => status === 'ALL' || (status === 'NONE' ? !r.incentive : r.incentive === status))
      .filter((r) => !needle || [r.restaurant, r.owner, r.salesPerson?.name, r.salesPerson?.code].some((v) => v?.toLowerCase().includes(needle)))
  }, [referrals, q, person, status])

  const picked = rows.filter((r) => selected.has(r.id))
  const canApprove = picked.length > 0 && picked.every((r) => r.incentive === 'PENDING')
  const canPay = picked.length > 0 && picked.every((r) => r.incentive === 'APPROVED')
  const selectable = (r) => r.incentive === 'PENDING' || r.incentive === 'APPROVED'
  const allSelectable = rows.filter(selectable)
  const toggle = (id, on) => setSelected((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n })

  const act = (statusTo) => {
    const total = picked.reduce((s, r) => s + r.amount, 0)
    setIncentiveStatus(picked, statusTo)
    toast(statusTo === 'PAID' ? `${formatINR(total)} marked as paid for ${picked.length} referral${picked.length > 1 ? 's' : ''}.` : `${picked.length} incentive${picked.length > 1 ? 's' : ''} approved, ${formatINR(total)}.`)
    setSelected(new Set())
  }

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          label={<span className="sr-only">Select all payable</span>}
          checked={allSelectable.length > 0 && allSelectable.every((r) => selected.has(r.id))}
          onChange={(on) => setSelected(on ? new Set(allSelectable.map((r) => r.id)) : new Set())}
        />
      ),
      render: (r) => (selectable(r) ? <Checkbox label={<span className="sr-only">Select {r.restaurant}</span>} checked={selected.has(r.id)} onChange={(on) => toggle(r.id, on)} /> : null),
    },
    {
      key: 'restaurant', header: 'Referred restaurant',
      render: (r) => (
        <div className="min-w-40">
          <div className="font-semibold">{r.restaurant}</div>
          <div className="text-[12px] text-ink-500">{r.owner}</div>
        </div>
      ),
    },
    {
      key: 'sp', header: 'Sales person',
      render: (r) => (
        <div className="min-w-36">
          <div>{r.salesPerson?.name}</div>
          <div className="text-[12px] text-ink-500">{r.salesPerson?.code}</div>
        </div>
      ),
    },
    { key: 'registration', header: 'Registration', render: (r) => <StatusBadge status={r.registration} /> },
    { key: 'eligibility', header: 'Eligibility', render: (r) => <StatusBadge status={r.eligibility} /> },
    { key: 'incentive', header: 'Incentive', render: (r) => (r.incentive ? <StatusBadge status={r.incentive} /> : <span className="text-ink-400">None yet</span>) },
    { key: 'amount', header: 'Amount', align: 'right', render: (r) => <span className={r.eligibility === 'NOT_ELIGIBLE' ? 'text-ink-400 line-through' : 'font-semibold'}>{formatINR(r.amount)}</span> },
    { key: 'at', header: 'Referred on', render: (r) => <span className="text-ink-500 whitespace-nowrap">{formatDate(r.at)}</span> },
  ]

  return (
    <Panel flush>
      <div className="pt-4" />
      <FilterBar>
        <SearchInput value={q} onChange={setQ} placeholder="Search restaurant, owner or code" className="flex-1 basis-56" />
        <Select aria-label="Sales person" className="w-auto" value={person} onChange={(e) => setPerson(e.target.value)} options={[{ value: 'ALL', label: 'All sales people' }, ...salesPeople.map((s) => ({ value: s.id, label: s.name }))]} />
        <Select
          aria-label="Incentive status"
          className="w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[{ value: 'ALL', label: 'Any incentive status' }, { value: 'PENDING', label: 'To approve' }, { value: 'APPROVED', label: 'Approved, unpaid' }, { value: 'PAID', label: 'Paid' }, { value: 'NONE', label: 'Not eligible yet' }]}
        />
      </FilterBar>
      {picked.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mx-5 mb-4 rounded-xl bg-ink-900 text-white px-4 py-2.5 text-sm">
          <span className="tabular">{picked.length} selected, {formatINR(picked.reduce((s, r) => s + r.amount, 0))}</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" icon={BadgeCheck} disabled={!canApprove} title={canApprove ? undefined : 'Select only incentives waiting for approval'} onClick={() => act('APPROVED')}>Approve</Button>
            <Button size="sm" icon={Wallet} disabled={!canPay} title={canPay ? undefined : 'Select only approved incentives'} onClick={() => act('PAID')}>Mark as paid</Button>
          </div>
        </div>
      )}
      <DataTable columns={columns} rows={rows} empty="No referrals match these filters." pageSize={12} />
    </Panel>
  )
}

function SalesPeopleTable() {
  const { referrals, salesPeople } = useAdminData()
  const toast = useToast()
  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); toast(`${code} copied.`) } catch { toast('Copy isn’t available here. Select the code to copy it.', 'error') }
  }
  const rows = salesPeople.map((s) => {
    const mine = referrals.filter((r) => r.salesPersonId === s.id)
    return {
      ...s,
      referred: mine.length,
      approved: mine.filter((r) => r.registration === 'APPROVED').length,
      earned: mine.filter((r) => r.incentive).reduce((t, r) => t + r.amount, 0),
      paid: mine.filter((r) => r.incentive === 'PAID').reduce((t, r) => t + r.amount, 0),
    }
  })
  const columns = [
    { key: 'name', header: 'Sales person', render: (s) => <div className="flex items-center gap-3 min-w-44"><Avatar name={s.name} size="sm" /><div><div className="font-semibold">{s.name}</div><div className="text-[12px] text-ink-500">{s.city}, joined {formatDate(s.joinedOn)}</div></div></div> },
    {
      key: 'code', header: 'Referral code',
      render: (s) => (
        <span className="inline-flex items-center gap-1.5">
          <code className="font-semibold text-ink-800 select-all">{s.code}</code>
          <button onClick={() => copy(s.code)} className="p-1 rounded-md hover:bg-ink-900/5 text-ink-500" aria-label={`Copy ${s.code}`}><Copy className="size-3.5" /></button>
        </span>
      ),
    },
    { key: 'phone', header: 'Phone', render: (s) => <span className="whitespace-nowrap">{s.phone}</span> },
    { key: 'referred', header: 'Referred', align: 'right' },
    { key: 'approved', header: 'Approved', align: 'right' },
    { key: 'earned', header: 'Earned', align: 'right', render: (s) => formatINR(s.earned) },
    { key: 'paid', header: 'Paid out', align: 'right', render: (s) => formatINR(s.paid) },
  ]
  return (
    <Panel flush>
      <div className="pt-1" />
      <DataTable columns={columns} rows={rows} />
    </Panel>
  )
}

function IncentiveRule() {
  const { incentiveRule, saveIncentiveRule } = useAdminData()
  const toast = useToast()
  const [form, setForm] = useState(incentiveRule)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }))
  const dirty = JSON.stringify(form) !== JSON.stringify(incentiveRule)

  const steps = [
    'Owner registers and enters the sales person’s referral code.',
    'You approve the registration in Approvals. The referral becomes eligible.',
    `After a ${form.holdDays}-day hold, finance approves the incentive here.`,
    `Approved incentives are paid out on day ${form.payoutDay} of the next month.`,
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <Panel title="Amount" description="Applies to referrals approved after you save.">
        <form
          onSubmit={(e) => { e.preventDefault(); saveIncentiveRule(form); toast('Incentive rule saved.') }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Per outlet (₹)" hint="A franchise with 4 outlets earns 4 times this.">{({ id }) => <Input id={id} type="number" min="0" value={form.perOutlet} onChange={set('perOutlet')} />}</Field>
          <Field label="Cap per referral (₹)">{({ id }) => <Input id={id} type="number" min="0" value={form.maxPerReferral} onChange={set('maxPerReferral')} />}</Field>
          <Field label="Hold period (days)" hint="Protects against refunds and early cancellations.">{({ id }) => <Input id={id} type="number" min="0" value={form.holdDays} onChange={set('holdDays')} />}</Field>
          <Field label="Payout day of month">{({ id }) => <Input id={id} type="number" min="1" max="28" value={form.payoutDay} onChange={set('payoutDay')} />}</Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={!dirty} onClick={() => setForm(incentiveRule)}>Discard</Button>
            <Button type="submit" disabled={!dirty}>Save rule</Button>
          </div>
        </form>
      </Panel>
      <Panel title="How a referral gets paid">
        <ol className="flex flex-col gap-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="grid place-items-center size-7 shrink-0 rounded-full bg-brand-50 text-brand-700 font-bold tabular text-[13px]">{i + 1}</span>
              <span className="pt-1">{s}</span>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-ink-500 mt-5 border-t border-line pt-4">
          Example: a franchise with 3 outlets earns {formatINR(Math.min(form.perOutlet * 3, form.maxPerReferral))}.
        </p>
      </Panel>
    </div>
  )
}
