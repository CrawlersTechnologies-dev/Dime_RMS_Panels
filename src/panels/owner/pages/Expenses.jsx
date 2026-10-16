import { useMemo, useState } from 'react'
import { Check, FileWarning, Paperclip, Plus, X } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import StatStrip from '../../../components/ui/StatStrip'
import BarList from '../../../components/charts/BarList'
import DataTable, { FilterBar } from '../../../components/ui/DataTable'
import { StatusBadge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Input, SearchInput, Select, Textarea } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatDate, formatINR, formatINRCompact, timeAgo } from '../../../lib/format'
import { ALL, useOwnerData } from '../data/OwnerDataContext'
import { isThisMonth, monthToDate } from '../lib/metrics'
import { OutletTag, useScopeLabel } from '../components/common'

export const EXPENSE_CATEGORIES = ['Vegetables and groceries', 'Dairy', 'Gas', 'Salaries', 'Rent', 'Electricity', 'Maintenance', 'Packaging', 'Marketing', 'Uniforms', 'Other']

export default function Expenses() {
  const d = useOwnerData()
  const toast = useToast()
  const scope = useScopeLabel()
  const [adding, setAdding] = useState(false)
  const [rejecting, setRejecting] = useState(null)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('ALL')
  const [status, setStatus] = useState('ALL')

  const expenses = d.scoped(d.expenses)
  const pending = expenses.filter((e) => e.status === 'PENDING')
  const month = expenses.filter((e) => e.status === 'APPROVED' && isThisMonth(e.at))
  const monthTotal = month.reduce((s, e) => s + e.amount, 0)
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ label: c, value: month.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter((c) => c.value > 0).sort((a, b) => b.value - a.value)
  const sales = monthToDate(d.history, d.scopeOutlets.map((o) => o.id), d.scoped(d.orders)).sales
  const limit = d.settings.limits.expenseApproval

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return expenses
      .filter((e) => category === 'ALL' || e.category === category)
      .filter((e) => status === 'ALL' || e.status === status)
      .filter((e) => !needle || e.description.toLowerCase().includes(needle) || e.by?.toLowerCase().includes(needle))
  }, [expenses, q, category, status])

  const approve = (e) => { d.decideExpense(e, 'APPROVED'); toast(`${formatINR(e.amount)} for ${e.description.toLowerCase()} approved.`) }

  const columns = [
    { key: 'at', header: 'Date', render: (e) => <span className="whitespace-nowrap text-ink-700">{formatDate(e.at)}</span> },
    { key: 'description', header: 'Expense', render: (e) => <div className="min-w-48"><div className="font-semibold">{e.description}</div><div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">{e.category} <OutletTag id={e.outletId} /></div></div> },
    { key: 'amount', header: 'Amount', align: 'right', render: (e) => <span className="font-semibold">{formatINR(e.amount)}</span> },
    { key: 'paidVia', header: 'Paid by', render: (e) => <span className="whitespace-nowrap">{e.paidVia}</span> },
    { key: 'by', header: 'Added by', render: (e) => <span className="whitespace-nowrap">{e.by?.replace(/ \(.*\)$/, '')}</span> },
    { key: 'receipt', header: 'Receipt', render: (e) => (e.receipt ? <span className="inline-flex items-center gap-1 text-ink-700"><Paperclip className="size-3.5" aria-hidden />Attached</span> : <span className="inline-flex items-center gap-1 text-brand-700"><FileWarning className="size-3.5" aria-hidden />Missing</span>) },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
  ]

  return (
    <>
      <PageHeader title="Expenses" description={`Spending at ${scope}. Managers can record up to ${formatINR(limit)} at a time without your approval.`} actions={<Button icon={Plus} onClick={() => setAdding(true)}>Add expense</Button>} />
      <StatStrip
        className="mb-6"
        items={[
          { label: 'Spent this month', value: formatINRCompact(monthTotal), note: `${month.length} approved expenses` },
          { label: 'Waiting for you', value: formatINR(pending.reduce((s, e) => s + e.amount, 0)), note: `${pending.length} above the limit`, tone: pending.length ? 'warn' : undefined },
          { label: 'Biggest cost', value: byCat[0]?.label ?? '—', note: byCat[0] ? formatINR(byCat[0].value) : undefined },
          { label: 'Expenses to sales', value: sales ? `${Math.round((monthTotal / sales) * 100)}%` : '—', note: 'This month' },
        ]}
      />

      {pending.length > 0 && (
        <Panel className="mb-6" title="Waiting for your approval" description="These are above the manager limit, so they aren’t counted until you approve.">
          <ul className="divide-y divide-line -mx-5 border-t border-line">
            {pending.map((e) => (
              <li key={e.id} className="px-5 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="min-w-0 flex-1 basis-56">
                  <div className="font-semibold">{e.description}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-ink-500">{e.category}, from {e.by}, {timeAgo(e.at)} <OutletTag id={e.outletId} />{!e.receipt && <span className="text-brand-700 font-medium">No receipt attached</span>}</div>
                </div>
                <span className="font-display text-xl font-semibold tabular">{formatINR(e.amount)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={X} onClick={() => setRejecting(e)}>Reject</Button>
                  <Button size="sm" icon={Check} onClick={() => approve(e)}>Approve</Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        <Panel flush className="xl:col-span-2" title="All expenses">
          <FilterBar>
            <SearchInput value={q} onChange={setQ} placeholder="Search description or person" className="flex-1 basis-52" />
            <Select aria-label="Category" className="w-auto" value={category} onChange={(e) => setCategory(e.target.value)} options={[{ value: 'ALL', label: 'All categories' }, ...EXPENSE_CATEGORIES]} />
            <Select aria-label="Status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'ALL', label: 'Any status' }, { value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]} />
          </FilterBar>
          <DataTable columns={columns} rows={rows} pageSize={12} empty="No expenses match these filters." />
        </Panel>
        <Panel title="This month by category">
          {byCat.length ? <BarList items={byCat} formatValue={formatINRCompact} showShare /> : <p className="text-sm text-ink-500">No approved expenses this month yet.</p>}
        </Panel>
      </div>

      {adding && <AddExpense onClose={() => setAdding(false)} />}
      {rejecting && <RejectExpense expense={rejecting} onClose={() => setRejecting(null)} />}
    </>
  )
}

function AddExpense({ onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const [form, setForm] = useState({ outletId: d.outletId !== ALL ? d.outletId : d.activeOutlets[0].id, category: EXPENSE_CATEGORIES[0], description: '', amount: '', paidVia: 'UPI', receipt: null })
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: null }) }
  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.description.trim()) errs.description = 'Say what the money was for.'
    if (!(Number(form.amount) > 0)) errs.amount = 'Enter an amount above zero.'
    if (Object.keys(errs).length) return setErrors(errs)
    d.addExpense({ outletId: form.outletId, category: form.category, description: form.description.trim(), amount: Math.round(Number(form.amount)), paidVia: form.paidVia, receipt: !!form.receipt })
    toast(`${formatINR(Number(form.amount))} added to ${form.category.toLowerCase()}.`)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title="Add expense" description="Expenses you add are approved straight away." footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="expense-form">Add expense</Button></>}>
      <form id="expense-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {d.outlets.length > 1 && <Field label="Outlet">{({ id }) => <Select id={id} value={form.outletId} onChange={set('outletId')} options={d.activeOutlets.map((o) => ({ value: o.id, label: o.name }))} />}</Field>}
        <Field label="Category">{({ id }) => <Select id={id} value={form.category} onChange={set('category')} options={EXPENSE_CATEGORIES} />}</Field>
        <Field label="What was it for" error={errors.description} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.description} onChange={set('description')} placeholder="Exhaust fan repair" />}</Field>
        <Field label="Amount (₹)" error={errors.amount}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="0" inputMode="numeric" value={form.amount} onChange={set('amount')} />}</Field>
        <Field label="Paid by">{({ id }) => <Select id={id} value={form.paidVia} onChange={set('paidVia')} options={['Cash', 'UPI', 'Card', 'Bank transfer']} />}</Field>
        <Field label="Receipt" hint={form.receipt ? form.receipt : 'Photo or PDF, optional'} className="sm:col-span-2">
          {({ id }) => <input id={id} type="file" accept="image/*,application/pdf" onChange={(e) => setForm({ ...form, receipt: e.target.files?.[0]?.name ?? null })} className="text-sm file:mr-3 file:h-9 file:px-4 file:rounded-full file:border file:border-line-strong file:bg-surface file:text-sm file:font-semibold file:cursor-pointer" />}
        </Field>
      </form>
    </Modal>
  )
}

function RejectExpense({ expense, onClose }) {
  const d = useOwnerData()
  const toast = useToast()
  const [note, setNote] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={`Reject ${formatINR(expense.amount)} for ${expense.description.toLowerCase()}?`}
      description={`${expense.by} sees your note in the biller panel.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="dark" onClick={() => { d.decideExpense(expense, 'REJECTED', note.trim()); toast('Expense rejected.'); onClose() }}>Reject expense</Button></>}
    >
      <Field label="Note" hint="Optional">{({ id }) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Get two more quotes first" />}</Field>
    </Modal>
  )
}
