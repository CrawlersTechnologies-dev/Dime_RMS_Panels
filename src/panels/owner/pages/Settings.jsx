import { useState } from 'react'
import clsx from 'clsx'
import { Check, Lock, Printer, Upload } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import { StatusBadge } from '../../../components/ui/Badge'
import { Field, Input, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { useAuth } from '../../../context/AuthContext'
import { usePlatform } from '../../../context/PlatformContext'
import { FEATURE_GROUPS } from '../../../config/permissions'
import { PLAN_NAMES } from '../../../config/plans'
import { daysUntil, formatDate, formatINR } from '../../../lib/format'
import { useOwnerData } from '../data/OwnerDataContext'
import { OutletTag } from '../components/common'

export default function Settings() {
  const d = useOwnerData()
  const tabs = [
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'OUTLETS', label: d.isFranchise ? 'Outlets' : 'Outlet' },
    { value: 'BILLING', label: 'Billing' },
    { value: 'PAYMENTS', label: 'Payments' },
    { value: 'PRINTERS', label: 'Printers' },
    { value: 'LIMITS', label: 'Staff limits' },
    ...(d.restaurant.online ? [{ value: 'INTEGRATIONS', label: 'Delivery apps' }] : []),
    { value: 'PLAN', label: 'Plan' },
  ]
  const [tab, setTab] = useState('RESTAURANT')
  return (
    <>
      <PageHeader title="Settings" description={`Settings for ${d.restaurant.name}${d.isFranchise ? ' and its outlets' : ''}.`} />
      <Tabs className="mb-4" tabs={tabs} value={tab} onChange={setTab} label="Settings sections" />
      <div className="max-w-4xl">
        {tab === 'RESTAURANT' && <Restaurant />}
        {tab === 'OUTLETS' && <Outlets />}
        {tab === 'BILLING' && <Billing />}
        {tab === 'PAYMENTS' && <Payments />}
        {tab === 'PRINTERS' && <Printers />}
        {tab === 'LIMITS' && <Limits />}
        {tab === 'INTEGRATIONS' && <Integrations />}
        {tab === 'PLAN' && <Plan />}
      </div>
    </>
  )
}

/** Form state with dirty tracking for one settings section. */
function useSection(section, label) {
  const d = useOwnerData()
  const toast = useToast()
  const [form, setForm] = useState(d.settings[section])
  const dirty = JSON.stringify(form) !== JSON.stringify(d.settings[section])
  return {
    form,
    set: (k, v) => setForm((f) => ({ ...f, [k]: v })),
    dirty,
    reset: () => setForm(d.settings[section]),
    save: (e) => { e?.preventDefault(); d.saveSettings(section, form, label); toast(`${label.charAt(0).toUpperCase() + label.slice(1)} settings saved.`) },
  }
}

function SaveBar({ dirty, reset }) {
  return (
    <div className="sm:col-span-2 flex justify-end gap-2 border-t border-line pt-4">
      <Button type="button" variant="ghost" disabled={!dirty} onClick={reset}>Discard</Button>
      <Button type="submit" disabled={!dirty}>Save changes</Button>
    </div>
  )
}

function Restaurant() {
  const d = useOwnerData()
  const toast = useToast()
  const r = d.restaurant
  return (
    <Panel title="Restaurant details" description="Printed on bills and shown in the customer app.">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); d.log('Changed restaurant details', r.name); toast('Restaurant details saved.') }}>
        <Field label="Restaurant name">{({ id }) => <Input id={id} defaultValue={r.name} />}</Field>
        <Field label="Cuisine">{({ id }) => <Input id={id} defaultValue={r.cuisine} />}</Field>
        <Field label="Phone">{({ id }) => <Input id={id} type="tel" defaultValue={r.phone} />}</Field>
        <Field label="Email for invoices">{({ id }) => <Input id={id} type="email" defaultValue={r.email} />}</Field>
        <Field label="GSTIN" hint="Verified during registration. Contact Dime Quest support to change it.">{({ id }) => <Input id={id} value={r.gstin} disabled />}</Field>
        <Field label="FSSAI licence number" hint="Shown on bills and the customer app, as FSSAI requires.">{({ id }) => <Input id={id} value={r.fssai} disabled />}</Field>
        <div className="sm:col-span-2 flex justify-end border-t border-line pt-4"><Button type="submit">Save changes</Button></div>
      </form>
    </Panel>
  )
}

function Outlets() {
  const d = useOwnerData()
  const toast = useToast()
  return (
    <div className="flex flex-col gap-4">
      {d.outlets.map((o) => (
        <Panel key={o.id} title={o.name} description={o.address} actions={<StatusBadge status={o.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'} />}>
          {o.status === 'SUSPENDED' && (
            <div className="mb-4 rounded-xl bg-danger-50 text-danger-600 text-[13px] px-4 py-3 flex flex-wrap items-center gap-3">
              <span className="flex-1 min-w-0">{o.suspendedNote}</span>
              <label className="inline-flex">
                <input type="file" accept="image/*,application/pdf" className="sr-only peer" onChange={(e) => { if (e.target.files?.[0]) { d.log('Uploaded renewed FSSAI licence', o.name, o.id); toast('Licence sent to Dime Quest. Reactivation usually takes one working day.') } }} />
                <span className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-surface border border-danger-600/30 text-sm font-semibold text-danger-600 cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500"><Upload className="size-4" aria-hidden /> Upload renewed licence</span>
              </label>
            </div>
          )}
          <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); d.log('Changed outlet hours', o.name, o.id); toast(`${o.name} hours saved.`) }}>
            <Field label="Opens">{({ id }) => <Input id={id} type="time" defaultValue={o.opens} />}</Field>
            <Field label="Closes">{({ id }) => <Input id={id} type="time" defaultValue={o.closes} />}</Field>
            <div className="flex items-end"><Button type="submit" variant="secondary" className="w-full">Save hours</Button></div>
          </form>
        </Panel>
      ))}
      {d.isFranchise && <p className="text-[13px] text-ink-500">To open a new outlet, contact Dime Quest. Each outlet needs its own FSSAI licence and is added to your Enterprise plan.</p>}
    </div>
  )
}

function Billing() {
  const { form, set, dirty, reset, save } = useSection('billing', 'billing')
  return (
    <Panel title="Bills" description="How bills look and what they include, at every outlet.">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Bill number prefix" hint={`Next bill: ${form.prefix}000413`}>{({ id }) => <Input id={id} value={form.prefix} onChange={(e) => set('prefix', e.target.value)} />}</Field>
        <Field label="Footer message">{({ id }) => <Input id={id} value={form.footer} onChange={(e) => set('footer', e.target.value)} maxLength={60} />}</Field>
        <div className="sm:col-span-2 flex flex-col gap-4">
          <Toggle label="Show CGST and SGST separately" description="Required on tax invoices for GST-registered restaurants." checked={form.showGstBreakup} onChange={(v) => set('showGstBreakup', v)} />
          <Toggle label="Round off to the nearest rupee" checked={form.roundOff} onChange={(v) => set('roundOff', v)} />
          <Toggle label="Send bills on WhatsApp" description="When the customer gives their number at billing." checked={form.whatsappBill} onChange={(v) => set('whatsappBill', v)} />
          <Toggle
            label="Suggest a service charge"
            description="Billers can add it only if the customer agrees. Consumer guidelines don’t allow adding it to bills by default."
            checked={form.serviceCharge}
            onChange={(v) => set('serviceCharge', v)}
          />
          {form.serviceCharge && <Field label="Service charge (%)" className="max-w-48">{({ id }) => <Input id={id} type="number" min="0" max="20" value={form.serviceChargePct} onChange={(e) => set('serviceChargePct', Number(e.target.value))} />}</Field>}
        </div>
        <SaveBar dirty={dirty} reset={reset} />
      </form>
    </Panel>
  )
}

function Payments() {
  const d = useOwnerData()
  const { form, set, dirty, reset, save } = useSection('payments', 'payment')
  const modes = [['CASH', 'Cash'], ['UPI', 'UPI', 'A QR for this UPI ID prints on every bill'], ['CARD', 'Card', 'Card machine at the counter'], ...(d.restaurant.online ? [['SWIGGY', 'Swiggy'], ['ZOMATO', 'Zomato']] : [])]
  return (
    <Panel title="Ways customers can pay" description="Billers only see the options turned on here.">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-col gap-4">
          {modes.map(([k, label, desc]) => <Toggle key={k} label={label} description={desc} checked={form[k]} disabled={k === 'CASH'} onChange={(v) => set(k, v)} />)}
        </div>
        {form.UPI && <Field label="UPI ID" hint="Payments go straight to this account">{({ id }) => <Input id={id} value={form.upiId} onChange={(e) => set('upiId', e.target.value)} />}</Field>}
        <SaveBar dirty={dirty} reset={reset} />
      </form>
    </Panel>
  )
}

function Printers() {
  const d = useOwnerData()
  const toast = useToast()
  const list = d.scoped(d.settings.printers)
  return (
    <Panel flush title="Printers" description="Bill printers at the counter and KOT printers in the kitchen.">
      <ul className="divide-y divide-line border-t border-line">
        {list.map((p) => (
          <li key={p.id} className="px-5 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="grid place-items-center size-9 rounded-full bg-canvas text-ink-700 shrink-0"><Printer className="size-4" aria-hidden /></span>
            <div className="min-w-0 flex-1 basis-48">
              <div className="font-semibold flex flex-wrap items-center gap-2">{p.name} <span className="text-ink-500 font-normal">{p.kind === 'KOT' ? 'KOT' : 'Bills'}</span> <OutletTag id={p.outletId} /></div>
              <div className="text-[12px] text-ink-500">{p.model}, {p.connection}</div>
            </div>
            <StatusBadge status={p.status} />
            <Button size="sm" variant="secondary" disabled={p.status === 'OFFLINE'} onClick={() => toast(p.status === 'ERROR' ? `${p.name} still isn’t responding. Check that it’s on the same Wi-Fi as the biller tablet.` : `Test page sent to ${p.name}.`, p.status === 'ERROR' ? 'error' : 'ok')}>
              Print test page
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function Limits() {
  const { form, set, dirty, reset, save } = useSection('limits', 'staff limit')
  return (
    <Panel title="What staff can do without asking you" description="Anything above these limits comes to Approvals.">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Expense limit for managers (₹)" hint={`Expenses up to ${formatINR(form.expenseApproval)} are approved automatically`}>{({ id }) => <Input id={id} type="number" min="0" step="500" value={form.expenseApproval} onChange={(e) => set('expenseApproval', Number(e.target.value))} />}</Field>
        <div />
        <Field label="Biller discount limit (%)">{({ id }) => <Input id={id} type="number" min="0" max="100" value={form.billerDiscountPct} onChange={(e) => set('billerDiscountPct', Number(e.target.value))} />}</Field>
        <Field label="Manager discount limit (%)">{({ id }) => <Input id={id} type="number" min="0" max="100" value={form.managerDiscountPct} onChange={(e) => set('managerDiscountPct', Number(e.target.value))} />}</Field>
        <p className="sm:col-span-2 text-[13px] text-ink-500">Cancellations after a KOT is sent and every refund always need your approval.</p>
        <SaveBar dirty={dirty} reset={reset} />
      </form>
    </Panel>
  )
}

function Integrations() {
  const d = useOwnerData()
  const toast = useToast()
  const [rows, setRows] = useState(d.settings.integrations)
  const dirty = JSON.stringify(rows) !== JSON.stringify(d.settings.integrations)
  const set = (oid, k, v) => setRows((rs) => rs.map((r) => (r.outletId === oid ? { ...r, [k]: v } : r)))
  return (
    <Panel flush title="Swiggy and Zomato" description="Link each outlet’s store ID so delivery orders arrive in the biller panel and menu availability syncs back.">
      <form onSubmit={(e) => { e.preventDefault(); d.saveSettings('integrations', rows, 'delivery app'); toast('Delivery app links saved.') }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[12px] text-ink-500 border-y border-line bg-canvas/60"><th scope="col" className="font-medium pl-5 pr-3 py-2.5">Outlet</th><th scope="col" className="font-medium px-3 py-2.5">Swiggy store ID</th><th scope="col" className="font-medium pl-3 pr-5 py-2.5">Zomato restaurant ID</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => {
                const o = d.outlets.find((x) => x.id === r.outletId)
                return (
                  <tr key={r.outletId}>
                    <th scope="row" className="text-left font-semibold pl-5 pr-3 py-2.5 whitespace-nowrap">{o.name}</th>
                    <td className="px-3 py-2"><Input aria-label={`Swiggy store ID for ${o.name}`} value={r.swiggy} onChange={(e) => set(r.outletId, 'swiggy', e.target.value)} disabled={o.status !== 'ACTIVE'} placeholder="Not linked" className="min-w-40" /></td>
                    <td className="pl-3 pr-5 py-2"><Input aria-label={`Zomato restaurant ID for ${o.name}`} value={r.zomato} onChange={(e) => set(r.outletId, 'zomato', e.target.value)} disabled={o.status !== 'ACTIVE'} placeholder="Not linked" className="min-w-40" /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-line">
          <Button type="button" variant="ghost" disabled={!dirty} onClick={() => setRows(d.settings.integrations)}>Discard</Button>
          <Button type="submit" disabled={!dirty}>Save changes</Button>
        </div>
      </form>
    </Panel>
  )
}

function Plan() {
  const d = useOwnerData()
  const toast = useToast()
  const { user } = useAuth()
  const { planFeatures } = usePlatform()
  const inPlan = new Set(planFeatures[user.plan] ?? [])
  const groups = FEATURE_GROUPS.filter((g) => g.id !== 'admin')
  const days = daysUntil(d.restaurant.renewsOn)
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[var(--radius-panel)] bg-ink-900 text-white px-6 py-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-ink-300">Your plan</p>
          <p className="font-display text-[40px] leading-none font-semibold text-brand-400 mt-1">{PLAN_NAMES[user.plan]}</p>
          <p className="text-[13px] text-ink-300 mt-2">Renews on {formatDate(d.restaurant.renewsOn)}, in {days} day{days === 1 ? '' : 's'}. Billed per outlet.</p>
        </div>
        {user.plan !== 'enterprise' && (
          <button onClick={() => toast('Upgrade request sent. Your Dime Quest account manager will call you today.')} className="h-10 px-5 rounded-full bg-brand-500 hover:bg-brand-600 font-semibold text-sm cursor-pointer">Request an upgrade</button>
        )}
      </section>
      {groups.map((g) => (
        <Panel key={g.id} title={g.label}>
          <ul className="grid sm:grid-cols-2 gap-x-8">
            {Object.entries(g.features).map(([k, label]) => {
              const on = inPlan.has(k)
              return (
                <li key={k} className={clsx('flex items-center gap-2.5 py-2 text-sm border-b border-line/70', !on && 'text-ink-400')}>
                  {on ? <Check className="size-4 text-ok-600 shrink-0" aria-label="Included" /> : <Lock className="size-4 shrink-0" aria-label="Not included" />}
                  {label}
                </li>
              )
            })}
          </ul>
        </Panel>
      ))}
    </div>
  )
}
