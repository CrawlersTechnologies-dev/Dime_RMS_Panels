import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Input, Select } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatINR, timeAgo } from '../../../lib/format'
import { usePos } from '../data/PosDataContext'
import { EXPENSE_CATEGORIES } from '../../owner/pages/Expenses'

const qtyFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export default function Operations() {
  const pos = usePos()
  const [cash, setCash] = useState(null) // 'IN' | 'OUT'
  return (
    <>
      <PageHeader title="Operations" description={`Cash drawer, expenses and stock counts for today’s shift at ${pos.outlet.name}.`} />
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Panel
          title="Cash drawer"
          description={pos.drawer ? `Opened by ${pos.drawer.openedBy} ${timeAgo(pos.drawer.openedAt)} with ${formatINR(pos.drawer.openingFloat)}` : 'Not opened'}
          actions={
            <>
              <Button size="sm" variant="secondary" icon={ArrowDownLeft} onClick={() => setCash('IN')} disabled={pos.dayClosed}>Add cash</Button>
              <Button size="sm" variant="secondary" icon={ArrowUpRight} onClick={() => setCash('OUT')} disabled={pos.dayClosed}>Take out</Button>
            </>
          }
        >
          <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-sm tabular">
            <dt className="text-ink-500">Opening cash</dt><dd className="text-right">{formatINR(pos.cash.float)}</dd>
            <dt className="text-ink-500">Cash sales</dt><dd className="text-right">+{formatINR(pos.cash.sales)}</dd>
            <dt className="text-ink-500">Added</dt><dd className="text-right">+{formatINR(pos.cash.in)}</dd>
            <dt className="text-ink-500">Taken out</dt><dd className="text-right">−{formatINR(pos.cash.out)}</dd>
            <dt className="font-bold pt-1.5 border-t border-line">Should be in the drawer</dt><dd className="text-right font-display text-xl font-semibold pt-1.5 border-t border-line">{formatINR(pos.cash.expected)}</dd>
          </dl>
          <h3 className="text-[13px] font-bold text-ink-500 mt-5 mb-2">Cash added or taken out</h3>
          <ul className="divide-y divide-line">
            {pos.drawer?.movements.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                <Badge tone={m.type === 'IN' ? 'ok' : 'warn'}>{m.type === 'IN' ? 'Added' : 'Taken out'}</Badge>
                <span className="flex-1 min-w-0 truncate">{m.reason}</span>
                <span className="text-[12px] text-ink-500 whitespace-nowrap">{m.by}, {timeAgo(m.at)}</span>
                <span className="tabular font-semibold w-16 text-right">{formatINR(m.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="flex flex-col gap-6">
          <ExpenseForm />
          <StockCount />
        </div>
      </div>
      {cash && <CashModal type={cash} onClose={() => setCash(null)} />}
    </>
  )
}

function CashModal({ type, onClose }) {
  const pos = usePos()
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const n = Number(amount)
  const valid = n > 0 && reason.trim() && (type === 'IN' || n <= pos.cash.expected)
  return (
    <Modal
      open
      onClose={onClose}
      title={type === 'IN' ? 'Add cash to the drawer' : 'Take cash out of the drawer'}
      description={type === 'OUT' ? 'For small payments like a milk top-up. Record bigger spends as an expense so the owner sees them.' : 'For example change from the bank.'}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!valid} onClick={() => { pos.addCashMovement(type, n, reason.trim()); toast(`${formatINR(n)} ${type === 'IN' ? 'added to' : 'taken from'} the drawer.`); onClose() }}>{type === 'IN' ? 'Add cash' : 'Take out'}</Button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount (₹)" error={type === 'OUT' && n > pos.cash.expected ? `Only ${formatINR(pos.cash.expected)} should be in the drawer.` : null}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
        <Field label="Reason">{({ id }) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={type === 'IN' ? 'Change from bank' : 'Milk top-up'} />}</Field>
      </div>
    </Modal>
  )
}

function ExpenseForm() {
  const pos = usePos()
  const toast = useToast()
  const empty = { category: EXPENSE_CATEGORIES[0], description: '', amount: '', paidVia: 'Cash' }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const limit = pos.limits.expenseApproval
  const n = Number(form.amount)
  const submit = (e) => {
    e.preventDefault()
    if (!form.description.trim() || !(n > 0)) return setError('Add what it was for and the amount.')
    const auto = pos.addExpense({ category: form.category, description: form.description.trim(), amount: Math.round(n), paidVia: form.paidVia, receipt: false })
    if (form.paidVia === 'Cash') pos.addCashMovement('OUT', Math.round(n), `Expense: ${form.description.trim()}`)
    toast(auto ? 'Expense recorded.' : `Expense sent to the owner. It’s above your ${formatINR(limit)} limit.`)
    setForm(empty); setError('')
  }
  return (
    <Panel title="Record an expense" description={`Up to ${formatINR(limit)} is approved straight away. More goes to the owner.`}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">{({ id }) => <Select id={id} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={EXPENSE_CATEGORIES} />}</Field>
        <Field label="Paid by">{({ id }) => <Select id={id} value={form.paidVia} onChange={(e) => setForm({ ...form, paidVia: e.target.value })} options={['Cash', 'UPI']} />}</Field>
        <Field label="What was it for" error={error} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setError('') }} placeholder="Gas cylinder delivery charge" />}</Field>
        <Field label="Amount (₹)" hint={form.paidVia === 'Cash' ? 'Taken from the cash drawer' : undefined}>{({ id }) => <Input id={id} type="number" min="1" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />}</Field>
        <div className="flex items-end"><Button type="submit" className="w-full" variant={n > limit ? 'dark' : 'primary'}>{n > limit ? 'Send to owner' : 'Record expense'}</Button></div>
      </form>
    </Panel>
  )
}

function StockCount() {
  const pos = usePos()
  const toast = useToast()
  const oid = pos.outlet.id
  const [itemId, setItemId] = useState(pos.inventory[0].id)
  const [counted, setCounted] = useState('')
  const [reason, setReason] = useState('')
  const item = pos.inventory.find((i) => i.id === itemId)
  const pending = pos.db.approvals.some((a) => a.type === 'STOCK_ADJUSTMENT' && a.itemId === itemId && a.outletId === oid && a.status === 'PENDING')
  const n = Number(counted)
  const submit = (e) => {
    e.preventDefault()
    if (counted === '' || n < 0 || !reason.trim()) return
    pos.requestApproval({ type: 'STOCK_ADJUSTMENT', itemId, from: item.stock[oid], to: n, reason: reason.trim() })
    toast(`Count for ${item.name.toLowerCase()} sent to the owner.`)
    setCounted(''); setReason('')
  }
  return (
    <Panel title="Stock count doesn’t match?" description="Send the counted quantity. The owner approves the correction.">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Item" className="sm:col-span-2" hint={`On record: ${qtyFmt.format(item.stock[oid])} ${item.unit}${pending ? '. A correction is already waiting for the owner.' : ''}`}>
          {({ id }) => <Select id={id} value={itemId} onChange={(e) => setItemId(e.target.value)} options={pos.inventory.map((i) => ({ value: i.id, label: i.name }))} />}
        </Field>
        <Field label={`Counted (${item.unit})`}>{({ id }) => <Input id={id} type="number" min="0" step="any" value={counted} onChange={(e) => setCounted(e.target.value)} />}</Field>
        <Field label="Reason">{({ id }) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Night count, spilt a can" />}</Field>
        <div className="sm:col-span-2 flex justify-end"><Button type="submit" variant="secondary" icon={Scale} disabled={pending || counted === '' || !reason.trim()}>Send count</Button></div>
      </form>
    </Panel>
  )
}
