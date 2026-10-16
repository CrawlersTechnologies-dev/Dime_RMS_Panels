import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import Badge, { StatusBadge } from '../../../components/ui/Badge'
import { Drawer, Modal } from '../../../components/ui/Overlay'
import { Checkbox, Field, Input, Select, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { timeAgo } from '../../../lib/format'
import * as seed from '../data/records'
import { useAdminData } from '../data/AdminDataContext'

const TABS = [
  { value: 'GATEWAYS', label: 'Payment gateways' },
  { value: 'GST', label: 'GST rates' },
  { value: 'INVOICE', label: 'Platform invoicing' },
]

export default function PaymentsTax() {
  const [tab, setTab] = useState('GATEWAYS')
  return (
    <>
      <PageHeader title="Payments, tax and GST" description="Payment gateways, the GST rates restaurants can pick, and how Dime Quest invoices its own subscriptions." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-4" label="Payments and tax sections" />
      {tab === 'GATEWAYS' && <Gateways />}
      {tab === 'GST' && <GstRates />}
      {tab === 'INVOICE' && <Invoicing />}
    </>
  )
}

function Gateways() {
  const { log } = useAdminData()
  const toast = useToast()
  const [gateways, setGateways] = useState(seed.gateways)
  const [editing, setEditing] = useState(null)

  const update = (g, patch, message) => {
    setGateways((gs) => gs.map((x) => (x.id === g.id ? { ...x, ...patch } : x)))
    log('Payments', message, g.name, Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, [g[k], v]])))
    toast(`${g.name}: ${message.toLowerCase()}.`)
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {gateways.map((g) => (
          <section key={g.id} className="min-w-0 bg-surface border border-line rounded-[var(--radius-panel)] p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-bold">{g.name}</h2>
                <p className="text-[13px] text-ink-500">{g.use}</p>
              </div>
              <Toggle ariaLabel={`Enable ${g.name}`} checked={g.enabled} onChange={(v) => update(g, { enabled: v }, v ? 'Enabled' : 'Disabled')} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <StatusBadge status={g.mode} />
              {g.keyId ? <span className="text-ink-500">Key <code className="text-ink-700">{g.keyId}</code></span> : <span className="text-ink-500">No keys added</span>}
              <span className="text-ink-400 ml-auto">{g.lastEvent ? `Last event ${timeAgo(g.lastEvent)}` : 'No events yet'}</span>
            </div>
            <div className="flex gap-2 border-t border-line pt-4">
              <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(g)}>Edit keys</Button>
              <Button size="sm" variant="ghost" onClick={() => update(g, { mode: g.mode === 'LIVE' ? 'TEST' : 'LIVE' }, g.mode === 'LIVE' ? 'Switched to test mode' : 'Switched to live mode')}>
                Switch to {g.mode === 'LIVE' ? 'test' : 'live'} mode
              </Button>
            </div>
          </section>
        ))}
      </div>
      {editing && (
        <Drawer
          open
          onClose={() => setEditing(null)}
          title={`${editing.name} keys`}
          subtitle="Keys are stored encrypted on the server and never shown again after saving."
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => { update(editing, { keyId: editing.keyId || 'new_key…' }, 'Updated keys'); setEditing(null) }}>Save keys</Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Key ID">{({ id }) => <Input id={id} defaultValue={editing.keyId} autoComplete="off" />}</Field>
            <Field label="Key secret" hint="Paste a new secret to replace the saved one.">{({ id }) => <Input id={id} type="password" placeholder="••••••••••••" autoComplete="new-password" />}</Field>
            <Field label="Webhook secret">{({ id }) => <Input id={id} type="password" placeholder="••••••••••••" autoComplete="new-password" />}</Field>
            <Field label="Webhook URL" hint="Add this in the gateway dashboard.">
              {({ id }) => <Input id={id} readOnly value={`https://api.dimequest.in/webhooks/${editing.id}`} className="select-all" />}
            </Field>
          </div>
        </Drawer>
      )}
    </>
  )
}

function GstRates() {
  const { log } = useAdminData()
  const toast = useToast()
  const [rates, setRates] = useState(seed.gstRates)
  const [editing, setEditing] = useState(null)

  const save = (r) => {
    const exists = rates.some((x) => x.id === r.id)
    setRates((rs) => {
      let next = exists ? rs.map((x) => (x.id === r.id ? r : x)) : [...rs, r]
      if (r.isDefault) next = next.map((x) => ({ ...x, isDefault: x.id === r.id }))
      return next
    })
    log('Payments', exists ? 'Edited GST rate' : 'Added GST rate', r.label, { rate: [null, r.rate] })
    toast(exists ? 'GST rate saved.' : 'GST rate added.')
    setEditing(null)
  }
  const remove = (r) => {
    setRates((rs) => rs.filter((x) => x.id !== r.id))
    log('Payments', 'Removed GST rate', r.label)
    toast(`${r.label} removed.`)
  }

  return (
    <>
      <Panel
        flush
        title="GST rates restaurants can use"
        description="Restaurants pick from these per outlet or per item. Confirm rates with your CA before changing them."
        actions={<Button size="sm" icon={Plus} onClick={() => setEditing({ id: `g${Date.now()}`, label: '', rate: 5, itc: false, appliesTo: 'Chosen per outlet', isDefault: false })}>Add rate</Button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-ink-500 border-y border-line bg-canvas/60">
                <th scope="col" className="font-medium pl-5 pr-3 py-2.5">Category</th>
                <th scope="col" className="font-medium px-3 py-2.5 text-right">GST</th>
                <th scope="col" className="font-medium px-3 py-2.5">Input tax credit</th>
                <th scope="col" className="font-medium px-3 py-2.5">Applied</th>
                <th scope="col" className="pl-3 pr-5 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rates.map((r) => (
                <tr key={r.id}>
                  <td className="pl-5 pr-3 py-3">
                    <span className="font-semibold">{r.label}</span> {r.isDefault && <Badge tone="brand" className="ml-1">Default</Badge>}
                  </td>
                  <td className="px-3 py-3 text-right tabular font-semibold">{r.rate}%</td>
                  <td className="px-3 py-3">{r.itc ? 'Available' : 'Not available'}</td>
                  <td className="px-3 py-3 text-ink-500 whitespace-nowrap">{r.appliesTo}</td>
                  <td className="pl-3 pr-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="p-2 rounded-full hover:bg-ink-900/5 text-ink-500" aria-label={`Edit ${r.label}`} onClick={() => setEditing(r)}><Pencil className="size-4" /></button>
                      <button className="p-2 rounded-full hover:bg-ink-900/5 text-ink-500 disabled:opacity-30" aria-label={`Remove ${r.label}`} disabled={r.isDefault} title={r.isDefault ? 'Make another rate the default first' : undefined} onClick={() => remove(r)}><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-4 text-[13px] text-ink-500 border-t border-line">Bills split GST into CGST and SGST for in-state sales, or IGST for inter-state catering orders.</p>
      </Panel>
      {editing && <GstModal rate={editing} onClose={() => setEditing(null)} onSave={save} />}
    </>
  )
}

function GstModal({ rate, onClose, onSave }) {
  const [form, setForm] = useState(rate)
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onClose={onClose}
      title={rate.label ? `Edit ${rate.label}` : 'Add GST rate'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => (form.label.trim() ? onSave({ ...form, label: form.label.trim() }) : setError('Name the category.'))}>Save rate</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" error={error} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.label} onChange={(e) => { setForm({ ...form, label: e.target.value }); setError('') }} />}</Field>
        <Field label="GST rate">{({ id }) => <Select id={id} value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} options={[0, 5, 12, 18, 28].map((v) => ({ value: v, label: `${v}%` }))} />}</Field>
        <Field label="Applied">{({ id }) => <Select id={id} value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })} options={['Default for restaurants', 'Chosen per outlet', 'Chosen per order type', 'Set on menu item']} />}</Field>
        <Checkbox className="sm:col-span-2" label="Input tax credit available" checked={form.itc} onChange={(v) => setForm({ ...form, itc: v })} />
        <Checkbox className="sm:col-span-2" label="Use as default for new restaurants" checked={form.isDefault} onChange={(v) => setForm({ ...form, isDefault: v })} />
      </div>
    </Modal>
  )
}

function Invoicing() {
  const { log } = useAdminData()
  const toast = useToast()
  const initial = { legalName: 'Dime Quest Technologies Pvt. Ltd.', gstin: '29AAJCD4821F1ZK', sac: '', state: 'Karnataka', prefix: 'DQ/26-27/', next: 1842, gstRate: 18 }
  const [form, setForm] = useState(initial)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const sacMissing = !form.sac.trim()

  return (
    <Panel title="Subscription invoices" description="Details printed on the GST invoices Dime Quest sends restaurants for their plan.">
      <form
        className="grid gap-4 sm:grid-cols-2 max-w-3xl"
        onSubmit={(e) => { e.preventDefault(); log('Payments', 'Changed invoice settings', 'Platform invoicing'); toast('Invoice settings saved.') }}
      >
        <Field label="Legal name" className="sm:col-span-2">{({ id }) => <Input id={id} value={form.legalName} onChange={set('legalName')} />}</Field>
        <Field label="GSTIN">{({ id }) => <Input id={id} value={form.gstin} onChange={set('gstin')} className="uppercase" />}</Field>
        <Field label="State of registration">{({ id }) => <Input id={id} value={form.state} onChange={set('state')} />}</Field>
        <Field label="SAC code" hint={sacMissing ? 'Required on invoices. Use the code your CA confirms for software subscriptions.' : undefined}>
          {({ id }) => <Input id={id} value={form.sac} onChange={set('sac')} inputMode="numeric" placeholder="6-digit SAC" />}
        </Field>
        <Field label="GST on subscriptions">{({ id }) => <Select id={id} value={form.gstRate} onChange={set('gstRate')} options={[{ value: 18, label: '18%' }, { value: 12, label: '12%' }]} />}</Field>
        <Field label="Invoice number prefix" hint="Resets each financial year.">{({ id }) => <Input id={id} value={form.prefix} onChange={set('prefix')} />}</Field>
        <Field label="Next invoice number">{({ id }) => <Input id={id} type="number" value={form.next} onChange={set('next')} />}</Field>
        <div className="sm:col-span-2 flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-[13px] text-ink-500">Next invoice: <span className="font-semibold text-ink-800 tabular">{form.prefix}{String(form.next).padStart(5, '0')}</span></span>
          <Button type="submit">Save invoice settings</Button>
        </div>
      </form>
    </Panel>
  )
}
