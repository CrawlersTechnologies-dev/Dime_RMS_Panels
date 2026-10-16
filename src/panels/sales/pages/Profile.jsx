import { useState } from 'react'
import clsx from 'clsx'
import { BadgeCheck, Landmark, Smartphone } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Button from '../../../components/ui/Button'
import { Field, Input } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { formatDate } from '../../../lib/format'
import { useSales } from '../useSales'

const UPI_RE = /^[\w.-]{2,}@[a-zA-Z]{2,}$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/

export const maskPayout = (p) => (p.method === 'UPI' ? `UPI ${p.upi}` : `Account ending ${p.account.slice(-4)}, IFSC ${p.ifsc}`)

export default function Profile() {
  const { me, update } = useSales()
  const toast = useToast()
  const [details, setDetails] = useState({ name: me.name, email: me.email ?? '', city: me.city })
  const [payout, setPayout] = useState(() => ({ method: 'UPI', upi: '', account: '', ifsc: '', holder: me.name, pan: '', ...me.payout, confirm: me.payout?.account ?? '' }))
  const [errors, setErrors] = useState({})
  const setP = (k, v) => { setPayout((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: null })) }

  const saveDetails = (e) => {
    e.preventDefault()
    if (!details.name.trim() || !/^\S+@\S+\.\S+$/.test(details.email)) return setErrors({ details: 'Enter your name and a valid email.' })
    update({ name: details.name.trim(), email: details.email.trim(), city: details.city.trim() })
    toast('Profile saved.')
  }

  const savePayout = (e) => {
    e.preventDefault()
    const errs = {}
    if (!payout.holder.trim()) errs.holder = 'Enter the name on the account.'
    if (payout.method === 'UPI' && !UPI_RE.test(payout.upi.trim())) errs.upi = 'Enter a UPI ID like name@okaxis.'
    if (payout.method === 'BANK') {
      if (!/^\d{9,18}$/.test(payout.account)) errs.account = 'Account numbers have 9 to 18 digits.'
      if (payout.confirm !== payout.account) errs.confirm = 'Account numbers don’t match.'
      if (!IFSC_RE.test(payout.ifsc)) errs.ifsc = 'IFSC has 11 characters, like HDFC0001234. The 5th is always zero.'
    }
    if (!PAN_RE.test(payout.pan)) errs.pan = 'PAN has 10 characters, like ABCDE1234F.'
    if (Object.keys(errs).length) return setErrors(errs)
    const clean = payout.method === 'UPI'
      ? { method: 'UPI', upi: payout.upi.trim(), holder: payout.holder.trim(), pan: payout.pan }
      : { method: 'BANK', account: payout.account, ifsc: payout.ifsc, holder: payout.holder.trim(), pan: payout.pan }
    update({ payout: clean })
    toast('Payout details saved. Your next payout goes here.')
  }

  return (
    <>
      <PageHeader title="Profile and payout" description={`Partner since ${formatDate(me.joinedOn)}. Referral code ${me.code}.`} />
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <Panel title="Your details">
          <form onSubmit={saveDetails} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">{({ id }) => <Input id={id} value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} />}</Field>
            <Field label="Mobile number" hint="Verified. Contact support to change it.">{({ id }) => <Input id={id} value={me.phone} disabled />}</Field>
            <Field label="City">{({ id }) => <Input id={id} value={details.city} onChange={(e) => setDetails({ ...details, city: e.target.value })} />}</Field>
            <Field label="Email" error={errors.details} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} />}</Field>
            <div className="sm:col-span-2 flex justify-end"><Button type="submit" variant="secondary">Save details</Button></div>
          </form>
        </Panel>

        <Panel
          title="Payout details"
          description="Where Dime Quest sends your incentives."
          actions={me.payout && <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ok-600"><BadgeCheck className="size-4" aria-hidden />Added</span>}
        >
          <form onSubmit={savePayout} noValidate className="grid gap-4 sm:grid-cols-2">
            <fieldset className="sm:col-span-2">
              <legend className="text-[13px] font-semibold text-ink-800 mb-1.5">Pay me by</legend>
              <div className="grid grid-cols-2 gap-2">
                {[['UPI', 'UPI', Smartphone], ['BANK', 'Bank transfer', Landmark]].map(([v, label, Icon]) => (
                  <label key={v} className={clsx('flex items-center gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer text-sm font-semibold', payout.method === v ? 'border-brand-500 bg-brand-50/50' : 'border-line-strong hover:border-ink-400')}>
                    <input type="radio" name="method" value={v} checked={payout.method === v} onChange={() => setP('method', v)} className="accent-brand-500" />
                    <Icon className="size-4 text-ink-500" aria-hidden />{label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Name on the account" error={errors.holder} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} value={payout.holder} onChange={(e) => setP('holder', e.target.value)} />}</Field>
            {payout.method === 'UPI' ? (
              <Field label="UPI ID" error={errors.upi} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} value={payout.upi} onChange={(e) => setP('upi', e.target.value.trim())} placeholder="name@okaxis" />}</Field>
            ) : (
              <>
                <Field label="Account number" error={errors.account}>{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="numeric" autoComplete="off" value={payout.account} onChange={(e) => setP('account', e.target.value.replace(/\D/g, ''))} className="tabular" />}</Field>
                <Field label="Confirm account number" error={errors.confirm}>{({ id, invalid }) => <Input id={id} invalid={invalid} inputMode="numeric" autoComplete="off" value={payout.confirm} onChange={(e) => setP('confirm', e.target.value.replace(/\D/g, ''))} className="tabular" />}</Field>
                <Field label="IFSC" error={errors.ifsc} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} maxLength={11} value={payout.ifsc} onChange={(e) => setP('ifsc', e.target.value.toUpperCase())} placeholder="HDFC0001234" className="uppercase tabular" />}</Field>
              </>
            )}
            <Field label="PAN" error={errors.pan} hint={errors.pan ? undefined : 'Needed for tax on your incentives'} className="sm:col-span-2">{({ id, invalid }) => <Input id={id} invalid={invalid} maxLength={10} value={payout.pan} onChange={(e) => setP('pan', e.target.value.toUpperCase())} placeholder="ABCDE1234F" className="uppercase tabular" />}</Field>
            <div className="sm:col-span-2 flex justify-end border-t border-line pt-4"><Button type="submit">Save payout details</Button></div>
          </form>
        </Panel>
      </div>
    </>
  )
}
