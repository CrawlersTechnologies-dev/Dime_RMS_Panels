import { useState } from 'react'
import { Upload } from 'lucide-react'
import PageHeader from '../../../components/layout/PageHeader'
import Panel from '../../../components/ui/Panel'
import Tabs from '../../../components/ui/Tabs'
import Button from '../../../components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea, Toggle } from '../../../components/ui/Form'
import { useToast } from '../../../components/ui/Toast'
import { DOC_TYPES, REQUIRED_DOCS } from '../data/records'
import { useAdminData } from '../data/AdminDataContext'
import logoFull from '../../../assets/logo-full.png'

const TABS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'REGISTRATION', label: 'Registration' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'BRANDING', label: 'Branding' },
]

/** Local form state with dirty tracking and a save that logs + toasts. */
function useSettingsForm(initial, section) {
  const { log } = useAdminData()
  const toast = useToast()
  const [saved, setSaved] = useState(initial)
  const [form, setForm] = useState(initial)
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const save = (e) => {
    e?.preventDefault()
    const changes = Object.fromEntries(Object.keys(form).filter((k) => JSON.stringify(form[k]) !== JSON.stringify(saved[k])).map((k) => [k, [saved[k], form[k]]]))
    log('Settings', `Changed ${section.toLowerCase()} settings`, `${section} settings`, changes)
    setSaved(form)
    toast(`${section} settings saved.`)
  }
  return { form, set, dirty, save, reset: () => setForm(saved) }
}

function SaveBar({ dirty, reset }) {
  return (
    <div className="sm:col-span-2 flex justify-end gap-2 border-t border-line pt-4">
      <Button type="button" variant="ghost" disabled={!dirty} onClick={reset}>Discard</Button>
      <Button type="submit" disabled={!dirty}>Save changes</Button>
    </div>
  )
}

export default function Settings() {
  const [tab, setTab] = useState('GENERAL')
  return (
    <>
      <PageHeader title="Settings" description="Platform-wide settings for Dime Quest." />
      <Tabs tabs={TABS} value={tab} onChange={setTab} className="mb-4" label="Settings sections" />
      <div className="max-w-3xl">
        {tab === 'GENERAL' && <General />}
        {tab === 'REGISTRATION' && <Registration />}
        {tab === 'SECURITY' && <Security />}
        {tab === 'BRANDING' && <Branding />}
      </div>
    </>
  )
}

function General() {
  const { form, set, dirty, save, reset } = useSettingsForm(
    { name: 'Dime Quest', supportEmail: 'support@dimequest.in', supportPhone: '+91 836 222 0101', address: '2nd floor, Eureka Tower, Vidyanagar, Hubballi 580031', timezone: 'Asia/Kolkata', language: 'English' },
    'General',
  )
  return (
    <Panel title="Platform details" description="Shown to restaurants and customers in emails, invoices and the apps.">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Platform name">{({ id }) => <Input id={id} value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="Support email">{({ id }) => <Input id={id} type="email" value={form.supportEmail} onChange={(e) => set('supportEmail', e.target.value)} />}</Field>
        <Field label="Support phone">{({ id }) => <Input id={id} type="tel" value={form.supportPhone} onChange={(e) => set('supportPhone', e.target.value)} />}</Field>
        <Field label="Time zone">{({ id }) => <Select id={id} value={form.timezone} onChange={(e) => set('timezone', e.target.value)} options={['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore']} />}</Field>
        <Field label="Office address" className="sm:col-span-2">{({ id }) => <Textarea id={id} rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />}</Field>
        <Field label="Default language">{({ id }) => <Select id={id} value={form.language} onChange={(e) => set('language', e.target.value)} options={['English', 'Kannada', 'Hindi', 'Marathi']} />}</Field>
        <Field label="Currency" hint="Fixed for Indian GST invoicing.">{({ id }) => <Input id={id} value="Indian rupee (₹)" disabled />}</Field>
        <SaveBar dirty={dirty} reset={reset} />
      </form>
    </Panel>
  )
}

function Registration() {
  const { form, set, dirty, save, reset } = useSettingsForm(
    { slaHours: 48, codePrefix: 'DQ-', referralOptional: true, autoRejectDays: 14, single: REQUIRED_DOCS.SINGLE, franchise: REQUIRED_DOCS.FRANCHISE },
    'Registration',
  )
  const toggleDoc = (list, key, on) => set(list, on ? [...form[list], key] : form[list].filter((k) => k !== key))
  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <Panel title="Owner registration" description="How self-registration and approval work.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Approval target (hours)" hint="Registrations waiting longer are flagged in Approvals.">{({ id }) => <Input id={id} type="number" min="1" value={form.slaHours} onChange={(e) => set('slaHours', Number(e.target.value))} />}</Field>
          <Field label="Close incomplete registrations after (days)" hint="Owners get a reminder 3 days before.">{({ id }) => <Input id={id} type="number" min="1" value={form.autoRejectDays} onChange={(e) => set('autoRejectDays', Number(e.target.value))} />}</Field>
          <Field label="Referral code prefix" hint={`New codes look like ${form.codePrefix}SNEHA24`}>{({ id }) => <Input id={id} value={form.codePrefix} onChange={(e) => set('codePrefix', e.target.value.toUpperCase())} maxLength={5} />}</Field>
          <div className="sm:col-span-2">
            <Toggle label="Referral code is optional" description="Turn off to require a sales person’s code for every registration." checked={form.referralOptional} onChange={(v) => set('referralOptional', v)} />
          </div>
        </div>
      </Panel>
      <Panel title="Required documents" description="Approve stays locked until every required document is uploaded.">
        <div className="grid gap-6 sm:grid-cols-2">
          {[['single', 'Single outlet'], ['franchise', 'Franchise']].map(([list, label]) => (
            <fieldset key={list}>
              <legend className="text-sm font-bold mb-2">{label}</legend>
              <div className="flex flex-col gap-2">
                {Object.entries(DOC_TYPES).map(([key, name]) => (
                  <Checkbox key={key} label={name} checked={form[list].includes(key)} onChange={(on) => toggleDoc(list, key, on)} />
                ))}
              </div>
            </fieldset>
          ))}
          <SaveBar dirty={dirty} reset={reset} />
        </div>
      </Panel>
    </form>
  )
}

function Security() {
  const { form, set, dirty, save, reset } = useSettingsForm(
    { adminTwoFactor: true, ownerTwoFactor: false, sessionMinutes: 60, minPassword: 10, lockAfter: 5, ipAllowlist: '' },
    'Security',
  )
  return (
    <Panel title="Sign-in and sessions">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-col gap-4">
          <Toggle label="Require two-step sign-in for the admin team" description="OTP to the registered phone on every new device." checked={form.adminTwoFactor} onChange={(v) => set('adminTwoFactor', v)} />
          <Toggle label="Require two-step sign-in for restaurant owners" description="Staff on shared counter devices are not affected." checked={form.ownerTwoFactor} onChange={(v) => set('ownerTwoFactor', v)} />
        </div>
        <Field label="Sign out after inactivity (minutes)">{({ id }) => <Input id={id} type="number" min="5" value={form.sessionMinutes} onChange={(e) => set('sessionMinutes', Number(e.target.value))} />}</Field>
        <Field label="Minimum password length">{({ id }) => <Input id={id} type="number" min="8" value={form.minPassword} onChange={(e) => set('minPassword', Number(e.target.value))} />}</Field>
        <Field label="Lock account after failed attempts">{({ id }) => <Input id={id} type="number" min="3" value={form.lockAfter} onChange={(e) => set('lockAfter', Number(e.target.value))} />}</Field>
        <Field label="Admin panel IP allowlist" hint="One IP or range per line. Leave empty to allow any." className="sm:col-span-2">
          {({ id }) => <Textarea id={id} rows={3} value={form.ipAllowlist} onChange={(e) => set('ipAllowlist', e.target.value)} placeholder="103.211.18.0/24" className="font-mono text-[13px]" />}
        </Field>
        <SaveBar dirty={dirty} reset={reset} />
      </form>
    </Panel>
  )
}

function Branding() {
  const toast = useToast()
  const [preview, setPreview] = useState(logoFull)
  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|svg\+xml|jpeg)$/.test(file.type)) return toast('Use a PNG, JPG or SVG file.', 'error')
    const reader = new FileReader()
    reader.onload = () => { setPreview(reader.result); toast('New logo ready. It goes live when the backend upload is connected.') }
    reader.readAsDataURL(file)
  }
  const swatches = [
    ['Dime orange', 'var(--color-brand-500)', '#FF5A00', 'Buttons, highlights, active menu'],
    ['Navy', 'var(--color-ink-900)', '#122029', 'Sidebar, headings'],
    ['Canvas', 'var(--color-canvas)', '#F4F6F7', 'Page background'],
  ]
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Logo" description="Used in the panels, emails, invoices and both apps.">
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-40 rounded-xl border border-line bg-white p-3">
            <img src={preview} alt="Current Dime Quest logo" className="w-full h-auto" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex">
              <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only peer" onChange={onFile} />
              <span className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-line-strong bg-surface text-sm font-semibold cursor-pointer hover:border-ink-400 peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500">
                <Upload className="size-4" /> Upload new logo
              </span>
            </label>
            <p className="text-[12px] text-ink-500">PNG or SVG on a white or transparent background, at least 512 px wide.</p>
          </div>
        </div>
      </Panel>
      <Panel title="Brand colours" description="Set in the design tokens (src/index.css). Change them there so every panel stays consistent.">
        <ul className="grid gap-3 sm:grid-cols-3">
          {swatches.map(([name, cssVar, hex, use]) => (
            <li key={name} className="flex items-center gap-3">
              <span className="size-11 shrink-0 rounded-xl border border-line" style={{ background: cssVar }} aria-hidden />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{name} <span className="text-ink-500 font-normal tabular">{hex}</span></div>
                <div className="text-[12px] text-ink-500">{use}</div>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
