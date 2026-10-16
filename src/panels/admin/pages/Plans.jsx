import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Overlay'
import { Field, Input, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { FEATURE_GROUPS } from '../../../config/permissions'
import { formatINR, formatNumber } from '../../../lib/format'
import { useAdminData } from '../data/AdminDataContext'

const PLAN_GROUPS = FEATURE_GROUPS.filter((g) => g.id !== 'admin')

export default function Plans() {
  const { plans, planFeatures, togglePlanFeature } = useAdminData()
  const toast = useToast()
  const [editing, setEditing] = useState(null) // plan object, or {} for new

  const totalFeatures = PLAN_GROUPS.reduce((n, g) => n + Object.keys(g.features).length, 0)

  return (
    <>
      <PageHeader
        title="Plans"
        description="Prices, limits and the features each plan unlocks. Changes apply to every restaurant on that plan right away."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>Create plan</Button>}
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {plans.map((p) => (
          <section key={p.id} className="min-w-0 bg-surface border border-line rounded-[var(--radius-panel)] p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-[22px] font-semibold">{p.name}</h2>
              <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(p)}>Edit</Button>
            </div>
            <p className="mt-1">
              <span className="font-display text-[32px] font-semibold tabular">{formatINR(p.monthly)}</span>
              <span className="text-ink-500 text-sm"> per outlet per month</span>
            </p>
            <p className="text-[13px] text-ink-500 tabular">{formatINR(p.yearly)} billed yearly ({Math.round((1 - p.yearly / (p.monthly * 12)) * 100)}% off)</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm border-t border-line pt-4">
              <div><dt className="text-ink-500 text-[12px]">Outlets</dt><dd className="font-semibold">{p.outletLimit ?? 'Unlimited'}</dd></div>
              <div><dt className="text-ink-500 text-[12px]">Staff accounts</dt><dd className="font-semibold">{p.staffLimit ?? 'Unlimited'}</dd></div>
              <div><dt className="text-ink-500 text-[12px]">Features</dt><dd className="font-semibold tabular">{planFeatures[p.id]?.length ?? 0} of {totalFeatures}</dd></div>
              <div><dt className="text-ink-500 text-[12px]">Restaurants</dt><dd className="font-semibold tabular">{formatNumber(p.subscribers)}</dd></div>
            </dl>
          </section>
        ))}
      </div>

      <Panel flush title="Features by plan" description="Turn a feature on to include it in a plan. Staff and owners only see modules their plan includes.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[12px] text-ink-500 border-y border-line bg-canvas/60">
                <th scope="col" className="font-medium pl-5 pr-3 py-2.5">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} scope="col" className="font-semibold text-ink-800 px-3 py-2.5 text-center w-32">{p.name}</th>
                ))}
              </tr>
            </thead>
            {PLAN_GROUPS.map((g) => (
              <tbody key={g.id} className="divide-y divide-line">
                <tr className="bg-canvas/40">
                  <th scope="rowgroup" colSpan={plans.length + 1} className="text-left pl-5 py-2 text-[13px] font-bold text-ink-700 border-t border-line">{g.label}</th>
                </tr>
                {Object.entries(g.features).map(([key, label]) => (
                  <tr key={key}>
                    <th scope="row" className="pl-5 pr-3 py-2.5 text-left font-medium whitespace-nowrap">{label}</th>
                    {plans.map((p) => {
                      const on = planFeatures[p.id]?.includes(key)
                      return (
                        <td key={p.id} className="px-3 py-2.5">
                          <div className="flex justify-center">
                            <Toggle
                              size="sm"
                              ariaLabel={`${label} in ${p.name}`}
                              checked={!!on}
                              onChange={(v) => { togglePlanFeature(p, key, v); toast(`${label} ${v ? 'added to' : 'removed from'} ${p.name}.`) }}
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Panel>

      {editing && <PlanModal plan={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function PlanModal({ plan, onClose }) {
  const { savePlan, plans } = useAdminData()
  const toast = useToast()
  const isNew = !plan.id
  const [form, setForm] = useState({
    name: plan.name ?? '',
    monthly: plan.monthly ?? '',
    yearly: plan.yearly ?? '',
    outletLimit: plan.outletLimit ?? '',
    staffLimit: plan.staffLimit ?? '',
  })
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: null })) }

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Give the plan a name.'
    else if (isNew && plans.some((p) => p.name.toLowerCase() === form.name.trim().toLowerCase())) errs.name = 'A plan with this name already exists.'
    if (!(Number(form.monthly) > 0)) errs.monthly = 'Enter a monthly price above zero.'
    if (!(Number(form.yearly) > 0)) errs.yearly = 'Enter a yearly price above zero.'
    if (Object.keys(errs).length) return setErrors(errs)
    const toNum = (v) => (v === '' || v === null ? null : Number(v))
    savePlan({
      ...plan,
      id: plan.id ?? form.name.trim().toLowerCase().replace(/\s+/g, '-'),
      name: form.name.trim(),
      monthly: Number(form.monthly),
      yearly: Number(form.yearly),
      outletLimit: toNum(form.outletLimit),
      staffLimit: toNum(form.staffLimit),
      status: 'ACTIVE',
      subscribers: plan.subscribers ?? 0,
    })
    toast(isNew ? `${form.name.trim()} plan created with Starter features. Adjust them in the table.` : `${form.name.trim()} plan saved.`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Create plan' : `Edit ${plan.name}`}
      description={isNew ? 'New plans start with the Starter features.' : 'Price changes apply from each restaurant’s next renewal.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="plan-form">{isNew ? 'Create plan' : 'Save plan'}</Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan name" required error={errors.name} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} value={form.name} onChange={set('name')} />}</Field>
        <Field label="Monthly price (₹)" required error={errors.monthly}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="0" inputMode="numeric" value={form.monthly} onChange={set('monthly')} />}</Field>
        <Field label="Yearly price (₹)" required error={errors.yearly}>{({ id, invalid }) => <Input id={id} invalid={invalid} type="number" min="0" inputMode="numeric" value={form.yearly} onChange={set('yearly')} />}</Field>
        <Field label="Outlet limit" hint="Leave empty for unlimited">{({ id }) => <Input id={id} type="number" min="1" value={form.outletLimit} onChange={set('outletLimit')} />}</Field>
        <Field label="Staff account limit" hint="Leave empty for unlimited">{({ id }) => <Input id={id} type="number" min="1" value={form.staffLimit} onChange={set('staffLimit')} />}</Field>
      </form>
    </Modal>
  )
}
